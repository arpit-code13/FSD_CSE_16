"""SUMO Simulation API endpoints.

Provides REST endpoints for managing SUMO simulations via the backend.
The frontend communicates with these endpoints; SUMO is never accessed
directly from the frontend.

All endpoints require JWT authentication.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.errors import AppError
from app.integrations.sumo import sumo_service, SumoUnavailableError, SumoSessionError
from app.models.user import User
from app.schemas.sumo import (
    SumoSimStart,
    SumoSimStep,
    SumoStatus,
    SumoSimSession,
    SumoEdgeData,
    SumoVehicleData,
    SumoSimStepResult,
)

router = APIRouter(prefix="/api/sumo", tags=["sumo"])


@router.post("/status", response_model=SumoStatus)
def get_sumo_status(_user: User = Depends(get_current_user)):
    """Check whether SUMO is installed and available."""
    result = sumo_service.is_available()
    return SumoStatus(**result)


@router.post("/simulations", response_model=SumoSimSession, status_code=201)
def start_simulation(
    body: SumoSimStart,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Start a new SUMO simulation for a city.

    Generates SUMO network files from DB models, starts the SUMO
    subprocess, and returns a session ID for subsequent control.
    """
    try:
        result = sumo_service.start(
            db,
            city_id=body.city_id,
            duration_seconds=body.duration_seconds,
            step_size=body.step_size,
            use_gui=body.use_gui,
        )
        return SumoSimSession(**result)
    except SumoUnavailableError as e:
        raise AppError(status_code=503, detail=str(e))
    except ValueError as e:
        raise AppError(status_code=400, detail=str(e))


@router.get("/simulations/{session_id}", response_model=SumoSimSession)
def get_simulation_status(
    session_id: str,
    _user: User = Depends(get_current_user),
):
    """Get the current status of a running simulation."""
    try:
        result = sumo_service.get_status(session_id)
        return SumoSimSession(**result)
    except SumoSessionError as e:
        raise AppError(status_code=404, detail=str(e))


@router.post("/simulations/{session_id}/step", response_model=SumoSimStepResult)
def step_simulation(
    session_id: str,
    body: SumoSimStep,
    _user: User = Depends(get_current_user),
):
    """Advance the simulation by N steps.

    Returns updated edge data and vehicle counts after the step(s).
    """
    try:
        result = sumo_service.step(session_id, num_steps=body.steps)
        return SumoSimStepResult(
            session_id=result["session_id"],
            current_step=result["current_step"],
            total_vehicles=result["total_vehicles"],
            mean_speed=result["mean_speed"],
            edges=[SumoEdgeData(**e) for e in result["edges"]],
            status=result["status"],
        )
    except SumoSessionError as e:
        raise AppError(status_code=400, detail=str(e))


@router.post("/simulations/{session_id}/stop")
def stop_simulation(
    session_id: str,
    _user: User = Depends(get_current_user),
):
    """Stop a running simulation and clean up resources."""
    try:
        sumo_service.stop(session_id)
        return {"detail": "Simulation stopped", "session_id": session_id}
    except SumoSessionError as e:
        raise AppError(status_code=404, detail=str(e))


@router.get("/simulations/{session_id}/edges", response_model=list[SumoEdgeData])
def get_edge_data(
    session_id: str,
    _user: User = Depends(get_current_user),
):
    """Get current edge (road segment) traffic data from the simulation."""
    try:
        edges = sumo_service.get_edge_data(session_id)
        return [SumoEdgeData(**e) for e in edges]
    except SumoSessionError as e:
        raise AppError(status_code=404, detail=str(e))


@router.get("/simulations/{session_id}/vehicles", response_model=list[SumoVehicleData])
def get_vehicle_data(
    session_id: str,
    _user: User = Depends(get_current_user),
):
    """Get current vehicle data from the simulation."""
    try:
        vehicles = sumo_service.get_vehicle_data(session_id)
        return [SumoVehicleData(**v) for v in vehicles]
    except SumoSessionError as e:
        raise AppError(status_code=404, detail=str(e))
