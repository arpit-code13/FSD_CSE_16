"""Schemas for the Digital Twin SUMO simulation pipeline.

The pipeline reads current traffic data from the DB, feeds it into a
SUMO simulation, and returns the simulated traffic state in the same
format the frontend already consumes from /api/digital-twin/roads.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ── Request ────────────────────────────────────────────────────────────

class DigitalTwinSimRequest(BaseModel):
    """Request to run a SUMO simulation on the current digital twin state."""
    city_id: int
    duration_seconds: int = Field(
        default=600, ge=60, le=7200,
        description="Simulated time in seconds (10 min default)",
    )
    step_size: float = Field(
        default=1.0, gt=0, le=10.0,
        description="Seconds per TraCI step",
    )
    # Optional overrides — when omitted, live traffic data is used
    traffic_multiplier: float = Field(
        default=1.0, ge=0.1, le=10.0,
        description="Scale vehicle counts by this factor",
    )


# ── Enums ──────────────────────────────────────────────────────────────

class DigitalTwinSimStatus(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    UNAVAILABLE = "unavailable"


# ── Per-road result ────────────────────────────────────────────────────

class DigitalTwinSimRoad(BaseModel):
    """Simulated traffic state for a single road — mirrors DigitalTwin road format."""
    road_id: int
    road_name: str
    road_type: str
    # Pre-simulation (from DB traffic records)
    original_vehicles: int
    original_speed_kmph: float
    original_congestion: str
    # Post-simulation (from SUMO)
    simulated_vehicles: int
    simulated_speed_kmph: float
    simulated_congestion: str
    # Derived metrics
    queue_length_estimate: int
    travel_time_seconds: float


# ── Aggregated summary ────────────────────────────────────────────────

class DigitalTwinSimSummary(BaseModel):
    """Aggregated metrics from the SUMO simulation."""
    total_roads: int
    total_vehicles_before: int
    total_vehicles_after: int
    avg_speed_before_kmph: float
    avg_speed_after_kmph: float
    avg_speed_change_pct: float
    worst_road_name: str
    worst_speed_reduction_pct: float
    overall_congestion_before: str | None
    overall_congestion_after: str | None
    duration_seconds: int
    steps_executed: int


# ── Full response ──────────────────────────────────────────────────────

class DigitalTwinSimResult(BaseModel):
    """Complete output of a Digital Twin SUMO simulation."""
    status: DigitalTwinSimStatus
    city_id: int
    simulation_id: int | None = None
    summary: DigitalTwinSimSummary
    roads: list[DigitalTwinSimRoad]
    message: str = ""
