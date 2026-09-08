"""Tests for the Incident CRUD API.

Covers:
  - Auth (missing/invalid token)
  - LIST incidents (with filters)
  - CREATE incident (all 6 types)
  - GET incident by ID
  - PATCH update (severity, status, description, location)
  - DELETE incident
  - 404 for non-existent incidents
  - Auto-set resolved_at on status change
  - reported_by tracking
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
from app.models import City
from app.services.auth_service import register_user
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
def _use_incident_db():
    """Isolate incident tests with their own DB."""
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
    """Register a USER and return (token, headers)."""
    client.post("/api/auth/register", json={"email": "inc_user@test.com", "name": "Inc User", "password": "password123"})
    login = client.post("/api/auth/login", json={"email": "inc_user@test.com", "password": "password123"})
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seed_city():
    """Seed a city."""
    db = _TestSession()
    try:
        city = City(name="IncidentCity", state="Test", country="India", latitude=28.6, longitude=77.2, is_active=True)
        db.add(city)
        db.commit()
        return {"city_id": city.id}
    finally:
        db.close()


INCIDENT_TYPES = ["accident", "blockage", "breakdown", "construction", "flood", "signal_failure"]


# ── Auth tests ────────────────────────────────────────────────────────

class TestAuth:
    def test_list_without_token_returns_401(self, client):
        resp = client.get("/api/incidents")
        assert resp.status_code == 401

    def test_create_without_token_returns_401(self, client, seed_city):
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        })
        assert resp.status_code == 401

    def test_get_without_token_returns_401(self, client):
        resp = client.get("/api/incidents/1")
        assert resp.status_code == 401

    def test_patch_without_token_returns_401(self, client):
        resp = client.patch("/api/incidents/1", json={"severity": "low"})
        assert resp.status_code == 401

    def test_delete_without_token_returns_401(self, client):
        resp = client.delete("/api/incidents/1")
        assert resp.status_code == 401

    def test_garbage_token_returns_401(self, client):
        resp = client.get("/api/incidents", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401


# ── CREATE tests ──────────────────────────────────────────────────────

class TestCreateIncident:
    @pytest.mark.parametrize("incident_type", INCIDENT_TYPES)
    def test_create_all_types(self, client, user_session, seed_city, incident_type):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": incident_type,
            "severity": "medium",
        }, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["incident_type"] == incident_type

    def test_create_returns_201(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        assert resp.status_code == 201

    def test_create_has_all_fields(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "construction",
            "severity": "low",
            "description": "Road work ahead",
            "latitude": 28.61,
            "longitude": 77.21,
        }, headers=headers)
        data = resp.json()
        assert data["incident_type"] == "construction"
        assert data["severity"] == "low"
        assert data["description"] == "Road work ahead"
        assert data["latitude"] == 28.61
        assert data["longitude"] == 77.21

    def test_create_starts_active(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "flood",
            "severity": "critical",
        }, headers=headers)
        assert resp.json()["status"] == "active"

    def test_create_sets_reported_at(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "medium",
        }, headers=headers)
        assert resp.json()["reported_at"] is not None

    def test_create_sets_reported_by(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "medium",
        }, headers=headers)
        assert resp.json()["reported_by"] is not None

    def test_create_with_road_id(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "breakdown",
            "severity": "medium",
            "road_id": 42,
        }, headers=headers)
        assert resp.json()["road_id"] == 42

    def test_create_with_intersection_id(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "signal_failure",
            "severity": "high",
            "intersection_id": 7,
        }, headers=headers)
        assert resp.json()["intersection_id"] == 7


# ── LIST tests ────────────────────────────────────────────────────────

class TestListIncidents:
    def test_list_returns_200(self, client, user_session):
        _, headers = user_session
        resp = client.get("/api/incidents", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_returns_created(self, client, user_session, seed_city):
        _, headers = user_session
        client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        resp = client.get("/api/incidents", headers=headers)
        assert len(resp.json()) >= 1

    def test_list_filter_by_city(self, client, user_session, seed_city):
        _, headers = user_session
        client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        resp = client.get(f"/api/incidents?city_id={seed_city['city_id']}", headers=headers)
        assert len(resp.json()) >= 1

    def test_list_filter_by_status(self, client, user_session, seed_city):
        _, headers = user_session
        client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        resp = client.get("/api/incidents?status=active", headers=headers)
        assert len(resp.json()) >= 1

    def test_list_filter_by_type(self, client, user_session, seed_city):
        _, headers = user_session
        client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "flood",
            "severity": "critical",
        }, headers=headers)
        resp = client.get("/api/incidents?incident_type=flood", headers=headers)
        assert len(resp.json()) >= 1
        for inc in resp.json():
            assert inc["incident_type"] == "flood"

    def test_list_empty_for_nonexistent_city(self, client, user_session):
        _, headers = user_session
        resp = client.get("/api/incidents?city_id=99999", headers=headers)
        assert resp.json() == []


# ── GET by ID tests ──────────────────────────────────────────────────

class TestGetIncident:
    def test_get_returns_200(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        resp = client.get(f"/api/incidents/{inc_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == inc_id

    def test_get_nonexistent_returns_404(self, client, user_session):
        _, headers = user_session
        resp = client.get("/api/incidents/99999", headers=headers)
        assert resp.status_code == 404


# ── PATCH tests ───────────────────────────────────────────────────────

class TestUpdateIncident:
    def test_patch_severity(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "low",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        resp = client.patch(f"/api/incidents/{inc_id}", json={"severity": "critical"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["severity"] == "critical"

    def test_patch_description(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "construction",
            "severity": "medium",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        resp = client.patch(f"/api/incidents/{inc_id}", json={"description": "Updated info"}, headers=headers)
        assert resp.json()["description"] == "Updated info"

    def test_patch_status_to_resolved(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "breakdown",
            "severity": "medium",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        resp = client.patch(f"/api/incidents/{inc_id}", json={"status": "resolved"}, headers=headers)
        assert resp.json()["status"] == "resolved"
        assert resp.json()["resolved_at"] is not None

    def test_patch_location(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        resp = client.patch(f"/api/incidents/{inc_id}", json={"latitude": 29.0, "longitude": 78.0}, headers=headers)
        assert resp.json()["latitude"] == 29.0
        assert resp.json()["longitude"] == 78.0

    def test_patch_nonexistent_returns_404(self, client, user_session):
        _, headers = user_session
        resp = client.patch("/api/incidents/99999", json={"severity": "low"}, headers=headers)
        assert resp.status_code == 404

    def test_patch_does_not_set_resolved_at_if_already_resolved(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        # Resolve it
        client.patch(f"/api/incidents/{inc_id}", json={"status": "resolved"}, headers=headers)
        get_resp = client.get(f"/api/incidents/{inc_id}", headers=headers)
        first_resolved = get_resp.json()["resolved_at"]
        # Patch again (already resolved)
        client.patch(f"/api/incidents/{inc_id}", json={"description": "still resolved"}, headers=headers)
        get_resp2 = client.get(f"/api/incidents/{inc_id}", headers=headers)
        assert get_resp2.json()["resolved_at"] == first_resolved


# ── DELETE tests ──────────────────────────────────────────────────────

class TestDeleteIncident:
    def test_delete_returns_204(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        resp = client.delete(f"/api/incidents/{inc_id}", headers=headers)
        assert resp.status_code == 204

    def test_delete_removes_incident(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": "high",
        }, headers=headers)
        inc_id = create_resp.json()["id"]
        client.delete(f"/api/incidents/{inc_id}", headers=headers)
        resp = client.get(f"/api/incidents/{inc_id}", headers=headers)
        assert resp.status_code == 404

    def test_delete_nonexistent_returns_404(self, client, user_session):
        _, headers = user_session
        resp = client.delete("/api/incidents/99999", headers=headers)
        assert resp.status_code == 404


# ── Severity levels ──────────────────────────────────────────────────

class TestSeverityLevels:
    @pytest.mark.parametrize("severity", ["low", "medium", "high", "critical"])
    def test_create_with_severity(self, client, user_session, seed_city, severity):
        _, headers = user_session
        resp = client.post("/api/incidents", json={
            "city_id": seed_city["city_id"],
            "incident_type": "accident",
            "severity": severity,
        }, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["severity"] == severity
