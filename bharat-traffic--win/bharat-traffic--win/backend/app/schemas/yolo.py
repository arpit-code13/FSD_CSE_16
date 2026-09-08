"""YOLO Vision schemas — request/response models for camera, detection, and analysis."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────


class VehicleType(str, Enum):
    CAR = "car"
    BUS = "bus"
    TRUCK = "truck"
    BIKE = "bike"
    AUTO = "auto"
    BICYCLE = "bicycle"
    PERSON = "person"


class CameraStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class TrendDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"


class DensityLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    VERY_HIGH = "Very High"


class ConfidenceLevel(str, Enum):
    VERY_LOW = "Very Low"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    VERY_HIGH = "Very High"


# ── Camera ───────────────────────────────────────────────────────────


class CameraFeed(BaseModel):
    id: str
    name: str
    location: str
    status: CameraStatus
    resolution: str
    fps: float = 0.0
    last_frame_time: Optional[str] = None
    source_url: Optional[str] = None  # RTSP / file path — never exposed to frontend secrets


class CameraCreate(BaseModel):
    """Request body for adding a new camera."""
    name: str = Field(..., min_length=1, max_length=200)
    location: str = Field(..., min_length=1, max_length=300)
    source_url: str = Field(..., description="RTSP stream URL or video file path")
    resolution: str = Field(default="1280x720")


class CameraHealth(BaseModel):
    camera_id: str
    status: CameraStatus
    fps: float
    uptime_seconds: float
    last_frame_age_ms: Optional[float] = None
    error_message: Optional[str] = None


# ── Detection ────────────────────────────────────────────────────────


class BoundingBox(BaseModel):
    x: float = Field(..., description="Left edge (pixels)")
    y: float = Field(..., description="Top edge (pixels)")
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)


class Detection(BaseModel):
    id: str
    vehicle_type: VehicleType
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBox
    track_id: Optional[int] = None  # persistent track across frames


class VehicleCount(BaseModel):
    vehicle_type: VehicleType
    label: str  # human-readable: "Cars", "Bikes", etc.
    count: int = Field(..., ge=0)
    percentage: float = Field(..., ge=0, le=100)
    trend: TrendDirection


class YoloSnapshot(BaseModel):
    """Complete detection frame — the primary payload pushed to the dashboard."""
    timestamp: str
    frame_index: int
    camera_id: str
    camera_name: str
    camera_status: CameraStatus
    fps: float
    confidence: float  # average detection confidence
    total_vehicles: int
    vehicle_counts: list[VehicleCount]
    traffic_density: float = Field(..., ge=0, le=100)
    traffic_density_label: DensityLevel
    queue_length_meters: float = Field(..., ge=0)
    queue_length_trend: TrendDirection
    detections: list[Detection]
    resolution: str = "1280x720"


# ── Density Trend ────────────────────────────────────────────────────


class DensityTrendPoint(BaseModel):
    time: str
    density: float
    queue: float


class DensityTrend(BaseModel):
    camera_id: str
    points: list[DensityTrendPoint]


# ── Alerts ───────────────────────────────────────────────────────────


class YoloAlert(BaseModel):
    id: str
    severity: AlertSeverity
    title: str
    message: str
    timestamp: str
    camera_id: Optional[str] = None
    auto_generated: bool = True


# ── AI Insight / Prediction / Recommendation ─────────────────────────


class AIInsight(BaseModel):
    summary: str
    confidence: float = Field(..., ge=0, le=100)
    generated_at: str


class Prediction(BaseModel):
    predicted_density: float
    predicted_density_label: DensityLevel
    predicted_queue_meters: float
    predicted_queue_delta_meters: float
    predicted_avg_speed_kmh: float
    speed_delta_kmh: float


class Recommendation(BaseModel):
    text: str
    action_label: str = "Apply Recommendation"
    action_id: Optional[str] = None


# ── Model Info ───────────────────────────────────────────────────────


class ModelInfo(BaseModel):
    model_name: str = "YOLOv8n"
    dataset: str = "COCO + Custom Traffic"
    last_updated: str
    inference_device: str
    input_size: int = 640
    classes: list[str]
    version: str = "1.0.0"


# ── Settings ─────────────────────────────────────────────────────────


class YoloSettings(BaseModel):
    confidence_threshold: float = Field(default=0.5, ge=0.1, le=0.99)
    nms_iou_threshold: float = Field(default=0.45, ge=0.1, le=0.99)
    max_detections: int = Field(default=300, ge=10, le=1000)
    enabled_classes: list[VehicleType] = Field(
        default_factory=lambda: list(VehicleType)
    )
    input_source: str = "demo"  # "demo" | "camera" | "video"
    processing_enabled: bool = True


class YoloSettingsUpdate(BaseModel):
    """Partial update for YOLO settings."""
    confidence_threshold: Optional[float] = Field(default=None, ge=0.1, le=0.99)
    nms_iou_threshold: Optional[float] = Field(default=None, ge=0.1, le=0.99)
    max_detections: Optional[int] = Field(default=None, ge=10, le=1000)
    enabled_classes: Optional[list[VehicleType]] = None
    input_source: Optional[str] = None
    processing_enabled: Optional[bool] = None


# ── WebSocket messages ───────────────────────────────────────────────


class WsYoloMessage(BaseModel):
    """Outbound WebSocket message envelope."""
    type: str  # "snapshot" | "alert" | "pong" | "error"
    data: Optional[dict] = None
    timestamp: Optional[int] = None  # epoch ms
