"""SignalOptimizationService — deterministic signal optimisation engine.

Analyses traffic records at each signalised intersection and proposes
phase-timing adjustments.  Uses a simple rule-based approach:

  • High congestion → extend green phases for the busiest approach
  • Low congestion  → reduce cycle time to minimise idle waiting
  • Moderate        → minor rebalancing

Future stages can swap in reinforcement learning; the service interface
stays the same.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.intersection import Intersection
from app.models.road import Road
from app.models.signal_optimization import SignalOptimization
from app.models.traffic_record import TrafficRecord
from app.models.traffic_signal import TrafficSignal

MODEL_NAME = "rule-based-v1"

_CONGESTION_RANK = {
    "free_flow": 0,
    "moderate": 1,
    "slow": 2,
    "congested": 3,
    "gridlock": 4,
}


# ── Helpers ───────────────────────────────────────────────────────────

def _latest_records_for_intersection(
    db: Session, intersection_id: int
) -> list[TrafficRecord]:
    """Get the most recent traffic record for each road at an intersection."""
    # Find roads connected to this intersection
    from app.models.road import road_intersection

    road_ids = db.scalars(
        select(road_intersection.c.road_id).where(
            road_intersection.c.intersection_id == intersection_id
        )
    ).all()

    records = []
    for rid in road_ids:
        rec = db.scalar(
            select(TrafficRecord)
            .where(TrafficRecord.road_id == rid)
            .order_by(TrafficRecord.timestamp.desc())
            .limit(1)
        )
        if rec:
            records.append(rec)
    return records


def _aggregate_congestion(records: list[TrafficRecord]) -> dict:
    """Compute aggregate metrics from multiple road records."""
    if not records:
        return {"avg_speed": 30.0, "avg_congestion": "moderate", "total_vehicles": 0, "worst_level": "moderate"}

    speeds = [r.avg_speed_kmph for r in records]
    total_vehicles = sum(r.vehicle_count for r in records)
    worst = max(records, key=lambda r: _CONGESTION_RANK.get(r.congestion_level, 0))

    return {
        "avg_speed": round(sum(speeds) / len(speeds), 1),
        "avg_congestion": worst.congestion_level,
        "total_vehicles": total_vehicles,
        "worst_level": worst.congestion_level,
    }


def _optimise_timing(
    current_phases: dict | None,
    current_cycle: int | None,
    congestion: dict,
) -> dict:
    """Generate recommended timing based on current traffic state.

    Returns a dict with ``phases`` and ``cycle_time_seconds``.
    """
    worst = congestion["worst_level"]
    rank = _CONGESTION_RANK.get(worst, 1)

    # Default phases if none exist
    if not current_phases:
        current_phases = {"green": [30, 30], "amber": [5, 5]}
    if not current_cycle:
        current_cycle = 90

    # Clone phases
    recommended = {k: list(v) if isinstance(v, list) else v for k, v in current_phases.items()}

    green_phases = recommended.get("green", [30, 30])

    if rank >= 3:
        # Congested / gridlock → extend green for main approaches, increase cycle
        green_phases = [int(g * 1.35) for g in green_phases]
        new_cycle = int(current_cycle * 1.25)
    elif rank == 2:
        # Slow → moderate extension
        green_phases = [int(g * 1.15) for g in green_phases]
        new_cycle = int(current_cycle * 1.10)
    elif rank <= 0:
        # Free flow → reduce cycle to cut wait times
        green_phases = [max(int(g * 0.80), 10) for g in green_phases]
        new_cycle = max(int(current_cycle * 0.85), 45)
    else:
        # Moderate → minor rebalance
        green_phases = [int(g * 1.05) for g in green_phases]
        new_cycle = current_cycle

    recommended["green"] = green_phases
    return {"phases": recommended, "cycle_time_seconds": new_cycle}


def _predict_impact(
    current_congestion: dict,
    current_cycle: int | None,
    recommended_cycle: int | None,
) -> dict:
    """Estimate the impact of applying the recommended timing."""
    rank = _CONGESTION_RANK.get(current_congestion["worst_level"], 1)
    avg_speed = current_congestion["avg_speed"]

    # Heuristic impact based on congestion severity
    if rank >= 3:
        speed_imp = 18.0
        queue_red = 25.0
        wait_red = 20.0
    elif rank == 2:
        speed_imp = 10.0
        queue_red = 15.0
        wait_red = 12.0
    elif rank <= 0:
        speed_imp = 3.0
        queue_red = 5.0
        wait_red = 8.0
    else:
        speed_imp = 6.0
        queue_red = 8.0
        wait_red = 6.0

    confidence = 0.80 if rank >= 2 else 0.70

    return {
        "speed_improvement_pct": speed_imp,
        "queue_reduction_pct": queue_red,
        "wait_time_reduction_pct": wait_red,
        "congestion_level_change": "improving",
        "confidence_score": confidence,
    }


# ── Public service functions ──────────────────────────────────────────

def list_signals_with_state(
    db: Session, city_id: int | None = None
) -> list[dict]:
    """List all signals with their current state and pending status."""
    q = (
        select(TrafficSignal)
        .options(joinedload(TrafficSignal.intersection))
    )
    if city_id is not None:
        q = q.where(Intersection.city_id == city_id)
        q = q.join(Intersection, TrafficSignal.intersection_id == Intersection.id)

    signals = db.scalars(q).unique().all()

    results = []
    for sig in signals:
        # Check for pending optimisations
        pending = db.scalar(
            select(func.count())
            .select_from(SignalOptimization)
            .where(
                SignalOptimization.signal_id == sig.id,
                SignalOptimization.approval_status == "pending",
            )
        ) or 0

        ix = sig.intersection
        results.append({
            "id": sig.id,
            "intersection_id": ix.id,
            "intersection_name": ix.name,
            "city_id": ix.city_id,
            "signal_type": sig.signal_type,
            "cycle_time_seconds": sig.cycle_time_seconds,
            "phases": sig.phases,
            "is_active": sig.is_active,
            "has_pending_optimization": pending > 0,
        })
    return results


def optimise_signal(
    db: Session, signal_id: int
) -> dict:
    """Run optimisation for a single signal.

    Returns the created SignalOptimization record as a dict.
    """
    sig = db.get(TrafficSignal, signal_id)
    if sig is None:
        return None

    ix = sig.intersection
    records = _latest_records_for_intersection(db, ix.id)
    congestion = _aggregate_congestion(records)
    recommended = _optimise_timing(sig.phases, sig.cycle_time_seconds, congestion)
    impact = _predict_impact(congestion, sig.cycle_time_seconds, recommended["cycle_time_seconds"])

    current_timing = {
        "phases": sig.phases,
        "cycle_time_seconds": sig.cycle_time_seconds,
        "signal_type": sig.signal_type,
        "is_active": sig.is_active,
    }

    opt = SignalOptimization(
        signal_id=sig.id,
        intersection_id=ix.id,
        city_id=ix.city_id,
        current_timing=current_timing,
        recommended_timing=recommended,
        predicted_impact=impact,
        approval_status="pending",
    )
    db.add(opt)
    db.commit()
    db.refresh(opt)

    return {
        "id": opt.id,
        "signal_id": opt.signal_id,
        "intersection_id": opt.intersection_id,
        "intersection_name": ix.name,
        "city_id": opt.city_id,
        "current_timing": current_timing,
        "recommended_timing": recommended,
        "predicted_impact": impact,
        "approval_status": opt.approval_status,
        "created_at": opt.created_at,
    }


def simulate_optimisation(
    db: Session, optimization_id: int
) -> dict | None:
    """Simulate the effect of applying a pending optimisation.

    Returns a simulation result dict or None if not found / not pending.
    """
    opt = db.get(SignalOptimization, optimization_id)
    if opt is None or opt.approval_status != "pending":
        return None

    # Simulate by re-evaluating with the recommended timing applied
    sig = db.get(TrafficSignal, opt.signal_id)
    ix = sig.intersection if sig else None
    records = _latest_records_for_intersection(db, opt.intersection_id)
    congestion = _aggregate_congestion(records)

    # Simulate a second pass of optimisation as if the new timing is active
    recommended = opt.recommended_timing or {}
    sim_cycle = recommended.get("cycle_time_seconds")
    sim_impact = _predict_impact(congestion, opt.current_timing.get("cycle_time_seconds") if opt.current_timing else None, sim_cycle)

    return {
        "optimization_id": opt.id,
        "status": "simulated",
        "simulated_impact": sim_impact,
        "simulation_notes": (
            f"Simulated application of recommended timing "
            f"(cycle={sim_cycle}s) to intersection '{ix.name if ix else '?'}' "
            f"under {congestion['worst_level']} congestion."
        ),
    }


def approve_optimisation(
    db: Session, optimization_id: int, user_id: int
) -> dict | None:
    """Approve a pending optimisation — manual approval required."""
    opt = db.get(SignalOptimization, optimization_id)
    if opt is None:
        return None
    if opt.approval_status != "pending":
        return {"error": f"Already {opt.approval_status}"}

    now = datetime.now(timezone.utc)
    opt.approval_status = "approved"
    opt.approved_by = user_id
    opt.approved_at = now
    db.commit()
    db.refresh(opt)

    return {
        "optimization_id": opt.id,
        "approval_status": "approved",
        "approved_by": user_id,
        "approved_at": now,
        "message": "Optimisation approved. Apply timing changes to the signal controller.",
    }
