import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { trafficService } from '../../services/api';
import type { Junction, Incident } from '../../types/traffic';

import { useRealtime } from '../../context/RealtimeContext';
import { useApp } from '../../context/AppContext';
import { getSyntheticTrafficData } from '../../services/syntheticTrafficProvider';
import type { SyntheticTrafficData } from '../../types/synthetic';
import { MapContainer } from '../../components/common/MapContainer';
import { MOCK_EMERGENCY_CORRIDORS, corridorsToMapFormat } from '../../mock/mockEmergency';
import {
  fetchTrafficFlow,

  expandBounds,
} from '../../services/hereTrafficApi';
import type { TrafficFlowGeoJSON } from '../../services/hereTrafficApi';
import { CITIES } from '../../data/cityData';
import {
  Map,
  Layers,
  Activity,
  Clock,
  Car,
  Gauge,
  AlertTriangle,

  X,
  Radio,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type InspectorTarget =
  | { type: 'road'; data: any }
  | { type: 'junction'; data: Junction }
  | null;

interface TrafficFlowProps {
  speed: number;
  freeFlowSpeed: number;
  jamFactor: number;
  confidence: number;
  trafficLevel: string;
  roadName: string;
  updated: string;
  source: string;
  lat: number;
  lng: number;
}

// ── Traffic Layer Controls ──────────────────────────────────────────────────

interface LayerToggles {
  flow: boolean;
  speed: boolean;
  incidents: boolean;
  junctions: boolean;
}

// ── Main Component ─────────────────────────────────────────────────────────

export const AdminLiveTraffic: React.FC = () => {
  const { selectedCity, setSelectedCity } = useApp();
  const { snapshot, wsConnected, wsMode } = useRealtime();

  // ── State ──
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<InspectorTarget>(null);
  const [trafficFlow, setTrafficFlow] = useState<TrafficFlowGeoJSON | null>(null);
  const [trafficSource, setTrafficSource] = useState<'HERE' | 'SYNTHETIC' | 'loading'>('loading');
  const [lastUpdated, setLastUpdated] = useState<string>('--:--:--');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [layers, setLayers] = useState<LayerToggles>({
    flow: true,
    speed: false,
    incidents: true,
    junctions: true,
  });
  const [selectedFlowProps, setSelectedFlowProps] = useState<TrafficFlowProps | null>(null);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const greenCorridors = useMemo(() => corridorsToMapFormat(MOCK_EMERGENCY_CORRIDORS), []);

  const synthData: SyntheticTrafficData = useMemo(
    () => getSyntheticTrafficData(selectedCity),
    [selectedCity]
  );

  // ── Fetch HERE Traffic Flow ──
  const fetchTraffic = useCallback(async () => {
    const cityCfg = CITIES[selectedCity] || CITIES['Bengaluru'];
    const [lng, lat] = cityCfg.center;
    const dLat = 0.15;
    const dLng = 0.18;
    const bounds = {
      north: lat + dLat,
      south: lat - dLat,
      east: lng + dLng,
      west: lng - dLng,
    };

    try {
      const flowData = await fetchTrafficFlow(expandBounds(bounds, 0.1));
      setTrafficFlow(flowData);
      const src = flowData.meta?.source === 'HERE' ? 'HERE' : 'SYNTHETIC';
      setTrafficSource(src as 'HERE' | 'SYNTHETIC');
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
    } catch {
      // Fallback to synthetic
      setTrafficFlow(null);
      setTrafficSource('SYNTHETIC');
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }
  }, [selectedCity]);

  // ── Fetch traffic on city change ──
  useEffect(() => {
    setTrafficSource('loading');
    setSelectedTarget(null);
    setSelectedFlowProps(null);
    fetchTraffic();
  }, [selectedCity, fetchTraffic]);

  // ── Fetch junctions + incidents ──
  useEffect(() => {
    const cityJunctions: Junction[] = synthData.junctions.map((sj) => ({
      id: sj.id,
      name: sj.name,
      city: selectedCity,
      lat: sj.lat,
      lng: sj.lng,
      status: sj.status,
      currentWaitTimeSec: sj.waitTimeSec,
      vehicleCount: sj.queueLengthVeh,
      congestionIndex: sj.congestionPct,
      signalMode: sj.status === 'critical' ? 'adaptive' : 'fixed',
      cycleLengthSec: sj.status === 'critical' ? 200 : sj.congestionPct > 60 ? 160 : 90,
      activePhase: sj.status === 'critical' ? 'Green Corridor Override' : 'Standard Phase',
      lastUpdated: trafficSource === 'HERE' ? 'HERE' : 'SYNTHETIC',
    }));
    setJunctions(cityJunctions);
    trafficService.getIncidents().then(setIncidents);
  }, [selectedCity, synthData, trafficSource]);

  // ── Auto Refresh (60s) ──
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchTraffic();
      }, 60_000);
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [autoRefresh, fetchTraffic]);

  // ── Sync with real-time simulation ──
  useEffect(() => {
    setJunctions((prev) =>
      prev.map((localJ) => {
        const realtimeJ = snapshot.junctions.find((rj) => rj.id === localJ.id);
        if (realtimeJ) {
          return {
            ...localJ,
            congestionIndex: realtimeJ.congestionIndex,
            currentWaitTimeSec: realtimeJ.currentWaitTimeSec,
            vehicleCount: realtimeJ.vehicleCount,
            status: realtimeJ.status,
            signalMode: realtimeJ.signalMode,
          };
        }
        return localJ;
      })
    );
  }, [snapshot.junctions]);

  // ── Computed Stats from HERE flow data ──
  const trafficStats = useMemo(() => {
    if (!trafficFlow?.features || trafficFlow.features.length === 0) {
      return { totalSegments: 0, smoothPct: 0, moderatePct: 0, heavyPct: 0, avgSpeed: 0, congestionPct: 0 };
    }
    const features = trafficFlow.features;
    const total = features.length;
    const smooth = features.filter((f) => f.properties.trafficLevel === 'smooth').length;
    const moderate = features.filter((f) => f.properties.trafficLevel === 'moderate').length;
    const heavy = features.filter((f) => f.properties.trafficLevel === 'heavy' || f.properties.trafficLevel === 'severe').length;
    const avgSpeed = Math.round(features.reduce((s, f) => s + f.properties.speed, 0) / total);
    const congestionPct = Math.round(((moderate + heavy) / total) * 100);
    return {
      totalSegments: total,
      smoothPct: Math.round((smooth / total) * 100),
      moderatePct: Math.round((moderate / total) * 100),
      heavyPct: Math.round((heavy / total) * 100),
      avgSpeed,
      congestionPct,
    };
  }, [trafficFlow]);

  // ── Top Congested Corridors ──
  const topCorridors = useMemo(() => {
    if (!trafficFlow?.features) return [];
    const sorted = [...trafficFlow.features]
      .sort((a, b) => a.properties.speed - b.properties.speed)
      .slice(0, 5);
    return sorted.map((f) => ({
      name: f.properties.roadName || 'Unknown Road',
      speed: f.properties.speed,
      jamFactor: f.properties.jamFactor,
      level: f.properties.trafficLevel,
    }));
  }, [trafficFlow]);

  // ── Traffic Feed (recent segments) ──
  const trafficFeed = useMemo(() => {
    if (!trafficFlow?.features) return [];
    return trafficFlow.features.slice(0, 15).map((f) => ({
      roadName: f.properties.roadName || 'Unknown Road',
      speed: f.properties.speed,
      jamFactor: f.properties.jamFactor,
      trafficLevel: f.properties.trafficLevel,
      updated: f.properties.updated,
    }));
  }, [trafficFlow]);

  // ── Incident count ──
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved').length;

  // ── Click handlers ──
  const handleTrafficFlowClick = useCallback((props: TrafficFlowProps) => {
    setSelectedFlowProps(props);
    setSelectedTarget({ type: 'road', data: props });
  }, []);

  const handleJunctionClick = useCallback((junction: Junction) => {
    setSelectedFlowProps(null);
    setSelectedTarget({ type: 'junction', data: junction });
  }, []);

  const handleCitySelect = useCallback((city: string) => {
    setSelectedCity(city);
    setShowCityMenu(false);
  }, [setSelectedCity]);

  // ── Traffic source color ──
  const isReal = trafficSource === 'HERE';

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-2">
      {/* ══════════════════════════════════════════════════════════════════════
          TOP BAR — Command Center Header
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-slate-100 font-mono flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            LIVE TRAFFIC & JUNCTION TELEMETRY
          </h2>
          {/* HERE LIVE / DEMO badge */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-mono font-bold ${
            isReal
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isReal ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isReal ? 'HERE LIVE' : trafficSource === 'loading' ? 'LOADING...' : 'DEMO DATA'}
          </div>
          {/* Last Updated */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-mono">
            <Clock className="w-2.5 h-2.5 text-slate-500" />
            <span className="text-slate-400">Last Updated</span>
            <span className="text-cyan-300 font-bold">{lastUpdated}</span>
          </div>
          {/* Auto Refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-mono font-bold transition-all ${
              autoRefresh
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <RefreshCw className={`w-2.5 h-2.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          {/* Manual Refresh */}
          <button
            onClick={fetchTraffic}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all text-[9px] font-mono"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Refresh Now
          </button>
        </div>

        {/* Summary Telemetry Cards */}
        <div className="flex items-center gap-2 flex-wrap">
          <TelemetryMini label="Vehicles" value={junctions.reduce((s, j) => s + j.vehicleCount, 0).toLocaleString()} icon={Car} color="cyan" />
          <TelemetryMini label="Avg Speed" value={`${trafficStats.avgSpeed || '—'} km/h`} icon={Gauge} color={trafficStats.avgSpeed < 20 ? 'red' : 'emerald'} />
          <TelemetryMini label="Congestion" value={`${trafficStats.congestionPct}%`} icon={Activity} color={trafficStats.congestionPct > 70 ? 'red' : trafficStats.congestionPct > 40 ? 'amber' : 'emerald'} />
          <TelemetryMini label="Junctions" value={`${junctions.length}`} icon={Zap} color="purple" />
          <TelemetryMini label="Incidents" value={`${activeIncidents}`} icon={AlertTriangle} color={activeIncidents > 0 ? 'red' : 'emerald'} />
          {/* WS Status */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-mono ${
            wsConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {wsMode === 'websocket' ? 'WS LIVE' : wsMode === 'rest' ? 'REST' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TRAFFIC CONTROLS BAR
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5">
        <Layers className="w-3 h-3 text-slate-500" />
        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Traffic Layer:</span>
        <ToggleChip active={layers.flow} label="Flow" onToggle={() => setLayers((l) => ({ ...l, flow: !l.flow }))} color="emerald" />
        <ToggleChip active={layers.speed} label="Speed" onToggle={() => setLayers((l) => ({ ...l, speed: !l.speed }))} color="cyan" />
        <ToggleChip active={layers.incidents} label="Incidents" onToggle={() => setLayers((l) => ({ ...l, incidents: !l.incidents }))} color="red" />
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <ToggleChip active={layers.junctions} label="Show Junctions" onToggle={() => setLayers((l) => ({ ...l, junctions: !l.junctions }))} color="amber" />
        {/* City Selector */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowCityMenu(!showCityMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-bold font-mono text-cyan-300 hover:text-cyan-200 hover:border-cyan-500/40 transition-all"
          >
            <Map className="w-3 h-3 text-cyan-400" />
            {selectedCity}
          </button>
          {showCityMenu && (
            <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-40 w-44 font-mono text-xs space-y-0.5">
              <div className="text-[9px] text-slate-500 font-bold px-2 py-1 uppercase">Select City</div>
              {['Bengaluru', 'Delhi-NCR', 'Mumbai', 'Hyderabad'].map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                    selectedCity === city
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN GRID: Map (3 cols) + Right Sidebar (1 col)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 min-h-0">
        {/* ── MAP PANEL ── */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <MapContainer
              junctions={layers.junctions ? junctions : []}
              incidents={layers.incidents ? incidents : []}
              roadGeoJSON={synthData.roadsGeoJSON as any}
              cameras={synthData.cameras}
              sensors={synthData.sensors}
              busStops={synthData.busStops}
              metroStations={synthData.metroStations}
              greenCorridors={greenCorridors}
              trafficFlowGeoJSON={layers.flow ? trafficFlow : null}
              onTrafficFlowClick={handleTrafficFlowClick}
              onJunctionClick={handleJunctionClick}
              selectedJunctionId={selectedTarget?.type === 'junction' ? selectedTarget.data.id : null}
            />
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="flex flex-col min-h-0 gap-2 overflow-hidden">

          {/* ── Selected Road Detail Panel ── */}
          {selectedTarget?.type === 'road' && selectedFlowProps && (
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Gauge className="w-3 h-3" />
                  SELECTED ROAD SEGMENT
                </h3>
                <button
                  onClick={() => { setSelectedTarget(null); setSelectedFlowProps(null); }}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <h4 className="text-sm font-bold text-slate-100">{selectedFlowProps.roadName}</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  <RoadStat label="Speed" value={`${selectedFlowProps.speed} km/h`} color={selectedFlowProps.speed < 20 ? 'text-red-400' : 'text-emerald-400'} />
                  <RoadStat label="Jam Factor" value={`${selectedFlowProps.jamFactor}`} color={selectedFlowProps.jamFactor > 5 ? 'text-red-400' : 'text-emerald-400'} />
                  <RoadStat label="Traffic" value={selectedFlowProps.trafficLevel.toUpperCase()} color={selectedFlowProps.trafficLevel === 'smooth' ? 'text-emerald-400' : selectedFlowProps.trafficLevel === 'moderate' ? 'text-amber-400' : 'text-red-400'} />
                  <RoadStat label="Confidence" value={`${selectedFlowProps.confidence}`} color="text-slate-300" />
                </div>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Last Updated</span>
                    <span className="text-slate-300">{selectedFlowProps.updated || '—'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Source</span>
                    <span className={isReal ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {selectedFlowProps.source || 'HERE'} Traffic API
                    </span>
                  </div>
                </div>
                <div className={`text-[9px] font-bold text-center py-1 rounded-lg border ${
                  isReal ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  Source: {isReal ? 'HERE Traffic API' : 'DEMO / SYNTHETIC'}
                </div>
              </div>
            </div>
          )}

          {/* ── Junction Inspector ── */}
          {selectedTarget?.type === 'junction' && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  JUNCTION INSPECTOR
                </h3>
                <button
                  onClick={() => setSelectedTarget(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <h4 className="text-sm font-bold text-slate-100">{selectedTarget.data.name}</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  <RoadStat label="Wait Time" value={`${selectedTarget.data.currentWaitTimeSec}s`} color={selectedTarget.data.currentWaitTimeSec > 120 ? 'text-red-400' : 'text-emerald-400'} />
                  <RoadStat label="Queue" value={`${selectedTarget.data.vehicleCount}`} color="text-cyan-400" />
                  <RoadStat label="Congestion" value={`${selectedTarget.data.congestionIndex}%`} color={selectedTarget.data.congestionIndex > 80 ? 'text-red-400' : 'text-emerald-400'} />
                  <RoadStat label="Mode" value={selectedTarget.data.signalMode?.toUpperCase()} color="text-purple-400" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Active Phase</span>
                  <span className="text-cyan-400">{selectedTarget.data.activePhase}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Live Traffic Summary ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shrink-0">
            <h3 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono pb-2 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-cyan-400" />
                Live Traffic Summary
              </span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded ${isReal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {isReal ? 'HERE' : 'DEMO'}
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              <StatPill label="Smooth" value={`${trafficStats.smoothPct}%`} color="bg-emerald-500/20 text-emerald-400" />
              <StatPill label="Moderate" value={`${trafficStats.moderatePct}%`} color="bg-amber-500/20 text-amber-400" />
              <StatPill label="Heavy" value={`${trafficStats.heavyPct}%`} color="bg-red-500/20 text-red-400" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-[8px] text-slate-500 block">Segments</span>
                <span className="text-[11px] font-mono font-bold text-cyan-300">{trafficStats.totalSegments}</span>
              </div>
              <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-[8px] text-slate-500 block">Avg Speed</span>
                <span className="text-[11px] font-mono font-bold text-slate-200">{trafficStats.avgSpeed} km/h</span>
              </div>
            </div>
          </div>

          {/* ── Top Congested Corridors ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
            <h3 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono px-3 py-2 border-b border-slate-800 shrink-0">
              Top Congested Corridors
            </h3>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {topCorridors.length === 0 ? (
                <div className="text-center text-[10px] text-slate-500 font-mono py-4">
                  {trafficSource === 'loading' ? 'Loading traffic data...' : 'No corridor data available'}
                </div>
              ) : (
                topCorridors.map((c, idx) => (
                  <div key={idx} className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-200 truncate pr-2">{c.name}</span>
                      <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded shrink-0 ${
                        c.level === 'smooth' ? 'bg-emerald-500/20 text-emerald-400' :
                        c.level === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {c.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] font-mono text-slate-400">
                      <span>Speed: <strong className="text-slate-200">{c.speed} km/h</strong></span>
                      <span>JF: <strong className="text-slate-200">{c.jamFactor}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Live Traffic Feed ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden flex-1">
            <h3 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono px-3 py-2 border-b border-slate-800 shrink-0 flex items-center justify-between">
              <span>Live Traffic Feed</span>
              <span className="text-[8px] text-slate-500">Source: {isReal ? 'HERE Traffic API' : 'SYNTHETIC'}</span>
            </h3>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {trafficFeed.length === 0 ? (
                <div className="text-center text-[10px] text-slate-500 font-mono py-4">
                  {trafficSource === 'loading' ? 'Loading...' : 'No traffic segments'}
                </div>
              ) : (
                trafficFeed.map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-start">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                        item.trafficLevel === 'smooth' ? 'bg-emerald-400' :
                        item.trafficLevel === 'moderate' ? 'bg-amber-400' :
                        'bg-red-400'
                      }`} />
                      <span className="text-[10px] font-bold text-slate-200 truncate px-1.5 flex-1">{item.roadName}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] font-mono text-slate-400 pl-3">
                      <span>{item.speed} km/h</span>
                      <span>JF: {item.jamFactor}</span>
                      {item.updated && <span>{item.updated.slice(0, 10)}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const TelemetryMini: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'cyan' | 'emerald' | 'amber' | 'red' | 'purple';
}> = ({ label, value, icon: Icon, color }) => {
  const colorMap = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-lg">
      <Icon className={`w-2.5 h-2.5 ${colorMap[color]}`} />
      <span className="text-[9px] text-slate-500">{label}:</span>
      <span className={`text-[10px] font-mono font-bold ${colorMap[color]}`}>{value}</span>
    </div>
  );
};

const ToggleChip: React.FC<{
  active: boolean;
  label: string;
  onToggle: () => void;
  color: 'emerald' | 'cyan' | 'red' | 'amber';
}> = ({ active, label, onToggle, color }) => {
  const colorMap = {
    emerald: active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800',
    cyan: active ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-slate-950 text-slate-500 border-slate-800',
    red: active ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-950 text-slate-500 border-slate-800',
    amber: active ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-950 text-slate-500 border-slate-800',
  };
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all ${colorMap[color]}`}
    >
      {active ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
      {label}
    </button>
  );
};

const RoadStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800">
    <span className="text-[8px] text-slate-500 block">{label}</span>
    <span className={`text-[11px] font-mono font-bold ${color}`}>{value}</span>
  </div>
);

const StatPill: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className={`p-1.5 rounded-lg text-center ${color}`}>
    <span className="text-[8px] block opacity-80">{label}</span>
    <span className="text-[11px] font-mono font-bold">{value}</span>
  </div>
);
