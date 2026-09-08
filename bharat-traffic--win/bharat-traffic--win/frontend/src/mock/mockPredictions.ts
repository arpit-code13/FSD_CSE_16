// ── Prediction Mock Data for Time Horizons ──

export type TimeHorizon = 'current' | '15min' | '30min' | '60min';

export interface PredictionPoint {
  time: string;
  congestion: number;      // 0-100 %
  speed: number;           // km/h
  queueLength: number;     // meters (citywide avg)
  waitingTime: number;     // seconds (citywide avg)
  confidence?: number;     // 0-100 % (for future horizons)
}

export interface CorridorPrediction {
  name: string;
  currentCongestion: number;
  predictedCongestion15: number;
  predictedCongestion30: number;
  predictedCongestion60: number;
  trend: 'worsening' | 'improving' | 'stable';
}

export interface PeakWindow {
  label: string;
  startTime: string;
  endTime: string;
  expectedCongestion: number;
  expectedSpeed: number;
  confidence: number;
}

// ── CURRENT: minute-by-minute for last 30 min + next few minutes ──
export const CURRENT_PREDICTIONS: PredictionPoint[] = [
  { time: '18:00', congestion: 88, speed: 14, queueLength: 620, waitingTime: 145, confidence: 100 },
  { time: '18:02', congestion: 89, speed: 13, queueLength: 640, waitingTime: 152, confidence: 100 },
  { time: '18:04', congestion: 90, speed: 12, queueLength: 665, waitingTime: 158, confidence: 100 },
  { time: '18:06', congestion: 91, speed: 11, queueLength: 690, waitingTime: 165, confidence: 100 },
  { time: '18:08', congestion: 92, speed: 11, queueLength: 710, waitingTime: 172, confidence: 100 },
  { time: '18:10', congestion: 93, speed: 10, queueLength: 730, waitingTime: 178, confidence: 98 },
  { time: '18:12', congestion: 94, speed: 10, queueLength: 745, waitingTime: 182, confidence: 96 },
  { time: '18:14', congestion: 95, speed: 9, queueLength: 760, waitingTime: 188, confidence: 94 },
  { time: '18:16', congestion: 95, speed: 9, queueLength: 770, waitingTime: 192, confidence: 92 },
  { time: '18:18', congestion: 96, speed: 9, queueLength: 780, waitingTime: 195, confidence: 90 },
  { time: '18:20', congestion: 96, speed: 8, queueLength: 795, waitingTime: 198, confidence: 88 },
];

// ── 15 MIN: next 15 minutes in 1-min steps ──
export const PREDICTIONS_15MIN: PredictionPoint[] = [
  { time: '+1m', congestion: 96, speed: 8, queueLength: 800, waitingTime: 200, confidence: 87 },
  { time: '+2m', congestion: 96, speed: 8, queueLength: 810, waitingTime: 203, confidence: 85 },
  { time: '+3m', congestion: 97, speed: 8, queueLength: 820, waitingTime: 206, confidence: 83 },
  { time: '+4m', congestion: 97, speed: 7, queueLength: 830, waitingTime: 210, confidence: 81 },
  { time: '+5m', congestion: 97, speed: 7, queueLength: 840, waitingTime: 212, confidence: 79 },
  { time: '+6m', congestion: 97, speed: 7, queueLength: 845, waitingTime: 215, confidence: 77 },
  { time: '+7m', congestion: 96, speed: 8, queueLength: 835, waitingTime: 210, confidence: 75 },
  { time: '+8m', congestion: 96, speed: 8, queueLength: 825, waitingTime: 205, confidence: 73 },
  { time: '+9m', congestion: 95, speed: 8, queueLength: 815, waitingTime: 200, confidence: 71 },
  { time: '+10m', congestion: 95, speed: 9, queueLength: 800, waitingTime: 195, confidence: 69 },
  { time: '+11m', congestion: 94, speed: 9, queueLength: 785, waitingTime: 190, confidence: 67 },
  { time: '+12m', congestion: 93, speed: 10, queueLength: 770, waitingTime: 185, confidence: 65 },
  { time: '+13m', congestion: 92, speed: 10, queueLength: 755, waitingTime: 180, confidence: 63 },
  { time: '+14m', congestion: 91, speed: 11, queueLength: 740, waitingTime: 175, confidence: 61 },
  { time: '+15m', congestion: 90, speed: 11, queueLength: 725, waitingTime: 170, confidence: 59 },
];

// ── 30 MIN: next 30 minutes in 2-min steps ──
export const PREDICTIONS_30MIN: PredictionPoint[] = [
  { time: '+2m', congestion: 96, speed: 8, queueLength: 815, waitingTime: 205, confidence: 84 },
  { time: '+4m', congestion: 97, speed: 7, queueLength: 840, waitingTime: 212, confidence: 79 },
  { time: '+6m', congestion: 97, speed: 7, queueLength: 845, waitingTime: 215, confidence: 74 },
  { time: '+8m', congestion: 96, speed: 8, queueLength: 830, waitingTime: 208, confidence: 70 },
  { time: '+10m', congestion: 95, speed: 9, queueLength: 800, waitingTime: 195, confidence: 66 },
  { time: '+12m', congestion: 93, speed: 10, queueLength: 770, waitingTime: 185, confidence: 62 },
  { time: '+14m', congestion: 91, speed: 11, queueLength: 740, waitingTime: 175, confidence: 58 },
  { time: '+16m', congestion: 89, speed: 12, queueLength: 710, waitingTime: 165, confidence: 55 },
  { time: '+18m', congestion: 87, speed: 14, queueLength: 680, waitingTime: 155, confidence: 52 },
  { time: '+20m', congestion: 85, speed: 15, queueLength: 650, waitingTime: 148, confidence: 49 },
  { time: '+22m', congestion: 83, speed: 16, queueLength: 620, waitingTime: 140, confidence: 46 },
  { time: '+24m', congestion: 80, speed: 17, queueLength: 590, waitingTime: 132, confidence: 43 },
  { time: '+26m', congestion: 78, speed: 18, queueLength: 560, waitingTime: 125, confidence: 41 },
  { time: '+28m', congestion: 76, speed: 20, queueLength: 530, waitingTime: 118, confidence: 39 },
  { time: '+30m', congestion: 74, speed: 21, queueLength: 500, waitingTime: 112, confidence: 37 },
];

// ── 60 MIN: next hour in 5-min steps ──
export const PREDICTIONS_60MIN: PredictionPoint[] = [
  { time: '+5m', congestion: 97, speed: 7, queueLength: 840, waitingTime: 212, confidence: 79 },
  { time: '+10m', congestion: 95, speed: 9, queueLength: 800, waitingTime: 195, confidence: 66 },
  { time: '+15m', congestion: 90, speed: 11, queueLength: 725, waitingTime: 170, confidence: 55 },
  { time: '+20m', congestion: 85, speed: 15, queueLength: 650, waitingTime: 148, confidence: 47 },
  { time: '+25m', congestion: 80, speed: 17, queueLength: 580, waitingTime: 130, confidence: 41 },
  { time: '+30m', congestion: 74, speed: 21, queueLength: 500, waitingTime: 112, confidence: 37 },
  { time: '+35m', congestion: 68, speed: 24, queueLength: 430, waitingTime: 95, confidence: 33 },
  { time: '+40m', congestion: 62, speed: 28, queueLength: 370, waitingTime: 82, confidence: 30 },
  { time: '+45m', congestion: 56, speed: 31, queueLength: 320, waitingTime: 72, confidence: 27 },
  { time: '+50m', congestion: 50, speed: 34, queueLength: 270, waitingTime: 62, confidence: 25 },
  { time: '+55m', congestion: 45, speed: 37, queueLength: 230, waitingTime: 55, confidence: 23 },
  { time: '+60m', congestion: 40, speed: 40, queueLength: 200, waitingTime: 48, confidence: 21 },
];

// ── Corridor-Level Predictions ──
export const CORRIDOR_PREDICTIONS: CorridorPrediction[] = [
  { name: 'ORR South (Silk Board)', currentCongestion: 92, predictedCongestion15: 97, predictedCongestion30: 95, predictedCongestion60: 85, trend: 'worsening' },
  { name: 'Hebbal Flyover–Ballari Rd', currentCongestion: 95, predictedCongestion15: 97, predictedCongestion30: 90, predictedCongestion60: 74, trend: 'improving' },
  { name: 'ORR East (Bellandur–Marathahalli)', currentCongestion: 85, predictedCongestion15: 88, predictedCongestion30: 82, predictedCongestion60: 65, trend: 'improving' },
  { name: 'Hosur Road Elevated', currentCongestion: 58, predictedCongestion15: 62, predictedCongestion30: 55, predictedCongestion60: 40, trend: 'stable' },
  { name: 'MG Road CBD Corridor', currentCongestion: 42, predictedCongestion15: 45, predictedCongestion30: 38, predictedCongestion60: 28, trend: 'improving' },
  { name: 'Whitefield Main Road', currentCongestion: 72, predictedCongestion15: 78, predictedCongestion30: 70, predictedCongestion60: 55, trend: 'worsening' },
  { name: 'Koramangala 100ft Road', currentCongestion: 48, predictedCongestion15: 52, predictedCongestion30: 45, predictedCongestion60: 32, trend: 'stable' },
  { name: 'Mysore Road Elevated', currentCongestion: 30, predictedCongestion15: 32, predictedCongestion30: 28, predictedCongestion60: 22, trend: 'stable' },
];

// ── Peak Window Predictions ──
export const PEAK_WINDOWS: PeakWindow[] = [
  { label: 'Evening Peak (now)', startTime: '17:30', endTime: '19:30', expectedCongestion: 96, expectedSpeed: 9, confidence: 88 },
  { label: 'Late Evening Recovery', startTime: '19:30', endTime: '21:00', expectedCongestion: 65, expectedSpeed: 28, confidence: 72 },
  { label: 'Night Clear', startTime: '21:00', endTime: '23:00', expectedCongestion: 35, expectedSpeed: 42, confidence: 85 },
];

// ── Helper to get data for a horizon ──
export function getPredictionsForHorizon(horizon: TimeHorizon): PredictionPoint[] {
  switch (horizon) {
    case 'current': return CURRENT_PREDICTIONS;
    case '15min': return PREDICTIONS_15MIN;
    case '30min': return PREDICTIONS_30MIN;
    case '60min': return PREDICTIONS_60MIN;
  }
}

// ── Helper to get summary stats for a horizon ──
export function getHorizonSummary(horizon: TimeHorizon) {
  const data = getPredictionsForHorizon(horizon);
  const last = data[data.length - 1];
  const first = data[0];
  return {
    currentCongestion: first.congestion,
    predictedCongestion: last.congestion,
    congestionDelta: last.congestion - first.congestion,
    currentSpeed: first.speed,
    predictedSpeed: last.speed,
    speedDelta: last.speed - first.speed,
    currentQueue: first.queueLength,
    predictedQueue: last.queueLength,
    queueDelta: last.queueLength - first.queueLength,
    currentWait: first.waitingTime,
    predictedWait: last.waitingTime,
    waitDelta: last.waitingTime - first.waitingTime,
    avgConfidence: Math.round(data.reduce((s, d) => s + (d.confidence || 0), 0) / data.length),
  };
}
