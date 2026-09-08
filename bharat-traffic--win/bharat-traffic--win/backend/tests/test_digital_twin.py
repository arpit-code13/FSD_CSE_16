"""Stage 25 — Digital Twin endpoint integration tests.

Exercises GET /api/digital-twin, /cities, /zones, /corridors, /roads,
/intersections, /signals against the real production app.

All digital-twin endpoints require a valid JWT — the tests confirm both
the happy paths and the 401 / 404 error cases, plus GeoJSON structure
validation.

Seeds data into whichever DB the app's ``get_db`` override currently
points at, so tests survive cross-module override shuffling.
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


# Only set our override if no other test file has set one yet
if get_db not in application.dependency_overrides:
    application.dependency_overrides[get_db] = _override_get_db

client = TestClient(application)


# ── Ensure DT tests use their own DB, even if another module overwrote the override ──

@pytest.fixture(autouse=True, scope="module")
def _use_dt_db():
    """Set the get_db override to our own DB before any DT test runs,
    then restore the previous override afterwards."""
    previous = application.dependency_overrides.get(get_db)
    application.dependency_overrides[get_db] = _override_get_db
    yield
    # Restore previous override so subsequent test files are not affected
    if previous is not None:
        application.dependency_overrides[get_db] = previous
    else:
        application.dependency_overrides.pop(get_db, None)


# ── Helpers ───────────────────────────────────────────────────────────

def _get_db():
    """Get a DB session from the app's current dependency override."""
    override_fn = application.dependency_overrides[get_db]
    gen = override_fn()
    db = next(gen)
    return db, gen


def _token(user_id: int, role: UserRole) -> str:
    return create_access_token(user_id, role)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def seed_data():
    """Seed cities, zones, corridors, roads, intersections, signals, records
    into whichever DB the app is currently using."""
    db, gen = _get_db()
    try:
        # ── Users ─────────────────────────────────────────────────
        user = User(email="user@dt25.com", name="U", password_hash="$2b$dummy", role=UserRole.USER)
        admin = User(email="admin@dt25.com", name="A", password_hash="$2b$dummy", role=UserRole.ADMIN)
        db.add_all([user, admin])
        db.flush()

        # ── Cities ────────────────────────────────────────────────
        city1 = City(name="Pune", state="Maharashtra", country="India", latitude=18.52, longitude=73.85, is_active=True)
        city2 = City(name="Mumbai", state="Maharashtra", country="India", latitude=19.07, longitude=72.87, is_active=True)
        city3 = City(name="InactiveCity", state="Test", country="India", latitude=10.0, longitude=20.0, is_active=False)
        db.add_all([city1, city2, city3])
        db.flush()

        # ── Zones (city1 only) ────────────────────────────────────
        zone1 = Zone(city=city1, name="Shivajinagar", zone_type="commercial")
        zone2 = Zone(city=city1, name="Kothrud", zone_type="residential")
        db.add_all([zone1, zone2])
        db.flush()

        # ── Corridors (city1 only) ────────────────────────────────
        co1 = Corridor(city=city1, name="Pune-Mumbai Expressway", road_type="highway", length_meters=95000)
        co2 = Corridor(city=city1, name="FC Road", road_type="arterial", length_meters=2500)
        db.add_all([co1, co2])
        db.flush()

        # ── Roads (city1 + city2) ─────────────────────────────────
        r1 = Road(city=city1, zone=zone1, corridor=co2, name="FC Road", road_type="arterial", length_meters=2500, lanes=4, speed_limit_kmph=50)
        r2 = Road(city=city1, zone=zone2, name="Karve Road", road_type="arterial", length_meters=3200, lanes=3, speed_limit_kmph=40)
        r3 = Road(city=city2, name="Marine Drive", road_type="arterial", length_meters=4000, lanes=3, speed_limit_kmph=50)
        db.add_all([r1, r2, r3])
        db.flush()

        # ── Intersections ─────────────────────────────────────────
        ix1 = Intersection(city=city1, name="Sancheti Signal", latitude=18.53, longitude=73.84, intersection_type="signalized")
        ix1.roads.extend([r1, r2])
        ix2 = Intersection(city=city1, name="Deccan Bus Stop", latitude=18.51, longitude=73.83, intersection_type="signalized")
        ix2.roads.append(r1)
        ix3 = Intersection(city=city2, name="Nariman Point", latitude=18.93, longitude=72.82, intersection_type="signalized")
        ix3.roads.append(r3)
        db.add_all([ix1, ix2, ix3])
        db.flush()

        # ── Signals ───────────────────────────────────────────────
        sig1 = TrafficSignal(intersection=ix1, signal_type="adaptive", phases={"green": [30, 45], "amber": [5]}, cycle_time_seconds=90, is_active=True)
        sig2 = TrafficSignal(intersection=ix2, signal_type="fixed", phases={"green": [40]}, cycle_time_seconds=50, is_active=True)
        sig3 = TrafficSignal(intersection=ix3, signal_type="adaptive", phases={"green": [60]}, cycle_time_seconds=70, is_active=False)
        db.add_all([sig1, sig2, sig3])
        db.flush()

        # ── Traffic records ───────────────────────────────────────
        now = datetime.now(timezone.utc)
        rec1 = TrafficRecord(city=city1, road=r1, timestamp=now, vehicle_count=120, avg_speed_kmph=22.5, congestion_level="congested", vehicle_composition={"car": 60, "bike": 40})
        rec2 = TrafficRecord(city=city1, road=r2, timestamp=now, vehicle_count=80, avg_speed_kmph=35.0, congestion_level="moderate", vehicle_composition={"car": 50, "bike": 30})
        rec3 = TrafficRecord(city=city2, road=r3, timestamp=now, vehicle_count=200, avg_speed_kmph=15.0, congestion_level="gridlock", vehicle_composition={"car": 100, "bike": 60, "bus": 40})
        db.add_all([rec1, rec2, rec3])
        db.commit()

        return {
            "user_id": user.id,
            "admin_id": admin.id,
            "city1_id": city1.id,
            "city2_id": city2.id,
            "city3_id": city3.id,
            "zone1_id": zone1.id,
            "zone2_id": zone2.id,
            "co1_id": co1.id,
            "co2_id": co2.id,
            "r1_id": r1.id,
            "r2_id": r2.id,
            "r3_id": r3.id,
            "ix1_id": ix1.id,
            "ix2_id": ix2.id,
            "ix3_id": ix3.id,
            "sig1_id": sig1.id,
            "sig2_id": sig2.id,
            "sig3_id": sig3.id,
        }
    finally:
        try:
            next(gen)
        except StopIteration:
            pass


# ── Tests: authentication required ────────────────────────────────────

class TestDigitalTwinAuth:
    def test_overview_requires_token(self):
        assert client.get("/api/digital-twin", params={"city_id": 1}).status_code == 401

    def test_cities_requires_token(self):
        assert client.get("/api/digital-twin/cities").status_code == 401

    def test_zones_requires_token(self):
        assert client.get("/api/digital-twin/zones", params={"city_id": 1}).status_code == 401

    def test_roads_requires_token(self):
        assert client.get("/api/digital-twin/roads", params={"city_id": 1}).status_code == 401

    def test_intersections_requires_token(self):
        assert client.get("/api/digital-twin/intersections", params={"city_id": 1}).status_code == 401

    def test_signals_requires_token(self):
        assert client.get("/api/digital-twin/signals", params={"city_id": 1}).status_code == 401


# ── Tests: GET /api/digital-twin (overview) ──────────────────────────

class TestOverview:
    def test_overview_returns_city_stats(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["city_name"] == "Pune"
        assert data["state"] == "Maharashtra"
        assert data["country"] == "India"
        assert data["latitude"] == 18.52
        assert data["longitude"] == 73.85

    def test_overview_counts(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        data = resp.json()
        assert data["total_zones"] == 2
        assert data["total_corridors"] == 2
        assert data["total_roads"] == 2
        assert data["total_intersections"] == 2
        assert data["total_signals"] == 2

    def test_overview_traffic_aggregate(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        data = resp.json()
        assert data["total_vehicles_tracked"] == 200  # 120 + 80
        assert data["overall_congestion_level"] == "congested"

    def test_overview_city_not_found(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin", params={"city_id": 999999}, headers=_auth(tok))
        assert resp.status_code == 404


# ── Tests: GET /api/digital-twin/cities ──────────────────────────────

class TestCities:
    def test_cities_returns_geojson(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/cities", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "FeatureCollection"
        assert isinstance(data["features"], list)

    def test_cities_only_active(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/cities", headers=_auth(tok))
        features = resp.json()["features"]
        names = [f["properties"]["name"] for f in features]
        assert "Pune" in names
        assert "Mumbai" in names
        assert "InactiveCity" not in names

    def test_cities_have_point_geometry(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/cities", headers=_auth(tok))
        pune = next(f for f in resp.json()["features"] if f["properties"]["name"] == "Pune")
        assert pune["geometry"]["type"] == "Point"
        assert pune["geometry"]["coordinates"] == [73.85, 18.52]  # [lon, lat]

    def test_cities_feature_properties(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/cities", headers=_auth(tok))
        pune = next(f for f in resp.json()["features"] if f["properties"]["name"] == "Pune")
        assert pune["properties"]["state"] == "Maharashtra"
        assert pune["properties"]["country"] == "India"
        assert "id" in pune["properties"]


# ── Tests: GET /api/digital-twin/zones ───────────────────────────────

class TestZones:
    def test_zones_returns_geojson(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/zones", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "FeatureCollection"

    def test_zones_filtered_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/zones", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        features = resp.json()["features"]
        assert len(features) == 2
        names = [f["properties"]["name"] for f in features]
        assert "Shivajinagar" in names
        assert "Kothrud" in names

    def test_zones_null_geometry(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/zones", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        for f in resp.json()["features"]:
            assert f["geometry"] is None

    def test_zones_have_type_property(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/zones", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        types = {f["properties"]["zone_type"] for f in resp.json()["features"]}
        assert "commercial" in types
        assert "residential" in types

    def test_zones_empty_for_other_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/zones", params={"city_id": seed_data["city2_id"]}, headers=_auth(tok))
        assert len(resp.json()["features"]) == 0


# ── Tests: GET /api/digital-twin/corridors ───────────────────────────

class TestCorridors:
    def test_corridors_returns_geojson(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/corridors", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_corridors_filtered_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/corridors", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        features = resp.json()["features"]
        assert len(features) == 2
        names = {f["properties"]["name"] for f in features}
        assert "Pune-Mumbai Expressway" in names
        assert "FC Road" in names

    def test_corridors_have_length(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/corridors", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        expressway = next(f for f in resp.json()["features"] if f["properties"]["name"] == "Pune-Mumbai Expressway")
        assert expressway["properties"]["length_meters"] == 95000
        assert expressway["properties"]["road_type"] == "highway"


# ── Tests: GET /api/digital-twin/roads ───────────────────────────────

class TestRoads:
    def test_roads_returns_geojson(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/roads", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_roads_filtered_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/roads", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        features = resp.json()["features"]
        assert len(features) == 2
        names = {f["properties"]["name"] for f in features}
        assert "FC Road" in names
        assert "Karve Road" in names

    def test_roads_have_traffic_state(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/roads", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        fc = next(f for f in resp.json()["features"] if f["properties"]["name"] == "FC Road")
        props = fc["properties"]
        assert props["vehicle_count"] == 120
        assert props["avg_speed_kmph"] == 22.5
        assert props["congestion_level"] == "congested"
        assert props["density_vehicles_per_km"] is not None
        assert props["queue_length_estimate"] is not None
        assert props["recorded_at"] is not None

    def test_roads_have_connected_intersections(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/roads", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        fc = next(f for f in resp.json()["features"] if f["properties"]["name"] == "FC Road")
        assert len(fc["properties"]["connected_intersection_ids"]) == 2

    def test_roads_null_geometry(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/roads", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        for f in resp.json()["features"]:
            assert f["geometry"] is None

    def test_roads_road_type_property(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/roads", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        types = {f["properties"]["road_type"] for f in resp.json()["features"]}
        assert "arterial" in types


# ── Tests: GET /api/digital-twin/intersections ───────────────────────

class TestIntersections:
    def test_intersections_returns_geojson(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/intersections", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_intersections_filtered_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/intersections", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        features = resp.json()["features"]
        assert len(features) == 2
        names = {f["properties"]["name"] for f in features}
        assert "Sancheti Signal" in names
        assert "Deccan Bus Stop" in names

    def test_intersections_have_point_geometry(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/intersections", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        sancheti = next(f for f in resp.json()["features"] if f["properties"]["name"] == "Sancheti Signal")
        assert sancheti["geometry"]["type"] == "Point"
        assert sancheti["geometry"]["coordinates"] == [73.84, 18.53]

    def test_intersections_have_signal(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/intersections", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        sancheti = next(f for f in resp.json()["features"] if f["properties"]["name"] == "Sancheti Signal")
        sig = sancheti["properties"]["signal"]
        assert sig is not None
        assert sig["signal_type"] == "adaptive"
        assert sig["cycle_time_seconds"] == 90
        assert sig["is_active"] is True

    def test_intersections_connected_roads(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/intersections", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        sancheti = next(f for f in resp.json()["features"] if f["properties"]["name"] == "Sancheti Signal")
        assert len(sancheti["properties"]["connected_road_ids"]) == 2


# ── Tests: GET /api/digital-twin/signals ─────────────────────────────

class TestSignals:
    def test_signals_returns_geojson(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/signals", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_signals_filtered_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/signals", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        features = resp.json()["features"]
        assert len(features) == 2

    def test_signals_have_geometry(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/signals", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        for f in resp.json()["features"]:
            assert f["geometry"]["type"] == "Point"
            assert len(f["geometry"]["coordinates"]) == 2

    def test_signals_have_properties(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/signals", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        sigs = resp.json()["features"]
        types = {f["properties"]["signal_type"] for f in sigs}
        assert "adaptive" in types
        assert "fixed" in types

    def test_signals_include_intersection_info(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/digital-twin/signals", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        for f in resp.json()["features"]:
            assert "intersection_id" in f["properties"]
            assert "intersection_name" in f["properties"]
            assert "is_active" in f["properties"]
            assert "phases" in f["properties"]


# ── Tests: admin access ──────────────────────────────────────────────

class TestAdminAccess:
    def test_admin_can_access_overview(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/digital-twin", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200

    def test_admin_can_access_cities(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/digital-twin/cities", headers=_auth(tok))
        assert resp.status_code == 200

    def test_admin_can_access_roads(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.get("/api/digital-twin/roads", params={"city_id": seed_data["city1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
