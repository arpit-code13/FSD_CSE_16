"""Stage 26 — Predictions endpoint integration tests.

Exercises POST /api/predictions/run, GET /api/predictions,
GET /api/predictions/{id} against the real production app.

All prediction endpoints require a valid JWT — the tests confirm both
the happy paths and the 401 / 404 error cases, plus deterministic logic
validation.
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
from app.models.traffic_record import TrafficRecord
from app.models.prediction import Prediction
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
    """Seed cities, roads, intersections, and traffic records."""
    db = _TestSession()

    # ── Users ─────────────────────────────────────────────────────
    user = User(email="user@pred26.com", name="U", password_hash="$2b$dummy", role=UserRole.USER)
    admin = User(email="admin@pred26.com", name="A", password_hash="$2b$dummy", role=UserRole.ADMIN)
    db.add_all([user, admin])
    db.flush()

    # ── City ──────────────────────────────────────────────────────
    city = City(name="Pune", state="Maharashtra", country="India", latitude=18.52, longitude=73.85, is_active=True)
    db.add(city)
    db.flush()

    # ── Roads ─────────────────────────────────────────────────────
    r1 = Road(city=city, name="FC Road", road_type="arterial", length_meters=2500, lanes=4, speed_limit_kmph=50)
    r2 = Road(city=city, name="JM Road", road_type="arterial", length_meters=1800, lanes=3, speed_limit_kmph=40)
    r3 = Road(city=city, name="Koregaon Park Lane", road_type="local", length_meters=800, lanes=2, speed_limit_kmph=30)
    db.add_all([r1, r2, r3])
    db.flush()

    # ── Traffic records ───────────────────────────────────────────
    now = datetime.now(timezone.utc)
    rec1 = TrafficRecord(city=city, road=r1, timestamp=now, vehicle_count=120, avg_speed_kmph=22.5, congestion_level="congested")
    rec2 = TrafficRecord(city=city, road=r2, timestamp=now, vehicle_count=80, avg_speed_kmph=35.0, congestion_level="moderate")
    rec3 = TrafficRecord(city=city, road=r3, timestamp=now, vehicle_count=15, avg_speed_kmph=28.0, congestion_level="slow")
    db.add_all([rec1, rec2, rec3])
    db.commit()

    ids = {
        "user_id": user.id,
        "admin_id": admin.id,
        "city_id": city.id,
        "r1_id": r1.id,
        "r2_id": r2.id,
        "r3_id": r3.id,
    }
    db.close()
    return ids


def _token(user_id: int, role: UserRole) -> str:
    return create_access_token(user_id, role)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Tests: authentication required ────────────────────────────────────

class TestPredictionAuth:
    def test_run_requires_token(self):
        assert client.post("/api/predictions/run", params={"city_id": 1}).status_code == 401

    def test_list_requires_token(self):
        assert client.get("/api/predictions").status_code == 401

    def test_get_by_id_requires_token(self):
        assert client.get("/api/predictions/1").status_code == 401


# ── Tests: POST /api/predictions/run ─────────────────────────────────

class TestRunPredictions:
    def test_run_returns_road_predictions(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3  # 3 roads with traffic records

    def test_run_has_all_horizons(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        for pred in resp.json():
            assert "current" in pred
            assert "horizon_15min" in pred
            assert "horizon_30min" in pred
            assert "horizon_60min" in pred

    def test_run_has_all_metrics(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        for pred in resp.json():
            for horizon_key in ["current", "horizon_15min", "horizon_30min", "horizon_60min"]:
                h = pred[horizon_key]
                assert "avg_speed_kmph" in h
                assert "congestion_level" in h
                assert "queue_length_estimate" in h
                assert "waiting_time_seconds" in h

    def test_run_fc_road_prediction_values(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        fc = next(p for p in resp.json() if p["road_name"] == "FC Road")
        # Current should mirror the record
        assert fc["current"]["avg_speed_kmph"] == 22.5
        assert fc["current"]["congestion_level"] == "congested"
        # 15min should be slightly worse
        assert fc["horizon_15min"]["avg_speed_kmph"] < fc["current"]["avg_speed_kmph"]
        assert fc["horizon_15min"]["queue_length_estimate"] >= fc["current"]["queue_length_estimate"]
        # 60min should be worst
        assert fc["horizon_60min"]["avg_speed_kmph"] < fc["horizon_30min"]["avg_speed_kmph"]
        assert fc["horizon_60min"]["queue_length_estimate"] >= fc["horizon_30min"]["queue_length_estimate"]

    def test_run_speed_decreases_over_horizons(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        for pred in resp.json():
            speeds = [
                pred["current"]["avg_speed_kmph"],
                pred["horizon_15min"]["avg_speed_kmph"],
                pred["horizon_30min"]["avg_speed_kmph"],
                pred["horizon_60min"]["avg_speed_kmph"],
            ]
            # Speed should be non-increasing across horizons
            for i in range(len(speeds) - 1):
                assert speeds[i] >= speeds[i + 1], f"Speed increased from {speeds[i]} to {speeds[i+1]}"

    def test_run_queue_increases_over_horizons(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        for pred in resp.json():
            queues = [
                pred["current"]["queue_length_estimate"],
                pred["horizon_15min"]["queue_length_estimate"],
                pred["horizon_30min"]["queue_length_estimate"],
                pred["horizon_60min"]["queue_length_estimate"],
            ]
            # Queue should be non-decreasing across horizons
            for i in range(len(queues) - 1):
                assert queues[i] <= queues[i + 1], f"Queue decreased from {queues[i]} to {queues[i+1]}"

    def test_run_wait_time_increases_over_horizons(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        for pred in resp.json():
            waits = [
                pred["current"]["waiting_time_seconds"],
                pred["horizon_15min"]["waiting_time_seconds"],
                pred["horizon_30min"]["waiting_time_seconds"],
                pred["horizon_60min"]["waiting_time_seconds"],
            ]
            for i in range(len(waits) - 1):
                assert waits[i] <= waits[i + 1], f"Wait decreased from {waits[i]} to {waits[i+1]}"

    def test_run_has_model_name(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        for pred in resp.json():
            assert pred["model_name"] == "deterministic-v1"
            assert pred["confidence_score"] is not None

    def test_run_has_road_metadata(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        for pred in resp.json():
            assert "road_id" in pred
            assert "road_name" in pred
            assert "road_type" in pred
            assert "city_id" in pred

    def test_run_city_not_found(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": 999999}, headers=_auth(tok))
        assert resp.status_code == 404

    def test_run_persists_predictions(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        # Count before
        before = len(client.get("/api/predictions", params={"city_id": seed_data["city_id"]}, headers=_auth(tok)).json())
        # Run predictions
        client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        # Count after — should have increased by 3 roads × 4 horizons = 12
        after = len(client.get("/api/predictions", params={"city_id": seed_data["city_id"]}, headers=_auth(tok)).json())
        assert after - before == 12

    def test_run_admin_can_access(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200


# ── Tests: GET /api/predictions ──────────────────────────────────────

class TestListPredictions:
    def test_list_returns_stored_predictions(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        # First run predictions to populate
        client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        resp = client.get("/api/predictions", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/predictions", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        for p in resp.json():
            assert p["city_id"] == seed_data["city_id"]

    def test_list_filter_by_road(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/predictions", params={"road_id": seed_data["r1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        for p in resp.json():
            assert p["road_id"] == seed_data["r1_id"]

    def test_list_prediction_has_required_fields(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/predictions", headers=_auth(tok))
        p = resp.json()[0]
        assert "id" in p
        assert "city_id" in p
        assert "road_id" in p
        assert "predicted_for" in p
        assert "predicted_avg_speed_kmph" in p
        assert "predicted_congestion_level" in p
        assert "model_name" in p
        assert "confidence_score" in p


# ── Tests: GET /api/predictions/{id} ─────────────────────────────────

class TestGetPrediction:
    def test_get_by_id_returns_prediction(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        # Run predictions first
        client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        # List to get an ID
        list_resp = client.get("/api/predictions", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        pred_id = list_resp.json()[0]["id"]
        # Get by ID
        resp = client.get(f"/api/predictions/{pred_id}", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == pred_id

    def test_get_by_id_not_found(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/predictions/999999", headers=_auth(tok))
        assert resp.status_code == 404


# ── Tests: deterministic logic ────────────────────────────────────────

class TestDeterministicLogic:
    def test_same_input_same_output(self, seed_data):
        """Running predictions twice with the same data produces identical results."""
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp1 = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        resp2 = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        # Compare the metric values (ignore stored IDs)
        for p1, p2 in zip(resp1.json(), resp2.json()):
            assert p1["road_id"] == p2["road_id"]
            assert p1["current"]["avg_speed_kmph"] == p2["current"]["avg_speed_kmph"]
            assert p1["horizon_60min"]["avg_speed_kmph"] == p2["horizon_60min"]["avg_speed_kmph"]
            assert p1["horizon_60min"]["queue_length_estimate"] == p2["horizon_60min"]["queue_length_estimate"]

    def test_gridlock_road_has_worse_predictions(self, seed_data):
        """A road with gridlock congestion should have worse predictions than moderate."""
        db = _TestSession()
        city = db.get(City, seed_data["city_id"])
        from app.models.road import Road as RoadModel
        gridlock_road = RoadModel(city=city, name="Gridlock Road", road_type="arterial", length_meters=1000, lanes=2)
        db.add(gridlock_road)
        db.flush()
        now = datetime.now(timezone.utc)
        rec = TrafficRecord(city=city, road=gridlock_road, timestamp=now, vehicle_count=200, avg_speed_kmph=5.0, congestion_level="gridlock")
        db.add(rec)
        db.commit()
        db.close()

        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/predictions/run", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        gridlock_pred = next(p for p in resp.json() if p["road_name"] == "Gridlock Road")
        moderate_road_pred = next(p for p in resp.json() if p["road_name"] == "JM Road")

        # Gridlock road should have lower speed and higher queue
        assert gridlock_pred["current"]["avg_speed_kmph"] < moderate_road_pred["current"]["avg_speed_kmph"]
        assert gridlock_pred["current"]["queue_length_estimate"] > moderate_road_pred["current"]["queue_length_estimate"]
