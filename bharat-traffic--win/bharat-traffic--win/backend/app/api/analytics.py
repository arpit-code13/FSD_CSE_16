"""Analytics API — aggregated insights across traffic, signals, and simulations.

All endpoints require a valid JWT (authenticated USER or ADMIN).
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.city import City
from app.models.corridor import Corridor
from app.models.incident import Incident
from app.models.intersection import Intersection
from app.models.prediction import Prediction
from app.models.road import Road
from app.models.signal_optimization import SignalOptimization
from app.models.simulation import Simulation
from app.models.traffic_record import TrafficRecord
from app.models.traffic_signal import TrafficSignal
from app.models.user import User
from app.models.zone import Zone
from app.schemas.analytics import (
    AnalyticsOverview,
    CongestionAnalytics,
    CongestionHotspot,
    RoadTypeSpeedStats,
    ScenarioTypeCount,
    SignalAnalytics,
    SignalTypeCount,
    SimulationAnalytics,
    TrafficAnalytics,
    VehicleComposition,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

_CONGESTION_ORDER = ["free_flow", "moderate", "slow", "congested", "gridlock"]

_QUEUE_ESTIMATE = {
    "free_flow": 0,
    "moderate": 3,
    "slow": 8,
    "congested": 15,
    "gridlock": 30,
}

_WAIT_ESTIMATE = {
    "free_flow": 10,
    "moderate": 30,
    "slow": 60,
    "congested": 120,
    "gridlock": 240,
}


def _congestion_rank(level: str) -> int:
    try:
        return _CONGESTION_ORDER.index(level)
    except ValueError:
        return -1


def _worst_congestion(counts: dict[str, int]) -> str | None:
    for level in reversed(_CONGESTION_ORDER):
        if counts.get(level, 0) > 0:
            return level
    return None


# ── GET /api/analytics/overview ───────────────────────────────────────

@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(
    city_id: int | None = Query(None, description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """High-level city-wide analytics dashboard."""
    # Counts
    road_q = select(Road)
    ix_q = select(Intersection)
    sig_q = select(TrafficSignal)
    zone_q = select(Zone)
    corr_q = select(Corridor)
    inc_q = select(Incident).where(Incident.status == "active")
    pred_q = select(Prediction)
    sim_q = select(Simulation)

    if city_id is not None:
        road_q = road_q.where(Road.city_id == city_id)
        ix_q = ix_q.where(Intersection.city_id == city_id)
        inc_q = inc_q.where(Incident.city_id == city_id)
        pred_q = pred_q.where(Prediction.city_id == city_id)
        sim_q = sim_q.where(Simulation.city_id == city_id)
        zone_q = zone_q.where(Zone.city_id == city_id)
        corr_q = corr_q.where(Corridor.city_id == city_id)

    # For signals, filter via intersection city
    if city_id is not None:
        sub_ix_ids = select(Intersection.id).where(Intersection.city_id == city_id)
        sig_q = sig_q.where(TrafficSignal.intersection_id.in_(sub_ix_ids))

    total_roads = db.scalar(select(func.count()).select_from(road_q.subquery())) or 0
    total_ix = db.scalar(select(func.count()).select_from(ix_q.subquery())) or 0
    total_sig = db.scalar(select(func.count()).select_from(sig_q.subquery())) or 0
    total_zones = db.scalar(select(func.count()).select_from(zone_q.subquery())) or 0
    total_corr = db.scalar(select(func.count()).select_from(corr_q.subquery())) or 0
    active_incidents = db.scalar(select(func.count()).select_from(inc_q.subquery())) or 0
    total_predictions = db.scalar(select(func.count()).select_from(pred_q.subquery())) or 0
    total_simulations = db.scalar(select(func.count()).select_from(sim_q.subquery())) or 0

    # Aggregate traffic metrics
    rec_q = select(TrafficRecord)
    if city_id is not None:
        rec_q = rec_q.where(TrafficRecord.city_id == city_id)
    records = db.scalars(rec_q).all()

    total_vehicles = sum(r.vehicle_count for r in records)
    speeds = [r.avg_speed_kmph for r in records if r.avg_speed_kmph is not None]
    avg_speed = round(sum(speeds) / len(speeds), 1) if speeds else None

    densities: list[float] = []
    for rec in records:
        road = db.get(Road, rec.road_id)
        if road and road.length_meters:
            km = road.length_meters / 1000.0
            if km > 0:
                densities.append(round(rec.vehicle_count / km, 1))
    avg_density = round(sum(densities) / len(densities), 1) if densities else None

    cong_dist: dict[str, int] = {}
    for r in records:
        cong_dist[r.congestion_level] = cong_dist.get(r.congestion_level, 0) + 1

    return AnalyticsOverview(
        total_roads=total_roads,
        total_intersections=total_ix,
        total_signals=total_sig,
        total_zones=total_zones,
        total_corridors=total_corr,
        total_vehicles_tracked=total_vehicles,
        avg_speed_kmph=avg_speed,
        avg_density_per_km=avg_density,
        active_incidents=active_incidents,
        total_predictions=total_predictions,
        total_simulations=total_simulations,
        congestion_distribution=cong_dist,
        overall_congestion_level=_worst_congestion(cong_dist),
    )


# ── GET /api/analytics/traffic ────────────────────────────────────────

@router.get("/traffic", response_model=TrafficAnalytics)
def analytics_traffic(
    city_id: int | None = Query(None, description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Traffic speed and throughput analytics."""
    rec_q = select(TrafficRecord)
    if city_id is not None:
        rec_q = rec_q.where(TrafficRecord.city_id == city_id)
    records = db.scalars(rec_q).all()

    total_vehicles = sum(r.vehicle_count for r in records)
    speeds = [r.avg_speed_kmph for r in records if r.avg_speed_kmph is not None]
    avg_speed = round(sum(speeds) / len(speeds), 1) if speeds else None
    min_speed = min(speeds) if speeds else None
    max_speed = max(speeds) if speeds else None

    # Density
    densities: list[float] = []
    for rec in records:
        road = db.get(Road, rec.road_id)
        if road and road.length_meters:
            km = road.length_meters / 1000.0
            if km > 0:
                densities.append(round(rec.vehicle_count / km, 1))
    avg_density = round(sum(densities) / len(densities), 1) if densities else None

    # Roads with data
    unique_road_ids = set(r.road_id for r in records)

    # Speed by road type
    road_type_speeds: dict[str, list[float]] = {}
    for rec in records:
        road = db.get(Road, rec.road_id)
        if road and rec.avg_speed_kmph is not None:
            road_type_speeds.setdefault(road.road_type, []).append(rec.avg_speed_kmph)

    speed_by_road_type = []
    for rt, spds in sorted(road_type_speeds.items()):
        speed_by_road_type.append(RoadTypeSpeedStats(
            road_type=rt,
            road_count=len(spds),
            avg_speed_kmph=round(sum(spds) / len(spds), 1),
            min_speed_kmph=min(spds),
            max_speed_kmph=max(spds),
        ))

    # Vehicle composition
    comp_totals: dict[str, int] = {}
    for rec in records:
        if rec.vehicle_composition:
            for vtype, count in rec.vehicle_composition.items():
                comp_totals[vtype] = comp_totals.get(vtype, 0) + count
    total_comp = sum(comp_totals.values())
    vehicle_composition = [
        VehicleComposition(
            vehicle_type=vt,
            count=c,
            percentage=round(c / total_comp * 100, 1) if total_comp > 0 else 0.0,
        )
        for vt, c in sorted(comp_totals.items(), key=lambda x: -x[1])
    ]

    return TrafficAnalytics(
        total_vehicles=total_vehicles,
        avg_speed_kmph=avg_speed,
        min_speed_kmph=min_speed,
        max_speed_kmph=max_speed,
        avg_density_per_km=avg_density,
        total_roads_with_data=len(unique_road_ids),
        speed_by_road_type=speed_by_road_type,
        vehicle_composition=vehicle_composition,
    )


# ── GET /api/analytics/congestion ─────────────────────────────────────

@router.get("/congestion", response_model=CongestionAnalytics)
def analytics_congestion(
    city_id: int | None = Query(None, description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Congestion distribution, hotspots, and estimates."""
    rec_q = select(TrafficRecord)
    if city_id is not None:
        rec_q = rec_q.where(TrafficRecord.city_id == city_id)
    records = db.scalars(rec_q).all()

    cong_dist: dict[str, int] = {}
    queues: list[int] = []
    waits: list[float] = []

    for r in records:
        cong_dist[r.congestion_level] = cong_dist.get(r.congestion_level, 0) + 1
        queues.append(_QUEUE_ESTIMATE.get(r.congestion_level, 0))
        waits.append(_WAIT_ESTIMATE.get(r.congestion_level, 0))

    avg_queue = round(sum(queues) / len(queues), 1) if queues else None
    avg_wait = round(sum(waits) / len(waits), 1) if waits else None

    # Hotspots — top congested roads
    hotspots: list[CongestionHotspot] = []
    for rec in records:
        if _congestion_rank(rec.congestion_level) >= 3:  # congested or gridlock
            road = db.get(Road, rec.road_id)
            if road:
                hotspots.append(CongestionHotspot(
                    road_id=road.id,
                    road_name=road.name,
                    road_type=road.road_type,
                    congestion_level=rec.congestion_level,
                    vehicle_count=rec.vehicle_count,
                    avg_speed_kmph=rec.avg_speed_kmph,
                    queue_length_estimate=_QUEUE_ESTIMATE.get(rec.congestion_level, 0),
                ))
    # Sort worst first
    hotspots.sort(key=lambda h: _congestion_rank(h.congestion_level), reverse=True)

    total_roads = len(set(r.road_id for r in records))

    return CongestionAnalytics(
        total_roads=total_roads,
        congestion_distribution=cong_dist,
        overall_congestion_level=_worst_congestion(cong_dist),
        avg_queue_length=avg_queue,
        avg_waiting_time_seconds=avg_wait,
        hotspots=hotspots,
    )


# ── GET /api/analytics/signals ────────────────────────────────────────

@router.get("/signals", response_model=SignalAnalytics)
def analytics_signals(
    city_id: int | None = Query(None, description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Signal performance and optimization analytics."""
    sig_q = select(TrafficSignal)
    opt_q = select(SignalOptimization)

    if city_id is not None:
        sub_ix_ids = select(Intersection.id).where(Intersection.city_id == city_id)
        sig_q = sig_q.where(TrafficSignal.intersection_id.in_(sub_ix_ids))
        opt_q = opt_q.where(SignalOptimization.city_id == city_id)

    signals = db.scalars(sig_q).all()
    optimizations = db.scalars(opt_q).all()

    total = len(signals)
    active = sum(1 for s in signals if s.is_active)
    inactive = total - active

    cycle_times = [s.cycle_time_seconds for s in signals if s.cycle_time_seconds is not None]
    avg_cycle = round(sum(cycle_times) / len(cycle_times), 1) if cycle_times else None

    type_counts: dict[str, int] = {}
    for s in signals:
        type_counts[s.signal_type] = type_counts.get(s.signal_type, 0) + 1
    signal_type_distribution = [
        SignalTypeCount(signal_type=st, count=c)
        for st, c in sorted(type_counts.items())
    ]

    pending = sum(1 for o in optimizations if o.approval_status == "pending")
    approved = sum(1 for o in optimizations if o.approval_status == "approved")
    rejected = sum(1 for o in optimizations if o.approval_status == "rejected")

    return SignalAnalytics(
        total_signals=total,
        active_signals=active,
        inactive_signals=inactive,
        avg_cycle_time_seconds=avg_cycle,
        signal_type_distribution=signal_type_distribution,
        pending_optimizations=pending,
        approved_optimizations=approved,
        rejected_optimizations=rejected,
        total_optimizations=len(optimizations),
    )


# ── GET /api/analytics/simulations ────────────────────────────────────

@router.get("/simulations", response_model=SimulationAnalytics)
def analytics_simulations(
    city_id: int | None = Query(None, description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Simulation usage and impact analytics."""
    sim_q = select(Simulation)
    if city_id is not None:
        sim_q = sim_q.where(Simulation.city_id == city_id)
    simulations = db.scalars(sim_q).all()

    total = len(simulations)
    completed = sum(1 for s in simulations if s.status == "completed")
    failed = sum(1 for s in simulations if s.status == "failed")
    completion_rate = round(completed / total * 100, 1) if total > 0 else None

    # Scenario distribution
    scenario_counts: dict[str, int] = {}
    for s in simulations:
        scenario_counts[s.scenario_type] = scenario_counts.get(s.scenario_type, 0) + 1
    scenario_distribution = [
        ScenarioTypeCount(scenario_type=st, count=c)
        for st, c in sorted(scenario_counts.items(), key=lambda x: -x[1])
    ]
    most_used = scenario_distribution[0].scenario_type if scenario_distribution else None

    # Aggregate impact from completed simulations
    from app.models.simulation_result import SimulationResult

    speed_changes: list[float] = []
    vehicles_impacted: list[int] = []
    for sim in simulations:
        if sim.status == "completed":
            results = db.scalars(
                select(SimulationResult).where(SimulationResult.simulation_id == sim.id)
            ).all()
            for r in results:
                if r.metrics:
                    if "speed_change_pct" in r.metrics:
                        speed_changes.append(r.metrics["speed_change_pct"])
                    if "vehicles_impacted" in r.metrics:
                        vehicles_impacted.append(r.metrics["vehicles_impacted"])

    avg_speed_change = round(sum(speed_changes) / len(speed_changes), 1) if speed_changes else None
    avg_vehicles_impacted = round(sum(vehicles_impacted) / len(vehicles_impacted), 1) if vehicles_impacted else None

    return SimulationAnalytics(
        total_simulations=total,
        completed_simulations=completed,
        failed_simulations=failed,
        completion_rate_pct=completion_rate,
        scenario_distribution=scenario_distribution,
        avg_speed_change_pct=avg_speed_change,
        avg_vehicles_impacted=avg_vehicles_impacted,
        most_used_scenario=most_used,
    )
