// ── What-If Simulation Mock Data ──

export type ScenarioType = 'accident' | 'road_closure' | 'heavy_rain' | 'festival' | 'traffic_surge' | 'signal_failure' | 'vip_movement';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface WhatIfMetrics {
  speed: number;        // km/h
  waitTime: number;     // seconds
  queue: number;        // meters
  throughput: number;   // vehicles/hour
  congestion: number;   // 0-100%
}

export interface WhatIfSimulation {
  id: string;
  type: ScenarioType;
  name: string;
  city: string;
  road: string;
  duration: string;
  trafficIncreasePct: number;
  severity: SeverityLevel;
  before: WhatIfMetrics;
  after: WhatIfMetrics;
  mitigation: string;
  status: 'idle' | 'running' | 'completed';
  affectedJunctions: number;
  estimatedRecoveryMin: number;
}

export const SCENARIO_TYPE_CONFIG: Record<ScenarioType, { label: string; icon: string; color: string; defaultIncrease: number }> = {
  accident: { label: 'Accident', icon: '🚗', color: 'red', defaultIncrease: 45 },
  road_closure: { label: 'Road Closure', icon: '🚧', color: 'amber', defaultIncrease: 60 },
  heavy_rain: { label: 'Heavy Rain', icon: '🌧️', color: 'cyan', defaultIncrease: 35 },
  festival: { label: 'Festival', icon: '🎪', color: 'purple', defaultIncrease: 80 },
  traffic_surge: { label: 'Traffic Surge', icon: '📈', color: 'amber', defaultIncrease: 55 },
  signal_failure: { label: 'Signal Failure', icon: '🔴', color: 'red', defaultIncrease: 70 },
  vip_movement: { label: 'VIP Movement', icon: '🏛️', color: 'emerald', defaultIncrease: 40 },
};

export const MOCK_CITIES = ['Bengaluru', 'Delhi-NCR', 'Mumbai', 'Hyderabad'];
export const MOCK_ROADS_BENGALURU = [
  'ORR South (Silk Board–Bellandur)',
  'Hosur Road Elevated',
  'MG Road CBD Corridor',
  'Hebbal Flyover–Ballari Road',
  'ORR East (Bellandur–Marathahalli)',
  'Whitefield Main Road',
  'Koramangala 100ft Road',
  'Mysore Road Elevated',
];
export const MOCK_ROADS_DELHI = [
  'Ring Road (AIIMS – Dhaula Kuan)',
  'Mathura Road (ITO – Badarpur)',
  'Connaught Place – Janpath Circuit',
  'NH-48 (Delhi-Gurgaon Expressway)',
  'DND Flyway (Mayur Vihar – Noida)',
  'Kashmere Gate – ISBT Corridor',
  'Ashram Chowk – AIIMS Corridor',
  'Anand Vihar – Akshardham Corridor',
  'Karol Bagh – Rajouri Garden Link',
  'Nelson Mandela Marg (Vasant Kunj)',
];
export const MOCK_ROADS_MUMBAI = [
  'Western Express Highway',
  'Bandra-Worli Sea Link',
  'SCLR Flyover (BKC–Chembur)',
  'SV Road (Andheri–Bandra)',
];
export const MOCK_ROADS_HYDERABAD = [
  'HITECH City Main Arterial',
  'Outer Ring Road (Gachibowli–Shamshabad)',
  'MG Road – Abids Corridor',
  'Necklace Road (Tank Bund)',
];

/** Get roads for a city name */
export function getMockRoadsForCity(city: string): string[] {
  switch (city) {
    case 'Bengaluru': return MOCK_ROADS_BENGALURU;
    case 'Delhi-NCR': return MOCK_ROADS_DELHI;
    case 'Mumbai': return MOCK_ROADS_MUMBAI;
    case 'Hyderabad': return MOCK_ROADS_HYDERABAD;
    default: return MOCK_ROADS_BENGALURU;
  }
}

// Backward compat: combined list for existing UI that doesn't filter by city
export const MOCK_ROADS = [...MOCK_ROADS_BENGALURU, ...MOCK_ROADS_DELHI, ...MOCK_ROADS_MUMBAI, ...MOCK_ROADS_HYDERABAD];
export const MOCK_DURATIONS = ['15 min', '30 min', '1 hour', '2 hours', '4 hours', 'Full day'];
export const MOCK_SEVERITIES: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

export const BASE_METRICS: WhatIfMetrics = {
  speed: 24.5,
  waitTime: 120,
  queue: 480,
  throughput: 3200,
  congestion: 68,
};

// Delhi base metrics — DEMO/MOCK data for Delhi-NCR
export const DELHI_BASE_METRICS: WhatIfMetrics = {
  speed: 21,
  waitTime: 165,
  queue: 680,
  throughput: 2800,
  congestion: 72,
};

// Mumbai base metrics — DEMO/MOCK data
export const MUMBAI_BASE_METRICS: WhatIfMetrics = {
  speed: 18,
  waitTime: 145,
  queue: 580,
  throughput: 3000,
  congestion: 75,
};

// Hyderabad base metrics — DEMO/MOCK data
export const HYDERABAD_BASE_METRICS: WhatIfMetrics = {
  speed: 22,
  waitTime: 110,
  queue: 420,
  throughput: 2600,
  congestion: 65,
};

/** Get the base metrics for a given city */
export function getBaseMetricsForCity(city: string): WhatIfMetrics {
  switch (city) {
    case 'Delhi-NCR': return DELHI_BASE_METRICS;
    case 'Mumbai': return MUMBAI_BASE_METRICS;
    case 'Hyderabad': return HYDERABAD_BASE_METRICS;
    default: return BASE_METRICS;
  }
}

// ── Pre-built completed simulations ──
export const MOCK_COMPLETED_SIMULATIONS: WhatIfSimulation[] = [
  {
    id: 'sim-01',
    type: 'accident',
    name: 'Multi-vehicle Pile-up on ORR South',
    city: 'Bengaluru',
    road: 'ORR South (Silk Board–Bellandur)',
    duration: '1 hour',
    trafficIncreasePct: 45,
    severity: 'high',
    before: { speed: 24.5, waitTime: 120, queue: 480, throughput: 3200, congestion: 68 },
    after: { speed: 11.2, waitTime: 285, queue: 1250, throughput: 1800, congestion: 94 },
    mitigation: 'Activate Inner Ring Road detour. Divert via Bannerghatta Rd. Deploy 2 traffic police units.',
    status: 'completed',
    affectedJunctions: 8,
    estimatedRecoveryMin: 75,
  },
  {
    id: 'sim-02',
    type: 'road_closure',
    name: 'Silk Board Flyover Maintenance (2 Lanes)',
    city: 'Bengaluru',
    road: 'ORR South (Silk Board–Bellandur)',
    duration: '4 hours',
    trafficIncreasePct: 60,
    severity: 'critical',
    before: { speed: 24.5, waitTime: 120, queue: 480, throughput: 3200, congestion: 68 },
    after: { speed: 8.5, waitTime: 340, queue: 1680, throughput: 1200, congestion: 97 },
    mitigation: 'Divert heavy vehicles via Hosur Road Elevated. Enable green wave on Bannerghatta Rd. Alert citizens 2 hours prior.',
    status: 'completed',
    affectedJunctions: 12,
    estimatedRecoveryMin: 240,
  },
  {
    id: 'sim-03',
    type: 'heavy_rain',
    name: 'Heavy Rain Event (50mm/hr) — Citywide',
    city: 'Bengaluru',
    road: 'ORR East (Bellandur–Marathahalli)',
    duration: '2 hours',
    trafficIncreasePct: 35,
    severity: 'high',
    before: { speed: 24.5, waitTime: 120, queue: 480, throughput: 3200, congestion: 68 },
    after: { speed: 14.8, waitTime: 210, queue: 920, throughput: 2100, congestion: 86 },
    mitigation: 'Activate waterlogging alerts. Deploy BBMP pump squads to Tin Factory underpass. Reduce signal cycle lengths by 20%.',
    status: 'completed',
    affectedJunctions: 24,
    estimatedRecoveryMin: 90,
  },
  {
    id: 'sim-04',
    type: 'vip_movement',
    name: 'VIP Convoy — Airport to Raj Bhavan',
    city: 'Bengaluru',
    road: 'Hebbal Flyover–Ballari Road',
    duration: '30 min',
    trafficIncreasePct: 40,
    severity: 'medium',
    before: { speed: 24.5, waitTime: 120, queue: 480, throughput: 3200, congestion: 68 },
    after: { speed: 16.2, waitTime: 195, queue: 780, throughput: 2400, congestion: 82 },
    mitigation: 'Pre-emptive green wave on Hebbal–Ballari corridor. Deploy traffic police at 6 junctions. Divert local traffic via Sahakara Nagar Rd.',
    status: 'completed',
    affectedJunctions: 6,
    estimatedRecoveryMin: 30,
  },
];

// ── Delhi-NCR Pre-built Simulations ──
// DEMO/MOCK data — not live traffic results
export const DELHI_COMPLETED_SIMULATIONS: WhatIfSimulation[] = [
  {
    id: 'del-sim-01',
    type: 'accident',
    name: 'Multi-vehicle Pile-up on Ring Road (AIIMS–Dhaula Kuan)',
    city: 'Delhi-NCR',
    road: 'Ring Road (AIIMS – Dhaula Kuan)',
    duration: '1 hour',
    trafficIncreasePct: 45,
    severity: 'high',
    before: { speed: 21, waitTime: 165, queue: 680, throughput: 2800, congestion: 72 },
    after: { speed: 9, waitTime: 320, queue: 1450, throughput: 1400, congestion: 95 },
    mitigation: 'Activate Ring Road detour via Outer Ring Road. Divert to Mathura Road. Deploy traffic police at AIIMS and Dhaula Kuan.',
    status: 'completed',
    affectedJunctions: 10,
    estimatedRecoveryMin: 80,
  },
  {
    id: 'del-sim-02',
    type: 'heavy_rain',
    name: 'Heavy Monsoon Rain — ITO Waterlogging (50mm/hr)',
    city: 'Delhi-NCR',
    road: 'Ring Road (AIIMS – Dhaula Kuan)',
    duration: '2 hours',
    trafficIncreasePct: 35,
    severity: 'critical',
    before: { speed: 21, waitTime: 165, queue: 680, throughput: 2800, congestion: 72 },
    after: { speed: 12, waitTime: 280, queue: 1200, throughput: 1600, congestion: 91 },
    mitigation: 'Activate Minto Bridge underpass pumps. Deploy PWD drainage teams. Reduce signal cycle lengths by 20%. Issue citizen mobility advisory.',
    status: 'completed',
    affectedJunctions: 18,
    estimatedRecoveryMin: 120,
  },
  {
    id: 'del-sim-03',
    type: 'road_closure',
    name: 'ITO Ring Road Segment — Emergency Repair Closure',
    city: 'Delhi-NCR',
    road: 'Ring Road (AIIMS – Dhaula Kuan)',
    duration: '4 hours',
    trafficIncreasePct: 60,
    severity: 'critical',
    before: { speed: 21, waitTime: 165, queue: 680, throughput: 2800, congestion: 72 },
    after: { speed: 11, waitTime: 310, queue: 1600, throughput: 1500, congestion: 93 },
    mitigation: 'Divert traffic via Mathura Road and Outer Ring Road. Deploy traffic police at 8 diversion points. Enable green wave on alternate corridors.',
    status: 'completed',
    affectedJunctions: 14,
    estimatedRecoveryMin: 240,
  },
  {
    id: 'del-sim-04',
    type: 'vip_movement',
    name: 'VIP Convoy — Rashtrapati Bhavan to Airport',
    city: 'Delhi-NCR',
    road: 'NH-48 (Delhi-Gurgaon Expressway)',
    duration: '30 min',
    trafficIncreasePct: 40,
    severity: 'medium',
    before: { speed: 21, waitTime: 165, queue: 680, throughput: 2800, congestion: 72 },
    after: { speed: 15, waitTime: 220, queue: 920, throughput: 2200, congestion: 82 },
    mitigation: 'Pre-emptive green wave on Rajpath → India Gate → Ring Road → NH-48 corridor. Deploy traffic police at 6 junctions. Close on-ramps temporarily.',
    status: 'completed',
    affectedJunctions: 8,
    estimatedRecoveryMin: 30,
  },
];

// ── Compute simulation results based on inputs ──
export function computeSimulation(
  _type: ScenarioType,
  trafficIncrease: number,
  severity: SeverityLevel,
  cityName?: string
): { before: WhatIfMetrics; after: WhatIfMetrics } {
  const baseMetrics = cityName ? getBaseMetricsForCity(cityName) : BASE_METRICS;
  const severityMultiplier = { low: 0.5, medium: 0.75, high: 1.0, critical: 1.25 }[severity];
  const impact = (trafficIncrease / 100) * severityMultiplier;

  const after: WhatIfMetrics = {
    speed: Math.max(3, Math.round((baseMetrics.speed * (1 - impact * 0.7)) * 10) / 10),
    waitTime: Math.round(baseMetrics.waitTime * (1 + impact * 1.8)),
    queue: Math.round(baseMetrics.queue * (1 + impact * 2.2)),
    throughput: Math.round(baseMetrics.throughput * (1 - impact * 0.5)),
    congestion: Math.min(99, Math.round(baseMetrics.congestion + impact * 35)),
  };

  return { before: { ...baseMetrics }, after };
}

// ── Recovery timeline (mock 12-point curve) ──
export function getRecoveryTimeline(before: WhatIfMetrics, after: WhatIfMetrics): { minute: string; speed: number; congestion: number }[] {
  const points = 12;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const ease = 1 - Math.pow(1 - t, 2); // ease-out curve
    return {
      minute: `+${Math.round(t * 120)}m`,
      speed: Math.round((after.speed + (before.speed - after.speed) * ease) * 10) / 10,
      congestion: Math.round(after.congestion + (before.congestion - after.congestion) * ease * -1),
    };
  });
}
