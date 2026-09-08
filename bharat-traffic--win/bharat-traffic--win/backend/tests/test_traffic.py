"""Stage 24 — Traffic endpoint integration tests.

Exercises GET /api/traffic/live, /roads, /roads/{id},
/intersections, /intersections/{id} against the real production app.

All traffic endpoints require a valid JWT — the tests confirm both the
happy paths and the 401 / 404 error cases.
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
from app.models.road import Road
from app.models.intersection import Intersection
from app.models.traffic_signal import TrafficSignal
from app.models.traffic_record import TrafficRecord
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


application.dependency_overrides[get_db] = _override_get_db
client = TestClient(application)


# ── Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def seed_data():
    """Seed roads, intersections, signals, records into the shared DB."""
    db = _TestSession()

    # ── Users ─────────────────────────────────────────────────────
    user = User(email="user@traff24.com", name="U", password_hash="$2b$dummy", role=UserRole.USER)
    admin = User(email="admin@traff24.com", name="A", password_hash="$2b$dummy", role=UserRole.ADMIN)
    db.add_all([user, admin])
    db.flush()

    # ── City ──────────────────────────────────────────────────────
    city = City(name="Pune", state="Maharashtra")
    db.add(city)
    db.flush()

    # ── Roads ─────────────────────────────────────────────────────
    road1 = Road(city=city, name="FC Road", road_type="arterial", length_meters=2500, lanes=4, speed_limit_kmph=50)
    road2 = Road(city=city, name="JM Road", road_type="arterial", length_meters=1800, lanes=3, speed_limit_kmph=40)
    road3 = Road(city=city, name="Koregaon Park Lane", road_type="local", length_meters=800, lanes=2, speed_limit_kmph=30)
    db.add_all([road1, road2, road3])
    db.flush()

    # ── Intersections ─────────────────────────────────────────────
    ix1 = Intersection(city=city, name="Sancheti Signal", latitude=18.53, longitude=73.84, intersection_type="signalized")
    ix1.roads.extend([road1, road2])
    ix2 = Intersection(city=city, name="Deccan Bus Stop", latitude=18.51, longitude=73.83, intersection_type="signalized")
    ix2.roads.append(road1)
    ix3 = Intersection(city=city, name="Koregaon X", latitude=18.50, longitude=73.82, intersection_type="roundabout")
    ix3.roads.append(road3)
    db.add_all([ix1, ix2, ix3])
    db.flush()

    # ── Signals ───────────────────────────────────────────────────
    sig1 = TrafficSignal(intersection=ix1, signal_type="adaptive", phases={"green": [30, 45], "amber": [5, 5]}, cycle_time_seconds=90, is_active=True)
    sig2 = TrafficSignal(intersection=ix2, signal_type="fixed", phases={"green": [40], "amber": [5]}, cycle_time_seconds=50, is_active=True)
    db.add_all([sig1, sig2])
    db.flush()

    # ── Traffic records ───────────────────────────────────────────
    now = datetime.now(timezone.utc)
    rec1 = TrafficRecord(city=city, road=road1, timestamp=now, vehicle_count=120, avg_speed_kmph=22.5, congestion_level="congested", vehicle_composition={"car": 60, "bike": 40, "bus": 10, "truck": 10})
    rec2 = TrafficRecord(city=city, road=road2, timestamp=now, vehicle_count=80, avg_speed_kmph=35.0, congestion_level="moderate", vehicle_composition={"car": 50, "bike": 20, "bus": 5, "truck": 5})
    rec3 = TrafficRecord(city=city, road=road3, timestamp=now, vehicle_count=15, avg_speed_kmph=28.0, congestion_level="slow", vehicle_composition={"car": 10, "bike": 5})
    db.add_all([rec1, rec2, rec3])
    db.flush()

    # ── Incidents ─────────────────────────────────────────────────
    inc = Incident(city=city, intersection=ix1, road=road1, incident_type="accident", severity="moderate", reported_at=now)
    db.add(inc)
    db.commit()

    # Return IDs (not ORM objects — they expire after commit)
    ids = {
        "user_id": user.id,
        "admin_id": admin.id,
        "city_id": city.id,
        "road1_id": road1.id,
        "road2_id": road2.id,
        "road3_id": road3.id,
        "ix1_id": ix1.id,
        "ix2_id": ix2.id,
        "ix3_id": ix3.id,
    }
    db.close()
    return ids


def _token(user_id: int, role: UserRole) -> str:
    """Generate a JWT for the given user."""
    return create_access_token(user_id, role)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Tests: authentication required ────────────────────────────────────

class TestTrafficAuth:
    def test_live_requires_token(self):
        assert client.get("/api/traffic/live").status_code == 401

    def test_roads_requires_token(self):
        assert client.get("/api/traffic/roads").status_code == 401

    def test_intersections_requires_token(self):
        assert client.get("/api/traffic/intersections").status_code == 401


# ── Tests: GET /api/traffic/roads ─────────────────────────────────────

class TestRoads:
    def test_list_all_roads(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/roads", headers=_auth(tok))
        assert resp.status_code == 200
        roads = resp.json()
        assert len(roads) == 3
        names = {r["name"] for r in roads}
        assert "FC Road" in names

    def test_filter_by_road_type(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/roads", params={"road_type": "local"}, headers=_auth(tok))
        assert resp.status_code == 200
        roads = resp.json()
        assert len(roads) == 1
        assert roads[0]["name"] == "Koregaon Park Lane"

    def test_road_traffic_fields(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/roads", headers=_auth(tok))
        fc = next(r for r in resp.json() if r["name"] == "FC Road")
        assert fc["vehicle_count"] == 120
        assert fc["avg_speed_kmph"] == 22.5
        assert fc["congestion_level"] == "congested"
        assert fc["vehicle_composition"]["car"] == 60
        assert fc["density_vehicles_per_km"] is not None
        assert fc["queue_length_estimate"] is not None
        assert fc["recorded_at"] is not None


# ── Tests: GET /api/traffic/roads/{id} ───────────────────────────────

class TestRoadDetail:
    def test_get_road_by_id(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get(f"/api/traffic/roads/{seed_data['road1_id']}", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "FC Road"
        assert data["vehicle_count"] == 120

    def test_road_not_found(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/roads/999999", headers=_auth(tok))
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Road not found"

    def test_road_without_record_returns_nulls(self, seed_data):
        """A road with no TrafficRecord should return nulls for live fields."""
        db = _TestSession()
        try:
            city = db.get(City, seed_data["city_id"])
            new_road = Road(city=city, name="New Road", road_type="local", length_meters=500, lanes=2)
            db.add(new_road)
            db.commit()
            db.refresh(new_road)
            new_id = new_road.id

            tok = _token(seed_data["user_id"], UserRole.USER)
            resp = client.get(f"/api/traffic/roads/{new_id}", headers=_auth(tok))
            assert resp.status_code == 200
            data = resp.json()
            assert data["vehicle_count"] is None
            assert data["congestion_level"] is None
            assert data["density_vehicles_per_km"] is None
        finally:
            # Clean up so the extra road doesn't affect live/count tests
            db.delete(new_road)
            db.commit()
            db.close()


# ── Tests: GET /api/traffic/intersections ─────────────────────────────

class TestIntersections:
    def test_list_all_intersections(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/intersections", headers=_auth(tok))
        assert resp.status_code == 200
        ixs = resp.json()
        assert len(ixs) == 3

    def test_filter_by_type(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/intersections", params={"intersection_type": "roundabout"}, headers=_auth(tok))
        assert resp.status_code == 200
        ixs = resp.json()
        assert len(ixs) == 1
        assert ixs[0]["name"] == "Koregaon X"

    def test_intersection_has_signal(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/intersections", headers=_auth(tok))
        sancheti = next(ix for ix in resp.json() if ix["name"] == "Sancheti Signal")
        assert sancheti["signal"] is not None
        assert sancheti["signal"]["signal_type"] == "adaptive"
        assert sancheti["signal"]["cycle_time_seconds"] == 90
        assert sancheti["signal"]["is_active"] is True

    def test_intersection_without_signal(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/intersections", headers=_auth(tok))
        koregaon = next(ix for ix in resp.json() if ix["name"] == "Koregaon X")
        assert koregaon["signal"] is None

    def test_intersection_connected_roads(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/intersections", headers=_auth(tok))
        sancheti = next(ix for ix in resp.json() if ix["name"] == "Sancheti Signal")
        assert len(sancheti["connected_road_ids"]) == 2
        assert "FC Road" in sancheti["connected_road_names"]

    def test_intersection_incident_count(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/intersections", headers=_auth(tok))
        sancheti = next(ix for ix in resp.json() if ix["name"] == "Sancheti Signal")
        assert sancheti["active_incidents"] == 1


# ── Tests: GET /api/traffic/intersections/{id} ───────────────────────

class TestIntersectionDetail:
    def test_get_intersection_by_id(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get(f"/api/traffic/intersections/{seed_data['ix1_id']}", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Sancheti Signal"
        assert data["signal"]["signal_type"] == "adaptive"

    def test_intersection_not_found(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/intersections/999999", headers=_auth(tok))
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Intersection not found"


# ── Tests: GET /api/traffic/live ──────────────────────────────────────

class TestLive:
    def test_live_returns_overview(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/live", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_roads"] == 3
        assert data["total_intersections"] == 3
        assert data["total_signals"] == 2
        assert data["total_vehicles_tracked"] == 215  # 120+80+15
        assert data["avg_speed_kmph"] is not None

    def test_live_congestion_breakdown(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/live", headers=_auth(tok))
        data = resp.json()
        breakdown = data["congestion_breakdown"]
        assert breakdown.get("congested", 0) >= 1
        assert breakdown.get("moderate", 0) >= 1
        assert breakdown.get("slow", 0) >= 1

    def test_live_overall_congestion(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/live", headers=_auth(tok))
        data = resp.json()
        # worst level present is "congested"
        assert data["overall_congestion_level"] == "congested"

    def test_live_top_congested(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/live", headers=_auth(tok))
        data = resp.json()
        assert len(data["top_congested_roads"]) >= 1
        # FC Road has the worst congestion
        assert data["top_congested_roads"][0]["name"] == "FC Road"

    def test_live_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/live", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_roads"] == 3

    def test_live_nonexistent_city_returns_zeroes(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/traffic/live", params={"city_id": 999999}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["total_roads"] == 0


# ── Tests: admin can also access ──────────────────────────────────────

class TestAdminAccess:
    def test_admin_can_access_roads(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/traffic/roads", headers=_auth(tok))
        assert resp.status_code == 200

    def test_admin_can_access_live(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/traffic/live", headers=_auth(tok))
        assert resp.status_code == 200
