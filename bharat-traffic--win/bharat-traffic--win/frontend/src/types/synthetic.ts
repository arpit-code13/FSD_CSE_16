// ── Synthetic Traffic Data Types ───────────────────────────────────────────
// These types define the unified data contract for the SyntheticTrafficProvider.
// When a real API (e.g. HERE Traffic) replaces the mock, it must return objects
// conforming to these same interfaces so the MapContainer layer stays unchanged.

export type TrafficLevel = 'free_flow' | 'slow' | 'congested' | 'gridlock';

export interface SyntheticRoadSegment {
  id: string;
  city: string;
  roadName: string;
  speed: number;             // km/h
  trafficLevel: TrafficLevel;
  vehicleCount: number;
  congestion: number;        // 0-100
  queueLength: number;       // vehicles
  timestamp: string;
  source: 'SYNTHETIC';
  coordinates: [number, number][];  // [lng, lat]
}

export interface SyntheticJunction {
  id: string;
  city: string;
  name: string;
  lat: number;
  lng: number;
  status: 'green' | 'yellow' | 'red' | 'critical';
  waitTimeSec: number;
  queueLengthVeh: number;
  congestionPct: number;
}

export interface SyntheticTrafficSignal {
  id: string;
  city: string;
  junctionId: string;
  mode: 'adaptive' | 'fixed' | 'emergency';
  cycleLengthSec: number;
  activePhase: string;
}

export interface SyntheticIncident {
  id: string;
  city: string;
  type: 'accident' | 'breakdown' | 'construction' | 'waterlogging';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  locationName: string;
  lat: number;
  lng: number;
  reportedAt: string;
  estimatedDelayMin: number;
}

export interface SyntheticCamera {
  id: string;
  city: string;
  name: string;
  lat: number;
  lng: number;
  type: 'ANPR' | 'speed' | 'cctv' | 'intersection';
  status: 'online' | 'offline';
}

export interface SyntheticSensor {
  id: string;
  city: string;
  name: string;
  lat: number;
  lng: number;
  type: 'loop' | 'radar' | 'weather' | 'air_quality';
  reading: string;
  status: 'active' | 'inactive';
}

export interface SyntheticBusStop {
  id: string;
  city: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

export interface SyntheticMetroStation {
  id: string;
  city: string;
  name: string;
  lat: number;
  lng: number;
  line: string;
}

export interface SyntheticTrafficData {
  city: string;
  roadsGeoJSON: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: {
        id: string;
        name: string;
        congestion: number;
        avgSpeedKmh: number;
        densityVehKm: number;
        roadStatus: string;
        speed: number;
        trafficLevel: string;
        vehicleCount: number;
        queueLength: number;
        timestamp: string;
        source: 'SYNTHETIC';
      };
      geometry: {
        type: 'LineString';
        coordinates: [number, number][];
      };
    }>;
  };
  roads: SyntheticRoadSegment[];
  junctions: SyntheticJunction[];
  signals: SyntheticTrafficSignal[];
  incidents: SyntheticIncident[];
  cameras: SyntheticCamera[];
  sensors: SyntheticSensor[];
  busStops: SyntheticBusStop[];
  metroStations: SyntheticMetroStation[];
  stats: {
    totalJunctions: number;
    totalCameras: number;
    totalSensors: number;
    totalIncidents: number;
    avgSpeedKmh: number;
    congestionIndex: number;
  };
}
