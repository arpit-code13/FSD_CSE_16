"""Tests for the What-If Simulation API.

Covers:
  - Auth (missing/invalid token)
  - CREATE simulation (all 7 scenario types)
  - GET simulation by ID
  - GET simulation results
  - 404 for non-existent simulation
  - Deterministic invariants
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
def _use_sim_db():
    """Isolate simulation tests with their own DB, restore previous override after."""
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
    client.post("/api/auth/register", json={"email": "sim_user@test.com", "name": "Sim User", "password": "password123"})
    login = client.post("/api/auth/login", json={"email": "sim_user@test.com", "password": "password123"})
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_session(client):
    """Register an ADMIN user and return (token, headers)."""
    db = _TestSession()
    try:
        register_user(db, email="sim_admin@test.com", name="Sim Admin", password="password123")
        from app.models.user import User
        user = db.query(User).filter(User.email == "sim_admin@test.com").first()
        user.role = UserRole.ADMIN
        db.commit()
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": "sim_admin@test.com", "password": "password123"})
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seed_city():
    """Seed a city with roads, intersections, signals, and traffic records."""
    db = _TestSession()
    try:
        city = City(name="SimCity", state="Test", country="India", latitude=28.6, longitude=77.2, is_active=True)
        db.add(city)
        db.flush()

        roads = []
        for i, (name, rtype, lanes) in enumerate([
            ("Main Road", "arterial", 4),
            ("Side Street", "local", 2),
            ("Highway 1", "highway", 6),
        ], start=1):
            road = Road(city_id=city.id, name=name, road_type=rtype, lanes=lanes, length_meters=1000 * i, speed_limit_kmph=60.0)
            db.add(road)
            db.flush()
            roads.append(road)

        ix1 = Intersection(city_id=city.id, name="Junction A", latitude=28.61, longitude=77.21, intersection_type="signalized")
        ix2 = Intersection(city_id=city.id, name="Junction B", latitude=28.62, longitude=77.22, intersection_type="signalized")
        db.add_all([ix1, ix2])
        db.flush()

        sig1 = TrafficSignal(intersection_id=ix1.id, signal_type="adaptive", phases={"green": [30, 30], "amber": [5, 5]}, cycle_time_seconds=90, is_active=True)
        sig2 = TrafficSignal(intersection_id=ix2.id, signal_type="fixed", phases={"green": [25, 25], "amber": [5, 5]}, cycle_time_seconds=70, is_active=True)
        db.add_all([sig1, sig2])
        db.flush()

        # Connect roads to intersections via association table
        from app.models.road import road_intersection
        db.execute(road_intersection.insert().values(road_id=roads[0].id, intersection_id=ix1.id))
        db.execute(road_intersection.insert().values(road_id=roads[0].id, intersection_id=ix2.id))
        db.execute(road_intersection.insert().values(road_id=roads[1].id, intersection_id=ix1.id))
        db.execute(road_intersection.insert().values(road_id=roads[2].id, intersection_id=ix2.id))

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for road in roads:
            tr = TrafficRecord(
                city_id=city.id,
                road_id=road.id,
                timestamp=now,
                vehicle_count=100,
                avg_speed_kmph=45.0,
                congestion_level="moderate",
            )
            db.add(tr)

        db.commit()
        return {"city_id": city.id, "road_ids": [r.id for r in roads], "intersection_ids": [ix1.id, ix2.id], "signal_ids": [sig1.id, sig2.id]}
    finally:
        db.close()


# ── Auth tests ────────────────────────────────────────────────────────

SCENARIO_TYPES = [
    "accident", "road_closure", "heavy_rain", "festival",
    "traffic_surge", "signal_failure", "vip_movement",
]


class TestAuth:
    def test_create_simulation_without_token_returns_401(self, client, seed_city):
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Test",
            "scenario_type": "accident",
        })
        assert resp.status_code == 401

    def test_create_simulation_with_garbage_token_returns_401(self, client, seed_city):
        resp = client.post(
            "/api/simulations",
            json={"city_id": seed_city["city_id"], "name": "Test", "scenario_type": "accident"},
            headers={"Authorization": "Bearer garbage"},
        )
        assert resp.status_code == 401

    def test_get_simulation_without_token_returns_401(self, client, seed_city):
        resp = client.get("/api/simulations/1")
        assert resp.status_code == 401

    def test_get_simulation_results_without_token_returns_401(self, client, seed_city):
        resp = client.get("/api/simulations/1/results")
        assert resp.status_code == 401


# ── CREATE simulation tests ──────────────────────────────────────────

class TestCreateSimulation:
    @pytest.mark.parametrize("scenario_type", SCENARIO_TYPES)
    def test_create_simulation_all_scenarios(self, client, user_session, seed_city, scenario_type):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": f"Test {scenario_type}",
            "scenario_type": scenario_type,
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["simulation"]["scenario_type"] == scenario_type
        assert data["simulation"]["status"] == "completed"
        assert len(data["road_results"]) == 3

    def test_create_simulation_returns_summary(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Summary test",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        assert resp.status_code == 201
        summary = resp.json()["summary"]
        assert summary["total_roads_affected"] == 3
        assert "scenario_description" in summary
        assert summary["avg_speed_change_pct"] < 0  # speed should decrease

    def test_create_simulation_persists_record(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Persist test",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        assert resp.status_code == 201
        sim_id = resp.json()["simulation"]["id"]
        # Verify it can be retrieved
        get_resp = client.get(f"/api/simulations/{sim_id}", headers=headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == sim_id

    def test_create_simulation_with_parameters(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Parameterized",
            "scenario_type": "accident",
            "parameters": {"road_id": seed_city["road_ids"][0], "description": "Major crash"},
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["simulation"]["parameters"]["road_id"] == seed_city["road_ids"][0]

    def test_create_simulation_sets_user_id(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "User ID test",
            "scenario_type": "accident",
        }, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["simulation"]["user_id"] is not None


# ── Accident scenario specifics ──────────────────────────────────────

class TestAccidentScenario:
    def test_accident_reduces_speed(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Accident",
            "scenario_type": "accident",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        data = resp.json()
        targeted = [r for r in data["road_results"] if r["road_id"] == seed_city["road_ids"][0]][0]
        assert targeted["simulated_speed_kmph"] < targeted["original_speed_kmph"]

    def test_accident_increases_vehicles(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Accident",
            "scenario_type": "accident",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        data = resp.json()
        targeted = [r for r in data["road_results"] if r["road_id"] == seed_city["road_ids"][0]][0]
        assert targeted["simulated_vehicles"] >= targeted["original_vehicles"]


# ── Road closure scenario ────────────────────────────────────────────

class TestRoadClosureScenario:
    def test_road_closure_zeroes_traffic(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Closure",
            "scenario_type": "road_closure",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        data = resp.json()
        targeted = [r for r in data["road_results"] if r["road_id"] == seed_city["road_ids"][0]][0]
        assert targeted["simulated_vehicles"] == 0
        assert targeted["simulated_speed_kmph"] == 0.0


# ── Heavy rain scenario ──────────────────────────────────────────────

class TestHeavyRainScenario:
    def test_heavy_rain_slows_all_roads(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Rain",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        data = resp.json()
        for road_result in data["road_results"]:
            assert road_result["simulated_speed_kmph"] < road_result["original_speed_kmph"]


# ── Traffic surge scenario ───────────────────────────────────────────

class TestTrafficSurgeScenario:
    def test_traffic_surge_increases_volume(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Surge",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        data = resp.json()
        for road_result in data["road_results"]:
            assert road_result["simulated_vehicles"] >= road_result["original_vehicles"]


# ── GET simulation by ID ─────────────────────────────────────────────

class TestGetSimulation:
    def test_get_simulation_returns_200(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Fetch test",
            "scenario_type": "accident",
        }, headers=headers)
        sim_id = create_resp.json()["simulation"]["id"]

        resp = client.get(f"/api/simulations/{sim_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == sim_id

    def test_get_nonexistent_simulation_returns_404(self, client, user_session):
        _, headers = user_session
        resp = client.get("/api/simulations/99999", headers=headers)
        assert resp.status_code == 404

    def test_get_simulation_returns_correct_fields(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Fields check",
            "scenario_type": "festival",
        }, headers=headers)
        sim_id = create_resp.json()["simulation"]["id"]

        resp = client.get(f"/api/simulations/{sim_id}", headers=headers)
        data = resp.json()
        assert "id" in data
        assert "city_id" in data
        assert "user_id" in data
        assert "name" in data
        assert "scenario_type" in data
        assert "status" in data
        assert "parameters" in data
        assert "created_at" in data


# ── GET simulation results ───────────────────────────────────────────

class TestGetSimulationResults:
    def test_get_results_returns_200(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Results test",
            "scenario_type": "signal_failure",
        }, headers=headers)
        sim_id = create_resp.json()["simulation"]["id"]

        resp = client.get(f"/api/simulations/{sim_id}/results", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "simulation" in data
        assert "summary" in data
        assert "road_results" in data

    def test_get_nonexistent_results_returns_404(self, client, user_session):
        _, headers = user_session
        resp = client.get("/api/simulations/99999/results", headers=headers)
        assert resp.status_code == 404

    def test_results_match_create_output(self, client, user_session, seed_city):
        _, headers = user_session
        create_resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Consistency",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        sim_id = create_resp.json()["simulation"]["id"]
        create_data = create_resp.json()

        results_resp = client.get(f"/api/simulations/{sim_id}/results", headers=headers)
        results_data = results_resp.json()

        assert create_data["summary"]["total_roads_affected"] == results_data["summary"]["total_roads_affected"]
        assert len(create_data["road_results"]) == len(results_data["road_results"])


# ── Deterministic invariants ─────────────────────────────────────────

class TestDeterministicInvariants:
    def test_same_input_produces_same_output(self, client, user_session, seed_city):
        _, headers = user_session
        params = {"city_id": seed_city["city_id"], "name": "Deterministic", "scenario_type": "heavy_rain"}
        resp1 = client.post("/api/simulations", json=params, headers=headers)
        resp2 = client.post("/api/simulations", json=params, headers=headers)
        # Same scenario on same data → same speed/vehicle results
        for r1, r2 in zip(resp1.json()["road_results"], resp2.json()["road_results"]):
            assert r1["simulated_speed_kmph"] == r2["simulated_speed_kmph"]
            assert r1["simulated_vehicles"] == r2["simulated_vehicles"]

    def test_simulation_status_is_completed(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Status",
            "scenario_type": "vip_movement",
        }, headers=headers)
        assert resp.json()["simulation"]["status"] == "completed"

    def test_simulation_has_started_and_completed_times(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Timestamps",
            "scenario_type": "accident",
        }, headers=headers)
        sim = resp.json()["simulation"]
        assert sim["started_at"] is not None
        assert sim["completed_at"] is not None


# ── Admin access ─────────────────────────────────────────────────────

class TestAdminAccess:
    def test_admin_can_create_simulation(self, client, admin_session, seed_city):
        _, headers = admin_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Admin sim",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        assert resp.status_code == 201

    def test_admin_can_get_simulation(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Admin fetch",
            "scenario_type": "accident",
        }, headers=headers)
        sim_id = create_resp.json()["simulation"]["id"]
        resp = client.get(f"/api/simulations/{sim_id}", headers=headers)
        assert resp.status_code == 200

    def test_admin_can_get_results(self, client, admin_session, seed_city):
        _, headers = admin_session
        create_resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Admin results",
            "scenario_type": "signal_failure",
        }, headers=headers)
        sim_id = create_resp.json()["simulation"]["id"]
        resp = client.get(f"/api/simulations/{sim_id}/results", headers=headers)
        assert resp.status_code == 200


# ── SUMO backend tests ───────────────────────────────────────────────

class TestSumoBackend:
    """Test SUMO backend integration in the simulation engine."""

    def test_create_with_default_backend(self, client, user_session, seed_city):
        """Omitting backend should default to deterministic."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Default backend",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["summary"]["simulation_backend"] == "deterministic"

    def test_create_with_explicit_deterministic(self, client, user_session, seed_city):
        """Explicit backend=deterministic should work like default."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Explicit deterministic",
            "scenario_type": "heavy_rain",
            "backend": "deterministic",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["summary"]["simulation_backend"] == "deterministic"

    def test_sumo_backend_returns_503_when_not_installed(self, client, user_session, seed_city):
        """SUMO backend should return 503 when SUMO is not available."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "SUMO test",
            "scenario_type": "accident",
            "backend": "sumo",
        }, headers=headers)
        assert resp.status_code == 503
        data = resp.json()
        assert "SUMO" in data["detail"] or "unavailable" in data["detail"].lower()

    def test_backend_stored_in_simulation_parameters(self, client, user_session, seed_city):
        """The backend value should be stored in simulation parameters."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Backend storage",
            "scenario_type": "festival",
            "backend": "deterministic",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        params = data["simulation"]["parameters"]
        assert params is not None
        assert params.get("simulation_backend") == "deterministic"

    def test_summary_includes_backend_field(self, client, user_session, seed_city):
        """Summary should include simulation_backend."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Backend in summary",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        assert resp.status_code == 201
        summary = resp.json()["summary"]
        assert "simulation_backend" in summary
        assert summary["simulation_backend"] == "deterministic"

    def test_invalid_backend_value_rejected(self, client, user_session, seed_city):
        """Invalid backend enum value should be rejected by schema validation."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Bad backend",
            "scenario_type": "heavy_rain",
            "backend": "quantum",
        }, headers=headers)
        assert resp.status_code == 422  # Pydantic validation error

    def test_sumo_backend_results_still_have_road_results(self, client, user_session, seed_city):
        """Even when SUMO fails (503), the error response is correct."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "SUMO fail",
            "scenario_type": "traffic_surge",
            "backend": "sumo",
        }, headers=headers)
        # Should be 503, not 200 with empty results
        assert resp.status_code == 503

    def test_existing_deterministic_tests_still_pass(self, client, user_session, seed_city):
        """Deterministic backend should be completely unchanged."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Regression check",
            "scenario_type": "road_closure",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        targeted = [r for r in data["road_results"] if r["road_id"] == seed_city["road_ids"][0]][0]
        assert targeted["simulated_vehicles"] == 0
        assert targeted["simulated_speed_kmph"] == 0.0


class TestSumoEngineInternals:
    """Test internal SUMO engine helper functions."""

    def test_sumo_duration_for_scenario(self):
        """Each scenario should have a reasonable SUMO duration."""
        from app.services.simulation_service import _sumo_duration_for_scenario

        durations = {
            "accident": 1800,
            "road_closure": 3600,
            "heavy_rain": 7200,
            "festival": 5400,
            "traffic_surge": 3600,
            "signal_failure": 1800,
            "vip_movement": 2700,
        }
        for scenario, expected in durations.items():
            assert _sumo_duration_for_scenario(scenario) == expected

    def test_sumo_duration_unknown_scenario(self):
        """Unknown scenario should get a default duration."""
        from app.services.simulation_service import _sumo_duration_for_scenario
        assert _sumo_duration_for_scenario("unknown_type") == 3600

    def test_edge_id_regex_matches_valid_ids(self):
        """Edge ID regex should correctly parse SUMO edge IDs."""
        from app.services.simulation_service import _EDGE_ID_RE

        assert _EDGE_ID_RE.match("edge_road_1") is not None
        assert _EDGE_ID_RE.match("edge_road_42") is not None
        assert _EDGE_ID_RE.match("edge_road_123") is not None
        assert _EDGE_ID_RE.match("edge_road_1").group(1) == "1"
        assert _EDGE_ID_RE.match("edge_road_42").group(1) == "42"

    def test_edge_id_regex_rejects_invalid_ids(self):
        """Edge ID regex should not match non-road edge IDs."""
        from app.services.simulation_service import _EDGE_ID_RE

        assert _EDGE_ID_RE.match("edge_highway_1") is None
        assert _EDGE_ID_RE.match("junction_1") is None
        assert _EDGE_ID_RE.match("edge_road_") is None


# ── Before/After metrics tests (Stage 37) ────────────────────────────

class TestBeforeAfterMetrics:
    """Test that simulation results include comprehensive before/after metrics."""

    def test_summary_has_before_after_fields(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Metrics test",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        assert resp.status_code == 201
        summary = resp.json()["summary"]
        assert "avg_waiting_time_before" in summary
        assert "avg_waiting_time_after" in summary
        assert "avg_queue_before" in summary
        assert "avg_queue_after" in summary
        assert "total_throughput_before" in summary
        assert "total_throughput_after" in summary
        assert "avg_travel_time_before" in summary
        assert "avg_travel_time_after" in summary

    def test_road_results_have_before_after_fields(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Road metrics",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        roads = resp.json()["road_results"]
        for road in roads:
            assert "original_waiting_time" in road
            assert "simulated_waiting_time" in road
            assert "original_queue_length" in road
            assert "simulated_queue_length" in road
            assert "original_throughput" in road
            assert "simulated_throughput" in road
            assert "original_travel_time" in road
            assert "simulated_travel_time" in road

    def test_heavy_rain_increases_waiting_time(self, client, user_session, seed_city):
        """Heavy rain should increase waiting times across all roads."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Rain wait",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        summary = resp.json()["summary"]
        assert summary["avg_waiting_time_after"] >= summary["avg_waiting_time_before"]

    def test_heavy_rain_increases_travel_time(self, client, user_session, seed_city):
        """Heavy rain should increase travel times."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Rain travel",
            "scenario_type": "heavy_rain",
        }, headers=headers)
        summary = resp.json()["summary"]
        assert summary["avg_travel_time_after"] >= summary["avg_travel_time_before"]

    def test_traffic_surge_increases_throughput(self, client, user_session, seed_city):
        """Traffic surge should increase total throughput."""
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Surge TP",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        summary = resp.json()["summary"]
        assert summary["total_throughput_after"] >= summary["total_throughput_before"]


# ── Targeted scenario tests (Stage 37) ───────────────────────────────

class TestRoadClosureScenarioDetailed:
    """Road closure: closed road speed=0, vehicles=0, queue=0."""

    def test_closed_road_speed_is_zero(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Closure speed",
            "scenario_type": "road_closure",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        roads = resp.json()["road_results"]
        closed = [r for r in roads if r["road_id"] == seed_city["road_ids"][0]][0]
        assert closed["simulated_speed_kmph"] == 0.0

    def test_closed_road_vehicles_are_zero(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Closure veh",
            "scenario_type": "road_closure",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        roads = resp.json()["road_results"]
        closed = [r for r in roads if r["road_id"] == seed_city["road_ids"][0]][0]
        assert closed["simulated_vehicles"] == 0

    def test_closed_road_congestion_is_worst(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Closure cong",
            "scenario_type": "road_closure",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        roads = resp.json()["road_results"]
        closed = [r for r in roads if r["road_id"] == seed_city["road_ids"][0]][0]
        assert closed["simulated_congestion"] == "gridlock"

    def test_closed_road_travel_time_is_max(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Closure tt",
            "scenario_type": "road_closure",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        roads = resp.json()["road_results"]
        closed = [r for r in roads if r["road_id"] == seed_city["road_ids"][0]][0]
        # Travel time should be very high (near 999) when speed is 0
        assert closed["simulated_travel_time"] >= 900


class TestAccidentScenarioDetailed:
    """Accident: speed drops to 40%, vehicles increase 20%."""

    def test_accident_speed_drops_significantly(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Accident speed",
            "scenario_type": "accident",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        roads = resp.json()["road_results"]
        targeted = [r for r in roads if r["road_id"] == seed_city["road_ids"][0]][0]
        assert targeted["simulated_speed_kmph"] < targeted["original_speed_kmph"]
        # Should be ~40% of original
        ratio = targeted["simulated_speed_kmph"] / targeted["original_speed_kmph"]
        assert 0.35 <= ratio <= 0.45

    def test_accident_increases_congestion(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Accident cong",
            "scenario_type": "accident",
            "parameters": {"road_id": seed_city["road_ids"][0]},
        }, headers=headers)
        roads = resp.json()["road_results"]
        targeted = [r for r in roads if r["road_id"] == seed_city["road_ids"][0]][0]
        # congestion should worsen (higher rank)
        from app.services.simulation_service import _congestion_rank
        assert _congestion_rank(targeted["simulated_congestion"]) >= _congestion_rank(targeted["original_congestion"])


class TestTrafficSurgeScenarioDetailed:
    """Traffic surge: vehicles increase ~40%, speed drops ~35%."""

    def test_surge_increases_vehicle_count(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Surge count",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        roads = resp.json()["road_results"]
        for road in roads:
            assert road["simulated_vehicles"] >= road["original_vehicles"]

    def test_surge_decreases_speed(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Surge speed",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        roads = resp.json()["road_results"]
        for road in roads:
            assert road["simulated_speed_kmph"] < road["original_speed_kmph"]

    def test_surge_worsens_congestion(self, client, user_session, seed_city):
        _, headers = user_session
        resp = client.post("/api/simulations", json={
            "city_id": seed_city["city_id"],
            "name": "Surge cong",
            "scenario_type": "traffic_surge",
        }, headers=headers)
        roads = resp.json()["road_results"]
        from app.services.simulation_service import _congestion_rank
        for road in roads:
            assert _congestion_rank(road["simulated_congestion"]) >= _congestion_rank(road["original_congestion"])


# ── TraCI scenario application tests (Stage 37) ─────────────────────

class TestTraCIScenarioApplication:
    """Test that scenario-specific TraCI functions exist and are callable."""

    def test_apply_scenario_traci_exists(self):
        from app.services.simulation_service import _apply_scenario_traci
        assert callable(_apply_scenario_traci)

    def test_traci_road_closure_function_exists(self):
        from app.services.simulation_service import _traci_road_closure
        assert callable(_traci_road_closure)

    def test_traci_accident_function_exists(self):
        from app.services.simulation_service import _traci_accident
        assert callable(_traci_accident)

    def test_traci_traffic_surge_function_exists(self):
        from app.services.simulation_service import _traci_traffic_surge
        assert callable(_traci_traffic_surge)

    def test_traci_heavy_rain_function_exists(self):
        from app.services.simulation_service import _traci_heavy_rain
        assert callable(_traci_heavy_rain)

    def test_speed_to_congestion_map(self):
        from app.services.simulation_service import _speed_to_congestion
        assert _speed_to_congestion(1.0) == "free_flow"
        assert _speed_to_congestion(0.8) == "moderate"
        assert _speed_to_congestion(0.6) == "slow"
        assert _speed_to_congestion(0.4) == "congested"
        assert _speed_to_congestion(0.2) == "gridlock"

    def test_estimate_queue_from_congestion(self):
        from app.services.simulation_service import _estimate_queue_from_congestion
        assert _estimate_queue_from_congestion("free_flow") == 0
        assert _estimate_queue_from_congestion("moderate") == 3
        assert _estimate_queue_from_congestion("slow") == 8
        assert _estimate_queue_from_congestion("congested") == 15
        assert _estimate_queue_from_congestion("gridlock") == 30

    def test_estimate_waiting_from_congestion(self):
        from app.services.simulation_service import _estimate_waiting_from_congestion
        assert _estimate_waiting_from_congestion("free_flow") == 2.0
        assert _estimate_waiting_from_congestion("moderate") == 10.0
        assert _estimate_waiting_from_congestion("gridlock") == 90.0
