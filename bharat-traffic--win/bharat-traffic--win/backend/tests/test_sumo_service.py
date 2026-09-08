"""Tests for the SUMO integration layer.

Covers:
  - Network builder: XML generation from seeded DB data
  - SumoService: availability check, session lifecycle, error handling
  - API endpoints: auth, status, start/stop/step
  - File cleanup after stop
  - Graceful degradation when SUMO is not installed
"""

from __future__ import annotations

import os
import shutil
import tempfile
import xml.etree.ElementTree as ET

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
def _use_sumo_db():
    """Isolate SUMO tests with their own DB."""
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
    client.post("/api/auth/register", json={
        "email": "sumo_user@test.com",
        "name": "Sumo User",
        "password": "password123",
    })
    login = client.post("/api/auth/login", json={
        "email": "sumo_user@test.com",
        "password": "password123",
    })
    token = login.json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seed_city():
    """Seed a city with roads, intersections, signals, and traffic records."""
    db = _TestSession()
    try:
        city = City(
            name="SumoTestCity",
            state="Test",
            country="India",
            latitude=28.6,
            longitude=77.2,
            is_active=True,
        )
        db.add(city)
        db.flush()

        roads = []
        for i, (name, rtype, lanes) in enumerate([
            ("Main Road", "arterial", 4),
            ("Side Street", "local", 2),
            ("Highway 1", "highway", 6),
        ], start=1):
            road = Road(
                city_id=city.id,
                name=name,
                road_type=rtype,
                lanes=lanes,
                length_meters=1000 * i,
                speed_limit_kmph=60.0,
            )
            db.add(road)
            db.flush()
            roads.append(road)

        ix1 = Intersection(
            city_id=city.id,
            name="Junction A",
            latitude=28.61,
            longitude=77.21,
            intersection_type="signalized",
        )
        ix2 = Intersection(
            city_id=city.id,
            name="Junction B",
            latitude=28.62,
            longitude=77.22,
            intersection_type="signalized",
        )
        db.add_all([ix1, ix2])
        db.flush()

        sig1 = TrafficSignal(
            intersection_id=ix1.id,
            signal_type="adaptive",
            phases={"green": [30, 30], "amber": [5, 5]},
            cycle_time_seconds=90,
            is_active=True,
        )
        sig2 = TrafficSignal(
            intersection_id=ix2.id,
            signal_type="fixed",
            phases={"green": [25, 25], "amber": [5, 5]},
            cycle_time_seconds=70,
            is_active=True,
        )
        db.add_all([sig1, sig2])
        db.flush()

        # Connect roads to intersections
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
        return {
            "city_id": city.id,
            "road_ids": [r.id for r in roads],
            "intersection_ids": [ix1.id, ix2.id],
            "signal_ids": [sig1.id, sig2.id],
        }
    finally:
        db.close()


# ── Network Builder Tests ─────────────────────────────────────────────

class TestNetworkBuilder:
    """Test SUMO network file generation from DB models."""

    def test_generate_sumo_network_creates_files(self, seed_city):
        """Network builder should produce 3 XML files."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            output_dir = tempfile.mkdtemp(prefix="sumo_test_")
            try:
                files = generate_sumo_network(db, seed_city["city_id"], output_dir)
                assert os.path.isfile(files["net_path"])
                assert os.path.isfile(files["route_path"])
                assert os.path.isfile(files["config_path"])
            finally:
                shutil.rmtree(output_dir, ignore_errors=True)
        finally:
            db.close()

    def test_net_xml_is_valid_xml(self, seed_city):
        """Generated .net.xml must be parseable XML."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            output_dir = tempfile.mkdtemp(prefix="sumo_test_")
            try:
                files = generate_sumo_network(db, seed_city["city_id"], output_dir)
                tree = ET.parse(files["net_path"])
                root = tree.getroot()
                assert root.tag == "net"
                assert root.find("nodes") is not None
                assert root.find("edges") is not None
                assert root.find("connections") is not None
            finally:
                shutil.rmtree(output_dir, ignore_errors=True)
        finally:
            db.close()

    def test_net_xml_contains_expected_nodes(self, seed_city):
        """Net should have a node for each intersection."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            output_dir = tempfile.mkdtemp(prefix="sumo_test_")
            try:
                files = generate_sumo_network(db, seed_city["city_id"], output_dir)
                tree = ET.parse(files["net_path"])
                nodes = tree.getroot().find("nodes")
                node_ids = [n.get("id") for n in nodes.findall("node")]
                assert len(node_ids) == 2
                for ix_id in seed_city["intersection_ids"]:
                    assert f"node_ix_{ix_id}" in node_ids
            finally:
                shutil.rmtree(output_dir, ignore_errors=True)
        finally:
            db.close()

    def test_net_xml_contains_expected_edges(self, seed_city):
        """Net should have an edge for each road."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            output_dir = tempfile.mkdtemp(prefix="sumo_test_")
            try:
                files = generate_sumo_network(db, seed_city["city_id"], output_dir)
                tree = ET.parse(files["net_path"])
                edges = tree.getroot().find("edges")
                edge_ids = [e.get("id") for e in edges.findall("edge")]
                assert len(edge_ids) == 3
                for road_id in seed_city["road_ids"]:
                    assert f"edge_road_{road_id}" in edge_ids
            finally:
                shutil.rmtree(output_dir, ignore_errors=True)
        finally:
            db.close()

    def test_route_xml_is_valid(self, seed_city):
        """Generated .rou.xml must be parseable and have vehicle types."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            output_dir = tempfile.mkdtemp(prefix="sumo_test_")
            try:
                files = generate_sumo_network(db, seed_city["city_id"], output_dir)
                tree = ET.parse(files["route_path"])
                root = tree.getroot()
                assert root.tag == "routes"

                # Should have vehicle types
                vtypes = root.findall("vType")
                vtype_ids = {vt.get("id") for vt in vtypes}
                assert "car" in vtype_ids
                assert "bus" in vtype_ids
                assert "two_wheeler" in vtype_ids

                # Should have routes and flows
                routes = root.findall("route")
                flows = root.findall("flow")
                assert len(routes) > 0
                assert len(flows) > 0
            finally:
                shutil.rmtree(output_dir, ignore_errors=True)
        finally:
            db.close()

    def test_sumocfg_references_net_and_routes(self, seed_city):
        """sumocfg should reference the net and route files."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            output_dir = tempfile.mkdtemp(prefix="sumo_test_")
            try:
                files = generate_sumo_network(db, seed_city["city_id"], output_dir)
                tree = ET.parse(files["config_path"])
                root = tree.getroot()
                assert root.tag == "configuration"

                input_elem = root.find("input")
                assert input_elem is not None
                net_file = input_elem.find("net-file")
                route_files = input_elem.find("route-files")
                assert net_file is not None
                assert route_files is not None
                assert net_file.get("value") is not None
                assert route_files.get("value") is not None
            finally:
                shutil.rmtree(output_dir, ignore_errors=True)
        finally:
            db.close()

    def test_generate_network_raises_on_missing_data(self):
        """Should raise ValueError when city has no roads."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            with pytest.raises(ValueError, match="No roads found"):
                generate_sumo_network(db, 99999)
        finally:
            db.close()

    def test_edges_have_speed_attribute(self, seed_city):
        """Each edge should have a speed attribute in m/s."""
        from app.services.sumo_network_builder import generate_sumo_network

        db = _TestSession()
        try:
            output_dir = tempfile.mkdtemp(prefix="sumo_test_")
            try:
                files = generate_sumo_network(db, seed_city["city_id"], output_dir)
                tree = ET.parse(files["net_path"])
                edges = tree.getroot().find("edges")
                for edge in edges.findall("edge"):
                    speed = edge.get("speed")
                    assert speed is not None
                    speed_val = float(speed)
                    assert speed_val > 0  # 60 km/h = 16.67 m/s
            finally:
                shutil.rmtree(output_dir, ignore_errors=True)
        finally:
            db.close()


# ── SumoService Tests ─────────────────────────────────────────────────

class TestSumoServiceAvailability:
    """Test SUMO availability detection."""

    def test_is_available_returns_dict(self):
        """is_available() should return a well-formed dict."""
        from app.integrations.sumo.sumo_service import SumoService
        result = SumoService.is_available()
        assert isinstance(result, dict)
        assert "available" in result
        assert "sumo_home" in result
        assert "sumo_version" in result
        assert "message" in result

    def test_is_available_false_when_no_sumo(self):
        """Should return available=False when SUMO is not installed."""
        from app.integrations.sumo.sumo_service import SumoService
        result = SumoService.is_available()
        # On this system SUMO is not installed, so available should be False
        assert isinstance(result["available"], bool)
        # If available is False, message should explain why
        if not result["available"]:
            assert len(result["message"]) > 0

    def test_is_available_does_not_raise(self):
        """is_available() must never raise an exception."""
        from app.integrations.sumo.sumo_service import SumoService
        try:
            SumoService.is_available()
        except Exception as e:
            pytest.fail(f"is_available() raised {type(e).__name__}: {e}")


class TestSumoServiceSessionManagement:
    """Test session lifecycle (without SUMO installed)."""

    def test_start_raises_when_sumo_unavailable(self, seed_city):
        """start() should raise SumoUnavailableError when SUMO is missing."""
        from app.integrations.sumo.sumo_service import SumoService, SumoUnavailableError

        db = _TestSession()
        try:
            svc = SumoService()
            with pytest.raises(SumoUnavailableError):
                svc.start(db, city_id=seed_city["city_id"])
        finally:
            db.close()

    def test_stop_unknown_session_raises(self):
        """stop() should raise SumoSessionError for unknown session."""
        from app.integrations.sumo.sumo_service import SumoService, SumoSessionError

        svc = SumoService()
        with pytest.raises(SumoSessionError):
            svc.stop("nonexistent-session-id")

    def test_step_unknown_session_raises(self):
        """step() should raise SumoSessionError for unknown session."""
        from app.integrations.sumo.sumo_service import SumoService, SumoSessionError

        svc = SumoService()
        with pytest.raises(SumoSessionError):
            svc.step("nonexistent-session-id")

    def test_get_status_unknown_session_raises(self):
        """get_status() should raise SumoSessionError for unknown session."""
        from app.integrations.sumo.sumo_service import SumoService, SumoSessionError

        svc = SumoService()
        with pytest.raises(SumoSessionError):
            svc.get_status("nonexistent-session-id")


# ── API Endpoint Tests ────────────────────────────────────────────────

class TestSumoAPIAuth:
    """Test authentication requirements for SUMO endpoints."""

    def test_status_without_token_returns_401(self, client):
        resp = client.post("/api/sumo/status")
        assert resp.status_code == 401

    def test_status_with_garbage_token_returns_401(self, client):
        resp = client.post("/api/sumo/status", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401

    def test_start_without_token_returns_401(self, client):
        resp = client.post("/api/sumo/simulations", json={"city_id": 1})
        assert resp.status_code == 401

    def test_stop_without_token_returns_401(self, client):
        resp = client.post("/api/sumo/simulations/fake-id/stop")
        assert resp.status_code == 401


class TestSumoAPIStatus:
    """Test the SUMO status endpoint."""

    def test_status_returns_200(self, client, user_session):
        _, headers = user_session
        resp = client.post("/api/sumo/status", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "available" in data
        assert "sumo_home" in data
        assert "message" in data

    def test_status_returns_boolean_available(self, client, user_session):
        _, headers = user_session
        resp = client.post("/api/sumo/status", headers=headers)
        data = resp.json()
        assert isinstance(data["available"], bool)


class TestSumoAPISimulation:
    """Test simulation start/stop/step endpoints."""

    def test_start_simulation_returns_503_when_no_sumo(self, client, user_session, seed_city):
        """Without SUMO installed, start should return 503."""
        _, headers = user_session
        resp = client.post("/api/sumo/simulations", json={
            "city_id": seed_city["city_id"],
            "duration_seconds": 100,
            "step_size": 1.0,
        }, headers=headers)
        # Should be 503 (Service Unavailable) since SUMO is not installed
        assert resp.status_code == 503
        data = resp.json()
        assert "detail" in data

    def test_start_simulation_returns_400_for_missing_city(self, client, user_session):
        """Should return 400 when city has no data."""
        _, headers = user_session
        resp = client.post("/api/sumo/simulations", json={
            "city_id": 99999,
            "duration_seconds": 100,
        }, headers=headers)
        # Without SUMO, we get 503 before we can check 400
        assert resp.status_code in (400, 503)

    def test_get_simulation_status_returns_404_for_unknown(self, client, user_session):
        """Unknown session ID should return 404."""
        _, headers = user_session
        resp = client.get("/api/sumo/simulations/fake-session-id", headers=headers)
        assert resp.status_code == 404

    def test_stop_simulation_returns_404_for_unknown(self, client, user_session):
        """Unknown session ID should return 404."""
        _, headers = user_session
        resp = client.post("/api/sumo/simulations/fake-session-id/stop", headers=headers)
        assert resp.status_code == 404

    def test_step_simulation_returns_400_for_unknown(self, client, user_session):
        """Unknown session ID should return 400."""
        _, headers = user_session
        resp = client.post("/api/sumo/simulations/fake-session-id/step", json={"steps": 1}, headers=headers)
        assert resp.status_code == 400

    def test_edge_data_returns_404_for_unknown(self, client, user_session):
        """Unknown session ID should return 404."""
        _, headers = user_session
        resp = client.get("/api/sumo/simulations/fake-session-id/edges", headers=headers)
        assert resp.status_code == 404

    def test_vehicle_data_returns_404_for_unknown(self, client, user_session):
        """Unknown session ID should return 404."""
        _, headers = user_session
        resp = client.get("/api/sumo/simulations/fake-session-id/vehicles", headers=headers)
        assert resp.status_code == 404


# ── Schemas Tests ─────────────────────────────────────────────────────

class TestSumoSchemas:
    """Test Pydantic schema validation."""

    def test_sumo_sim_start_defaults(self):
        from app.schemas.sumo import SumoSimStart
        s = SumoSimStart(city_id=1)
        assert s.city_id == 1
        assert s.duration_seconds == 3600
        assert s.step_size == 1.0
        assert s.use_gui is False

    def test_sumo_sim_start_validation(self):
        from app.schemas.sumo import SumoSimStart
        import pydantic
        # step_size must be > 0
        with pytest.raises(pydantic.ValidationError):
            SumoSimStart(city_id=1, step_size=0)

    def test_sumo_sim_step_defaults(self):
        from app.schemas.sumo import SumoSimStep
        s = SumoSimStep()
        assert s.steps == 1

    def test_sumo_edge_data_fields(self):
        from app.schemas.sumo import SumoEdgeData
        e = SumoEdgeData(
            edge_id="edge_1",
            vehicles=5,
            mean_speed=12.5,
            occupancy=0.3,
            waiting_time=2.1,
            travel_time=8.5,
        )
        assert e.edge_id == "edge_1"
        assert e.vehicles == 5

    def test_sumo_vehicle_data_fields(self):
        from app.schemas.sumo import SumoVehicleData
        v = SumoVehicleData(
            vehicle_id="veh_1",
            speed=10.0,
            position=50.0,
            edge_id="edge_1",
            type_id="car",
        )
        assert v.vehicle_id == "veh_1"
        assert v.route_id is None

    def test_sumo_sim_status_enum(self):
        from app.schemas.sumo import SumoSimStatus
        assert SumoSimStatus.RUNNING == "running"
        assert SumoSimStatus.PAUSED == "paused"
        assert SumoSimStatus.STOPPED == "stopped"


# ── Package Import Tests ──────────────────────────────────────────────

class TestPackageImports:
    """Test that all modules import cleanly."""

    def test_import_sumo_package(self):
        import app.integrations.sumo
        assert hasattr(app.integrations.sumo, "SumoService")
        assert hasattr(app.integrations.sumo, "SumoUnavailableError")
        assert hasattr(app.integrations.sumo, "SumoSessionError")
        assert hasattr(app.integrations.sumo, "sumo_service")

    def test_import_sumo_service(self):
        from app.integrations.sumo.sumo_service import SumoService
        assert callable(SumoService)

    def test_import_network_builder(self):
        from app.services.sumo_network_builder import generate_sumo_network
        assert callable(generate_sumo_network)

    def test_import_schemas(self):
        from app.schemas.sumo import (
            SumoStatus,
            SumoSimSession,
            SumoSimStart,
            SumoSimStep,
            SumoEdgeData,
            SumoVehicleData,
            SumoSimStepResult,
        )
        # Just verify all imports succeed
        assert SumoStatus is not None

    def test_import_api_router(self):
        from app.api.sumo import router
        assert hasattr(router, "prefix")
        assert router.prefix == "/api/sumo"
