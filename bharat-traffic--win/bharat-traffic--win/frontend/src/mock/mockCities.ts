// ── City Management Mock Data ──
// City-independent platform: 6 cities with full hierarchy

export interface CityData {
  id: string;
  name: string;
  state: string;
  population: string;
  lat: number;
  lng: number;
  status: 'active' | 'inactive' | 'pending';
  zoneCount: number;
  junctionCount: number;
  sensorCount: number;
  cameraCount: number;
  signalCount: number;
  adaptiveSignals: number;
  dailyVehicles: number;
  avgCongestion: number;
  avgSpeed: number;
  activeIncidents: number;
  deploymentDate: string;
  timezone: string;
  zones: ZoneData[];
}

export interface ZoneData {
  id: string;
  name: string;
  cityId: string;
  lat: number;
  lng: number;
  junctionCount: number;
  vehicleCount: number;
  avgSpeed: number;
  congestion: number;
  corridors: CorridorData[];
}

export interface CorridorData {
  id: string;
  name: string;
  zoneId: string;
  lengthKm: number;
  lanes: number;
  vehicleFlow: number;
  avgSpeed: number;
  congestion: number;
  status: 'gridlock' | 'heavy' | 'slow' | 'clear';
  roads: RoadData[];
}

export interface RoadData {
  id: string;
  name: string;
  corridorId: string;
  lengthKm: number;
  lanes: number;
  vehicles: number;
  speed: number;
  density: number;
  congestion: number;
  status: 'gridlock' | 'heavy' | 'slow' | 'clear';
  intersections: IntersectionData[];
}

export interface IntersectionData {
  id: string;
  name: string;
  roadId: string;
  lat: number;
  lng: number;
  vehicles: number;
  queueLength: number;
  waitTime: number;
  congestion: number;
  signalMode: 'adaptive' | 'fixed' | 'manual' | 'emergency';
  sensors: number;
  cameras: number;
  status: 'green' | 'yellow' | 'red' | 'critical';
  signal: SignalData | null;
}

export interface SignalData {
  id: string;
  intersectionId: string;
  mode: 'adaptive' | 'fixed' | 'manual' | 'emergency';
  cycleLength: number;
  phases: { name: string; duration: number; isGreen: boolean }[];
}

// ── Helper ──
function _sig(id: string, intId: string, mode: SignalData['mode'], cycle: number, phases: SignalData['phases']): SignalData {
  return { id, intersectionId: intId, mode, cycleLength: cycle, phases };
}

// ──────────────────────────────────────────────
// BENGALURU
// ──────────────────────────────────────────────
const BENGALURU: CityData = {
  id: 'city-blr', name: 'Bengaluru', state: 'Karnataka', population: '13.2M',
  lat: 12.9716, lng: 77.5946, status: 'active',
  zoneCount: 5, junctionCount: 148, sensorCount: 592, cameraCount: 296, signalCount: 148,
  adaptiveSignals: 112, dailyVehicles: 48920, avgCongestion: 68, avgSpeed: 24.5,
  activeIncidents: 6, deploymentDate: '2025-06-15', timezone: 'IST (UTC+5:30)',
  zones: [
    {
      id: 'z-blr-south', name: 'South Bengaluru', cityId: 'city-blr', lat: 12.91, lng: 77.62, junctionCount: 42, vehicleCount: 14200, avgSpeed: 22, congestion: 72,
      corridors: [
        { id: 'c-blr-orr-s', name: 'ORR South (Silk Board – HSR)', zoneId: 'z-blr-south', lengthKm: 8.2, lanes: 4, vehicleFlow: 54000, avgSpeed: 11, congestion: 89, status: 'gridlock', roads: [
          { id: 'r-blr-orr-s1', name: 'ORR Silk Board Ramp', corridorId: 'c-blr-orr-s', lengthKm: 1.8, lanes: 3, vehicles: 1420, speed: 8, density: 78, congestion: 92, status: 'gridlock', intersections: [
            { id: 'i-blr-silk', name: 'Silk Board Junction', roadId: 'r-blr-orr-s1', lat: 12.9172, lng: 77.6228, vehicles: 1420, queueLength: 850, waitTime: 195, congestion: 92, signalMode: 'adaptive', sensors: 4, cameras: 2, status: 'critical', signal: _sig('s-blr-silk', 'i-blr-silk', 'adaptive', 180, [{ name: 'NS Arterial', duration: 80, isGreen: true }, { name: 'EW Collector', duration: 60, isGreen: false }, { name: 'Pedestrian', duration: 40, isGreen: false }]) },
            { id: 'i-blr-hsr', name: 'HSR Layout BDA', roadId: 'r-blr-orr-s1', lat: 12.9116, lng: 77.6412, vehicles: 510, queueLength: 280, waitTime: 65, congestion: 54, signalMode: 'fixed', sensors: 4, cameras: 2, status: 'yellow', signal: _sig('s-blr-hsr', 'i-blr-hsr', 'fixed', 120, [{ name: 'Phase A', duration: 50, isGreen: true }, { name: 'Phase B', duration: 50, isGreen: false }, { name: 'Phase C', duration: 20, isGreen: false }]) },
          ]},
          { id: 'r-blr-orr-s2', name: 'ORR Bellandur Stretch', corridorId: 'c-blr-orr-s', lengthKm: 2.4, lanes: 4, vehicles: 1680, speed: 10, density: 70, congestion: 85, status: 'heavy', intersections: [
            { id: 'i-blr-bell', name: 'Bellandur EcoSpace', roadId: 'r-blr-orr-s2', lat: 12.9262, lng: 77.6762, vehicles: 1150, queueLength: 620, waitTime: 140, congestion: 85, signalMode: 'adaptive', sensors: 4, cameras: 2, status: 'red', signal: _sig('s-blr-bell', 'i-blr-bell', 'adaptive', 160, [{ name: 'ORR Transit', duration: 70, isGreen: true }, { name: 'Service Rd', duration: 50, isGreen: false }, { name: 'U-Turn', duration: 40, isGreen: false }]) },
          ]},
          { id: 'r-blr-orr-s3', name: 'ORR Marathahalli Bridge', corridorId: 'c-blr-orr-s', lengthKm: 1.5, lanes: 3, vehicles: 1150, speed: 12, density: 76, congestion: 82, status: 'heavy', intersections: [
            { id: 'i-blr-marath', name: 'Marathahalli Multiplex', roadId: 'r-blr-orr-s3', lat: 12.9569, lng: 77.7011, vehicles: 1150, queueLength: 410, waitTime: 95, congestion: 82, signalMode: 'adaptive', sensors: 4, cameras: 2, status: 'red', signal: _sig('s-blr-marath', 'i-blr-marath', 'adaptive', 160, [{ name: 'ORR South', duration: 65, isGreen: true }, { name: 'ORR North', duration: 55, isGreen: false }, { name: 'Cross Rd', duration: 40, isGreen: false }]) },
          ]},
        ]},
        { id: 'c-blr-hosur', name: 'Hosur Road', zoneId: 'z-blr-south', lengthKm: 6.5, lanes: 3, vehicleFlow: 42000, avgSpeed: 34, congestion: 48, status: 'slow', roads: [
          { id: 'r-blr-hosur1', name: 'Hosur Rd Koramangala', corridorId: 'c-blr-hosur', lengthKm: 2.8, lanes: 3, vehicles: 890, speed: 32, density: 31, congestion: 52, status: 'slow', intersections: [
            { id: 'i-blr-koram', name: 'Koramangala 100ft', roadId: 'r-blr-hosur1', lat: 12.9348, lng: 77.6254, vehicles: 510, queueLength: 180, waitTime: 45, congestion: 48, signalMode: 'adaptive', sensors: 4, cameras: 2, status: 'green', signal: _sig('s-blr-koram', 'i-blr-koram', 'adaptive', 120, [{ name: 'Main Rd', duration: 50, isGreen: true }, { name: 'Side St', duration: 40, isGreen: false }, { name: 'Ped', duration: 30, isGreen: false }]) },
          ]},
        ]},
      ]
    },
    {
      id: 'z-blr-central', name: 'Central Bengaluru', cityId: 'city-blr', lat: 12.97, lng: 77.60, junctionCount: 35, vehicleCount: 11800, avgSpeed: 26, congestion: 62,
      corridors: [
        { id: 'c-blr-mg', name: 'MG Road', zoneId: 'z-blr-central', lengthKm: 3.2, lanes: 3, vehicleFlow: 38000, avgSpeed: 28, congestion: 42, status: 'clear', roads: [
          { id: 'r-blr-mg1', name: 'MG Road Main', corridorId: 'c-blr-mg', lengthKm: 1.8, lanes: 3, vehicles: 680, speed: 30, density: 37, congestion: 38, status: 'clear', intersections: [
            { id: 'i-blr-mgtrin', name: 'MG Road Trinity Circle', roadId: 'r-blr-mg1', lat: 12.973, lng: 77.6171, vehicles: 380, queueLength: 120, waitTime: 35, congestion: 32, signalMode: 'adaptive', sensors: 4, cameras: 2, status: 'green', signal: _sig('s-blr-mgtrin', 'i-blr-mgtrin', 'adaptive', 90, [{ name: 'CBD West', duration: 40, isGreen: true }, { name: 'CBD East', duration: 30, isGreen: false }, { name: 'Ped', duration: 20, isGreen: false }]) },
          ]},
        ]},
        { id: 'c-blr-brigade', name: 'Brigade Road', zoneId: 'z-blr-central', lengthKm: 1.8, lanes: 2, vehicleFlow: 22000, avgSpeed: 20, congestion: 55, status: 'slow', roads: [] },
      ]
    },
    {
      id: 'z-blr-north', name: 'North Bengaluru', cityId: 'city-blr', lat: 13.04, lng: 77.59, junctionCount: 28, vehicleCount: 8600, avgSpeed: 18, congestion: 78,
      corridors: [
        { id: 'c-blr-hebbal', name: 'Hebbal Flyover', zoneId: 'z-blr-north', lengthKm: 4.5, lanes: 4, vehicleFlow: 48000, avgSpeed: 14, congestion: 85, status: 'gridlock', roads: [
          { id: 'r-blr-hebbal1', name: 'Hebbal Flyover Entry', corridorId: 'c-blr-hebbal', lengthKm: 2.0, lanes: 4, vehicles: 1680, speed: 10, density: 84, congestion: 95, status: 'gridlock', intersections: [
            { id: 'i-blr-hebbal', name: 'Hebbal Flyover Junction', roadId: 'r-blr-hebbal1', lat: 13.0359, lng: 77.597, vehicles: 1680, queueLength: 1100, waitTime: 210, congestion: 95, signalMode: 'emergency', sensors: 6, cameras: 3, status: 'critical', signal: _sig('s-blr-hebbal', 'i-blr-hebbal', 'emergency', 200, [{ name: 'Green Corridor', duration: 120, isGreen: true }, { name: 'Overflow', duration: 80, isGreen: false }]) },
          ]},
        ]},
        { id: 'c-blr-airport', name: 'Airport Road', zoneId: 'z-blr-north', lengthKm: 5.2, lanes: 3, vehicleFlow: 31000, avgSpeed: 38, congestion: 35, status: 'clear', roads: [] },
      ]
    },
    {
      id: 'z-blr-east', name: 'East Bengaluru', cityId: 'city-blr', lat: 12.98, lng: 77.70, junctionCount: 25, vehicleCount: 9200, avgSpeed: 28, congestion: 55,
      corridors: [
        { id: 'c-blr-whitefield', name: 'Whitefield Main Road', zoneId: 'z-blr-east', lengthKm: 6.8, lanes: 3, vehicleFlow: 36000, avgSpeed: 30, congestion: 48, status: 'slow', roads: [] },
      ]
    },
    {
      id: 'z-blr-west', name: 'West Bengaluru', cityId: 'city-blr', lat: 12.97, lng: 77.53, junctionCount: 18, vehicleCount: 5120, avgSpeed: 32, congestion: 45,
      corridors: [
        { id: 'c-blr-mysore', name: 'Mysore Road', zoneId: 'z-blr-west', lengthKm: 5.5, lanes: 3, vehicleFlow: 28000, avgSpeed: 35, congestion: 40, status: 'clear', roads: [] },
      ]
    },
  ]
};

// ──────────────────────────────────────────────
// NEW DELHI
// ──────────────────────────────────────────────
const NEW_DELHI: CityData = {
  id: 'city-dl', name: 'New Delhi', state: 'Delhi', population: '21.0M',
  lat: 28.6139, lng: 77.209, status: 'active',
  zoneCount: 4, junctionCount: 210, sensorCount: 840, cameraCount: 420, signalCount: 210,
  adaptiveSignals: 165, dailyVehicles: 72400, avgCongestion: 72, avgSpeed: 22.0,
  activeIncidents: 8, deploymentDate: '2025-08-01', timezone: 'IST (UTC+5:30)',
  zones: [
    { id: 'z-dl-c', name: 'Central Delhi', cityId: 'city-dl', lat: 28.63, lng: 77.22, junctionCount: 55, vehicleCount: 18500, avgSpeed: 18, congestion: 82, corridors: [
      { id: 'c-dl-ring', name: 'Ring Road', zoneId: 'z-dl-c', lengthKm: 12, lanes: 4, vehicleFlow: 68000, avgSpeed: 16, congestion: 85, status: 'gridlock', roads: [
        { id: 'r-dl-ring1', name: 'ITO Crossing', corridorId: 'c-dl-ring', lengthKm: 2.5, lanes: 4, vehicles: 2200, speed: 12, density: 88, congestion: 90, status: 'gridlock', intersections: [
          { id: 'i-dl-ito', name: 'ITO Junction', roadId: 'r-dl-ring1', lat: 28.629, lng: 77.243, vehicles: 2200, queueLength: 980, waitTime: 240, congestion: 90, signalMode: 'adaptive', sensors: 6, cameras: 3, status: 'critical', signal: _sig('s-dl-ito', 'i-dl-ito', 'adaptive', 200, [{ name: 'Ring Rd N', duration: 85, isGreen: true }, { name: 'Ring Rd S', duration: 65, isGreen: false }, { name: 'Connaught Pl', duration: 50, isGreen: false }]) },
        ]},
      ]},
    ]},
    { id: 'z-dl-n', name: 'North Delhi', cityId: 'city-dl', lat: 28.70, lng: 77.21, junctionCount: 45, vehicleCount: 12800, avgSpeed: 24, congestion: 68, corridors: [] },
    { id: 'z-dl-s', name: 'South Delhi', cityId: 'city-dl', lat: 28.52, lng: 77.21, junctionCount: 60, vehicleCount: 16200, avgSpeed: 28, congestion: 62, corridors: [] },
    { id: 'z-dl-w', name: 'West Delhi', cityId: 'city-dl', lat: 28.65, lng: 77.10, junctionCount: 50, vehicleCount: 14900, avgSpeed: 20, congestion: 75, corridors: [] },
  ]
};

// ──────────────────────────────────────────────
// GHAZIABAD
// ──────────────────────────────────────────────
const GHAZIABAD: CityData = {
  id: 'city-ghz', name: 'Ghaziabad', state: 'Uttar Pradesh', population: '2.4M',
  lat: 28.6692, lng: 77.4538, status: 'active',
  zoneCount: 3, junctionCount: 72, sensorCount: 288, cameraCount: 144, signalCount: 72,
  adaptiveSignals: 48, dailyVehicles: 18500, avgCongestion: 58, avgSpeed: 28.0,
  activeIncidents: 3, deploymentDate: '2025-11-20', timezone: 'IST (UTC+5:30)',
  zones: [
    { id: 'z-ghz-c', name: 'Ghaziabad Central', cityId: 'city-ghz', lat: 28.67, lng: 77.45, junctionCount: 28, vehicleCount: 6200, avgSpeed: 26, congestion: 62, corridors: [] },
    { id: 'z-ghz-ind', name: 'Indirapuram', cityId: 'city-ghz', lat: 28.64, lng: 77.40, junctionCount: 22, vehicleCount: 5100, avgSpeed: 30, congestion: 52, corridors: [] },
    { id: 'z-ghz-vi', name: 'Vasundhara', cityId: 'city-ghz', lat: 28.66, lng: 77.36, junctionCount: 22, vehicleCount: 4200, avgSpeed: 32, congestion: 48, corridors: [] },
  ]
};

// ──────────────────────────────────────────────
// NOIDA
// ──────────────────────────────────────────────
const NOIDA: CityData = {
  id: 'city-noida', name: 'Noida', state: 'Uttar Pradesh', population: '3.2M',
  lat: 28.5355, lng: 77.391, status: 'active',
  zoneCount: 3, junctionCount: 86, sensorCount: 344, cameraCount: 172, signalCount: 86,
  adaptiveSignals: 62, dailyVehicles: 24600, avgCongestion: 62, avgSpeed: 26.5,
  activeIncidents: 4, deploymentDate: '2025-09-10', timezone: 'IST (UTC+5:30)',
  zones: [
    { id: 'z-noida-62', name: 'Sector 62 IT Hub', cityId: 'city-noida', lat: 28.63, lng: 77.36, junctionCount: 32, vehicleCount: 8400, avgSpeed: 22, congestion: 72, corridors: [] },
    { id: 'z-noida-18', name: 'Sector 18 Market', cityId: 'city-noida', lat: 28.57, lng: 77.32, junctionCount: 28, vehicleCount: 7200, avgSpeed: 24, congestion: 68, corridors: [] },
    { id: 'z-noida-exp', name: 'Noida Expressway', cityId: 'city-noida', lat: 28.48, lng: 77.35, junctionCount: 26, vehicleCount: 5800, avgSpeed: 42, congestion: 38, corridors: [] },
  ]
};

// ──────────────────────────────────────────────
// LUCKNOW
// ──────────────────────────────────────────────
const LUCKNOW: CityData = {
  id: 'city-lko', name: 'Lucknow', state: 'Uttar Pradesh', population: '3.7M',
  lat: 26.8467, lng: 80.9462, status: 'active',
  zoneCount: 3, junctionCount: 64, sensorCount: 256, cameraCount: 128, signalCount: 64,
  adaptiveSignals: 42, dailyVehicles: 16800, avgCongestion: 52, avgSpeed: 30.0,
  activeIncidents: 2, deploymentDate: '2026-01-15', timezone: 'IST (UTC+5:30)',
  zones: [
    { id: 'z-lko-haz', name: 'Hazratganj', cityId: 'city-lko', lat: 26.85, lng: 80.95, junctionCount: 24, vehicleCount: 5200, avgSpeed: 28, congestion: 58, corridors: [] },
    { id: 'z-lko-gom', name: 'Gomti Nagar', cityId: 'city-lko', lat: 26.88, lng: 81.00, junctionCount: 22, vehicleCount: 4800, avgSpeed: 34, congestion: 45, corridors: [] },
    { id: 'z-lko-alg', name: 'Alambagh', cityId: 'city-lko', lat: 26.82, lng: 80.92, junctionCount: 18, vehicleCount: 3400, avgSpeed: 32, congestion: 48, corridors: [] },
  ]
};

// ──────────────────────────────────────────────
// JAIPUR
// ──────────────────────────────────────────────
const JAIPUR: CityData = {
  id: 'city-jai', name: 'Jaipur', state: 'Rajasthan', population: '3.9M',
  lat: 26.9124, lng: 75.7873, status: 'active',
  zoneCount: 3, junctionCount: 58, sensorCount: 232, cameraCount: 116, signalCount: 58,
  adaptiveSignals: 38, dailyVehicles: 15200, avgCongestion: 48, avgSpeed: 32.0,
  activeIncidents: 1, deploymentDate: '2026-03-01', timezone: 'IST (UTC+5:30)',
  zones: [
    { id: 'z-jai-cc', name: 'City Centre (Pink City)', cityId: 'city-jai', lat: 26.92, lng: 75.79, junctionCount: 22, vehicleCount: 4600, avgSpeed: 26, congestion: 58, corridors: [] },
    { id: 'z-jai-ma', name: 'Mansarovar', cityId: 'city-jai', lat: 26.89, lng: 75.77, junctionCount: 20, vehicleCount: 4200, avgSpeed: 34, congestion: 42, corridors: [] },
    { id: 'z-jai-sit', name: 'Sitapura Industrial', cityId: 'city-jai', lat: 26.85, lng: 75.80, junctionCount: 16, vehicleCount: 3200, avgSpeed: 38, congestion: 35, corridors: [] },
  ]
};

// ── All Cities ──
export const MOCK_CITIES: CityData[] = [BENGALURU, NEW_DELHI, GHAZIABAD, NOIDA, LUCKNOW, JAIPUR];

// ── Helpers ──
export function getCityById(id: string): CityData | undefined {
  return MOCK_CITIES.find(c => c.id === id);
}

export function getAllZones(city: CityData): ZoneData[] {
  return city.zones;
}

export function getAllCorridors(city: CityData): CorridorData[] {
  return city.zones.flatMap(z => z.corridors);
}

export function getAllIntersections(city: CityData): IntersectionData[] {
  return city.zones.flatMap(z => z.corridors.flatMap(c => c.roads.flatMap(r => r.intersections)));
}

export function getCityAggregate(city: CityData) {
  const zones = city.zones;
  const corridors = zones.flatMap(z => z.corridors);
  const roads = corridors.flatMap(c => c.roads);
  const intersections = roads.flatMap(r => r.intersections);
  const totalVehicles = zones.reduce((s, z) => s + z.vehicleCount, 0);
  const avgSpeed = zones.length > 0 ? Math.round(zones.reduce((s, z) => s + z.avgSpeed, 0) / zones.length * 10) / 10 : 0;
  const avgCongestion = zones.length > 0 ? Math.round(zones.reduce((s, z) => s + z.congestion, 0) / zones.length) : 0;
  return { totalVehicles, avgSpeed, avgCongestion, corridorCount: corridors.length, roadCount: roads.length, intersectionCount: intersections.length };
}
