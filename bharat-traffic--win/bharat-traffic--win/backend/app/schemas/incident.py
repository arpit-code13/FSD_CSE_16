"""Schemas for Incident CRUD API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel


# ── Enums ─────────────────────────────────────────────────────────────

class IncidentType(str, Enum):
    ACCIDENT = "accident"
    BLOCKAGE = "blockage"
    BREAKDOWN = "breakdown"
    CONSTRUCTION = "construction"
    FLOOD = "flood"
    SIGNAL_FAILURE = "signal_failure"


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"


# ── Request schemas ───────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    """Create a new incident report."""
    city_id: int
    incident_type: IncidentType
    severity: SeverityLevel
    description: str | None = None
    road_id: int | None = None
    intersection_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None


class IncidentUpdate(BaseModel):
    """Update an existing incident."""
    severity: SeverityLevel | None = None
    status: IncidentStatus | None = None
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None


# ── Response schemas ──────────────────────────────────────────────────

class IncidentOut(BaseModel):
    """A stored incident record."""
    id: int
    city_id: int
    incident_type: str
    severity: str
    status: str
    description: str | None
    road_id: int | None
    intersection_id: int | None
    latitude: float | None
    longitude: float | None
    reported_at: datetime | None
    resolved_at: datetime | None
    # reported_by omitted — column not yet present in deployed DB
    created_at: datetime | None

    model_config = {"from_attributes": True}
