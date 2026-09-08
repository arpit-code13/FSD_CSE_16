"""Pydantic schemas for traffic-related API responses."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


# ── Shared signal info ────────────────────────────────────────────────

class SignalInfo(BaseModel):
    """Traffic-signal status attached to an intersection."""
    signal_type: str
    cycle_time_seconds: int | None = None
    is_active: bool
    phases: dict | None = None

    model_config = {"from_attributes": True}


# ── Road ──────────────────────────────────────────────────────────────

class RoadTraffic(BaseModel):
    """Live traffic metrics for a single road segment."""
    id: int
    name: str
    road_type: str
    city_id: int
    zone_id: int | None = None
    corridor_id: int | None = None
    length_meters: float | None = None
    lanes: int = 2
    speed_limit_kmph: float | None = None
    # live metrics (from most-recent TrafficRecord)
    vehicle_count: int | None = None
    avg_speed_kmph: float | None = None
    congestion_level: str | None = None
    vehicle_composition: dict | None = None
    # derived
    density_vehicles_per_km: float | None = None
    queue_length_estimate: int | None = None
    recorded_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Intersection ──────────────────────────────────────────────────────

class IntersectionTraffic(BaseModel):
    """Live traffic metrics for a single intersection."""
    id: int
    name: str
    latitude: float
    longitude: float
    intersection_type: str
    city_id: int
    signal: SignalInfo | None = None
    # incident count at this intersection
    active_incidents: int = 0
    # roads connected
    connected_road_ids: list[int] = []
    connected_road_names: list[str] = []

    model_config = {"from_attributes": True}


# ── Live dashboard ────────────────────────────────────────────────────

class TrafficOverview(BaseModel):
    """Aggregated live traffic summary for the entire city / all cities."""
    total_roads: int = 0
    total_intersections: int = 0
    total_signals: int = 0
    total_vehicles_tracked: int = 0
    avg_speed_kmph: float | None = None
    overall_congestion_level: str | None = None
    congestion_breakdown: dict[str, int] = {}
    top_congested_roads: list[RoadTraffic] = []

    model_config = {"from_attributes": True}
