import React, { useEffect, useState } from 'react';
import { trafficService } from '../../services/api';
import type { Junction, Incident, EmergencyCorridor, DigitalTwinNode } from '../../types/traffic';
import { useRealtime } from '../../context/RealtimeContext';
import { StatCard } from '../../components/common/StatCard';
import { MapContainer } from '../../components/common/MapContainer';
import { MOCK_EMERGENCY_CORRIDORS, corridorsToMapFormat } from '../../mock/mockEmergency';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_PREDICTIONS } from '../../mock/mockTrafficData';
import {
  Activity,
  Sliders,
  Siren,
  AlertTriangle,
  Cpu,
  ArrowUpRight,
  Zap,
  Gauge,
  Timer,
  TrendingUp,
  Brain,
  Shield,
  Car,
  MapPin,
  Clock,
  ChevronRight,
  CircleDot,
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const { snapshot } = useRealtime();
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [emergencyCorridors, setEmergencyCorridors] = useState<EmergencyCorridor[]>([]);
  const [twinNodes, setTwinNodes] = useState<DigitalTwinNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCommandCenterData = async () => {
      try {
        const [j, inc, ec, dt] = await Promise.all([
          trafficService.getJunctions(),
          trafficService.getIncidents(),
          trafficService.getEmergencyCorridors(),
          trafficService.getDigitalTwinNodes(),
        ]);
        setJunctions(j);
        setIncidents(inc);
        setEmergencyCorridors(ec);
        setTwinNodes(dt);
      } finally {
        setLoading(false);
      }
    };
    loadCommandCenterData();
  }, []);

  // Sync with real-time simulation
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
          };
        }
        return localJ;
      })
    );
  }, [snapshot.junctions]);

  useEffect(() => {
    setIncidents((prev) =>
      prev.map((localI) => {
        const realtimeI = snapshot.incidents.find((ri) => ri.id === localI.id);
        if (realtimeI) {
          return { ...localI, status: realtimeI.status };
        }
        return localI;
      })
    );
  }, [snapshot.incidents]);

  useEffect(() => {
    setTwinNodes((prev) =>
      prev.map((localN) => {
        const realtimeN = snapshot.digitalTwinNodes.find((rn) => rn.id === localN.id);
        if (realtimeN) {
          return {
            ...localN,
            currentFlowRateHr: realtimeN.currentFlowRateHr,
            averageSpeedKmh: realtimeN.averageSpeedKmh,
            simulatedSpeedKmh: realtimeN.simulatedSpeedKmh,
            queueLengthMeters: realtimeN.queueLengthMeters,
          };
        }
        return localN;
      })
    );
  }, [snapshot.digitalTwinNodes]);

  if (loading) {
    return (
      <div className="p-8 font-mono text-emerald-400 text-xs animate-pulse">
        [COMMAND CENTER] Initializing telemetry feeds & digital twin connection...
      </div>
    );
  }

  const stats = snapshot.cityStats;

  // Derived metrics
  const avgWaitTime = Math.round(junctions.reduce((s, j) => s + j.currentWaitTimeSec, 0) / junctions.length);
  const totalThroughput = twinNodes.reduce((s, n) => s + n.currentFlowRateHr, 0);
  const activeAlerts = incidents.filter((i) => i.status !== 'resolved');
  const dispatchedIncidents = incidents.filter((i) => i.status === 'dispatched' || i.status === 'in_progress');

  // AI recommendations (mock)
  const aiRecommendations = [
    {
      priority: 'high' as const,
      title: 'Activate green wave on ORR southbound',
      reason: `Silk Board congestion at ${snapshot.junctions[0]?.congestionIndex ?? 92}% — predicted to exceed 95% by 18:30`,
      action: 'signal-optimization',
    },
    {
      priority: 'medium' as const,
      title: 'Divert Hosur Road traffic via Bannerghatta Rd',
      reason: 'Evening peak approaching — pre-emptive diversion reduces delay by ~12 min',
      action: 'what-if',
    },
    {
      priority: 'low' as const,
      title: 'Reduce cycle length at MG Road by 15s',
      reason: 'Current wait time 35s with low congestion — optimize throughput',
      action: 'signal-optimization',
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Command Header ── */}
      <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-wide font-mono">
              COMMAND CENTER OVERVIEW
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time citywide traffic intelligence — adaptive signals, digital twin sync, AI recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/signal-optimization"
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] rounded-lg shadow-lg flex items-center gap-1.5 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            Signal Control
          </Link>
          <Link
            to="/admin/emergency"
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] rounded-lg shadow-lg flex items-center gap-1.5 transition-all"
          >
            <Siren className="w-3.5 h-3.5" />
            Emergency Override
          </Link>
        </div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Vehicles Tracked"
          value={stats.totalVehiclesTracked.toLocaleString()}
          change="Across 148 junctions"
          trend="neutral"
          icon={Car}
          color="cyan"
        />
        <StatCard
          title="Avg Speed"
          value={`${stats.avgCitySpeedKmh} km/h`}
          change={stats.avgCitySpeedKmh < 25 ? 'Below target 30 km/h' : 'Above target'}
          trend={stats.avgCitySpeedKmh >= 25 ? 'up' : 'down'}
          icon={Gauge}
          color="emerald"
        />
        <StatCard
          title="Congestion Index"
          value={`${stats.cityCongestionIndex}%`}
          change={stats.cityCongestionIndex > 75 ? 'High congestion' : 'Moderate'}
          trend={stats.cityCongestionIndex > 75 ? 'down' : 'up'}
          icon={Activity}
          color="red"
        />
        <StatCard
          title="Active Incidents"
          value={stats.activeIncidents}
          change={`${dispatchedIncidents.length} dispatched`}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Avg Wait Time"
          value={`${avgWaitTime}s`}
          change={`Across ${junctions.length} junctions`}
          trend={avgWaitTime > 120 ? 'down' : 'up'}
          icon={Timer}
          color="purple"
        />
        <StatCard
          title="Throughput"
          value={`${(totalThroughput / 1000).toFixed(0)}k`}
          change="Vehicles per hour"
          trend="up"
          icon={TrendingUp}
          color="cyan"
        />
      </div>

      {/* ── Row 2: Live Map (2/3) + Digital Twin Preview + AI Recommendation (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Live Traffic Map */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
              <Zap className="w-4 h-4 text-emerald-400" />
              Live Network Map
            </h3>
            <Link to="/admin/live-traffic" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono">
              Full Map <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1">
            <MapContainer junctions={junctions} incidents={incidents} digitalTwinNodes={twinNodes} greenCorridors={corridorsToMapFormat(MOCK_EMERGENCY_CORRIDORS)} />
          </div>
        </div>

        {/* Right Column: Digital Twin + AI */}
        <div className="space-y-4">
          {/* Digital Twin Preview */}
          <div className="bg-slate-900 border border-cyan-500/20 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Cpu className="w-3.5 h-3.5" />
                Digital Twin Preview
              </h4>
              <Link to="/admin/digital-twin" className="text-[10px] text-cyan-400 hover:underline font-mono flex items-center gap-0.5">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {twinNodes.slice(0, 3).map((node) => {
                const accuracy = Math.round(
                  (1 - Math.abs(node.averageSpeedKmh - node.simulatedSpeedKmh) / node.simulatedSpeedKmh) * 100
                );
                return (
                  <div key={node.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-200 truncate">{node.name}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        accuracy > 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {accuracy}% match
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Actual:</span>
                        <span className="text-amber-400 font-bold">{node.averageSpeedKmh.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Twin:</span>
                        <span className="text-cyan-400 font-bold">{node.simulatedSpeedKmh.toFixed(1)}</span>
                      </div>
                    </div>
                    {/* Accuracy bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-1000"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="bg-slate-900 border border-purple-500/20 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Brain className="w-3.5 h-3.5" />
                AI Recommendations
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold animate-pulse">
                LIVE
              </span>
            </div>

            <div className="space-y-2">
              {aiRecommendations.map((rec, idx) => (
                <Link
                  key={idx}
                  to={`/admin/${rec.action}`}
                  className="block p-2.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-purple-500/30 transition-all space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <CircleDot className={`w-2 h-2 ${
                      rec.priority === 'high' ? 'text-red-400' : rec.priority === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                    }`} />
                    <span className="text-[11px] font-bold text-slate-200">{rec.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono pl-3.5">{rec.reason}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Traffic Trends + Recent Alerts + Recent Incidents ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Traffic Trends Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Traffic Trends (24h Congestion Curve)
            </h4>
            <Link to="/admin/predictions" className="text-[11px] text-cyan-400 hover:underline font-mono flex items-center gap-0.5">
              Full Forecast <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_PREDICTIONS}>
                <defs>
                  <linearGradient id="trendCongestion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trendSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="predictedCongestion" stroke="#ef4444" fillOpacity={1} fill="url(#trendCongestion)" name="Congestion %" strokeWidth={2} />
                <Area type="monotone" dataKey="averageSpeedKmh" stroke="#10b981" fillOpacity={1} fill="url(#trendSpeed)" name="Speed (km/h)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Congestion %
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Avg Speed
            </span>
          </div>
        </div>

        {/* Recent Alerts (citizen-reported) */}
        <div className="bg-slate-900 border border-amber-500/20 p-4 rounded-2xl shadow-xl space-y-3 flex flex-col">
          <div className="flex justify-between items-center shrink-0">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Recent Alerts
            </h4>
            <Link to="/admin/incidents" className="text-[10px] text-amber-400 hover:underline font-mono">View All</Link>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {activeAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    alert.severity === 'critical'
                      ? 'bg-red-500/20 text-red-400'
                      : alert.severity === 'high'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{alert.reportedAt}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-200 line-clamp-1">{alert.title}</p>
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="truncate">{alert.locationName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="bg-slate-900 border border-red-500/20 p-4 rounded-2xl shadow-xl space-y-3 flex flex-col">
          <div className="flex justify-between items-center shrink-0">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Recent Incidents
            </h4>
            <Link to="/admin/incidents" className="text-[10px] text-red-400 hover:underline font-mono">View All</Link>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {incidents.slice(0, 4).map((inc) => (
              <div key={inc.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                    inc.status === 'in_progress'
                      ? 'bg-amber-500/20 text-amber-400'
                      : inc.status === 'dispatched'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : inc.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {inc.status.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">+{inc.estimatedDelayMin}m</span>
                </div>
                <p className="text-[11px] font-bold text-slate-200 line-clamp-1">{inc.title}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {inc.reportedAt}
                  </span>
                  {inc.dispatchedUnits && (
                    <span className="text-emerald-400">{inc.dispatchedUnits.length} units</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Emergency Corridors + Critical Junctions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Emergency Corridors */}
        <div className="bg-slate-900 border border-red-500/30 p-4 rounded-2xl shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Siren className="w-3.5 h-3.5 animate-pulse" />
              Active Emergency Corridors
            </h4>
            <Link to="/admin/emergency" className="text-[10px] text-red-400 hover:underline font-mono flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {emergencyCorridors.map((ec) => (
              <div
                key={ec.id}
                className={`p-3 rounded-xl border space-y-1.5 ${
                  ec.status === 'active'
                    ? 'bg-red-950/30 border-red-500/40'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">{ec.title}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    ec.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {ec.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{ec.source} → {ec.destination}</span>
                  <span className={ec.status === 'active' ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                    ETA {ec.etaMin}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Junction Overrides */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
              </span>
              Critical Junction Queue Overrides
            </h4>
            <Link to="/admin/signal-optimization" className="text-[10px] text-emerald-400 hover:underline font-mono flex items-center gap-0.5">
              All Junctions <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {junctions
              .filter((j) => j.status === 'critical' || j.status === 'red')
              .slice(0, 4)
              .map((j) => (
                <div
                  key={j.id}
                  className={`p-3 rounded-xl border flex justify-between items-center ${
                    j.status === 'critical' ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-950 border-amber-500/20'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-200">{j.name}</h5>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 animate-ping opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Wait: <span className={j.currentWaitTimeSec > 120 ? 'text-red-400 font-bold' : 'text-slate-300'}>{j.currentWaitTimeSec}s</span>
                      {' · '}
                      Congestion: <span className={j.congestionIndex > 85 ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>{j.congestionIndex}%</span>
                    </span>
                  </div>
                  <Link
                    to="/admin/signal-optimization"
                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold shrink-0"
                  >
                    Override
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
