"""Predictions API — run, list, and retrieve traffic predictions.

All endpoints require a valid JWT (authenticated USER or ADMIN).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.city import City
from app.models.prediction import Prediction
from app.models.road import Road
from app.models.user import User
from app.schemas.prediction import (
    PredictionMetrics,
    PredictionOut,
    PredictionRunResult,
    RoadPrediction,
)
from app.services import prediction_service

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


# ── Helpers ───────────────────────────────────────────────────────────

def _prediction_to_out(pred: Prediction) -> PredictionOut:
    """Convert a stored Prediction row to the output schema."""
    road = None
    if pred.road:
        road = pred.road
    return PredictionOut(
        id=pred.id,
        city_id=pred.city_id,
        road_id=pred.road_id,
        road_name=road.name if road else None,
        predicted_for=pred.predicted_for,
        predicted_vehicle_count=pred.predicted_vehicle_count,
        predicted_avg_speed_kmph=pred.predicted_avg_speed_kmph,
        predicted_congestion_level=pred.predicted_congestion_level,
        model_name=pred.model_name,
        confidence_score=pred.confidence_score,
    )


def _dict_to_road_prediction(d: dict) -> RoadPrediction:
    """Convert a service-layer dict to the Pydantic response model."""
    return RoadPrediction(
        road_id=d["road_id"],
        road_name=d["road_name"],
        road_type=d["road_type"],
        city_id=d["city_id"],
        current=PredictionMetrics(**d["current"]),
        horizon_15min=PredictionMetrics(**d["horizon_15min"]),
        horizon_30min=PredictionMetrics(**d["horizon_30min"]),
        horizon_60min=PredictionMetrics(**d["horizon_60min"]),
        model_name=d["model_name"],
        confidence_score=d.get("confidence_score"),
    )


# ── GET /api/predictions ─────────────────────────────────────────────

@router.get("", response_model=list[PredictionOut])
def list_predictions(
    city_id: int | None = Query(None),
    road_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List stored prediction records, optionally filtered."""
    preds = prediction_service.list_stored_predictions(db, city_id=city_id, road_id=road_id)
    return [_prediction_to_out(p) for p in preds]


# ── POST /api/predictions/run ────────────────────────────────────────

@router.post("/run", response_model=list[RoadPrediction])
def run_predictions(
    city_id: int = Query(..., description="City to predict for"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Run deterministic predictions for all roads in a city.

    Generates predictions for current, +15 min, +30 min, and +60 min
    horizons and persists them to the database.
    """
    city = db.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")

    results = prediction_service.generate_predictions(db, city_id)

    return [_dict_to_road_prediction(r) for r in results]


# ── GET /api/predictions/{prediction_id} ─────────────────────────────

@router.get("/{prediction_id}", response_model=PredictionOut)
def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Retrieve a single stored prediction by ID."""
    pred = prediction_service.get_prediction_by_id(db, prediction_id)
    if pred is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    return _prediction_to_out(pred)
