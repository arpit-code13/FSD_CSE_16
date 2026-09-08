"""WebSocket endpoint for live traffic data.

Provides ``/ws/traffic`` — a WebSocket connection that pushes live
traffic telemetry to connected clients at a configurable interval.

Data sent per tick:
  - vehicles: per-road vehicle counts
  - speed: per-road average speeds
  - congestion: per-road congestion levels
  - queue: per-road queue estimates
  - signals: traffic signal states
  - incidents: active incidents
  - simulation: active SUMO simulation status

Authentication:
  Clients must send a valid JWT as a query parameter ``token`` on
  connection.  The token is verified before accepting the connection.

Fallback:
  If the WebSocket connection drops, the frontend falls back to REST
  polling via ``GET /api/traffic/live``.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging_config import logger
from app.models.incident import Incident
from app.models.intersection import Intersection
from app.models.road import Road
from app.models.simulation import Simulation
from app.models.traffic_record import TrafficRecord
from app.models.traffic_signal import TrafficSignal

router = APIRouter(tags=["ws-traffic"])


# ── Connection manager ────────────────────────────────────────────────

class ConnectionManager:
    """Manages active WebSocket connections for live traffic."""

    def __init__(self):
        self._connections: list[WebSocket] = []
        self._running = False
        self._task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket) -> bool:
        """Accept a new WebSocket connection.

        Returns True if accepted, False if rejected.
        """
        await websocket.accept()
        self._connections.append(websocket)
        logger.info("WebSocket connected: %d total", len(self._connections))
        return True

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a disconnected client."""
        if websocket in self._connections:
            self._connections.remove(websocket)
        logger.info("WebSocket disconnected: %d total", len(self._connections))

    async def broadcast(self, data: dict[str, Any]) -> None:
        """Send data to all connected clients."""
        if not self._connections:
            return

        message = json.dumps(data, default=str)
        disconnected = []
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


manager = ConnectionManager()


# ── Authentication ────────────────────────────────────────────────────

def _verify_ws_token(token: str) -> bool:
    """Verify a JWT token for WebSocket authentication."""
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        return payload is not None
    except Exception:
        return False


# ── Data collection ───────────────────────────────────────────────────

def _collect_traffic_snapshot() -> dict[str, Any]:
    """Read current traffic state from the database.

    Returns a dict with all the fields the frontend expects.
    """
    db = SessionLocal()
    try:
        # Roads with traffic data
        roads = list(db.scalars(select(Road)).all())
        vehicles = {}
        speed = {}
        congestion = {}
        queue = {}

        for road in roads:
            rec = db.scalar(
                select(TrafficRecord)
                .where(TrafficRecord.road_id == road.id)
                .order_by(TrafficRecord.timestamp.desc())
                .limit(1)
            )
            road_key = str(road.id)
            if rec:
                vehicles[road_key] = rec.vehicle_count
                speed[road_key] = rec.avg_speed_kmph
                congestion[road_key] = rec.congestion_level
                queue[road_key] = _estimate_queue(rec.congestion_level)
            else:
                vehicles[road_key] = 0
                speed[road_key] = 0.0
                congestion[road_key] = "free_flow"
                queue[road_key] = 0

        # Signals
        signals_data = []
        signals = list(
            db.scalars(
                select(TrafficSignal)
                .options(joinedload(TrafficSignal.intersection))
            ).unique().all()
        )
        for sig in signals:
            ix = sig.intersection
            signals_data.append({
                "id": sig.id,
                "intersection_id": ix.id if ix else None,
                "intersection_name": ix.name if ix else None,
                "signal_type": sig.signal_type,
                "cycle_time_seconds": sig.cycle_time_seconds,
                "is_active": sig.is_active,
                "phases": sig.phases,
            })

        # Active incidents
        incidents_data = []
        active_incidents = list(
            db.scalars(
                select(Incident).where(Incident.status != "resolved")
            ).all()
        )
        for inc in active_incidents:
            incidents_data.append({
                "id": inc.id,
                "incident_type": inc.incident_type,
                "severity": inc.severity,
                "status": inc.status,
                "description": inc.description,
                "latitude": inc.latitude,
                "longitude": inc.longitude,
                "road_id": inc.road_id,
                "intersection_id": inc.intersection_id,
            })

        # Active simulations
        sim_status = None
        active_sim = db.scalar(
            select(Simulation).where(Simulation.status == "running").limit(1)
        )
        if active_sim:
            sim_status = {
                "id": active_sim.id,
                "name": active_sim.name,
                "scenario_type": active_sim.scenario_type,
                "status": active_sim.status,
                "started_at": str(active_sim.started_at) if active_sim.started_at else None,
            }

        # Aggregate stats
        total_vehicles = sum(vehicles.values())
        speeds = [s for s in speed.values() if s > 0]
        avg_speed = round(sum(speeds) / len(speeds), 1) if speeds else 0.0

        congestion_counts: dict[str, int] = {}
        for c in congestion.values():
            congestion_counts[c] = congestion_counts.get(c, 0) + 1

        return {
            "type": "traffic_update",
            "timestamp": int(time.time() * 1000),
            "vehicles": vehicles,
            "speed": speed,
            "congestion": congestion,
            "queue": queue,
            "signals": signals_data,
            "incidents": incidents_data,
            "simulation": sim_status,
            "summary": {
                "total_vehicles": total_vehicles,
                "avg_speed_kmph": avg_speed,
                "congestion_breakdown": congestion_counts,
                "active_incidents": len(incidents_data),
                "active_signals": len(signals_data),
            },
        }
    finally:
        db.close()


def _estimate_queue(congestion_level: str) -> int:
    return {
        "free_flow": 0, "moderate": 3, "slow": 8,
        "congested": 15, "gridlock": 30,
    }.get(congestion_level, 0)


# ── Background broadcaster ────────────────────────────────────────────

async def _broadcast_loop() -> None:
    """Periodically collect and broadcast traffic data."""
    logger.info("WebSocket broadcast loop started")
    while True:
        try:
            if manager.active_count > 0:
                snapshot = _collect_traffic_snapshot()
                await manager.broadcast(snapshot)
            await asyncio.sleep(settings.WS_BROADCAST_INTERVAL)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Broadcast loop error: %s", e)
            await asyncio.sleep(5)


def _ensure_broadcast_task() -> None:
    """Start the broadcast task if not already running."""
    if manager._task is None or manager._task.done():
        try:
            loop = asyncio.get_event_loop()
            manager._task = loop.create_task(_broadcast_loop())
        except RuntimeError:
            pass


# ── WebSocket endpoint ────────────────────────────────────────────────

@router.websocket("/ws/traffic")
async def websocket_traffic(
    websocket: WebSocket,
    token: str = Query(...),
):
    """Live traffic WebSocket endpoint.

    Connect with: ``ws://host/ws/traffic?token=<JWT>``

    Sends JSON messages at ``WS_BROADCAST_INTERVAL`` seconds with:
      - vehicles: {road_id: count}
      - speed: {road_id: km/h}
      - congestion: {road_id: level}
      - queue: {road_id: queue_length}
      - signals: [{id, type, state, ...}]
      - incidents: [{id, type, severity, ...}]
      - simulation: {id, status, ...} or null
      - summary: {total_vehicles, avg_speed, ...}
    """
    # Authenticate
    if not _verify_ws_token(token):
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Accept connection
    await manager.connect(websocket)

    # Start broadcast task if needed
    _ensure_broadcast_task()

    # Send initial snapshot immediately
    try:
        snapshot = _collect_traffic_snapshot()
        await websocket.send_json(snapshot)
    except Exception:
        pass

    try:
        # Keep connection alive — client can send pings
        while True:
            data = await websocket.receive_text()
            # Client pings or commands can be handled here
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": int(time.time() * 1000)})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket error: %s", e)
        manager.disconnect(websocket)
