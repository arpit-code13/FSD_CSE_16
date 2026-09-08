"""Tests for the WebSocket traffic endpoint.

Covers:
  - Module imports and function availability
  - Data collection function
  - Authentication
  - Connection manager
  - REST fallback data format
"""

from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models import City, Road, Intersection, TrafficSignal, TrafficRecord
from app.models.road import road_intersection


# ── Module-scoped DB ──────────────────────────────────────────────────

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(bind=_engine)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _use_db():
    original = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = _override_get_db
    Base.metadata.create_all(_engine)
    session = _TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(_engine)
        if original is not None:
            app.dependency_overrides[get_db] = original


@pytest.fixture()
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def user_session(client):
    client.post("/api/auth/register", json={
        "email": "ws_user@test.com", "name": "WS User", "password": "password123",
    })
    login = client.post("/api/auth/login", json={
        "email": "ws_user@test.com", "password": "password123",
    })
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seed_city():
    db = _TestSession()
    try:
        city = City(name="WSTestCity", state="Test", country="India",
                     latitude=28.6, longitude=77.2, is_active=True)
        db.add(city)
        db.flush()

        roads = []
        for i, (name, rtype, lanes) in enumerate([
            ("Main Road", "arterial", 4),
            ("Side Street", "local", 2),
        ], start=1):
            road = Road(city_id=city.id, name=name, road_type=rtype,
                        lanes=lanes, length_meters=1000 * i, speed_limit_kmph=60.0)
            db.add(road)
            db.flush()
            roads.append(road)

        ix1 = Intersection(city_id=city.id, name="Junction A",
                           latitude=28.61, longitude=77.21, intersection_type="signalized")
        db.add(ix1)
        db.flush()

        sig1 = TrafficSignal(intersection_id=ix1.id, signal_type="adaptive",
                             phases={"green": [30, 30]}, cycle_time_seconds=90, is_active=True)
        db.add(sig1)
        db.flush()

        db.execute(road_intersection.insert().values(road_id=roads[0].id, intersection_id=ix1.id))
        db.execute(road_intersection.insert().values(road_id=roads[1].id, intersection_id=ix1.id))

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for road in roads:
            tr = TrafficRecord(city_id=city.id, road_id=road.id, timestamp=now,
                               vehicle_count=100, avg_speed_kmph=45.0,
                               congestion_level="moderate")
            db.add(tr)

        db.commit()
        return {"city_id": city.id, "road_ids": [r.id for r in roads],
                "intersection_ids": [ix1.id]}
    finally:
        db.close()


# ── Module import tests ──────────────────────────────────────────────

class TestModuleImports:
    def test_import_ws_module(self):
        from app.api.ws_traffic import router, manager, _collect_traffic_snapshot
        assert router is not None
        assert manager is not None
        assert callable(_collect_traffic_snapshot)

    def test_import_ws_hook(self):
        # Frontend hook — just verify the file exists and is valid TS
        import os
        hook_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "hooks", "useWebSocket.ts")
        assert os.path.isfile(hook_path), f"useWebSocket.ts not found at {hook_path}"

    def test_import_realtime_context(self):
        import os
        ctx_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "context", "RealtimeContext.tsx")
        assert os.path.isfile(ctx_path), "RealtimeContext.tsx not found"


# ── Data collection tests ────────────────────────────────────────────

class TestDataCollection:
    def test_collect_traffic_snapshot_returns_dict(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        assert isinstance(snapshot, dict)

    def test_snapshot_has_required_fields(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        assert "type" in snapshot
        assert "timestamp" in snapshot
        assert "vehicles" in snapshot
        assert "speed" in snapshot
        assert "congestion" in snapshot
        assert "queue" in snapshot
        assert "signals" in snapshot
        assert "incidents" in snapshot
        assert "simulation" in snapshot
        assert "summary" in snapshot

    def test_snapshot_type_is_traffic_update(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        assert snapshot["type"] == "traffic_update"

    def test_snapshot_has_vehicles_dict(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        assert isinstance(snapshot["vehicles"], dict)
        assert len(snapshot["vehicles"]) > 0

    def test_snapshot_has_signals_list(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        assert isinstance(snapshot["signals"], list)
        assert len(snapshot["signals"]) >= 1

    def test_snapshot_signal_has_required_fields(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        sig = snapshot["signals"][0]
        assert "id" in sig
        assert "signal_type" in sig
        assert "cycle_time_seconds" in sig
        assert "is_active" in sig

    def test_snapshot_summary_has_stats(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        summary = snapshot["summary"]
        assert "total_vehicles" in summary
        assert "avg_speed_kmph" in summary
        assert "congestion_breakdown" in summary
        assert "active_incidents" in summary
        assert "active_signals" in summary

    def test_snapshot_total_vehicles_positive(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        assert snapshot["summary"]["total_vehicles"] > 0

    def test_snapshot_avg_speed_positive(self, seed_city):
        from app.api.ws_traffic import _collect_traffic_snapshot
        snapshot = _collect_traffic_snapshot()
        assert snapshot["summary"]["avg_speed_kmph"] > 0


# ── Connection manager tests ─────────────────────────────────────────

class TestConnectionManager:
    def test_manager_initial_state(self):
        from app.api.ws_traffic import manager
        assert manager.active_count == 0

    def test_manager_has_broadcast(self):
        from app.api.ws_traffic import manager
        assert hasattr(manager, 'broadcast')
        assert callable(manager.broadcast)


# ── Queue estimation tests ───────────────────────────────────────────

class TestQueueEstimation:
    def test_estimate_queue_values(self):
        from app.api.ws_traffic import _estimate_queue
        assert _estimate_queue("free_flow") == 0
        assert _estimate_queue("moderate") == 3
        assert _estimate_queue("slow") == 8
        assert _estimate_queue("congested") == 15
        assert _estimate_queue("gridlock") == 30

    def test_estimate_queue_unknown_defaults(self):
        from app.api.ws_traffic import _estimate_queue
        assert _estimate_queue("unknown") == 0


# ── Config tests ──────────────────────────────────────────────────────

class TestConfig:
    def test_ws_broadcast_interval_exists(self):
        from app.core.config import settings
        assert hasattr(settings, 'WS_BROADCAST_INTERVAL')
        assert settings.WS_BROADCAST_INTERVAL > 0


# ── REST endpoint still works (fallback verification) ────────────────

class TestRESTRemainsFunctional:
    def test_traffic_live_still_works(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.get("/api/traffic/live", headers=headers)
        assert resp.status_code == 200

    def test_simulations_still_work(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "WS fallback test",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        assert resp.status_code == 201
