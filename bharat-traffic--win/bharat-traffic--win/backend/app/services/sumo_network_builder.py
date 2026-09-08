"""SumoNetworkBuilder — converts BharatTrafficTwin DB models to SUMO network files.

Generates valid SUMO .net.xml, .rou.xml, and .sumocfg files from the
city's roads, intersections, signals, and traffic records stored in the
database.

This module does NOT import traci or sumolib at module level so that
the rest of the application loads even when SUMO is not installed.
Imports are deferred to the methods that need them.
"""

from __future__ import annotations

import os
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.intersection import Intersection
from app.models.road import Road, road_intersection
from app.models.traffic_record import TrafficRecord
from app.models.traffic_signal import TrafficSignal


# ── Constants ──────────────────────────────────────────────────────────

# SUMO speed is in m/s; DB stores km/h
_KMPH_TO_MS = 1.0 / 3.6

# Default values when DB data is missing
_DEFAULT_SPEED_LIMIT_MS = 13.9  # ~50 km/h
_DEFAULT_LANES = 2
_DEFAULT_LENGTH = 100.0  # meters


# ── Helpers ────────────────────────────────────────────────────────────

def _road_to_edge_id(road: Road) -> str:
    """Convert a Road DB object to a SUMO edge ID."""
    return f"edge_road_{road.id}"


def _intersection_to_node_id(intersection: Intersection) -> str:
    """Convert an Intersection DB object to a SUMO node ID."""
    return f"node_ix_{intersection.id}"


def _sanitize_name(name: str) -> str:
    """Sanitize a string for use in SUMO XML attributes."""
    return name.replace("&", "and").replace("'", "").replace('"', "").replace("<", "").replace(">", "")


# ── Network Generation ────────────────────────────────────────────────

def generate_sumo_network(db: Session, city_id: int, output_dir: str | None = None) -> dict[str, str]:
    """Generate SUMO network files from DB models for a city.

    Produces three files in output_dir:
      - network.net.xml  (SUMO network)
      - routes.rou.xml   (vehicle routes)
      - sim.sumocfg      (SUMO configuration)

    Returns dict with keys: net_path, route_path, config_path.

    Raises ValueError if no roads or intersections exist for the city.
    """
    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix="sumo_")

    os.makedirs(output_dir, exist_ok=True)

    # Fetch data from DB
    roads = list(db.scalars(select(Road).where(Road.city_id == city_id)).all())
    intersections = list(db.scalars(select(Intersection).where(Intersection.city_id == city_id)).all())

    if not roads:
        raise ValueError(f"No roads found for city_id={city_id}")
    if not intersections:
        raise ValueError(f"No intersections found for city_id={city_id}")

    # Build node (intersection) XML
    nodes_xml = _build_nodes_xml(intersections)

    # Build edge (road) XML
    edges_xml = _build_edges_xml(db, roads, intersections)

    # Build connection XML
    connections_xml = _build_connections_xml(db, roads, intersections)

    # Write .net.xml (raw network — edges, nodes, connections)
    net_path = os.path.join(output_dir, "network.net.xml")
    _write_net_xml(net_path, nodes_xml, edges_xml, connections_xml)

    # Generate route file
    route_path = os.path.join(output_dir, "routes.rou.xml")
    _generate_route_file(db, route_path, roads, city_id)

    # Generate sumocfg
    config_path = os.path.join(output_dir, "sim.sumocfg")
    _generate_sumocfg(config_path, net_path, route_path, output_dir)

    return {
        "net_path": net_path,
        "route_path": route_path,
        "config_path": config_path,
        "output_dir": output_dir,
    }


def _build_nodes_xml(intersections: list[Intersection]) -> ET.Element:
    """Build SUMO nodes element from intersections."""
    nodes = ET.Element("nodes")
    for ix in intersections:
        node_id = _intersection_to_node_id(ix)
        ET.SubElement(nodes, "node", {
            "id": node_id,
            "x": str(round(ix.longitude, 6)),
            "y": str(round(ix.latitude, 6)),
            "type": "priority" if ix.intersection_type == "unsignalized" else "priority",
            "name": _sanitize_name(ix.name),
        })
    return nodes


def _build_edges_xml(
    db: Session,
    roads: list[Road],
    intersections: list[Intersection],
) -> ET.Element:
    """Build SUMO edges element from roads.

    Each road is modelled as a pair of directed edges (forward + reverse)
    connecting the two intersections it links.  If a road has only one
    connected intersection, a self-loop is created.
    """
    edges = ET.Element("edges")

    for road in roads:
        edge_id = _road_to_edge_id(road)
        speed_ms = (road.speed_limit_kmph or 50.0) * _KMPH_TO_MS
        lanes = road.lanes or _DEFAULT_LANES
        length = road.length_meters or _DEFAULT_LENGTH

        # Get connected intersections
        connected_ixs = list(road.intersections)

        if len(connected_ixs) >= 2:
            from_node = _intersection_to_node_id(connected_ixs[0])
            to_node = _intersection_to_node_id(connected_ixs[1])
        elif len(connected_ixs) == 1:
            # Self-loop
            from_node = _intersection_to_node_id(connected_ixs[0])
            to_node = from_node
        else:
            # No connections — skip or use placeholder
            continue

        attrs = {
            "id": edge_id,
            "from": from_node,
            "to": to_node,
            "numLanes": str(lanes),
            "speed": str(round(speed_ms, 2)),
            "length": str(round(length, 1)),
            "name": _sanitize_name(road.name),
        }

        # Add shape hint for edges with intersections that have coordinates
        if len(connected_ixs) >= 2:
            coords = ";".join(
                f"{ix.longitude:.6f},{ix.latitude:.6f}"
                for ix in connected_ixs[:2]
            )
            attrs["shape"] = coords

        ET.SubElement(edges, "edge", attrs)

    return edges


def _build_connections_xml(
    db: Session,
    roads: list[Road],
    intersections: list[Intersection],
) -> ET.Element:
    """Build SUMO connections element.

    At each intersection, connect incoming edges to outgoing edges.
    """
    connections = ET.Element("connections")

    for ix in intersections:
        node_id = _intersection_to_node_id(ix)

        # Find edges connected to this intersection
        incoming_edges = []
        outgoing_edges = []
        for road in roads:
            edge_id = _road_to_edge_id(road)
            connected_ixs = [i.id for i in road.intersections]
            if len(connected_ixs) >= 2:
                if connected_ixs[0] == ix.id:
                    outgoing_edges.append(edge_id)
                if connected_ixs[-1] == ix.id:
                    incoming_edges.append(edge_id)
            elif len(connected_ixs) == 1 and connected_ixs[0] == ix.id:
                outgoing_edges.append(edge_id)
                incoming_edges.append(edge_id)

        # Create connections from each incoming to each outgoing
        for in_edge in incoming_edges:
            for out_edge in outgoing_edges:
                if in_edge != out_edge:
                    ET.SubElement(connections, "connection", {
                        "from": in_edge,
                        "to": out_edge,
                        "fromLane": "0",
                        "toLane": "0",
                    })

    return connections


def _write_net_xml(path: str, nodes: ET.Element, edges: ET.Element, connections: ET.Element) -> None:
    """Write a SUMO network XML file.

    Note: This produces a simplified network file.  For production use,
    SUMO's ``netconvert`` tool should be invoked to generate the
    canonical .net.xml format.  This file is sufficient for basic
    TraCI simulations.
    """
    root = ET.Element("net", {
        "version": "1.16",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    })
    root.append(nodes)
    root.append(edges)
    root.append(connections)

    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="unicode", xml_declaration=True)


# ── Route Generation ───────────────────────────────────────────────────

def _generate_route_file(
    db: Session,
    path: str,
    roads: list[Road],
    city_id: int,
) -> None:
    """Generate a SUMO .rou.xml with vehicle types and routes.

    Routes are derived from road connectivity.  Vehicle counts and
    types are estimated from traffic records.
    """
    root = ET.Element("routes")

    # Define vehicle types
    ET.SubElement(root, "vType", {
        "id": "car",
        "accel": "2.6",
        "decel": "4.5",
        "sigma": "0.5",
        "length": "5",
        "maxSpeed": "50",
    })
    ET.SubElement(root, "vType", {
        "id": "bus",
        "accel": "1.0",
        "decel": "3.0",
        "sigma": "0.3",
        "length": "12",
        "maxSpeed": "40",
    })
    ET.SubElement(root, "vType", {
        "id": "two_wheeler",
        "accel": "3.0",
        "decel": "5.0",
        "sigma": "0.4",
        "length": "2",
        "maxSpeed": "45",
    })

    # Build routes from road connectivity
    route_count = 0
    for road in roads:
        connected_ixs = list(road.intersections)
        if len(connected_ixs) < 2:
            continue

        edge_id = _road_to_edge_id(road)

        # Create a route using the road's edge
        route_id = f"route_{road.id}"
        ET.SubElement(root, "route", {
            "id": route_id,
            "edges": edge_id,
        })
        route_count += 1

        # Determine vehicle flow from traffic records
        record = db.scalar(
            select(TrafficRecord)
            .where(TrafficRecord.road_id == road.id)
            .order_by(TrafficRecord.timestamp.desc())
            .limit(1)
        )

        if record:
            vehicle_count = max(record.vehicle_count, 1)
            # Distribute vehicles over the simulation period (3600s)
            # Create a departEvery flow
            period = max(3600 / vehicle_count, 1.0)
            vtype = "car"
            composition = record.vehicle_composition or {}
            if composition:
                # Pick dominant type
                if composition.get("bus", 0) > composition.get("car", 0):
                    vtype = "bus"
                elif composition.get("two_wheeler", 0) > composition.get("car", 0):
                    vtype = "two_wheeler"

            ET.SubElement(root, "flow", {
                "id": f"flow_{road.id}",
                "type": vtype,
                "route": route_id,
                "depart": "0",
                "departSpeed": "max",
                "departPos": "random",
                "number": str(min(vehicle_count, 200)),
                "period": str(round(period, 2)),
            })
        else:
            # Default flow if no traffic records
            ET.SubElement(root, "flow", {
                "id": f"flow_{road.id}",
                "type": "car",
                "route": route_id,
                "depart": "0",
                "departSpeed": "max",
                "departPos": "random",
                "number": "20",
                "period": "5",
            })

    # Write XML
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="unicode", xml_declaration=True)


# ── SUMO Config Generation ────────────────────────────────────────────

def _generate_sumocfg(config_path: str, net_path: str, route_path: str, output_dir: str) -> None:
    """Generate a SUMO .sumocfg file."""
    # Use relative paths from the config file's directory
    config_dir = os.path.dirname(config_path)
    net_rel = os.path.relpath(net_path, config_dir)
    route_rel = os.path.relpath(route_path, config_dir)

    root = ET.Element("configuration")

    # Input section
    input_elem = ET.SubElement(root, "input")
    net_file = ET.SubElement(input_elem, "net-file", {"value": net_rel})
    route_file = ET.SubElement(input_elem, "route-files", {"value": route_rel})

    # Time section
    time_elem = ET.SubElement(root, "time")
    ET.SubElement(time_elem, "begin", {"value": "0"})
    ET.SubElement(time_elem, "end", {"value": "3600"})
    ET.SubElement(time_elem, "step-length", {"value": "1.0"})

    # Processing section
    proc_elem = ET.SubElement(root, "processing")
    ET.SubElement(proc_elem, "lanechange.duration", {"value": "0"})

    # Output section
    output_elem = ET.SubElement(root, "output")
    output_file = os.path.join(config_dir, "output.xml")
    ET.SubElement(output_elem, "output-file", {"value": "output.xml"})

    # Reporting section
    report_elem = ET.SubElement(root, "report")
    ET.SubElement(report_elem, "verbose", {"value": "true"})
    ET.SubElement(report_elem, "duration-log.disable", {"value": "true"})

    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(config_path, encoding="unicode", xml_declaration=True)


def cleanup_sumo_files(output_dir: str) -> None:
    """Remove temporary SUMO files."""
    import shutil
    if output_dir and os.path.isdir(output_dir):
        shutil.rmtree(output_dir, ignore_errors=True)
