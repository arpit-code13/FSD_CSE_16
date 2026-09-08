"""Pydantic schemas for prediction-related API responses."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


# ── Single prediction metrics ─────────────────────────────────────────

class PredictionMetrics(BaseModel):
    """Traffic metrics for a single prediction horizon."""
    avg_speed_kmph: float
    congestion_level: str
    queue_length_estimate: int
    waiting_time_seconds: float


# ── Road-level prediction (all horizons) ──────────────────────────────

class RoadPrediction(BaseModel):
    """Full prediction set for one road: current + future horizons."""
    road_id: int
    road_name: str
    road_type: str
    city_id: int
    current: PredictionMetrics
    horizon_15min: PredictionMetrics
    horizon_30min: PredictionMetrics
    horizon_60min: PredictionMetrics
    model_name: str = "deterministic-v1"
    confidence_score: float | None = None


# ── Prediction run result ─────────────────────────────────────────────

class PredictionRunResult(BaseModel):
    """Summary of a prediction run."""
    city_id: int
    city_name: str
    roads_processed: int
    predictions_generated: int
    run_timestamp: datetime
    model_name: str


# ── Single stored prediction (for GET /{id}) ─────────────────────────

class PredictionOut(BaseModel):
    """A single stored Prediction record."""
    id: int
    city_id: int
    road_id: int
    road_name: str | None = None
    predicted_for: datetime
    predicted_vehicle_count: int
    predicted_avg_speed_kmph: float
    predicted_congestion_level: str
    model_name: str
    confidence_score: float | None = None
    # derived metrics stored alongside
    queue_length_estimate: int | None = None
    waiting_time_seconds: float | None = None

    model_config = {"from_attributes": True}
