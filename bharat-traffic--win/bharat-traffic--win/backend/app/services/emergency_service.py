"""EmergencyRouteService — deterministic emergency route engine.

Computes emergency routes between intersections, estimates ETA,
calculates time saved vs normal travel, and identifies coordinated
signals along the path.

Uses deterministic heuristics based on:
  • Road distance and speed limits
  • Traffic records for current congestion
  • Signal positions along the route

Future stages can integrate real routing engines.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.emergency_route import EmergencyRoute
from app.models.intersection import Intersection
from app.models.road import Road, road_intersection
from app.models.traffic_record import TrafficRecord
from app.models.traffic_signal import TrafficSignal

# Congestion severity ordered least → most severe
_CONGESTION_ORDER = ["free_flow", "moderate", "slow", "congested", "gridlock"]

# Speed reduction factors for emergency vehicles (they're faster)
_EMERGENCY_SPEED_FACTOR = 1.4  # 40% faster than normal
_EMERGENCY_CYCLE_TIME = 15  # seconds to extend green at coordinated signals


def _congestion_rank(level: str) -> int:
    try:
        return _CONGESTION_ORDER.index(level)
    except ValueError:
        return -1


def _latest_record(db: Session, road_id: int) -> TrafficRecord | None:
    return db.scalar(
        select(TrafficRecord)
        .where(TrafficRecord.road_id == road_id)
        .order_by(TrafficRecord.timestamp.desc())
        .limit(1)
    )


def _get_road_between_intersections(
    db: Session, origin_id: int, destination_id: int
) -> Road | None:
    """Find a road connecting two intersections."""
    # Find roads connected to origin
    origin_road_ids = db.scalars(
        select(road_intersection.c.road_id).where(
            road_intersection.c.intersection_id == origin_id
        )
    ).all()

    # Find roads connected to destination
    dest_road_ids = db.scalars(
        select(road_intersection.c.road_id).where(
            road_intersection.c.intersection_id == destination_id
        )
    ).all()

    # Find common road
    common = set(origin_road_ids) & set(dest_road_ids)
    if common:
        return db.get(Road, min(common))

    # No direct road — find shortest path via shared corridors
    # For deterministic mock: use the road at origin with shortest distance
    for rid in origin_road_ids:
        road = db.get(Road, rid)
        if road:
            return road

    return None


def _find_path_intersections(
    db: Session, origin_id: int, destination_id: int, city_id: int
) -> list[int]:
    """Find a path of intersections from origin to destination.

    For deterministic mock: returns [origin, destination] as the simplest path.
    A real implementation would use BFS/Dijkstra on the intersection graph.
    """
    return [origin_id, destination_id]


def _find_signals_on_path(
    db: Session, intersection_ids: list[int]
) -> list[dict]:
    """Find traffic signals at intersections along the path."""
    signals = []
    for ix_id in intersection_ids:
        sig = db.scalar(
            select(TrafficSignal).where(TrafficSignal.intersection_id == ix_id)
        )
        if sig:
            ix = db.get(Intersection, ix_id)
            signals.append({
                "signal_id": sig.id,
                "intersection_id": ix_id,
                "intersection_name": ix.name if ix else f"Intersection #{ix_id}",
                "current_cycle_seconds": sig.cycle_time_seconds or 90,
                "signal_type": sig.signal_type,
                "is_active": sig.is_active,
            })
    return signals


def _compute_route_metrics(
    db: Session,
    origin_id: int,
    destination_id: int,
    city_id: int,
    priority: str,
) -> dict:
    """Compute deterministic route metrics.

    Returns a dict with:
      eta_seconds, time_saved_seconds, time_saved_pct,
      coordinated_signals, route_intersections, total_distance_meters,
      avg_speed_kmph, signal_count
    """
    path = _find_path_intersections(db, origin_id, destination_id, city_id)
    signals = _find_signals_on_path(db, path)

    # Compute distance by summing road segments
    total_distance = 0.0
    total_normal_time = 0.0
    total_emergency_time = 0.0

    for i in range(len(path) - 1):
        road = _get_road_between_intersections(db, path[i], path[i + 1])
        if road:
            dist = road.length_meters or 1000.0  # default 1km
            total_distance += dist

            # Normal speed: road speed limit or 40 km/h default
            normal_speed = road.speed_limit_kmph or 40.0

            # Apply congestion factor from latest record
            record = _latest_record(db, road.id)
            if record:
                congestion_factor = 1.0 - (0.1 * _congestion_rank(record.congestion_level))
                normal_speed *= max(congestion_factor, 0.3)

            # Emergency speed: faster due to priority
            emergency_speed = normal_speed * _EMERGENCY_SPEED_FACTOR

            # Time = distance / speed (convert km/h to m/s)
            normal_time = (dist / 1000.0) / (normal_speed / 3600.0)
            emergency_time = (dist / 1000.0) / (emergency_speed / 3600.0)

            total_normal_time += normal_time
            total_emergency_time += emergency_time
        else:
            # No direct road — estimate 500m at 30 km/h
            total_distance += 500.0
            total_normal_time += 60.0
            total_emergency_time += 43.0

    time_saved = total_normal_time - total_emergency_time
    time_saved_pct = (time_saved / total_normal_time * 100) if total_normal_time > 0 else 0.0

    # Build coordinated signals — extend green for emergency priority
    coordinated = []
    for sig_info in signals:
        if sig_info["is_active"]:
            coordinated.append({
                "signal_id": sig_info["signal_id"],
                "intersection_id": sig_info["intersection_id"],
                "intersection_name": sig_info["intersection_name"],
                "green_extension_seconds": _EMERGENCY_CYCLE_TIME,
                "phase": "green_priority",
            })

    avg_speed = (total_distance / 1000.0) / (total_emergency_time / 3600.0) if total_emergency_time > 0 else 40.0

    return {
        "eta_seconds": round(total_emergency_time, 1),
        "time_saved_seconds": round(time_saved, 1),
        "time_saved_pct": round(time_saved_pct, 1),
        "coordinated_signals": coordinated,
        "route_intersections": path,
        "total_distance_meters": round(total_distance, 1),
        "avg_speed_kmph": round(avg_speed, 1),
        "signal_count": len(signals),
    }


# ── Public service functions ──────────────────────────────────────────

def create_emergency_route(
    db: Session,
    *,
    city_id: int,
    user_id: int,
    origin_intersection_id: int,
    destination_intersection_id: int,
    incident_id: int | None = None,
    priority: str = "high",
    name: str | None = None,
) -> EmergencyRoute:
    """Create an emergency route and run deterministic simulation.

    Returns the created EmergencyRoute with simulation results persisted.
    """
    # Validate intersections exist
    origin = db.get(Intersection, origin_intersection_id)
    if origin is None:
        raise ValueError("Origin intersection not found")
    dest = db.get(Intersection, destination_intersection_id)
    if dest is None:
        raise ValueError("Destination intersection not found")

    # Compute route metrics
    metrics = _compute_route_metrics(
        db, origin_intersection_id, destination_intersection_id, city_id, priority
    )

    # Build route path
    route_path = {
        "intersections": metrics["route_intersections"],
        "origin": {"id": origin.id, "name": origin.name, "lat": origin.latitude, "lng": origin.longitude},
        "destination": {"id": dest.id, "name": dest.name, "lat": dest.latitude, "lng": dest.longitude},
    }

    route = EmergencyRoute(
        city_id=city_id,
        incident_id=incident_id,
        origin_intersection_id=origin_intersection_id,
        destination_intersection_id=destination_intersection_id,
        name=name or f"Emergency: {origin.name} → {dest.name}",
        priority=priority,
        status="pending",
        distance_meters=metrics["total_distance_meters"],
        estimated_time_seconds=metrics["eta_seconds"],
        route_path=route_path,
        created_by=user_id,
        approval_status="pending",
        simulation_eta_seconds=metrics["eta_seconds"],
        simulation_time_saved_seconds=metrics["time_saved_seconds"],
        simulation_coordinated_signals=metrics["coordinated_signals"],
        simulation_result=metrics,
    )
    db.add(route)
    db.commit()
    db.refresh(route)

    return route


def get_emergency_route_by_id(db: Session, route_id: int) -> EmergencyRoute | None:
    """Retrieve an emergency route by ID."""
    return db.get(EmergencyRoute, route_id)


def simulate_emergency_route(db: Session, route_id: int) -> dict | None:
    """Re-simulate an existing emergency route with current traffic.

    Returns updated simulation details or None if not found.
    """
    route = db.get(EmergencyRoute, route_id)
    if route is None:
        return None

    # Re-compute with current traffic
    metrics = _compute_route_metrics(
        db,
        route.origin_intersection_id,
        route.destination_intersection_id,
        route.city_id,
        route.priority,
    )

    # Update the route's simulation fields
    route.simulation_eta_seconds = metrics["eta_seconds"]
    route.simulation_time_saved_seconds = metrics["time_saved_seconds"]
    route.simulation_coordinated_signals = metrics["coordinated_signals"]
    route.simulation_result = metrics
    db.commit()
    db.refresh(route)

    return {
        "route_id": route.id,
        "status": "simulated",
        "eta_seconds": metrics["eta_seconds"],
        "time_saved_seconds": metrics["time_saved_seconds"],
        "time_saved_pct": metrics["time_saved_pct"],
        "coordinated_signals": metrics["coordinated_signals"],
        "route_intersections": metrics["route_intersections"],
        "total_distance_meters": metrics["total_distance_meters"],
        "avg_speed_kmph": metrics["avg_speed_kmph"],
        "signal_count": metrics["signal_count"],
    }


def approve_emergency_route(
    db: Session, route_id: int, user_id: int
) -> dict | None:
    """Approve an emergency route — manual approval required.

    Sets approval_status to 'approved' and activates the route.
    """
    route = db.get(EmergencyRoute, route_id)
    if route is None:
        return None
    if route.approval_status != "pending":
        return {"error": f"Already {route.approval_status}"}

    now = datetime.now(timezone.utc)
    route.approval_status = "approved"
    route.approved_by = user_id
    route.approved_at = now
    route.status = "active"
    db.commit()
    db.refresh(route)

    return {
        "route_id": route.id,
        "approval_status": "approved",
        "status": "active",
        "approved_by": user_id,
        "approved_at": now,
        "message": "Emergency route approved. Route is now active.",
    }


def list_emergency_routes(
    db: Session,
    city_id: int | None = None,
    status: str | None = None,
) -> list[EmergencyRoute]:
    """List emergency routes with optional filters."""
    q = select(EmergencyRoute)
    if city_id is not None:
        q = q.where(EmergencyRoute.city_id == city_id)
    if status is not None:
        q = q.where(EmergencyRoute.status == status)
    q = q.order_by(EmergencyRoute.created_at.desc())
    return list(db.scalars(q).all())
