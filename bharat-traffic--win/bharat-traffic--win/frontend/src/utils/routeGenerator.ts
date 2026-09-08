import type { RouteOption, CongestionLevel } from '../types/traffic';
import { fetchOSRMRoutes } from '../services/routingApi';

// ── Seeded pseudo-random for deterministic results per origin+dest ────────

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ── Coordinate helpers ─────────────────────────────────────────────────────

function distKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) *
      Math.cos((b[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin), Math.sqrt(1 - sin));
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function offsetPoint(
  pt: [number, number],
  offsetKm: number,
  angleDeg: number,
): [number, number] {
  const dLat = (offsetKm / 111) * Math.cos((angleDeg * Math.PI) / 180);
  const dLng =
    (offsetKm / (111 * Math.cos((pt[1] * Math.PI) / 180))) *
    Math.sin((angleDeg * Math.PI) / 180);
  return [pt[0] + dLng, pt[1] + dLat];
}

// ── Route shape generators ─────────────────────────────────────────────────

function straightPath(
  origin: [number, number],
  dest: [number, number],
): [number, number][] {
  const n = 5;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([origin[0] + (dest[0] - origin[0]) * t, origin[1] + (dest[1] - origin[1]) * t]);
  }
  return pts;
}

function detourPath(
  origin: [number, number],
  dest: [number, number],
  deviationKm: number,
  seed: string,
): [number, number][] {
  const mid = midpoint(origin, dest);
  const rng = seededRandom(seed + '-detour');
  const angle = rng() * 360;
  const devPt = offsetPoint(mid, deviationKm, angle);
  const pts: [number, number][] = [];
  // Quadratic Bézier with 3 control points
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * origin[0] + 2 * u * t * devPt[0] + t * t * dest[0],
      u * u * origin[1] + 2 * u * t * devPt[1] + t * t * dest[1],
    ]);
  }
  return pts;
}

// ── Route definitions ──────────────────────────────────────────────────────

interface RouteBlueprint {
  name: string;
  viaRoads: string[];
  distanceMultiplier: number;       // relative to straight-line
  etaMultiplier: number;            // relative to base ETA (distance / avg speed)
  congestionLevel: CongestionLevel;
  isRecommended: boolean;
  normalDurationFactor: number;     // compared to this route's duration
  co2Factor: number;
  deviationKm: number;
  detourOffsetKm: number;
}

const BLUEPRINTS: RouteBlueprint[] = [
  {
    name: 'AI Smart Bypass (Optimal)',
    viaRoads: ['AI-Optimized Ring Route', 'Signal-Free Corridor', 'Dynamic Expressway Link'],
    distanceMultiplier: 1.0,
    etaMultiplier: 1.0,
    congestionLevel: 'clear',
    isRecommended: true,
    normalDurationFactor: 1.6,
    co2Factor: 1.0,
    deviationKm: 1.2,
    detourOffsetKm: 2.0,
  },
  {
    name: 'Direct Main Road Corridor',
    viaRoads: ['Main Arterial Road', 'City Bypass Highway'],
    distanceMultiplier: 0.92,
    etaMultiplier: 1.45,
    congestionLevel: 'heavy',
    isRecommended: false,
    normalDurationFactor: 1.0,
    co2Factor: 1.5,
    deviationKm: 0.5,
    detourOffsetKm: 0.8,
  },
  {
    name: 'Express Highway Bypass',
    viaRoads: ['Outer Ring Expressway', 'Suburban Connector Link'],
    distanceMultiplier: 1.2,
    etaMultiplier: 1.15,
    congestionLevel: 'moderate',
    isRecommended: false,
    normalDurationFactor: 1.35,
    co2Factor: 1.3,
    deviationKm: 2.5,
    detourOffsetKm: 3.5,
  },
];

const ROAD_PREFIXES: Record<string, string[]> = {
  Bengaluru: ['Outer Ring Rd', 'Hosur Rd', 'Bellandur Main Rd', 'Varthur Rd', 'HAL Old Airport Rd', 'Marathahalli Bridge', 'ORR Service Rd', 'ITPL Main Rd'],
  'Delhi-NCR': ['Ring Rd', 'NH-48', 'Gurgaon Expressway', 'Dhaula Kuan', 'Vasant Kunj Marg', 'Mehrauli-Gurgaon Rd', 'NFCT Flyover', 'Dwarka Expressway'],
  Mumbai: ['Western Express Hwy', 'Eastern Freeway', 'SCLR Flyover', 'BKC Connector', 'Bandra-Worli Sea Link', 'SV Road', 'Linking Road', 'Andheri Kurla Rd'],
  Hyderabad: ['ORR Corridor', 'HITECH City Main Rd', 'Jubilee Hills Rd', 'Begumpet Rd', 'Cyber Towers Rd', 'Gachibowli Flyover', 'Mindspace Junction Rd', 'PVNR Expressway'],
};

function pickViaRoads(seed: string, city: string): string[] {
  const pool = ROAD_PREFIXES[city] || ROAD_PREFIXES['Bengaluru'];
  const rng = seededRandom(seed + '-roads');
  const count = 2 + Math.floor(rng() * 2);
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface GenerateRoutesParams {
  origin: [number, number];   // [lng, lat]
  destination: [number, number];
  originName: string;
  destinationName: string;
  city: string;
}

/**
 * Try OSRM first; fall back to mock Bezier-route generation on failure.
 */
export async function generateRoutes(params: GenerateRoutesParams): Promise<RouteOption[]> {
  // ── 1. Attempt real OSRM routing ─────────────────────────────────────
  try {
    const osrmRoutes = await fetchOSRMRoutes(params);
    if (osrmRoutes.length > 0) return osrmRoutes;
  } catch {
    // OSRM unavailable — fall through to mock
  }

  // ── 2. Mock fallback ─────────────────────────────────────────────────
  return generateMockRoutes(params);
}

// ── Mock route generator (Bezier detour paths) ──────────────────────────────

function generateMockRoutes(params: GenerateRoutesParams): RouteOption[] {
  const { origin, destination, originName, destinationName, city } = params;
  const straightDist = distKm(origin, destination);
  const seed = `${originName}::${destinationName}`;
  const rng = seededRandom(seed);

  // Base speed assumption: 28 km/h in city traffic
  const baseSpeedKmh = 28;

  return BLUEPRINTS.map((bp, idx) => {
    const dist = straightDist * bp.distanceMultiplier + (rng() * 2 - 1) * 0.5;
    const finalDist = Math.max(1.5, Math.round(dist * 10) / 10);
    const eta = Math.round((finalDist / baseSpeedKmh) * 60 * bp.etaMultiplier);
    const normalEta = Math.round(eta * bp.normalDurationFactor);
    const timeSaved = Math.max(0, normalEta - eta);
    const co2 = Math.round(finalDist * bp.co2Factor * (0.1 + rng() * 0.05) * 10) / 10;
    const roads = pickViaRoads(seed + idx, city);

    // Generate coordinates
    const coords =
      idx === 0
        ? straightPath(origin, destination)
        : detourPath(origin, destination, bp.detourOffsetKm, seed + idx);

    return {
      id: `dynamic-route-${idx + 1}-${Date.now()}`,
      name: bp.name,
      origin: originName,
      destination: destinationName,
      distanceKm: finalDist,
      durationMin: Math.max(5, eta),
      normalDurationMin: Math.max(5, normalEta),
      congestionLevel: bp.congestionLevel,
      timeSavedMin: timeSaved,
      isRecommended: bp.isRecommended,
      viaRoads: roads,
      co2EmissionsKg: Math.max(0.3, co2),
      coordinates: coords,
    };
  });
}

/**
 * Score a route for best-route recommendation.
 * Lower is better: weighted sum of normalized ETA and congestion.
 */
export function routeScore(route: RouteOption): number {
  const congestionWeight: Record<CongestionLevel, number> = {
    clear: 0.0,
    moderate: 0.35,
    heavy: 0.7,
    severe: 1.0,
  };
  // ETA normalized: 0 = best, 1 = worst
  const maxEta = route.normalDurationMin || 60;
  const etaNorm = Math.min(1, route.durationMin / maxEta);
  const congNorm = congestionWeight[route.congestionLevel] ?? 0.5;
  return etaNorm * 0.6 + congNorm * 0.4;
}
