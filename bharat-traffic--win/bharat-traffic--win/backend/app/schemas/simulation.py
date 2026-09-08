"""Schemas for What-If simulation API.

Supports both deterministic and SUMO backends.  The response format is
identical regardless of backend — the frontend never needs to know which
engine produced the results.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ── Supported scenario types ─────────────────────────────────────────

class ScenarioType(str, Enum):
    ACCIDENT = "accident"
    ROAD_CLOSURE = "road_closure"
    HEAVY_RAIN = "heavy_rain"
    FESTIVAL = "festival"
    TRAFFIC_SURGE = "traffic_surge"
    SIGNAL_FAILURE = "signal_failure"
    VIP_MOVEMENT = "vip_movement"


# ── Simulation backend ───────────────────────────────────────────────

class SimulationBackend(str, Enum):
    DETERMINISTIC = "deterministic"
    SUMO = "sumo"


# ── Request schemas ───────────────────────────────────────────────────

class SimulationCreate(BaseModel):
    """Create a new What-If simulation."""
    city_id: int
    name: str = Field(..., min_length=1, max_length=255)
    scenario_type: ScenarioType
    parameters: dict | None = None  # scenario-specific params (road_id, intersection_id, etc.)
    backend: SimulationBackend = SimulationBackend.DETERMINISTIC


# ── Response schemas ──────────────────────────────────────────────────

class SimulationOut(BaseModel):
    """A stored simulation record."""
    id: int
    city_id: int
    user_id: int | None
    name: str
    scenario_type: str
    status: str
    parameters: dict | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class RoadSimResult(BaseModel):
    """Simulation result for a single road — before/after comparison."""
    road_id: int
    road_name: str
    # Before (from DB traffic records)
    original_speed_kmph: float
    original_vehicles: int
    original_congestion: str
    original_waiting_time: float = 0.0
    original_queue_length: int = 0
    original_throughput: int = 0
    original_travel_time: float = 0.0
    # After (from SUMO or deterministic)
    simulated_speed_kmph: float
    simulated_vehicles: int
    simulated_congestion: str
    simulated_waiting_time: float = 0.0
    simulated_queue_length: int = 0
    simulated_throughput: int = 0
    simulated_travel_time: float = 0.0
    # Delta metrics
    queue_change_pct: float
    travel_time_change_pct: float


class SimulationSummary(BaseModel):
    """High-level summary of simulation results."""
    total_roads_affected: int
    avg_speed_change_pct: float
    total_vehicles_impacted: int
    worst_road_name: str
    worst_speed_reduction_pct: float
    scenario_description: str
    simulation_backend: str = "deterministic"
    # Aggregate before/after
    avg_waiting_time_before: float = 0.0
    avg_waiting_time_after: float = 0.0
    avg_queue_before: float = 0.0
    avg_queue_after: float = 0.0
    total_throughput_before: int = 0
    total_throughput_after: int = 0
    avg_travel_time_before: float = 0.0
    avg_travel_time_after: float = 0.0


class SimulationResultOut(BaseModel):
    """Full simulation output with results."""
    simulation: SimulationOut
    summary: SimulationSummary
    road_results: list[RoadSimResult]

    model_config = {"from_attributes": True}
