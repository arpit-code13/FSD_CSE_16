import React, { useState } from 'react';
import {
  MOCK_SIGNAL_OPTIMIZATIONS,
  getOptimizationSummary,
  type SignalOptimization,
} from '../../mock/mockSignalOptimization';
import { useToast } from '../../context/ToastContext';
import {
  Sliders,
  Brain,
  Play,
  CheckCircle2,
  Zap,
  Clock,
  Activity,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';

export const AdminSignalOptimization: React.FC = () => {
  const { addToast } = useToast();
  const [signals, setSignals] = useState<SignalOptimization[]>(MOCK_SIGNAL_OPTIMIZATIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [optimizingAll, setOptimizingAll] = useState(false);

  const summary = getOptimizationSummary();

  const handleOptimize = (id: string) => {
    setSignals((prev) =>
      prev.map((s) => (s.junctionId === id ? { ...s, optimizationState: 'optimized' } : s))
    );
    const sig = signals.find((s) => s.junctionId === id);
    addToast({
      type: 'success',
      title: 'AI Optimization Complete',
      message: `${sig?.junctionName} — recommended ${sig?.recommendedGreenDurationSec}s green phase`,
      duration: 4000,
    });
  };

  const handleSimulate = (id: string) => {
    setSignals((prev) =>
      prev.map((s) => (s.junctionId === id ? { ...s, optimizationState: 'simulated' } : s))
    );
    const sig = signals.find((s) => s.junctionId === id);
    addToast({
      type: 'info',
      title: 'Simulation Running',
      message: `Testing ${sig?.recommendedPhase} at ${sig?.junctionName}`,
      duration: 4000,
    });
  };

  const handleApprove = (id: string) => {
    setSignals((prev) =>
      prev.map((s) => (s.junctionId === id ? { ...s, optimizationState: 'approved' } : s))
    );
    const sig = signals.find((s) => s.junctionId === id);
    addToast({
      type: 'success',
      title: 'Optimization Approved',
      message: `${sig?.junctionName} — new plan staged for deployment`,
      duration: 5000,
    });
  };

  const handleOptimizeAll = () => {
    setOptimizingAll(true);
    setTimeout(() => {
      setSignals((prev) =>
        prev.map((s) => (s.status !== 'optimal' ? { ...s, optimizationState: 'optimized' } : s))
      );
      setOptimizingAll(false);
      addToast({
        type: 'success',
        title: 'Batch Optimization Complete',
        message: `${summary.needsOpt + summary.critical} junctions optimized — review and approve`,
        duration: 5000,
      });
    }, 2000);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            SIGNAL OPTIMIZATION ENGINE
          </h2>
          <p className="text-[11px] text-slate-400">
            AI-powered phase timing optimization — review recommendations, simulate, and approve.
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono font-bold text-amber-400">
            DEMO DATA — Improvements are simulated estimates, not guaranteed real-world results
          </span>
        </div>
        <button
          onClick={handleOptimizeAll}
          disabled={optimizingAll}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-lg flex items-center gap-2 transition-all"
        >
          {optimizingAll ? (
            <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          {optimizingAll ? 'Optimizing All...' : 'RUN AI OPTIMIZATION (ALL)'}
        </button>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryKpi label="Total Signals" value={summary.total} icon={Sliders} color="cyan" />
        <SummaryKpi label="Critical" value={summary.critical} icon={Activity} color="red" />
        <SummaryKpi label="Needs Optimization" value={summary.needsOpt} icon={Zap} color="amber" />
        <SummaryKpi label="Optimal" value={summary.optimal} icon={CheckCircle2} color="emerald" />
        <SummaryKpi label="Total Wait Saved" value={`${summary.totalWaitReduction}s`} icon={Clock} color="purple" />
        <SummaryKpi label="Throughput Gain" value={`+${summary.totalThroughputGain}`} icon={TrendingUp} color="emerald" />
      </div>

      {/* ── Signal Cards ── */}
      <div className="space-y-3">
        {signals.map((sig) => (
          <SignalCard
            key={sig.junctionId}
            signal={sig}
            isExpanded={expandedId === sig.junctionId}
            onToggle={() => setExpandedId(expandedId === sig.junctionId ? null : sig.junctionId)}
            onOptimize={() => handleOptimize(sig.junctionId)}
            onSimulate={() => handleSimulate(sig.junctionId)}
            onApprove={() => handleApprove(sig.junctionId)}
          />
        ))}
      </div>
    </div>
  );
};

// ── Summary KPI ──
const SummaryKpi: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = ({ label, value, icon: Icon, color }) => {
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-400',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
  };
  return (
    <div className={`p-3 rounded-xl border bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-between`}>
      <div>
        <p className="text-[10px] text-slate-400">{label}</p>
        <h3 className="text-lg font-bold text-slate-100 font-mono">{value}</h3>
      </div>
      <Icon className="w-5 h-5 opacity-60" />
    </div>
  );
};

// ── Signal Card ──
const SignalCard: React.FC<{
  signal: SignalOptimization;
  isExpanded: boolean;
  onToggle: () => void;
  onOptimize: () => void;
  onSimulate: () => void;
  onApprove: () => void;
}> = ({ signal, isExpanded, onToggle, onOptimize, onSimulate, onApprove }) => {
  const sig = signal;
  const state = sig.optimizationState;

  const statusStyle = {
    critical: 'border-red-500/50 shadow-red-500/10',
    'needs-optimization': 'border-amber-500/30',
    optimal: 'border-emerald-500/30',
  }[sig.status];

  const statusBadge = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    'needs-optimization': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    optimal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }[sig.status];

  const stateBadge = {
    idle: null,
    optimized: <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold border border-purple-500/30">OPTIMIZED</span>,
    simulated: <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold border border-cyan-500/30">SIMULATED</span>,
    approved: <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30">APPROVED</span>,
  }[state];

  return (
    <div className={`bg-slate-900 border rounded-2xl shadow-xl overflow-hidden transition-all ${statusStyle}`}>
      {/* Card Header */}
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            sig.status === 'critical' ? 'bg-red-400 animate-pulse' : sig.status === 'needs-optimization' ? 'bg-amber-400' : 'bg-emerald-400'
          }`} />
          <div>
            <h3 className="text-sm font-bold text-slate-100">{sig.junctionName}</h3>
            <span className="text-[10px] font-mono text-slate-400">{sig.city}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stateBadge}
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusBadge}`}>
            {sig.status === 'needs-optimization' ? 'NEEDS OPT' : sig.status.toUpperCase()}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Card Body - always visible */}
      <div className="px-4 pb-3">
        {/* Current vs Recommended Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] font-mono">
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Current Green</span>
            <span className="text-amber-400 font-bold text-[11px]">{sig.currentGreenDurationSec}s</span>
            <span className="text-slate-500 block mt-0.5">Cycle: {sig.currentCycleLengthSec}s</span>
          </div>
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Recommended Green</span>
            <span className="text-emerald-400 font-bold text-[11px]">{sig.recommendedGreenDurationSec}s</span>
            <span className="text-slate-500 block mt-0.5">Cycle: {sig.recommendedCycleLengthSec}s</span>
          </div>
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Wait Time Saved</span>
            <span className={`font-bold text-[11px] ${sig.predictedImpact.waitTimeReductionSec > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {sig.predictedImpact.waitTimeReductionSec > 0 ? `-${sig.predictedImpact.waitTimeReductionSec}s` : '—'}
            </span>
          </div>
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Throughput Gain</span>
            <span className={`font-bold text-[11px] ${sig.predictedImpact.throughputIncreaseVhr > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {sig.predictedImpact.throughputIncreaseVhr > 0 ? `+${sig.predictedImpact.throughputIncreaseVhr} v/h` : '—'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onOptimize(); }}
            disabled={state !== 'idle' || sig.status === 'optimal'}
            className="flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-slate-800 disabled:text-slate-600 text-purple-300 border border-purple-500/40 disabled:border-slate-800 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Brain className="w-3 h-3" />
            RUN AI OPTIMIZATION
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSimulate(); }}
            disabled={state === 'idle' || state === 'approved' || sig.status === 'optimal'}
            className="flex-1 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:bg-slate-800 disabled:text-slate-600 text-cyan-300 border border-cyan-500/40 disabled:border-slate-800 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Play className="w-3 h-3" />
            SIMULATE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            disabled={state !== 'simulated' || sig.status === 'optimal'}
            className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:bg-slate-800 disabled:text-slate-600 text-emerald-300 border border-emerald-500/40 disabled:border-slate-800 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-3 h-3" />
            APPROVE
          </button>
        </div>
      </div>

      {/* Expanded: Before/After Detail */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-4">
          {/* Before / After Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Before (Current) */}
            <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono">Current State (Before)</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MetricMini label="Wait Time" value={`${sig.currentMetrics.avgWaitTimeSec}s`} color="amber" />
                <MetricMini label="Throughput" value={`${sig.currentMetrics.throughputVhr} v/h`} color="cyan" />
                <MetricMini label="Congestion" value={`${sig.currentMetrics.congestionPct}%`} color="red" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase">Current Phases</span>
                <div className="flex h-5 rounded-lg overflow-hidden border border-slate-800">
                  {sig.currentPhases.map((phase, idx) => {
                    const width = (phase.durationSec / sig.currentCycleLengthSec) * 100;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-center text-[8px] font-mono font-bold ${
                          phase.isGreen ? 'bg-emerald-500/40 text-emerald-300' : 'bg-slate-800 text-slate-500'
                        }`}
                        style={{ width: `${width}%` }}
                        title={`${phase.name} (${phase.durationSec}s)`}
                      >
                        {width > 12 ? `${phase.durationSec}s` : ''}
                      </div>
                    );
                  })}
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Phase: <span className="text-amber-400">{sig.currentPhase}</span> — Mode: <span className="text-cyan-400 uppercase">{sig.currentMode}</span>
                </div>
              </div>
            </div>

            {/* After (Recommended) */}
            <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider font-mono">AI Recommended (After)</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MetricMini label="Wait Time" value={`${sig.afterMetrics.avgWaitTimeSec}s`} color="emerald" delta={`-${sig.predictedImpact.waitTimeReductionSec}s`} />
                <MetricMini label="Throughput" value={`${sig.afterMetrics.throughputVhr} v/h`} color="emerald" delta={`+${sig.predictedImpact.throughputIncreaseVhr}`} />
                <MetricMini label="Congestion" value={`${sig.afterMetrics.congestionPct}%`} color="emerald" delta={`-${sig.predictedImpact.congestionReductionPct}%`} />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase">Recommended Phases</span>
                <div className="flex h-5 rounded-lg overflow-hidden border border-slate-800">
                  {sig.recommendedPhases.map((phase, idx) => {
                    const width = (phase.durationSec / sig.recommendedCycleLengthSec) * 100;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-center text-[8px] font-mono font-bold ${
                          phase.isGreen ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                        }`}
                        style={{ width: `${width}%` }}
                        title={`${phase.name} (${phase.durationSec}s)`}
                      >
                        {width > 12 ? `${phase.durationSec}s` : ''}
                      </div>
                    );
                  })}
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Phase: <span className="text-emerald-400">{sig.recommendedPhase}</span> — Mode: <span className="text-cyan-400 uppercase">{sig.recommendedMode}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Summary Bar */}
          <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-slate-900 rounded-xl border border-emerald-500/20 flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Predicted Impact:</span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300">Wait:</span>
              <span className="text-emerald-400 font-bold">-{sig.predictedImpact.waitTimeReductionSec}s</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300">Throughput:</span>
              <span className="text-emerald-400 font-bold">+{sig.predictedImpact.throughputIncreaseVhr} v/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300">Congestion:</span>
              <span className="text-emerald-400 font-bold">-{sig.predictedImpact.congestionReductionPct}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Metric Mini ──
const MetricMini: React.FC<{
  label: string;
  value: string;
  color: string;
  delta?: string;
}> = ({ label, value, color, delta }) => {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  return (
    <div className="p-1.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-0.5">
      <span className="text-[8px] text-slate-500 font-mono uppercase">{label}</span>
      <span className={`text-[11px] font-mono font-bold ${colorMap[color]}`}>{value}</span>
      {delta && <span className="text-[9px] font-mono text-emerald-400 block">{delta}</span>}
    </div>
  );
};
