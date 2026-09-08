"""GeoJSON-compatible schemas for the Digital Twin API.

Follows the RFC 7946 GeoJSON specification:
  - FeatureCollection  →  { type, features[] }
  - Feature            →  { type, geometry, properties }
  - Geometry           →  Point | LineString | Polygon | null

Where the underlying model lacks geometry (e.g. Road has no coordinates),
the ``geometry`` field is ``null`` and the frontend renders from
connection data.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel


# ── GeoJSON primitives ────────────────────────────────────────────────

class GeoJSONPoint(BaseModel):
    type: str = "Point"
    coordinates: list[float]  # [longitude, latitude]


class GeoJSONLineString(BaseModel):
    type: str = "LineString"
    coordinates: list[list[float]]  # [[lon, lat], ...]


class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: list[list[list[float]]]


Geometry = GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon | None


# ── Feature / FeatureCollection ───────────────────────────────────────

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any] | None = None
    properties: dict[str, Any] = {}


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoJSONFeature]


# ── City overview ─────────────────────────────────────────────────────

class CityOverview(BaseModel):
    """Summary payload for GET /api/digital-twin."""
    city_id: int
    city_name: str
    state: str
    country: str
    latitude: float | None = None
    longitude: float | None = None
    total_zones: int = 0
    total_corridors: int = 0
    total_roads: int = 0
    total_intersections: int = 0
    total_signals: int = 0
    total_vehicles_tracked: int = 0
    overall_congestion_level: str | None = None
