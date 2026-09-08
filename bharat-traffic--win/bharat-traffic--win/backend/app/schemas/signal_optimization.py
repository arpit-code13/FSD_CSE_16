"""Pydantic schemas for signal optimization API responses."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


# ── Signal listing ────────────────────────────────────────────────────

class SignalTiming(BaseModel):
    """Current or recommended signal timing."""
    phases: dict | None = None
    cycle_time_seconds: int | None = None
    signal_type: str | None = None
    is_active: bool | None = None


class SignalListItem(BaseModel):
    """A traffic signal with its current state."""
    id: int
    intersection_id: int
    intersection_name: str
    city_id: int
    signal_type: str
    cycle_time_seconds: int | None = None
    phases: dict | None = None
    is_active: bool
    has_pending_optimization: bool = False

    model_config = {"from_attributes": True}


# ── Optimization result ───────────────────────────────────────────────

class PredictedImpact(BaseModel):
    """Predicted improvement from applying the optimization."""
    speed_improvement_pct: float
    queue_reduction_pct: float
    wait_time_reduction_pct: float
    congestion_level_change: str | None = None
    confidence_score: float | None = None


class OptimizationRecord(BaseModel):
    """A stored optimization record."""
    id: int
    signal_id: int
    intersection_id: int
    intersection_name: str | None = None
    city_id: int
    current_timing: SignalTiming | None = None
    recommended_timing: SignalTiming | None = None
    predicted_impact: PredictedImpact | None = None
    approval_status: str
    approved_by: int | None = None
    approved_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Simulate result ───────────────────────────────────────────────────

class SimulationResult(BaseModel):
    """Result of simulating an optimization."""
    optimization_id: int
    status: str
    simulated_impact: PredictedImpact
    simulation_notes: str


# ── Approve result ────────────────────────────────────────────────────

class ApprovalResult(BaseModel):
    """Result of approving an optimization."""
    optimization_id: int
    approval_status: str
    approved_by: int
    approved_at: datetime
    message: str
