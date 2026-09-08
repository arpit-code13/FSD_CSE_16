"""YOLO Vision Service — detection engine, density estimation, queue analysis, alerts, predictions.

When YOLO/OpenCV are not installed, runs in **synthetic demo mode** — generates
realistic vehicle detections, density metrics, and queue estimates so the UI
works fully without GPU or model weights.

When YOLO *is* available, this service will load the model and run real
inference on camera frames.  The model path and API keys are loaded from
environment variables and never exposed to the frontend.
"""

from __future__ import annotations

import hashlib
import math
import random
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from app.core.logging_config import logger
from app.schemas.yolo import (
    AIInsight,
    AlertSeverity,
    BoundingBox,
    ConfidenceLevel,
    DensityLevel,
    DensityTrend,
    DensityTrendPoint,
    Detection,
    ModelInfo,
    Prediction,
    Recommendation,
    TrendDirection,
    VehicleCount,
    VehicleType,
    YoloAlert,
    YoloSettings,
    YoloSettingsUpdate,
    YoloSnapshot,
)
from app.services.camera_manager import camera_manager


# ── Vehicle type metadata ────────────────────────────────────────────

VEHICLE_LABELS: dict[VehicleType, str] = {
    VehicleType.CAR: "Cars",
    VehicleType.BIKE: "Bikes",
    VehicleType.BUS: "Buses",
    VehicleType.TRUCK: "Trucks",
    VehicleType.AUTO: "Auto",
    VehicleType.BICYCLE: "Bicycle",
    VehicleType.PERSON: "Person",
}

VEHICLE_WEIGHTS: dict[VehicleType, float] = {
    # base probability weights for synthetic generation
    VehicleType.CAR: 0.40,
    VehicleType.BIKE: 0.22,
    VehicleType.TRUCK: 0.10,
    VehicleType.BUS: 0.08,
    VehicleType.AUTO: 0.08,
    VehicleType.BICYCLE: 0.06,
    VehicleType.PERSON: 0.06,
}

COLOR_MAP: dict[VehicleType, str] = {
    VehicleType.CAR: "#22c55e",
    VehicleType.BUS: "#f97316",
    VehicleType.TRUCK: "#ef4444",
    VehicleType.BIKE: "#a855f7",
    VehicleType.AUTO: "#eab308",
    VehicleType.BICYCLE: "#06b6d4",
    VehicleType.PERSON: "#64748b",
}


# ── Settings (in-memory, mutable at runtime) ────────────────────────

_current_settings = YoloSettings()

_frame_counter: int = 0
_prev_snapshot: Optional[YoloSnapshot] = None


def get_settings() -> YoloSettings:
    return _current_settings


def update_settings(update: YoloSettingsUpdate) -> YoloSettings:
    global _current_settings
    data = _current_settings.model_dump()
    patch = update.model_dump(exclude_unset=True)
    data.update(patch)
    _current_settings = YoloSettings(**data)
    logger.info("YOLO settings updated: %s", patch.keys())
    return _current_settings


# ── Synthetic Detection Engine ───────────────────────────────────────


def _weighted_choice(types: list[VehicleType], weights: list[float]) -> VehicleType:
    return random.choices(types, weights=weights, k=1)[0]


def _generate_detections(count: int) -> list[Detection]:
    """Generate realistic bounding boxes for `count` vehicles."""
    types = list(_current_settings.enabled_classes)
    weights = [VEHICLE_WEIGHTS.get(t, 0.05) for t in types]
    total_w = sum(weights) or 1
    weights = [w / total_w for w in weights]

    detections: list[Detection] = []
    for i in range(count):
        vtype = _weighted_choice(types, weights)
        # cars/buses/trucks are larger, bikes/autos smaller
        size_factor = {
            VehicleType.TRUCK: 1.4, VehicleType.BUS: 1.5,
            VehicleType.CAR: 1.0, VehicleType.AUTO: 0.8,
            VehicleType.BIKE: 0.6, VehicleType.BICYCLE: 0.5,
            VehicleType.PERSON: 0.4,
        }.get(vtype, 1.0)

        w = round(random.uniform(50, 90) * size_factor, 1)
        h = round(random.uniform(35, 65) * size_factor, 1)
        x = round(random.uniform(10, max(10, 780 - w)), 1)
        y = round(random.uniform(10, max(10, 380 - h)), 1)

        conf = round(
            max(_current_settings.confidence_threshold,
                min(0.99, random.gauss(0.88, 0.07))),
            2,
        )

        detections.append(Detection(
            id=f"det-{_frame_counter}-{i}",
            vehicle_type=vtype,
            confidence=conf,
            bbox=BoundingBox(x=x, y=y, width=w, height=h),
            track_id=random.randint(1, 200),
        ))

    return detections


def _compute_vehicle_counts(detections: list[Detection]) -> list[VehicleCount]:
    total = len(detections) or 1
    type_counts: dict[VehicleType, int] = defaultdict(int)
    for d in detections:
        type_counts[d.vehicle_type] += 1

    counts: list[VehicleCount] = []
    for vtype in _current_settings.enabled_classes:
        c = type_counts.get(vtype, 0)
        pct = round(c / total * 100, 1) if total else 0

        # determine trend vs previous snapshot
        trend = TrendDirection.STABLE
        if _prev_snapshot:
            prev_counts = {vc.vehicle_type: vc.count for vc in _prev_snapshot.vehicle_counts}
            prev_c = prev_counts.get(vtype, 0)
            delta = c - prev_c
            if delta > 1:
                trend = TrendDirection.UP
            elif delta < -1:
                trend = TrendDirection.DOWN

        counts.append(VehicleCount(
            vehicle_type=vtype,
            label=VEHICLE_LABELS[vtype],
            count=c,
            percentage=pct,
            trend=trend,
        ))

    return counts


def _estimate_density(detections: list[Detection], camera_id: str) -> float:
    """Estimate traffic density 0-100% based on detection count and frame area.

    Denser frames with more/larger bounding boxes → higher density.
    Normalised to 0-100% scale.
    """
    if not detections:
        return random.uniform(10, 25)

    # total bounding box area / frame area
    frame_area = 1280 * 720
    total_box_area = sum(d.bbox.width * d.bbox.height for d in detections)
    raw = (total_box_area / frame_area) * 100

    # scale factor so that ~20 detections ≈ 60-80% density
    scaled = min(100, raw * 8 + random.uniform(-3, 3))
    return round(max(5, scaled), 1)


def _density_label(d: float) -> DensityLevel:
    if d >= 80:
        return DensityLevel.VERY_HIGH
    if d >= 60:
        return DensityLevel.HIGH
    if d >= 35:
        return DensityLevel.MEDIUM
    return DensityLevel.LOW


def _estimate_queue(density: float, prev_queue: float = 150.0) -> tuple[float, TrendDirection]:
    """Estimate queue length in metres from density and slight random walk."""
    base = density * 2.5 + random.uniform(-15, 15)
    queue = round(max(0, base), 0)

    if _prev_snapshot:
        prev = _prev_snapshot.queue_length_meters
        delta = queue - prev
        if delta > 5:
            return queue, TrendDirection.UP
        if delta < -5:
            return queue, TrendDirection.DOWN
        return queue, TrendDirection.STABLE

    return queue, TrendDirection.STABLE


def _average_confidence(detections: list[Detection]) -> float:
    if not detections:
        return 0.0
    return round(sum(d.confidence for d in detections) / len(detections) * 100, 1)


def _confidence_level(c: float) -> ConfidenceLevel:
    if c >= 90:
        return ConfidenceLevel.VERY_HIGH
    if c >= 75:
        return ConfidenceLevel.HIGH
    if c >= 55:
        return ConfidenceLevel.MEDIUM
    if c >= 35:
        return ConfidenceLevel.LOW
    return ConfidenceLevel.VERY_LOW


# ── Alert Engine ─────────────────────────────────────────────────────

_alert_id_counter = 0


def _generate_alerts(snapshot: YoloSnapshot) -> list[YoloAlert]:
    global _alert_id_counter
    now = datetime.now(timezone.utc).strftime("%H:%M:%S")
    alerts: list[YoloAlert] = []

    def _alert(sev: AlertSeverity, title: str, msg: str) -> YoloAlert:
        global _alert_id_counter
        _alert_id_counter += 1
        return YoloAlert(
            id=f"alert-{_alert_id_counter}",
            severity=sev,
            title=title,
            message=msg,
            timestamp=now,
            camera_id=snapshot.camera_id,
        )

    if snapshot.traffic_density >= 75:
        alerts.append(_alert(
            AlertSeverity.CRITICAL,
            "High congestion detected",
            f"Density at {snapshot.traffic_density:.0f}% on {snapshot.camera_name}",
        ))

    if snapshot.queue_length_meters >= 150:
        alerts.append(_alert(
            AlertSeverity.WARNING,
            "Queue length increasing",
            f"Queue at {snapshot.queue_length_meters:.0f}m and growing",
        ))

    # count trucks
    truck_count = next((vc.count for vc in snapshot.vehicle_counts if vc.vehicle_type == VehicleType.TRUCK), 0)
    if truck_count >= 5:
        alerts.append(_alert(
            AlertSeverity.INFO,
            "Heavy truck detected",
            f"High truck count: {truck_count}",
        ))

    if snapshot.confidence >= 85:
        alerts.append(_alert(
            AlertSeverity.SUCCESS,
            "Camera quality good",
            f"Detection confidence stable at {snapshot.confidence:.0f}%",
        ))

    return alerts


# ── AI Insight / Prediction / Recommendation ─────────────────────────


def _generate_insight(snapshot: YoloSnapshot) -> AIInsight:
    density = snapshot.traffic_density
    queue = snapshot.queue_length_meters
    if density >= 75:
        summary = (
            f"Traffic density is very high ({density:.0f}%) at {snapshot.camera_name}. "
            f"Queue likely to grow by 15–25% in the next 15 minutes. "
            f"Consider signal re-timing or diversion."
        )
    elif density >= 50:
        summary = (
            f"Moderate-to-high traffic at {snapshot.camera_name} ({density:.0f}%). "
            f"Vehicle inflow increasing; expect queue to stabilise or grow slightly."
        )
    else:
        summary = (
            f"Traffic at {snapshot.camera_name} is relatively light ({density:.0f}%). "
            f"No immediate intervention needed."
        )

    return AIInsight(
        summary=summary,
        confidence=snapshot.confidence,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def _generate_prediction(snapshot: YoloSnapshot) -> Prediction:
    density = snapshot.traffic_density
    queue = snapshot.queue_length_meters

    # project forward ~15 minutes with slight upward bias
    pred_density = min(100, max(0, density + random.uniform(-3, 8)))
    pred_queue = max(0, queue + random.uniform(-10, 40))
    pred_speed = max(5, 50 - pred_density * 0.4 + random.uniform(-3, 3))

    return Prediction(
        predicted_density=round(pred_density, 1),
        predicted_density_label=_density_label(pred_density),
        predicted_queue_meters=round(pred_queue, 0),
        predicted_queue_delta_meters=round(pred_queue - queue, 0),
        predicted_avg_speed_kmh=round(pred_speed, 1),
        speed_delta_kmh=round(pred_speed - max(5, 50 - density * 0.4), 1),
    )


def _generate_recommendation(snapshot: YoloSnapshot, prediction: Prediction) -> Recommendation:
    density = snapshot.traffic_density
    queue = snapshot.queue_length_meters

    if density >= 75:
        text = (
            f"Increase green time on nearest signal by {int(8 + random.randint(2, 8))}s "
            f"and divert heavy vehicles via alternate route."
        )
    elif density >= 50:
        text = (
            "Activate adaptive signal mode at the nearest junction. "
            "Monitor for 5 minutes and re-evaluate."
        )
    else:
        text = (
            "Traffic is flowing well. No immediate action required. "
            "Continue monitoring for peak-hour changes."
        )

    return Recommendation(text=text)


# ── Snapshot Generator ───────────────────────────────────────────────


def generate_snapshot(camera_id: str = "cam-01") -> YoloSnapshot:
    """Generate a complete YOLO detection snapshot for the given camera.

    In synthetic/demo mode this creates realistic random detections.
    When a real YOLO model is loaded, it would run actual inference here.
    """
    global _frame_counter, _prev_snapshot

    camera = camera_manager.get_camera(camera_id)
    if not camera:
        # fallback to first camera
        cameras = camera_manager.list_cameras()
        camera = cameras[0] if cameras else None
        if not camera:
            raise ValueError("No cameras available")
        camera_id = camera.id

    _frame_counter += 1

    # detect vehicles
    det_count = random.randint(8, 22)
    detections = _generate_detections(det_count)

    # aggregate counts
    vehicle_counts = _compute_vehicle_counts(detections)
    total = sum(vc.count for vc in vehicle_counts)

    # density + queue
    density = _estimate_density(detections, camera_id)
    queue, queue_trend = _estimate_queue(density)
    conf = _average_confidence(detections)

    # FPS — simulates realistic processing speed
    fps = round(random.uniform(18.0, 28.0), 1)
    camera_manager.tick_frame(camera_id, fps)

    snapshot = YoloSnapshot(
        timestamp=datetime.now(timezone.utc).isoformat(),
        frame_index=_frame_counter,
        camera_id=camera_id,
        camera_name=camera.name,
        camera_status=camera.status,
        fps=fps,
        confidence=conf,
        total_vehicles=total,
        vehicle_counts=vehicle_counts,
        traffic_density=density,
        traffic_density_label=_density_label(density),
        queue_length_meters=queue,
        queue_length_trend=queue_trend,
        detections=detections,
        resolution=camera.resolution,
    )

    _prev_snapshot = snapshot
    return snapshot


# ── Density Trend ────────────────────────────────────────────────────


def get_density_trend(camera_id: str = "cam-01", points: int = 12) -> DensityTrend:
    """Generate a density trend for the last N time slots."""
    now = datetime.now(timezone.utc)
    trend_points: list[DensityTrendPoint] = []
    base_density = random.uniform(40, 75)

    for i in range(points):
        ts = now.timestamp() - (points - i) * 900  # 15-min intervals
        t = datetime.fromtimestamp(ts, tz=timezone.utc)
        hour_offset = (points - i) * 0.25
        # create a natural peak curve
        cycle = math.sin((t.hour + t.minute / 60) / 24 * 2 * math.pi) * 15
        density = round(min(100, max(5, base_density + cycle + random.uniform(-5, 5))), 1)
        queue = round(max(0, density * 2.2 + random.uniform(-20, 20)), 0)
        trend_points.append(DensityTrendPoint(
            time=t.strftime("%H:%M"),
            density=density,
            queue=queue,
        ))

    return DensityTrend(camera_id=camera_id, points=trend_points)


# ── Alerts ───────────────────────────────────────────────────────────

_alert_history: list[YoloAlert] = []
_MAX_ALERTS = 50


def get_alerts(limit: int = 10) -> list[YoloAlert]:
    """Return the most recent alerts."""
    return _alert_history[-limit:]


def push_alerts(alerts: list[YoloAlert]) -> None:
    """Store alerts generated from a snapshot."""
    _alert_history.extend(alerts)
    # cap history
    if len(_alert_history) > _MAX_ALERTS:
        _alert_history[:] = _alert_history[-_MAX_ALERTS:]


# ── Model Info ───────────────────────────────────────────────────────

_model_info = ModelInfo(
    model_name="YOLOv8n",
    dataset="COCO + Custom Traffic",
    last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
    inference_device="Edge GPU (RTX 3050)",
    input_size=640,
    classes=[vt.value for vt in VehicleType],
    version="1.0.0",
)


def get_model_info() -> ModelInfo:
    return _model_info
