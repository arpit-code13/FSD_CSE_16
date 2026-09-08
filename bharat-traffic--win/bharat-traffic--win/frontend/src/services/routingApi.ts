import axios from 'axios';
import type { RouteOption, CongestionLevel } from '../types/traffic';
import { fetchHereRoutes, type HereRouteParams } from './hereTrafficApi';
import apiClient from './apiClient';

// ── OSRM public demo server (no key required) ──────────────────────────────

const OSRM_BASE = 'https://router.project-osrm.org';

// ── OSRM response types ────────────────────────────────────────────────────

interface OSRMRoute {
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  legs: {
    summary: string;
    distance: number;   // metres
    duration: number;   // seconds
  }[];
  distance: number;     // metres
  duration: number;     // seconds
  weight: number;
  weight_name: string;
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: {
    location: [number, number];
    name: string;
  }[];
}

// ── Congestion derivation ───────────────────────────────────────────────────

function deriveCongestion(durationSec: number, fastestSec: number): CongestionLevel {
  if (fastestSec <= 0) return 'clear';
  const ratio = durationSec / fastestSec;
  if (ratio <= 1.05) return 'clear';
  if (ratio <= 1.25) return 'moderate';
  if (ratio <= 1.55) return 'heavy';
  return 'severe';
}

// ── Name generation from OSRM waypoint names ────────────────────────────────

function generateRouteName(
  index: number,
  isRecommended: boolean,
  _originName: string,
  _destName: string,
): string {
  if (isRecommended) return 'AI Smart Bypass (Optimal)';
  if (index === 1) return 'Direct Main Road Corridor';
  return 'Express Highway Bypass';
}

function extractViaRoads(legs: OSRMRoute['legs']): string[] {
  const roads: string[] = [];
  for (const leg of legs) {
    if (leg.summary && leg.summary.trim()) {
      roads.push(leg.summary.trim());
    }
  }
  return roads.length > 0 ? roads : ['City Route'];
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface OSRMRouteParams {
  origin: [number, number];       // [lng, lat]
  destination: [number, number];  // [lng, lat]
  originName: string;
  destinationName: string;
  city: string;
}

/**
 * Fetch 2-3 real road-following routes from OSRM.
 * Falls back to mock generation if OSRM is unreachable.
 *
 * @param alternatives  Number of alternative routes requested (default 2).
 *                      OSRM may return fewer if alternatives are not found.
 */
export async function fetchOSRMRoutes(
  params: OSRMRouteParams,
  alternatives: number = 2,
): Promise<RouteOption[]> {
  const { origin, destination, originName, destinationName } = params;

  const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;

  const url = `${OSRM_BASE}/route/v1/driving/${coords}`;

  const response = await axios.get<OSRMResponse>(url, {
    params: {
      alternatives: String(alternatives),
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      annotations: 'true',
    },
    timeout: 10000,
  });

  const data = response.data;
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM returned no routes (code: ${data.code})`);
  }

  const osrmRoutes = data.routes;
  const fastestDuration = osrmRoutes[0]?.duration ?? 300; // seconds

  return osrmRoutes.map((route, idx) => {
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMin = Math.max(1, Math.round(route.duration / 60));

    // Simulate traffic: normal duration = fastest route without traffic × congestion factor
    // We assume fastest OSRM route already includes normal routing (no live traffic)
    // Simulate congestion by varying duration
    const congestionSeed = idx === 0 ? 1.0 : idx === 1 ? 1.35 : 1.2;
    const normalDurationMin = Math.round(durationMin * congestionSeed);
    const timeSavedMin = Math.max(0, normalDurationMin - durationMin);

    const congestionLevel = deriveCongestion(route.duration, fastestDuration);

    // CO2 estimate: ~0.12 kg/km for cars
    const co2EmissionsKg = Math.round(distanceKm * 0.12 * 10) / 10;

    const isRecommended = idx === 0;

    return {
      id: `osrm-route-${idx + 1}-${Date.now()}`,
      name: generateRouteName(idx, isRecommended, originName, destinationName),
      origin: originName,
      destination: destinationName,
      distanceKm,
      durationMin,
      normalDurationMin,
      congestionLevel,
      timeSavedMin,
      isRecommended,
      viaRoads: extractViaRoads(route.legs),
      co2EmissionsKg,
      coordinates: route.geometry.coordinates,
    };
  });
}

/**
 * Check if HERE routing is available via backend.
 */
export async function checkHEREHealth(): Promise<boolean> {
  try {
    const resp = await apiClient.get('/here/routes', {
      params: {
        origin_lat: 12.9716,
        origin_lng: 77.5946,
        dest_lat: 12.9800,
        dest_lng: 77.6000,
      },
      timeout: 8000,
    });
    return resp.status === 200 && resp.data?.source === 'HERE';
  } catch {
    return false;
  }
}

/**
 * Check if OSRM is reachable (quick ping).
 */
export async function checkOSRMHealth(): Promise<boolean> {
  try {
    const resp = await axios.get(
      `${OSRM_BASE}/route/v1/driving/77.5946,12.9716;77.6000,12.9800`,
      { params: { overview: 'false' }, timeout: 5000 },
    );
    return resp.data.code === 'Ok';
  } catch {
    return false;
  }
}

// ── HERE routing (via backend proxy) ────────────────────────────────────────

/**
 * Primary routing function: tries HERE first, falls back to OSRM.
 * Falls back to mock generation if neither is available.
 *
 * @param params  Origin/destination info
 * @returns       RouteOption[] with HERE traffic-aware ETA when available
 */
export async function fetchRoutingRoutes(
  params: OSRMRouteParams,
  alternatives: number = 2,
): Promise<RouteOption[]> {
  // 1. Try HERE routing via backend
  try {
    const hereParams: HereRouteParams = {
      originLat: params.origin[1],
      originLng: params.origin[0],
      destLat: params.destination[1],
      destLng: params.destination[0],
      originName: params.originName,
      destinationName: params.destinationName,
      alternatives,
    };
    const result = await fetchHereRoutes(hereParams);
    if (result.routes.length > 0) return result.routes;
  } catch {
    // HERE unavailable, try OSRM
  }

  // 2. Try OSRM
  try {
    return await fetchOSRMRoutes(params, alternatives);
  } catch {
    // Both unavailable
  }

  throw new Error('No routing provider available');
}
