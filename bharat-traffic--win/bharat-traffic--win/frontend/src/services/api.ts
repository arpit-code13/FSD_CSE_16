import apiClient from './apiClient';
import type {
  Junction,
  Incident,
  RouteOption,
  DigitalTwinNode,
  EmergencyCorridor,
  WhatIfScenario,
  TrafficPrediction,
  TripHistory,
  CitySummaryStats,
  SignalMode,
} from '../types/traffic';
import {
  MOCK_JUNCTIONS,
  MOCK_INCIDENTS,
  MOCK_ROUTES,
  MOCK_DIGITAL_TWIN_NODES,
  MOCK_EMERGENCY_CORRIDORS,
  MOCK_WHAT_IF_SCENARIOS,
  MOCK_PREDICTIONS,
  MOCK_TRIP_HISTORY,
  INITIAL_CITY_STATS,
} from '../mock/mockTrafficData';

// ── Helper Mappers ─────────────────────────────────────────────────

function mapSignalMode(signalType: string | null, isActive: boolean | null): SignalMode {
  if (!isActive) return 'fixed';
  switch (signalType) {
    case 'adaptive': return 'adaptive';
    case 'manual': return 'manual';
    case 'emergency': return 'emergency';
    case 'fixed': return 'fixed';
    default: return 'adaptive';
  }
}

function deriveJunctionStatus(congestion: number): Junction['status'] {
  if (congestion >= 85) return 'critical';
  if (congestion >= 65) return 'red';
  if (congestion >= 40) return 'yellow';
  return 'green';
}

function intersectionToJunction(ix: any): Junction {
  const signal = ix.signal;
  const congestionIndex = Math.min(100, Math.max(0,
    signal?.is_active ? (100 - (signal.cycle_time_seconds || 90) * 0.3) : 50
  ));
  return {
    id: `j-${ix.id}`,
    name: ix.name,
    city: 'Bengaluru',
    lat: ix.latitude,
    lng: ix.longitude,
    status: deriveJunctionStatus(congestionIndex),
    currentWaitTimeSec: signal?.cycle_time_seconds || 90,
    vehicleCount: ix.active_incidents ? ix.active_incidents * 50 : 200,
    congestionIndex: Math.round(congestionIndex),
    signalMode: mapSignalMode(signal?.signal_type || null, signal?.is_active || false),
    cycleLengthSec: signal?.cycle_time_seconds || 90,
    activePhase: signal?.phases?.active_phase || 'Standard Phase',
    lastUpdated: 'Just now',
  };
}

function backendIncidentToIncident(inc: any): Incident {
  return {
    id: `inc-${inc.id}`,
    title: inc.description || `${inc.incident_type} incident`,
    type: inc.incident_type as Incident['type'],
    severity: inc.severity as Incident['severity'],
    status: inc.status as Incident['status'],
    locationName: `Location ${inc.latitude?.toFixed(4)}, ${inc.longitude?.toFixed(4)}`,
    lat: inc.latitude || 0,
    lng: inc.longitude || 0,
    reportedAt: inc.reported_at ? new Date(inc.reported_at).toLocaleString() : 'Unknown',
    description: inc.description || '',
    impactedLanes: 1,
    estimatedDelayMin: inc.severity === 'critical' ? 30 : inc.severity === 'high' ? 20 : 10,
  };
}

// ── Traffic Service ────────────────────────────────────────────────

export const trafficService = {
  // GET /api/traffic/live
  getCityStats: async (): Promise<CitySummaryStats> => {
    try {
      const response = await apiClient.get('/traffic/live');
      const data = response.data;
      return {
        totalJunctions: data.total_intersections || INITIAL_CITY_STATS.totalJunctions,
        activeAdaptiveSignals: data.total_signals || INITIAL_CITY_STATS.activeAdaptiveSignals,
        totalVehiclesTracked: data.total_vehicles_tracked || INITIAL_CITY_STATS.totalVehiclesTracked,
        avgCitySpeedKmh: data.avg_speed_kmph || INITIAL_CITY_STATS.avgCitySpeedKmh,
        activeIncidents: INITIAL_CITY_STATS.activeIncidents,
        activeEmergencyCorridors: INITIAL_CITY_STATS.activeEmergencyCorridors,
        dailyEmissionsTonnes: INITIAL_CITY_STATS.dailyEmissionsTonnes,
        cityCongestionIndex: INITIAL_CITY_STATS.cityCongestionIndex,
      };
    } catch {
      return INITIAL_CITY_STATS;
    }
  },

  // GET /api/traffic/intersections
  getJunctions: async (): Promise<Junction[]> => {
    try {
      const response = await apiClient.get('/traffic/intersections');
      const intersections = response.data as any[];
      if (intersections.length > 0) {
        return intersections.map(intersectionToJunction);
      }
      return [...MOCK_JUNCTIONS];
    } catch {
      return [...MOCK_JUNCTIONS];
    }
  },

  // GET /api/traffic/roads
  getRoads: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/traffic/roads');
      return response.data as any[];
    } catch {
      return [];
    }
  },

  updateSignalMode: async (junctionId: string, mode: Junction['signalMode']): Promise<Junction> => {
    const junction = MOCK_JUNCTIONS.find((j) => j.id === junctionId);
    if (junction) {
      junction.signalMode = mode;
      return Promise.resolve({ ...junction });
    }
    return MOCK_JUNCTIONS[0];
  },

  // GET /api/incidents
  getIncidents: async (): Promise<Incident[]> => {
    try {
      const response = await apiClient.get('/incidents');
      const data = response.data as any[];
      if (data.length > 0) {
        return data.map(backendIncidentToIncident);
      }
      return [...MOCK_INCIDENTS];
    } catch {
      return [...MOCK_INCIDENTS];
    }
  },

  // POST /api/incidents
  reportIncident: async (newIncident: Omit<Incident, 'id' | 'reportedAt' | 'status'>): Promise<Incident> => {
    try {
      const response = await apiClient.post('/incidents', {
        city_id: 1,
        incident_type: newIncident.type,
        severity: newIncident.severity,
        description: newIncident.description || newIncident.title,
        latitude: newIncident.lat,
        longitude: newIncident.lng,
      });
      return backendIncidentToIncident(response.data);
    } catch {
      // Fallback to local mock
      return {
        ...newIncident,
        id: `inc-${Date.now()}`,
        reportedAt: 'Just now',
        status: 'reported',
      };
    }
  },

  // Route options — no real endpoint, use mock
  getRouteOptions: async (_origin: string, _destination: string): Promise<RouteOption[]> => {
    return [...MOCK_ROUTES];
  },

  // GET /api/digital-twin/intersections?city_id=1
  getDigitalTwinNodes: async (): Promise<DigitalTwinNode[]> => {
    try {
      const response = await apiClient.get('/digital-twin/intersections', { params: { city_id: 1 } });
      const data = response.data;
      const features = data.features || data;
      if (Array.isArray(features) && features.length > 0) {
        return features.map((f: any, idx: number) => {
          const props = f.properties || f;
          const geom = f.geometry;
          return {
            id: `dt-node-${props.id || idx + 1}`,
            name: `${props.name || `Node ${idx + 1}`} Hub Node`,
            type: idx % 3 === 0 ? 'chokepoint' : idx % 3 === 1 ? 'corridor' : 'junction',
            lat: geom?.coordinates?.[1] || props.latitude || 12.97,
            lng: geom?.coordinates?.[0] || props.longitude || 77.59,
            capacityVehiclesHr: 3600 + Math.floor(Math.random() * 1000),
            currentFlowRateHr: 3000 + Math.floor(Math.random() * 2000),
            averageSpeedKmh: 10 + Math.random() * 25,
            queueLengthMeters: 200 + Math.floor(Math.random() * 800),
            delaySecPerVeh: 50 + Math.floor(Math.random() * 150),
            simulatedSpeedKmh: 25 + Math.random() * 20,
          };
        });
      }
      return [...MOCK_DIGITAL_TWIN_NODES];
    } catch {
      return [...MOCK_DIGITAL_TWIN_NODES];
    }
  },

  // GET /api/emergency (stub from admin) — no real list endpoint, use mock
  getEmergencyCorridors: async (): Promise<EmergencyCorridor[]> => {
    return [...MOCK_EMERGENCY_CORRIDORS];
  },

  activateEmergencyCorridor: async (corridorId: string): Promise<EmergencyCorridor> => {
    const corr = MOCK_EMERGENCY_CORRIDORS.find((c) => c.id === corridorId);
    if (corr) {
      corr.status = 'active';
      return Promise.resolve({ ...corr });
    }
    return MOCK_EMERGENCY_CORRIDORS[0];
  },

  // GET /api/simulations — no list endpoint, use mock
  getWhatIfScenarios: async (): Promise<WhatIfScenario[]> => {
    return [...MOCK_WHAT_IF_SCENARIOS];
  },

  runWhatIfScenario: async (scenarioId: string): Promise<WhatIfScenario> => {
    const item = MOCK_WHAT_IF_SCENARIOS.find((s) => s.id === scenarioId);
    if (item) {
      item.status = 'running';
      return Promise.resolve({ ...item });
    }
    return MOCK_WHAT_IF_SCENARIOS[0];
  },

  // GET /api/predictions
  getPredictions: async (): Promise<TrafficPrediction[]> => {
    try {
      const response = await apiClient.get('/predictions');
      const preds = response.data as any[];
      if (preds.length > 0) {
        const hourlyMap = new Map<string, { totalSpeed: number; count: number }>();
        for (const p of preds) {
          const date = new Date(p.predicted_for);
          const hourStr = date.toTimeString().slice(0, 5);
          if (!hourlyMap.has(hourStr)) {
            hourlyMap.set(hourStr, { totalSpeed: 0, count: 0 });
          }
          const entry = hourlyMap.get(hourStr)!;
          entry.totalSpeed += p.predicted_avg_speed_kmph || 0;
          entry.count += 1;
        }
        const result: TrafficPrediction[] = [];
        for (const [hour, data] of hourlyMap) {
          const avgSpeed = data.count > 0 ? data.totalSpeed / data.count : 30;
          const congestion = Math.min(100, Math.max(0, Math.round(100 - avgSpeed * 2)));
          result.push({
            hour,
            actualCongestion: congestion,
            predictedCongestion: congestion - Math.floor(Math.random() * 5),
            averageSpeedKmh: Math.round(avgSpeed * 10) / 10,
          });
        }
        result.sort((a, b) => a.hour.localeCompare(b.hour));
        return result;
      }
      return [...MOCK_PREDICTIONS];
    } catch {
      return [...MOCK_PREDICTIONS];
    }
  },

  // Trip history — no backend endpoint
  getTripHistory: async (): Promise<TripHistory[]> => {
    return [...MOCK_TRIP_HISTORY];
  },
};

// ── Analytics Service ──────────────────────────────────────────────

export const analyticsService = {
  // GET /api/analytics/overview
  getOverview: async (cityId?: number): Promise<any> => {
    try {
      const params: any = {};
      if (cityId) params.city_id = cityId;
      const response = await apiClient.get('/analytics/overview', { params });
      return response.data;
    } catch {
      return null;
    }
  },

  // GET /api/analytics/traffic
  getTraffic: async (cityId?: number): Promise<any> => {
    try {
      const params: any = {};
      if (cityId) params.city_id = cityId;
      const response = await apiClient.get('/analytics/traffic', { params });
      return response.data;
    } catch {
      return null;
    }
  },

  // GET /api/analytics/congestion
  getCongestion: async (cityId?: number): Promise<any> => {
    try {
      const params: any = {};
      if (cityId) params.city_id = cityId;
      const response = await apiClient.get('/analytics/congestion', { params });
      return response.data;
    } catch {
      return null;
    }
  },

  // GET /api/analytics/signals
  getSignals: async (cityId?: number): Promise<any> => {
    try {
      const params: any = {};
      if (cityId) params.city_id = cityId;
      const response = await apiClient.get('/analytics/signals', { params });
      return response.data;
    } catch {
      return null;
    }
  },

  // GET /api/analytics/simulations
  getSimulations: async (cityId?: number): Promise<any> => {
    try {
      const params: any = {};
      if (cityId) params.city_id = cityId;
      const response = await apiClient.get('/analytics/simulations', { params });
      return response.data;
    } catch {
      return null;
    }
  },
};

// ── Signals Service ────────────────────────────────────────────────

export const signalsService = {
  // GET /api/signals
  list: async (cityId?: number): Promise<any[]> => {
    try {
      const params: any = {};
      if (cityId) params.city_id = cityId;
      const response = await apiClient.get('/signals', { params });
      return response.data as any[];
    } catch {
      return [];
    }
  },

  // POST /api/signals/optimize?signal_id=X
  optimize: async (signalId: number): Promise<any> => {
    try {
      const response = await apiClient.post('/signals/optimize', null, { params: { signal_id: signalId } });
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Optimization failed');
    }
  },

  // POST /api/signals/optimization/{id}/simulate
  simulate: async (optimizationId: number): Promise<any> => {
    try {
      const response = await apiClient.post(`/signals/optimization/${optimizationId}/simulate`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Simulation failed');
    }
  },

  // POST /api/signals/optimization/{id}/approve
  approve: async (optimizationId: number): Promise<any> => {
    try {
      const response = await apiClient.post(`/signals/optimization/${optimizationId}/approve`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Approval failed');
    }
  },
};

// ── Digital Twin Service ───────────────────────────────────────────

export const digitalTwinService = {
  // GET /api/digital-twin?city_id=X
  getOverview: async (cityId: number): Promise<any> => {
    try {
      const response = await apiClient.get('/digital-twin', { params: { city_id: cityId } });
      return response.data;
    } catch {
      return null;
    }
  },

  // GET /api/digital-twin/cities
  getCities: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/digital-twin/cities');
      const data = response.data;
      return data.features || [];
    } catch {
      return [];
    }
  },

  // GET /api/digital-twin/zones?city_id=X
  getZones: async (cityId: number): Promise<any[]> => {
    try {
      const response = await apiClient.get('/digital-twin/zones', { params: { city_id: cityId } });
      return response.data.features || [];
    } catch {
      return [];
    }
  },

  // GET /api/digital-twin/corridors?city_id=X
  getCorridors: async (cityId: number): Promise<any[]> => {
    try {
      const response = await apiClient.get('/digital-twin/corridors', { params: { city_id: cityId } });
      return response.data.features || [];
    } catch {
      return [];
    }
  },

  // GET /api/digital-twin/roads?city_id=X
  getRoads: async (cityId: number): Promise<any[]> => {
    try {
      const response = await apiClient.get('/digital-twin/roads', { params: { city_id: cityId } });
      return response.data.features || [];
    } catch {
      return [];
    }
  },

  // GET /api/digital-twin/intersections?city_id=X
  getIntersections: async (cityId: number): Promise<any[]> => {
    try {
      const response = await apiClient.get('/digital-twin/intersections', { params: { city_id: cityId } });
      return response.data.features || [];
    } catch {
      return [];
    }
  },

  // GET /api/digital-twin/signals?city_id=X
  getSignals: async (cityId: number): Promise<any[]> => {
    try {
      const response = await apiClient.get('/digital-twin/signals', { params: { city_id: cityId } });
      return response.data.features || [];
    } catch {
      return [];
    }
  },
};

// ── Simulations Service ────────────────────────────────────────────

export const simulationsService = {
  // POST /api/simulations
  create: async (data: { city_id: number; name: string; scenario_type: string; parameters: any }): Promise<any> => {
    try {
      const response = await apiClient.post('/simulations', data);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Simulation creation failed');
    }
  },

  // GET /api/simulations/{id}
  get: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.get(`/simulations/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  // GET /api/simulations/{id}/results
  getResults: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.get(`/simulations/${id}/results`);
      return response.data;
    } catch {
      return null;
    }
  },
};

// ── Emergency Service ──────────────────────────────────────────────

export const emergencyService = {
  // POST /api/emergency/routes
  create: async (data: {
    city_id: number;
    origin_intersection_id: number;
    destination_intersection_id: number;
    incident_id?: number;
    priority: string;
    name: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/emergency/routes', data);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Emergency route creation failed');
    }
  },

  // GET /api/emergency/{id}
  get: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.get(`/emergency/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  // POST /api/emergency/{id}/simulate
  simulate: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.post(`/emergency/${id}/simulate`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Simulation failed');
    }
  },

  // POST /api/emergency/{id}/approve
  approve: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.post(`/emergency/${id}/approve`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Approval failed');
    }
  },
};
