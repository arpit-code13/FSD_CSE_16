"""Stage 27 — Signal Optimisation endpoint integration tests.

Exercises GET /api/signals, POST /api/signals/optimize,
POST /api/signals/optimization/{id}/simulate,
POST /api/signals/optimization/{id}/approve.

All signal endpoints require a valid JWT.  Optimisation requires ADMIN.
Approval is manual — only an explicit approve call changes status.
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
from app.models.signal_optimization import SignalOptimization
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
    """Seed cities, roads, intersections, signals, and traffic records."""
    db = _TestSession()

    # ── Users ─────────────────────────────────────────────────────
    user = User(email="user@sig27.com", name="U", password_hash="$2b$dummy", role=UserRole.USER)
    admin = User(email="admin@sig27.com", name="A", password_hash="$2b$dummy", role=UserRole.ADMIN)
    db.add_all([user, admin])
    db.flush()

    # ── City ──────────────────────────────────────────────────────
    city = City(name="Pune", state="Maharashtra", country="India", latitude=18.52, longitude=73.85, is_active=True)
    db.add(city)
    db.flush()

    # ── Roads ─────────────────────────────────────────────────────
    r1 = Road(city=city, name="FC Road", road_type="arterial", length_meters=2500, lanes=4, speed_limit_kmph=50)
    r2 = Road(city=city, name="JM Road", road_type="arterial", length_meters=1800, lanes=3, speed_limit_kmph=40)
    db.add_all([r1, r2])
    db.flush()

    # ── Intersections ─────────────────────────────────────────────
    ix1 = Intersection(city=city, name="Sancheti Signal", latitude=18.53, longitude=73.84, intersection_type="signalized")
    ix1.roads.extend([r1, r2])
    ix2 = Intersection(city=city, name="Deccan Bus Stop", latitude=18.51, longitude=73.83, intersection_type="signalized")
    ix2.roads.append(r1)
    db.add_all([ix1, ix2])
    db.flush()

    # ── Signals ───────────────────────────────────────────────────
    sig1 = TrafficSignal(intersection=ix1, signal_type="adaptive", phases={"green": [30, 45], "amber": [5, 5]}, cycle_time_seconds=90, is_active=True)
    sig2 = TrafficSignal(intersection=ix2, signal_type="fixed", phases={"green": [40], "amber": [5]}, cycle_time_seconds=50, is_active=True)
    db.add_all([sig1, sig2])
    db.flush()

    # ── Traffic records ───────────────────────────────────────────
    now = datetime.now(timezone.utc)
    rec1 = TrafficRecord(city=city, road=r1, timestamp=now, vehicle_count=120, avg_speed_kmph=22.5, congestion_level="congested")
    rec2 = TrafficRecord(city=city, road=r2, timestamp=now, vehicle_count=80, avg_speed_kmph=35.0, congestion_level="moderate")
    db.add_all([rec1, rec2])
    db.commit()

    ids = {
        "user_id": user.id,
        "admin_id": admin.id,
        "city_id": city.id,
        "r1_id": r1.id,
        "r2_id": r2.id,
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

class TestSignalAuth:
    def test_list_requires_token(self):
        assert client.get("/api/signals").status_code == 401

    def test_optimize_requires_admin(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/signals/optimize", params={"signal_id": 1}, headers=_auth(tok))
        assert resp.status_code == 403

    def test_simulate_requires_token(self):
        assert client.post("/api/signals/optimization/1/simulate").status_code == 401

    def test_approve_requires_admin(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/signals/optimization/1/approve", headers=_auth(tok))
        assert resp.status_code == 403


# ── Tests: GET /api/signals ──────────────────────────────────────────

class TestListSignals:
    def test_list_returns_signals(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/signals", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_list_has_required_fields(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/signals", headers=_auth(tok))
        for sig in resp.json():
            assert "id" in sig
            assert "intersection_id" in sig
            assert "intersection_name" in sig
            assert "city_id" in sig
            assert "signal_type" in sig
            assert "cycle_time_seconds" in sig
            assert "phases" in sig
            assert "is_active" in sig
            assert "has_pending_optimization" in sig

    def test_list_filter_by_city(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/signals", params={"city_id": seed_data["city_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_list_no_pending_initially(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.get("/api/signals", headers=_auth(tok))
        for sig in resp.json():
            assert sig["has_pending_optimization"] is False


# ── Tests: POST /api/signals/optimize ────────────────────────────────

class TestOptimizeSignal:
    def test_optimize_returns_record(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["signal_id"] == seed_data["sig1_id"]
        assert data["approval_status"] == "pending"

    def test_optimize_has_current_timing(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        ct = resp.json()["current_timing"]
        assert ct is not None
        assert "phases" in ct
        assert "cycle_time_seconds" in ct
        assert ct["cycle_time_seconds"] == 90

    def test_optimize_has_recommended_timing(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        rt = resp.json()["recommended_timing"]
        assert rt is not None
        assert "phases" in rt
        assert "cycle_time_seconds" in rt

    def test_optimize_has_predicted_impact(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        impact = resp.json()["predicted_impact"]
        assert impact is not None
        assert "speed_improvement_pct" in impact
        assert "queue_reduction_pct" in impact
        assert "wait_time_reduction_pct" in impact
        assert "confidence_score" in impact

    def test_optimize_congested_signal_extends_green(self, seed_data):
        """A signal at a congested intersection should get longer green phases."""
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        data = resp.json()
        current_greens = data["current_timing"]["phases"]["green"]
        recommended_greens = data["recommended_timing"]["phases"]["green"]
        # At least one green phase should be extended
        assert any(
            recommended_greens[i] > current_greens[i]
            for i in range(min(len(current_greens), len(recommended_greens)))
        )

    def test_optimize_increases_cycle_for_congested(self, seed_data):
        """Congested signal should get a longer cycle time."""
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        data = resp.json()
        assert data["recommended_timing"]["cycle_time_seconds"] > data["current_timing"]["cycle_time_seconds"]

    def test_optimize_signal_not_found(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimize", params={"signal_id": 999999}, headers=_auth(tok))
        assert resp.status_code == 404

    def test_optimize_sets_pending_status(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        # Check via list that the signal now has pending
        resp = client.get("/api/signals", headers=_auth(tok))
        sig = next(s for s in resp.json() if s["id"] == seed_data["sig1_id"])
        assert sig["has_pending_optimization"] is True


# ── Tests: POST /api/signals/optimization/{id}/simulate ──────────────

class TestSimulateOptimisation:
    def test_simulate_returns_result(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        # Create an optimisation first
        admin_tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(admin_tok))
        opt_id = opt_resp.json()["id"]
        # Simulate
        resp = client.post(f"/api/signals/optimization/{opt_id}/simulate", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["optimization_id"] == opt_id
        assert data["status"] == "simulated"

    def test_simulate_has_impact(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        admin_tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(admin_tok))
        opt_id = opt_resp.json()["id"]
        resp = client.post(f"/api/signals/optimization/{opt_id}/simulate", headers=_auth(tok))
        impact = resp.json()["simulated_impact"]
        assert "speed_improvement_pct" in impact
        assert "queue_reduction_pct" in impact
        assert "wait_time_reduction_pct" in impact

    def test_simulate_has_notes(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        admin_tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(admin_tok))
        opt_id = opt_resp.json()["id"]
        resp = client.post(f"/api/signals/optimization/{opt_id}/simulate", headers=_auth(tok))
        assert len(resp.json()["simulation_notes"]) > 0

    def test_simulate_not_found(self, seed_data):
        tok = _token(seed_data["user_id"], UserRole.USER)
        resp = client.post("/api/signals/optimization/999999/simulate", headers=_auth(tok))
        assert resp.status_code == 404

    def test_simulate_rejected_optimization_fails(self, seed_data):
        """Cannot simulate a non-pending optimisation."""
        tok = _token(seed_data["user_id"], UserRole.USER)
        admin_tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        # Create and approve
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig2_id"]}, headers=_auth(admin_tok))
        opt_id = opt_resp.json()["id"]
        client.post(f"/api/signals/optimization/{opt_id}/approve", headers=_auth(admin_tok))
        # Try to simulate
        resp = client.post(f"/api/signals/optimization/{opt_id}/simulate", headers=_auth(tok))
        assert resp.status_code == 404


# ── Tests: POST /api/signals/optimization/{id}/approve ───────────────

class TestApproveOptimisation:
    def test_approve_sets_status(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        opt_id = opt_resp.json()["id"]
        resp = client.post(f"/api/signals/optimization/{opt_id}/approve", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["approval_status"] == "approved"
        assert data["approved_by"] == seed_data["admin_id"]
        assert data["approved_at"] is not None

    def test_approve_sets_message(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig2_id"]}, headers=_auth(tok))
        opt_id = opt_resp.json()["id"]
        resp = client.post(f"/api/signals/optimization/{opt_id}/approve", headers=_auth(tok))
        assert "message" in resp.json()
        assert "approved" in resp.json()["message"].lower()

    def test_approve_not_found(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp = client.post("/api/signals/optimization/999999/approve", headers=_auth(tok))
        assert resp.status_code == 404

    def test_approve_already_approved_fails(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        # Create a fresh signal + optimisation
        db = _TestSession()
        city = db.get(City, seed_data["city_id"])
        from app.models.road import Road as RoadModel
        from app.models.intersection import Intersection as IxModel
        from app.models.traffic_signal import TrafficSignal as SigModel
        new_ix = IxModel(city=city, name="New IX", latitude=18.50, longitude=73.82, intersection_type="signalized")
        db.add(new_ix)
        db.flush()
        new_sig = SigModel(intersection=new_ix, signal_type="fixed", phases={"green": [30]}, cycle_time_seconds=60, is_active=True)
        db.add(new_sig)
        db.commit()
        db.refresh(new_sig)
        sig_id = new_sig.id
        db.close()

        # Optimise and approve
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": sig_id}, headers=_auth(tok))
        opt_id = opt_resp.json()["id"]
        client.post(f"/api/signals/optimization/{opt_id}/approve", headers=_auth(tok))
        # Try to approve again
        resp = client.post(f"/api/signals/optimization/{opt_id}/approve", headers=_auth(tok))
        assert resp.status_code == 409

    def test_approve_removes_pending_from_list(self, seed_data):
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        # Create a fresh signal
        db = _TestSession()
        city = db.get(City, seed_data["city_id"])
        from app.models.intersection import Intersection as IxModel
        from app.models.traffic_signal import TrafficSignal as SigModel
        new_ix = IxModel(city=city, name="Approve Test IX", latitude=18.49, longitude=73.81, intersection_type="signalized")
        db.add(new_ix)
        db.flush()
        new_sig = SigModel(intersection=new_ix, signal_type="fixed", phases={"green": [25]}, cycle_time_seconds=55, is_active=True)
        db.add(new_sig)
        db.commit()
        db.refresh(new_sig)
        sig_id = new_sig.id
        db.close()

        # Optimise once
        opt_resp = client.post("/api/signals/optimize", params={"signal_id": sig_id}, headers=_auth(tok))
        opt_id = opt_resp.json()["id"]
        # Check pending
        list_resp = client.get("/api/signals", headers=_auth(tok))
        sig_before = next(s for s in list_resp.json() if s["id"] == sig_id)
        assert sig_before["has_pending_optimization"] is True

        # Approve
        client.post(f"/api/signals/optimization/{opt_id}/approve", headers=_auth(tok))

        # Check no longer pending
        list_resp2 = client.get("/api/signals", headers=_auth(tok))
        sig_after = next(s for s in list_resp2.json() if s["id"] == sig_id)
        assert sig_after["has_pending_optimization"] is False


# ── Tests: deterministic logic ────────────────────────────────────────

class TestDeterministicLogic:
    def test_same_signal_same_optimization(self, seed_data):
        """Running optimisation twice on the same signal with same data produces identical results."""
        tok = _token(seed_data["admin_id"], UserRole.ADMIN)
        resp1 = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        resp2 = client.post("/api/signals/optimize", params={"signal_id": seed_data["sig1_id"]}, headers=_auth(tok))
        assert resp1.json()["recommended_timing"] == resp2.json()["recommended_timing"]
        assert resp1.json()["predicted_impact"] == resp2.json()["predicted_impact"]
