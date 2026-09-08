// ── City Hierarchy Data Provider ──
// Deterministic mock data for Digital Twin, Signal Optimization, and What-If Scenarios
// All data is DEMO/MOCK — not live traffic data.
// Designed for replacement with HERE Traffic API / PostgreSQL+PostGIS later.

import type {
  TwinZone,
  TwinCorridor,
  TwinRoad,
  TwinIntersection,
  TwinSignal,
} from '../mock/mockTwinHierarchy';

// ── City Hierarchy Bundle ──
export interface CityHierarchy {
  zones: TwinZone[];
  corridors: TwinCorridor[];
  roads: TwinRoad[];
  intersections: TwinIntersection[];
  signals: TwinSignal[];
}

// ══════════════════════════════════════════════════════════════════════════
// DELHI-NCR — DEMO DATA (source: "MOCK")
// ══════════════════════════════════════════════════════════════════════════

const DELHI_ZONES: TwinZone[] = [
  { id: 'z-dl-central', name: 'Central Delhi', lat: 28.63, lng: 77.22, zoom: 13, junctionCount: 38, totalVehicles: 12800, avgSpeed: 18, avgCongestion: 82, coordinates: [[77.19, 28.60], [77.25, 28.66]] },
  { id: 'z-dl-south', name: 'South Delhi', lat: 28.52, lng: 77.21, zoom: 13, junctionCount: 35, totalVehicles: 11200, avgSpeed: 22, avgCongestion: 68, coordinates: [[77.18, 28.48], [77.25, 28.57]] },
  { id: 'z-dl-north', name: 'North Delhi', lat: 28.70, lng: 77.21, zoom: 13, junctionCount: 32, totalVehicles: 10600, avgSpeed: 17, avgCongestion: 76, coordinates: [[77.17, 28.67], [77.24, 28.73]] },
  { id: 'z-dl-east', name: 'East Delhi', lat: 28.64, lng: 77.29, zoom: 13, junctionCount: 34, totalVehicles: 11800, avgSpeed: 20, avgCongestion: 81, coordinates: [[77.25, 28.60], [77.33, 28.67]] },
  { id: 'z-dl-west', name: 'West Delhi', lat: 28.65, lng: 77.10, zoom: 13, junctionCount: 28, totalVehicles: 9200, avgSpeed: 24, avgCongestion: 61, coordinates: [[77.06, 28.62], [77.14, 28.68]] },
  { id: 'z-dl-ncr', name: 'Delhi-NCR (Noida-Gurugram)', lat: 28.50, lng: 77.12, zoom: 12, junctionCount: 18, totalVehicles: 6800, avgSpeed: 21, avgCongestion: 73, coordinates: [[77.02, 28.42], [77.35, 28.58]] },
];

const DELHI_CORRIDORS: TwinCorridor[] = [
  // Central Delhi
  { id: 'c-dl-ring', name: 'Ring Road (AIIMS – Dhaula Kuan)', zoneId: 'z-dl-central', lat: 28.58, lng: 77.19, lengthKm: 8.5, junctionCount: 8, totalVehicles: 4200, avgSpeed: 14, avgCongestion: 88, laneCount: 4, coordinates: [[77.2100, 28.5672], [77.1650, 28.5920]] },
  { id: 'c-dl-mathura', name: 'Mathura Road (ITO – Badarpur)', zoneId: 'z-dl-central', lat: 28.61, lng: 77.26, lengthKm: 7.2, junctionCount: 6, totalVehicles: 3600, avgSpeed: 16, avgCongestion: 85, laneCount: 4, coordinates: [[77.2420, 28.6290], [77.2900, 28.5800]] },
  { id: 'c-dl-cp', name: 'Connaught Place – Janpath Circuit', zoneId: 'z-dl-central', lat: 28.63, lng: 77.22, lengthKm: 2.8, junctionCount: 5, totalVehicles: 1800, avgSpeed: 12, avgCongestion: 78, laneCount: 2, coordinates: [[77.2167, 28.6315], [77.2280, 28.6340]] },
  // South Delhi
  { id: 'c-dl-ashram', name: 'Ashram Chowk – AIIMS Corridor', zoneId: 'z-dl-south', lat: 28.56, lng: 77.24, lengthKm: 5.6, junctionCount: 5, totalVehicles: 2800, avgSpeed: 18, avgCongestion: 75, laneCount: 3, coordinates: [[77.2100, 28.5672], [77.2500, 28.5700]] },
  { id: 'c-dl-nelson', name: 'Nelson Mandela Marg (Vasant Kunj)', zoneId: 'z-dl-south', lat: 28.50, lng: 77.14, lengthKm: 6.2, junctionCount: 4, totalVehicles: 1600, avgSpeed: 28, avgCongestion: 55, laneCount: 3, coordinates: [[77.1550, 28.5250], [77.1200, 28.4800]] },
  // North Delhi
  { id: 'c-dl-kashmere', name: 'Kashmere Gate – ISBT Corridor', zoneId: 'z-dl-north', lat: 28.67, lng: 77.23, lengthKm: 4.8, junctionCount: 5, totalVehicles: 3200, avgSpeed: 15, avgCongestion: 82, laneCount: 3, coordinates: [[77.2280, 28.6670], [77.2350, 28.7000]] },
  { id: 'c-dl-rohini', name: 'Rohini – Outer Ring Road North', zoneId: 'z-dl-north', lat: 28.74, lng: 77.11, lengthKm: 5.8, junctionCount: 4, totalVehicles: 2200, avgSpeed: 32, avgCongestion: 45, laneCount: 4, coordinates: [[77.1000, 28.7200], [77.1200, 28.7700]] },
  // East Delhi
  { id: 'c-dl-dnd', name: 'DND Flyway (Mayur Vihar – Noida)', zoneId: 'z-dl-east', lat: 28.57, lng: 77.29, lengthKm: 5.4, junctionCount: 3, totalVehicles: 2600, avgSpeed: 24, avgCongestion: 72, laneCount: 4, coordinates: [[77.2796, 28.5684], [77.3261, 28.5708]] },
  { id: 'c-dl-anand', name: 'Anand Vihar – Akshardham Corridor', zoneId: 'z-dl-east', lat: 28.62, lng: 77.30, lengthKm: 6.5, junctionCount: 5, totalVehicles: 2800, avgSpeed: 18, avgCongestion: 78, laneCount: 3, coordinates: [[77.2900, 28.6150], [77.3100, 28.6450]] },
  // West Delhi
  { id: 'c-dl-nh48', name: 'NH-48 (Delhi-Gurgaon Expressway)', zoneId: 'z-dl-west', lat: 28.52, lng: 77.10, lengthKm: 10.2, junctionCount: 4, totalVehicles: 3400, avgSpeed: 22, avgCongestion: 68, laneCount: 6, coordinates: [[77.1650, 28.5920], [77.0725, 28.4721]] },
  { id: 'c-dl-karol', name: 'Karol Bagh – Rajouri Garden Link', zoneId: 'z-dl-west', lat: 28.65, lng: 77.13, lengthKm: 4.2, junctionCount: 4, totalVehicles: 2000, avgSpeed: 20, avgCongestion: 62, laneCount: 3, coordinates: [[77.1907, 28.6514], [77.1221, 28.6492]] },
];

const DELHI_ROADS: TwinRoad[] = [
  // Ring Road
  { id: 'r-dl-ring1', name: 'AIIMS Flyover → Dhaula Kuan', corridorId: 'c-dl-ring', lengthKm: 4.2, laneCount: 4, totalVehicles: 2400, avgSpeed: 12, density: 145, congestion: 92, status: 'Gridlock', coordinates: [[77.2100, 28.5672], [77.1850, 28.5800], [77.1650, 28.5920]] },
  { id: 'r-dl-ring2', name: 'Dhaula Kuan → ITO Junction', corridorId: 'c-dl-ring', lengthKm: 4.3, laneCount: 4, totalVehicles: 1800, avgSpeed: 16, density: 112, congestion: 84, status: 'Heavy Congestion', coordinates: [[77.1650, 28.5920], [77.2000, 28.6100], [77.2420, 28.6290]] },
  // Mathura Road
  { id: 'r-dl-math1', name: 'ITO → Pragati Maidan', corridorId: 'c-dl-mathura', lengthKm: 2.8, laneCount: 4, totalVehicles: 1600, avgSpeed: 14, density: 128, congestion: 88, status: 'Heavy Congestion', coordinates: [[77.2420, 28.6290], [77.2500, 28.6150]] },
  { id: 'r-dl-math2', name: 'Pragati Maidan → Badarpur Border', corridorId: 'c-dl-mathura', lengthKm: 4.4, laneCount: 4, totalVehicles: 2000, avgSpeed: 18, density: 95, congestion: 78, status: 'Heavy Congestion', coordinates: [[77.2500, 28.6150], [77.2750, 28.5950], [77.2900, 28.5800]] },
  // CP Circuit
  { id: 'r-dl-cp1', name: 'Janpath → Barakhamba Road', corridorId: 'c-dl-cp', lengthKm: 1.2, laneCount: 2, totalVehicles: 980, avgSpeed: 10, density: 145, congestion: 82, status: 'Heavy Congestion', coordinates: [[77.2167, 28.6315], [77.2220, 28.6330]] },
  { id: 'r-dl-cp2', name: 'Barakhamba → Connaught Place Circle', corridorId: 'c-dl-cp', lengthKm: 1.6, laneCount: 2, totalVehicles: 820, avgSpeed: 14, density: 88, congestion: 72, status: 'Slow Traffic', coordinates: [[77.2220, 28.6330], [77.2280, 28.6340]] },
  // Ashram
  { id: 'r-dl-ash1', name: 'AIIMS Ring Road → Ashram Chowk', corridorId: 'c-dl-ashram', lengthKm: 3.2, laneCount: 3, totalVehicles: 1600, avgSpeed: 16, density: 110, congestion: 78, status: 'Heavy Congestion', coordinates: [[77.2100, 28.5672], [77.2350, 28.5700], [77.2500, 28.5700]] },
  { id: 'r-dl-ash2', name: 'Ashram Chowk → Lajpat Nagar', corridorId: 'c-dl-ashram', lengthKm: 2.4, laneCount: 3, totalVehicles: 1200, avgSpeed: 20, density: 85, congestion: 68, status: 'Slow Traffic', coordinates: [[77.2500, 28.5700], [77.2430, 28.5700]] },
  // Nelson Mandela Marg
  { id: 'r-dl-nm1', name: 'Vasant Kunj → Mehrauli', corridorId: 'c-dl-nelson', lengthKm: 3.4, laneCount: 3, totalVehicles: 880, avgSpeed: 30, density: 52, congestion: 48, status: 'Slow Traffic', coordinates: [[77.1550, 28.5250], [77.1400, 28.5050]] },
  { id: 'r-dl-nm2', name: 'Mehrauli → Gurgaon Border', corridorId: 'c-dl-nelson', lengthKm: 2.8, laneCount: 3, totalVehicles: 720, avgSpeed: 35, density: 42, congestion: 38, status: 'Clear', coordinates: [[77.1400, 28.5050], [77.1200, 28.4800]] },
  // Kashmere Gate
  { id: 'r-dl-kash1', name: 'ISBT Kashmere Gate → Signature Bridge', corridorId: 'c-dl-kashmere', lengthKm: 2.6, laneCount: 3, totalVehicles: 1800, avgSpeed: 14, density: 120, congestion: 85, status: 'Heavy Congestion', coordinates: [[77.2280, 28.6670], [77.2320, 28.6850]] },
  { id: 'r-dl-kash2', name: 'Signature Bridge → Wazirabad', corridorId: 'c-dl-kashmere', lengthKm: 2.2, laneCount: 3, totalVehicles: 1400, avgSpeed: 18, density: 95, congestion: 72, status: 'Slow Traffic', coordinates: [[77.2320, 28.6850], [77.2350, 28.7000]] },
  // DND Flyway
  { id: 'r-dl-dnd1', name: 'Mayur Vihar → DND Toll Plaza', corridorId: 'c-dl-dnd', lengthKm: 2.8, laneCount: 4, totalVehicles: 1600, avgSpeed: 22, density: 88, congestion: 75, status: 'Heavy Congestion', coordinates: [[77.2796, 28.5684], [77.3050, 28.5700]] },
  { id: 'r-dl-dnd2', name: 'DND Toll → Noida Sector 18', corridorId: 'c-dl-dnd', lengthKm: 2.6, laneCount: 4, totalVehicles: 1000, avgSpeed: 28, density: 62, congestion: 58, status: 'Slow Traffic', coordinates: [[77.3050, 28.5700], [77.3261, 28.5708]] },
  // NH-48
  { id: 'r-dl-nh1', name: 'Dhaula Kuan → Gurgaon Toll', corridorId: 'c-dl-nh48', lengthKm: 5.8, laneCount: 6, totalVehicles: 2200, avgSpeed: 20, density: 85, congestion: 72, status: 'Heavy Congestion', coordinates: [[77.1650, 28.5920], [77.1250, 28.5400], [77.0850, 28.4900]] },
  { id: 'r-dl-nh2', name: 'Gurgaon Toll → Dwarka Expressway', corridorId: 'c-dl-nh48', lengthKm: 4.4, laneCount: 6, totalVehicles: 1200, avgSpeed: 28, density: 55, congestion: 52, status: 'Slow Traffic', coordinates: [[77.0850, 28.4900], [77.0725, 28.4721]] },
  // Anand Vihar
  { id: 'r-dl-anv1', name: 'Anand Vihar ISBT → Akshardham', corridorId: 'c-dl-anand', lengthKm: 3.8, laneCount: 3, totalVehicles: 1800, avgSpeed: 16, density: 105, congestion: 80, status: 'Heavy Congestion', coordinates: [[77.2900, 28.6150], [77.3000, 28.6280], [77.3100, 28.6450]] },
  { id: 'r-dl-anv2', name: 'Akshardham → Noida Link Road', corridorId: 'c-dl-anand', lengthKm: 2.7, laneCount: 3, totalVehicles: 1000, avgSpeed: 22, density: 68, congestion: 65, status: 'Slow Traffic', coordinates: [[77.3100, 28.6450], [77.3200, 28.6550]] },
  // Karol Bagh
  { id: 'r-dl-kar1', name: 'Karol Bagh Main → Rajouri Garden', corridorId: 'c-dl-karol', lengthKm: 2.4, laneCount: 3, totalVehicles: 1200, avgSpeed: 18, density: 88, congestion: 65, status: 'Slow Traffic', coordinates: [[77.1907, 28.6514], [77.1550, 28.6500], [77.1221, 28.6492]] },
  { id: 'r-dl-kar2', name: 'Rajouri Garden → Punjabi Bagh', corridorId: 'c-dl-karol', lengthKm: 1.8, laneCount: 3, totalVehicles: 800, avgSpeed: 24, density: 62, congestion: 52, status: 'Slow Traffic', coordinates: [[77.1221, 28.6492], [77.1100, 28.6580]] },
];

const DELHI_INTERSECTIONS: TwinIntersection[] = [
  // Ring Road
  { id: 'ix-dl-01', name: 'ITO Junction', roadId: 'r-dl-ring2', lat: 28.6280, lng: 77.2410, vehicleCount: 2200, queueLength: 980, waitTime: 240, congestion: 90, signalMode: 'adaptive', activePhase: 'Ring Road N-S Green', cycleLength: 200 },
  { id: 'ix-dl-02', name: 'Dhaula Kuan Interchange', roadId: 'r-dl-ring1', lat: 28.5920, lng: 77.1650, vehicleCount: 1800, queueLength: 820, waitTime: 185, congestion: 86, signalMode: 'adaptive', activePhase: 'NH-48 Priority', cycleLength: 180 },
  { id: 'ix-dl-03', name: 'AIIMS Ring Road Flyover', roadId: 'r-dl-ring1', lat: 28.5672, lng: 77.2100, vehicleCount: 2400, queueLength: 1100, waitTime: 265, congestion: 94, signalMode: 'adaptive', activePhase: 'Ring Road S-Bound', cycleLength: 220 },
  // Mathura Road
  { id: 'ix-dl-04', name: 'Pragati Maidan Junction', roadId: 'r-dl-math1', lat: 28.6150, lng: 77.2500, vehicleCount: 1400, queueLength: 680, waitTime: 155, congestion: 82, signalMode: 'adaptive', activePhase: 'Mathura Rd E-Bound', cycleLength: 160 },
  { id: 'ix-dl-05', name: 'Badarpur Border Junction', roadId: 'r-dl-math2', lat: 28.5800, lng: 77.2900, vehicleCount: 1200, queueLength: 520, waitTime: 130, congestion: 75, signalMode: 'adaptive', activePhase: 'Mathura Rd Through', cycleLength: 150 },
  // CP Circuit
  { id: 'ix-dl-06', name: 'Connaught Place Outer Circle', roadId: 'r-dl-cp2', lat: 28.6315, lng: 77.2167, vehicleCount: 1100, queueLength: 480, waitTime: 120, congestion: 72, signalMode: 'adaptive', activePhase: 'Janpath–Barakhamba', cycleLength: 130 },
  // Ashram
  { id: 'ix-dl-07', name: 'Ashram Chowk', roadId: 'r-dl-ash1', lat: 28.5700, lng: 77.2500, vehicleCount: 1600, queueLength: 720, waitTime: 170, congestion: 78, signalMode: 'adaptive', activePhase: 'Ring Rd–Mathura Rd', cycleLength: 170 },
  { id: 'ix-dl-08', name: 'Lajpat Nagar Junction', roadId: 'r-dl-ash2', lat: 28.5700, lng: 77.2430, vehicleCount: 980, queueLength: 420, waitTime: 95, congestion: 65, signalMode: 'adaptive', activePhase: 'Ring Rd Transit', cycleLength: 120 },
  // Nelson Mandela Marg
  { id: 'ix-dl-09', name: 'Vasant Kunj Junction', roadId: 'r-dl-nm1', lat: 28.5250, lng: 77.1550, vehicleCount: 680, queueLength: 280, waitTime: 72, congestion: 52, signalMode: 'adaptive', activePhase: 'N-S Arterial', cycleLength: 110 },
  // Kashmere Gate
  { id: 'ix-dl-10', name: 'Kashmere Gate ISBT Junction', roadId: 'r-dl-kash1', lat: 28.6670, lng: 77.2280, vehicleCount: 1800, queueLength: 850, waitTime: 200, congestion: 85, signalMode: 'adaptive', activePhase: 'ISBT Approach', cycleLength: 190 },
  { id: 'ix-dl-11', name: 'Signature Bridge Junction', roadId: 'r-dl-kash1', lat: 28.6850, lng: 77.2320, vehicleCount: 1100, queueLength: 480, waitTime: 110, congestion: 72, signalMode: 'adaptive', activePhase: 'Ring Rd North', cycleLength: 140 },
  // DND Flyway
  { id: 'ix-dl-12', name: 'DND Toll Plaza', roadId: 'r-dl-dnd1', lat: 28.5684, lng: 77.2796, vehicleCount: 1600, queueLength: 920, waitTime: 210, congestion: 88, signalMode: 'adaptive', activePhase: 'Noida Approach', cycleLength: 180 },
  { id: 'ix-dl-13', name: 'Noida Sector 18 Underpass', roadId: 'r-dl-dnd2', lat: 28.5708, lng: 77.3261, vehicleCount: 680, queueLength: 220, waitTime: 55, congestion: 38, signalMode: 'fixed', activePhase: 'Free Flow', cycleLength: 90 },
  // NH-48
  { id: 'ix-dl-14', name: 'Gurgaon IFFCO Chowk', roadId: 'r-dl-nh1', lat: 28.4721, lng: 77.0725, vehicleCount: 1400, queueLength: 780, waitTime: 180, congestion: 84, signalMode: 'adaptive', activePhase: 'NH-48 Main Green', cycleLength: 170 },
  // Rohini
  { id: 'ix-dl-15', name: 'Rohini Sector 18 Junction', roadId: 'r-dl-kash2', lat: 28.7400, lng: 77.1100, vehicleCount: 580, queueLength: 220, waitTime: 55, congestion: 42, signalMode: 'adaptive', activePhase: 'ORR Free Flow', cycleLength: 100 },
  // Anand Vihar
  { id: 'ix-dl-16', name: 'Anand Vihar ISBT Junction', roadId: 'r-dl-anv1', lat: 28.6150, lng: 77.2900, vehicleCount: 1200, queueLength: 580, waitTime: 140, congestion: 78, signalMode: 'adaptive', activePhase: 'NH-24 Priority', cycleLength: 160 },
  { id: 'ix-dl-17', name: 'Akshardham Temple Junction', roadId: 'r-dl-anv1', lat: 28.6450, lng: 77.3100, vehicleCount: 980, queueLength: 420, waitTime: 100, congestion: 68, signalMode: 'adaptive', activePhase: 'Ring Rd Transit', cycleLength: 130 },
  // Karol Bagh
  { id: 'ix-dl-18', name: 'Karol Bagh Main Junction', roadId: 'r-dl-kar1', lat: 28.6514, lng: 77.1907, vehicleCount: 880, queueLength: 380, waitTime: 90, congestion: 62, signalMode: 'adaptive', activePhase: 'Rohtak Rd Green', cycleLength: 120 },
  { id: 'ix-dl-19', name: 'Rajouri Garden Roundabout', roadId: 'r-dl-kar1', lat: 28.6492, lng: 77.1221, vehicleCount: 780, queueLength: 320, waitTime: 78, congestion: 55, signalMode: 'adaptive', activePhase: 'N-S Transit', cycleLength: 110 },
  // Additional junctions for realism
  { id: 'ix-dl-20', name: 'Chandni Chowk Junction', roadId: 'r-dl-cp1', lat: 28.6507, lng: 77.2303, vehicleCount: 1150, queueLength: 520, waitTime: 135, congestion: 80, signalMode: 'fixed', activePhase: 'Main Bazaar Green', cycleLength: 150 },
  { id: 'ix-dl-21', name: 'Saket District Centre', roadId: 'r-dl-ash2', lat: 28.5220, lng: 77.2080, vehicleCount: 620, queueLength: 240, waitTime: 58, congestion: 45, signalMode: 'adaptive', activePhase: 'Mehrauli Rd', cycleLength: 100 },
  { id: 'ix-dl-22', name: 'Pitampura TV Tower Junction', roadId: 'r-dl-kar2', lat: 28.7025, lng: 77.1325, vehicleCount: 520, queueLength: 180, waitTime: 45, congestion: 38, signalMode: 'adaptive', activePhase: 'Outer Ring Rd', cycleLength: 95 },
];

const DELHI_SIGNALS: TwinSignal[] = [
  { intersectionId: 'ix-dl-01', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 200, phases: [
    { name: 'Ring Road N-S Green', durationSec: 85, isGreen: true },
    { name: 'Mathura Rd E-W', durationSec: 65, isGreen: false },
    { name: 'Pragati Maidan Approach', durationSec: 35, isGreen: false },
    { name: 'Pedestrian Phase', durationSec: 15, isGreen: false },
  ]},
  { intersectionId: 'ix-dl-03', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 220, phases: [
    { name: 'Ring Road S-Bound', durationSec: 95, isGreen: true },
    { name: 'Aurobindo Marg N-Bound', durationSec: 70, isGreen: false },
    { name: 'Safdarjung Entry', durationSec: 40, isGreen: false },
    { name: 'Pedestrian Underpass', durationSec: 15, isGreen: false },
  ]},
  { intersectionId: 'ix-dl-06', mode: 'adaptive', activePhaseIndex: 1, cycleLengthSec: 130, phases: [
    { name: 'Janpath–Barakhamba', durationSec: 45, isGreen: false },
    { name: 'Radial Road South', durationSec: 40, isGreen: true },
    { name: 'Pedestrian + Rickshaw', durationSec: 35, isGreen: false },
    { name: 'All-Red Clearance', durationSec: 10, isGreen: false },
  ]},
  { intersectionId: 'ix-dl-12', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 180, phases: [
    { name: 'Noida Approach', durationSec: 75, isGreen: true },
    { name: 'Delhi Approach', durationSec: 55, isGreen: false },
    { name: 'Toll Collection', durationSec: 30, isGreen: false },
    { name: 'Pedestrian', durationSec: 20, isGreen: false },
  ]},
  { intersectionId: 'ix-dl-14', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 170, phases: [
    { name: 'NH-48 Main Green', durationSec: 70, isGreen: true },
    { name: 'Sector Approach', durationSec: 50, isGreen: false },
    { name: 'Pedestrian Phase', durationSec: 30, isGreen: false },
    { name: 'All-Red', durationSec: 20, isGreen: false },
  ]},
  { intersectionId: 'ix-dl-20', mode: 'fixed', activePhaseIndex: 0, cycleLengthSec: 150, phases: [
    { name: 'Main Bazaar Green', durationSec: 60, isGreen: true },
    { name: 'Lahori Gate', durationSec: 45, isGreen: false },
    { name: 'Red Fort Approach', durationSec: 30, isGreen: false },
    { name: 'Pedestrian + E-Rickshaw', durationSec: 15, isGreen: false },
  ]},
];

export const DELHI_HIERARCHY: CityHierarchy = {
  zones: DELHI_ZONES,
  corridors: DELHI_CORRIDORS,
  roads: DELHI_ROADS,
  intersections: DELHI_INTERSECTIONS,
  signals: DELHI_SIGNALS,
};

// ══════════════════════════════════════════════════════════════════════════
// MUMBAI — DEMO DATA (source: "MOCK")
// ══════════════════════════════════════════════════════════════════════════

const MUMBAI_ZONES: TwinZone[] = [
  { id: 'z-mum-south', name: 'South Mumbai', lat: 18.94, lng: 72.83, zoom: 13, junctionCount: 32, totalVehicles: 10800, avgSpeed: 16, avgCongestion: 78, coordinates: [[72.81, 18.91], [72.85, 18.96]] },
  { id: 'z-mum-central', name: 'Central Mumbai', lat: 19.02, lng: 72.85, zoom: 13, junctionCount: 38, totalVehicles: 14200, avgSpeed: 18, avgCongestion: 82, coordinates: [[72.83, 19.00], [72.87, 19.04]] },
  { id: 'z-mum-west', name: 'Western Suburbs', lat: 19.12, lng: 72.84, zoom: 13, junctionCount: 35, totalVehicles: 12600, avgSpeed: 20, avgCongestion: 75, coordinates: [[72.82, 19.08], [72.87, 19.14]] },
  { id: 'z-mum-east', name: 'Eastern Suburbs', lat: 19.08, lng: 72.90, zoom: 13, junctionCount: 28, totalVehicles: 9800, avgSpeed: 22, avgCongestion: 68, coordinates: [[72.87, 19.05], [72.93, 19.11]] },
];

const MUMBAI_CORRIDORS: TwinCorridor[] = [
  { id: 'c-mum-weh', name: 'Western Express Highway', zoneId: 'z-mum-west', lat: 19.12, lng: 72.85, lengthKm: 8.5, junctionCount: 6, totalVehicles: 4800, avgSpeed: 12, avgCongestion: 92, laneCount: 4, coordinates: [[72.8464, 19.1197], [72.8530, 19.0600]] },
  { id: 'c-mum-sealink', name: 'Bandra-Worli Sea Link', zoneId: 'z-mum-central', lat: 19.03, lng: 72.82, lengthKm: 5.6, junctionCount: 2, totalVehicles: 1800, avgSpeed: 55, avgCongestion: 35, laneCount: 4, coordinates: [[72.8350, 19.0500], [72.8150, 19.0050]] },
  { id: 'c-mum-sclr', name: 'SCLR Flyover (BKC–Chembur)', zoneId: 'z-mum-east', lat: 19.07, lng: 72.88, lengthKm: 4.2, junctionCount: 4, totalVehicles: 2200, avgSpeed: 28, avgCongestion: 58, laneCount: 3, coordinates: [[72.8530, 19.0600], [72.8800, 19.0880]] },
  { id: 'c-mum-sv', name: 'SV Road (Andheri–Bandra)', zoneId: 'z-mum-west', lat: 19.11, lng: 72.84, lengthKm: 6.8, junctionCount: 8, totalVehicles: 3200, avgSpeed: 14, avgCongestion: 82, laneCount: 3, coordinates: [[72.8350, 19.1300], [72.8450, 19.0900]] },
];

const MUMBAI_ROADS: TwinRoad[] = [
  { id: 'r-mum-weh1', name: 'Andheri Subway → BKC Junction', corridorId: 'c-mum-weh', lengthKm: 4.5, laneCount: 4, totalVehicles: 2600, avgSpeed: 10, density: 160, congestion: 95, status: 'Gridlock', coordinates: [[72.8464, 19.1197], [72.8500, 19.0900], [72.8530, 19.0600]] },
  { id: 'r-mum-seal1', name: 'Bandra Entry → Worli Exit', corridorId: 'c-mum-sealink', lengthKm: 5.6, laneCount: 4, totalVehicles: 1800, avgSpeed: 55, density: 42, congestion: 35, status: 'Clear', coordinates: [[72.8350, 19.0500], [72.8250, 19.0330], [72.8150, 19.0050]] },
  { id: 'r-mum-sv1', name: 'Andheri West → Bandra West', corridorId: 'c-mum-sv', lengthKm: 3.8, laneCount: 3, totalVehicles: 1800, avgSpeed: 12, density: 120, congestion: 85, status: 'Heavy Congestion', coordinates: [[72.8350, 19.1300], [72.8400, 19.1100], [72.8450, 19.0900]] },
];

const MUMBAI_INTERSECTIONS: TwinIntersection[] = [
  { id: 'ix-mum-01', name: 'Bandra-Worli Sea Link Toll', roadId: 'r-mum-seal1', lat: 19.0330, lng: 72.8170, vehicleCount: 1200, queueLength: 680, waitTime: 165, congestion: 88, signalMode: 'adaptive', activePhase: 'Sea Link Transit', cycleLength: 160 },
  { id: 'ix-mum-02', name: 'BKC Kalanagar Junction', roadId: 'r-mum-weh1', lat: 19.0600, lng: 72.8530, vehicleCount: 1800, queueLength: 920, waitTime: 210, congestion: 92, signalMode: 'adaptive', activePhase: 'WEH N-Bound', cycleLength: 180 },
  { id: 'ix-mum-03', name: 'Dadar TT Circle', roadId: 'r-mum-weh1', lat: 19.0178, lng: 72.8478, vehicleCount: 1100, queueLength: 480, waitTime: 110, congestion: 68, signalMode: 'adaptive', activePhase: 'Matunga Link', cycleLength: 130 },
  { id: 'ix-mum-04', name: 'Andheri Subway Junction', roadId: 'r-mum-weh1', lat: 19.1197, lng: 72.8464, vehicleCount: 1600, queueLength: 850, waitTime: 195, congestion: 90, signalMode: 'adaptive', activePhase: 'WEH S-Bound', cycleLength: 170 },
  { id: 'ix-mum-05', name: 'SV Road Linking Road Junction', roadId: 'r-mum-sv1', lat: 19.0600, lng: 72.8300, vehicleCount: 880, queueLength: 380, waitTime: 88, congestion: 62, signalMode: 'adaptive', activePhase: 'SV Road Transit', cycleLength: 120 },
];

const MUMBAI_SIGNALS: TwinSignal[] = [
  { intersectionId: 'ix-mum-02', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 180, phases: [
    { name: 'WEH N-Bound', durationSec: 75, isGreen: true },
    { name: 'WEH S-Bound', durationSec: 55, isGreen: false },
    { name: 'BKC Connector', durationSec: 35, isGreen: false },
    { name: 'Pedestrian', durationSec: 15, isGreen: false },
  ]},
  { intersectionId: 'ix-mum-04', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 170, phases: [
    { name: 'WEH S-Bound', durationSec: 70, isGreen: true },
    { name: 'WEH N-Bound', durationSec: 55, isGreen: false },
    { name: 'Local Roads', durationSec: 30, isGreen: false },
    { name: 'All-Red', durationSec: 15, isGreen: false },
  ]},
];

export const MUMBAI_HIERARCHY: CityHierarchy = {
  zones: MUMBAI_ZONES,
  corridors: MUMBAI_CORRIDORS,
  roads: MUMBAI_ROADS,
  intersections: MUMBAI_INTERSECTIONS,
  signals: MUMBAI_SIGNALS,
};

// ══════════════════════════════════════════════════════════════════════════
// HYDERABAD — DEMO DATA (source: "MOCK")
// ══════════════════════════════════════════════════════════════════════════

const HYD_ZONES: TwinZone[] = [
  { id: 'z-hyd-hitec', name: 'HITECH City / Gachibowli', lat: 17.44, lng: 78.38, zoom: 13, junctionCount: 28, totalVehicles: 9200, avgSpeed: 14, avgCongestion: 85, coordinates: [[78.34, 17.42], [78.40, 17.46]] },
  { id: 'z-hyd-central', name: 'Central Hyderabad', lat: 17.40, lng: 78.47, zoom: 13, junctionCount: 32, totalVehicles: 10800, avgSpeed: 18, avgCongestion: 72, coordinates: [[78.44, 17.37], [78.50, 17.43]] },
  { id: 'z-hyd-north', name: 'Secunderabad / Begumpet', lat: 17.44, lng: 78.50, zoom: 13, junctionCount: 22, totalVehicles: 7400, avgSpeed: 22, avgCongestion: 62, coordinates: [[78.47, 17.42], [78.52, 17.46]] },
  { id: 'z-hyd-south', name: 'Charminar / Old City', lat: 17.36, lng: 78.47, zoom: 13, junctionCount: 18, totalVehicles: 5200, avgSpeed: 16, avgCongestion: 55, coordinates: [[78.45, 17.34], [78.49, 17.38]] },
];

const HYD_CORRIDORS: TwinCorridor[] = [
  { id: 'c-hyd-hitec', name: 'HITECH City Main Arterial', zoneId: 'z-hyd-hitec', lat: 17.45, lng: 78.38, lengthKm: 4.8, junctionCount: 5, totalVehicles: 3200, avgSpeed: 12, avgCongestion: 90, laneCount: 3, coordinates: [[78.3615, 17.4401], [78.3808, 17.4504], [78.4072, 17.4319]] },
  { id: 'c-hyd-orr', name: 'Outer Ring Road (Gachibowli–Shamshabad)', zoneId: 'z-hyd-hitec', lat: 17.38, lng: 78.40, lengthKm: 12.5, junctionCount: 3, totalVehicles: 1800, avgSpeed: 85, avgCongestion: 22, laneCount: 6, coordinates: [[78.3615, 17.4401], [78.4000, 17.3200], [78.4200, 17.2500]] },
  { id: 'c-hyd-mg', name: 'MG Road – Abids Corridor', zoneId: 'z-hyd-central', lat: 17.39, lng: 78.47, lengthKm: 3.2, junctionCount: 5, totalVehicles: 2400, avgSpeed: 16, avgCongestion: 75, laneCount: 2, coordinates: [[78.4700, 17.3900], [78.4867, 17.3850]] },
  { id: 'c-hyd-necklace', name: 'Necklace Road (Tank Bund)', zoneId: 'z-hyd-north', lat: 17.42, lng: 78.46, lengthKm: 3.8, junctionCount: 4, totalVehicles: 1600, avgSpeed: 28, avgCongestion: 48, laneCount: 3, coordinates: [[78.4700, 17.4200], [78.4550, 17.4350]] },
];

const HYD_ROADS: TwinRoad[] = [
  { id: 'r-hyd-hitec1', name: 'Cyber Towers → Mindspace Junction', corridorId: 'c-hyd-hitec', lengthKm: 2.4, laneCount: 3, totalVehicles: 1800, avgSpeed: 10, density: 142, congestion: 92, status: 'Gridlock', coordinates: [[78.3808, 17.4504], [78.3950, 17.4420], [78.4072, 17.4319]] },
  { id: 'r-hyd-orr1', name: 'Gachibowli Flyover → Shamshabad Exit', corridorId: 'c-hyd-orr', lengthKm: 8.2, laneCount: 6, totalVehicles: 1200, avgSpeed: 88, density: 22, congestion: 18, status: 'Clear', coordinates: [[78.3615, 17.4401], [78.3800, 17.3800], [78.4200, 17.2500]] },
  { id: 'r-hyd-mg1', name: 'MG Road Main → Abids Junction', corridorId: 'c-hyd-mg', lengthKm: 1.8, laneCount: 2, totalVehicles: 1400, avgSpeed: 14, density: 125, congestion: 78, status: 'Heavy Congestion', coordinates: [[78.4700, 17.3900], [78.4780, 17.3880], [78.4867, 17.3850]] },
];

const HYD_INTERSECTIONS: TwinIntersection[] = [
  { id: 'ix-hyd-01', name: 'HITECH City Cyber Towers', roadId: 'r-hyd-hitec1', lat: 17.4504, lng: 78.3808, vehicleCount: 1520, queueLength: 780, waitTime: 185, congestion: 91, signalMode: 'adaptive', activePhase: 'HITECH Main Green', cycleLength: 180 },
  { id: 'ix-hyd-02', name: 'Gachibowli Bio-Diversity Flyover', roadId: 'r-hyd-orr1', lat: 17.4401, lng: 78.3615, vehicleCount: 1100, queueLength: 520, waitTime: 125, congestion: 82, signalMode: 'adaptive', activePhase: 'ORR Transit', cycleLength: 160 },
  { id: 'ix-hyd-03', name: 'Jubilee Hills Checkpost', roadId: 'r-hyd-hitec1', lat: 17.4319, lng: 78.4072, vehicleCount: 1200, queueLength: 620, waitTime: 145, congestion: 85, signalMode: 'adaptive', activePhase: 'Road No. 36', cycleLength: 170 },
  { id: 'ix-hyd-04', name: 'MG Road – Abids Junction', roadId: 'r-hyd-mg1', lat: 17.3850, lng: 78.4867, vehicleCount: 880, queueLength: 380, waitTime: 92, congestion: 68, signalMode: 'adaptive', activePhase: 'MG Rd Transit', cycleLength: 120 },
  { id: 'ix-hyd-05', name: 'Charminar Heritage Plaza', roadId: 'r-hyd-mg1', lat: 17.3616, lng: 78.4747, vehicleCount: 520, queueLength: 220, waitTime: 55, congestion: 38, signalMode: 'fixed', activePhase: 'Pedestrian Priority', cycleLength: 100 },
];

const HYD_SIGNALS: TwinSignal[] = [
  { intersectionId: 'ix-hyd-01', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 180, phases: [
    { name: 'HITECH Main Green', durationSec: 75, isGreen: true },
    { name: 'Financial District Link', durationSec: 55, isGreen: false },
    { name: 'Pedestrian Phase', durationSec: 30, isGreen: false },
    { name: 'All-Red', durationSec: 20, isGreen: false },
  ]},
  { intersectionId: 'ix-hyd-02', mode: 'adaptive', activePhaseIndex: 0, cycleLengthSec: 160, phases: [
    { name: 'ORR Transit', durationSec: 70, isGreen: true },
    { name: 'Gachibowli Local', durationSec: 50, isGreen: false },
    { name: 'Service Road', durationSec: 30, isGreen: false },
    { name: 'All-Red', durationSec: 10, isGreen: false },
  ]},
];

export const HYDERABAD_HIERARCHY: CityHierarchy = {
  zones: HYD_ZONES,
  corridors: HYD_CORRIDORS,
  roads: HYD_ROADS,
  intersections: HYD_INTERSECTIONS,
  signals: HYD_SIGNALS,
};

// ══════════════════════════════════════════════════════════════════════════
// PROVIDER FUNCTION
// ══════════════════════════════════════════════════════════════════════════

const HIERARCHY_MAP: Record<string, CityHierarchy> = {
  'Bengaluru': null as any, // Handled by existing mockTwinHierarchy (backward compat)
  'Delhi-NCR': DELHI_HIERARCHY,
  'Mumbai': MUMBAI_HIERARCHY,
  'Hyderabad': HYDERABAD_HIERARCHY,
};

/**
 * Get the complete city hierarchy for Digital Twin, Signal Optimization, and What-If.
 * For Bengaluru, returns null (callers should fall back to existing mockTwinHierarchy data).
 * For Delhi-NCR, Mumbai, Hyderabad — returns the new hierarchy.
 *
 * @param cityName - The city name from the app selector
 * @returns CityHierarchy or null for Bengaluru
 */
export function getCityHierarchy(cityName: string): CityHierarchy | null {
  return HIERARCHY_MAP[cityName] || null;
}

/**
 * Get Delhi-specific data directly (for What-If scenarios, Emergency corridors, etc.)
 */
export function getDelhiData() {
  return DELHI_HIERARCHY;
}

// ── Delhi What-If Scenarios ──

export interface DelhiWhatIfScenario {
  id: string;
  name: string;
  description: string;
  junctions: string[];
  beforeSpeed: number;
  afterSpeed: number;
  beforeQueue: number;
  afterQueue: number;
  beforeCongestion: number;
  afterCongestion: number;
  timeSavedMin?: number;
  etaBeforeMin?: number;
  etaAfterMin?: number;
  signalsToPrioritize?: string[];
  label: string; // "SIMULATION / DEMO RESULT" or "SIMULATED EMERGENCY CORRIDOR" etc.
}

export const DELHI_WHATIF_SCENARIOS: DelhiWhatIfScenario[] = [
  {
    id: 'del-ws-01',
    name: 'Increase ITO Green Time',
    description: 'Extend ITO Junction green phase from 42s to 55s to flush Ring Road queue',
    junctions: ['ITO Junction'],
    beforeSpeed: 14,
    afterSpeed: 19,
    beforeQueue: 950,
    afterQueue: 690,
    beforeCongestion: 88,
    afterCongestion: 74,
    label: 'SIMULATION / DEMO RESULT',
  },
  {
    id: 'del-ws-02',
    name: 'Peak Hour Signal Coordination',
    description: 'Coordinate signal timing across ITO → Dhaula Kuan → AIIMS → Ashram Chowk corridor',
    junctions: ['ITO Junction', 'Dhaula Kuan Interchange', 'AIIMS Ring Road Flyover', 'Ashram Chowk'],
    beforeSpeed: 16,
    afterSpeed: 21,
    beforeQueue: 2800,
    afterQueue: 2100,
    beforeCongestion: 84,
    afterCongestion: 69,
    label: 'SIMULATION / DEMO RESULT',
  },
  {
    id: 'del-ws-03',
    name: 'Emergency Corridor — AIIMS to ITO',
    description: 'Create green-wave emergency corridor: AIIMS → Ring Road → ITO for trauma response',
    junctions: ['AIIMS Ring Road Flyover', 'Ashram Chowk', 'ITO Junction'],
    beforeSpeed: 14,
    afterSpeed: 28,
    beforeQueue: 950,
    afterQueue: 180,
    beforeCongestion: 88,
    afterCongestion: 45,
    timeSavedMin: 6,
    etaBeforeMin: 22,
    etaAfterMin: 16,
    signalsToPrioritize: ['AIIMS Ring Road Flyover', 'Ashram Chowk', 'ITO Junction'],
    label: 'SIMULATED EMERGENCY CORRIDOR',
  },
  {
    id: 'del-ws-04',
    name: 'Heavy Rain Traffic Scenario',
    description: 'Simulate heavy monsoon rain: +20% traffic volume, -25% speed, +15% congestion, +30% queue',
    junctions: ['ITO Junction', 'AIIMS Ring Road Flyover', 'Dhaula Kuan Interchange', 'Ashram Chowk', 'DND Toll Plaza'],
    beforeSpeed: 21,
    afterSpeed: 16,
    beforeQueue: 3200,
    afterQueue: 4160,
    beforeCongestion: 72,
    afterCongestion: 87,
    label: 'SIMULATION / DEMO RESULT',
  },
  {
    id: 'del-ws-05',
    name: 'Road Closure — ITO Ring Road Segment',
    description: 'Simulate closure of ITO → Ring Road segment for emergency repairs. Show rerouted traffic impact.',
    junctions: ['ITO Junction', 'Dhaula Kuan Interchange', 'Pragati Maidan Junction'],
    beforeSpeed: 21,
    afterSpeed: 14,
    beforeQueue: 3200,
    afterQueue: 4800,
    beforeCongestion: 72,
    afterCongestion: 88,
    label: 'SIMULATED ROAD CLOSURE',
  },
];

// ── Delhi Emergency Corridors ──

export interface DelhiEmergencyCorridor {
  id: string;
  vehicleType: 'ambulance' | 'fire_brigade' | 'police' | 'vvip';
  vehicleCallsign: string;
  title: string;
  origin: string;
  originLat: number;
  originLng: number;
  destination: string;
  destLat: number;
  destLng: number;
  distanceKm: number;
  normalEtaMin: number;
  emergencyEtaMin: number;
  timeSavedMin: number;
  viaRoads: string[];
  coordinates: [number, number][];
  coordinatedSignals: Array<{
    junctionName: string;
    distanceFromOriginKm: number;
    normalPhase: string;
    emergencyPhase: string;
    phaseDurationSec: number;
  }>;
  status: 'idle' | 'simulated' | 'approved' | 'active';
}

export const DELHI_EMERGENCY_CORRIDORS: DelhiEmergencyCorridor[] = [
  {
    id: 'del-ec-01',
    vehicleType: 'ambulance',
    vehicleCallsign: 'MEDIC-DL-07',
    title: 'Cardiac Emergency — AIIMS Trauma Centre',
    origin: 'ITO Junction',
    originLat: 28.6280,
    originLng: 77.2410,
    destination: 'AIIMS Emergency Trauma Centre',
    destLat: 28.5672,
    destLng: 77.2100,
    distanceKm: 8.2,
    normalEtaMin: 28,
    emergencyEtaMin: 11,
    timeSavedMin: 17,
    viaRoads: ['Ring Road South', 'Aurobindo Marg', 'AIIMS Flyover'],
    coordinates: [[77.2410, 28.6280], [77.2200, 28.6000], [77.2100, 28.5672]],
    coordinatedSignals: [
      { junctionName: 'ITO Junction', distanceFromOriginKm: 0, normalPhase: 'Ring Road N-S Green', emergencyPhase: 'Green Override (S)', phaseDurationSec: 30 },
      { junctionName: 'Dhaula Kuan Interchange', distanceFromOriginKm: 3.8, normalPhase: 'NH-48 Priority', emergencyPhase: 'Green Override (Ring Rd)', phaseDurationSec: 25 },
      { junctionName: 'AIIMS Ring Road Flyover', distanceFromOriginKm: 7.5, normalPhase: 'Ring Road S-Bound', emergencyPhase: 'Green Override (All)', phaseDurationSec: 20 },
    ],
    status: 'simulated',
  },
  {
    id: 'del-ec-02',
    vehicleType: 'fire_brigade',
    vehicleCallsign: 'ENGINE-DL-03',
    title: 'Fire Emergency — Karol Bagh Market',
    origin: 'Rajouri Garden Fire Station',
    originLat: 28.6492,
    originLng: 77.1221,
    destination: 'Karol Bagh Main Market',
    destLat: 28.6514,
    destLng: 77.1907,
    distanceKm: 6.8,
    normalEtaMin: 25,
    emergencyEtaMin: 9,
    timeSavedMin: 16,
    viaRoads: ['Rohtak Road', 'Patel Road', 'Karol Bagh Main'],
    coordinates: [[77.1221, 28.6492], [77.1500, 28.6500], [77.1907, 28.6514]],
    coordinatedSignals: [
      { junctionName: 'Rajouri Garden Roundabout', distanceFromOriginKm: 0, normalPhase: 'N-S Transit', emergencyPhase: 'Green Override (E)', phaseDurationSec: 25 },
      { junctionName: 'Karol Bagh Main Junction', distanceFromOriginKm: 6.2, normalPhase: 'Rohtak Rd Green', emergencyPhase: 'Green Override (All)', phaseDurationSec: 20 },
    ],
    status: 'idle',
  },
  {
    id: 'del-ec-03',
    vehicleType: 'ambulance',
    vehicleCallsign: 'MEDIC-DL-12',
    title: 'Trauma Case — Multi-vehicle Accident on NH-48',
    origin: 'Gurgaon IFFCO Chowk',
    originLat: 28.4721,
    originLng: 77.0725,
    destination: 'Safdarjung Hospital, Delhi',
    destLat: 28.5672,
    destLng: 77.2080,
    distanceKm: 18.5,
    normalEtaMin: 55,
    emergencyEtaMin: 22,
    timeSavedMin: 33,
    viaRoads: ['NH-48 North', 'Dhaula Kuan', 'Ring Road East', 'Safdarjung Enclave'],
    coordinates: [[77.0725, 28.4721], [77.1250, 28.5400], [77.1650, 28.5920], [77.2080, 28.5672]],
    coordinatedSignals: [
      { junctionName: 'Gurgaon IFFCO Chowk', distanceFromOriginKm: 0, normalPhase: 'NH-48 Main Green', emergencyPhase: 'Green Override (N)', phaseDurationSec: 35 },
      { junctionName: 'Dhaula Kuan Interchange', distanceFromOriginKm: 12.0, normalPhase: 'NH-48 Priority', emergencyPhase: 'Green Override (Ring Rd)', phaseDurationSec: 30 },
      { junctionName: 'AIIMS Ring Road Flyover', distanceFromOriginKm: 16.5, normalPhase: 'Ring Road S-Bound', emergencyPhase: 'Green Override (All)', phaseDurationSec: 25 },
    ],
    status: 'idle',
  },
  {
    id: 'del-ec-04',
    vehicleType: 'police',
    vehicleCallsign: 'ECHO-DL-02',
    title: 'VIP Security Escort — Rashtrapati Bhavan to Airport',
    origin: 'Rashtrapati Bhavan',
    originLat: 28.6143,
    originLng: 77.1995,
    destination: 'Indira Gandhi International Airport T3',
    destLat: 28.5562,
    destLng: 77.1000,
    distanceKm: 14.2,
    normalEtaMin: 45,
    emergencyEtaMin: 18,
    timeSavedMin: 27,
    viaRoads: ['Rajpath', 'India Gate Circle', 'Ring Road', 'NH-48', 'Airport Road'],
    coordinates: [[77.1995, 28.6143], [77.2290, 28.6132], [77.2100, 28.5672], [77.1650, 28.5920], [77.1000, 28.5562]],
    coordinatedSignals: [
      { junctionName: 'India Gate Circle', distanceFromOriginKm: 2.5, normalPhase: 'Rajpath Transit', emergencyPhase: 'Green Override (All)', phaseDurationSec: 30 },
      { junctionName: 'ITO Junction', distanceFromOriginKm: 5.8, normalPhase: 'Ring Road N-S Green', emergencyPhase: 'Green Override (W)', phaseDurationSec: 25 },
      { junctionName: 'Dhaula Kuan Interchange', distanceFromOriginKm: 10.0, normalPhase: 'NH-48 Priority', emergencyPhase: 'Green Override (S)', phaseDurationSec: 30 },
    ],
    status: 'idle',
  },
];

// ── Delhi Speed Comparison Data ──

export interface ZoneSpeedComparison {
  zone: string;
  actual: number;
  twin: number;
}

export const DELHI_SPEED_COMPARISON: ZoneSpeedComparison[] = [
  { zone: 'Central', actual: 18, twin: 20 },
  { zone: 'South', actual: 22, twin: 24 },
  { zone: 'North', actual: 17, twin: 19 },
  { zone: 'East', actual: 20, twin: 22 },
  { zone: 'West', actual: 24, twin: 26 },
  { zone: 'NCR', actual: 21, twin: 23 },
];

// ── Delhi Congestion Radar Data ──

export const DELHI_CONGESTION_RADAR = [
  { zone: 'Central', congestion: 82, speed: 18 },
  { zone: 'South', congestion: 68, speed: 22 },
  { zone: 'North', congestion: 76, speed: 17 },
  { zone: 'East', congestion: 81, speed: 20 },
  { zone: 'West', congestion: 61, speed: 24 },
  { zone: 'NCR', congestion: 73, speed: 21 },
];
