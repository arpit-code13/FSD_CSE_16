"""Traffic API — live metrics, roads, and intersections.

All endpoints require a valid JWT (authenticated USER or ADMIN).

Road and intersection traffic metrics are derived from the most recent
``TrafficRecord`` for each road.  Signal status is pulled from the
``TrafficSignal`` attached to an intersection.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.intersection import Intersection
from app.models.road import Road
from app.models.traffic_record import TrafficRecord
from app.models.traffic_signal import TrafficSignal
from app.models.user import User
from app.schemas.traffic import (
    IntersectionTraffic,
    RoadTraffic,
    SignalInfo,
    TrafficOverview,
)

router = APIRouter(prefix="/api/traffic", tags=["traffic"])


# ── Helpers ───────────────────────────────────────────────────────────

def _latest_record(db: Session, road_id: int) -> TrafficRecord | None:
    """Return the most recent TrafficRecord for a road, or *None*."""
    return db.scalar(
        select(TrafficRecord)
        .where(TrafficRecord.road_id == road_id)
        .order_by(TrafficRecord.timestamp.desc())
        .limit(1)
    )


def _road_to_traffic(db: Session, road: Road) -> RoadTraffic:
    rec = _latest_record(db, road.id)
    density: float | None = None
    queue: int | None = None
    if rec and road.length_meters:
        km = road.length_meters / 1000.0
        if km > 0:
            density = round(rec.vehicle_count / km, 1)
    if rec:
        queue = _estimate_queue(rec.congestion_level)
    return RoadTraffic(
        id=road.id,
        name=road.name,
        road_type=road.road_type,
        city_id=road.city_id,
        zone_id=road.zone_id,
        corridor_id=road.corridor_id,
        length_meters=road.length_meters,
        lanes=road.lanes,
        speed_limit_kmph=road.speed_limit_kmph,
        vehicle_count=rec.vehicle_count if rec else None,
        avg_speed_kmph=rec.avg_speed_kmph if rec else None,
        congestion_level=rec.congestion_level if rec else None,
        vehicle_composition=rec.vehicle_composition if rec else None,
        density_vehicles_per_km=density,
        queue_length_estimate=queue,
        recorded_at=rec.timestamp if rec else None,
    )


def _estimate_queue(congestion_level: str) -> int:
    """Produce a rough queue-length bucket from congestion level."""
    return {
        "free_flow": 0,
        "moderate": 3,
        "slow": 8,
        "congested": 15,
        "gridlock": 30,
    }.get(congestion_level, 0)


def _signal_info(signal: TrafficSignal | None) -> SignalInfo | None:
    if signal is None:
        return None
    return SignalInfo.model_validate(signal)


def _intersection_to_traffic(db: Session, ix: Intersection) -> IntersectionTraffic:
    # load signal + roads eagerly when possible
    signal = ix.traffic_signal
    # Count active incidents
    from app.models.incident import Incident

    incident_count = db.scalar(
        select(func.count()).select_from(Incident).where(Incident.intersection_id == ix.id)
    ) or 0
    return IntersectionTraffic(
        id=ix.id,
        name=ix.name,
        latitude=ix.latitude,
        longitude=ix.longitude,
        intersection_type=ix.intersection_type,
        city_id=ix.city_id,
        signal=_signal_info(signal),
        active_incidents=incident_count,
        connected_road_ids=[r.id for r in ix.roads],
        connected_road_names=[r.name for r in ix.roads],
    )


# ── GET /api/traffic/live ─────────────────────────────────────────────

@router.get("/live", response_model=TrafficOverview)
def traffic_live(
    city_id: int | None = Query(None, description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Aggregated live traffic dashboard across all roads."""
    road_q = select(Road)
    if city_id is not None:
        road_q = road_q.where(Road.city_id == city_id)
    roads = db.scalars(road_q).all()

    total_vehicles = 0
    speeds: list[float] = []
    congestion_counts: dict[str, int] = {}
    road_traffics: list[RoadTraffic] = []

    for road in roads:
        rt = _road_to_traffic(db, road)
        road_traffics.append(rt)
        if rt.vehicle_count is not None:
            total_vehicles += rt.vehicle_count
        if rt.avg_speed_kmph is not None:
            speeds.append(rt.avg_speed_kmph)
        if rt.congestion_level:
            congestion_counts[rt.congestion_level] = congestion_counts.get(rt.congestion_level, 0) + 1

    avg_speed = round(sum(speeds) / len(speeds), 1) if speeds else None
    overall_congestion = _worst_congestion(congestion_counts)
    top_congested = sorted(
        [r for r in road_traffics if r.congestion_level],
        key=lambda r: _congestion_rank(r.congestion_level or ""),
        reverse=True,
    )[:5]

    # counts
    ix_q = select(Intersection)
    if city_id is not None:
        ix_q = ix_q.where(Intersection.city_id == city_id)
    total_intersections = db.scalar(select(func.count()).select_from(Intersection).subquery().select()) or 0
    total_signals = db.scalar(select(func.count()).select_from(TrafficSignal)) or 0

    return TrafficOverview(
        total_roads=len(roads),
        total_intersections=total_intersections,
        total_signals=total_signals,
        total_vehicles_tracked=total_vehicles,
        avg_speed_kmph=avg_speed,
        overall_congestion_level=overall_congestion,
        congestion_breakdown=congestion_counts,
        top_congested_roads=top_congested,
    )


# ── GET /api/traffic/roads ───────────────────────────────────────────

@router.get("/roads", response_model=list[RoadTraffic])
def list_roads(
    city_id: int | None = Query(None),
    road_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = select(Road)
    if city_id is not None:
        q = q.where(Road.city_id == city_id)
    if road_type is not None:
        q = q.where(Road.road_type == road_type)
    roads = db.scalars(q).all()
    return [_road_to_traffic(db, road) for road in roads]


# ── GET /api/traffic/roads/{id} ──────────────────────────────────────

@router.get("/roads/{road_id}", response_model=RoadTraffic)
def get_road(
    road_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    road = db.get(Road, road_id)
    if road is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Road not found")
    return _road_to_traffic(db, road)


# ── GET /api/traffic/intersections ───────────────────────────────────

@router.get("/intersections", response_model=list[IntersectionTraffic])
def list_intersections(
    city_id: int | None = Query(None),
    intersection_type: str | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = select(Intersection).options(
        joinedload(Intersection.traffic_signal),
        joinedload(Intersection.roads),
    )
    if city_id is not None:
        q = q.where(Intersection.city_id == city_id)
    if intersection_type is not None:
        q = q.where(Intersection.intersection_type == intersection_type)
    intersections = db.scalars(q).unique().all()
    return [_intersection_to_traffic(db, ix) for ix in intersections]


# ── GET /api/traffic/intersections/{id} ─────────────────────────────

@router.get("/intersections/{intersection_id}", response_model=IntersectionTraffic)
def get_intersection(
    intersection_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ix = db.scalar(
        select(Intersection)
        .options(
            joinedload(Intersection.traffic_signal),
            joinedload(Intersection.roads),
        )
        .where(Intersection.id == intersection_id)
    )
    if ix is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intersection not found")
    return _intersection_to_traffic(db, ix)


# ── Congestion helpers ────────────────────────────────────────────────

_CONGESTION_ORDER = ["free_flow", "moderate", "slow", "congested", "gridlock"]


def _congestion_rank(level: str) -> int:
    try:
        return _CONGESTION_ORDER.index(level)
    except ValueError:
        return -1


def _worst_congestion(counts: dict[str, int]) -> str | None:
    """Return the most-severe congestion level that has at least one road."""
    for level in reversed(_CONGESTION_ORDER):
        if counts.get(level, 0) > 0:
            return level
    return None
