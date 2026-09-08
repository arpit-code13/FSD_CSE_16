"""HERE Maps API proxy — routing and traffic flow.

Keeps HERE API keys on the backend and returns GeoJSON-ready payloads
for the React/MapLibre frontend.

Endpoints:
  GET  /api/here/routes         – traffic-aware car routing (HERE Routing v8)
  GET  /api/here/traffic/flow   – road-segment flow data (HERE Traffic v7)
"""

from __future__ import annotations

import math
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings

router = APIRouter(prefix="/api/here", tags=["here"])

HERE_ROUTING_V8 = "https://router.hereapi.com/v8/routes"
HERE_TRAFFIC_FLOW_V7 = "https://traffic.ls.hereapi.com/traffic/6.3/flow.json"
HERE_GEOCODE_V1 = "https://geocode.search.hereapi.com/v1/geocode"

# ── City bounding boxes (fallback if caller doesn't provide bounds) ──────────
CITY_BOUNDS: dict[str, dict[str, float]] = {
    "Bengaluru":  {"north": 13.10, "south": 12.80, "east": 77.80, "west": 77.50},
    "Delhi-NCR":  {"north": 28.75, "south": 28.40, "east": 77.40, "west": 77.00},
    "Mumbai":     {"north": 19.20, "south": 18.85, "east": 73.00, "west": 72.75},
    "Hyderabad":  {"north": 17.55, "south": 17.25, "east": 78.60, "west": 78.30},
}


# ── Polyline decoder (HERE / Google Encoded Polyline) ────────────────────────

def _decode_polyline(encoded: str) -> list[list[float]]:
    """Decode an encoded polyline string into [[lng, lat], ...]."""
    coords: list[list[float]] = []
    idx = lat = lng = 0
    while idx < len(encoded):
        for coord_var in (lat, lng):
            shift = result = 0
            while True:
                b = ord(encoded[idx]) - 63
                idx += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            delta = ~(result >> 1) if result & 1 else result >> 1
            if coord_var == lat:
                lat += delta
            else:
                lng += delta
        coords.append([lng / 1e5, lat / 1e5])
    return coords


def _traffic_level(speed_kmh: float, free_flow_kmh: float) -> str:
    if free_flow_kmh <= 0:
        return "unknown"
    ratio = speed_kmh / free_flow_kmh
    if ratio > 0.85:
        return "smooth"
    if ratio > 0.65:
        return "moderate"
    if ratio > 0.40:
        return "heavy"
    return "severe"


# ── GET /api/here/routes ─────────────────────────────────────────────────────

@router.get("/routes")
async def get_here_routes(
    origin_lat: float = Query(..., description="Origin latitude"),
    origin_lng: float = Query(..., description="Origin longitude"),
    dest_lat: float = Query(..., description="Destination latitude"),
    dest_lng: float = Query(..., description="Destination longitude"),
    depart_at: str | None = Query(None, description="ISO-8601 departure time"),
    alternatives: int = Query(2, ge=0, le=4),
) -> dict[str, Any]:
    """Return traffic-aware car routes from HERE Routing API v8.

    Falls back to synthetic generation when HERE is unreachable.
    """
    api_key = settings.HERE_API_KEY_V8 or settings.HERE_API_KEY
    if not api_key:
        # Fallback: generate synthetic routes when HERE key is not configured
        return _generate_synthetic_routes(
            origin_lat, origin_lng, dest_lat, dest_lng,
            origin_name="", dest_name="", alternatives=alternatives,
        )

    # HERE Routing v8 uses a compact representation:  lat;lng!lat;lng
    origin = f"{origin_lat};{origin_lng}"
    destination = f"{dest_lat};{dest_lng}"
    via = ""  # no intermediate waypoints for now

    params: dict[str, Any] = {
        "transportMode": "car",
        "origin": origin,
        "destination": destination,
        "return": "polyline,summary,instructions",
        "routingMode": "fast",
        "alternatives": str(alternatives),
        "apiKey": api_key,
    }

    # Request traffic-aware routing by specifying departure with departureTime
    if depart_at:
        params["departureTime"] = depart_at
    else:
        # Request real-time traffic-aware routing
        params["departureTime"] = "now"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(HERE_ROUTING_V8, params=params)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"HERE Routing API error: {resp.text[:300]}",
                )
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="HERE Routing API timed out")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"HERE API unreachable: {exc}")

    here_routes = data.get("routes", [])
    if not here_routes:
        raise HTTPException(status_code=404, detail="No routes found from HERE for this origin/destination")

    result_routes: list[dict[str, Any]] = []
    fastest_duration = None

    for idx, route in enumerate(here_routes):
        sections = route.get("sections", [])
        # Combine polyline coordinates from all sections
        coords: list[list[float]] = []
        total_distance_m = 0
        total_duration_s = 0
        via_roads_set: set[str] = set()

        for section in sections:
            # HERE v8 section polyline
            polyline = section.get("polyline", "")
            if polyline:
                coords.extend(_decode_polyline(polyline))
            summary = section.get("summary", {})
            total_distance_m += summary.get("length", 0)
            total_duration_s += summary.get("duration", 0)

            # Extract road names from actions
            for action in section.get("actions", []):
                road = action.get("nextRoad", "")
                if road:
                    via_roads_set.add(road)

        # If polyline is in geometry format (geojson-like)
        if not coords and sections:
            geom = sections[0].get("geometry", [])
            if isinstance(geom, list) and geom:
                coords = geom

        if not coords:
            continue

        distance_km = round(total_distance_m / 1000, 1)
        duration_min = max(1, round(total_duration_s / 60))
        if fastest_duration is None:
            fastest_duration = total_duration_s

        # Derive congestion level from traffic duration vs. non-traffic duration
        # HERE v8 summary has both 'duration' (with traffic) and a baseline
        base_duration = route.get("duration", total_duration_s)
        delay_s = max(0, total_duration_s - base_duration)

        if fastest_duration and fastest_duration > 0:
            ratio = total_duration_s / fastest_duration
            if ratio <= 1.05:
                congestion = "clear"
            elif ratio <= 1.25:
                congestion = "moderate"
            elif ratio <= 1.55:
                congestion = "heavy"
            else:
                congestion = "severe"
        else:
            congestion = "moderate"

        normal_min = duration_min + max(1, round(delay_s / 60))
        time_saved = max(0, normal_min - duration_min)
        co2 = round(distance_km * 0.12, 1)

        via_roads = list(via_roads_set)[:4] if via_roads_set else ["City Route"]

        result_routes.append({
            "id": f"here-route-{idx + 1}-{int(__import__('time').time())}",
            "name": _route_name(idx, congestion),
            "origin": "",
            "destination": "",
            "distanceKm": distance_km,
            "durationMin": duration_min,
            "normalDurationMin": normal_min,
            "congestionLevel": congestion,
            "timeSavedMin": time_saved,
            "isRecommended": idx == 0,
            "viaRoads": via_roads,
            "co2EmissionsKg": co2,
            "coordinates": coords,
        })

    return {
        "source": "HERE",
        "routes": result_routes,
    }


def _route_name(idx: int, congestion: str) -> str:
    names = [
        "Traffic-Optimized Route",
        "Main Road Corridor",
        "Express Bypass Route",
        "Scenic Alternate",
    ]
    base = names[idx % len(names)]
    if idx == 0:
        return f"{base} (Optimal)"
    return base


# ── Synthetic route fallback ─────────────────────────────────────────────────

def _generate_synthetic_routes(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
    origin_name: str = "", dest_name: str = "",
    alternatives: int = 2,
) -> dict[str, Any]:
    """Generate synthetic Bezier-route alternatives when HERE API is unavailable.

    Clearly labeled as DEMO/SYNTHETIC in the response.
    """
    import hashlib
    import time as _time

    seed = f"{origin_lat},{origin_lng},{dest_lat},{dest_lng}"
    h = hashlib.md5(seed.encode()).hexdigest()

    # Haversine distance
    R = 6371.0
    dlat = math.radians(dest_lat - origin_lat)
    dlng = math.radians(dest_lng - origin_lng)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) *
         math.sin(dlng / 2) ** 2)
    straight_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    straight_km = max(1.0, straight_km)

    base_speed = 28.0  # km/h city average
    templates = [
        {"name": "Optimal Route", "dist": 1.0, "speed": 1.0, "via": ["Main Arterial", "Ring Road", "Express Link"]},
        {"name": "Direct Corridor", "dist": 0.92, "speed": 0.7, "via": ["City Center", "Shortcut"]},
        {"name": "Bypass Route", "dist": 1.2, "speed": 0.85, "via": ["Outer Ring", "Suburban Link"]},
    ]

    result: list[dict[str, Any]] = []
    for idx in range(min(alternatives + 1, len(templates))):
        t = templates[idx]
        dist = round(straight_km * t["dist"], 1)
        speed = base_speed * t["speed"]
        dur = max(5, round((dist / speed) * 60))
        normal = round(dur * 1.5)
        time_saved = max(0, normal - dur)
        ratio = dur / max(1, round(straight_km / base_speed * 60))
        if ratio <= 1.05: cong = "clear"
        elif ratio <= 1.25: cong = "moderate"
        elif ratio <= 1.55: cong = "heavy"
        else: cong = "severe"

        # Generate a simple 5-point polyline
        coords: list[list[float]] = []
        for i in range(6):
            t_val = i / 5
            coords.append([
                origin_lng + (dest_lng - origin_lng) * t_val,
                origin_lat + (dest_lat - origin_lat) * t_val,
            ])

        result.append({
            "id": f"synthetic-route-{idx + 1}-{int(_time.time())}",
            "name": t["name"],
            "origin": origin_name,
            "destination": dest_name,
            "distanceKm": dist,
            "durationMin": dur,
            "normalDurationMin": normal,
            "congestionLevel": cong,
            "timeSavedMin": time_saved,
            "isRecommended": idx == 0,
            "viaRoads": t["via"],
            "co2EmissionsKg": round(dist * 0.12, 1),
            "coordinates": coords,
        })

    return {
        "source": "SYNTHETIC",
        "routes": result,
        "label": "DEMO — No HERE API key configured",
    }


# ── GET /api/here/traffic/flow ───────────────────────────────────────────────

@router.get("/traffic/flow")
async def get_traffic_flow(
    north: float = Query(..., description="North latitude of bounding box"),
    south: float = Query(..., description="South latitude of bounding box"),
    east: float = Query(..., description="East longitude of bounding box"),
    west: float = Query(..., description="West longitude of bounding box"),
    waypoints: str | None = Query(
        None,
        description="Optional semicolon-separated lat,lng pairs to bias results",
    ),
) -> dict[str, Any]:
    """Return real-time traffic flow GeoJSON from HERE Traffic API v7.

    The returned FeatureCollection has LineString features with properties:
      speed, freeFlowSpeed, jamFactor, confidence, trafficLevel, roadName, updated.
    """
    api_key = settings.HERE_API_KEY
    if not api_key:
        # Fallback: return synthetic traffic data (clearly labeled as DEMO)
        return generate_fallback_flow(
            bbox={"north": north, "south": south, "east": east, "west": west},
        )

    bbox = f"{west},{south};{east},{north}"

    params: dict[str, str] = {
        "apiKey": api_key,
        "bbox": bbox,
        "responseattributes": "sh,fc",
    }

    # Optional: add waypoints to bias traffic data around the route
    if waypoints:
        params["waypoints"] = waypoints

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(HERE_TRAFFIC_FLOW_V7, params=params)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"HERE Traffic API error: {resp.text[:300]}",
                )
            raw = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="HERE Traffic API timed out")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"HERE Traffic API unreachable: {exc}")

    # Convert HERE traffic flow response to GeoJSON FeatureCollection
    features: list[dict[str, Any]] = []

    for flow_item in raw.get("RWS", []):
        # Each RWS entry is a road
        for ti in flow_item.get("TI", []):
            # Each TI is a traffic item (segment)
            fc = ti.get("FC", flow_item.get("FC", 0))
            tmc = ti.get("TMC", {})

            sh = tmc.get("SH", [])  # shape: polyline-encoded coords
            if not sh:
                continue

            coords: list[list[float]] = []
            for seg in sh:
                polyline_str = seg if isinstance(seg, str) else ""
                if polyline_str:
                    coords.extend(_decode_polyline(polyline_str))

            if not coords or len(coords) < 2:
                continue

            # Traffic speed info
            free_flow = ti.get("SPE", 0)  # free-flow speed
            current_speed = ti.get("CF", {}).get("SP", 0)
            jam_factor = ti.get("CF", {}).get("JF", 0)
            confidence = ti.get("CF", {}).get("CN", 0)

            # Road name
            desc = tmc.get("DE", "")

            updated = ti.get("CF", {}).get("updated", "")

            level = _traffic_level(current_speed, free_flow)

            features.append({
                "type": "Feature",
                "properties": {
                    "speed": round(current_speed, 1),
                    "freeFlowSpeed": round(free_flow, 1),
                    "jamFactor": round(jam_factor, 2),
                    "confidence": round(confidence, 2),
                    "trafficLevel": level,
                    "roadName": desc,
                    "updated": updated,
                    "fc": fc,
                    "source": "HERE",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords,
                },
            })

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "source": "HERE",
            "featureCount": len(features),
            "bbox": {"north": north, "south": south, "east": east, "west": west},
        },
    }


# ── Fallback: generate synthetic traffic flow when HERE is unavailable ───────

def generate_fallback_flow(
    bbox: dict[str, float],
    city: str = "Bengaluru",
) -> dict[str, Any]:
    """Produce deterministic synthetic traffic flow as a GeoJSON FeatureCollection.

    Used as fallback when HERE API key is not configured or unreachable.
    Clearly labeled as DEMO/SYNTHETIC.
    """
    import hashlib
    import time as _time

    seed_str = f"{city}-synth-{int(_time.time()) // 300}"  # changes every 5 min
    h = hashlib.md5(seed_str.encode()).hexdigest()

    roads = _synthetic_road_network(city, bbox)

    features: list[dict[str, Any]] = []
    for idx, road in enumerate(roads):
        # Deterministic speed from seed
        road_hash = int(h[idx * 2 : idx * 2 + 2] or "80", 16)
        speed_kmh = road["speedRange"][0] + (road_hash / 255.0) * (road["speedRange"][1] - road["speedRange"][0])
        free_flow = road["speedRange"][1]
        jam_factor = max(0, (free_flow - speed_kmh) / free_flow * 10)
        level = _traffic_level(speed_kmh, free_flow)

        features.append({
            "type": "Feature",
            "properties": {
                "speed": round(speed_kmh, 1),
                "freeFlowSpeed": round(free_flow, 1),
                "jamFactor": round(jam_factor, 2),
                "confidence": 0.85,
                "trafficLevel": level,
                "roadName": road["name"],
                "updated": "",
                "source": "SYNTHETIC",
                "label": "DEMO / SYNTHETIC DATA",
            },
            "geometry": {
                "type": "LineString",
                "coordinates": road["coords"],
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "source": "SYNTHETIC",
            "label": "DEMO — Not real-time traffic",
            "featureCount": len(features),
        },
    }


def _synthetic_road_network(city: str, bbox: dict[str, float]) -> list[dict[str, Any]]:
    """Minimal synthetic road definitions for fallback rendering."""
    mid_lat = (bbox["north"] + bbox["south"]) / 2
    mid_lng = (bbox["east"] + bbox["west"]) / 2
    d_lat = (bbox["north"] - bbox["south"]) * 0.4
    d_lng = (bbox["east"] - bbox["west"]) * 0.4

    return [
        {"name": f"Main Arterial ({city})", "coords": [
            [mid_lng - d_lng, mid_lat - d_lat / 2],
            [mid_lng, mid_lat],
            [mid_lng + d_lng, mid_lat + d_lat / 2],
        ], "speedRange": [15, 40]},
        {"name": f"Ring Corridor ({city})", "coords": [
            [mid_lng - d_lng * 0.8, mid_lat],
            [mid_lng, mid_lat + d_lat * 0.8],
            [mid_lng + d_lng * 0.8, mid_lat],
            [mid_lng, mid_lat - d_lat * 0.8],
            [mid_lng - d_lng * 0.8, mid_lat],
        ], "speedRange": [10, 35]},
        {"name": f"Express Link ({city})", "coords": [
            [mid_lng - d_lng * 0.6, mid_lat - d_lat],
            [mid_lng + d_lng * 0.6, mid_lat + d_lat],
        ], "speedRange": [30, 70]},
    ]
