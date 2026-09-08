import React, { useState, useMemo } from 'react';
import {
  MOCK_COMPLETED_SIMULATIONS,
  DELHI_COMPLETED_SIMULATIONS,
  MOCK_CITIES,
  MOCK_DURATIONS,
  SCENARIO_TYPE_CONFIG,
  computeSimulation,
  getRecoveryTimeline,
  getMockRoadsForCity,
  type ScenarioType,
  type SeverityLevel,
  type WhatIfSimulation,
} from '../../mock/mockWhatIf';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import {
  GitPullRequest,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Activity,
  Car,
  Timer,
  Zap,
  X,
  BarChart3,
} from 'lucide-react';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

const METRIC_LABELS = [
  { key: 'speed', label: 'Speed', unit: 'km/h', icon: Gauge, goodDir: 'up' as const },
  { key: 'waitTime', label: 'Wait Time', unit: 's', icon: Clock, goodDir: 'down' as const },
  { key: 'queue', label: 'Queue', unit: 'm', icon: Activity, goodDir: 'down' as const },
  { key: 'throughput', label: 'Throughput', unit: 'v/h', icon: Car, goodDir: 'up' as const },
  { key: 'congestion', label: 'Congestion', unit: '%', icon: BarChart3, goodDir: 'down' as const },
] as const;

export const AdminWhatIfScenarios: React.FC = () => {
  const { addToast } = useToast();
  const [simulations, setSimulations] = useState<WhatIfSimulation[]>([...DELHI_COMPLETED_SIMULATIONS, ...MOCK_COMPLETED_SIMULATIONS]);
  const [activeResult, setActiveResult] = useState<WhatIfSimulation | null>(null);

  const { selectedCity } = useApp();

  // Roads for selected city
  const cityRoads = useMemo(() => getMockRoadsForCity(selectedCity), [selectedCity]);

  // Form state
  const [formType, setFormType] = useState<ScenarioType>('accident');
  const [formCity, setFormCity] = useState('Bengaluru');
  const [formRoad, setFormRoad] = useState(cityRoads[0]);
  const [formDuration, setFormDuration] = useState('1 hour');
  const [formTrafficIncrease, setFormTrafficIncrease] = useState(45);
  const [formSeverity, setFormSeverity] = useState<SeverityLevel>('high');
  const [isRunning, setIsRunning] = useState(false);

  const handleRunSimulation = () => {
    setIsRunning(true);
    addToast({
      type: 'info',
      title: 'Simulation Started',
      message: `${SCENARIO_TYPE_CONFIG[formType].icon} ${SCENARIO_TYPE_CONFIG[formType].label} on ${formRoad}`,
      duration: 4000,
    });

    setTimeout(() => {
      const { before, after } = computeSimulation(formType, formTrafficIncrease, formSeverity, formCity);
      const newSim: WhatIfSimulation = {
        id: `sim-${Date.now()}`,
        type: formType,
        name: `${SCENARIO_TYPE_CONFIG[formType].label} — ${formRoad.split('(')[0].trim()}`,
        city: formCity,
        road: formRoad,
        duration: formDuration,
        trafficIncreasePct: formTrafficIncrease,
        severity: formSeverity,
        before,
        after,
        mitigation: generateMitigation(formType, formSeverity),
        status: 'completed',
        affectedJunctions: Math.round(4 + formTrafficIncrease / 10),
        estimatedRecoveryMin: Math.round(30 + formTrafficIncrease * 1.5),
      };

      setSimulations((prev) => [newSim, ...prev]);
      setActiveResult(newSim);
      setIsRunning(false);

      addToast({
        type: 'success',
        title: 'Simulation Complete',
        message: `Congestion: ${before.congestion}% → ${after.congestion}% | Speed: ${before.speed} → ${after.speed} km/h`,
        duration: 6000,
      });
    }, 3000);
  };

  const completedCount = simulations.filter((s) => s.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-cyan-400" />
            WHAT-IF SIMULATION SANDBOX
          </h2>
          <p className="text-[11px] text-slate-400">
            Scenario builder — configure events, run simulations, and analyze before/after impact.
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono font-bold text-amber-400">
            DEMO DATA — Simulation results are estimated, not real-time traffic
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          {completedCount} simulations completed
        </div>
      </div>

      {/* ── Main Grid: Builder + Results ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Scenario Builder */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-4">
          <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Scenario Builder
          </h3>

          {/* Scenario Type Selector */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Event Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(SCENARIO_TYPE_CONFIG) as [ScenarioType, typeof SCENARIO_TYPE_CONFIG[ScenarioType]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => { setFormType(key); setFormTrafficIncrease(config.defaultIncrease); }}
                  className={`p-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 ${
                    formType === key
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">City</label>
              <select value={formCity} onChange={(e) => setFormCity(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500">
                {MOCK_CITIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Road / Corridor</label>
              <select value={formRoad} onChange={(e) => setFormRoad(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500">
                {cityRoads.map((r) => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Duration</label>
              <select value={formDuration} onChange={(e) => setFormDuration(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500">
                {MOCK_DURATIONS.map((d) => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Traffic Increase: <span className="text-cyan-400 font-bold">{formTrafficIncrease}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={150}
                value={formTrafficIncrease}
                onChange={(e) => setFormTrafficIncrease(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                <span>10%</span>
                <span>150%</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Severity</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'medium', 'high', 'critical'] as const).map((sev) => {
                  const colors = { low: 'emerald', medium: 'amber', high: 'red', critical: 'red' };
                  return (
                    <button
                      key={sev}
                      onClick={() => setFormSeverity(sev)}
                      className={`py-1.5 rounded text-[10px] font-mono font-bold capitalize transition-all ${
                        formSeverity === sev
                          ? `bg-${colors[sev]}-500/20 text-${colors[sev]}-300 border border-${colors[sev]}-500/40`
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Running Simulation...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                RUN SIMULATION
              </>
            )}
          </button>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {activeResult ? (
            <SimulationResult simulation={activeResult} onClose={() => setActiveResult(null)} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-3">
              <BarChart3 className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">No Active Results</h4>
              <p className="text-[11px] text-slate-500">Configure a scenario and run a simulation to see before/after impact analysis.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Simulations List ── */}
      {simulations.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono">
              Recent Simulations ({simulations.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-800/60">
            {simulations.slice(0, 8).map((sim) => (
              <button
                key={sim.id}
                onClick={() => setActiveResult(sim)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-950/40 transition-colors ${
                  activeResult?.id === sim.id ? 'bg-slate-950/60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{SCENARIO_TYPE_CONFIG[sim.type].icon}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-200">{sim.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 block">{sim.road} · {sim.duration}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-red-400">+{sim.after.congestion - sim.before.congestion}%</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Simulation Result Panel ──
const SimulationResult: React.FC<{ simulation: WhatIfSimulation; onClose: () => void }> = ({ simulation: sim, onClose }) => {
  const before = sim.before;
  const after = sim.after;
  const config = SCENARIO_TYPE_CONFIG[sim.type];

  // Bar chart data for before/after comparison
  const comparisonData = METRIC_LABELS.map((m) => ({
    name: m.label,
    before: before[m.key],
    after: after[m.key],
  }));

  // Radar data
  const radarData = METRIC_LABELS.map((m) => {
    const bVal = before[m.key];
    const aVal = after[m.key];
    const max = m.key === 'throughput' ? 5000 : m.key === 'congestion' ? 100 : m.key === 'queue' ? 2000 : m.key === 'waitTime' ? 400 : 60;
    return {
      metric: m.label,
      before: Math.round((bVal / max) * 100),
      after: Math.round((aVal / max) * 100),
    };
  });

  // Recovery timeline
  const recoveryData = getRecoveryTimeline(before, after);

  return (
    <div className="space-y-4">
      {/* Result Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{sim.name}</h3>
            <span className="text-[10px] font-mono text-slate-400">{sim.city} · {sim.road} · {sim.duration}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            COMPLETED
          </span>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Before/After Metric Cards */}
      <div className="grid grid-cols-5 gap-2">
        {METRIC_LABELS.map((m) => {
          const Icon = m.icon;
          const bVal = before[m.key];
          const aVal = after[m.key];
          const delta = aVal - bVal;
          const isGood = m.goodDir === 'up' ? delta > 0 : delta < 0;
          return (
            <div key={m.key} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1">
                <Icon className="w-3 h-3 text-slate-500" />
                <span className="text-[9px] font-mono text-slate-500 uppercase">{m.label}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">Before: <span className="text-slate-200 font-bold">{bVal}{m.unit}</span></div>
              <div className="text-[10px] font-mono">After: <span className={`font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>{aVal}{m.unit}</span></div>
              <div className={`text-[10px] font-mono font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
                {delta > 0 ? '+' : ''}{delta}{m.unit}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Before vs After Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono">Before vs After Comparison</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                <Bar dataKey="before" fill="#64748b" name="Before" radius={[3, 3, 0, 0]} />
                <Bar dataKey="after" fill="#ef4444" name="After" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-sm bg-slate-500" /> Before</span>
            <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-sm bg-red-400" /> After</span>
          </div>
        </div>

        {/* Radar Impact Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono">Impact Radar</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="metric" stroke="#475569" fontSize={9} />
                <PolarRadiusAxis stroke="#334155" fontSize={8} domain={[0, 100]} />
                <Radar name="Before" dataKey="before" stroke="#64748b" fill="#64748b" fillOpacity={0.15} />
                <Radar name="After" dataKey="after" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recovery Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
        <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          Recovery Timeline (Estimated {sim.estimatedRecoveryMin} min)
        </h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={recoveryData}>
              <defs>
                <linearGradient id="recoverySpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="minute" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
              <Area type="monotone" dataKey="speed" stroke="#10b981" fillOpacity={1} fill="url(#recoverySpeed)" name="Speed (km/h)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mitigation */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 font-mono">
          <AlertTriangle className="w-4 h-4" />
          Suggested Mitigation
        </div>
        <p className="text-[11px] text-slate-300 font-mono leading-relaxed">{sim.mitigation}</p>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-1">
          <span>Affected junctions: <span className="text-slate-200 font-bold">{sim.affectedJunctions}</span></span>
          <span>Recovery: <span className="text-amber-400 font-bold">{sim.estimatedRecoveryMin} min</span></span>
        </div>
      </div>
    </div>
  );
};

// ── Generate mitigation text based on scenario ──
function generateMitigation(type: ScenarioType, severity: SeverityLevel): string {
  const mitigations: Record<ScenarioType, string[]> = {
    accident: [
      'Dispatch traffic police and tow truck to incident site. Activate Inner Ring Road detour for affected corridors.',
      'Deploy emergency response unit. Enable bypass via parallel service road. Broadcast citizen alert.',
    ],
    road_closure: [
      'Divert traffic via nearest parallel arterial. Activate green wave on detour corridor. Notify citizens 2 hours prior.',
      'Enable HOV lane access for diverted traffic. Deploy traffic police at diversion points.',
    ],
    heavy_rain: [
      'Activate waterlogging alerts. Deploy BBMP pump squads to low-lying underpasses. Reduce signal cycle lengths.',
      'Issue citizen mobility advisory. Reduce speed limits on elevated corridors. Monitor drainage systems.',
    ],
    festival: [
      'Implement one-way traffic flow on event perimeter roads. Deploy additional traffic police. Enable pedestrian priority phases.',
      'Activate temporary signal plans. Open event parking overflow lots. Deploy shuttle bus service.',
    ],
    traffic_surge: [
      'Extend green phases on high-volume corridors. Activate adaptive signal coordination. Open additional lane capacity.',
      'Enable contraflow on key arterials. Deploy traffic police at critical junctions.',
    ],
    signal_failure: [
      'Deploy manual traffic police to affected junctions. Activate emergency fixed-time plans. Enable pedestrian scramble phases.',
      'Switch to backup signal controllers. Deploy portable signal units. Enable radio-coordinated manual control.',
    ],
    vip_movement: [
      'Activate pre-emptive green wave on convoy corridor. Deploy traffic police at 6 junctions. Divert local traffic.',
      'Enable signal pre-emption 5 minutes prior to convoy entry. Close on-ramps temporarily.',
    ],
  };
  const options = mitigations[type] || mitigations.accident;
  return severity === 'critical' || severity === 'high' ? options[0] : options[1];
}
