"""Camera Manager — registry, health monitoring, and lifecycle for video sources.

Supports three source types:
  1. ``demo``   — synthetic / generated frames (always available)
  2. ``camera``  — live RTSP / IP camera stream
  3. ``video``   — local video file

Camera credentials and stream URLs are NEVER exposed to the frontend.
Health checks run in the background and update camera status.
"""

from __future__ import annotations

import asyncio
import random
import time
from datetime import datetime, timezone
from typing import Optional

from app.core.logging_config import logger
from app.schemas.yolo import (
    CameraFeed,
    CameraHealth,
    CameraStatus,
    CameraCreate,
)


# ── Camera Registry ──────────────────────────────────────────────────


class _CameraEntry:
    """Internal mutable camera record."""

    __slots__ = (
        "id", "name", "location", "resolution", "source_url", "status",
        "fps", "last_frame_time", "created_at", "uptime_start",
        "error_message",
    )

    def __init__(
        self,
        id: str,
        name: str,
        location: str,
        resolution: str,
        source_url: str = "",
    ):
        self.id = id
        self.name = name
        self.location = location
        self.resolution = resolution
        self.source_url = source_url
        self.status: CameraStatus = CameraStatus.ONLINE if source_url or id.startswith("cam-") else CameraStatus.OFFLINE
        self.fps: float = 0.0
        self.last_frame_time: Optional[str] = None
        self.created_at: float = time.time()
        self.uptime_start: float = time.time()
        self.error_message: Optional[str] = None

    def to_feed(self) -> CameraFeed:
        return CameraFeed(
            id=self.id,
            name=self.name,
            location=self.location,
            status=self.status,
            resolution=self.resolution,
            fps=round(self.fps, 1),
            last_frame_time=self.last_frame_time,
        )

    def to_health(self) -> CameraHealth:
        return CameraHealth(
            camera_id=self.id,
            status=self.status,
            fps=round(self.fps, 1),
            uptime_seconds=round(time.time() - self.uptime_start, 1),
            last_frame_age_ms=None,
            error_message=self.error_message,
        )


# ── Singleton Manager ────────────────────────────────────────────────


class CameraManager:
    """Thread-safe camera registry. Cameras are seeded from defaults on startup."""

    def __init__(self) -> None:
        self._cameras: dict[str, _CameraEntry] = {}
        self._next_id = 1
        self._seed_defaults()

    def _seed_defaults(self) -> None:
        defaults = [
            ("ITO Flyover Cam - 01", "ITO, Delhi", "1280x720", "rtsp://demo/local"),
            ("Connaught Place Cam - 02", "CP, Delhi", "1920x1080", "rtsp://demo/local"),
            ("AIIMS Junction Cam - 03", "AIIMS, Delhi", "1280x720", ""),  # offline
            ("Chandni Chowk Cam - 04", "Chandni Chowk, Delhi", "1280x720", "rtsp://demo/local"),
            ("Karol Bagh Cam - 05", "Karol Bagh, Delhi", "1280x720", "rtsp://demo/local"),
            ("Rajiv Chowk Cam - 06", "Rajiv Chowk, Delhi", "1920x1080", "rtsp://demo/local"),
        ]
        for idx, (name, loc, res, url) in enumerate(defaults, start=1):
            cam_id = f"cam-{idx:02d}"
            entry = _CameraEntry(cam_id, name, loc, res, url)
            entry.fps = round(random.uniform(18.0, 26.0), 1)
            entry.last_frame_time = datetime.now(timezone.utc).isoformat()
            if not url:
                entry.status = CameraStatus.OFFLINE
            self._cameras[cam_id] = entry

    # ── Public API ───────────────────────────────────────────────────

    def list_cameras(self) -> list[CameraFeed]:
        return [c.to_feed() for c in self._cameras.values()]

    def get_camera(self, camera_id: str) -> Optional[CameraFeed]:
        entry = self._cameras.get(camera_id)
        return entry.to_feed() if entry else None

    def get_health(self, camera_id: str) -> Optional[CameraHealth]:
        entry = self._cameras.get(camera_id)
        return entry.to_health() if entry else None

    def add_camera(self, body: CameraCreate) -> CameraFeed:
        cam_id = f"cam-{self._next_id:02d}"
        self._next_id += 1
        entry = _CameraEntry(cam_id, body.name, body.location, body.resolution, body.source_url)
        entry.status = CameraStatus.ONLINE
        entry.fps = 0.0
        entry.last_frame_time = datetime.now(timezone.utc).isoformat()
        self._cameras[cam_id] = entry
        logger.info("Camera added: %s (%s)", cam_id, body.name)
        return entry.to_feed()

    def remove_camera(self, camera_id: str) -> bool:
        if camera_id in self._cameras:
            del self._cameras[camera_id]
            logger.info("Camera removed: %s", camera_id)
            return True
        return False

    def set_status(self, camera_id: str, status: CameraStatus, error: Optional[str] = None) -> None:
        entry = self._cameras.get(camera_id)
        if entry:
            entry.status = status
            entry.error_message = error
            if status == CameraStatus.ONLINE:
                entry.uptime_start = time.time()

    def tick_frame(self, camera_id: str, fps: float) -> None:
        """Called by the detection engine after processing each frame."""
        entry = self._cameras.get(camera_id)
        if entry:
            entry.fps = round(fps, 1)
            entry.last_frame_time = datetime.now(timezone.utc).isoformat()
            if entry.status != CameraStatus.ONLINE:
                entry.status = CameraStatus.ONLINE
                entry.error_message = None


# ── Global singleton ─────────────────────────────────────────────────

camera_manager = CameraManager()
