"""Pydantic schemas for Analytics API responses."""

from __future__ import annotations

from pydantic import BaseModel


# ── Overview ──────────────────────────────────────────────────────────

class AnalyticsOverview(BaseModel):
    """High-level city-wide analytics dashboard."""
    total_roads: int = 0
    total_intersections: int = 0
    total_signals: int = 0
    total_zones: int = 0
    total_corridors: int = 0
    total_vehicles_tracked: int = 0
    avg_speed_kmph: float | None = None
    avg_density_per_km: float | None = None
    active_incidents: int = 0
    total_predictions: int = 0
    total_simulations: int = 0
    congestion_distribution: dict[str, int] = {}
    overall_congestion_level: str | None = None


# ── Traffic analytics ─────────────────────────────────────────────────

class RoadTypeSpeedStats(BaseModel):
    """Speed statistics grouped by road type."""
    road_type: str
    road_count: int
    avg_speed_kmph: float | None = None
    min_speed_kmph: float | None = None
    max_speed_kmph: float | None = None


class VehicleComposition(BaseModel):
    """Vehicle type breakdown."""
    vehicle_type: str
    count: int
    percentage: float


class TrafficAnalytics(BaseModel):
    """Traffic speed and throughput analytics."""
    total_vehicles: int = 0
    avg_speed_kmph: float | None = None
    min_speed_kmph: float | None = None
    max_speed_kmph: float | None = None
    avg_density_per_km: float | None = None
    total_roads_with_data: int = 0
    speed_by_road_type: list[RoadTypeSpeedStats] = []
    vehicle_composition: list[VehicleComposition] = []


# ── Congestion analytics ──────────────────────────────────────────────

class CongestionHotspot(BaseModel):
    """A road with high congestion."""
    road_id: int
    road_name: str
    road_type: str
    congestion_level: str
    vehicle_count: int
    avg_speed_kmph: float | None = None
    queue_length_estimate: int | None = None


class CongestionAnalytics(BaseModel):
    """Congestion distribution and hotspots."""
    total_roads: int = 0
    congestion_distribution: dict[str, int] = {}
    overall_congestion_level: str | None = None
    avg_queue_length: float | None = None
    avg_waiting_time_seconds: float | None = None
    hotspots: list[CongestionHotspot] = []


# ── Signal analytics ──────────────────────────────────────────────────

class SignalTypeCount(BaseModel):
    """Count of signals by type."""
    signal_type: str
    count: int


class SignalAnalytics(BaseModel):
    """Signal performance and optimization analytics."""
    total_signals: int = 0
    active_signals: int = 0
    inactive_signals: int = 0
    avg_cycle_time_seconds: float | None = None
    signal_type_distribution: list[SignalTypeCount] = []
    pending_optimizations: int = 0
    approved_optimizations: int = 0
    rejected_optimizations: int = 0
    total_optimizations: int = 0


# ── Simulation analytics ──────────────────────────────────────────────

class ScenarioTypeCount(BaseModel):
    """Count of simulations by scenario type."""
    scenario_type: str
    count: int


class SimulationAnalytics(BaseModel):
    """Simulation usage and impact analytics."""
    total_simulations: int = 0
    completed_simulations: int = 0
    failed_simulations: int = 0
    completion_rate_pct: float | None = None
    scenario_distribution: list[ScenarioTypeCount] = []
    avg_speed_change_pct: float | None = None
    avg_vehicles_impacted: float | None = None
    most_used_scenario: str | None = None
