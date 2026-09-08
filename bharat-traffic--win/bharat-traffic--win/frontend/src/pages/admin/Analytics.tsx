import React, { useState, useEffect } from 'react';
import { useRealtime } from '../../context/RealtimeContext';
import { analyticsService } from '../../services/api';
import { BarChart3, TrendingUp, Clock, Leaf } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CORRIDOR_DATA = [
  { corridor: 'Outer Ring Rd', vehicleFlow: 54000, avgDelaySec: 185, emissions: 89.2 },
  { corridor: 'Hosur Road', vehicleFlow: 42000, avgDelaySec: 120, emissions: 62.4 },
  { corridor: 'Old Airport Rd', vehicleFlow: 31000, avgDelaySec: 95, emissions: 44.8 },
  { corridor: 'Ballari Road', vehicleFlow: 48000, avgDelaySec: 140, emissions: 74.1 },
  { corridor: 'Kanakapura Rd', vehicleFlow: 22000, avgDelaySec: 65, emissions: 28.6 },
];

const HOURLY_TREND = [
  { hour: '06:00', speed: 48, congestion: 25, vehicles: 12000 },
  { hour: '07:00', speed: 38, congestion: 42, vehicles: 22000 },
  { hour: '08:00', speed: 20, congestion: 78, vehicles: 38000 },
  { hour: '09:00', speed: 11, congestion: 94, vehicles: 48000 },
  { hour: '10:00', speed: 14, congestion: 88, vehicles: 44000 },
  { hour: '11:00', speed: 26, congestion: 65, vehicles: 34000 },
  { hour: '12:00', speed: 31, congestion: 52, vehicles: 28000 },
  { hour: '13:00', speed: 34, congestion: 48, vehicles: 26000 },
  { hour: '14:00', speed: 30, congestion: 55, vehicles: 30000 },
  { hour: '15:00', speed: 27, congestion: 64, vehicles: 32000 },
  { hour: '16:00', speed: 22, congestion: 72, vehicles: 38000 },
  { hour: '17:00', speed: 15, congestion: 89, vehicles: 46000 },
  { hour: '18:00', speed: 10, congestion: 96, vehicles: 50000 },
  { hour: '19:00', speed: 12, congestion: 91, vehicles: 47000 },
  { hour: '20:00', speed: 21, congestion: 75, vehicles: 36000 },
  { hour: '21:00', speed: 33, congestion: 50, vehicles: 24000 },
  { hour: '22:00', speed: 42, congestion: 32, vehicles: 16000 },
];

const INCIDENT_DISTRIBUTION = [
  { name: 'Accidents', value: 35, color: '#ef4444' },
  { name: 'Waterlogging', value: 25, color: '#3b82f6' },
  { name: 'Breakdown', value: 20, color: '#f59e0b' },
  { name: 'Construction', value: 12, color: '#8b5cf6' },
  { name: 'VIP Movement', value: 8, color: '#06b6d4' },
];

const SIGNAL_EFFICIENCY = [
  { mode: 'Adaptive AI', efficiency: 94, count: 112 },
  { mode: 'Fixed Plan', efficiency: 62, count: 24 },
  { mode: 'Manual', efficiency: 48, count: 8 },
  { mode: 'Emergency', efficiency: 35, count: 4 },
];

export const AdminAnalytics: React.FC = () => {
  const { snapshot } = useRealtime();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [realOverview, setRealOverview] = useState<any>(null);
  const [realTraffic, setRealTraffic] = useState<any>(null);
  const [realSignals, setRealSignals] = useState<any>(null);
  const [, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overview, traffic, signals] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getTraffic(),
          analyticsService.getSignals(),
        ]);
        if (overview) setRealOverview(overview);
        if (traffic) setRealTraffic(traffic);
        if (signals) setRealSignals(signals);
      } catch { /* use hardcoded fallback */ }
      finally { setDataLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start items-center">
        <div>
          <h2 className="text-xl font-black text-slate-100 font-mono flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            CITYWIDE CORRIDOR THROUGHPUT & EMISSIONS ANALYTICS
          </h2>
          <p className="text-xs text-slate-400">
            Macro-level vehicle counts, corridor queue delays, signal efficiency metrics, and municipal carbon emission trends.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                timeRange === range
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 text-cyan-400 border-cyan-500/20 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Total Vehicles Tracked</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1 font-mono">{realOverview?.total_vehicles_tracked?.toLocaleString() || (snapshot.cityStats.totalVehiclesTracked * 3.2).toLocaleString()}</h3>
            <p className="text-[11px] mt-1 font-semibold text-emerald-400">{realOverview ? 'From API' : '+12% vs yesterday'}</p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Avg Speed</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1 font-mono">{realOverview?.avg_speed_kmph || realTraffic?.avg_speed_kmph || Math.round(snapshot.junctions.reduce((s, j) => s + j.currentWaitTimeSec, 0) / (snapshot.junctions.length || 1))} {realOverview || realTraffic ? 'km/h' : 's'}</h3>
            <p className="text-[11px] mt-1 font-semibold text-amber-400">Across {realOverview?.total_roads || snapshot.junctions.length} {realOverview ? 'roads' : 'junctions'}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Active Signals</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1 font-mono">{realSignals?.active_signals || realOverview?.total_signals || 94}</h3>
            <p className="text-[11px] mt-1 font-semibold text-emerald-400">{realSignals ? `${realSignals.total_signals} total` : 'Adaptive AI mode'}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-gradient-to-br from-purple-500/10 to-purple-500/5 text-purple-400 border-purple-500/20 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Active Incidents</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1 font-mono">{realOverview?.active_incidents ?? snapshot.cityStats.activeIncidents}</h3>
            <p className="text-[11px] mt-1 font-semibold text-purple-400">{realOverview ? `${realOverview.total_predictions} predictions` : '-4.2% with AI routing'}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <Leaf className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid Row 1: Vehicle Flow + Hourly Congestion Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Corridor Daily Vehicle Volume vs Average Delay */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
          <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            Corridor Daily Vehicle Volume vs Average Delay
          </h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CORRIDOR_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="corridor" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={50} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Bar dataKey="vehicleFlow" fill="#06b6d4" name="Vehicles / Day" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgDelaySec" fill="#ef4444" name="Avg Delay (Sec)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly City Congestion & Speed Trend */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
          <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            24-Hour Congestion Index & Speed Profile
          </h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_TREND}>
                <defs>
                  <linearGradient id="colorCongestion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="congestion" stroke="#ef4444" fillOpacity={1} fill="url(#colorCongestion)" name="Congestion %" />
                <Area type="monotone" dataKey="speed" stroke="#10b981" fillOpacity={1} fill="url(#colorSpeed)" name="Avg Speed (km/h)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold pt-1">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Congestion %
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Speed (km/h)
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid Row 2: Incident Distribution + Signal Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Distribution Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
          <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            Incident Type Distribution (Last 30 Days)
          </h3>
          <div className="flex items-center gap-6 pt-4">
            <div className="w-52 h-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={INCIDENT_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {INCIDENT_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(value) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {INCIDENT_DISTRIBUTION.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-300 font-mono">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-100 font-mono">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signal Efficiency by Mode */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
          <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            Signal Controller Efficiency by Operating Mode
          </h3>
          <div className="space-y-4 pt-4">
            {SIGNAL_EFFICIENCY.map((item) => (
              <div key={item.mode} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 font-mono">{item.mode}</span>
                    <span className="text-[10px] font-mono text-slate-500">({item.count} junctions)</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    item.efficiency > 80 ? 'text-emerald-400' : item.efficiency > 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {item.efficiency}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      item.efficiency > 80 ? 'bg-emerald-500' : item.efficiency > 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.efficiency}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Emissions Bar */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-[10px] font-bold text-purple-400 font-mono uppercase tracking-wider">
              Corridor Carbon Emissions (tonnes/day)
            </h4>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CORRIDOR_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="corridor" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Bar dataKey="emissions" fill="#8b5cf6" name="CO₂ (tonnes)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
