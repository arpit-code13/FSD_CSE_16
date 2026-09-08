/**
 * useWebSocket — connects to /ws/traffic for live data with REST fallback.
 *
 * Handles disconnects gracefully with backoff to prevent browser console spam.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../services/apiClient';

export interface TrafficSnapshot {
  type: string;
  timestamp: number;
  vehicles: Record<string, number>;
  speed: Record<string, number>;
  congestion: Record<string, string>;
  queue: Record<string, number>;
  signals: Array<{
    id: number;
    intersection_id: number;
    intersection_name: string;
    signal_type: string;
    cycle_time_seconds: number;
    is_active: boolean;
    phases: any;
  }>;
  incidents: Array<{
    id: number;
    incident_type: string;
    severity: string;
    status: string;
    description: string;
    latitude: number;
    longitude: number;
    road_id: number;
    intersection_id: number;
  }>;
  simulation: {
    id: number;
    name: string;
    scenario_type: string;
    status: string;
    started_at: string;
  } | null;
  summary: {
    total_vehicles: number;
    avg_speed_kmph: number;
    congestion_breakdown: Record<string, number>;
    active_incidents: number;
    active_signals: number;
  };
}

type ConnectionMode = 'websocket' | 'rest' | 'disconnected';

const WS_INITIAL_DELAY = 3000;
const WS_MAX_DELAY = 60000; // Cap at 1 minute
const WS_MAX_RETRIES = 15; // Stop reconnecting after 15 failures
const REST_POLL_INTERVAL = 15000;

export function useWebSocket() {
  const [data, setData] = useState<TrafficSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<ConnectionMode>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Get WebSocket URL — use current host so the Vite proxy handles it
  const getWsUrl = useCallback(() => {
    const token = localStorage.getItem('bharat_traffic_token');
    if (import.meta.env.VITE_WEBSOCKET_URL || import.meta.env.VITE_API_WS_URL) {
      const base = (
        import.meta.env.VITE_WEBSOCKET_URL ||
        import.meta.env.VITE_API_WS_URL
      ).replace(/\/ws\/?$/, ''); // strip trailing /ws to avoid /ws/ws/ duplication
      return `${base}/ws/traffic?token=${token || ''}`;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/traffic?token=${token || ''}`;
  }, []);

  // REST fallback poll
  const startRestPolling = useCallback(() => {
    if (restTimer.current) clearInterval(restTimer.current);
    setMode('rest');

    const poll = async () => {
      try {
        const response = await apiClient.get('/traffic/live');
        const d = response.data;
        const snapshot: TrafficSnapshot = {
          type: 'traffic_update',
          timestamp: Date.now(),
          vehicles: {},
          speed: {},
          congestion: {},
          queue: {},
          signals: [],
          incidents: Array.isArray(d?.top_congested_roads) ? d.top_congested_roads.map((r: any) => ({
            id: r.id,
            incident_type: 'unknown',
            severity: 'low',
            status: 'reported',
            description: r.name,
            latitude: 0,
            longitude: 0,
            road_id: r.id,
            intersection_id: 0,
          })) : [],
          simulation: null,
          summary: {
            total_vehicles: d.total_vehicles_tracked || 0,
            avg_speed_kmph: d.avg_speed_kmph || 0,
            congestion_breakdown: d.congestion_breakdown || {},
            active_incidents: d.active_incidents || 0,
            active_signals: d.total_signals || 0,
          },
        };
        if (mountedRef.current) {
          setData(snapshot);
          setConnected(true);
        }
      } catch {
        if (mountedRef.current) setConnected(false);
      }
    };

    poll();
    restTimer.current = setInterval(poll, REST_POLL_INTERVAL);
  }, []);

  // Connect WebSocket
  const connectWs = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (mountedRef.current) {
          setConnected(true);
          setMode('websocket');
          retryCountRef.current = 0; // Reset backoff on success
          if (restTimer.current) {
            clearInterval(restTimer.current);
            restTimer.current = null;
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const snapshot = JSON.parse(event.data) as TrafficSnapshot;
          if (mountedRef.current) {
            setData(snapshot);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (mountedRef.current) {
          setConnected(false);
          setMode('disconnected');
          startRestPolling();
          // Exponential backoff: 3s, 6s, 12s, … capped at 60s, stop after WS_MAX_RETRIES
          retryCountRef.current += 1;
          if (retryCountRef.current <= WS_MAX_RETRIES) {
            const delay = Math.min(WS_INITIAL_DELAY * Math.pow(2, retryCountRef.current - 1), WS_MAX_DELAY);
            reconnectTimer.current = setTimeout(connectWs, delay);
          }
        }
      };

      ws.onerror = () => {
        // Suppress console noise — onclose will handle reconnection
        try { ws.close(); } catch {}
      };

      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);

      ws.addEventListener('close', () => clearInterval(pingInterval));
    } catch {
      startRestPolling();
    }
  }, [getWsUrl, startRestPolling]);

  useEffect(() => {
    mountedRef.current = true;
    connectWs();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) try { wsRef.current.close(); } catch {}
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (restTimer.current) clearInterval(restTimer.current);
    };
  }, [connectWs]);

  return { data, connected, mode };
}
