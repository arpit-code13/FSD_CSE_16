"""PredictionService — deterministic traffic prediction engine.

Generates predictions for all roads in a city based on the most recent
``TrafficRecord``.  Uses a simple deterministic degradation model:

  • **current**   — mirrors the latest record
  • **+15 min**   — slight speed drop, queue grows
  • **+30 min**   — moderate degradation
  • **+60 min**   — worst-case within reasonable bounds

Future stages can swap in ML models; the public interface stays the same.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prediction import Prediction
from app.models.road import Road
from app.models.traffic_record import TrafficRecord

MODEL_NAME = "deterministic-v1"

# Congestion severity ordered least → most severe
_CONGESTION_ORDER = ["free_flow", "moderate", "slow", "congested", "gridlock"]

# Degradation factors per horizon (applied to speed; queue multiplied)
_HORIZON_FACTORS: dict[str, dict[str, float]] = {
    "current":   {"speed_factor": 1.00, "queue_factor": 1.00, "wait_factor": 1.00},
    "15min":     {"speed_factor": 0.90, "queue_factor": 1.20, "wait_factor": 1.30},
    "30min":     {"speed_factor": 0.78, "queue_factor": 1.50, "wait_factor": 1.60},
    "60min":     {"speed_factor": 0.65, "queue_factor": 2.00, "wait_factor": 2.20},
}

# Base queue-length buckets per congestion level
_QUEUE_BASE: dict[str, int] = {
    "free_flow": 0,
    "moderate": 3,
    "slow": 8,
    "congested": 15,
    "gridlock": 30,
}


# ── Public helpers ────────────────────────────────────────────────────

def _latest_record(db: Session, road_id: int) -> TrafficRecord | None:
    return db.scalar(
        select(TrafficRecord)
        .where(TrafficRecord.road_id == road_id)
        .order_by(TrafficRecord.timestamp.desc())
        .limit(1)
    )


def _estimate_density(vehicle_count: int, length_meters: float | None) -> float | None:
    if not length_meters or length_meters <= 0:
        return None
    km = length_meters / 1000.0
    return round(vehicle_count / km, 1)


def _congestion_rank(level: str) -> int:
    try:
        return _CONGESTION_ORDER.index(level)
    except ValueError:
        return -1


def _worsen_congestion(level: str, steps: int) -> str:
    """Shift congestion level toward gridlock by *steps*."""
    idx = _congestion_rank(level)
    if idx < 0:
        return level
    return _CONGESTION_ORDER[min(idx + steps, len(_CONGESTION_ORDER) - 1)]


def _queue_length(congestion_level: str, factor: float) -> int:
    base = _QUEUE_BASE.get(congestion_level, 0)
    return int(round(base * factor))


def _waiting_time(congestion_level: str, speed_kmph: float, factor: float) -> float:
    """Rough waiting-time estimate in seconds.

    Uses an inverse-speed heuristic: lower speed → longer wait.
    """
    if speed_kmph <= 0:
        return 999.0
    # base wait ≈ 3600 / speed (seconds per km at current speed)
    base_wait = 3600.0 / max(speed_kmph, 1.0)
    return round(base_wait * factor, 1)


# ── Core prediction builder ───────────────────────────────────────────

def _build_metrics(
    speed: float,
    congestion: str,
    horizon_key: str,
) -> dict:
    """Return a metrics dict for a single horizon."""
    f = _HORIZON_FACTORS[horizon_key]
    predicted_speed = round(speed * f["speed_factor"], 1)
    predicted_congestion = _worsen_congestion(congestion, 0 if horizon_key == "current" else {"15min": 0, "30min": 1, "60min": 2}.get(horizon_key, 0))
    queue = _queue_length(predicted_congestion, f["queue_factor"])
    wait = _waiting_time(predicted_congestion, predicted_speed, f["wait_factor"])
    return {
        "avg_speed_kmph": predicted_speed,
        "congestion_level": predicted_congestion,
        "queue_length_estimate": queue,
        "waiting_time_seconds": wait,
    }


def _road_prediction(db: Session, road: Road) -> dict | None:
    """Build a full prediction dict for one road, or *None* if no data."""
    rec = _latest_record(db, road.id)
    if rec is None:
        return None
    current_speed = rec.avg_speed_kmph
    current_congestion = rec.congestion_level

    return {
        "road_id": road.id,
        "road_name": road.name,
        "road_type": road.road_type,
        "city_id": road.city_id,
        "current": _build_metrics(current_speed, current_congestion, "current"),
        "horizon_15min": _build_metrics(current_speed, current_congestion, "15min"),
        "horizon_30min": _build_metrics(current_speed, current_congestion, "30min"),
        "horizon_60min": _build_metrics(current_speed, current_congestion, "60min"),
        "model_name": MODEL_NAME,
        "confidence_score": 0.85 if rec.congestion_level == "free_flow" else 0.70,
    }


# ── Public service functions ──────────────────────────────────────────

def generate_predictions(db: Session, city_id: int) -> list[dict]:
    """Run deterministic predictions for every road in a city.

    Returns a list of road-prediction dicts ready for Pydantic validation.
    """
    roads = db.scalars(select(Road).where(Road.city_id == city_id)).all()
    results: list[dict] = []
    now = datetime.now(timezone.utc)

    for road in roads:
        pred = _road_prediction(db, road)
        if pred is None:
            continue

        # Persist each horizon as a Prediction row
        for horizon_label, horizon_offset in [
            ("current", timedelta(minutes=0)),
            ("15min", timedelta(minutes=15)),
            ("30min", timedelta(minutes=30)),
            ("60min", timedelta(minutes=60)),
        ]:
            metrics = pred[{
                "current": "current",
                "15min": "horizon_15min",
                "30min": "horizon_30min",
                "60min": "horizon_60min",
            }[horizon_label]]
            db.add(Prediction(
                city_id=city_id,
                road_id=road.id,
                predicted_for=now + horizon_offset,
                predicted_vehicle_count=0,  # placeholder; vehicle count not decomposed per horizon
                predicted_avg_speed_kmph=metrics["avg_speed_kmph"],
                predicted_congestion_level=metrics["congestion_level"],
                model_name=MODEL_NAME,
                confidence_score=pred["confidence_score"],
            ))
        results.append(pred)

    db.commit()
    return results


def list_stored_predictions(
    db: Session,
    city_id: int | None = None,
    road_id: int | None = None,
) -> list[Prediction]:
    """Return stored Prediction rows, optionally filtered."""
    q = select(Prediction)
    if city_id is not None:
        q = q.where(Prediction.city_id == city_id)
    if road_id is not None:
        q = q.where(Prediction.road_id == road_id)
    q = q.order_by(Prediction.predicted_for.desc())
    return list(db.scalars(q).all())


def get_prediction_by_id(db: Session, prediction_id: int) -> Prediction | None:
    return db.get(Prediction, prediction_id)
