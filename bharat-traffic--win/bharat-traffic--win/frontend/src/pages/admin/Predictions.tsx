import React, { useState, useMemo } from 'react';
import {
  getPredictionsForHorizon,
  getHorizonSummary,
  CORRIDOR_PREDICTIONS,
  PEAK_WINDOWS,
  type TimeHorizon,
} from '../../mock/mockPredictions';
import {
  TrendingUp,
  Gauge,
  Clock,
  Activity,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Timer,
  Waves,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const HORIZONS: { key: TimeHorizon; label: string; sublabel: string }[] = [
  { key: 'current', label: 'CURRENT', sublabel: 'Live' },
  { key: '15min', label: '15 MIN', sublabel: 'Short-term' },
  { key: '30min', label: '30 MIN', sublabel: 'Medium-term' },
  { key: '60min', label: '60 MIN', sublabel: 'Long-term' },
];

const TREND_ICON = {
  worsening: <ArrowUp className="w-3 h-3 text-red-400" />,
  improving: <ArrowDown className="w-3 h-3 text-emerald-400" />,
  stable: <Minus className="w-3 h-3 text-slate-400" />,
};

const TREND_COLOR = {
  worsening: 'text-red-400',
  improving: 'text-emerald-400',
  stable: 'text-slate-400',
};

export const AdminPredictions: React.FC = () => {
  const [horizon, setHorizon] = useState<TimeHorizon>('current');

  const predictions = useMemo(() => getPredictionsForHorizon(horizon), [horizon]);
  const summary = useMemo(() => getHorizonSummary(horizon), [horizon]);

  const hasConfidence = predictions.some((p) => p.confidence !== undefined && p.confidence < 100);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            AI PREDICTIONS & FORECASTING
          </h2>
          <p className="text-[11px] text-slate-400">
            Predictive neural net models — congestion, speed, queue, and waiting time forecasts across time horizons.
          </p>
        </div>

        {/* Time Horizon Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              onClick={() => setHorizon(h.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                horizon === h.key
                  ? h.key === 'current'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <div>{h.label}</div>
              <div className="text-[8px] font-normal opacity-70">{h.sublabel}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Congestion"
          current={summary.currentCongestion}
          predicted={summary.predictedCongestion}
          delta={summary.congestionDelta}
          unit="%"
          icon={Activity}
          color="red"
          higherIsWorse
        />
        <MetricCard
          label="Avg Speed"
          current={summary.currentSpeed}
          predicted={summary.predictedSpeed}
          delta={summary.speedDelta}
          unit="km/h"
          icon={Gauge}
          color="emerald"
          higherIsWorse={false}
        />
        <MetricCard
          label="Queue Length"
          current={summary.currentQueue}
          predicted={summary.predictedQueue}
          delta={summary.queueDelta}
          unit="m"
          icon={Waves}
          color="amber"
          higherIsWorse
        />
        <MetricCard
          label="Waiting Time"
          current={summary.currentWait}
          predicted={summary.predictedWait}
          delta={summary.waitDelta}
          unit="s"
          icon={Timer}
          color="purple"
          higherIsWorse
        />
      </div>

      {/* ── Confidence Band ── */}
      {hasConfidence && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 text-[10px] font-mono">
          <span className="text-purple-400 font-bold">AI Confidence:</span>
          <span className="text-slate-300">Starts at {predictions[0]?.confidence}% → decays to {predictions[predictions.length - 1]?.confidence}%</span>
          <span className="text-slate-500">| Lower confidence = wider prediction uncertainty</span>
        </div>
      )}

      {/* ── Main Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Congestion & Speed Trend */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
          <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-red-400" />
            Congestion & Speed Trend
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictions}>
                <defs>
                  <linearGradient id="predCongestion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: 'Critical', fill: '#ef4444', fontSize: 9, position: 'right' }} />
                <Area type="monotone" dataKey="congestion" stroke="#ef4444" fillOpacity={1} fill="url(#predCongestion)" name="Congestion %" strokeWidth={2} />
                <Area type="monotone" dataKey="speed" stroke="#10b981" fillOpacity={1} fill="url(#predSpeed)" name="Speed (km/h)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-mono">
            <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400" /> Congestion %</span>
            <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Speed km/h</span>
            <span className="text-slate-500 ml-auto">-- Critical threshold: 85%</span>
          </div>
        </div>

        {/* Queue & Waiting Time */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
          <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Waves className="w-3.5 h-3.5 text-amber-400" />
            Queue Length & Waiting Time
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                <Bar dataKey="queueLength" fill="#f59e0b" name="Queue (m)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="waitingTime" fill="#a855f7" name="Wait (s)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-mono">
            <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-sm bg-amber-400" /> Queue Length (m)</span>
            <span className="flex items-center gap-1.5 text-purple-400"><span className="w-2 h-2 rounded-sm bg-purple-400" /> Waiting Time (s)</span>
          </div>
        </div>
      </div>

      {/* ── Confidence Decay Line ── */}
      {hasConfidence && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
          <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            AI Model Confidence Over Horizon
          </h4>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                <ReferenceLine y={50} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="confidence" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} name="Confidence %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500">
            <span>Confidence below 50% → prediction uncertainty high</span>
            <span className="ml-auto text-purple-400">Average: {summary.avgConfidence}%</span>
          </div>
        </div>
      )}

      {/* ── Bottom Row: Corridor Predictions + Peak Windows ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Corridor Predictions Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              Corridor-Level Congestion Forecast
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase">
                  <th className="px-4 py-2.5 font-semibold">Corridor</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Now</th>
                  <th className="px-3 py-2.5 font-semibold text-center">+15m</th>
                  <th className="px-3 py-2.5 font-semibold text-center">+30m</th>
                  <th className="px-3 py-2.5 font-semibold text-center">+60m</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {CORRIDOR_PREDICTIONS.map((cp) => (
                  <tr key={cp.name} className="hover:bg-slate-950/40 transition-colors">
                    <td className="px-4 py-2.5 text-slate-200 font-semibold">{cp.name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <CongestionBadge value={cp.currentCongestion} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <CongestionBadge value={cp.predictedCongestion15} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <CongestionBadge value={cp.predictedCongestion30} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <CongestionBadge value={cp.predictedCongestion60} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`flex items-center justify-center gap-1 ${TREND_COLOR[cp.trend]}`}>
                        {TREND_ICON[cp.trend]}
                        <span className="font-bold capitalize">{cp.trend}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peak Windows */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
          <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Predicted Peak Windows
          </h4>

          <div className="space-y-2.5">
            {PEAK_WINDOWS.map((pw, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border space-y-2 ${
                  idx === 0 ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200">{pw.label}</span>
                  {idx === 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-mono font-bold animate-pulse">
                      NOW
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span>{pw.startTime} – {pw.endTime}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 block">Congestion</span>
                    <span className={`font-bold ${pw.expectedCongestion > 85 ? 'text-red-400' : 'text-amber-400'}`}>
                      {pw.expectedCongestion}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Speed</span>
                    <span className="text-emerald-400 font-bold">{pw.expectedSpeed} km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Confidence</span>
                    <span className="text-purple-400 font-bold">{pw.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Advice */}
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 font-mono">
              <AlertTriangle className="w-3 h-3" />
              AI Recommendation
            </div>
            <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
              Evening peak at 96% congestion. Defer non-essential trips until after 21:00 when congestion drops to 35%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Metric Card ──
const MetricCard: React.FC<{
  label: string;
  current: number;
  predicted: number;
  delta: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  higherIsWorse: boolean;
}> = ({ label, current, predicted, delta, unit, icon: Icon, color, higherIsWorse }) => {
  const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    red: { bg: 'from-red-500/10 to-red-500/5', text: 'text-red-400', border: 'border-red-500/20', iconBg: 'bg-red-500/20 text-red-400' },
    emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/20 text-emerald-400' },
    amber: { bg: 'from-amber-500/10 to-amber-500/5', text: 'text-amber-400', border: 'border-amber-500/20', iconBg: 'bg-amber-500/20 text-amber-400' },
    purple: { bg: 'from-purple-500/10 to-purple-500/5', text: 'text-purple-400', border: 'border-purple-500/20', iconBg: 'bg-purple-500/20 text-purple-400' },
  };
  const c = colorMap[color] || colorMap.cyan;

  const isGoodDelta = higherIsWorse ? delta <= 0 : delta >= 0;

  return (
    <div className={`p-3 rounded-xl border bg-gradient-to-br ${c.bg} ${c.border} shadow-lg space-y-1.5`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        <div className={`p-1.5 rounded-lg ${c.iconBg}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-slate-100 font-mono">{predicted}{unit}</span>
        <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${isGoodDelta ? 'text-emerald-400' : 'text-red-400'}`}>
          {delta > 0 ? '+' : ''}{delta}{unit}
        </span>
      </div>
      <div className="text-[9px] font-mono text-slate-500">
        Current: {current}{unit} → Predicted: {predicted}{unit}
      </div>
    </div>
  );
};

// ── Congestion Badge ──
const CongestionBadge: React.FC<{ value: number }> = ({ value }) => {
  const color = value > 85 ? 'bg-red-500/20 text-red-400' : value > 65 ? 'bg-amber-500/20 text-amber-400' : value > 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400';
  return <span className={`px-2 py-0.5 rounded font-bold ${color}`}>{value}%</span>;
};
