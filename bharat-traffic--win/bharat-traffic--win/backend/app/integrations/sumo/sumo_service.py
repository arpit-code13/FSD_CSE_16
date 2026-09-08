"""SumoService — wraps TraCI and sumolib to manage SUMO simulations.

This is the single point of contact between the BharatTrafficTwin backend
and the SUMO simulator.  All SUMO communication happens through this
service; the frontend never talks to SUMO directly.

Architecture:
  SumoService  ──TraCI──▶  SUMO subprocess (sumo / sumo-gui)

The service:
  1. Detects whether SUMO is installed (sumolib.checkBinary)
  2. Generates network/config XML from DB models (via sumo_network_builder)
  3. Starts SUMO as a subprocess via traci.start()
  4. Advances the simulation step-by-step via traci.simulationStep()
  5. Reads edge/vehicle data via TraCI getters
  6. Cleans up on stop (traci.close + temp file removal)

All traci / sumolib imports are DEFERRED to runtime so the rest of the
application loads cleanly when SUMO is absent.
"""

from __future__ import annotations

import os
import sys
import subprocess
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.logging_config import logger


# ── Custom exceptions ──────────────────────────────────────────────────

class SumoUnavailableError(Exception):
    """Raised when SUMO is not installed or SUMO_HOME is not set."""


class SumoSessionError(Exception):
    """Raised for session-related errors (not found, already stopped, etc.)."""


# ── Session state ──────────────────────────────────────────────────────

@dataclass
class _SimSession:
    """Internal representation of an active SUMO simulation session."""
    session_id: str
    city_id: int
    step_size: float
    total_steps: int
    current_step: int = 0
    status: str = "running"
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    config_path: str | None = None
    output_dir: str | None = None
    # TraCI connection object (stored as Any to avoid import at module level)
    _conn: Any = field(default=None, repr=False)
    _process: Any = field(default=None, repr=False)


# ── SUMO binary detection ─────────────────────────────────────────────

def _setup_sumo_path() -> None:
    """Ensure SUMO_HOME/tools is on sys.path for traci/sumolib imports."""
    sumo_home = settings.SUMO_HOME
    if sumo_home and os.path.isdir(sumo_home):
        tools_path = os.path.join(sumo_home, "tools")
        if tools_path not in sys.path:
            sys.path.insert(0, tools_path)


def _import_traci():
    """Import and return the traci module (deferred)."""
    _setup_sumo_path()
    try:
        import traci
        return traci
    except ImportError as e:
        raise SumoUnavailableError(
            "traci module not found. Install SUMO or run: pip install traci"
        ) from e


def _import_sumolib():
    """Import and return the sumolib module (deferred)."""
    _setup_sumo_path()
    try:
        import sumolib
        return sumolib
    except ImportError as e:
        raise SumoUnavailableError(
            "sumolib module not found. Install SUMO or run: pip install traci"
        ) from e


def _find_sumo_binary(use_gui: bool = False) -> str:
    """Find the SUMO binary path using sumolib or environment."""
    sumolib = _import_sumolib()
    binary_name = "sumo-gui" if use_gui else "sumo"
    try:
        return sumolib.checkBinary(binary_name)
    except Exception:
        pass

    # Fallback: check SUMO_HOME/bin
    sumo_home = settings.SUMO_HOME
    if sumo_home:
        candidate = os.path.join(sumo_home, "bin", binary_name)
        if os.path.isfile(candidate):
            return candidate

    raise SumoUnavailableError(
        f"SUMO binary '{binary_name}' not found. "
        f"Set SUMO_HOME environment variable or install SUMO."
    )


# ── Session registry ───────────────────────────────────────────────────

_sessions: dict[str, _SimSession] = {}


# ── Public API ─────────────────────────────────────────────────────────

class SumoService:
    """Manages SUMO simulation lifecycle via TraCI.

    All methods are instance methods; create one SumoService per
    application lifetime (or use a singleton).
    """

    @staticmethod
    def is_available() -> dict[str, Any]:
        """Check whether SUMO is installed and accessible.

        Returns a dict with:
          available: bool
          sumo_home: str | None
          sumo_version: str | None
          message: str
        """
        sumo_home = settings.SUMO_HOME
        if not sumo_home or not os.path.isdir(sumo_home):
            return {
                "available": False,
                "sumo_home": sumo_home,
                "sumo_version": None,
                "message": f"SUMO_HOME directory not found: {sumo_home}",
            }

        try:
            sumolib = _import_sumolib()
            binary = sumolib.checkBinary("sumo")
        except Exception as e:
            return {
                "available": False,
                "sumo_home": sumo_home,
                "sumo_version": None,
                "message": f"Cannot find SUMO binary: {e}",
            }

        # Try to get version
        version = None
        try:
            result = subprocess.run(
                [binary, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            # SUMO outputs version on stdout
            output = result.stdout.strip() or result.stderr.strip()
            if output:
                version = output.split("\n")[0][:100]
        except Exception:
            pass

        return {
            "available": True,
            "sumo_home": sumo_home,
            "sumo_version": version,
            "message": f"SUMO available at {binary}",
        }

    def start(
        self,
        db,
        city_id: int,
        duration_seconds: int = 3600,
        step_size: float = 1.0,
        use_gui: bool = False,
    ) -> dict[str, Any]:
        """Start a new SUMO simulation for a city.

        1. Generate SUMO network/config files from DB models
        2. Start SUMO subprocess via traci.start()
        3. Register the session

        Returns session metadata dict.

        Raises:
            SumoUnavailableError — if SUMO is not installed
            ValueError — if no data exists for the city
        """
        from app.services.sumo_network_builder import generate_sumo_network

        # Generate SUMO files from DB
        files = generate_sumo_network(db, city_id)

        # Find SUMO binary
        binary = _find_sumo_binary(use_gui=use_gui)

        # Build SUMO command
        sumo_cmd = [
            binary,
            "-c", files["config_path"],
            "--step-length", str(step_size),
            "--no-step-log",
            "--no-duration-log",
            "--no-connected-car",
            "--random",
        ]

        if not use_gui:
            sumo_cmd.append("--no-gui")

        # Start SUMO via TraCI
        traci = _import_traci()
        session_id = str(uuid.uuid4())

        try:
            conn = traci.start(sumo_cmd, label=session_id)
        except Exception as e:
            from app.services.sumo_network_builder import cleanup_sumo_files
            cleanup_sumo_files(files["output_dir"])
            raise SumoUnavailableError(
                f"Failed to start SUMO: {e}"
            ) from e

        total_steps = int(duration_seconds / step_size)

        session = _SimSession(
            session_id=session_id,
            city_id=city_id,
            step_size=step_size,
            total_steps=total_steps,
            current_step=0,
            status="running",
            config_path=files["config_path"],
            output_dir=files["output_dir"],
            _conn=conn,
        )
        _sessions[session_id] = session

        logger.info(
            "SUMO simulation started: session=%s city=%d steps=%d",
            session_id[:8],
            city_id,
            total_steps,
        )

        return {
            "session_id": session_id,
            "city_id": city_id,
            "status": session.status,
            "current_step": 0,
            "total_steps": total_steps,
            "step_size": step_size,
            "started_at": session.started_at.isoformat(),
            "config_path": session.config_path,
        }

    def step(self, session_id: str, num_steps: int = 1) -> dict[str, Any]:
        """Advance the simulation by num_steps.

        Returns edge data and summary for the current state.

        Raises:
            SumoSessionError — if session not found or not running
        """
        session = self._get_session(session_id)

        if session.status != "running":
            raise SumoSessionError(
                f"Session {session_id[:8]} is {session.status}, not running"
            )

        traci = _import_traci()
        conn = session._conn

        try:
            for _ in range(num_steps):
                if session.current_step >= session.total_steps:
                    session.status = "stopped"
                    break
                conn.simulationStep()
                session.current_step += 1
        except Exception as e:
            session.status = "stopped"
            logger.error("SUMO step error: %s", e)
            raise SumoSessionError(f"Simulation step failed: {e}") from e

        # Check if simulation ended naturally
        try:
            if conn.simulation.getMinExpectedNumber() == 0:
                session.status = "stopped"
        except Exception:
            pass

        # Collect edge data
        edge_data = self._get_edge_data(session)
        total_vehicles = sum(e["vehicles"] for e in edge_data)
        mean_speed = (
            sum(e["mean_speed"] for e in edge_data) / len(edge_data)
            if edge_data
            else 0.0
        )

        return {
            "session_id": session_id,
            "current_step": session.current_step,
            "total_vehicles": total_vehicles,
            "mean_speed": round(mean_speed, 2),
            "edges": edge_data,
            "status": session.status,
        }

    def stop(self, session_id: str) -> None:
        """Stop the simulation and clean up resources."""
        session = self._get_session(session_id)

        if session.status == "stopped":
            # Already stopped, just clean files
            self._cleanup(session)
            return

        try:
            traci = _import_traci()
            # Try to close via the connection's close method
            if session._conn:
                session._conn.close()
        except Exception as e:
            logger.warning("Error closing TraCI connection: %s", e)
        finally:
            session.status = "stopped"
            session._conn = None
            self._cleanup(session)

        logger.info("SUMO simulation stopped: session=%s", session_id[:8])

    def get_status(self, session_id: str) -> dict[str, Any]:
        """Get current simulation status."""
        session = self._get_session(session_id)
        return {
            "session_id": session.session_id,
            "city_id": session.city_id,
            "status": session.status,
            "current_step": session.current_step,
            "total_steps": session.total_steps,
            "step_size": session.step_size,
            "started_at": session.started_at.isoformat(),
            "config_path": session.config_path,
        }

    def get_edge_data(self, session_id: str) -> list[dict[str, Any]]:
        """Get current edge (road segment) traffic data."""
        session = self._get_session(session_id)
        return self._get_edge_data(session)

    def get_vehicle_data(self, session_id: str) -> list[dict[str, Any]]:
        """Get current vehicle data from the simulation."""
        session = self._get_session(session_id)
        return self._get_vehicle_data(session)

    # ── Internal helpers ───────────────────────────────────────────────

    def _get_session(self, session_id: str) -> _SimSession:
        """Retrieve a session or raise."""
        session = _sessions.get(session_id)
        if session is None:
            raise SumoSessionError(f"Session {session_id[:8]}... not found")
        return session

    def _get_edge_data(self, session: _SimSession) -> list[dict[str, Any]]:
        """Read edge data from the running simulation via TraCI."""
        conn = session._conn
        if conn is None:
            return []

        try:
            edge_ids = conn.lane.getIDList()
        except Exception:
            return []

        edges = []
        for edge_id in edge_ids:
            try:
                vehicles = conn.lane.getLastStepVehicleNumber(edge_id)
                mean_speed = conn.lane.getLastStepMeanSpeed(edge_id)
                occupancy = conn.lane.getLastStepOccupancy(edge_id)
                waiting_time = conn.lane.getWaitingTime(edge_id)
                travel_time = conn.lane.getTraveltime(edge_id)

                edges.append({
                    "edge_id": edge_id,
                    "vehicles": vehicles,
                    "mean_speed": round(mean_speed, 2),
                    "occupancy": round(occupancy, 4),
                    "waiting_time": round(waiting_time, 2),
                    "travel_time": round(travel_time, 2),
                })
            except Exception:
                continue

        return edges

    def _get_vehicle_data(self, session: _SimSession) -> list[dict[str, Any]]:
        """Read vehicle data from the running simulation via TraCI."""
        conn = session._conn
        if conn is None:
            return []

        try:
            vehicle_ids = conn.vehicle.getIDList()
        except Exception:
            return []

        vehicles = []
        for veh_id in vehicle_ids:
            try:
                speed = conn.vehicle.getSpeed(veh_id)
                position = conn.vehicle.getLanePosition(veh_id)
                edge_id = conn.vehicle.getRoadID(veh_id)
                type_id = conn.vehicle.getTypeID(veh_id)
                route_id = conn.vehicle.getRouteID(veh_id)

                vehicles.append({
                    "vehicle_id": veh_id,
                    "speed": round(speed, 2),
                    "position": round(position, 2),
                    "edge_id": edge_id,
                    "type_id": type_id,
                    "route_id": route_id if route_id else None,
                })
            except Exception:
                continue

        return vehicles

    def _cleanup(self, session: _SimSession) -> None:
        """Remove temporary SUMO files."""
        if session.output_dir:
            from app.services.sumo_network_builder import cleanup_sumo_files
            cleanup_sumo_files(session.output_dir)
            session.output_dir = None


# ── Module-level singleton ─────────────────────────────────────────────

sumo_service = SumoService()
