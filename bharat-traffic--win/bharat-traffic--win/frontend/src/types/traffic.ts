export type CongestionLevel = 'clear' | 'moderate' | 'heavy' | 'severe';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'dispatched' | 'in_progress' | 'resolved';
export type IncidentType = 
  | 'accident' 
  | 'waterlogging' 
  | 'breakdown' 
  | 'construction' 
  | 'vip_movement' 
  | 'demonstration';

export type SignalMode = 'adaptive' | 'manual' | 'emergency' | 'fixed';

export interface Junction {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  status: 'green' | 'yellow' | 'red' | 'critical';
  currentWaitTimeSec: number;
  vehicleCount: number;
  congestionIndex: number; // 0-100
  signalMode: SignalMode;
  cycleLengthSec: number;
  activePhase: string;
  lastUpdated: string;
}

export interface SignalPhase {
  id: string;
  junctionId: string;
  phaseName: string;
  durationSec: number;
  isCurrent: boolean;
  isGreenCorridor: boolean;
}

export interface Incident {
  id: string;
  title: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  locationName: string;
  lat: number;
  lng: number;
  reportedAt: string;
  description: string;
  impactedLanes: number;
  estimatedDelayMin: number;
  dispatchedUnits?: string[];
}

export interface RouteOption {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  durationMin: number;
  normalDurationMin: number;
  congestionLevel: CongestionLevel;
  timeSavedMin: number;
  isRecommended: boolean;
  viaRoads: string[];
  co2EmissionsKg: number;
  coordinates: [number, number][]; // [lng, lat]
}

export interface DigitalTwinNode {
  id: string;
  name: string;
  type: 'junction' | 'corridor' | 'chokepoint';
  lat: number;
  lng: number;
  capacityVehiclesHr: number;
  currentFlowRateHr: number;
  averageSpeedKmh: number;
  queueLengthMeters: number;
  delaySecPerVeh: number;
  simulatedSpeedKmh: number;
}

export interface EmergencyCorridor {
  id: string;
  title: string;
  vehicleType: 'ambulance' | 'fire_brigade' | 'police' | 'vvip';
  source: string;
  destination: string;
  status: 'idle' | 'active' | 'cleared';
  etaMin: number;
  distanceKm: number;
  junctionIds: string[];
  startTime?: string;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  type: 'road_closure' | 'weather_event' | 'signal_failure' | 'demand_spike';
  targetArea: string;
  affectedJunctions: string[];
  congestionSpikePercent: number;
  travelTimeImpactMultiplier: number;
  suggestedMitigation: string;
  status: 'draft' | 'running' | 'completed';
}

export interface TrafficPrediction {
  hour: string;
  actualCongestion: number;
  predictedCongestion: number;
  averageSpeedKmh: number;
}

export interface TripHistory {
  id: string;
  origin: string;
  destination: string;
  date: string;
  distanceKm: number;
  durationMin: number;
  trafficSavedMin: number;
}

export interface CitySummaryStats {
  totalJunctions: number;
  activeAdaptiveSignals: number;
  totalVehiclesTracked: number;
  avgCitySpeedKmh: number;
  activeIncidents: number;
  activeEmergencyCorridors: number;
  dailyEmissionsTonnes: number;
  cityCongestionIndex: number; // 0 - 100
}
