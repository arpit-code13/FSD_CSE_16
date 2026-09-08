"""DigitalTwinSumoService — bridges Digital Twin traffic data with SUMO.

Pipeline:
  1. Read current traffic state from DB (roads, signals, traffic records)
  2. Generate SUMO network from that data
  3. Run SUMO simulation
  4. Collect simulated traffic state (vehicles, speed, queue, congestion, travel time)
  5. Return results in the same format the frontend consumes from /api/digital-twin

When SUMO is not installed, returns an "unavailable" status with the
deterministic fallback results so the UI keeps working.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging_config import logger
from app.models.intersection import Intersection
from app.models.road import Road
from app.models.traffic_record import TrafficRecord
from app.models.traffic_signal import TrafficSignal


# ── Congestion helpers ────────────────────────────────────────────────

_CONGESTION_ORDER = ["free_flow", "moderate", "slow", "congested", "gridlock"]


def _congestion_rank(level: str) -> int:
    try:
        return _CONGESTION_ORDER.index(level)
    except ValueError:
        return -1


def _speed_to_congestion(speed_ratio: float) -> str:
    """Derive congestion level from speed ratio (simulated/original)."""
    if speed_ratio >= 0.9:
        return "free_flow"
    if speed_ratio >= 0.7:
        return "moderate"
    if speed_ratio >= 0.5:
        return "slow"
    if speed_ratio >= 0.3:
        return "congested"
    return "gridlock"


def _worst_congestion(counts: dict[str, int]) -> str | None:
    for level in reversed(_CONGESTION_ORDER):
        if counts.get(level, 0) > 0:
            return level
    return None


def _estimate_queue(congestion_level: str) -> int:
    return {
        "free_flow": 0,
        "moderate": 3,
        "slow": 8,
        "congested": 15,
        "gridlock": 30,
    }.get(congestion_level, 0)


# ── Edge-to-road mapping ──────────────────────────────────────────────

_EDGE_ID_RE = re.compile(r"^edge_road_(\d+)$")


def _parse_road_id_from_edge(edge_id: str) -> int | None:
    m = _EDGE_ID_RE.match(edge_id)
    return int(m.group(1)) if m else None


# ── Main pipeline ─────────────────────────────────────────────────────

def run_digital_twin_sumo(
    db: Session,
    *,
    city_id: int,
    duration_seconds: int = 600,
    step_size: float = 1.0,
    traffic_multiplier: float = 1.0,
) -> dict:
    """Execute the full Digital Twin → SUMO pipeline.

    Returns a dict matching ``DigitalTwinSimResult``.

    The flow:
      1. Read DB traffic data for all roads in the city
      2. Start SUMO simulation (generates network from DB, runs TraCI)
      3. Collect SUMO edge data
      4. Map back to per-road results
      5. Compute summary metrics

    If SUMO is unavailable, runs the deterministic fallback and marks
    the result as ``unavailable``.
    """
    # ── Step 1: Read current traffic state from DB ─────────────────────
    roads = list(db.scalars(select(Road).where(Road.city_id == city_id)).all())
    if not roads:
        return _error_result(city_id, "No roads found for this city")

    intersections = list(
        db.scalars(select(Intersection).where(Intersection.city_id == city_id)).all()
    )
    if not intersections:
        return _error_result(city_id, "No intersections found for this city")

    # Build per-road original state
    road_originals: dict[int, dict] = {}
    for road in roads:
        rec = _latest_record(db, road.id)
        if rec:
            road_originals[road.id] = {
                "original_vehicles": max(1, int(rec.vehicle_count * traffic_multiplier)),
                "original_speed_kmph": rec.avg_speed_kmph,
                "original_congestion": rec.congestion_level,
            }
        else:
            road_originals[road.id] = {
                "original_vehicles": 50,
                "original_speed_kmph": 30.0,
                "original_congestion": "moderate",
            }

    # ── Step 2-3: Run SUMO simulation ──────────────────────────────────
    try:
        sumo_result = _run_sumo_simulation(
            db, city_id, duration_seconds, step_size
        )
        sim_status = "completed"
        message = "SUMO simulation completed"
    except Exception as e:
        # SUMO unavailable — use deterministic fallback
        logger.info("SUMO unavailable, using deterministic fallback: %s", e)
        sumo_result = _deterministic_fallback(roads, road_originals)
        sim_status = "unavailable"
        message = f"SUMO not available ({e}); using deterministic estimate"

    # ── Step 4: Map results back to per-road ───────────────────────────
    road_results = []
    total_original_vehicles = 0
    total_simulated_vehicles = 0
    speed_before: list[float] = []
    speed_after: list[float] = []
    worst_name = ""
    worst_reduction = 0.0
    congestion_before_counts: dict[str, int] = {}
    congestion_after_counts: dict[str, int] = {}

    for road in roads:
        orig = road_originals[road.id]
        sim = sumo_result.get(road.id, {})

        original_vehicles = orig["original_vehicles"]
        original_speed = orig["original_speed_kmph"]
        original_congestion = orig["original_congestion"]

        simulated_vehicles = sim.get("simulated_vehicles", original_vehicles)
        simulated_speed = sim.get("simulated_speed_kmph", original_speed)

        # Derive congestion from speed ratio
        speed_ratio = simulated_speed / original_speed if original_speed > 0 else 1.0
        simulated_congestion = _speed_to_congestion(speed_ratio)

        # Queue from congestion
        queue = _estimate_queue(simulated_congestion)

        # Travel time from speed
        road_length = road.length_meters or 1000.0
        travel_time = (
            road_length / (simulated_speed * 1000 / 3600)
            if simulated_speed > 0
            else 999.0
        )

        total_original_vehicles += original_vehicles
        total_simulated_vehicles += simulated_vehicles
        speed_before.append(original_speed)
        speed_after.append(simulated_speed)

        congestion_before_counts[original_congestion] = (
            congestion_before_counts.get(original_congestion, 0) + 1
        )
        congestion_after_counts[simulated_congestion] = (
            congestion_after_counts.get(simulated_congestion, 0) + 1
        )

        # Track worst road
        if original_speed > 0:
            reduction = ((original_speed - simulated_speed) / original_speed) * 100
            if reduction > worst_reduction:
                worst_reduction = reduction
                worst_name = road.name

        road_results.append({
            "road_id": road.id,
            "road_name": road.name,
            "road_type": road.road_type,
            "original_vehicles": original_vehicles,
            "original_speed_kmph": original_speed,
            "original_congestion": original_congestion,
            "simulated_vehicles": simulated_vehicles,
            "simulated_speed_kmph": round(simulated_speed, 1),
            "simulated_congestion": simulated_congestion,
            "queue_length_estimate": queue,
            "travel_time_seconds": round(travel_time, 1),
        })

    avg_before = round(sum(speed_before) / len(speed_before), 1) if speed_before else 0.0
    avg_after = round(sum(speed_after) / len(speed_after), 1) if speed_after else 0.0
    avg_change = round(
        ((avg_after - avg_before) / avg_before) * 100, 1
    ) if avg_before > 0 else 0.0

    return {
        "status": sim_status,
        "city_id": city_id,
        "simulation_id": None,
        "summary": {
            "total_roads": len(roads),
            "total_vehicles_before": total_original_vehicles,
            "total_vehicles_after": total_simulated_vehicles,
            "avg_speed_before_kmph": avg_before,
            "avg_speed_after_kmph": avg_after,
            "avg_speed_change_pct": avg_change,
            "worst_road_name": worst_name,
            "worst_speed_reduction_pct": round(worst_reduction, 1),
            "overall_congestion_before": _worst_congestion(congestion_before_counts),
            "overall_congestion_after": _worst_congestion(congestion_after_counts),
            "duration_seconds": duration_seconds,
            "steps_executed": int(duration_seconds / step_size),
        },
        "roads": road_results,
        "message": message,
    }


# ── SUMO simulation runner ────────────────────────────────────────────

def _run_sumo_simulation(
    db: Session,
    city_id: int,
    duration_seconds: int,
    step_size: float,
) -> dict[int, dict]:
    """Start SUMO, run to completion, return per-road simulated data.

    Returns dict mapping road_id → {simulated_vehicles, simulated_speed_kmph}.
    """
    from app.integrations.sumo.sumo_service import sumo_service

    session_info = sumo_service.start(
        db,
        city_id=city_id,
        duration_seconds=duration_seconds,
        step_size=step_size,
    )

    session_id = session_info["session_id"]
    total_steps = session_info["total_steps"]

    try:
        step_result = sumo_service.step(session_id, num_steps=total_steps)
        edge_data = step_result.get("edges", [])
    finally:
        try:
            sumo_service.stop(session_id)
        except Exception:
            pass

    # Map SUMO edge data to roads
    result: dict[int, dict] = {}
    for edge in edge_data:
        road_id = _parse_road_id_from_edge(edge["edge_id"])
        if road_id is not None:
            # SUMO speed is m/s → convert to km/h
            result[road_id] = {
                "simulated_vehicles": edge["vehicles"],
                "simulated_speed_kmph": round(edge["mean_speed"] * 3.6, 1),
            }

    return result


# ── Deterministic fallback ─────────────────────────────────────────────

def _deterministic_fallback(
    roads: list[Road],
    road_originals: dict[int, dict],
) -> dict[int, dict]:
    """Produce fallback estimates when SUMO is unavailable.

    Uses simple heuristics based on congestion level.
    """
    result: dict[int, dict] = {}
    for road in roads:
        orig = road_originals[road.id]
        congestion = orig["original_congestion"]
        speed = orig["original_speed_kmph"]
        vehicles = orig["original_vehicles"]

        # Apply congestion-based factors
        factor = {
            "free_flow": 1.0,
            "moderate": 0.90,
            "slow": 0.70,
            "congested": 0.50,
            "gridlock": 0.30,
        }.get(congestion, 0.85)

        result[road.id] = {
            "simulated_vehicles": vehicles,
            "simulated_speed_kmph": round(speed * factor, 1),
        }

    return result


# ── Helpers ────────────────────────────────────────────────────────────

def _latest_record(db: Session, road_id: int) -> TrafficRecord | None:
    return db.scalar(
        select(TrafficRecord)
        .where(TrafficRecord.road_id == road_id)
        .order_by(TrafficRecord.timestamp.desc())
        .limit(1)
    )


def _error_result(city_id: int, message: str) -> dict:
    return {
        "status": "failed",
        "city_id": city_id,
        "simulation_id": None,
        "summary": {
            "total_roads": 0,
            "total_vehicles_before": 0,
            "total_vehicles_after": 0,
            "avg_speed_before_kmph": 0.0,
            "avg_speed_after_kmph": 0.0,
            "avg_speed_change_pct": 0.0,
            "worst_road_name": "",
            "worst_speed_reduction_pct": 0.0,
            "overall_congestion_before": None,
            "overall_congestion_after": None,
            "duration_seconds": 0,
            "steps_executed": 0,
        },
        "roads": [],
        "message": message,
    }
