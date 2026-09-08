"""Tests for the Emergency Route API.

Covers:
  - Auth (missing/invalid token)
  - CREATE route (with intersections, signals, traffic)
  - GET route by ID
  - SIMULATE route
  - APPROVE route (admin only)
  - 404 for non-existent routes
  - Deterministic invariants
  - Priority levels
  - Approval workflow (pending → approved)
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
from app.services.auth_service import register_user
from app.core.security import create_access_token
from app.models.user import UserRole


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
def _use_emergency_db():
    """Isolate emergency tests with their own DB."""
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
    """Register a normal USER and return (token, headers)."""
    client.post("/api/auth/register", json={"email": "em_user@test.com", "name": "Em User", "password": "password123"})
    login = client.post("/api/auth/login", json={"email": "em_user@test.com", "password": "password123"})
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_session(client):
    """Register an ADMIN user and return (token, headers)."""
    db = _TestSession()
    try:
        register_user(db, email="em_admin@test.com", name="Em Admin", password="password123")
        from app.models.user import User
        user = db.query(User).filter(User.email == "em_admin@test.com").first()
        user.role = UserRole.ADMIN
        db.commit()
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": "em_admin@test.com", "password": "password123"})
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seed_city():
    """Seed a city with intersections, roads, signals, and traffic records."""
    db = _TestSession()
    try:
        city = City(name="EmergencyCity", state="Test", country="India", latitude=28.6, longitude=77.2, is_active=True)
        db.add(city)
        db.flush()

        # Create 4 intersections in a line: A → B → C → D
        intersections = []
        for i, name in enumerate(["Junction A", "Junction B", "Junction C", "Junction D"]):
            ix = Intersection(
                city_id=city.id, name=name,
                latitude=28.60 + i * 0.01, longitude=77.20 + i * 0.01,
                intersection_type="signalized",
            )
            db.add(ix)
            db.flush()
            intersections.append(ix)

        # Create roads connecting adjacent intersections
        roads = []
        road_specs = [
            ("Road A-B", "arterial", 4, 800.0, 50.0),
            ("Road B-C", "arterial", 4, 1200.0, 45.0),
            ("Road C-D", "arterial", 4, 600.0, 40.0),
        ]
        for i, (name, rtype, lanes, length, speed) in enumerate(road_specs):
            road = Road(
                city_id=city.id, name=name, road_type=rtype,
                lanes=lanes, length_meters=length, speed_limit_kmph=speed,
            )
            db.add(road)
            db.flush()
            roads.append(road)

        # Connect roads to intersections
        db.execute(road_intersection.insert().values(road_id=roads[0].id, intersection_id=intersections[0].id))
        db.execute(road_intersection.insert().values(road_id=roads[0].id, intersection_id=intersections[1].id))
        db.execute(road_intersection.insert().values(road_id=roads[1].id, intersection_id=intersections[1].id))
        db.execute(road_intersection.insert().values(road_id=roads[1].id, intersection_id=intersections[2].id))
        db.execute(road_intersection.insert().values(road_id=roads[2].id, intersection_id=intersections[2].id))
        db.execute(road_intersection.insert().values(road_id=roads[2].id, intersection_id=intersections[3].id))

        # Create signals at each intersection
        signals = []
        for i, ix in enumerate(intersections):
            sig = TrafficSignal(
                intersection_id=ix.id,
                signal_type="adaptive" if i % 2 == 0 else "fixed",
                phases={"green": [30, 30], "amber": [5, 5]},
                cycle_time_seconds=90,
                is_active=True,
            )
            db.add(sig)
            db.flush()
            signals.append(sig)

        # Add traffic records
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for road in roads:
            tr = TrafficRecord(
                city_id=city.id, road_id=road.id, timestamp=now,
                vehicle_count=80, avg_speed_kmph=35.0, congestion_level="moderate",
            )
            db.add(tr)

        db.commit()
        return {
            "city_id": city.id,
            "intersection_ids": [ix.id for ix in intersections],
            "road_ids": [r.id for r in roads],
            "signal_ids": [s.id for s in signals],
        }
    finally:
        db.close()


# ── Auth tests ────────────────────────────────────────────────────────

class TestAuth:
    def test_create_route_without_token_returns_401(self, client, seed_city):
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        })
        assert resp.status_code == 401

    def test_create_route_with_garbage_token_returns_401(self, client, seed_city):
        resp = client.post(
            "/api/emergency/routes",
            json={
                "city_id": seed_city["city_id"],
                "origin_intersection_id": seed_city["intersection_ids"][0],
                "destination_intersection_id": seed_city["intersection_ids"][3],
            },
            headers={"Authorization": "Bearer garbage"},
        )
        assert resp.status_code == 401

    def test_get_route_without_token_returns_401(self, client, seed_city):
        resp = client.get("/api/emergency/1")
        assert resp.status_code == 401

    def test_simulate_route_without_token_returns_401(self, client, seed_city):
        resp = client.post("/api/emergency/1/simulate")
        assert resp.status_code == 401

    def test_approve_route_without_token_returns_401(self, client, seed_city):
        resp = client.post("/api/emergency/1/approve")
        assert resp.status_code == 401


# ── CREATE route tests ───────────────────────────────────────────────

class TestCreateRoute:
    def test_create_route_returns_201(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        assert resp.status_code == 201

    def test_create_route_has_route_and_simulation(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        data = resp.json()
        assert "route" in data
        assert "simulation" in data

    def test_create_route_has_eta(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        sim = resp.json()["simulation"]
        assert sim["eta_seconds"] > 0

    def test_create_route_has_time_saved(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        sim = resp.json()["simulation"]
        assert sim["time_saved_seconds"] >= 0

    def test_create_route_has_coordinated_signals(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        sim = resp.json()["simulation"]
        assert len(sim["coordinated_signals"]) > 0
        for sig in sim["coordinated_signals"]:
            assert "signal_id" in sig
            assert "intersection_id" in sig
            assert "green_extension_seconds" in sig

    def test_create_route_has_distance(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        sim = resp.json()["simulation"]
        assert sim["total_distance_meters"] > 0

    def test_create_route_has_intersections(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        sim = resp.json()["simulation"]
        assert seed_city["intersection_ids"][0] in sim["route_intersections"]
        assert seed_city["intersection_ids"][3] in sim["route_intersections"]

    def test_create_route_persists_record(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = resp.json()["route"]["id"]
        get_resp = client.get(f"/api/emergency/{route_id}", headers=headers)
        assert get_resp.status_code == 200

    def test_create_route_sets_user_id(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        assert resp.json()["route"]["created_by"] is not None

    def test_create_route_starts_pending(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route = resp.json()["route"]
        assert route["status"] == "pending"
        assert route["approval_status"] == "pending"

    def test_create_route_with_priority(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
            "priority": "critical",
        }, headers=headers)
        assert resp.json()["route"]["priority"] == "critical"

    def test_create_route_with_name(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
            "name": "Hospital Express",
        }, headers=headers)
        assert resp.json()["route"]["name"] == "Hospital Express"

    def test_create_route_invalid_origin_returns_400(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": 99999,
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        assert resp.status_code == 400

    def test_create_route_invalid_destination_returns_400(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": 99999,
        }, headers=headers)
        assert resp.status_code == 400


# ── GET route tests ───────────────────────────────────────────────────

class TestGetRoute:
    def test_get_route_returns_200(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.get(f"/api/emergency/{route_id}", headers=headers)
        assert resp.status_code == 200

    def test_get_nonexistent_route_returns_404(self, client, user_session):
        _, headers = user_session
        resp = client.get("/api/emergency/99999", headers=headers)
        assert resp.status_code == 404

    def test_get_route_has_correct_id(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.get(f"/api/emergency/{route_id}", headers=headers)
        assert resp.json()["route"]["id"] == route_id


# ── SIMULATE route tests ─────────────────────────────────────────────

class TestSimulateRoute:
    def test_simulate_returns_200(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/simulate", headers=headers)
        assert resp.status_code == 200

    def test_simulate_returns_eta(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/simulate", headers=headers)
        assert resp.json()["simulation"]["eta_seconds"] > 0

    def test_simulate_nonexistent_returns_404(self, client, user_session):
        _, headers = user_session
        resp = client.post("/api/emergency/99999/simulate", headers=headers)
        assert resp.status_code == 404

    def test_simulate_updates_route(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        client.post(f"/api/emergency/{route_id}/simulate", headers=headers)
        # Re-fetch and verify simulation fields are present
        get_resp = client.get(f"/api/emergency/{route_id}", headers=headers)
        assert get_resp.json()["simulation"]["eta_seconds"] > 0


# ── APPROVE route tests ──────────────────────────────────────────────

class TestApproveRoute:
    def test_approve_requires_admin(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        assert resp.status_code == 403

    def test_approve_sets_status_active(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["approval_status"] == "approved"
        assert resp.json()["status"] == "active"

    def test_approve_sets_approved_by(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        assert resp.json()["approved_by"] is not None

    def test_approve_sets_message(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        assert "message" in resp.json()

    def test_approve_nonexistent_returns_404(self, client, admin_session):
        _, headers = admin_session
        resp = client.post("/api/emergency/99999/approve", headers=headers)
        assert resp.status_code == 404

    def test_approve_already_approved_returns_409(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        resp = client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        assert resp.status_code == 409

    def test_approve_updates_route_status(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        get_resp = client.get(f"/api/emergency/{route_id}", headers=headers)
        assert get_resp.json()["route"]["approval_status"] == "approved"
        assert get_resp.json()["route"]["status"] == "active"


# ── Deterministic invariants ─────────────────────────────────────────

class TestDeterministicInvariants:
    def test_same_input_produces_same_eta(self, client, user_session, seed_city):
        _, headers = user_session
        params = {
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }
        resp1 = client.post("/api/emergency/routes", json=params, headers=headers)
        resp2 = client.post("/api/emergency/routes", json=params, headers=headers)
        assert resp1.json()["simulation"]["eta_seconds"] == resp2.json()["simulation"]["eta_seconds"]

    def test_same_input_produces_same_signals(self, client, user_session, seed_city):
        _, headers = user_session
        params = {
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }
        resp1 = client.post("/api/emergency/routes", json=params, headers=headers)
        resp2 = client.post("/api/emergency/routes", json=params, headers=headers)
        s1 = resp1.json()["simulation"]["coordinated_signals"]
        s2 = resp2.json()["simulation"]["coordinated_signals"]
        assert len(s1) == len(s2)
        for a, b in zip(s1, s2):
            assert a["signal_id"] == b["signal_id"]
            assert a["green_extension_seconds"] == b["green_extension_seconds"]

    def test_eta_is_less_than_normal_travel(self, client, user_session, seed_city):
        """Emergency route should be faster than normal travel."""
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        sim = resp.json()["simulation"]
        # Time saved should be non-negative (emergency is faster or equal)
        assert sim["time_saved_seconds"] >= 0


# ── Priority levels ──────────────────────────────────────────────────

class TestPriorityLevels:
    @pytest.mark.parametrize("priority", ["low", "medium", "high", "critical"])
    def test_create_route_with_priority(self, client, user_session, seed_city, priority):
        _, headers = user_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
            "priority": priority,
        }, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["route"]["priority"] == priority


# ── Admin access ─────────────────────────────────────────────────────

class TestAdminAccess:
    def test_admin_can_create_route(self, client, admin_session, seed_city):
        _, headers = admin_session
        resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        assert resp.status_code == 201

    def test_admin_can_get_route(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.get(f"/api/emergency/{route_id}", headers=headers)
        assert resp.status_code == 200

    def test_admin_can_simulate_route(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/simulate", headers=headers)
        assert resp.status_code == 200

    def test_admin_can_approve_route(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/emergency/routes", json={
            "city_id": seed_city["city_id"],
            "origin_intersection_id": seed_city["intersection_ids"][0],
            "destination_intersection_id": seed_city["intersection_ids"][3],
        }, headers=headers)
        route_id = create_resp.json()["route"]["id"]
        resp = client.post(f"/api/emergency/{route_id}/approve", headers=headers)
        assert resp.status_code == 200


# ── Helper ────────────────────────────────────────────────────────────

def create_resp_token(session_tuple):
    """Extract token from session tuple."""
    return session_tuple[0]
