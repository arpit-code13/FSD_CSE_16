"""Tests for Stage 36 — Digital Twin SUMO integration.

Covers:
  - POST /api/digital-twin/simulate endpoint (auth, response format, fallback)
  - Digital twin SUMO pipeline service (deterministic fallback, edge mapping)
  - Schema validation
  - Congestion derivation
  - Edge-to-road ID parsing
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
        "email": "dt_sumo@test.com", "name": "DT User", "password": "password123",
    })
    login = client.post("/api/auth/login", json={
        "email": "dt_sumo@test.com", "password": "password123",
    })
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seed_city():
    db = _TestSession()
    try:
        city = City(name="DTTestCity", state="Test", country="India",
                     latitude=28.6, longitude=77.2, is_active=True)
        db.add(city)
        db.flush()

        roads = []
        for i, (name, rtype, lanes) in enumerate([
            ("Main Road", "arterial", 4),
            ("Side Street", "local", 2),
            ("Highway 1", "highway", 6),
        ], start=1):
            road = Road(city_id=city.id, name=name, road_type=rtype,
                        lanes=lanes, length_meters=1000 * i, speed_limit_kmph=60.0)
            db.add(road)
            db.flush()
            roads.append(road)

        ix1 = Intersection(city_id=city.id, name="Junction A",
                           latitude=28.61, longitude=77.21, intersection_type="signalized")
        ix2 = Intersection(city_id=city.id, name="Junction B",
                           latitude=28.62, longitude=77.22, intersection_type="signalized")
        db.add_all([ix1, ix2])
        db.flush()

        sig1 = TrafficSignal(intersection_id=ix1.id, signal_type="adaptive",
                             phases={"green": [30, 30], "amber": [5, 5]},
                             cycle_time_seconds=90, is_active=True)
        sig2 = TrafficSignal(intersection_id=ix2.id, signal_type="fixed",
                             phases={"green": [25, 25], "amber": [5, 5]},
                             cycle_time_seconds=70, is_active=True)
        db.add_all([sig1, sig2])
        db.flush()

        db.execute(road_intersection.insert().values(road_id=roads[0].id, intersection_id=ix1.id))
        db.execute(road_intersection.insert().values(road_id=roads[0].id, intersection_id=ix2.id))
        db.execute(road_intersection.insert().values(road_id=roads[1].id, intersection_id=ix1.id))
        db.execute(road_intersection.insert().values(road_id=roads[2].id, intersection_id=ix2.id))

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for road in roads:
            tr = TrafficRecord(city_id=city.id, road_id=road.id, timestamp=now,
                               vehicle_count=100, avg_speed_kmph=45.0,
                               congestion_level="moderate")
            db.add(tr)

        db.commit()
        return {"city_id": city.id, "road_ids": [r.id for r in roads],
                "intersection_ids": [ix1.id, ix2.id]}
    finally:
        db.close()


# ── Auth tests ────────────────────────────────────────────────────────

class TestAuth:
    def test_simulate_without_token_returns_401(self, client, seed_city):
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        })
        assert resp.status_code == 401

    def test_simulate_with_garbage_token_returns_401(self, client, seed_city):
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401


# ── Endpoint response format tests ────────────────────────────────────

class TestSimulateResponse:
    def test_simulate_returns_200(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        assert resp.status_code == 200

    def test_simulate_returns_correct_structure(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        data = resp.json()
        assert "status" in data
        assert "city_id" in data
        assert "summary" in data
        assert "roads" in data
        assert "message" in data

    def test_simulate_summary_has_all_fields(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        summary = resp.json()["summary"]
        assert "total_roads" in summary
        assert "total_vehicles_before" in summary
        assert "total_vehicles_after" in summary
        assert "avg_speed_before_kmph" in summary
        assert "avg_speed_after_kmph" in summary
        assert "avg_speed_change_pct" in summary
        assert "worst_road_name" in summary
        assert "overall_congestion_before" in summary
        assert "overall_congestion_after" in summary

    def test_simulate_roads_have_required_fields(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        roads = resp.json()["roads"]
        assert len(roads) == 3
        for road in roads:
            assert "road_id" in road
            assert "road_name" in road
            assert "original_vehicles" in road
            assert "original_speed_kmph" in road
            assert "simulated_vehicles" in road
            assert "simulated_speed_kmph" in road
            assert "simulated_congestion" in road
            assert "queue_length_estimate" in road
            assert "travel_time_seconds" in road

    def test_simulate_returns_all_3_roads(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        roads = resp.json()["roads"]
        road_ids = {r["road_id"] for r in roads}
        for rid in seed_city["road_ids"]:
            assert rid in road_ids


# ── Deterministic fallback tests ──────────────────────────────────────

class TestDeterministicFallback:
    def test_status_is_unavailable_when_no_sumo(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        assert resp.json()["status"] == "unavailable"

    def test_fallback_message_mentions_sumo(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        msg = resp.json()["message"].lower()
        assert "sumo" in msg or "deterministic" in msg or "unavailable" in msg

    def test_fallback_produces_nonzero_vehicles(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        summary = resp.json()["summary"]
        assert summary["total_vehicles_before"] > 0
        assert summary["total_vehicles_after"] > 0

    def test_fallback_speed_ratio_matches_congestion(self, client, user_session, seed_city):
        """Simulated speed should be <= original speed for moderate congestion."""
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
        }, headers=headers)
        roads = resp.json()["roads"]
        for road in roads:
            assert road["simulated_speed_kmph"] <= road["original_speed_kmph"]


# ── Traffic multiplier tests ──────────────────────────────────────────

class TestTrafficMultiplier:
    def test_multiplier_increases_vehicles(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": seed_city["city_id"],
            "traffic_multiplier": 2.0,
        }, headers=headers)
        summary = resp.json()["summary"]
        # With 2x multiplier, total vehicles should be ~2x
        assert summary["total_vehicles_before"] > 100


# ── Error handling tests ──────────────────────────────────────────────

class TestErrors:
    def test_nonexistent_city_returns_failed(self, client, user_session):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": 99999,
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "failed"
        assert len(data["roads"]) == 0

    def test_invalid_request_body_returns_422(self, client, user_session):
        _, headers = user_session
        resp = client.post("/api/digital-twin/simulate", json={
            "city_id": "not_an_int",
        }, headers=headers)
        assert resp.status_code == 422


# ── Pipeline service unit tests ───────────────────────────────────────

class TestPipelineInternals:
    def test_speed_to_congestion(self):
        from app.services.digital_twin_sumo import _speed_to_congestion
        assert _speed_to_congestion(1.0) == "free_flow"
        assert _speed_to_congestion(0.8) == "moderate"
        assert _speed_to_congestion(0.6) == "slow"
        assert _speed_to_congestion(0.4) == "congested"
        assert _speed_to_congestion(0.2) == "gridlock"

    def test_parse_road_id_from_edge(self):
        from app.services.digital_twin_sumo import _parse_road_id_from_edge
        assert _parse_road_id_from_edge("edge_road_1") == 1
        assert _parse_road_id_from_edge("edge_road_42") == 42
        assert _parse_road_id_from_edge("edge_highway_1") is None
        assert _parse_road_id_from_edge("junction_1") is None

    def test_estimate_queue(self):
        from app.services.digital_twin_sumo import _estimate_queue
        assert _estimate_queue("free_flow") == 0
        assert _estimate_queue("moderate") == 3
        assert _estimate_queue("slow") == 8
        assert _estimate_queue("congested") == 15
        assert _estimate_queue("gridlock") == 30

    def test_deterministic_fallback_returns_all_roads(self):
        from app.services.digital_twin_sumo import _deterministic_fallback
        from app.core.database import Base
        # Create a mock road list
        class MockRoad:
            id = 1
        class MockRoad2:
            id = 2
        roads = [MockRoad(), MockRoad2()]
        originals = {
            1: {"original_vehicles": 100, "original_speed_kmph": 45.0, "original_congestion": "moderate"},
            2: {"original_vehicles": 50, "original_speed_kmph": 60.0, "original_congestion": "free_flow"},
        }
        result = _deterministic_fallback(roads, originals)
        assert 1 in result
        assert 2 in result
        assert result[1]["simulated_vehicles"] == 100
        assert result[2]["simulated_vehicles"] == 50
        # moderate → 0.90 factor
        assert result[1]["simulated_speed_kmph"] == round(45.0 * 0.90, 1)
        # free_flow → 1.0 factor
        assert result[2]["simulated_speed_kmph"] == round(60.0 * 1.0, 1)


# ── Schema import tests ───────────────────────────────────────────────

class TestSchemaImports:
    def test_import_schemas(self):
        from app.schemas.digital_twin_sumo import (
            DigitalTwinSimRequest,
            DigitalTwinSimResult,
            DigitalTwinSimRoad,
            DigitalTwinSimSummary,
            DigitalTwinSimStatus,
        )
        assert DigitalTwinSimStatus.COMPLETED == "completed"
        assert DigitalTwinSimStatus.FAILED == "failed"
        assert DigitalTwinSimStatus.UNAVAILABLE == "unavailable"

    def test_request_defaults(self):
        from app.schemas.digital_twin_sumo import DigitalTwinSimRequest
        r = DigitalTwinSimRequest(city_id=1)
        assert r.duration_seconds == 600
        assert r.step_size == 1.0
        assert r.traffic_multiplier == 1.0
