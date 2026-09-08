"""Schemas for Emergency Route API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────

class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# ── Request schemas ───────────────────────────────────────────────────

class EmergencyRouteCreate(BaseModel):
    """Create a new emergency route."""
    city_id: int
    origin_intersection_id: int
    destination_intersection_id: int
    incident_id: int | None = None
    priority: PriorityLevel = PriorityLevel.HIGH
    name: str | None = None


# ── Response schemas ──────────────────────────────────────────────────

class CoordinatedSignal(BaseModel):
    """A signal along the route that should be coordinated."""
    signal_id: int
    intersection_id: int
    intersection_name: str
    green_extension_seconds: int
    phase: str


class SimulationDetail(BaseModel):
    """Detailed simulation output for a route."""
    eta_seconds: float
    time_saved_seconds: float
    time_saved_pct: float
    coordinated_signals: list[CoordinatedSignal]
    route_intersections: list[int]
    total_distance_meters: float
    avg_speed_kmph: float
    signal_count: int


class EmergencyRouteOut(BaseModel):
    """A stored emergency route record."""
    id: int
    city_id: int
    incident_id: int | None
    origin_intersection_id: int
    destination_intersection_id: int
    name: str | None
    priority: str
    status: str
    distance_meters: float | None
    estimated_time_seconds: float | None
    route_path: dict | None
    approval_status: str
    approved_by: int | None
    approved_at: datetime | None
    simulation_eta_seconds: float | None
    simulation_time_saved_seconds: float | None
    simulation_coordinated_signals: list | None
    created_by: int | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class EmergencyRouteResult(BaseModel):
    """Full emergency route output with simulation details."""
    route: EmergencyRouteOut
    simulation: SimulationDetail

    model_config = {"from_attributes": True}


class ApprovalResult(BaseModel):
    """Result of approving/rejecting a route."""
    route_id: int
    approval_status: str
    status: str | None = None
    approved_by: int | None
    approved_at: datetime | None
    message: str
