/**
 * YOLO Vision Service — REST + WebSocket client for the YOLO detection module.
 *
 * REST endpoints (via apiClient):
 *   GET  /api/yolo/cameras           → camera list
 *   GET  /api/yolo/cameras/:id       → single camera
 *   POST /api/yolo/cameras           → register camera
 *   DEL  /api/yolo/cameras/:id       → remove camera
 *   GET  /api/yolo/cameras/:id/health → camera health
 *   GET  /api/yolo/snapshot           → detection snapshot
 *   GET  /api/yolo/density-trend      → density trend data
 *   GET  /api/yolo/alerts             → alerts list
 *   GET  /api/yolo/insight            → AI insight + prediction + recommendation
 *   GET  /api/yolo/model-info         → YOLO model metadata
 *   GET  /api/yolo/settings           → detection settings
 *   PATCH /api/yolo/settings          → update settings
 *
 * WebSocket:
 *   ws://host/ws/yolo?token=<JWT>&camera_id=cam-01
 *   → streams live snapshots every ~1.5s
 *
 * When the backend is unreachable, falls back to local synthetic data
 * so the UI always works in demo mode.
 */

import apiClient from './apiClient';

// ── Types ───────────────────────────────────────────────────────────

export type VehicleType = 'car' | 'bus' | 'truck' | 'bike' | 'auto' | 'bicycle' | 'person';
export type CameraStatusType = 'online' | 'offline' | 'maintenance';
export type TrendDirection = 'up' | 'down' | 'stable';
export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';
export type DensityLevel = 'Low' | 'Medium' | 'High' | 'Very High';
export type ConfidenceLevel = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: CameraStatusType;
  resolution: string;
  fps: number;
  last_frame_time: string | null;
  source_url: string | null;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  vehicle_type: VehicleType;
  confidence: number;
  bbox: BoundingBox;
  track_id: number | null;
}

export interface VehicleCount {
  vehicle_type: VehicleType;
  label: string;
  count: number;
  percentage: number;
  trend: TrendDirection;
}

export interface YoloSnapshot {
  timestamp: string;
  frame_index: number;
  camera_id: string;
  camera_name: string;
  camera_status: CameraStatusType;
  fps: number;
  confidence: number;
  total_vehicles: number;
  vehicle_counts: VehicleCount[];
  traffic_density: number;
  traffic_density_label: DensityLevel;
  queue_length_meters: number;
  queue_length_trend: TrendDirection;
  detections: Detection[];
  resolution: string;
}

export interface DensityTrendPoint {
  time: string;
  density: number;
  queue: number;
}

export interface DensityTrend {
  camera_id: string;
  points: DensityTrendPoint[];
}

export interface YoloAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  camera_id: string | null;
  auto_generated: boolean;
}

export interface AIInsight {
  summary: string;
  confidence: number;
  generated_at: string;
}

export interface Prediction {
  predicted_density: number;
  predicted_density_label: DensityLevel;
  predicted_queue_meters: number;
  predicted_queue_delta_meters: number;
  predicted_avg_speed_kmh: number;
  speed_delta_kmh: number;
}

export interface Recommendation {
  text: string;
  action_label: string;
  action_id: string | null;
}

export interface InsightBundle {
  insight: AIInsight;
  prediction: Prediction;
  recommendation: Recommendation;
}

export interface ModelInfo {
  model_name: string;
  dataset: string;
  last_updated: string;
  inference_device: string;
  input_size: number;
  classes: string[];
  version: string;
}

export interface YoloSettings {
  confidence_threshold: number;
  nms_iou_threshold: number;
  max_detections: number;
  enabled_classes: VehicleType[];
  input_source: string;
  processing_enabled: boolean;
}

// ── Vehicle type → color mapping (matches backend) ──────────────────

export const VEHICLE_COLORS: Record<VehicleType, string> = {
  car: '#22c55e',
  bus: '#f97316',
  truck: '#ef4444',
  bike: '#a855f7',
  auto: '#eab308',
  bicycle: '#06b6d4',
  person: '#64748b',
};

export const VEHICLE_ICONS: Record<VehicleType, string> = {
  car: '🚗',
  bus: '🚌',
  truck: '🚛',
  bike: '🏍️',
  auto: '🛺',
  bicycle: '🚲',
  person: '🚶',
};

// ── Fallback synthetic data (when backend is unreachable) ───────────

function _fallbackSnapshot(cameraId: string): YoloSnapshot {
  const total = 55 + Math.floor(Math.random() * 35);
  const cars = Math.floor(total * (0.50 + Math.random() * 0.15));
  const bikes = Math.floor(total * (0.18 + Math.random() * 0.12));
  const buses = Math.floor(total * (0.04 + Math.random() * 0.06));
  const trucks = total - cars - bikes - buses;

  return {
    timestamp: new Date().toISOString(),
    frame_index: Math.floor(Math.random() * 10000),
    camera_id: cameraId,
    camera_name: 'ITO Flyover Cam - 01',
    camera_status: 'online',
    fps: +(18 + Math.random() * 10).toFixed(1),
    confidence: +(85 + Math.random() * 13).toFixed(1),
    total_vehicles: total,
    vehicle_counts: [
      { vehicle_type: 'car', label: 'Cars', count: cars, percentage: +((cars / total) * 100).toFixed(1), trend: 'up' as const },
      { vehicle_type: 'bike', label: 'Bikes', count: bikes, percentage: +((bikes / total) * 100).toFixed(1), trend: 'up' as const },
      { vehicle_type: 'bus', label: 'Buses', count: buses, percentage: +((buses / total) * 100).toFixed(1), trend: 'down' as const },
      { vehicle_type: 'truck', label: 'Trucks', count: trucks, percentage: +((trucks / total) * 100).toFixed(1), trend: 'stable' as const },
    ],
    traffic_density: +(45 + Math.random() * 50).toFixed(1),
    traffic_density_label: 'High' as const,
    queue_length_meters: +(80 + Math.random() * 170).toFixed(0) as unknown as number,
    queue_length_trend: 'up' as const,
    detections: Array.from({ length: 10 + Math.floor(Math.random() * 10) }, (_, i) => ({
      id: `det-${i}`,
      vehicle_type: (['car', 'bus', 'truck', 'bike', 'auto', 'bicycle', 'person'] as VehicleType[])[Math.floor(Math.random() * 7)],
      confidence: +(0.70 + Math.random() * 0.29).toFixed(2),
      bbox: {
        x: +(Math.random() * 780).toFixed(1),
        y: +(Math.random() * 380).toFixed(1),
        width: +(40 + Math.random() * 60).toFixed(1),
        height: +(30 + Math.random() * 40).toFixed(1),
      },
      track_id: Math.floor(Math.random() * 200),
    })),
    resolution: '1280x720',
  };
}

function _fallbackCameras(): CameraFeed[] {
  return [
    { id: 'cam-01', name: 'ITO Flyover Cam - 01', location: 'ITO, Delhi', status: 'online', resolution: '1280x720', fps: 22.4, last_frame_time: new Date().toISOString(), source_url: null },
    { id: 'cam-02', name: 'Connaught Place Cam - 02', location: 'CP, Delhi', status: 'online', resolution: '1920x1080', fps: 24.0, last_frame_time: new Date().toISOString(), source_url: null },
    { id: 'cam-03', name: 'AIIMS Junction Cam - 03', location: 'AIIMS, Delhi', status: 'offline', resolution: '1280x720', fps: 0, last_frame_time: null, source_url: null },
    { id: 'cam-04', name: 'Chandni Chowk Cam - 04', location: 'Chandni Chowk, Delhi', status: 'online', resolution: '1280x720', fps: 20.1, last_frame_time: new Date().toISOString(), source_url: null },
  ];
}

function _fallbackAlerts(): YoloAlert[] {
  const now = new Date().toLocaleTimeString('en-IN', { hour12: false });
  return [
    { id: '1', severity: 'critical', title: 'High congestion detected', message: 'Density above 75% at ITO Flyover', timestamp: now, camera_id: 'cam-01', auto_generated: true },
    { id: '2', severity: 'warning', title: 'Queue length increasing', message: 'Queue length 186m and growing', timestamp: now, camera_id: 'cam-01', auto_generated: true },
    { id: '3', severity: 'info', title: 'Heavy truck detected', message: 'High truck count: 7', timestamp: now, camera_id: 'cam-01', auto_generated: true },
    { id: '4', severity: 'success', title: 'Camera quality good', message: 'Detection confidence stable at 92%', timestamp: now, camera_id: 'cam-01', auto_generated: true },
  ];
}

function _fallbackDensityTrend(): DensityTrend {
  const now = new Date();
  const points: DensityTrendPoint[] = Array.from({ length: 12 }, (_, i) => {
    const t = new Date(now.getTime() - (12 - i) * 900000);
    return {
      time: t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      density: +(40 + Math.random() * 50).toFixed(1),
      queue: +(80 + Math.random() * 140).toFixed(0) as unknown as number,
    };
  });
  return { camera_id: 'cam-01', points };
}

function _fallbackInsight(): InsightBundle {
  return {
    insight: {
      summary: 'Traffic density is high due to increased vehicle inflow. Queue likely to grow by 15–20% in next 15 minutes.',
      confidence: 91,
      generated_at: new Date().toISOString(),
    },
    prediction: {
      predicted_density: 85,
      predicted_density_label: 'High',
      predicted_queue_meters: 220,
      predicted_queue_delta_meters: 34,
      predicted_avg_speed_kmh: 18,
      speed_delta_kmh: -4,
    },
    recommendation: {
      text: 'Increase green time on ITO signal by 12s and divert heavy vehicles via Ring Road.',
      action_label: 'Apply Recommendation',
      action_id: null,
    },
  };
}

function _fallbackModelInfo(): ModelInfo {
  return {
    model_name: 'YOLOv8n',
    dataset: 'COCO + Custom Traffic',
    last_updated: '2025-09-03T20:18:00',
    inference_device: 'Edge GPU (RTX 3050)',
    input_size: 640,
    classes: ['car', 'bus', 'truck', 'bike', 'auto', 'bicycle', 'person'],
    version: '1.0.0',
  };
}

// ── REST API ────────────────────────────────────────────────────────

export const yoloService = {
  /** List all camera feeds. */
  getCameras: async (): Promise<CameraFeed[]> => {
    try {
      const { data } = await apiClient.get<CameraFeed[]>('/yolo/cameras');
      return data.length > 0 ? data : _fallbackCameras();
    } catch {
      return _fallbackCameras();
    }
  },

  /** Get a single camera by ID. */
  getCamera: async (cameraId: string): Promise<CameraFeed> => {
    try {
      const { data } = await apiClient.get<CameraFeed>(`/yolo/cameras/${cameraId}`);
      return data;
    } catch {
      return _fallbackCameras().find((c) => c.id === cameraId) || _fallbackCameras()[0];
    }
  },

  /** Run YOLO detection and get a snapshot. */
  getSnapshot: async (cameraId: string = 'cam-01'): Promise<YoloSnapshot> => {
    try {
      const { data } = await apiClient.get<YoloSnapshot>('/yolo/snapshot', { params: { camera_id: cameraId } });
      return data;
    } catch {
      return _fallbackSnapshot(cameraId);
    }
  },

  /** Get traffic density trend for a camera. */
  getDensityTrend: async (cameraId: string = 'cam-01', points: number = 12): Promise<DensityTrend> => {
    try {
      const { data } = await apiClient.get<DensityTrend>('/yolo/density-trend', { params: { camera_id: cameraId, points } });
      return data;
    } catch {
      return _fallbackDensityTrend();
    }
  },

  /** Get YOLO alerts (most recent). */
  getAlerts: async (limit: number = 10): Promise<YoloAlert[]> => {
    try {
      const { data } = await apiClient.get<YoloAlert[]>('/yolo/alerts', { params: { limit } });
      return data.length > 0 ? data : _fallbackAlerts();
    } catch {
      return _fallbackAlerts();
    }
  },

  /** Get AI insight + prediction + recommendation bundle. */
  getInsight: async (cameraId: string = 'cam-01'): Promise<InsightBundle> => {
    try {
      const { data } = await apiClient.get<InsightBundle>('/yolo/insight', { params: { camera_id: cameraId } });
      return data;
    } catch {
      return _fallbackInsight();
    }
  },

  /** Get YOLO model information. */
  getModelInfo: async (): Promise<ModelInfo> => {
    try {
      const { data } = await apiClient.get<ModelInfo>('/yolo/model-info');
      return data;
    } catch {
      return _fallbackModelInfo();
    }
  },

  /** Get YOLO detection settings. */
  getSettings: async (): Promise<YoloSettings> => {
    try {
      const { data } = await apiClient.get<YoloSettings>('/yolo/settings');
      return data;
    } catch {
      return {
        confidence_threshold: 0.5,
        nms_iou_threshold: 0.45,
        max_detections: 300,
        enabled_classes: ['car', 'bus', 'truck', 'bike', 'auto', 'bicycle', 'person'],
        input_source: 'demo',
        processing_enabled: true,
      };
    }
  },

  /** Update YOLO detection settings. */
  updateSettings: async (patch: Partial<YoloSettings>): Promise<YoloSettings> => {
    try {
      const { data } = await apiClient.patch<YoloSettings>('/yolo/settings', patch);
      return data;
    } catch {
      return { ...(_fallbackSnapshot('cam-01')), ...patch } as any;
    }
  },
};

// ── WebSocket Client ────────────────────────────────────────────────

export type YoloWsMessage =
  | { type: 'snapshot'; data: YoloSnapshot; timestamp: number }
  | { type: 'alert'; data: YoloAlert; timestamp: number }
  | { type: 'pong'; timestamp: number }
  | { type: 'error'; message: string };

export interface YoloWsOptions {
  cameraId?: string;
  onSnapshot?: (snapshot: YoloSnapshot) => void;
  onAlert?: (alert: YoloAlert) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

/**
 * Create a managed WebSocket connection for real-time YOLO detection streaming.
 * Returns a cleanup function that closes the connection.
 */
export function createYoloWs(options: YoloWsOptions): () => void {
  const token = localStorage.getItem('bharat_traffic_token') || '';
  const cameraId = options.cameraId || 'cam-01';

  const wsBase = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
  const url = `${wsBase}/ws/yolo?token=${encodeURIComponent(token)}&camera_id=${encodeURIComponent(cameraId)}`;

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function connect() {
    if (disposed) return;

    try {
      ws = new WebSocket(url);
    } catch {
      options.onError?.('WebSocket creation failed');
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      options.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as YoloWsMessage;
        if (msg.type === 'snapshot' && msg.data) {
          options.onSnapshot?.(msg.data);
        } else if (msg.type === 'alert' && msg.data) {
          options.onAlert?.(msg.data as YoloAlert);
        } else if (msg.type === 'pong') {
          // keep-alive acknowledged
        } else if (msg.type === 'error') {
          options.onError?.(msg.message);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      options.onDisconnect?.();
      if (!disposed) scheduleReconnect();
    };

    ws.onerror = () => {
      options.onError?.('WebSocket error');
    };
  }

  function scheduleReconnect() {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 3000);
  }

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
