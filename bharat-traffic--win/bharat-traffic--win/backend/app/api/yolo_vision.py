"""YOLO Vision REST API — cameras, snapshots, density trends, alerts, predictions, settings.

All endpoints require a valid JWT (authenticated USER or ADMIN).

Data flow:
  Camera/Video → OpenCV → YOLO → Vehicle Detection → Count/Density → REST → Frontend

In demo mode (default), all detection data is synthetic and realistic.
When a real model is loaded, the same endpoints serve actual inference results.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.yolo import (
    AIInsight,
    CameraCreate,
    CameraFeed,
    CameraHealth,
    CameraStatus,
    DensityTrend,
    ModelInfo,
    Prediction,
    Recommendation,
    YoloAlert,
    YoloSettings,
    YoloSettingsUpdate,
    YoloSnapshot,
)
from app.services import yolo_service
from app.services.camera_manager import camera_manager

router = APIRouter(prefix="/api/yolo", tags=["yolo-vision"])


# ── Camera Endpoints ─────────────────────────────────────────────────


@router.get("/cameras", response_model=list[CameraFeed])
async def list_cameras(_user: User = Depends(get_current_user)):
    """List all registered camera feeds."""
    return camera_manager.list_cameras()


@router.get("/cameras/{camera_id}", response_model=CameraFeed)
async def get_camera(camera_id: str, _user: User = Depends(get_current_user)):
    """Get a specific camera feed by ID."""
    cam = camera_manager.get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    return cam


@router.post("/cameras", response_model=CameraFeed, status_code=201)
async def add_camera(body: CameraCreate, _user: User = Depends(get_current_user)):
    """Register a new camera feed (RTSP stream or video file)."""
    return camera_manager.add_camera(body)


@router.delete("/cameras/{camera_id}", status_code=204)
async def remove_camera(camera_id: str, _user: User = Depends(get_current_user)):
    """Remove a camera from the registry."""
    if not camera_manager.remove_camera(camera_id):
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")


@router.get("/cameras/{camera_id}/health", response_model=CameraHealth)
async def camera_health(camera_id: str, _user: User = Depends(get_current_user)):
    """Get health status for a specific camera."""
    health = camera_manager.get_health(camera_id)
    if not health:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    return health


# ── Detection Snapshot ───────────────────────────────────────────────


@router.get("/snapshot", response_model=YoloSnapshot)
async def get_snapshot(
    camera_id: str = Query(default="cam-01", description="Camera ID to process"),
    _user: User = Depends(get_current_user),
):
    """Run YOLO detection on a camera frame and return the full snapshot.

    In demo mode, generates synthetic detections.
    When a real model is loaded, runs actual inference.
    """
    try:
        snapshot = yolo_service.generate_snapshot(camera_id)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # generate and store alerts from this snapshot
    alerts = yolo_service._generate_alerts(snapshot)
    yolo_service.push_alerts(alerts)

    return snapshot


# ── Density Trend ────────────────────────────────────────────────────


@router.get("/density-trend", response_model=DensityTrend)
async def get_density_trend(
    camera_id: str = Query(default="cam-01"),
    points: int = Query(default=12, ge=2, le=48, description="Number of 15-min data points"),
    _user: User = Depends(get_current_user),
):
    """Get traffic density trend data for a camera (last N × 15 min)."""
    return yolo_service.get_density_trend(camera_id, points=points)


# ── Alerts ───────────────────────────────────────────────────────────


@router.get("/alerts", response_model=list[YoloAlert])
async def get_alerts(
    limit: int = Query(default=10, ge=1, le=50),
    _user: User = Depends(get_current_user),
):
    """Get YOLO Vision alerts and events (most recent first)."""
    alerts = yolo_service.get_alerts(limit=limit)
    alerts.reverse()
    return alerts


# ── AI Insight / Prediction / Recommendation ─────────────────────────


class InsightBundle(BaseModel):
    """Combined AI insight, prediction, and recommendation for the current snapshot."""
    insight: AIInsight
    prediction: Prediction
    recommendation: Recommendation


@router.get("/insight", response_model=InsightBundle)
async def get_insight(
    camera_id: str = Query(default="cam-01"),
    _user: User = Depends(get_current_user),
):
    """Get AI-generated insight, prediction, and recommendation for the current frame."""
    snapshot = yolo_service.generate_snapshot(camera_id)
    insight = yolo_service._generate_insight(snapshot)
    prediction = yolo_service._generate_prediction(snapshot)
    recommendation = yolo_service._generate_recommendation(snapshot, prediction)
    return InsightBundle(insight=insight, prediction=prediction, recommendation=recommendation)


# ── Model Info ───────────────────────────────────────────────────────


@router.get("/model-info", response_model=ModelInfo)
async def get_model_info(_user: User = Depends(get_current_user)):
    """Get YOLO model metadata (name, device, classes, version)."""
    return yolo_service.get_model_info()


# ── Settings ─────────────────────────────────────────────────────────


@router.get("/settings", response_model=YoloSettings)
async def get_settings(_user: User = Depends(get_current_user)):
    """Get current YOLO detection settings."""
    return yolo_service.get_settings()


@router.patch("/settings", response_model=YoloSettings)
async def update_settings(
    body: YoloSettingsUpdate,
    _user: User = Depends(get_current_user),
):
    """Update YOLO detection settings (confidence threshold, NMS IoU, etc.)."""
    return yolo_service.update_settings(body)
