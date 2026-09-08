"""Schemas for SUMO simulation integration API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────

class SumoSimStatus(str, Enum):
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"


# ── Request schemas ────────────────────────────────────────────────────

class SumoSimStart(BaseModel):
    """Request to start a new SUMO simulation."""
    city_id: int
    duration_seconds: int = Field(default=3600, ge=1, le=86400, description="Simulated time in seconds")
    step_size: float = Field(default=1.0, gt=0, le=10.0, description="Seconds per TraCI step")
    use_gui: bool = Field(default=False, description="Use sumo-gui (not supported in headless mode)")


class SumoSimStep(BaseModel):
    """Request to advance a simulation by N steps."""
    steps: int = Field(default=1, ge=1, le=10000)


# ── Response schemas ───────────────────────────────────────────────────

class SumoStatus(BaseModel):
    """SUMO availability status."""
    available: bool
    sumo_home: str | None = None
    sumo_version: str | None = None
    message: str


class SumoSimSession(BaseModel):
    """Active SUMO simulation session."""
    session_id: str
    city_id: int
    status: SumoSimStatus
    current_step: int
    total_steps: int
    step_size: float
    started_at: datetime
    config_path: str | None = None


class SumoEdgeData(BaseModel):
    """Traffic data for a single SUMO edge (road segment)."""
    edge_id: str
    vehicles: int
    mean_speed: float
    occupancy: float
    waiting_time: float
    travel_time: float


class SumoVehicleData(BaseModel):
    """Data for a single vehicle in the simulation."""
    vehicle_id: str
    speed: float
    position: float
    edge_id: str
    type_id: str
    route_id: str | None = None


class SumoSimStepResult(BaseModel):
    """Result of advancing a simulation step."""
    session_id: str
    current_step: int
    total_vehicles: int
    mean_speed: float
    edges: list[SumoEdgeData]
    status: SumoSimStatus
