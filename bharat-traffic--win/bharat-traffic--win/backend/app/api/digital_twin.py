"""Digital Twin API — GeoJSON network data with live traffic state.

All endpoints require a valid JWT (authenticated USER or ADMIN).

Every collection endpoint returns a GeoJSON ``FeatureCollection`` so the
frontend can render directly on a map.  Where the underlying model has
coordinates (City, Intersection) the ``geometry`` is a ``Point``; where
the model lacks geometry (Road, Zone, Corridor) ``geometry`` is ``null``
and the frontend infers placement from connection data.

City selection is dynamic via the ``city_id`` query parameter.

Stage 36 adds ``POST /api/digital-twin/simulate`` which runs a SUMO
simulation on the current digital twin state and returns the simulated
traffic state (vehicles, speed, queue, congestion, travel time).
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.schemas.digital_twin_sumo import (
    DigitalTwinSimRequest,
    DigitalTwinSimResult,
)

from app.api.deps import get_current_user
from app.api.traffic import _estimate_queue, _latest_record
from app.core.database import get_db
from app.models.city import City
from app.models.corridor import Corridor
from app.models.intersection import Intersection
from app.models.road import Road
from app.models.traffic_signal import TrafficSignal
from app.models.user import User
from app.models.zone import Zone
from app.schemas.digital_twin import (
    CityOverview,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    GeoJSONPoint,
)

router = APIRouter(prefix="/api/digital-twin", tags=["digital-twin"])


# ── Helpers ───────────────────────────────────────────────────────────

def _point(longitude: float, latitude: float) -> dict:
    return {"type": "Point", "coordinates": [longitude, latitude]}


def _feature(geometry: dict | None, **properties) -> GeoJSONFeature:
    return GeoJSONFeature(geometry=geometry, properties=properties)


# ── GET /api/digital-twin ─────────────────────────────────────────────

@router.get("", response_model=CityOverview)
def digital_twin_overview(
    city_id: int = Query(..., description="City to inspect"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return city metadata and summary statistics for the digital twin."""
    city = db.get(City, city_id)
    if city is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

    total_zones = db.scalar(select(func.count()).where(Zone.city_id == city_id)) or 0
    total_corridors = db.scalar(select(func.count()).where(Corridor.city_id == city_id)) or 0
    total_roads = db.scalar(select(func.count()).where(Road.city_id == city_id)) or 0
    total_intersections = db.scalar(select(func.count()).where(Intersection.city_id == city_id)) or 0
    total_signals = db.scalar(
        select(func.count())
        .select_from(TrafficSignal)
        .join(Intersection, TrafficSignal.intersection_id == Intersection.id)
        .where(Intersection.city_id == city_id)
    ) or 0

    # Aggregate vehicle count and congestion from latest records per road
    from app.models.traffic_record import TrafficRecord

    roads = db.scalars(select(Road).where(Road.city_id == city_id)).all()
    total_vehicles = 0
    congestion_counts: dict[str, int] = {}
    for road in roads:
        rec = _latest_record(db, road.id)
        if rec:
            total_vehicles += rec.vehicle_count
            congestion_counts[rec.congestion_level] = congestion_counts.get(rec.congestion_level, 0) + 1

    from app.api.traffic import _worst_congestion

    return CityOverview(
        city_id=city.id,
        city_name=city.name,
        state=city.state,
        country=city.country,
        latitude=city.latitude,
        longitude=city.longitude,
        total_zones=total_zones,
        total_corridors=total_corridors,
        total_roads=total_roads,
        total_intersections=total_intersections,
        total_signals=total_signals,
        total_vehicles_tracked=total_vehicles,
        overall_congestion_level=_worst_congestion(congestion_counts),
    )


# ── GET /api/digital-twin/cities ─────────────────────────────────────

@router.get("/cities", response_model=GeoJSONFeatureCollection)
def list_cities(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """All active cities as GeoJSON Points."""
    cities = db.scalars(select(City).where(City.is_active == True)).all()
    features = []
    for c in cities:
        geom = _point(c.longitude, c.latitude) if c.latitude and c.longitude else None
        features.append(_feature(
            geom,
            id=c.id,
            name=c.name,
            state=c.state,
            country=c.country,
        ))
    return GeoJSONFeatureCollection(features=features)


# ── GET /api/digital-twin/zones ──────────────────────────────────────

@router.get("/zones", response_model=GeoJSONFeatureCollection)
def list_zones(
    city_id: int = Query(..., description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Zones for a city — no geometry in the model, returned as null-geometry features."""
    zones = db.scalars(select(Zone).where(Zone.city_id == city_id)).all()
    features = [
        _feature(None, id=z.id, name=z.name, zone_type=z.zone_type, city_id=z.city_id)
        for z in zones
    ]
    return GeoJSONFeatureCollection(features=features)


# ── GET /api/digital-twin/corridors ──────────────────────────────────

@router.get("/corridors", response_model=GeoJSONFeatureCollection)
def list_corridors(
    city_id: int = Query(..., description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Corridors for a city — no geometry, returned as null-geometry features."""
    corridors = db.scalars(select(Corridor).where(Corridor.city_id == city_id)).all()
    features = [
        _feature(
            None,
            id=co.id,
            name=co.name,
            road_type=co.road_type,
            length_meters=co.length_meters,
            city_id=co.city_id,
        )
        for co in corridors
    ]
    return GeoJSONFeatureCollection(features=features)


# ── GET /api/digital-twin/roads ──────────────────────────────────────

@router.get("/roads", response_model=GeoJSONFeatureCollection)
def list_roads(
    city_id: int = Query(..., description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Roads for a city with live traffic state — null geometry (rendered from intersections)."""
    roads = db.scalars(select(Road).where(Road.city_id == city_id)).all()
    features = []
    for road in roads:
        rec = _latest_record(db, road.id)
        density: float | None = None
        if rec and road.length_meters:
            km = road.length_meters / 1000.0
            if km > 0:
                density = round(rec.vehicle_count / km, 1)
        props: dict = {
            "id": road.id,
            "name": road.name,
            "road_type": road.road_type,
            "city_id": road.city_id,
            "zone_id": road.zone_id,
            "corridor_id": road.corridor_id,
            "length_meters": road.length_meters,
            "lanes": road.lanes,
            "speed_limit_kmph": road.speed_limit_kmph,
            "vehicle_count": rec.vehicle_count if rec else None,
            "avg_speed_kmph": rec.avg_speed_kmph if rec else None,
            "congestion_level": rec.congestion_level if rec else None,
            "vehicle_composition": rec.vehicle_composition if rec else None,
            "density_vehicles_per_km": density,
            "queue_length_estimate": _estimate_queue(rec.congestion_level) if rec else None,
            "recorded_at": rec.timestamp.isoformat() if rec else None,
            "connected_intersection_ids": [ix.id for ix in road.intersections],
        }
        features.append(_feature(None, **props))
    return GeoJSONFeatureCollection(features=features)


# ── GET /api/digital-twin/intersections ──────────────────────────────

@router.get("/intersections", response_model=GeoJSONFeatureCollection)
def list_intersections(
    city_id: int = Query(..., description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Intersections as GeoJSON Points with signal status."""
    intersections = db.scalars(
        select(Intersection)
        .options(joinedload(Intersection.traffic_signal), joinedload(Intersection.roads))
        .where(Intersection.city_id == city_id)
    ).unique().all()
    features = []
    for ix in intersections:
        geom = _point(ix.longitude, ix.latitude)
        sig = ix.traffic_signal
        signal_props = None
        if sig:
            signal_props = {
                "signal_type": sig.signal_type,
                "cycle_time_seconds": sig.cycle_time_seconds,
                "is_active": sig.is_active,
                "phases": sig.phases,
            }
        features.append(_feature(
            geom,
            id=ix.id,
            name=ix.name,
            intersection_type=ix.intersection_type,
            city_id=ix.city_id,
            signal=signal_props,
            connected_road_ids=[r.id for r in ix.roads],
            connected_road_names=[r.name for r in ix.roads],
        ))
    return GeoJSONFeatureCollection(features=features)


# ── GET /api/digital-twin/signals ────────────────────────────────────

@router.get("/signals", response_model=GeoJSONFeatureCollection)
def list_signals(
    city_id: int = Query(..., description="Filter by city"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Traffic signals as GeoJSON Points at their intersection coordinates."""
    signals = db.scalars(
        select(TrafficSignal)
        .join(Intersection, TrafficSignal.intersection_id == Intersection.id)
        .where(Intersection.city_id == city_id)
        .options(joinedload(TrafficSignal.intersection))
    ).unique().all()
    features = []
    for sig in signals:
        ix = sig.intersection
        geom = _point(ix.longitude, ix.latitude)
        features.append(_feature(
            geom,
            id=sig.id,
            intersection_id=ix.id,
            intersection_name=ix.name,
            signal_type=sig.signal_type,
            cycle_time_seconds=sig.cycle_time_seconds,
            is_active=sig.is_active,
            phases=sig.phases,
        ))
    return GeoJSONFeatureCollection(features=features)


# ── POST /api/digital-twin/simulate ──────────────────────────────────

@router.post("/simulate", response_model=DigitalTwinSimResult)
def simulate_digital_twin(
    body: DigitalTwinSimRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Run a SUMO simulation on the current digital twin traffic state.

    Reads live traffic data from the DB, generates a SUMO network,
    runs the simulation, and returns the simulated traffic state:

    - vehicles (per road)
    - speed (per road)
    - queue length (per road)
    - congestion level (per road)
    - travel time (per road)

    When SUMO is not installed, returns a deterministic estimate so
    the frontend keeps working.
    """
    from app.services.digital_twin_sumo import run_digital_twin_sumo

    result = run_digital_twin_sumo(
        db,
        city_id=body.city_id,
        duration_seconds=body.duration_seconds,
        step_size=body.step_size,
        traffic_multiplier=body.traffic_multiplier,
    )

    return DigitalTwinSimResult(**result)
