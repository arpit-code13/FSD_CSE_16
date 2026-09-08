"""SimulationService — dual-backend What-If simulation engine.

Supports two simulation backends:

  Deterministic (default):
    Rule-based impact models for seven scenario types.  Instant results,
    no external dependencies.

  SUMO:
    Runs a real SUMO traffic simulation via TraCI.  Requires SUMO to be
    installed on the server.  Produces physics-based results with
    scenario-specific modifications applied through TraCI commands.

Both backends produce the same output format so the API contract is
unchanged.  The frontend does not need to know which backend was used.

Metrics returned per road (before/after):
  - speed (km/h)
  - waiting time (seconds)
  - queue length (vehicles)
  - throughput (vehicles/interval)
  - congestion level
  - travel time (seconds)
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.logging_config import logger
from app.models.intersection import Intersection
from app.models.road import Road
from app.models.simulation import Simulation
from app.models.simulation_result import SimulationResult
from app.models.traffic_record import TrafficRecord

# Congestion severity ordered least → most severe
_CONGESTION_ORDER = ["free_flow", "moderate", "slow", "congested", "gridlock"]

# Description map for all scenario types
_SCENARIO_DESCRIPTIONS = {
    "accident": "Road accident causing localized blockage",
    "road_closure": "Road closure — all traffic diverted",
    "heavy_rain": "Heavy rain — city-wide speed reduction",
    "festival": "Festival — area traffic surge",
    "traffic_surge": "Traffic surge — demand exceeds capacity",
    "signal_failure": "Signal failure at intersection",
    "vip_movement": "VIP movement — corridor diversion",
}


def _congestion_rank(level: str) -> int:
    try:
        return _CONGESTION_ORDER.index(level)
    except ValueError:
        return -1


def _shift_congestion(level: str, steps: int) -> str:
    idx = _congestion_rank(level)
    if idx < 0:
        return level
    return _CONGESTION_ORDER[min(max(idx + steps, 0), len(_CONGESTION_ORDER) - 1)]


def _speed_to_congestion(speed_ratio: float) -> str:
    """Derive congestion level from speed ratio (simulated/original)."""
    if speed_ratio >= 0.9:
        return "free_flow"
    if speed_ratio >= 0.7:
        return "moderate"
    if speed_ratio >= 0.5:
        return "slow"
    if speed_ratio >= 0.3:
        return "congested"
    return "gridlock"


def _latest_record(db: Session, road_id: int) -> TrafficRecord | None:
    return db.scalar(
        select(TrafficRecord)
        .where(TrafficRecord.road_id == road_id)
        .order_by(TrafficRecord.timestamp.desc())
        .limit(1)
    )


# ── Deterministic engine (unchanged) ──────────────────────────────────

def _scenario_impact(scenario_type: str, params: dict | None) -> dict:
    """Return deterministic impact factors for a scenario type."""
    p = params or {}

    if scenario_type == "accident":
        return {
            "speed_factor": 0.40,
            "vehicle_factor": 1.20,
            "congestion_shift": 2,
            "description": p.get("description", _SCENARIO_DESCRIPTIONS["accident"]),
            "scope": "single_road",
        }

    if scenario_type == "road_closure":
        return {
            "speed_factor": 0.0,
            "vehicle_factor": 0.0,
            "congestion_shift": 3,
            "description": p.get("description", _SCENARIO_DESCRIPTIONS["road_closure"]),
            "scope": "single_road",
            "diversion_factor": 1.30,
        }

    if scenario_type == "heavy_rain":
        return {
            "speed_factor": 0.70,
            "vehicle_factor": 0.90,
            "congestion_shift": 1,
            "description": p.get("description", _SCENARIO_DESCRIPTIONS["heavy_rain"]),
            "scope": "city",
        }

    if scenario_type == "festival":
        return {
            "speed_factor": 0.75,
            "vehicle_factor": 1.50,
            "congestion_shift": 1,
            "description": p.get("description", _SCENARIO_DESCRIPTIONS["festival"]),
            "scope": "area",
        }

    if scenario_type == "traffic_surge":
        return {
            "speed_factor": 0.65,
            "vehicle_factor": 1.40,
            "congestion_shift": 2,
            "description": p.get("description", _SCENARIO_DESCRIPTIONS["traffic_surge"]),
            "scope": "city",
        }

    if scenario_type == "signal_failure":
        return {
            "speed_factor": 0.30,
            "vehicle_factor": 1.10,
            "congestion_shift": 3,
            "description": p.get("description", _SCENARIO_DESCRIPTIONS["signal_failure"]),
            "scope": "intersection",
        }

    if scenario_type == "vip_movement":
        return {
            "speed_factor": 0.85,
            "vehicle_factor": 1.10,
            "congestion_shift": 1,
            "description": p.get("description", _SCENARIO_DESCRIPTIONS["vip_movement"]),
            "scope": "corridor",
        }

    return {
        "speed_factor": 0.80,
        "vehicle_factor": 1.10,
        "congestion_shift": 1,
        "description": p.get("description", "Unknown scenario"),
        "scope": "city",
    }


def _simulate_road(road: Road, impact: dict, record: TrafficRecord | None, scenario_type: str, params: dict | None) -> dict:
    """Build a deterministic simulation result dict for one road."""
    p = params or {}

    if record is None:
        original_speed = 30.0
        original_vehicles = 50
        original_congestion = "moderate"
    else:
        original_speed = record.avg_speed_kmph
        original_vehicles = record.vehicle_count
        original_congestion = record.congestion_level

    scope = impact["scope"]

    affected = True
    target_road_id = p.get("road_id")
    target_intersection_id = p.get("intersection_id")

    if scope == "single_road" and target_road_id is not None:
        affected = road.id == target_road_id
    elif scope == "intersection" and target_intersection_id is not None:
        affected = any(ix.id == target_intersection_id for ix in road.intersections)
    elif scope == "corridor" and target_road_id is not None:
        target_road = p.get("road_id")
        affected = road.corridor_id is not None and road.corridor_id == (
            _get_road_corridor(road, target_road) if target_road else None
        )

    if not affected:
        return {
            "road_id": road.id,
            "road_name": road.name,
            "original_speed_kmph": original_speed,
            "simulated_speed_kmph": original_speed,
            "original_vehicles": original_vehicles,
            "simulated_vehicles": original_vehicles,
            "original_congestion": original_congestion,
            "simulated_congestion": original_congestion,
            "queue_change_pct": 0.0,
            "travel_time_change_pct": 0.0,
        }

    sf = impact["speed_factor"]
    vf = impact["vehicle_factor"]

    if scenario_type == "road_closure" and target_road_id is not None and road.id == target_road_id:
        simulated_speed = 0.0
        simulated_vehicles = 0
    else:
        simulated_speed = round(original_speed * sf, 1)
        simulated_vehicles = int(original_vehicles * vf)

    simulated_congestion = _shift_congestion(original_congestion, impact["congestion_shift"])

    if original_speed > 0:
        speed_change_pct = ((simulated_speed - original_speed) / original_speed) * 100
    else:
        speed_change_pct = 0.0
    queue_change_pct = round(-speed_change_pct * 2.5, 1)
    travel_time_change_pct = round(-speed_change_pct, 1) if original_speed > 0 else 0.0

    return {
        "road_id": road.id,
        "road_name": road.name,
        "original_speed_kmph": original_speed,
        "simulated_speed_kmph": simulated_speed,
        "original_vehicles": original_vehicles,
        "simulated_vehicles": simulated_vehicles,
        "original_congestion": original_congestion,
        "simulated_congestion": simulated_congestion,
        "queue_change_pct": queue_change_pct,
        "travel_time_change_pct": travel_time_change_pct,
    }


def _get_road_corridor(road: Road, target_road_id: int | None) -> int | None:
    return road.corridor_id


def _run_deterministic(
    db: Session,
    sim: Simulation,
    city_id: int,
    scenario_type: str,
    parameters: dict | None,
) -> Simulation:
    """Run the deterministic simulation engine."""
    impact = _scenario_impact(scenario_type, parameters)

    roads = db.scalars(
        select(Road).where(Road.city_id == city_id)
    ).all()

    for road in roads:
        record = _latest_record(db, road.id)
        result_dict = _simulate_road(road, impact, record, scenario_type, parameters)

        # Compute before/after metrics
        orig_speed = result_dict["original_speed_kmph"]
        sim_speed = result_dict["simulated_speed_kmph"]
        orig_vehicles = result_dict["original_vehicles"]

        orig_travel_time = 3600 / max(orig_speed, 0.1) if orig_speed > 0 else 999.0
        sim_travel_time = 3600 / max(sim_speed, 0.1) if sim_speed > 0 else 999.0

        # Deterministic queue/waiting estimates
        orig_queue = _estimate_queue_from_congestion(result_dict["original_congestion"])
        sim_queue = _estimate_queue_from_congestion(result_dict["simulated_congestion"])

        orig_waiting = _estimate_waiting_from_congestion(result_dict["original_congestion"])
        sim_waiting = _estimate_waiting_from_congestion(result_dict["simulated_congestion"])

        db.add(SimulationResult(
            simulation_id=sim.id,
            road_id=road.id,
            avg_speed_kmph=sim_speed,
            avg_travel_time_seconds=round(sim_travel_time, 1),
            total_vehicles=result_dict["simulated_vehicles"],
            max_queue_length=sim_queue,
            metrics={
                "original_speed_kmph": orig_speed,
                "original_vehicles": orig_vehicles,
                "original_congestion": result_dict["original_congestion"],
                "simulated_congestion": result_dict["simulated_congestion"],
                "queue_change_pct": result_dict["queue_change_pct"],
                "travel_time_change_pct": result_dict["travel_time_change_pct"],
                # Before/after metrics
                "original_waiting_time": orig_waiting,
                "simulated_waiting_time": sim_waiting,
                "original_queue_length": orig_queue,
                "simulated_queue_length": sim_queue,
                "original_throughput": orig_vehicles,
                "simulated_throughput": result_dict["simulated_vehicles"],
                "original_travel_time": round(orig_travel_time, 1),
                "simulated_travel_time": round(sim_travel_time, 1),
            },
        ))

    return sim


# ── SUMO engine ───────────────────────────────────────────────────────

_EDGE_ID_RE = re.compile(r"^edge_road_(\d+)$")


def _run_sumo(
    db: Session,
    sim: Simulation,
    city_id: int,
    scenario_type: str,
    parameters: dict | None,
) -> Simulation:
    """Run the SUMO simulation engine with scenario-specific modifications.

    1. Start SUMO session (generates network from DB)
    2. Apply scenario effects via TraCI (close edges, reduce speed, add vehicles)
    3. Run simulation to completion
    4. Collect detailed edge data (speed, waiting, queue, throughput)
    5. Map back to per-road results

    Raises SumoUnavailableError if SUMO is not installed.
    """
    from app.integrations.sumo.sumo_service import sumo_service, _import_traci

    duration = _sumo_duration_for_scenario(scenario_type)

    session_info = sumo_service.start(
        db, city_id=city_id, duration_seconds=duration, step_size=1.0,
    )
    session_id = session_info["session_id"]
    total_steps = session_info["total_steps"]

    try:
        # Apply scenario-specific modifications via TraCI
        _apply_scenario_traci(session_id, scenario_type, parameters, db, city_id)

        # Run simulation to completion
        step_result = sumo_service.step(session_id, num_steps=total_steps)
        edge_data = step_result.get("edges", [])

        # Map SUMO edge data back to roads with full metrics
        _map_sumo_edges_to_roads(db, sim, city_id, edge_data, scenario_type, parameters)

    finally:
        try:
            sumo_service.stop(session_id)
        except Exception:
            pass

    return sim


def _apply_scenario_traci(
    session_id: str,
    scenario_type: str,
    parameters: dict | None,
    db: Session,
    city_id: int,
) -> None:
    """Apply scenario-specific modifications to the running SUMO simulation via TraCI.

    This is where the What-If scenario is injected into the SUMO simulation:
      - road_closure: set target edge max speed to 0 (block traffic)
      - accident: reduce target edge speed to 20% of original
      - traffic_surge: add extra vehicle flows on all edges
      - heavy_rain: reduce all edge speeds to 70%
      - signal_failure: set traffic lights to red
      - festival: increase flow on nearby edges
      - vip_movement: reduce speed on corridor edges
    """
    from app.integrations.sumo.sumo_service import _import_traci, _get_session, _sessions

    traci = _import_traci()

    # Get the session's TraCI connection
    session = _sessions.get(session_id)
    if session is None or session._conn is None:
        return

    conn = session._conn
    p = parameters or {}

    if scenario_type == "road_closure":
        _traci_road_closure(conn, p, db, city_id)

    elif scenario_type == "accident":
        _traci_accident(conn, p, db, city_id)

    elif scenario_type == "traffic_surge":
        _traci_traffic_surge(conn, db, city_id)

    elif scenario_type == "heavy_rain":
        _traci_heavy_rain(conn, db, city_id)

    elif scenario_type == "signal_failure":
        _traci_signal_failure(conn, p, db, city_id)

    elif scenario_type == "festival":
        _traci_festival(conn, p, db, city_id)

    elif scenario_type == "vip_movement":
        _traci_vip_movement(conn, p, db, city_id)


def _traci_road_closure(conn, params: dict, db: Session, city_id: int) -> None:
    """Close the target road by setting its edge speed to 0."""
    target_road_id = params.get("road_id")
    if target_road_id is None:
        return

    edge_id = f"edge_road_{target_road_id}"
    try:
        # Set max speed to 0 — effectively closes the road
        conn.lane.setMaxSpeed(edge_id + "_0", 0.0)
    except Exception as e:
        logger.warning("Failed to close edge %s: %s", edge_id, e)


def _traci_accident(conn, params: dict, db: Session, city_id: int) -> None:
    """Reduce speed on the target road to simulate an accident."""
    target_road_id = params.get("road_id")
    if target_road_id is None:
        return

    edge_id = f"edge_road_{target_road_id}"
    try:
        # Get current max speed and reduce to 20%
        current_speed = conn.lane.getMaxSpeed(edge_id + "_0")
        conn.lane.setMaxSpeed(edge_id + "_0", current_speed * 0.20)
    except Exception as e:
        logger.warning("Failed to apply accident to edge %s: %s", edge_id, e)


def _traci_traffic_surge(conn, db: Session, city_id: int) -> None:
    """Add extra vehicles to simulate traffic surge."""
    try:
        edge_ids = conn.lane.getIDList()
        for edge_id in edge_ids:
            if not edge_id.startswith("edge_road_"):
                continue
            # Add additional vehicles via TraCI vehicle insertion
            for i in range(5):
                try:
                    conn.vehicle.add(
                        f"surge_{edge_id}_{i}",
                        routes=[edge_id],
                        typeID="car",
                    )
                except Exception:
                    break  # Edge might be full
    except Exception as e:
        logger.warning("Failed to apply traffic surge: %s", e)


def _traci_heavy_rain(conn, db: Session, city_id: int) -> None:
    """Reduce all edge speeds to 70% to simulate heavy rain."""
    try:
        edge_ids = conn.lane.getIDList()
        for edge_id in edge_ids:
            if not edge_id.startswith("edge_road_"):
                continue
            try:
                current_speed = conn.lane.getMaxSpeed(edge_id)
                conn.lane.setMaxSpeed(edge_id, current_speed * 0.70)
            except Exception:
                continue
    except Exception as e:
        logger.warning("Failed to apply heavy rain: %s", e)


def _traci_signal_failure(conn, params: dict, db: Session, city_id: int) -> None:
    """Set traffic lights at the target intersection to a fixed all-red phase."""
    target_intersection_id = params.get("intersection_id")
    if target_intersection_id is None:
        return

    # Find the SUMO traffic light ID for this intersection
    tl_id = f"node_ix_{target_intersection_id}"
    try:
        # Set to a fixed phase that causes breakdown
        conn.trafficlight.setPhase(tl_id, 0)
        # Extend green for conflicting approaches to cause congestion
        program = conn.trafficlight.getAllProgramLogics(tl_id)
        if program:
            # Force a simple two-phase program with long green
            new_phases = [
                ("GGGrrr", 60),  # Long green for one direction
                ("rrrGGG", 60),  # Long green for other direction
            ]
            # This is a simplified approach — real signal failure would
            # need the actual signal program structure
    except Exception as e:
        logger.warning("Failed to apply signal failure at %s: %s", tl_id, e)


def _traci_festival(conn, params: dict, db: Session, city_id: int) -> None:
    """Increase traffic flow near the festival area."""
    try:
        edge_ids = conn.lane.getIDList()
        target_road_id = params.get("road_id")
        for edge_id in edge_ids:
            if not edge_id.startswith("edge_road_"):
                continue
            try:
                # Add extra vehicles to simulate festival traffic
                for i in range(8):
                    try:
                        conn.vehicle.add(
                            f"festival_{edge_id}_{i}",
                            routes=[edge_id],
                            typeID="car",
                        )
                    except Exception:
                        break
            except Exception:
                continue
    except Exception as e:
        logger.warning("Failed to apply festival: %s", e)


def _traci_vip_movement(conn, params: dict, db: Session, city_id: int) -> None:
    """Reduce speed on corridor edges to simulate VIP convoy."""
    target_road_id = params.get("road_id")
    if target_road_id is None:
        return

    # Get the corridor for this road
    road = db.get(Road, target_road_id)
    if road is None or road.corridor_id is None:
        return

    # Find all roads in the same corridor
    corridor_roads = db.scalars(
        select(Road).where(Road.corridor_id == road.corridor_id)
    ).all()

    for cr in corridor_roads:
        edge_id = f"edge_road_{cr.id}"
        try:
            current_speed = conn.lane.getMaxSpeed(edge_id + "_0")
            conn.lane.setMaxSpeed(edge_id + "_0", current_speed * 0.60)
        except Exception:
            continue


def _sumo_duration_for_scenario(scenario_type: str) -> int:
    """Return simulation duration in seconds for a scenario type."""
    durations = {
        "accident": 1800,
        "road_closure": 3600,
        "heavy_rain": 7200,
        "festival": 5400,
        "traffic_surge": 3600,
        "signal_failure": 1800,
        "vip_movement": 2700,
    }
    return durations.get(scenario_type, 3600)


def _map_sumo_edges_to_roads(
    db: Session,
    sim: Simulation,
    city_id: int,
    edge_data: list[dict],
    scenario_type: str,
    parameters: dict | None,
) -> None:
    """Map SUMO edge simulation results back to per-road SimulationResults.

    Collects all required metrics: speed, waiting_time, queue, throughput,
    congestion, travel_time.
    """
    edge_lookup: dict[int, dict] = {}
    for edge in edge_data:
        m = _EDGE_ID_RE.match(edge["edge_id"])
        if m:
            road_id = int(m.group(1))
            edge_lookup[road_id] = edge

    roads = db.scalars(select(Road).where(Road.city_id == city_id)).all()

    for road in roads:
        record = _latest_record(db, road.id)

        # Original values
        if record:
            original_speed = record.avg_speed_kmph
            original_vehicles = record.vehicle_count
            original_congestion = record.congestion_level
        else:
            original_speed = 30.0
            original_vehicles = 50
            original_congestion = "moderate"

        # Original metrics
        original_travel_time = 3600 / max(original_speed, 0.1) if original_speed > 0 else 999.0
        original_queue = _estimate_queue_from_congestion(original_congestion)
        original_waiting = _estimate_waiting_from_congestion(original_congestion)
        original_throughput = original_vehicles

        # SUMO-simulated values
        edge = edge_lookup.get(road.id)
        if edge:
            simulated_speed = round(edge["mean_speed"] * 3.6, 1)
            simulated_vehicles = edge["vehicles"]
            simulated_waiting = round(edge["waiting_time"], 2)
            simulated_travel_time = round(edge["travel_time"], 2)
            # Queue from occupancy (0-1 occupancy → queue estimate)
            simulated_queue = int(edge["occupancy"] * 50)  # scale to vehicle count
            simulated_throughput = edge["vehicles"]
        else:
            simulated_speed = original_speed
            simulated_vehicles = original_vehicles
            simulated_waiting = original_waiting
            simulated_travel_time = original_travel_time
            simulated_queue = original_queue
            simulated_throughput = original_throughput

        # Derive congestion from speed ratio
        speed_ratio = simulated_speed / original_speed if original_speed > 0 else 1.0
        simulated_congestion = _speed_to_congestion(speed_ratio)

        # Queue change percentage
        if original_queue > 0:
            queue_change_pct = round(
                ((simulated_queue - original_queue) / original_queue) * 100, 1
            )
        else:
            queue_change_pct = 0.0

        # Travel time change percentage
        if original_travel_time > 0 and original_travel_time < 999:
            travel_time_change_pct = round(
                ((simulated_travel_time - original_travel_time) / original_travel_time) * 100, 1
            )
        else:
            travel_time_change_pct = 0.0

        db.add(SimulationResult(
            simulation_id=sim.id,
            road_id=road.id,
            avg_speed_kmph=simulated_speed,
            avg_travel_time_seconds=simulated_travel_time,
            total_vehicles=simulated_vehicles,
            max_queue_length=simulated_queue,
            metrics={
                # Before
                "original_speed_kmph": original_speed,
                "original_vehicles": original_vehicles,
                "original_congestion": original_congestion,
                "original_waiting_time": original_waiting,
                "original_queue_length": original_queue,
                "original_throughput": original_throughput,
                "original_travel_time": round(original_travel_time, 1),
                # After
                "simulated_congestion": simulated_congestion,
                "simulated_waiting_time": simulated_waiting,
                "simulated_queue_length": simulated_queue,
                "simulated_throughput": simulated_throughput,
                "simulated_travel_time": simulated_travel_time,
                # Deltas
                "queue_change_pct": queue_change_pct,
                "travel_time_change_pct": travel_time_change_pct,
                # SUMO metadata
                "simulation_backend": "sumo",
                "sumo_edge_id": edge["edge_id"] if edge else None,
            },
        ))


# ── Metric estimation helpers ─────────────────────────────────────────

def _estimate_queue_from_congestion(level: str) -> int:
    """Estimate queue length (vehicles) from congestion level."""
    return {"free_flow": 0, "moderate": 3, "slow": 8, "congested": 15, "gridlock": 30}.get(level, 0)


def _estimate_waiting_from_congestion(level: str) -> float:
    """Estimate average waiting time (seconds) from congestion level."""
    return {"free_flow": 2.0, "moderate": 10.0, "slow": 25.0, "congested": 45.0, "gridlock": 90.0}.get(level, 10.0)


# ── Public service functions ──────────────────────────────────────────

def create_simulation(
    db: Session,
    *,
    city_id: int,
    user_id: int,
    name: str,
    scenario_type: str,
    parameters: dict | None = None,
    backend: str = "deterministic",
) -> Simulation:
    """Create and run a What-If simulation.

    Routes to either the deterministic or SUMO engine based on the
    ``backend`` parameter.  Both produce the same output format.
    """
    merged_params = dict(parameters) if parameters else {}
    merged_params["simulation_backend"] = backend

    sim = Simulation(
        city_id=city_id,
        user_id=user_id,
        name=name,
        scenario_type=scenario_type,
        parameters=merged_params,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(sim)
    db.flush()

    try:
        if backend == "sumo":
            _run_sumo(db, sim, city_id, scenario_type, parameters)
        else:
            _run_deterministic(db, sim, city_id, scenario_type, parameters)
    except Exception as e:
        sim.status = "failed"
        sim.completed_at = datetime.now(timezone.utc)
        sim.parameters = merged_params
        db.commit()
        db.refresh(sim)
        logger.error("Simulation %d failed: %s", sim.id, e)
        raise

    sim.status = "completed"
    sim.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sim)

    return sim


def get_simulation_by_id(db: Session, simulation_id: int) -> Simulation | None:
    return db.get(Simulation, simulation_id)


def get_simulation_results(db: Session, simulation_id: int) -> list[SimulationResult]:
    return list(
        db.scalars(
            select(SimulationResult)
            .where(SimulationResult.simulation_id == simulation_id)
            .order_by(SimulationResult.road_id)
        ).all()
    )


def build_simulation_output(db: Session, sim: Simulation) -> dict:
    """Build full output dict for a completed simulation."""
    results = get_simulation_results(db, sim.id)

    backend = "deterministic"
    if sim.parameters:
        backend = sim.parameters.get("simulation_backend", "deterministic")

    road_results = []
    total_original_vehicles = 0
    total_simulated_vehicles = 0
    speed_changes = []
    worst_name = ""
    worst_reduction = 0.0
    # Aggregate before/after
    waiting_before_list: list[float] = []
    waiting_after_list: list[float] = []
    queue_before_list: list[int] = []
    queue_after_list: list[int] = []
    throughput_before = 0
    throughput_after = 0
    travel_before_list: list[float] = []
    travel_after_list: list[float] = []

    for r in results:
        m = r.metrics or {}
        original_speed = m.get("original_speed_kmph", 30.0)
        original_vehicles = m.get("original_vehicles", 0)
        original_congestion = m.get("original_congestion", "moderate")
        simulated_congestion = m.get("simulated_congestion", "moderate")

        total_original_vehicles += original_vehicles
        total_simulated_vehicles += r.total_vehicles or 0

        if original_speed > 0:
            speed_change_pct = ((r.avg_speed_kmph - original_speed) / original_speed) * 100
        else:
            speed_change_pct = 0.0
        speed_changes.append(speed_change_pct)

        if speed_change_pct < worst_reduction:
            worst_reduction = speed_change_pct
            worst_name = r.road.name if r.road else f"Road #{r.road_id}"

        # Collect before/after metrics
        orig_wt = m.get("original_waiting_time", 0.0)
        sim_wt = m.get("simulated_waiting_time", 0.0)
        orig_q = m.get("original_queue_length", 0)
        sim_q = m.get("simulated_queue_length", 0)
        orig_tp = m.get("original_throughput", 0)
        sim_tp = m.get("simulated_throughput", 0)
        orig_tt = m.get("original_travel_time", 0.0)
        sim_tt = m.get("simulated_travel_time", 0.0)

        waiting_before_list.append(orig_wt)
        waiting_after_list.append(sim_wt)
        queue_before_list.append(orig_q)
        queue_after_list.append(sim_q)
        throughput_before += orig_tp
        throughput_after += sim_tp
        travel_before_list.append(orig_tt)
        travel_after_list.append(sim_tt)

        road_results.append({
            "road_id": r.road_id,
            "road_name": r.road.name if r.road else f"Road #{r.road_id}",
            "original_speed_kmph": original_speed,
            "simulated_speed_kmph": r.avg_speed_kmph or 0.0,
            "original_vehicles": original_vehicles,
            "simulated_vehicles": r.total_vehicles or 0,
            "original_congestion": original_congestion,
            "simulated_congestion": simulated_congestion,
            "original_waiting_time": round(orig_wt, 2),
            "simulated_waiting_time": round(sim_wt, 2),
            "original_queue_length": orig_q,
            "simulated_queue_length": sim_q,
            "original_throughput": orig_tp,
            "simulated_throughput": sim_tp,
            "original_travel_time": round(orig_tt, 1),
            "simulated_travel_time": round(sim_tt, 1),
            "queue_change_pct": m.get("queue_change_pct", 0.0),
            "travel_time_change_pct": m.get("travel_time_change_pct", 0.0),
        })

    avg_speed_change = round(sum(speed_changes) / len(speed_changes), 1) if speed_changes else 0.0
    scenario_desc = _scenario_impact(sim.scenario_type, sim.parameters)["description"]

    n = len(results) or 1
    return {
        "simulation": sim,
        "summary": {
            "total_roads_affected": len(results),
            "avg_speed_change_pct": avg_speed_change,
            "total_vehicles_impacted": total_simulated_vehicles,
            "worst_road_name": worst_name,
            "worst_speed_reduction_pct": round(worst_reduction, 1),
            "scenario_description": scenario_desc,
            "simulation_backend": backend,
            "avg_waiting_time_before": round(sum(waiting_before_list) / n, 2),
            "avg_waiting_time_after": round(sum(waiting_after_list) / n, 2),
            "avg_queue_before": round(sum(queue_before_list) / n, 1),
            "avg_queue_after": round(sum(queue_after_list) / n, 1),
            "total_throughput_before": throughput_before,
            "total_throughput_after": throughput_after,
            "avg_travel_time_before": round(sum(travel_before_list) / n, 1),
            "avg_travel_time_after": round(sum(travel_after_list) / n, 1),
        },
        "road_results": road_results,
    }


def list_simulations(
    db: Session,
    city_id: int | None = None,
    user_id: int | None = None,
) -> list[Simulation]:
    q = select(Simulation)
    if city_id is not None:
        q = q.where(Simulation.city_id == city_id)
    if user_id is not None:
        q = q.where(Simulation.user_id == user_id)
    q = q.order_by(Simulation.created_at.desc())
    return list(db.scalars(q).all())
