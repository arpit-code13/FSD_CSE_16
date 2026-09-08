// ── Signal Optimization Mock Data ──

export type SignalOptStatus = 'optimal' | 'needs-optimization' | 'critical';

export interface PhaseTiming {
  name: string;
  durationSec: number;
  isGreen: boolean;
}

export interface SignalOptImpact {
  waitTimeReductionSec: number;
  throughputIncreaseVhr: number;
  congestionReductionPct: number;
}

export interface SignalOptMetrics {
  avgWaitTimeSec: number;
  throughputVhr: number;
  congestionPct: number;
}

export interface SignalOptimization {
  junctionId: string;
  junctionName: string;
  city: string;
  lat: number;
  lng: number;
  status: SignalOptStatus;
  // Current state
  currentPhase: string;
  currentGreenDurationSec: number;
  currentCycleLengthSec: number;
  currentPhases: PhaseTiming[];
  currentMode: 'adaptive' | 'manual' | 'emergency' | 'fixed';
  currentMetrics: SignalOptMetrics;
  // AI Recommended
  recommendedPhase: string;
  recommendedGreenDurationSec: number;
  recommendedCycleLengthSec: number;
  recommendedPhases: PhaseTiming[];
  recommendedMode: 'adaptive' | 'manual';
  predictedImpact: SignalOptImpact;
  afterMetrics: SignalOptMetrics;
  // State
  optimizationState: 'idle' | 'optimized' | 'simulated' | 'approved';
}

export const MOCK_SIGNAL_OPTIMIZATIONS: SignalOptimization[] = [
  {
    junctionId: 'j-01',
    junctionName: 'Silk Board Junction',
    city: 'Bengaluru',
    lat: 12.9172,
    lng: 77.6228,
    status: 'critical',
    currentPhase: 'North-South Arterial Green',
    currentGreenDurationSec: 75,
    currentCycleLengthSec: 180,
    currentPhases: [
      { name: 'North-South Arterial Green', durationSec: 75, isGreen: true },
      { name: 'East-West Transit', durationSec: 55, isGreen: false },
      { name: 'Pedestrian Crossing', durationSec: 30, isGreen: false },
      { name: 'Right Turn Protected', durationSec: 20, isGreen: false },
    ],
    currentMode: 'adaptive',
    currentMetrics: { avgWaitTimeSec: 195, throughputVhr: 3200, congestionPct: 92 },
    recommendedPhase: 'Extended N-S Green + E-W Protected',
    recommendedGreenDurationSec: 90,
    recommendedCycleLengthSec: 200,
    recommendedPhases: [
      { name: 'Extended N-S Arterial Green', durationSec: 90, isGreen: true },
      { name: 'E-W Protected Left', durationSec: 40, isGreen: false },
      { name: 'Pedestrian + Right Turn', durationSec: 40, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 10, isGreen: false },
      { name: 'E-W Transit Green', durationSec: 20, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 42, throughputIncreaseVhr: 480, congestionReductionPct: 12 },
    afterMetrics: { avgWaitTimeSec: 153, throughputVhr: 3680, congestionPct: 80 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'j-02',
    junctionName: 'Dairy Circle Flyover',
    city: 'Bengaluru',
    lat: 12.9366,
    lng: 77.6011,
    status: 'needs-optimization',
    currentPhase: 'Eastbound Corridor',
    currentGreenDurationSec: 60,
    currentCycleLengthSec: 140,
    currentPhases: [
      { name: 'North-South Standard', durationSec: 50, isGreen: false },
      { name: 'Eastbound Corridor', durationSec: 60, isGreen: true },
      { name: 'Pedestrian Phase', durationSec: 30, isGreen: false },
    ],
    currentMode: 'adaptive',
    currentMetrics: { avgWaitTimeSec: 130, throughputVhr: 2800, congestionPct: 78 },
    recommendedPhase: 'Balanced Split with Queue Flush',
    recommendedGreenDurationSec: 55,
    recommendedCycleLengthSec: 130,
    recommendedPhases: [
      { name: 'N-S Queue Flush Green', durationSec: 45, isGreen: true },
      { name: 'E-W Protected Green', durationSec: 55, isGreen: false },
      { name: 'Pedestrian + Bus Priority', durationSec: 30, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 28, throughputIncreaseVhr: 320, congestionReductionPct: 9 },
    afterMetrics: { avgWaitTimeSec: 102, throughputVhr: 3120, congestionPct: 69 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'j-04',
    junctionName: 'Hebbal Flyover Junction',
    city: 'Bengaluru',
    lat: 13.0359,
    lng: 77.597,
    status: 'critical',
    currentPhase: 'Green Corridor Override',
    currentGreenDurationSec: 200,
    currentCycleLengthSec: 200,
    currentPhases: [
      { name: 'Green Corridor Override', durationSec: 200, isGreen: true },
    ],
    currentMode: 'emergency',
    currentMetrics: { avgWaitTimeSec: 210, throughputVhr: 2400, congestionPct: 95 },
    recommendedPhase: 'Phased Recovery to Adaptive',
    recommendedGreenDurationSec: 80,
    recommendedCycleLengthSec: 180,
    recommendedPhases: [
      { name: 'N-S Arterial Green', durationSec: 80, isGreen: true },
      { name: 'E-W Transit Green', durationSec: 50, isGreen: false },
      { name: 'Pedestrian Phase', durationSec: 30, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 20, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 55, throughputIncreaseVhr: 620, congestionReductionPct: 15 },
    afterMetrics: { avgWaitTimeSec: 155, throughputVhr: 3020, congestionPct: 80 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'j-05',
    junctionName: 'MG Road Trinity Circle',
    city: 'Bengaluru',
    lat: 12.973,
    lng: 77.6171,
    status: 'optimal',
    currentPhase: 'CBD Westbound Flow',
    currentGreenDurationSec: 40,
    currentCycleLengthSec: 90,
    currentPhases: [
      { name: 'CBD Westbound Flow', durationSec: 40, isGreen: true },
      { name: 'CBD Eastbound Return', durationSec: 35, isGreen: false },
      { name: 'Pedestrian Phase', durationSec: 15, isGreen: false },
    ],
    currentMode: 'adaptive',
    currentMetrics: { avgWaitTimeSec: 35, throughputVhr: 3600, congestionPct: 32 },
    recommendedPhase: 'Current Plan (Optimal)',
    recommendedGreenDurationSec: 40,
    recommendedCycleLengthSec: 90,
    recommendedPhases: [
      { name: 'CBD Westbound Flow', durationSec: 40, isGreen: true },
      { name: 'CBD Eastbound Return', durationSec: 35, isGreen: false },
      { name: 'Pedestrian Phase', durationSec: 15, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 0, throughputIncreaseVhr: 0, congestionReductionPct: 0 },
    afterMetrics: { avgWaitTimeSec: 35, throughputVhr: 3600, congestionPct: 32 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'j-03',
    junctionName: 'HSR Layout BDA Complex',
    city: 'Bengaluru',
    lat: 12.9116,
    lng: 77.6412,
    status: 'needs-optimization',
    currentPhase: 'Standard Phase B',
    currentGreenDurationSec: 45,
    currentCycleLengthSec: 120,
    currentPhases: [
      { name: 'Standard Phase A', durationSec: 45, isGreen: false },
      { name: 'Standard Phase B', durationSec: 45, isGreen: true },
      { name: 'Pedestrian Phase', durationSec: 30, isGreen: false },
    ],
    currentMode: 'fixed',
    currentMetrics: { avgWaitTimeSec: 65, throughputVhr: 2200, congestionPct: 54 },
    recommendedPhase: 'Adaptive AI with Queue Detection',
    recommendedGreenDurationSec: 50,
    recommendedCycleLengthSec: 110,
    recommendedPhases: [
      { name: 'N-S Adaptive Green', durationSec: 50, isGreen: true },
      { name: 'E-W Adaptive Green', durationSec: 40, isGreen: false },
      { name: 'Pedestrian + Right Turn', durationSec: 20, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 18, throughputIncreaseVhr: 280, congestionReductionPct: 7 },
    afterMetrics: { avgWaitTimeSec: 47, throughputVhr: 2480, congestionPct: 47 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'j-06',
    junctionName: 'Marathahalli Innovative Multiplex',
    city: 'Bengaluru',
    lat: 12.9569,
    lng: 77.7011,
    status: 'critical',
    currentPhase: 'ORR South Transit',
    currentGreenDurationSec: 65,
    currentCycleLengthSec: 160,
    currentPhases: [
      { name: 'ORR South Transit', durationSec: 65, isGreen: true },
      { name: 'ORR East Approach', durationSec: 55, isGreen: false },
      { name: 'Marathahalli Local', durationSec: 40, isGreen: false },
    ],
    currentMode: 'adaptive',
    currentMetrics: { avgWaitTimeSec: 160, throughputVhr: 3000, congestionPct: 85 },
    recommendedPhase: 'Extended ORR Green + East Flush',
    recommendedGreenDurationSec: 75,
    recommendedCycleLengthSec: 170,
    recommendedPhases: [
      { name: 'ORR South Extended Green', durationSec: 75, isGreen: true },
      { name: 'ORR East Flush Green', durationSec: 50, isGreen: false },
      { name: 'Service Road + Pedestrian', durationSec: 35, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 10, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 35, throughputIncreaseVhr: 420, congestionReductionPct: 10 },
    afterMetrics: { avgWaitTimeSec: 125, throughputVhr: 3420, congestionPct: 75 },
    optimizationState: 'idle',
  },
  // ── Delhi-NCR Junctions ──
  {
    junctionId: 'd-01',
    junctionName: 'ITO Junction',
    city: 'Delhi',
    lat: 28.629,
    lng: 77.242,
    status: 'critical',
    currentPhase: 'Mathura Road Arterial Green',
    currentGreenDurationSec: 80,
    currentCycleLengthSec: 210,
    currentPhases: [
      { name: 'Mathura Road Arterial Green', durationSec: 80, isGreen: true },
      { name: 'Ring Road Transit', durationSec: 65, isGreen: false },
      { name: 'Pragati Maidan Approach', durationSec: 35, isGreen: false },
      { name: 'Pedestrian Crossing', durationSec: 30, isGreen: false },
    ],
    currentMode: 'fixed',
    currentMetrics: { avgWaitTimeSec: 220, throughputVhr: 2800, congestionPct: 94 },
    recommendedPhase: 'Adaptive Split with Queue Flush',
    recommendedGreenDurationSec: 95,
    recommendedCycleLengthSec: 190,
    recommendedPhases: [
      { name: 'Mathura Road Extended Green', durationSec: 95, isGreen: true },
      { name: 'Ring Road Protected', durationSec: 50, isGreen: false },
      { name: 'Pragati Maidan + Pedestrian', durationSec: 35, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 10, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 65, throughputIncreaseVhr: 520, congestionReductionPct: 18 },
    afterMetrics: { avgWaitTimeSec: 155, throughputVhr: 3320, congestionPct: 76 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'd-02',
    junctionName: 'Connaught Place Outer Circle',
    city: 'Delhi',
    lat: 28.6315,
    lng: 77.2167,
    status: 'needs-optimization',
    currentPhase: 'Janpath–Barakhamba Green',
    currentGreenDurationSec: 50,
    currentCycleLengthSec: 150,
    currentPhases: [
      { name: 'Janpath–Barakhamba Green', durationSec: 50, isGreen: true },
      { name: 'Radial Road South', durationSec: 45, isGreen: false },
      { name: 'Pedestrian + Cycle Rickshaw', durationSec: 35, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 20, isGreen: false },
    ],
    currentMode: 'adaptive',
    currentMetrics: { avgWaitTimeSec: 110, throughputVhr: 2400, congestionPct: 72 },
    recommendedPhase: 'Balanced CP Circle Flow',
    recommendedGreenDurationSec: 45,
    recommendedCycleLengthSec: 130,
    recommendedPhases: [
      { name: 'Janpath–Barakhamba Adaptive', durationSec: 45, isGreen: true },
      { name: 'Radial Road South Protected', durationSec: 40, isGreen: false },
      { name: 'Pedestrian + Metro Feeder', durationSec: 35, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 10, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 22, throughputIncreaseVhr: 310, congestionReductionPct: 8 },
    afterMetrics: { avgWaitTimeSec: 88, throughputVhr: 2710, congestionPct: 64 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'd-03',
    junctionName: 'AIIMS Ring Road Flyover',
    city: 'Delhi',
    lat: 28.5672,
    lng: 77.2100,
    status: 'critical',
    currentPhase: 'Ring Road Southbound',
    currentGreenDurationSec: 90,
    currentCycleLengthSec: 240,
    currentPhases: [
      { name: 'Ring Road Southbound', durationSec: 90, isGreen: true },
      { name: 'Aurobindo Marg North', durationSec: 70, isGreen: false },
      { name: 'Safdarjung Flyover Entry', durationSec: 45, isGreen: false },
      { name: 'Pedestrian Underpass Phase', durationSec: 35, isGreen: false },
    ],
    currentMode: 'adaptive',
    currentMetrics: { avgWaitTimeSec: 245, throughputVhr: 3000, congestionPct: 96 },
    recommendedPhase: 'Extended Ring Road Green + Left Turn',
    recommendedGreenDurationSec: 110,
    recommendedCycleLengthSec: 220,
    recommendedPhases: [
      { name: 'Ring Road South Extended', durationSec: 110, isGreen: true },
      { name: 'Aurobindo Marg Adaptive', durationSec: 55, isGreen: false },
      { name: 'Safdarjung Entry + Pedestrian', durationSec: 45, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 10, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 72, throughputIncreaseVhr: 580, congestionReductionPct: 20 },
    afterMetrics: { avgWaitTimeSec: 173, throughputVhr: 3580, congestionPct: 76 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'd-04',
    junctionName: 'Chandni Chowk Junction',
    city: 'Delhi',
    lat: 28.650,
    lng: 77.235,
    status: 'critical',
    currentPhase: 'Main Bazaar Green',
    currentGreenDurationSec: 70,
    currentCycleLengthSec: 200,
    currentPhases: [
      { name: 'Main Bazaar Green', durationSec: 70, isGreen: true },
      { name: 'Lahori Gate Approach', durationSec: 55, isGreen: false },
      { name: 'Red Fort Tourist Phase', durationSec: 40, isGreen: false },
      { name: 'Pedestrian + E-Rickshaw', durationSec: 35, isGreen: false },
    ],
    currentMode: 'fixed',
    currentMetrics: { avgWaitTimeSec: 195, throughputVhr: 1800, congestionPct: 91 },
    recommendedPhase: 'Adaptive with Tourist Surge Handling',
    recommendedGreenDurationSec: 60,
    recommendedCycleLengthSec: 170,
    recommendedPhases: [
      { name: 'Main Bazaar Adaptive', durationSec: 60, isGreen: true },
      { name: 'Lahori Gate Protected', durationSec: 45, isGreen: false },
      { name: 'Red Fort + Pedestrian', durationSec: 45, isGreen: false },
      { name: 'All-Red + E-Rickshaw Flush', durationSec: 20, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 48, throughputIncreaseVhr: 350, congestionReductionPct: 14 },
    afterMetrics: { avgWaitTimeSec: 147, throughputVhr: 2150, congestionPct: 77 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'd-05',
    junctionName: 'Karol Bagh Main Junction',
    city: 'Delhi',
    lat: 28.6514,
    lng: 77.1907,
    status: 'needs-optimization',
    currentPhase: 'Rohtak Road Green',
    currentGreenDurationSec: 55,
    currentCycleLengthSec: 160,
    currentPhases: [
      { name: 'Rohtak Road Green', durationSec: 55, isGreen: true },
      { name: 'Ajmal Khan Road', durationSec: 45, isGreen: false },
      { name: 'Patel Road Entry', durationSec: 35, isGreen: false },
      { name: 'Pedestrian Phase', durationSec: 25, isGreen: false },
    ],
    currentMode: 'fixed',
    currentMetrics: { avgWaitTimeSec: 95, throughputVhr: 2600, congestionPct: 68 },
    recommendedPhase: 'Adaptive Split with Bus Priority',
    recommendedGreenDurationSec: 60,
    recommendedCycleLengthSec: 145,
    recommendedPhases: [
      { name: 'Rohtak Road Adaptive + Bus', durationSec: 60, isGreen: true },
      { name: 'Ajmal Khan Road Protected', durationSec: 40, isGreen: false },
      { name: 'Patel Road + Pedestrian', durationSec: 35, isGreen: false },
      { name: 'All-Red Clearance', durationSec: 10, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 25, throughputIncreaseVhr: 290, congestionReductionPct: 9 },
    afterMetrics: { avgWaitTimeSec: 70, throughputVhr: 2890, congestionPct: 59 },
    optimizationState: 'idle',
  },
  {
    junctionId: 'd-06',
    junctionName: 'Rajiv Chowk Metro Junction',
    city: 'Delhi',
    lat: 28.633,
    lng: 77.219,
    status: 'optimal',
    currentPhase: 'Sansad Marg – Janpath Flow',
    currentGreenDurationSec: 40,
    currentCycleLengthSec: 100,
    currentPhases: [
      { name: 'Sansad Marg – Janpath Flow', durationSec: 40, isGreen: true },
      { name: 'Baba Kharak Singh Marg', durationSec: 35, isGreen: false },
      { name: 'Pedestrian Phase', durationSec: 25, isGreen: false },
    ],
    currentMode: 'adaptive',
    currentMetrics: { avgWaitTimeSec: 42, throughputVhr: 3200, congestionPct: 38 },
    recommendedPhase: 'Current Plan (Optimal)',
    recommendedGreenDurationSec: 40,
    recommendedCycleLengthSec: 100,
    recommendedPhases: [
      { name: 'Sansad Marg – Janpath Flow', durationSec: 40, isGreen: true },
      { name: 'Baba Kharak Singh Marg', durationSec: 35, isGreen: false },
      { name: 'Pedestrian Phase', durationSec: 25, isGreen: false },
    ],
    recommendedMode: 'adaptive',
    predictedImpact: { waitTimeReductionSec: 0, throughputIncreaseVhr: 0, congestionReductionPct: 0 },
    afterMetrics: { avgWaitTimeSec: 42, throughputVhr: 3200, congestionPct: 38 },
    optimizationState: 'idle',
  },
];

// ── Summary stats ──
export function getOptimizationSummary() {
  const opts = MOCK_SIGNAL_OPTIMIZATIONS;
  const total = opts.length;
  const critical = opts.filter((o) => o.status === 'critical').length;
  const needsOpt = opts.filter((o) => o.status === 'needs-optimization').length;
  const optimal = opts.filter((o) => o.status === 'optimal').length;
  const totalWaitReduction = opts.reduce((s, o) => s + o.predictedImpact.waitTimeReductionSec, 0);
  const totalThroughputGain = opts.reduce((s, o) => s + o.predictedImpact.throughputIncreaseVhr, 0);
  const delhi = opts.filter((o) => o.city === 'Delhi').length;
  const bengaluru = opts.filter((o) => o.city === 'Bengaluru').length;
  return { total, critical, needsOpt, optimal, totalWaitReduction, totalThroughputGain, delhi, bengaluru };
}
