import type {
  SyntheticTrafficData,
  SyntheticRoadSegment,
  SyntheticJunction,
  SyntheticTrafficSignal,
  SyntheticIncident,
  SyntheticCamera,
  SyntheticSensor,
  SyntheticBusStop,
  SyntheticMetroStation,
  TrafficLevel,
} from '../types/synthetic';

// ── Deterministic seed-based random ────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────



function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, rng: () => number): number {
  return Math.round((rng() * (max - min) + min) * 10) / 10;
}

function speedToTrafficLevel(speed: number): TrafficLevel {
  if (speed > 40) return 'free_flow';
  if (speed > 25) return 'slow';
  if (speed > 12) return 'congested';
  return 'gridlock';
}

function speedToCongestion(speed: number): number {
  return Math.min(100, Math.max(0, Math.round(100 - speed * 1.8)));
}

function congestionStatus(c: number): string {
  if (c < 25) return 'Clear';
  if (c < 55) return 'Slow Traffic';
  if (c < 80) return 'Heavy Congestion';
  return 'Gridlock';
}

// ── City Road Network Definitions ──────────────────────────────────────────
// Each road is defined by its name, polyline coordinates, and a speed range
// that gets deterministically sampled.  This creates realistic corridors.

interface RoadDef {
  name: string;
  coords: [number, number][];
  speedRange: [number, number]; // [min, max] km/h
}

// ── BENGALURU ──────────────────────────────────────────────────────────────

const BENGALURU_ROADS: RoadDef[] = [
  {
    name: 'Outer Ring Road (Silk Board – Bellandur)',
    coords: [[77.6228,12.9172],[77.630,12.920],[77.641,12.922],[77.653,12.923],[77.660,12.924],[77.670,12.926],[77.6762,12.9262]],
    speedRange: [8, 18],
  },
  {
    name: 'Bellandur – Marathahalli Expressway',
    coords: [[77.6762,12.9262],[77.685,12.935],[77.695,12.945],[77.7011,12.9569]],
    speedRange: [10, 22],
  },
  {
    name: 'HAL Old Airport Road',
    coords: [[77.610,12.960],[77.623,12.935],[77.640,12.950],[77.660,12.960],[77.680,12.965],[77.700,12.975],[77.720,12.985]],
    speedRange: [28, 52],
  },
  {
    name: 'Hosur Road Elevated Expressway',
    coords: [[77.6228,12.9172],[77.630,12.900],[77.638,12.885],[77.645,12.870],[77.650,12.850]],
    speedRange: [22, 48],
  },
  {
    name: 'MG Road – Brigade Road CBD',
    coords: [[77.600,12.975],[77.608,12.974],[77.6171,12.973],[77.625,12.971],[77.635,12.969]],
    speedRange: [15, 38],
  },
  {
    name: 'Hebbal Flyover – Ballari Road',
    coords: [[77.590,13.010],[77.595,13.025],[77.597,13.0359],[77.600,13.050],[77.605,13.065]],
    speedRange: [6, 15],
  },
  {
    name: 'Bannerghatta Road',
    coords: [[77.600,12.955],[77.595,12.940],[77.590,12.925],[77.585,12.910],[77.580,12.890]],
    speedRange: [12, 30],
  },
  {
    name: 'Whitefield Main Road',
    coords: [[77.720,12.985],[77.730,12.986],[77.740,12.987],[77.755,12.988]],
    speedRange: [18, 42],
  },
  {
    name: 'Sarjapur Road',
    coords: [[77.635,12.910],[77.650,12.905],[77.670,12.900],[77.690,12.895],[77.710,12.890]],
    speedRange: [14, 35],
  },
  {
    name: 'NICE Road (Periphery Ring)',
    coords: [[77.530,12.950],[77.540,12.920],[77.560,12.890],[77.590,12.870],[77.620,12.860]],
    speedRange: [40, 80],
  },
  {
    name: 'Old Madras Road',
    coords: [[77.630,12.970],[77.660,12.975],[77.690,12.980],[77.720,12.985],[77.750,12.988]],
    speedRange: [20, 45],
  },
  {
    name: 'Koramangala – Silk Board Link',
    coords: [[77.622,12.935],[77.6228,12.925],[77.6228,12.9172]],
    speedRange: [6, 14],
  },
  {
    name: 'Outer Ring Road (Mahadevapura – Hebbal)',
    coords: [[77.700,12.990],[77.680,13.005],[77.660,13.020],[77.640,13.035],[77.620,13.045]],
    speedRange: [15, 35],
  },
  {
    name: 'Electronic City Phase 1 Expressway',
    coords: [[77.650,12.850],[77.660,12.840],[77.670,12.830],[77.680,12.820]],
    speedRange: [25, 55],
  },
  {
    name: 'Jayanagar 4th Block – BTM Layout',
    coords: [[77.595,12.940],[77.605,12.938],[77.615,12.935],[77.625,12.933]],
    speedRange: [12, 28],
  },
  {
    name: 'Indiranagar 100ft Road',
    coords: [[77.635,12.975],[77.642,12.978],[77.650,12.980],[77.660,12.982]],
    speedRange: [22, 40],
  },
  {
    name: 'Kasturba Road – Cubbon Park Link',
    coords: [[77.595,12.978],[77.600,12.977],[77.608,12.976]],
    speedRange: [18, 35],
  },
  {
    name: 'Hoodi Main Road',
    coords: [[77.700,12.965],[77.710,12.970],[77.720,12.975],[77.730,12.980]],
    speedRange: [14, 32],
  },
];

// ── DELHI-NCR ──────────────────────────────────────────────────────────────

const DELHI_ROADS: RoadDef[] = [
  {
    name: 'Ring Road (AIIMS – Dhaula Kuan)',
    coords: [[77.2100,28.5672],[77.195,28.575],[77.185,28.580],[77.175,28.588],[77.165,28.592]],
    speedRange: [6, 14],
  },
  {
    name: 'Delhi-Gurgaon Expressway (NH-48)',
    coords: [[77.165,28.592],[77.145,28.570],[77.125,28.540],[77.105,28.510],[77.085,28.490],[77.0725,28.4721]],
    speedRange: [12, 28],
  },
  {
    name: 'DND Flyway (Mayur Vihar – Noida)',
    coords: [[77.2796,28.5684],[77.295,28.570],[77.310,28.571],[77.3261,28.5708]],
    speedRange: [15, 35],
  },
  {
    name: 'Connaught Place – Janpath Circuit',
    coords: [[77.2167,28.6315],[77.215,28.630],[77.213,28.628],[77.211,28.626]],
    speedRange: [10, 22],
  },
  {
    name: 'Mathura Road (ITO – Badarpur)',
    coords: [[77.242,28.629],[77.250,28.620],[77.260,28.610],[77.275,28.595],[77.290,28.580]],
    speedRange: [12, 30],
  },
  {
    name: 'Nelson Mandela Marg (Vasant Kunj)',
    coords: [[77.155,28.525],[77.145,28.510],[77.135,28.495],[77.120,28.480]],
    speedRange: [20, 45],
  },
  {
    name: 'Outer Ring Road (ITO – Wazirabad)',
    coords: [[77.242,28.629],[77.235,28.645],[77.228,28.660],[77.220,28.680]],
    speedRange: [18, 40],
  },
  {
    name: 'Barakhamba Road – CP Link',
    coords: [[77.228,28.634],[77.222,28.632],[77.217,28.631]],
    speedRange: [8, 20],
  },
  {
    name: 'Shahdara – Geeta Colony Road',
    coords: [[77.285,28.650],[77.275,28.655],[77.265,28.658],[77.255,28.660]],
    speedRange: [14, 32],
  },
  {
    name: 'Rajouri Garden – Punjabi Bagh Link',
    coords: [[77.120,28.648],[77.115,28.655],[77.108,28.660],[77.100,28.665]],
    speedRange: [16, 38],
  },
  {
    name: 'Aurobindo Marg (AIIMS – Safdarjung)',
    coords: [[77.210,28.5672],[77.208,28.575],[77.206,28.582],[77.204,28.590]],
    speedRange: [10, 25],
  },
  {
    name: 'ITO – Pragati Maidan Corridor',
    coords: [[77.242,28.629],[77.240,28.622],[77.238,28.615]],
    speedRange: [12, 28],
  },
  {
    name: 'Dwarka Expressway',
    coords: [[77.0725,28.4721],[77.060,28.480],[77.048,28.490],[77.035,28.500]],
    speedRange: [30, 65],
  },
  {
    name: 'Chandni Chowk – Lahori Gate Road',
    coords: [[77.235,28.650],[77.230,28.652],[77.225,28.654]],
    speedRange: [5, 15],
  },
  {
    name: 'South Extension Ring Road',
    coords: [[77.218,28.572],[77.225,28.568],[77.232,28.565]],
    speedRange: [14, 30],
  },
];

// ── MUMBAI ─────────────────────────────────────────────────────────────────

const MUMBAI_ROADS: RoadDef[] = [
  {
    name: 'Western Express Highway (Andheri – BKC)',
    coords: [[72.8464,19.1197],[72.848,19.105],[72.849,19.090],[72.850,19.075],[72.853,19.060]],
    speedRange: [6, 16],
  },
  {
    name: 'Eastern Freeway (Chembur – South Mumbai)',
    coords: [[72.890,19.040],[72.875,19.020],[72.860,18.990],[72.850,18.960],[72.840,18.940]],
    speedRange: [35, 70],
  },
  {
    name: 'Bandra-Worli Sea Link',
    coords: [[72.835,19.050],[72.825,19.042],[72.817,19.033],[72.810,19.020],[72.805,19.005]],
    speedRange: [30, 60],
  },
  {
    name: 'SCLR Flyover (BKC – Chembur)',
    coords: [[72.853,19.060],[72.860,19.065],[72.870,19.075],[72.880,19.088]],
    speedRange: [15, 35],
  },
  {
    name: 'SV Road (Andheri – Bandra)',
    coords: [[72.835,19.130],[72.837,19.120],[72.840,19.110],[72.843,19.100],[72.845,19.090]],
    speedRange: [10, 25],
  },
  {
    name: 'Linking Road (Bandra)',
    coords: [[72.830,19.060],[72.828,19.055],[72.826,19.050],[72.824,19.045]],
    speedRange: [8, 20],
  },
  {
    name: 'Marine Drive (Nariman Point)',
    coords: [[72.823,18.926],[72.820,18.935],[72.818,18.945],[72.816,18.955]],
    speedRange: [25, 50],
  },
  {
    name: 'Dadar TT Circle – Parel Link',
    coords: [[72.848,19.018],[72.850,19.025],[72.852,19.032],[72.853,19.040]],
    speedRange: [8, 20],
  },
  {
    name: 'Andheri Kurla Road',
    coords: [[72.850,19.120],[72.853,19.110],[72.855,19.100],[72.857,19.090]],
    speedRange: [12, 28],
  },
  {
    name: 'LBS Marg (Ghatkopar – Mulund)',
    coords: [[72.900,19.085],[72.910,19.090],[72.920,19.095],[72.935,19.100]],
    speedRange: [14, 32],
  },
  {
    name: 'JVLR (Jogeshwari – Vikhroli Link)',
    coords: [[72.850,19.135],[72.860,19.133],[72.870,19.131],[72.885,19.128]],
    speedRange: [10, 22],
  },
  {
    name: 'Powai Lake Road',
    coords: [[72.905,19.115],[72.910,19.120],[72.915,19.125],[72.920,19.130]],
    speedRange: [18, 40],
  },
];

// ── HYDERABAD ──────────────────────────────────────────────────────────────

const HYDERABAD_ROADS: RoadDef[] = [
  {
    name: 'HITECH City Main Arterial',
    coords: [[78.3615,17.4401],[78.370,17.445],[78.3808,17.4504],[78.390,17.448],[78.4072,17.4319]],
    speedRange: [8, 18],
  },
  {
    name: 'Outer Ring Road (Gachibowli – Shamshabad)',
    coords: [[78.3615,17.4401],[78.370,17.410],[78.380,17.380],[78.400,17.320],[78.420,17.250]],
    speedRange: [50, 90],
  },
  {
    name: 'PVNR Elevated Expressway',
    coords: [[78.448,17.395],[78.440,17.370],[78.435,17.360],[78.425,17.340],[78.420,17.320]],
    speedRange: [35, 70],
  },
  {
    name: 'Jubilee Hills Road No. 36',
    coords: [[78.4072,17.4319],[78.415,17.438],[78.425,17.442],[78.435,17.444]],
    speedRange: [15, 35],
  },
  {
    name: 'Begumpet Airport Road',
    coords: [[78.435,17.444],[78.445,17.445],[78.455,17.445],[78.4682,17.4448]],
    speedRange: [18, 40],
  },
  {
    name: 'MG Road – Abids Corridor',
    coords: [[78.470,17.390],[78.475,17.385],[78.480,17.380],[78.4867,17.385]],
    speedRange: [12, 30],
  },
  {
    name: 'Secunderabad – Tanks Road',
    coords: [[78.500,17.440],[78.495,17.445],[78.490,17.450],[78.485,17.455]],
    speedRange: [14, 32],
  },
  {
    name: 'Gachibowli – Miyapur Road',
    coords: [[78.3615,17.4401],[78.355,17.450],[78.350,17.460],[78.345,17.470]],
    speedRange: [15, 38],
  },
  {
    name: 'Mehdipatnam – Tolichowki Road',
    coords: [[78.440,17.395],[78.435,17.390],[78.425,17.385],[78.415,17.380]],
    speedRange: [10, 25],
  },
  {
    name: 'Necklace Road (Tank Bund)',
    coords: [[78.470,17.420],[78.465,17.425],[78.460,17.430],[78.455,17.435]],
    speedRange: [20, 45],
  },
  {
    name: 'HITECH City – Financial District Link',
    coords: [[78.3615,17.4401],[78.355,17.435],[78.348,17.425],[78.340,17.415]],
    speedRange: [25, 55],
  },
  {
    name: 'Charminar – Falaknuma Road',
    coords: [[78.4747,17.3616],[78.470,17.355],[78.465,17.348],[78.460,17.340]],
    speedRange: [12, 28],
  },
];

// ── City Junction / Camera / Incident Seeds ────────────────────────────────

interface CitySeed {
  roads: RoadDef[];
  junctions: Array<{ name: string; lat: number; lng: number; congestionBase: number }>;
  incidents: Array<{ type: SyntheticIncident['type']; severity: SyntheticIncident['severity']; title: string; location: string; lat: number; lng: number; delay: number }>;
  cameras: Array<{ name: string; lat: number; lng: number; type: SyntheticCamera['type'] }>;
  sensors: Array<{ name: string; lat: number; lng: number; type: SyntheticSensor['type']; reading: string }>;
  busStops: Array<{ name: string; lat: number; lng: number; routes: string[] }>;
  metroStations: Array<{ name: string; lat: number; lng: number; line: string }>;
}

const BENGALURU_SEED: CitySeed = {
  roads: BENGALURU_ROADS,
  junctions: [
    { name: 'Silk Board Junction', lat: 12.9172, lng: 77.6228, congestionBase: 92 },
    { name: 'Dairy Circle Flyover', lat: 12.9348, lng: 77.605, congestionBase: 78 },
    { name: 'HSR Layout BDA Complex', lat: 12.9116, lng: 77.6476, congestionBase: 65 },
    { name: 'Hebbal Flyover Junction', lat: 13.0359, lng: 77.597, congestionBase: 94 },
    { name: 'MG Road Trinity Circle', lat: 12.973, lng: 77.6171, congestionBase: 35 },
    { name: 'Marathahalli Multiplex', lat: 12.9569, lng: 77.7011, congestionBase: 82 },
    { name: 'Electronic City Phase 1 Entry', lat: 12.840, lng: 77.660, congestionBase: 55 },
    { name: 'Koramangala 5th Block Junction', lat: 12.9348, lng: 77.6254, congestionBase: 60 },
    { name: 'Banashankari BDA Complex', lat: 12.940, lng: 77.580, congestionBase: 50 },
    { name: 'Whitefield Main Road Junction', lat: 12.986, lng: 77.745, congestionBase: 70 },
    { name: 'Yelahanka Police Station Junction', lat: 13.100, lng: 77.595, congestionBase: 45 },
    { name: 'Nagasandra Metro Junction', lat: 13.015, lng: 77.515, congestionBase: 40 },
  ],
  incidents: [
    { type: 'accident', severity: 'high', title: 'Multi-vehicle collision on ORR', location: 'Bellandur EcoSpace Flyover', lat: 12.9262, lng: 77.6762, delay: 25 },
    { type: 'waterlogging', severity: 'critical', title: 'Heavy waterlogging post thunderstorm', location: 'Tin Factory Underpass', lat: 13.0034, lng: 77.6698, delay: 45 },
    { type: 'breakdown', severity: 'medium', title: 'BMTC Bus Breakdown', location: 'Koramangala 100ft Road', lat: 12.9348, lng: 77.6254, delay: 15 },
    { type: 'construction', severity: 'low', title: 'Metro Rail Viaduct Repair', location: 'Indiranagar 100ft Road', lat: 12.9784, lng: 77.6408, delay: 10 },
    { type: 'accident', severity: 'medium', title: 'Two-wheeler vs Auto collision', location: 'Silk Board Signal', lat: 12.9172, lng: 77.6228, delay: 18 },
  ],
  cameras: [
    { name: 'ORR Silk Board CCTV', lat: 12.9172, lng: 77.6228, type: 'cctv' },
    { name: 'Hebbal Flyover ANPR', lat: 13.0359, lng: 77.597, type: 'ANPR' },
    { name: 'MG Road Speed Camera', lat: 12.973, lng: 77.6171, type: 'speed' },
    { name: 'Electronic City Entry ANPR', lat: 12.840, lng: 77.660, type: 'ANPR' },
    { name: 'Marathahalli Bridge CCTV', lat: 12.9569, lng: 77.7011, type: 'cctv' },
    { name: 'Koramangala Junction Camera', lat: 12.9348, lng: 77.6254, type: 'intersection' },
    { name: 'Whitefield Main ANPR', lat: 12.986, lng: 77.745, type: 'ANPR' },
    { name: 'Bannerghatta Road Speed', lat: 12.925, lng: 77.590, type: 'speed' },
  ],
  sensors: [
    { name: 'ORR Bellandur Loop Sensor', lat: 12.9262, lng: 77.6762, type: 'loop', reading: '145 veh/km' },
    { name: 'Hebbal Radar Sensor', lat: 13.0359, lng: 77.597, type: 'radar', reading: '160 veh/km' },
    { name: 'MG Road Weather Station', lat: 12.973, lng: 77.6171, type: 'weather', reading: '28°C, Humidity 72%' },
    { name: 'Koramangala Air Quality', lat: 12.9348, lng: 77.6254, type: 'air_quality', reading: 'AQI 142 (Unhealthy)' },
    { name: 'Silk Board Loop Sensor', lat: 12.9172, lng: 77.6228, type: 'loop', reading: '155 veh/km' },
    { name: 'Whitefield Radar Sensor', lat: 12.986, lng: 77.745, type: 'radar', reading: '65 veh/km' },
  ],
  busStops: [
    { name: 'Silk Board Bus Stop', lat: 12.9172, lng: 77.6228, routes: ['500D', 'V-500', '342'] },
    { name: 'Koramangala BDA Complex', lat: 12.9348, lng: 77.6254, routes: ['4', '4A', '42E'] },
    { name: 'Hebbal Bus Terminal', lat: 13.0359, lng: 77.597, routes: ['300', '304', '325'] },
    { name: 'MG Road Metro Station Bus Bay', lat: 12.973, lng: 77.6171, routes: ['335E', '330', '333'] },
    { name: 'Electronic City Phase 1 Stop', lat: 12.840, lng: 77.660, routes: ['V-500', '362', '600D'] },
    { name: 'Whitefield Railway Station Bus Bay', lat: 12.986, lng: 77.745, routes: ['600', '600A', '327'] },
  ],
  metroStations: [
    { name: 'MG Road Metro', lat: 12.973, lng: 77.610, line: 'Purple Line' },
    { name: 'Byappanahalli Metro', lat: 12.995, lng: 77.635, line: 'Purple Line' },
    { name: 'Nagasandra Metro', lat: 13.015, lng: 77.515, line: 'Green Line' },
    { name: 'Yelachenahalli Metro', lat: 12.910, lng: 77.575, line: 'Yellow Line' },
    { name: 'Whitefield Metro', lat: 12.980, lng: 77.750, line: 'Purple Line' },
  ],
};

const DELHI_SEED: CitySeed = {
  roads: DELHI_ROADS,
  junctions: [
    { name: 'Connaught Place Outer Circle', lat: 28.6315, lng: 77.2167, congestionBase: 65 },
    { name: 'DND Flyway Toll Plaza', lat: 28.5684, lng: 77.2796, congestionBase: 92 },
    { name: 'Gurgaon IFFCO Chowk', lat: 28.4721, lng: 77.0725, congestionBase: 84 },
    { name: 'AIIMS Ring Road Flyover', lat: 28.5672, lng: 77.2100, congestionBase: 96 },
    { name: 'Noida Sector 18 Underpass', lat: 28.5708, lng: 77.3261, congestionBase: 38 },
    { name: 'ITO Junction', lat: 28.629, lng: 77.242, congestionBase: 75 },
    { name: 'Chandni Chowk Junction', lat: 28.650, lng: 77.235, congestionBase: 88 },
    { name: 'Rajouri Garden Roundabout', lat: 28.648, lng: 77.120, congestionBase: 55 },
    { name: 'Kashmiri Gate ISBT', lat: 28.667, lng: 77.228, congestionBase: 78 },
    { name: 'Dhaula Kuan Interchange', lat: 28.592, lng: 77.165, congestionBase: 70 },
    { name: 'Saket District Centre', lat: 28.522, lng: 77.208, congestionBase: 45 },
  ],
  incidents: [
    { type: 'accident', severity: 'high', title: 'Multi-vehicle pileup on Ring Road', location: 'AIIMS Flyover stretch', lat: 28.5672, lng: 77.2100, delay: 30 },
    { type: 'waterlogging', severity: 'critical', title: 'Severe waterlogging under Minto Bridge', location: 'ITO – Minto Bridge Underpass', lat: 28.629, lng: 77.242, delay: 50 },
    { type: 'construction', severity: 'medium', title: 'Metro Phase 3 construction lane closure', location: 'Dwarka Sector 21', lat: 28.550, lng: 77.055, delay: 20 },
    { type: 'breakdown', severity: 'low', title: 'Truck Breakdown on NH-48', location: 'Gurgaon Toll Plaza approach', lat: 28.490, lng: 77.085, delay: 12 },
  ],
  cameras: [
    { name: 'Ring Road AIIMS ANPR', lat: 28.5672, lng: 77.2100, type: 'ANPR' },
    { name: 'CP Connaught Circus CCTV', lat: 28.6315, lng: 77.2167, type: 'cctv' },
    { name: 'DND Flyway Speed Camera', lat: 28.5684, lng: 77.2796, type: 'speed' },
    { name: 'Chandni Chowk Intersection', lat: 28.650, lng: 77.235, type: 'intersection' },
    { name: 'ITO Junction Camera', lat: 28.629, lng: 77.242, type: 'cctv' },
    { name: 'Gurgaon NH-48 ANPR', lat: 28.490, lng: 77.085, type: 'ANPR' },
    { name: 'Kashmiri Gate CCTV', lat: 28.667, lng: 77.228, type: 'cctv' },
  ],
  sensors: [
    { name: 'Ring Road Loop Sensor', lat: 28.5672, lng: 77.2100, type: 'loop', reading: '180 veh/km' },
    { name: 'NH-48 Radar Sensor', lat: 28.490, lng: 77.085, type: 'radar', reading: '135 veh/km' },
    { name: 'ITO Air Quality Monitor', lat: 28.629, lng: 77.242, type: 'air_quality', reading: 'AQI 198 (Very Unhealthy)' },
    { name: 'CP Weather Station', lat: 28.6315, lng: 77.2167, type: 'weather', reading: '34°C, Humidity 65%' },
    { name: 'DND Flyway Loop', lat: 28.5684, lng: 77.2796, type: 'loop', reading: '95 veh/km' },
  ],
  busStops: [
    { name: 'Connaught Place Block A', lat: 28.6315, lng: 77.2167, routes: ['405', '604', '720'] },
    { name: 'AIIMS Flyover Bus Stop', lat: 28.5672, lng: 77.2100, routes: ['604', '615', '433'] },
    { name: 'Kashmiri Gate ISBT Bay', lat: 28.667, lng: 77.228, routes: ['405', '405A', '473'] },
    { name: 'ITO Bus Terminal', lat: 28.629, lng: 77.242, routes: ['161', '164', '166'] },
    { name: 'Chandni Chowk Stop', lat: 28.650, lng: 77.235, routes: ['347', '347A', '748'] },
  ],
  metroStations: [
    { name: 'Rajiv Chowk Metro', lat: 28.633, lng: 77.219, line: 'Blue/Yellow Line' },
    { name: 'Kashmere Gate Metro', lat: 28.667, lng: 77.228, line: 'Red/Blue Line' },
    { name: 'Hauz Khas Metro', lat: 28.549, lng: 77.200, line: 'Yellow Line' },
    { name: 'Noida Sector 18 Metro', lat: 28.5708, lng: 77.3261, line: 'Blue Line' },
    { name: 'Dwarka Sector 21 Metro', lat: 28.550, lng: 77.055, line: 'Blue Line' },
  ],
};

const MUMBAI_SEED: CitySeed = {
  roads: MUMBAI_ROADS,
  junctions: [
    { name: 'Bandra-Worli Sea Link Toll', lat: 19.0330, lng: 72.8170, congestionBase: 95 },
    { name: 'BKC Kalanagar Junction', lat: 19.0600, lng: 72.8530, congestionBase: 87 },
    { name: 'Dadar TT Circle', lat: 19.0178, lng: 72.8478, congestionBase: 68 },
    { name: 'Western Express Hwy (Andheri)', lat: 19.1197, lng: 72.8464, congestionBase: 93 },
    { name: 'Marine Drive Nariman Point', lat: 18.9260, lng: 72.8230, congestionBase: 28 },
    { name: 'Sion Junction', lat: 19.045, lng: 72.865, congestionBase: 72 },
    { name: 'GhatkoparJVLR Junction', lat: 19.085, lng: 72.900, congestionBase: 78 },
    { name: 'Haji Ali Junction', lat: 18.982, lng: 72.808, congestionBase: 55 },
    { name: 'Worli Seaface Junction', lat: 19.000, lng: 72.815, congestionBase: 60 },
    { name: 'Andheri Subway Junction', lat: 19.120, lng: 72.846, congestionBase: 70 },
  ],
  incidents: [
    { type: 'accident', severity: 'high', title: 'Bus vs Car collision on WEH', location: 'Andheri Subway', lat: 19.120, lng: 72.846, delay: 20 },
    { type: 'waterlogging', severity: 'critical', title: 'Heavy waterlogging under flyover', location: 'Hindmata Junction', lat: 19.010, lng: 72.853, delay: 40 },
    { type: 'construction', severity: 'medium', title: 'Metro Line 3 construction barrier', location: 'BKC Connector', lat: 19.060, lng: 72.853, delay: 15 },
  ],
  cameras: [
    { name: 'WEH Andheri ANPR', lat: 19.1197, lng: 72.8464, type: 'ANPR' },
    { name: 'Sea Link Toll CCTV', lat: 19.0330, lng: 72.8170, type: 'cctv' },
    { name: 'BKC Junction Camera', lat: 19.0600, lng: 72.8530, type: 'intersection' },
    { name: 'Dadar TT Circle CCTV', lat: 19.0178, lng: 72.8478, type: 'cctv' },
    { name: 'Eastern Freeway Speed', lat: 19.020, lng: 72.875, type: 'speed' },
    { name: 'LBS Marg ANPR', lat: 19.090, lng: 72.910, type: 'ANPR' },
  ],
  sensors: [
    { name: 'WEH Loop Sensor', lat: 19.1197, lng: 72.8464, type: 'loop', reading: '175 veh/km' },
    { name: 'Sea Link Radar', lat: 19.0330, lng: 72.8170, type: 'radar', reading: '60 veh/km' },
    { name: 'CSMT Weather Station', lat: 18.939, lng: 72.835, type: 'weather', reading: '30°C, Humidity 85%' },
    { name: 'BKC Air Quality', lat: 19.060, lng: 72.853, type: 'air_quality', reading: 'AQI 120 (Moderate)' },
  ],
  busStops: [
    { name: 'BKC Bus Terminal', lat: 19.060, lng: 72.853, routes: ['AC-340', '312', '313'] },
    { name: 'Dadar TT Circle Stop', lat: 19.0178, lng: 72.8478, routes: ['4', '111', '312'] },
    { name: 'Andheri Station East Bus Bay', lat: 19.120, lng: 72.846, routes: ['332', '335', '340'] },
    { name: 'CSMT Bus Terminus', lat: 18.939, lng: 72.835, routes: ['132', '133', '134'] },
  ],
  metroStations: [
    { name: 'BKC Metro', lat: 19.060, lng: 72.853, line: 'Line 3' },
    { name: 'Dadar Metro', lat: 19.018, lng: 72.847, line: 'Line 1' },
    { name: 'Andheri Metro', lat: 19.120, lng: 72.846, line: 'Line 1' },
    { name: 'CSMT Metro', lat: 18.939, lng: 72.835, line: 'Line 1' },
  ],
};

const HYDERABAD_SEED: CitySeed = {
  roads: HYDERABAD_ROADS,
  junctions: [
    { name: 'HITECH City Cyber Towers', lat: 17.4504, lng: 78.3808, congestionBase: 91 },
    { name: 'Gachibowli Bio-Diversity Flyover', lat: 17.4401, lng: 78.3615, congestionBase: 82 },
    { name: 'Begumpet Airport Road', lat: 17.4448, lng: 78.4682, congestionBase: 62 },
    { name: 'Jubilee Hills Checkpost', lat: 17.4319, lng: 78.4072, congestionBase: 89 },
    { name: 'Charminar Heritage Plaza', lat: 17.3616, lng: 78.4747, congestionBase: 32 },
    { name: 'Mindspace Junction', lat: 17.4401, lng: 78.3808, congestionBase: 78 },
    { name: 'Ameerpet Metro Junction', lat: 17.415, lng: 78.445, congestionBase: 65 },
    { name: 'Lakdi Ka Pul Junction', lat: 17.395, lng: 78.465, congestionBase: 50 },
    { name: 'Mehdipatnam Circle', lat: 17.395, lng: 78.440, congestionBase: 55 },
    { name: 'Secunderabad Station Junction', lat: 17.435, lng: 78.495, congestionBase: 70 },
  ],
  incidents: [
    { type: 'accident', severity: 'high', title: 'Multi-vehicle collision on ORR', location: 'Gachibowli Junction', lat: 17.4401, lng: 78.3615, delay: 22 },
    { type: 'waterlogging', severity: 'medium', title: 'Waterlogging near underpass', location: 'Ameerpet Junction', lat: 17.415, lng: 78.445, delay: 15 },
    { type: 'construction', severity: 'low', title: 'Metro Phase 2 elevated work', location: 'HITECH City Main Road', lat: 17.4504, lng: 78.3808, delay: 10 },
    { type: 'breakdown', severity: 'medium', title: 'Lorry Breakdown', location: 'ORR Shamshabad Exit', lat: 17.250, lng: 78.420, delay: 18 },
  ],
  cameras: [
    { name: 'HITECH City ANPR', lat: 17.4504, lng: 78.3808, type: 'ANPR' },
    { name: 'Gachibowli Flyover CCTV', lat: 17.4401, lng: 78.3615, type: 'cctv' },
    { name: 'Begumpet Speed Camera', lat: 17.4448, lng: 78.4682, type: 'speed' },
    { name: 'Jubilee Hills Checkpost Camera', lat: 17.4319, lng: 78.4072, type: 'intersection' },
    { name: 'Charminar CCTV', lat: 17.3616, lng: 78.4747, type: 'cctv' },
    { name: 'Secunderabad Station ANPR', lat: 17.435, lng: 78.495, type: 'ANPR' },
  ],
  sensors: [
    { name: 'HITECH City Loop Sensor', lat: 17.4504, lng: 78.3808, type: 'loop', reading: '148 veh/km' },
    { name: 'ORR Radar Sensor', lat: 17.380, lng: 78.380, type: 'radar', reading: '30 veh/km' },
    { name: 'Secunderabad Weather Station', lat: 17.435, lng: 78.495, type: 'weather', reading: '32°C, Humidity 70%' },
    { name: 'HITECH City Air Quality', lat: 17.4504, lng: 78.3808, type: 'air_quality', reading: 'AQI 110 (Moderate)' },
  ],
  busStops: [
    { name: 'HITECH City Bus Stop', lat: 17.4504, lng: 78.3808, routes: ['219', '216', '217'] },
    { name: 'Gachibowli Bus Terminal', lat: 17.4401, lng: 78.3615, routes: ['218', '222', '229'] },
    { name: 'Mehdipatnam Bus Bay', lat: 17.395, lng: 78.440, routes: ['5', '5M', '251'] },
    { name: 'Secunderabad Station Bus Bay', lat: 17.435, lng: 78.495, routes: ['1', '1P', '25'] },
    { name: 'Charminar Bus Stop', lat: 17.3616, lng: 78.4747, routes: ['65', '65L', '251'] },
  ],
  metroStations: [
    { name: 'HITECH City Metro', lat: 17.4504, lng: 78.3808, line: 'Blue Line' },
    { name: 'Ameerpet Metro', lat: 17.415, lng: 78.445, line: 'Blue/Red Line' },
    { name: 'MGBS Metro', lat: 17.390, lng: 78.475, line: 'Red Line' },
    { name: 'Begumpet Metro', lat: 17.4448, lng: 78.4682, line: 'Blue Line' },
    { name: 'Nagole Metro', lat: 17.390, lng: 78.500, line: 'Red Line' },
  ],
};

const CITY_SEEDS: Record<string, CitySeed> = {
  Bengaluru: BENGALURU_SEED,
  'Delhi-NCR': DELHI_SEED,
  Mumbai: MUMBAI_SEED,
  Hyderabad: HYDERABAD_SEED,
};

// ── Main Provider ──────────────────────────────────────────────────────────

export function getSyntheticTrafficData(city: string): SyntheticTrafficData {
  const seed = CITY_SEEDS[city] || CITY_SEEDS['Bengaluru'];
  const rng = seededRandom(`synth-${city}-v3`);
  const timestamp = new Date().toISOString();

  // ── Roads ──────────────────────────────────────────────────────────────
  const roads: SyntheticRoadSegment[] = seed.roads.map((r, idx) => {
    const speed = randFloat(r.speedRange[0], r.speedRange[1], rng);
    const vehicleCount = randInt(80, 220, rng);
    const queueLength = Math.max(0, Math.round((100 - speed) * vehicleCount * 0.03));
    return {
      id: `${city.toLowerCase().replace(/\s/g, '')}-road-${idx + 1}`,
      city,
      roadName: r.name,
      speed,
      trafficLevel: speedToTrafficLevel(speed),
      vehicleCount,
      congestion: speedToCongestion(speed),
      queueLength,
      timestamp,
      source: 'SYNTHETIC' as const,
      coordinates: r.coords,
    };
  });

  // ── Roads GeoJSON ──────────────────────────────────────────────────────
  const roadsGeoJSON = {
    type: 'FeatureCollection' as const,
    features: roads.map((r) => ({
      type: 'Feature' as const,
      properties: {
        id: r.id,
        name: r.roadName,
        congestion: r.congestion,
        avgSpeedKmh: r.speed,
        densityVehKm: Math.round(r.vehicleCount * 0.6),
        roadStatus: congestionStatus(r.congestion),
        speed: r.speed,
        trafficLevel: r.trafficLevel,
        vehicleCount: r.vehicleCount,
        queueLength: r.queueLength,
        timestamp: r.timestamp,
        source: 'SYNTHETIC' as const,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: r.coordinates,
      },
    })),
  };

  // ── Junctions ──────────────────────────────────────────────────────────
  const junctions: SyntheticJunction[] = seed.junctions.map((j, idx) => {
    const cong = Math.min(100, Math.max(5, j.congestionBase + randInt(-8, 8, rng)));
    const status = cong >= 85 ? 'critical' : cong >= 65 ? 'red' : cong >= 40 ? 'yellow' : 'green';
    return {
      id: `${city.toLowerCase().replace(/\s/g, '')}-junc-${idx + 1}`,
      city,
      name: j.name,
      lat: j.lat,
      lng: j.lng,
      status: status as SyntheticJunction['status'],
      waitTimeSec: randInt(20, 250, rng),
      queueLengthVeh: randInt(100, 2000, rng),
      congestionPct: cong,
    };
  });

  // ── Traffic Signals ────────────────────────────────────────────────────
  const signals: SyntheticTrafficSignal[] = junctions.map((j) => ({
    id: `${j.id}-signal`,
    city,
    junctionId: j.id,
    mode: j.status === 'critical' ? 'emergency' : j.congestionPct > 60 ? 'adaptive' : 'fixed',
    cycleLengthSec: j.status === 'critical' ? 200 : j.congestionPct > 60 ? 160 : 90,
    activePhase: j.status === 'critical' ? 'Green Corridor Override' : 'Standard Phase',
  }));

  // ── Incidents ──────────────────────────────────────────────────────────
  const incidents: SyntheticIncident[] = seed.incidents.map((inc, idx) => ({
    id: `${city.toLowerCase().replace(/\s/g, '')}-inc-${idx + 1}`,
    city,
    type: inc.type,
    severity: inc.severity,
    title: inc.title,
    locationName: inc.location,
    lat: inc.lat,
    lng: inc.lng,
    reportedAt: `${randInt(5, 45, rng)} mins ago`,
    estimatedDelayMin: inc.delay,
  }));

  // ── Cameras ────────────────────────────────────────────────────────────
  const cameras: SyntheticCamera[] = seed.cameras.map((c, idx) => ({
    id: `${city.toLowerCase().replace(/\s/g, '')}-cam-${idx + 1}`,
    city,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    type: c.type,
    status: rng() > 0.1 ? 'online' : 'offline',
  }));

  // ── Sensors ────────────────────────────────────────────────────────────
  const sensors: SyntheticSensor[] = seed.sensors.map((s, idx) => ({
    id: `${city.toLowerCase().replace(/\s/g, '')}-sensor-${idx + 1}`,
    city,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    type: s.type,
    reading: s.reading,
    status: rng() > 0.05 ? 'active' : 'inactive',
  }));

  // ── Bus Stops ──────────────────────────────────────────────────────────
  const busStops: SyntheticBusStop[] = seed.busStops.map((b, idx) => ({
    id: `${city.toLowerCase().replace(/\s/g, '')}-bus-${idx + 1}`,
    city,
    name: b.name,
    lat: b.lat,
    lng: b.lng,
    routes: b.routes,
  }));

  // ── Metro Stations ─────────────────────────────────────────────────────
  const metroStations: SyntheticMetroStation[] = seed.metroStations.map((m, idx) => ({
    id: `${city.toLowerCase().replace(/\s/g, '')}-metro-${idx + 1}`,
    city,
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    line: m.line,
  }));

  // ── Stats ──────────────────────────────────────────────────────────────
  const avgSpeed = Math.round(roads.reduce((s, r) => s + r.speed, 0) / roads.length * 10) / 10;
  const avgCongestion = Math.round(roads.reduce((s, r) => s + r.congestion, 0) / roads.length);

  return {
    city,
    roadsGeoJSON,
    roads,
    junctions,
    signals,
    incidents,
    cameras,
    sensors,
    busStops,
    metroStations,
    stats: {
      totalJunctions: junctions.length,
      totalCameras: cameras.length,
      totalSensors: sensors.length,
      totalIncidents: incidents.length,
      avgSpeedKmh: avgSpeed,
      congestionIndex: avgCongestion,
    },
  };
}
