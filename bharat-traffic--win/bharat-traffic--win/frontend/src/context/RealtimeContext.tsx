import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  Junction,
  Incident,
  EmergencyCorridor,
  CitySummaryStats,
  DigitalTwinNode,
} from '../types/traffic';
import {
  MOCK_JUNCTIONS,
  MOCK_INCIDENTS,
  MOCK_EMERGENCY_CORRIDORS,
  MOCK_DIGITAL_TWIN_NODES,
  INITIAL_CITY_STATS,
} from '../mock/mockTrafficData';
import { useWebSocket, type TrafficSnapshot } from '../hooks/useWebSocket';

export type SimulationSpeed = 'realtime' | 'fast' | 'paused';

interface TelemetrySnapshot {
  timestamp: number;
  junctions: Junction[];
  incidents: Incident[];
  emergencyCorridors: EmergencyCorridor[];
  digitalTwinNodes: DigitalTwinNode[];
  cityStats: CitySummaryStats;
  tickCount: number;
}

interface RealtimeContextType {
  snapshot: TelemetrySnapshot;
  isRunning: boolean;
  speed: SimulationSpeed;
  toggleSimulation: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  refreshJunctions: () => void;
  updateJunctionInSnapshot: (id: string, updates: Partial<Junction>) => void;
  updateCorridorInSnapshot: (id: string, updates: Partial<EmergencyCorridor>) => void;
  // WebSocket state
  wsConnected: boolean;
  wsMode: 'websocket' | 'rest' | 'disconnected';
  wsData: TrafficSnapshot | null;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Helpers for realistic fluctuations
function fluctuate(value: number, range: number, min: number, max: number): number {
  const delta = (Math.random() - 0.5) * 2 * range;
  return Math.min(max, Math.max(min, Math.round((value + delta) * 10) / 10));
}

function fluctuateInt(value: number, range: number, min: number, max: number): number {
  return Math.round(fluctuate(value, range, min, max));
}

function mutateJunction(j: Junction): Junction {
  const newCongestion = fluctuateInt(j.congestionIndex, 3, 10, 98);
  const newWait = fluctuateInt(j.currentWaitTimeSec, 5, 15, 240);
  const newVehicleCount = fluctuateInt(j.vehicleCount, 30, 80, 2000);
  const newSpeed = fluctuate((j as any).avgSpeedKmh ?? 24, 2, 5, 60);

  let newStatus: Junction['status'] = 'green';
  if (newCongestion >= 85) newStatus = 'critical';
  else if (newCongestion >= 65) newStatus = 'red';
  else if (newCongestion >= 40) newStatus = 'yellow';

  return {
    ...j,
    congestionIndex: newCongestion,
    currentWaitTimeSec: newWait,
    vehicleCount: newVehicleCount,
    avgSpeedKmh: newSpeed,
    status: newStatus,
    lastUpdated: 'Just now',
  } as Junction;
}

function mutateIncident(inc: Incident): Incident {
  const shouldProgress = Math.random() < 0.05;
  let newStatus = inc.status;
  if (shouldProgress) {
    if (inc.status === 'reported') newStatus = 'dispatched';
    else if (inc.status === 'dispatched') newStatus = 'in_progress';
    else if (inc.status === 'in_progress') newStatus = 'resolved';
  }
  return { ...inc, status: newStatus };
}

function mutateDigitalTwinNode(node: DigitalTwinNode): DigitalTwinNode {
  return {
    ...node,
    currentFlowRateHr: fluctuateInt(node.currentFlowRateHr, 200, 1000, 6000),
    averageSpeedKmh: fluctuate(node.averageSpeedKmh, 2, 5, 60),
    simulatedSpeedKmh: fluctuate(node.simulatedSpeedKmh, 1.5, 10, 65),
    queueLengthMeters: fluctuateInt(node.queueLengthMeters, 40, 50, 1500),
    delaySecPerVeh: fluctuateInt(node.delaySecPerVeh, 8, 10, 250),
  };
}

function buildInitialSnapshot(): TelemetrySnapshot {
  return {
    timestamp: Date.now(),
    junctions: MOCK_JUNCTIONS.map((j) => ({ ...j })),
    incidents: MOCK_INCIDENTS.map((i) => ({ ...i })),
    emergencyCorridors: MOCK_EMERGENCY_CORRIDORS.map((c) => ({ ...c })),
    digitalTwinNodes: MOCK_DIGITAL_TWIN_NODES.map((n) => ({ ...n })),
    cityStats: { ...INITIAL_CITY_STATS },
    tickCount: 0,
  };
}

const TICK_INTERVAL: Record<SimulationSpeed, number> = {
  realtime: 3000,
  fast: 1000,
  paused: 0,
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(buildInitialSnapshot);
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState<SimulationSpeed>('realtime');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebSocket connection with REST fallback
  const { data: wsData, connected: wsConnected, mode: wsMode } = useWebSocket();

  // Merge WebSocket data into snapshot when available
  useEffect(() => {
    if (!wsData) return;

    setSnapshot((prev) => {
      // Map WebSocket signals to junctions defensively
      const signalsList = Array.isArray(wsData.signals) ? wsData.signals : [];
      const speedObj = wsData.speed || {};
      const vehiclesObj = wsData.vehicles || {};
      const congestionObj = wsData.congestion || {};
      const summaryObj = wsData.summary || {};
      const breakdownObj = summaryObj.congestion_breakdown || {};

      const wsJunctions: Junction[] = signalsList.map((sig) => {
        const speed = Object.values(speedObj)[0] || 24;
        const vehicleCount = Object.values(vehiclesObj).reduce((a, b) => a + b, 0);
        const congestionValues = Object.values(congestionObj);
        const worstCongestion = congestionValues.length > 0
          ? Math.max(...Object.keys(breakdownObj).map((k) => {
              const levels: Record<string, number> = { free_flow: 0, moderate: 1, slow: 2, congested: 3, gridlock: 4 };
              return (levels[k] || 0) * (breakdownObj[k] || 0);
            }))
          : 0;
        const congestionIndex = Math.min(100, Math.round((worstCongestion / Math.max(vehicleCount, 1)) * 100));

        let status: Junction['status'] = 'green';
        if (congestionIndex >= 85) status = 'critical';
        else if (congestionIndex >= 65) status = 'red';
        else if (congestionIndex >= 40) status = 'yellow';

        return {
          id: `j-${sig.intersection_id}`,
          name: sig.intersection_name || `Signal ${sig.id}`,
          city: 'Bengaluru',
          lat: 0,
          lng: 0,
          status,
          currentWaitTimeSec: sig.cycle_time_seconds || 90,
          vehicleCount: Math.round(vehicleCount / Math.max(signalsList.length, 1)),
          congestionIndex: Math.round(congestionIndex / Math.max(signalsList.length, 1)),
          signalMode: (sig.signal_type as any) || 'adaptive',
          cycleLengthSec: sig.cycle_time_seconds || 90,
          activePhase: (sig.phases as any)?.active_phase || 'Standard Phase',
          lastUpdated: 'Just now',
          avgSpeedKmh: speed,
        } as Junction;
      });

      // Map WebSocket incidents defensively
      const incidentsList = Array.isArray(wsData.incidents) ? wsData.incidents : [];
      const wsIncidents: Incident[] = incidentsList.map((inc) => ({
        id: `inc-${inc.id}`,
        title: inc.description || `${inc.incident_type} incident`,
        type: inc.incident_type as Incident['type'],
        severity: inc.severity as Incident['severity'],
        status: inc.status as Incident['status'],
        locationName: `Location ${inc.latitude?.toFixed(4)}, ${inc.longitude?.toFixed(4)}`,
        lat: inc.latitude || 0,
        lng: inc.longitude || 0,
        reportedAt: 'Just now',
        description: inc.description || '',
        impactedLanes: 1,
        estimatedDelayMin: inc.severity === 'critical' ? 30 : inc.severity === 'high' ? 20 : 10,
      }));

      // Update city stats from WS summary
      const newCityStats: CitySummaryStats = {
        ...prev.cityStats,
        totalVehiclesTracked: summaryObj.total_vehicles ?? prev.cityStats.totalVehiclesTracked,
        avgCitySpeedKmh: summaryObj.avg_speed_kmph ?? prev.cityStats.avgCitySpeedKmh,
        activeIncidents: summaryObj.active_incidents ?? prev.cityStats.activeIncidents,
      };

      return {
        ...prev,
        timestamp: wsData.timestamp || Date.now(),
        junctions: wsJunctions.length > 0 ? wsJunctions : prev.junctions,
        incidents: wsIncidents.length > 0 ? wsIncidents : prev.incidents,
        cityStats: newCityStats,
        tickCount: prev.tickCount + 1,
      };
    });
  }, [wsData]);

  // Local simulation tick (runs when no WS or as supplement)
  const tick = useCallback(() => {
    setSnapshot((prev) => {
      const newJunctions = prev.junctions.map(mutateJunction);
      const newIncidents = prev.incidents.map(mutateIncident);
      const newDigitalTwinNodes = prev.digitalTwinNodes.map(mutateDigitalTwinNode);

      const avgCongestion =
        Math.round(
          newJunctions.reduce((sum, j) => sum + j.congestionIndex, 0) / newJunctions.length
        );
      const avgSpeed =
        Math.round(
          (newJunctions.reduce((sum, j) => sum + ((j as any).avgSpeedKmh ?? 24), 0) / newJunctions.length) * 10
        ) / 10;

      const newCityStats: CitySummaryStats = {
        ...prev.cityStats,
        cityCongestionIndex: avgCongestion,
        avgCitySpeedKmh: avgSpeed,
        activeIncidents: newIncidents.filter((i) => i.status !== 'resolved').length,
      };

      return {
        timestamp: Date.now(),
        junctions: newJunctions,
        incidents: newIncidents,
        emergencyCorridors: [...prev.emergencyCorridors],
        digitalTwinNodes: newDigitalTwinNodes,
        cityStats: newCityStats,
        tickCount: prev.tickCount + 1,
      };
    });
  }, []);

  // Interval management — only run local sim if WS is not connected
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If WebSocket is providing data, reduce local tick frequency
    const effectiveInterval = wsConnected ? TICK_INTERVAL[speed] * 2 : TICK_INTERVAL[speed];

    if (isRunning && speed !== 'paused' && effectiveInterval > 0) {
      intervalRef.current = setInterval(tick, effectiveInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, speed, tick, wsConnected]);

  const toggleSimulation = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const refreshJunctions = useCallback(() => {
    setSnapshot((prev) => ({
      ...prev,
      junctions: prev.junctions.map(mutateJunction),
      timestamp: Date.now(),
    }));
  }, []);

  const updateJunctionInSnapshot = useCallback((id: string, updates: Partial<Junction>) => {
    setSnapshot((prev) => ({
      ...prev,
      junctions: prev.junctions.map((j) => (j.id === id ? { ...j, ...updates } : j)),
      timestamp: Date.now(),
    }));
  }, []);

  const updateCorridorInSnapshot = useCallback((id: string, updates: Partial<EmergencyCorridor>) => {
    setSnapshot((prev) => ({
      ...prev,
      emergencyCorridors: prev.emergencyCorridors.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      timestamp: Date.now(),
    }));
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        snapshot,
        isRunning,
        speed,
        toggleSimulation,
        setSpeed,
        refreshJunctions,
        updateJunctionInSnapshot,
        updateCorridorInSnapshot,
        wsConnected,
        wsMode,
        wsData,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
