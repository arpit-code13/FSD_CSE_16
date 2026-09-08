// ── Digital Twin Hierarchy Mock Data ──
// City → Zone → Corridor → Road → Intersection → Signal
//
// Bengaluru data remains here for backward compatibility.
// Delhi-NCR, Mumbai, Hyderabad data is in data/cityHierarchyData.ts.
// Use getCityHierarchy(cityName) to get the right data for the selected city.
//
// All data is DEMO/MOCK — source: "MOCK", dataMode: "DEMO"

// ──────────────────────────── ZONES ────────────────────────────
export interface TwinZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  junctionCount: number;
  totalVehicles: number;
  avgSpeed: number;
  avgCongestion: number;
  coordinates: [number, number][]; // bounding box corners for map flyTo
}

export const TWIN_ZONES: TwinZone[] = [
  { id: 'z-south', name: 'South Bengaluru', lat: 12.91, lng: 77.64, zoom: 13, junctionCount: 38, totalVehicles: 14200, avgSpeed: 22, avgCongestion: 72, coordinates: [[77.60, 12.88], [77.68, 12.94]] },
  { id: 'z-central', name: 'Central Bengaluru', lat: 12.97, lng: 77.60, zoom: 14, junctionCount: 42, totalVehicles: 12800, avgSpeed: 28, avgCongestion: 58, coordinates: [[77.58, 12.95], [77.63, 12.99]] },
  { id: 'z-north', name: 'North Bengaluru', lat: 13.04, lng: 77.59, zoom: 13, junctionCount: 28, totalVehicles: 9600, avgSpeed: 19, avgCongestion: 78, coordinates: [[77.56, 13.01], [77.62, 13.07]] },
  { id: 'z-east', name: 'East Bengaluru (ORR)', lat: 12.95, lng: 77.70, zoom: 13, junctionCount: 24, totalVehicles: 8400, avgSpeed: 16, avgCongestion: 84, coordinates: [[77.66, 12.91], [77.74, 12.99]] },
  { id: 'z-west', name: 'West Bengaluru', lat: 12.96, lng: 77.54, zoom: 13, junctionCount: 16, totalVehicles: 3920, avgSpeed: 34, avgCongestion: 35, coordinates: [[77.50, 12.93], [77.58, 12.99]] },
];

// ──────────────────────────── CORRIDORS ────────────────────────────
export interface TwinCorridor {
  id: string;
  name: string;
  zoneId: string;
  lat: number;
  lng: number;
  lengthKm: number;
  junctionCount: number;
  totalVehicles: number;
  avgSpeed: number;
  avgCongestion: number;
  laneCount: number;
  coordinates: [number, number][];
}

export const TWIN_CORRIDORS: TwinCorridor[] = [
  // South
  { id: 'c-orrsouth', name: 'ORR South (Silk Board–Bellandur)', zoneId: 'z-south', lat: 12.92, lng: 77.65, lengthKm: 5.4, junctionCount: 6, totalVehicles: 4200, avgSpeed: 12, avgCongestion: 92, laneCount: 3, coordinates: [[77.6228, 12.9172], [77.6762, 12.9262]] },
  { id: 'c-hosur', name: 'Hosur Road Elevated', zoneId: 'z-south', lat: 12.88, lng: 77.64, lengthKm: 8.5, junctionCount: 4, totalVehicles: 3100, avgSpeed: 34, avgCongestion: 58, laneCount: 4, coordinates: [[77.6228, 12.9172], [77.65, 12.85]] },
  { id: 'c-koramangala', name: 'Koramangala 100ft Road', zoneId: 'z-south', lat: 12.935, lng: 77.625, lengthKm: 3.2, junctionCount: 5, totalVehicles: 1800, avgSpeed: 26, avgCongestion: 48, laneCount: 2, coordinates: [[77.62, 12.93], [77.635, 12.94]] },
  // Central
  { id: 'c-mgroad', name: 'MG Road CBD Corridor', zoneId: 'z-central', lat: 12.973, lng: 77.608, lengthKm: 2.8, junctionCount: 8, totalVehicles: 3200, avgSpeed: 30, avgCongestion: 42, laneCount: 3, coordinates: [[77.605, 12.975], [77.62, 12.97]] },
  { id: 'c-brigade', name: 'Brigade Road–Residency Road', zoneId: 'z-central', lat: 12.971, lng: 77.601, lengthKm: 1.8, junctionCount: 6, totalVehicles: 2400, avgSpeed: 22, avgCongestion: 55, laneCount: 2, coordinates: [[77.598, 12.968], [77.612, 12.974]] },
  { id: 'c-stmark', name: 'St. Mark\'s Road–Vasanth Nagar', zoneId: 'z-central', lat: 12.978, lng: 77.605, lengthKm: 2.1, junctionCount: 5, totalVehicles: 1600, avgSpeed: 32, avgCongestion: 38, laneCount: 2, coordinates: [[77.598, 12.976], [77.614, 12.98]] },
  // North
  { id: 'c-hebbal', name: 'Hebbal Flyover–Ballari Road', zoneId: 'z-north', lat: 13.035, lng: 77.597, lengthKm: 7.2, junctionCount: 5, totalVehicles: 4800, avgSpeed: 10, avgCongestion: 95, laneCount: 4, coordinates: [[77.59, 13.01], [77.605, 13.06]] },
  { id: 'c-airport', name: 'Airport Road–Hennur Main Rd', zoneId: 'z-north', lat: 13.02, lng: 77.61, lengthKm: 4.5, junctionCount: 4, totalVehicles: 2200, avgSpeed: 24, avgCongestion: 62, laneCount: 3, coordinates: [[77.595, 13.005], [77.62, 13.04]] },
  // East
  { id: 'c-orreast', name: 'ORR East (Bellandur–Marathahalli)', zoneId: 'z-east', lat: 12.94, lng: 77.69, lengthKm: 4.2, junctionCount: 5, totalVehicles: 3800, avgSpeed: 14, avgCongestion: 85, laneCount: 3, coordinates: [[77.6762, 12.9262], [77.7011, 12.9569]] },
  { id: 'c-whitefield', name: 'Whitefield Main Road', zoneId: 'z-east', lat: 12.97, lng: 77.75, lengthKm: 5.1, junctionCount: 4, totalVehicles: 2600, avgSpeed: 18, avgCongestion: 72, laneCount: 3, coordinates: [[77.72, 12.95], [77.77, 12.98]] },
  // West
  { id: 'c-mysore', name: 'Mysore Road Elevated', zoneId: 'z-west', lat: 12.96, lng: 77.53, lengthKm: 6.8, junctionCount: 4, totalVehicles: 2100, avgSpeed: 38, avgCongestion: 30, laneCount: 4, coordinates: [[77.56, 12.95], [77.50, 12.97]] },
];

// ──────────────────────────── ROADS ────────────────────────────
export interface TwinRoad {
  id: string;
  name: string;
  corridorId: string;
  lengthKm: number;
  laneCount: number;
  totalVehicles: number;
  avgSpeed: number;
  density: number;
  congestion: number;
  status: 'Gridlock' | 'Heavy Congestion' | 'Slow Traffic' | 'Clear';
  coordinates: [number, number][];
}

export const TWIN_ROADS: TwinRoad[] = [
  // ORR South
  { id: 'r-orr1', name: 'Silk Board → Ecospace Flyover', corridorId: 'c-orrsouth', lengthKm: 2.1, laneCount: 3, totalVehicles: 1800, avgSpeed: 8, density: 165, congestion: 95, status: 'Gridlock', coordinates: [[77.6228, 12.9172], [77.6408, 12.922]] },
  { id: 'r-orr2', name: 'Ecospace → Bellandur Junction', corridorId: 'c-orrsouth', lengthKm: 3.3, laneCount: 3, totalVehicles: 2400, avgSpeed: 14, density: 128, congestion: 88, status: 'Heavy Congestion', coordinates: [[77.6408, 12.922], [77.6762, 12.9262]] },
  // Hosur Road
  { id: 'r-hosur1', name: 'Silk Board Ramp → Bommanahalli', corridorId: 'c-hosur', lengthKm: 3.5, laneCount: 4, totalVehicles: 1600, avgSpeed: 38, density: 72, congestion: 48, status: 'Slow Traffic', coordinates: [[77.6228, 12.9172], [77.635, 12.885]] },
  { id: 'r-hosur2', name: 'Bommanahalli → Electronic City', corridorId: 'c-hosur', lengthKm: 5.0, laneCount: 4, totalVehicles: 1500, avgSpeed: 42, density: 55, congestion: 32, status: 'Clear', coordinates: [[77.635, 12.885], [77.65, 12.85]] },
  // Koramangala
  { id: 'r-kora1', name: 'Koramangala 5th Block → BTM Layout', corridorId: 'c-koramangala', lengthKm: 1.8, laneCount: 2, totalVehicles: 950, avgSpeed: 22, density: 88, congestion: 55, status: 'Slow Traffic', coordinates: [[77.62, 12.93], [77.628, 12.938]] },
  { id: 'r-kora2', name: 'BTM Layout 2nd Stage → HSR', corridorId: 'c-koramangala', lengthKm: 1.4, laneCount: 2, totalVehicles: 850, avgSpeed: 30, density: 62, congestion: 40, status: 'Clear', coordinates: [[77.628, 12.938], [77.635, 12.94]] },
  // MG Road
  { id: 'r-mg1', name: 'Trinity Circle → MG Road Metro', corridorId: 'c-mgroad', lengthKm: 1.2, laneCount: 3, totalVehicles: 1400, avgSpeed: 28, density: 72, congestion: 45, status: 'Slow Traffic', coordinates: [[77.605, 12.975], [77.613, 12.972]] },
  { id: 'r-mg2', name: 'MG Road Metro → Brigade Road Junction', corridorId: 'c-mgroad', lengthKm: 1.6, laneCount: 3, totalVehicles: 1800, avgSpeed: 32, density: 58, congestion: 38, status: 'Clear', coordinates: [[77.613, 12.972], [77.62, 12.97]] },
  // Hebbal
  { id: 'r-heb1', name: 'Hebbal Flyover Entry → Jain Housing', corridorId: 'c-hebbal', lengthKm: 3.2, laneCount: 4, totalVehicles: 2600, avgSpeed: 8, density: 172, congestion: 97, status: 'Gridlock', coordinates: [[77.59, 13.01], [77.597, 13.0359]] },
  { id: 'r-heb2', name: 'Jain Housing → Yelahanka Cross', corridorId: 'c-hebbal', lengthKm: 4.0, laneCount: 4, totalVehicles: 2200, avgSpeed: 12, density: 142, congestion: 88, status: 'Heavy Congestion', coordinates: [[77.597, 13.0359], [77.605, 13.06]] },
  // ORR East
  { id: 'r-orre1', name: 'Bellandur Lake → Janadarshan Appartments', corridorId: 'c-orreast', lengthKm: 2.2, laneCount: 3, totalVehicles: 2000, avgSpeed: 12, density: 138, congestion: 88, status: 'Heavy Congestion', coordinates: [[77.6762, 12.9262], [77.688, 12.94]] },
  { id: 'r-orre2', name: 'Innovative Multiplex → Marathahalli Bridge', corridorId: 'c-orreast', lengthKm: 2.0, laneCount: 3, totalVehicles: 1800, avgSpeed: 16, density: 118, congestion: 82, status: 'Heavy Congestion', coordinates: [[77.688, 12.94], [77.7011, 12.9569]] },
  // Whitefield
  { id: 'r-wf1', name: 'ITPL Main Road → Hope Farm', corridorId: 'c-whitefield', lengthKm: 2.8, laneCount: 3, totalVehicles: 1500, avgSpeed: 16, density: 92, congestion: 75, status: 'Heavy Congestion', coordinates: [[77.72, 12.95], [77.748, 12.965]] },
  { id: 'r-wf2', name: 'Hope Farm → Varthur Kodi', corridorId: 'c-whitefield', lengthKm: 2.3, laneCount: 3, totalVehicles: 1100, avgSpeed: 22, density: 72, congestion: 65, status: 'Slow Traffic', coordinates: [[77.748, 12.965], [77.77, 12.98]] },
  // Mysore Road
  { id: 'r-mys1', name: 'Kengeri → Bidadi', corridorId: 'c-mysore', lengthKm: 3.8, laneCount: 4, totalVehicles: 1200, avgSpeed: 42, density: 42, congestion: 25, status: 'Clear', coordinates: [[77.56, 12.95], [77.53, 12.96]] },
  { id: 'r-mys2', name: 'Bidadi → Ramanagara Approach', corridorId: 'c-mysore', lengthKm: 3.0, laneCount: 4, totalVehicles: 900, avgSpeed: 48, density: 32, congestion: 18, status: 'Clear', coordinates: [[77.53, 12.96], [77.50, 12.97]] },
];

// ──────────────────────────── INTERSECTIONS ────────────────────────────
export interface TwinIntersection {
  id: string;
  name: string;
  roadId: string;
  lat: number;
  lng: number;
  vehicleCount: number;
  queueLength: number;
  waitTime: number;
  congestion: number;
  signalMode: 'adaptive' | 'manual' | 'emergency' | 'fixed';
  activePhase: string;
  cycleLength: number;
}

export const TWIN_INTERSECTIONS: TwinIntersection[] = [
  // ORR South
  { id: 'ix-01', name: 'Silk Board Junction', roadId: 'r-orr1', lat: 12.9172, lng: 77.6228, vehicleCount: 1420, queueLength: 850, waitTime: 195, congestion: 92, signalMode: 'adaptive', activePhase: 'North-South Arterial Green', cycleLength: 180 },
  { id: 'ix-02', name: 'Ecospace Flyover Junction', roadId: 'r-orr1', lat: 12.922, lng: 77.6408, vehicleCount: 980, queueLength: 520, waitTime: 130, congestion: 78, signalMode: 'adaptive', activePhase: 'Eastbound Corridor', cycleLength: 140 },
  { id: 'ix-03', name: 'Bellandur Junction', roadId: 'r-orr2', lat: 12.9262, lng: 77.6762, vehicleCount: 1350, queueLength: 720, waitTime: 165, congestion: 85, signalMode: 'adaptive', activePhase: 'ORR South Transit', cycleLength: 160 },
  // Hosur Road
  { id: 'ix-04', name: 'Bommanahalli Signal', roadId: 'r-hosur1', lat: 12.885, lng: 77.635, vehicleCount: 620, queueLength: 280, waitTime: 75, congestion: 48, signalMode: 'adaptive', activePhase: 'Standard Phase A', cycleLength: 100 },
  { id: 'ix-05', name: 'Electronic City Phase 1', roadId: 'r-hosur2', lat: 12.85, lng: 77.65, vehicleCount: 480, queueLength: 180, waitTime: 55, congestion: 32, signalMode: 'fixed', activePhase: 'Fixed Plan B', cycleLength: 90 },
  // Koramangala
  { id: 'ix-06', name: 'Koramangala 5th Block Signal', roadId: 'r-kora1', lat: 12.93, lng: 77.62, vehicleCount: 520, queueLength: 310, waitTime: 85, congestion: 55, signalMode: 'adaptive', activePhase: 'Westbound Green', cycleLength: 110 },
  { id: 'ix-07', name: 'BTM Layout Junction', roadId: 'r-kora1', lat: 12.938, lng: 77.628, vehicleCount: 430, queueLength: 220, waitTime: 65, congestion: 45, signalMode: 'adaptive', activePhase: 'North-South Phase', cycleLength: 100 },
  // MG Road
  { id: 'ix-08', name: 'Trinity Circle', roadId: 'r-mg1', lat: 12.975, lng: 77.605, vehicleCount: 680, queueLength: 320, waitTime: 72, congestion: 42, signalMode: 'adaptive', activePhase: 'CBD Westbound Flow', cycleLength: 90 },
  { id: 'ix-09', name: 'MG Road Junction', roadId: 'r-mg1', lat: 12.972, lng: 77.613, vehicleCount: 580, queueLength: 260, waitTime: 58, congestion: 35, signalMode: 'adaptive', activePhase: 'East-West Transit', cycleLength: 85 },
  { id: 'ix-10', name: 'Brigade Road Junction', roadId: 'r-mg2', lat: 12.97, lng: 77.62, vehicleCount: 520, queueLength: 200, waitTime: 48, congestion: 30, signalMode: 'fixed', activePhase: 'Pedestrian Phase', cycleLength: 80 },
  // Hebbal
  { id: 'ix-11', name: 'Hebbal Flyover Junction', roadId: 'r-heb1', lat: 13.01, lng: 77.59, vehicleCount: 2200, queueLength: 1100, waitTime: 210, congestion: 95, signalMode: 'emergency', activePhase: 'Green Corridor Override', cycleLength: 200 },
  { id: 'ix-12', name: 'Yelahanka Cross', roadId: 'r-heb2', lat: 13.06, lng: 77.605, vehicleCount: 1100, queueLength: 580, waitTime: 140, congestion: 78, signalMode: 'adaptive', activePhase: 'Northbound Priority', cycleLength: 150 },
  // ORR East
  { id: 'ix-13', name: 'Marathahalli Bridge Junction', roadId: 'r-orre2', lat: 12.9569, lng: 77.7011, vehicleCount: 1150, queueLength: 620, waitTime: 160, congestion: 85, signalMode: 'adaptive', activePhase: 'ORR East Transit', cycleLength: 160 },
  // Whitefield
  { id: 'ix-14', name: 'Hope Farm Junction', roadId: 'r-wf1', lat: 12.965, lng: 77.748, vehicleCount: 780, queueLength: 420, waitTime: 110, congestion: 72, signalMode: 'adaptive', activePhase: 'ITPL Approach', cycleLength: 130 },
  // Mysore Road
  { id: 'ix-15', name: 'Kengeri Junction', roadId: 'r-mys1', lat: 12.95, lng: 77.56, vehicleCount: 380, queueLength: 140, waitTime: 42, congestion: 22, signalMode: 'adaptive', activePhase: 'Free Flow', cycleLength: 75 },
];

// ──────────────────────────── SIGNALS ────────────────────────────
export interface TwinSignalPhase {
  name: string;
  durationSec: number;
  isGreen: boolean;
}

export interface TwinSignal {
  intersectionId: string;
  mode: 'adaptive' | 'manual' | 'emergency' | 'fixed';
  activePhaseIndex: number;
  cycleLengthSec: number;
  phases: TwinSignalPhase[];
}

export const TWIN_SIGNALS: TwinSignal[] = [
  { intersectionId: 'ix-01', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 180, phases: [
    { name: 'North-South Arterial Green', durationSec: 75, isGreen: true },
    { name: 'East-West Transit', durationSec: 55, isGreen: false },
    { name: 'Pedestrian Crossing', durationSec: 30, isGreen: false },
    { name: 'Right Turn Protected', durationSec: 20, isGreen: false },
  ]},
  { intersectionId: 'ix-02', mode: 'adaptive', activePhaseIndex: 1, cycleLengthSec: 140, phases: [
    { name: 'North-South Standard', durationSec: 50, isGreen: false },
    { name: 'Eastbound Corridor', durationSec: 60, isGreen: true },
    { name: 'Pedestrian Phase', durationSec: 30, isGreen: false },
  ]},
  { intersectionId: 'ix-03', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 160, phases: [
    { name: 'ORR South Transit', durationSec: 70, isGreen: true },
    { name: 'ORR East Approach', durationSec: 55, isGreen: false },
    { name: 'Service Road', durationSec: 35, isGreen: false },
  ]},
  { intersectionId: 'ix-08', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 90, phases: [
    { name: 'CBD Westbound Flow', durationSec: 40, isGreen: true },
    { name: 'CBD Eastbound Return', durationSec: 35, isGreen: false },
    { name: 'Pedestrian Phase', durationSec: 15, isGreen: false },
  ]},
  { intersectionId: 'ix-11', mode: 'emergency', activePhaseIndex: 0, cycleLengthSec: 200, phases: [
    { name: 'Green Corridor Override', durationSec: 200, isGreen: true },
  ]},
  { intersectionId: 'ix-13', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 160, phases: [
    { name: 'ORR East Transit', durationSec: 65, isGreen: true },
    { name: 'ORR South Approach', durationSec: 55, isGreen: false },
    { name: 'Marathahalli Local', durationSec: 40, isGreen: false },
  ]},
];

// ──────────────────────────── HELPER FUNCTIONS ────────────────────────────

export function getCorridorsForZone(zoneId: string): TwinCorridor[] {
  return TWIN_CORRIDORS.filter((c) => c.zoneId === zoneId);
}

export function getRoadsForCorridor(corridorId: string): TwinRoad[] {
  return TWIN_ROADS.filter((r) => r.corridorId === corridorId);
}

export function getIntersectionsForRoad(roadId: string): TwinIntersection[] {
  return TWIN_INTERSECTIONS.filter((ix) => ix.roadId === roadId);
}

export function getSignalForIntersection(intersectionId: string): TwinSignal | undefined {
  return TWIN_SIGNALS.find((s) => s.intersectionId === intersectionId);
}

export function getZoneById(id: string): TwinZone | undefined {
  return TWIN_ZONES.find((z) => z.id === id);
}

export function getCorridorById(id: string): TwinCorridor | undefined {
  return TWIN_CORRIDORS.find((c) => c.id === id);
}

export function getRoadById(id: string): TwinRoad | undefined {
  return TWIN_ROADS.find((r) => r.id === id);
}

export function getIntersectionById(id: string): TwinIntersection | undefined {
  return TWIN_INTERSECTIONS.find((ix) => ix.id === id);
}

// ──────────────────────────── CITY PROVIDER ────────────────────────────
// Returns the correct data arrays for any supported city.
// Bengaluru returns the static arrays above; other cities return from cityHierarchyData.ts.

import { getCityHierarchy } from '../data/cityHierarchyData';

/**
 * Get the complete city hierarchy for the given city name.
 * Falls back to Bengaluru data if the city is not found.
 */
export function getCityTwinData(cityName: string): {
  zones: TwinZone[];
  corridors: TwinCorridor[];
  roads: TwinRoad[];
  intersections: TwinIntersection[];
  signals: TwinSignal[];
} {
  const hierarchy = getCityHierarchy(cityName);
  if (hierarchy) {
    return hierarchy;
  }
  // Fallback: Bengaluru (existing data)
  return {
    zones: TWIN_ZONES,
    corridors: TWIN_CORRIDORS,
    roads: TWIN_ROADS,
    intersections: TWIN_INTERSECTIONS,
    signals: TWIN_SIGNALS,
  };
}
