/**
 * HERE Traffic API service — calls the backend proxy.
 *
 * All HERE API keys stay on the FastAPI backend. This module provides
 * helper functions for the React components to call:
 *   GET /api/here/routes       – traffic-aware routing
 *   GET /api/here/traffic/flow  – real-time road-segment flow
 *
 * Falls back to synthetic/mock data when HERE is unavailable.
 */

import apiClient from './apiClient';
import type { RouteOption } from '../types/traffic';

// ── HERE Routing v8 ─────────────────────────────────────────────────────────

export interface HereRouteParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  originName: string;
  destinationName: string;
  departAt?: string;
  alternatives?: number;
}

interface HereRouteResponse {
  source: string;
  routes: RouteOption[];
}

/**
 * Fetch traffic-aware car routes from the backend → HERE Routing v8.
 * Returns route options with real geometry, ETA, distance, and congestion level.
 */
export async function fetchHereRoutes(params: HereRouteParams): Promise<{
  routes: RouteOption[];
  source: 'here';
}> {
  const resp = await apiClient.get<HereRouteResponse>('/here/routes', {
    params: {
      origin_lat: params.originLat,
      origin_lng: params.originLng,
      dest_lat: params.destLat,
      dest_lng: params.destLng,
      depart_at: params.departAt ?? '',
      alternatives: params.alternatives ?? 2,
    },
  });

  // Enrich routes with origin/destination names
  const routes = (resp.data.routes ?? []).map((r) => ({
    ...r,
    origin: params.originName,
    destination: params.destinationName,
  }));

  return { routes, source: 'here' };
}

// ── HERE Traffic Flow v7 ────────────────────────────────────────────────────

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TrafficFlowProperties {
  speed: number;
  freeFlowSpeed: number;
  jamFactor: number;
  confidence: number;
  trafficLevel: 'smooth' | 'moderate' | 'heavy' | 'severe';
  roadName: string;
  updated: string;
  source: 'HERE' | 'SYNTHETIC';
  label?: string;
  fc?: number;
}

export interface TrafficFlowFeature {
  type: 'Feature';
  properties: TrafficFlowProperties;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface TrafficFlowGeoJSON {
  type: 'FeatureCollection';
  features: TrafficFlowFeature[];
  meta: {
    source: string;
    featureCount: number;
    label?: string;
    bbox?: BoundingBox;
  };
}

/**
 * Fetch real-time traffic flow data from the backend → HERE Traffic v7.
 *
 * @param bounds    – bounding box to query
 * @param waypoints – optional semicolon-separated "lat,lng;lat,lng" to bias results
 */
export async function fetchTrafficFlow(
  bounds: BoundingBox,
  waypoints?: string,
): Promise<TrafficFlowGeoJSON> {
  const resp = await apiClient.get<TrafficFlowGeoJSON>('/here/traffic/flow', {
    params: {
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west,
      waypoints: waypoints ?? '',
    },
  });

  return resp.data;
}

// ── Bounding box helpers ────────────────────────────────────────────────────

/** Expand a bounding box by a given fraction (default 25%). */
export function expandBounds(bounds: BoundingBox, fraction = 0.25): BoundingBox {
  const dLat = (bounds.north - bounds.south) * fraction;
  const dLng = (bounds.east - bounds.west) * fraction;
  return {
    north: bounds.north + dLat,
    south: bounds.south - dLat,
    east: bounds.east + dLng,
    west: bounds.west - dLng,
  };
}

/** Compute bounding box from a list of [lng, lat] coordinates. */
export function boundsFromCoordinates(coords: [number, number][]): BoundingBox | null {
  if (!coords || coords.length === 0) return null;
  let north = -Infinity, south = Infinity, east = -Infinity, west = Infinity;
  for (const [lng, lat] of coords) {
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lng < west) west = lng;
  }
  return { north, south, east, west };
}

// ── HERE source label helper ────────────────────────────────────────────────

/** Returns a user-facing label based on the traffic flow source. */
export function trafficSourceLabel(source: string): string {
  if (source === 'HERE') return 'REAL TRAFFIC / HERE';
  if (source === 'SYNTHETIC') return 'DEMO / SYNTHETIC';
  return 'UNKNOWN';
}
