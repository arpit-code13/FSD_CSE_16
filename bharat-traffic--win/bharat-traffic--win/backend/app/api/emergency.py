"""Emergency Route API endpoints.

Provides deterministic mock emergency route computation with:
  - Route creation with ETA, time saved, and coordinated signals
  - Route retrieval
  - Re-simulation with current traffic conditions
  - Manual approval workflow

Approval is required before routes become active.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.core.errors import AppError
from app.models.user import User
from app.schemas.emergency import (
    ApprovalResult,
    EmergencyRouteCreate,
    EmergencyRouteOut,
    EmergencyRouteResult,
    SimulationDetail,
    CoordinatedSignal,
)
from app.services import emergency_service

router = APIRouter(prefix="/api/emergency", tags=["emergency"])


@router.post("/routes", response_model=EmergencyRouteResult, status_code=201)
def create_emergency_route(
    body: EmergencyRouteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new emergency route with deterministic simulation.

    Computes ETA, time saved, and identifies coordinated signals.
    Route starts in 'pending' status and requires manual approval.
    """
    try:
        route = emergency_service.create_emergency_route(
            db,
            city_id=body.city_id,
            user_id=user.id,
            origin_intersection_id=body.origin_intersection_id,
            destination_intersection_id=body.destination_intersection_id,
            incident_id=body.incident_id,
            priority=body.priority.value,
            name=body.name,
        )
    except ValueError as e:
        raise AppError(status_code=400, detail=str(e))

    # Build simulation detail from route
    sim = route.simulation_result or {}
    coordinated = route.simulation_coordinated_signals or []
    coordinated_parsed = [
        CoordinatedSignal(**s) if isinstance(s, dict) else s
        for s in coordinated
    ]

    return {
        "route": route,
        "simulation": SimulationDetail(
            eta_seconds=route.simulation_eta_seconds or 0.0,
            time_saved_seconds=route.simulation_time_saved_seconds or 0.0,
            time_saved_pct=sim.get("time_saved_pct", 0.0),
            coordinated_signals=coordinated_parsed,
            route_intersections=sim.get("route_intersections", []),
            total_distance_meters=sim.get("total_distance_meters", 0.0),
            avg_speed_kmph=sim.get("avg_speed_kmph", 0.0),
            signal_count=sim.get("signal_count", 0),
        ),
    }


@router.get("/{route_id}", response_model=EmergencyRouteResult)
def get_emergency_route(
    route_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve an emergency route by ID with simulation details."""
    route = emergency_service.get_emergency_route_by_id(db, route_id)
    if route is None:
        raise AppError(status_code=404, detail="Emergency route not found")

    sim = route.simulation_result or {}
    coordinated = route.simulation_coordinated_signals or []
    coordinated_parsed = [
        CoordinatedSignal(**s) if isinstance(s, dict) else s
        for s in coordinated
    ]

    return {
        "route": route,
        "simulation": SimulationDetail(
            eta_seconds=route.simulation_eta_seconds or 0.0,
            time_saved_seconds=route.simulation_time_saved_seconds or 0.0,
            time_saved_pct=sim.get("time_saved_pct", 0.0),
            coordinated_signals=coordinated_parsed,
            route_intersections=sim.get("route_intersections", []),
            total_distance_meters=sim.get("total_distance_meters", 0.0),
            avg_speed_kmph=sim.get("avg_speed_kmph", 0.0),
            signal_count=sim.get("signal_count", 0),
        ),
    }


@router.post("/{route_id}/simulate", response_model=EmergencyRouteResult)
def simulate_emergency_route(
    route_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Re-simulate an emergency route with current traffic conditions.

    Updates ETA, time saved, and coordinated signals based on latest data.
    """
    result = emergency_service.simulate_emergency_route(db, route_id)
    if result is None:
        raise AppError(status_code=404, detail="Emergency route not found")

    route = emergency_service.get_emergency_route_by_id(db, route_id)
    sim = route.simulation_result or {}
    coordinated = route.simulation_coordinated_signals or []
    coordinated_parsed = [
        CoordinatedSignal(**s) if isinstance(s, dict) else s
        for s in coordinated
    ]

    return {
        "route": route,
        "simulation": SimulationDetail(
            eta_seconds=result["eta_seconds"],
            time_saved_seconds=result["time_saved_seconds"],
            time_saved_pct=result["time_saved_pct"],
            coordinated_signals=coordinated_parsed,
            route_intersections=result["route_intersections"],
            total_distance_meters=result["total_distance_meters"],
            avg_speed_kmph=result["avg_speed_kmph"],
            signal_count=result["signal_count"],
        ),
    }


@router.post("/{route_id}/approve", response_model=ApprovalResult)
def approve_emergency_route(
    route_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Approve an emergency route — ADMIN only, manual approval required.

    Sets the route to 'active' status upon approval.
    """
    result = emergency_service.approve_emergency_route(db, route_id, user.id)
    if result is None:
        raise AppError(status_code=404, detail="Emergency route not found")
    if "error" in result:
        raise AppError(status_code=409, detail=result["error"])

    return result
