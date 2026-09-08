"""Stage 31 — Analytics endpoint integration tests.

Exercises GET /api/analytics/overview, /traffic, /congestion,
/signals, /simulations against the real production app.

All analytics endpoints require a valid JWT — the tests confirm both
the happy paths and the 401 error cases.
"""

import os

os.environ["DATABASE_URL"] = "sqlite://"

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app as application
from app.models.user import User, UserRole
from app.models.city import City
from app.models.zone import Zone
from app.models.corridor import Corridor
from app.models.road import Road
from app.models.intersection import Intersection
from app.models.traffic_signal import TrafficSignal
from app.models.traffic_record import TrafficRecord
from app.models.signal_optimization import SignalOptimization
from app.models.simulation import Simulation
from app.models.simulation_result import SimulationResult
from app.models.incident import Incident
import app.models  # noqa: F401

# ── Shared test DB ────────────────────────────────────────────────────

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(_engine)
_TestSession = sessionmaker(bind=_engine)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True, scope="module")
def _use_own_db():
    """Isolate this module's tests to its own DB."""
    previous = application.dependency_overrides.get(get_db)
    application.dependency_overrides[get_db] = _override_get_db
    yield
    if previous is not None:
        application.dependency_overrides[get_db] = previous
    else:
        application.dependency_overrides.pop(get_db, None)


client = TestClient(application)


# ── Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def seed_data():
    """Seed cities, roads, intersections, signals, records, sims."""
    db = _TestSession()

    # ── Users ─────────────────────────────────────────────────────
    user = User(email="user@analytics31.com", name="U", password_hash="$2b$dummy", role=UserRole.USER)
    admin = User(email="admin@analytics31.com", name="A", password_hash="$2b$dummy", role=UserRole.ADMIN)
    db.add_all([user, admin])
    db.flush()

    # ── City ──────────────────────────────────────────────────────
    city = City(name="Mumbai", state="Maharashtra", country="India", latitude=19.07, longitude=72.87, is_active=True)
    db.add(city)
    db.flush()

    # ── Zone + Corridor ───────────────────────────────────────────
    zone = Zone(city=city, name="South Mumbai", zone_type="commercial")
    corridor = Corridor(city=city, name="Western Express", length_meters=15000, road_type="highway")
    db.add_all([zone, corridor])
    db.flush()

    # ── Roads ─────────────────────────────────────────────────────
    r1 = Road(city=city, zone=zone, corridor=corridor, name="WEH Main", road_type="highway", length_meters=5000, lanes=6, speed_limit_kmph=80)
    r2 = Road(city=city, name="SV Road", road_type="arterial", length_meters=3000, lanes=4, speed_limit_kmph=50)
    r3 = Road(city=city, name="Link Road", road_type="sub_arterial", length_meters=2000, lanes=3, speed_limit_kmph=40)
    db.add_all([r1, r2, r3])
    db.flush()

    # ── Intersections ─────────────────────────────────────────────
    ix1 = Intersection(city=city, name="Bandra Signal", latitude=19.06, longitude=72.83, intersection_type="signalized")
    ix1.roads.extend([r1, r2])
    ix2 = Intersection(city=city, name="Andheri Junction", latitude=19.12, longitude=72.85, intersection_type="signalized")
    ix2.roads.append(r1)
    db.add_all([ix1, ix2])
    db.flush()

    # ── Signals ───────────────────────────────────────────────────
    sig1 = TrafficSignal(intersection=ix1, signal_type="adaptive", phases={"green": [30, 45]}, cycle_time_seconds=90, is_active=True)
    sig2 = TrafficSignal(intersection=ix2, signal_type="fixed", phases={"green": [40]}, cycle_time_seconds=60, is_active=True)
    db.add_all([sig1, sig2])
    db.flush()

    # ── Traffic records ───────────────────────────────────────────
    now = datetime.now(timezone.utc)
    rec1 = TrafficRecord(city=city, road=r1, timestamp=now, vehicle_count=200, avg_speed_kmph=65.0, congestion_level="moderate",
                         vehicle_composition={"car": 100, "bike": 50, "bus": 20, "truck": 30})
    rec2 = TrafficRecord(city=city, road=r2, timestamp=now, vehicle_count=120, avg_speed_kmph=22.0, congestion_level="congested",
                         vehicle_composition={"car": 60, "bike": 40, "bus": 10, "truck": 10})
    rec3 = TrafficRecord(city=city, road=r3, timestamp=now, vehicle_count=50, avg_speed_kmph=35.0, congestion_level="slow",
                         vehicle_composition={"car": 30, "bike": 20})
    db.add_all([rec1, rec2, rec3])
    db.flush()

    # ── Signal optimization ───────────────────────────────────────
    opt1 = SignalOptimization(
        signal_id=sig1.id, intersection_id=ix1.id, city_id=city.id,
        current_timing={"phases": {"green": [30, 45]}, "cycle": 90},
        recommended_timing={"phases": {"green": [20, 35]}, "cycle": 65},
        predicted_impact={"speed_improvement_pct": 12.5},
        approval_status="pending",
    )
    opt2 = SignalOptimization(
        signal_id=sig2.id, intersection_id=ix2.id, city_id=city.id,
        current_timing={"phases": {"green": [40]}, "cycle": 60},
        recommended_timing={"phases": {"green": [30]}, "cycle": 50},
        predicted_impact={"speed_improvement_pct": 8.0},
        approval_status="approved",
        approved_by=admin.id,
        approved_at=now,
    )
    db.add_all([opt1, opt2])
    db.flush()

    # ── Incidents ─────────────────────────────────────────────────
    inc1 = Incident(city=city, road=r2, intersection=ix1, incident_type="accident", severity="high", status="active", reported_at=now)
    db.add(inc1)
    db.flush()

    # ── Simulation ────────────────────────────────────────────────
    sim1 = Simulation(city=city, user_id=user.id, name="Rain Impact", scenario_type="heavy_rain", status="completed", started_at=now, completed_at=now)
    db.add(sim1)
    db.flush()
    sim1_result = SimulationResult(simulation_id=sim1.id, road_id=r1.id, avg_speed_kmph=50.0, total_vehicles=220,
                                   metrics={"speed_change_pct": -23.0, "vehicles_impacted": 200})
    sim2 = Simulation(city=city, user_id=user.id, name="Surge Test", scenario_type="traffic_surge", status="completed", started_at=now, completed_at=now)
    db.add(sim2)
    db.flush()
    sim2_result = SimulationResult(simulation_id=sim2.id, road_id=r2.id, avg_speed_kmph=15.0, total_vehicles=180,
                                   metrics={"speed_change_pct": -31.8, "vehicles_impacted": 120})
    db.add_all([sim1_result, sim2_result])
    db.commit()

    ids = {
        "user_id": user.id,
        "admin_id": admin.id,
        "city_id": city.id,
        "r1_id": r1.id,
        "r2_id": r2.id,
        "r3_id": r3.id,
        "ix1_id": ix1.id,
        "ix2_id": ix2.id,
        "sig1_id": sig1.id,
        "sig2_id": sig2.id,
    }
    db.close()
    return ids


def _token(user_id: int, role: UserRole) -> str:
    return create_access_token(user_id, role)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Tests: authentication required ────────────────────────────────────

class TestAnalyticsAuth:
    def test_overview_requires_token(self):
        assert client.get("/api/analytics/overview").status_code == 401

    def test_traffic_requires_token(self):
        assert client.get("/api/analytics/traffic").status_code == 401

    def test_congestion_requires_token(self):
        assert client.get("/api/analytics/congestion").status_code == 401

    def test_signals_requires_token(self):
        assert client.get("/api/analytics/signals").status_code == 401

    def test_simulations_requires_token(self):
        assert client.get("/api/analytics/simulations").status_code == 401

    def test_garbage_token_returns_401(self):
        resp = client.get("/api/analytics/overview", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401


# ── Tests: GET /api/analytics/overview ────────────────────────────────

class TestOverview:
    def test_overview_returns_200(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/overview", headers=_auth(tok))
        assert resp.status_code == 200

    def test_overview_counts(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/overview", headers=_auth(tok))
        data = resp.json()
        assert data["total_roads"] == 3
        assert data["total_intersections"] == 2
        assert data["total_signals"] == 2
        assert data["total_zones"] == 1
        assert data["total_corridors"] == 1
        assert data["active_incidents"] == 1

    def test_overview_traffic_metrics(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/overview", headers=_auth(tok))
        data = resp.json()
        assert data["total_vehicles_tracked"] == 370  # 200+120+50
        assert data["avg_speed_kmph"] is not None
        assert data["avg_speed_kmph"] > 0

    def test_overview_congestion_distribution(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/overview", headers=_auth(tok))
        data = resp.json()
        dist = data["congestion_distribution"]
        assert dist.get("moderate", 0) >= 1
        assert dist.get("congested", 0) >= 1
        assert dist.get("slow", 0) >= 1
        assert data["overall_congestion_level"] == "congested"

    def test_overview_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/overview", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_roads"] == 3

    def test_overview_nonexistent_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/overview", params={"city_id": 999999}, headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_roads"] == 0
        assert data["total_vehicles_tracked"] == 0


# ── Tests: GET /api/analytics/traffic ─────────────────────────────────

class TestTrafficAnalytics:
    def test_traffic_returns_200(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/traffic", headers=_auth(tok))
        assert resp.status_code == 200

    def test_traffic_totals(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/traffic", headers=_auth(tok))
        data = resp.json()
        assert data["total_vehicles"] == 370
        assert data["total_roads_with_data"] == 3
        assert data["avg_speed_kmph"] is not None
        assert data["min_speed_kmph"] == 22.0
        assert data["max_speed_kmph"] == 65.0

    def test_traffic_speed_by_road_type(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/traffic", headers=_auth(tok))
        data = resp.json()
        assert len(data["speed_by_road_type"]) == 3  # highway, arterial, sub_arterial
        types = {s["road_type"] for s in data["speed_by_road_type"]}
        assert "highway" in types
        assert "arterial" in types

    def test_traffic_vehicle_composition(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/traffic", headers=_auth(tok))
        data = resp.json()
        comp = data["vehicle_composition"]
        assert len(comp) > 0
        total_pct = sum(v["percentage"] for v in comp)
        assert abs(total_pct - 100.0) < 0.5  # within rounding
        # car should be the most common
        assert comp[0]["vehicle_type"] == "car"

    def test_traffic_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/traffic", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_vehicles"] == 370


# ── Tests: GET /api/analytics/congestion ──────────────────────────────

class TestCongestionAnalytics:
    def test_congestion_returns_200(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/congestion", headers=_auth(tok))
        assert resp.status_code == 200

    def test_congestion_distribution(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/congestion", headers=_auth(tok))
        data = resp.json()
        dist = data["congestion_distribution"]
        assert dist.get("moderate", 0) >= 1
        assert dist.get("congested", 0) >= 1
        assert dist.get("slow", 0) >= 1
        assert data["overall_congestion_level"] == "congested"

    def test_congestion_queue_and_wait(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/congestion", headers=_auth(tok))
        data = resp.json()
        assert data["avg_queue_length"] is not None
        assert data["avg_queue_length"] > 0
        assert data["avg_waiting_time_seconds"] is not None
        assert data["avg_waiting_time_seconds"] > 0

    def test_congestion_hotspots(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/congestion", headers=_auth(tok))
        data = resp.json()
        hotspots = data["hotspots"]
        assert len(hotspots) >= 1
        # SV Road is congested
        names = [h["road_name"] for h in hotspots]
        assert "SV Road" in names

    def test_hotspot_has_required_fields(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/congestion", headers=_auth(tok))
        h = resp.json()["hotspots"][0]
        assert "road_id" in h
        assert "road_name" in h
        assert "congestion_level" in h
        assert "vehicle_count" in h
        assert "queue_length_estimate" in h

    def test_congestion_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/congestion", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_roads"] == 3


# ── Tests: GET /api/analytics/signals ─────────────────────────────────

class TestSignalAnalytics:
    def test_signals_returns_200(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/signals", headers=_auth(tok))
        assert resp.status_code == 200

    def test_signals_counts(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/signals", headers=_auth(tok))
        data = resp.json()
        assert data["total_signals"] == 2
        assert data["active_signals"] == 2
        assert data["inactive_signals"] == 0

    def test_signals_avg_cycle_time(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/signals", headers=_auth(tok))
        data = resp.json()
        # (90 + 60) / 2 = 75
        assert data["avg_cycle_time_seconds"] == 75.0

    def test_signals_type_distribution(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/signals", headers=_auth(tok))
        data = resp.json()
        types = {s["signal_type"]: s["count"] for s in data["signal_type_distribution"]}
        assert types.get("adaptive", 0) == 1
        assert types.get("fixed", 0) == 1

    def test_signals_optimization_status(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/signals", headers=_auth(tok))
        data = resp.json()
        assert data["pending_optimizations"] == 1
        assert data["approved_optimizations"] == 1
        assert data["rejected_optimizations"] == 0
        assert data["total_optimizations"] == 2

    def test_signals_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/signals", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_signals"] == 2


# ── Tests: GET /api/analytics/simulations ─────────────────────────────

class TestSimulationAnalytics:
    def test_simulations_returns_200(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/simulations", headers=_auth(tok))
        assert resp.status_code == 200

    def test_simulations_counts(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/simulations", headers=_auth(tok))
        data = resp.json()
        assert data["total_simulations"] == 2
        assert data["completed_simulations"] == 2
        assert data["failed_simulations"] == 0
        assert data["completion_rate_pct"] == 100.0

    def test_simulations_scenario_distribution(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/simulations", headers=_auth(tok))
        data = resp.json()
        dist = {s["scenario_type"]: s["count"] for s in data["scenario_distribution"]}
        assert dist.get("heavy_rain", 0) == 1
        assert dist.get("traffic_surge", 0) == 1
        assert data["most_used_scenario"] in ("heavy_rain", "traffic_surge")  # tie

    def test_simulations_avg_impact(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/simulations", headers=_auth(tok))
        data = resp.json()
        assert data["avg_speed_change_pct"] is not None
        # avg of -23.0 and -31.8 = -27.4
        assert data["avg_speed_change_pct"] == -27.4
        assert data["avg_vehicles_impacted"] is not None
        # avg of 200 and 120 = 160
        assert data["avg_vehicles_impacted"] == 160.0

    def test_simulations_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/simulations", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_simulations"] == 2

    def test_simulations_empty_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/analytics/simulations", params={"city_id": 999999}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_simulations"] == 0


# ── Tests: admin access ───────────────────────────────────────────────

class TestAdminAccess:
    def test_admin_can_access_overview(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/analytics/overview", headers=_auth(tok))
        assert resp.status_code == 200

    def test_admin_can_access_traffic(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/analytics/traffic", headers=_auth(tok))
        assert resp.status_code == 200

    def test_admin_can_access_congestion(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/analytics/congestion", headers=_auth(tok))
        assert resp.status_code == 200

    def test_admin_can_access_signals(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/analytics/signals", headers=_auth(tok))
        assert resp.status_code == 200

    def test_admin_can_access_simulations(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/analytics/simulations", headers=_auth(tok))
        assert resp.status_code == 200
