"""WebSocket endpoint for real-time YOLO detection streaming.

Provides ``/ws/yolo`` — pushes live YOLO snapshots (detections, counts,
density, queue) to connected clients at a configurable interval.

Data sent per tick:
  - type: "snapshot"
  - frame_index: monotonic frame counter
  - camera_id, camera_name, camera_status
  - fps, confidence
  - total_vehicles, vehicle_counts
  - traffic_density, traffic_density_label
  - queue_length_meters, queue_length_trend
  - detections: [{id, vehicle_type, confidence, bbox}]

Also sends:
  - type: "alert" when new alerts are generated
  - type: "pong" in response to client pings

Authentication:
  Clients must send a valid JWT as a query parameter ``token`` on connection.

Fallback:
  If the WebSocket drops, the frontend falls back to REST polling via
  ``GET /api/yolo/snapshot``.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.logging_config import logger
from app.services import yolo_service

router = APIRouter(tags=["ws-yolo"])


# ── Connection Manager ───────────────────────────────────────────────


class YoloConnectionManager:
    """Manages active WebSocket connections for YOLO detection streaming."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []
        self._running = False
        self._task: asyncio.Task | None = None

    async def connect(self, ws: WebSocket) -> bool:
        await ws.accept()
        self._connections.append(ws)
        logger.info("YOLO WebSocket connected: %d total", len(self._connections))
        return True

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)
        logger.info("YOLO WebSocket disconnected: %d total", len(self._connections))

    async def broadcast(self, data: dict[str, Any]) -> None:
        if not self._connections:
            return
        message = json.dumps(data, default=str)
        disconnected: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    @property
    def active_count(self) -> int:
        return len(self._connections)


_yolo_manager = YoloConnectionManager()


# ── Authentication ───────────────────────────────────────────────────


def _verify_ws_token(token: str) -> bool:
    try:
        from app.core.security import verify_token
        payload = verify_token(token)
        return payload is not None
    except Exception:
        return False


# ── Snapshot Collection ──────────────────────────────────────────────


def _collect_yolo_snapshot(camera_id: str = "cam-01") -> dict[str, Any]:
    """Generate a YOLO snapshot as a JSON-safe dict."""
    snapshot = yolo_service.generate_snapshot(camera_id)
    # generate and store alerts
    alerts = yolo_service._generate_alerts(snapshot)
    yolo_service.push_alerts(alerts)
    return {
        "type": "snapshot",
        "timestamp": int(time.time() * 1000),
        **snapshot.model_dump(),
    }


# ── Background Broadcast Loop ────────────────────────────────────────

DEFAULT_CAMERA_ID = "cam-01"
BROADCAST_INTERVAL = 1.5  # seconds between YOLO ticks


async def _broadcast_loop() -> None:
    """Periodically generate and broadcast YOLO snapshots."""
    logger.info("YOLO WebSocket broadcast loop started")
    while True:
        try:
            if _yolo_manager.active_count > 0:
                snapshot = _collect_yolo_snapshot(DEFAULT_CAMERA_ID)
                await _yolo_manager.broadcast(snapshot)
            await asyncio.sleep(BROADCAST_INTERVAL)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("YOLO broadcast loop error: %s", e)
            await asyncio.sleep(3)


def _ensure_broadcast_task() -> None:
    if _yolo_manager._task is None or _yolo_manager._task.done():
        try:
            loop = asyncio.get_event_loop()
            _yolo_manager._task = loop.create_task(_broadcast_loop())
        except RuntimeError:
            pass


# ── WebSocket Endpoint ───────────────────────────────────────────────

@router.websocket("/ws/yolo")
async def websocket_yolo(
    websocket: WebSocket,
    token: str = Query(...),
    camera_id: str = Query(default=DEFAULT_CAMERA_ID),
):
    """Live YOLO detection WebSocket.

    Connect with: ``ws://host/ws/yolo?token=<JWT>&camera_id=cam-01``

    Sends JSON messages every ``BROADCAST_INTERVAL`` seconds:
      - type: "snapshot"
      - frame_index, camera_id, camera_name, camera_status
      - fps, confidence, total_vehicles
      - vehicle_counts, traffic_density, queue_length_meters
      - detections: [{id, vehicle_type, confidence, bbox}]

    Client can send:
      - "ping" → receives {"type": "pong", "timestamp": ...}
      - {"command": "switch_camera", "camera_id": "cam-02"} → switches broadcast camera
    """
    # Authenticate
    if not _verify_ws_token(token):
        await websocket.close(code=4001, reason="Invalid token")
        return

    await _yolo_manager.connect(websocket)
    _ensure_broadcast_task()

    # send initial snapshot immediately
    try:
        snapshot = _collect_yolo_snapshot(camera_id)
        await websocket.send_json(snapshot)
    except Exception:
        pass

    try:
        while True:
            data = await websocket.receive_text()

            # handle client commands
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                msg = {"command": data}

            command = msg.get("command", data)

            if command == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": int(time.time() * 1000),
                })
            elif command == "switch_camera":
                new_cam = msg.get("camera_id", camera_id)
                snapshot = _collect_yolo_snapshot(new_cam)
                await websocket.send_json(snapshot)
            elif command == "get_snapshot":
                cam = msg.get("camera_id", camera_id)
                snapshot = _collect_yolo_snapshot(cam)
                await websocket.send_json(snapshot)

    except WebSocketDisconnect:
        _yolo_manager.disconnect(websocket)
    except Exception as e:
        logger.warning("YOLO WebSocket error: %s", e)
        _yolo_manager.disconnect(websocket)
