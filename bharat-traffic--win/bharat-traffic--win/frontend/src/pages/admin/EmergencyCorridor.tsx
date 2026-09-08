import React, { useState } from 'react';
import {
  MOCK_EMERGENCY_CORRIDORS,
  DELHI_EMERGENCY_CORRIDORS,
  VEHICLE_TYPE_CONFIG,
  getActiveCorridorCount,
  type EmergencyCorridorData,
  type CorridorStatus,
} from '../../mock/mockEmergency';
import { useToast } from '../../context/ToastContext';
import {
  Siren,
  Play,
  CheckCircle2,
  Shield,
  Route,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Timer,
} from 'lucide-react';

export const AdminEmergencyCorridor: React.FC = () => {
  const { addToast } = useToast();
  const [corridors, setCorridors] = useState<EmergencyCorridorData[]>([...DELHI_EMERGENCY_CORRIDORS, ...MOCK_EMERGENCY_CORRIDORS]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeCount = getActiveCorridorCount(corridors);
  const simulatedCount = corridors.filter((c) => c.status === 'simulated').length;

  const handleSimulate = (id: string) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'simulated' as CorridorStatus } : c))
    );
    const c = corridors.find((x) => x.id === id);
    addToast({
      type: 'info',
      title: 'Corridor Simulated',
      message: `${c?.vehicleCallsign} — ${c?.route.name} — ${c?.coordinatedSignals.length} signals pre-emption planned`,
      duration: 5000,
    });
  };

  const handleApprove = (id: string) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'approved' as CorridorStatus } : c))
    );
    const c = corridors.find((x) => x.id === id);
    addToast({
      type: 'success',
      title: 'Corridor Approved',
      message: `${c?.vehicleCallsign} — Route approved, ready for deployment. ${c?.route.timeSavedMin} min time savings.`,
      duration: 6000,
    });
  };

  const handleDeploy = (id: string) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'active' as CorridorStatus } : c))
    );
    const c = corridors.find((x) => x.id === id);
    addToast({
      type: 'alert',
      title: 'Green Corridor Activated',
      message: `${c?.vehicleCallsign} — ${c?.coordinatedSignals.length} junctions now pre-empted. ETA: ${c?.route.emergencyEtaMin} min`,
      duration: 8000,
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <Siren className="w-5 h-5 text-red-500 animate-pulse" />
            EMERGENCY GREEN CORRIDOR CONTROL
          </h2>
          <p className="text-[11px] text-slate-400">
            AI-optimized emergency vehicle routing — simulate routes, review signal coordination, and approve deployment.
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono font-bold text-amber-400">
            DEMO DATA — Routes are simulated, not live GPS tracking
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <Siren className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-red-400">{activeCount} ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <span className="text-[10px] font-mono font-bold text-purple-400">{simulatedCount} SIMULATED</span>
          </div>
        </div>
      </div>

      {/* ── Emergency Corridor Cards ── */}
      <div className="space-y-4">
        {corridors.map((corridor) => (
          <CorridorCard
            key={corridor.id}
            corridor={corridor}
            isExpanded={expandedId === corridor.id}
            onToggle={() => setExpandedId(expandedId === corridor.id ? null : corridor.id)}
            onSimulate={() => handleSimulate(corridor.id)}
            onApprove={() => handleApprove(corridor.id)}
            onDeploy={() => handleDeploy(corridor.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ── Corridor Card ──
const CorridorCard: React.FC<{
  corridor: EmergencyCorridorData;
  isExpanded: boolean;
  onToggle: () => void;
  onSimulate: () => void;
  onApprove: () => void;
  onDeploy: () => void;
}> = ({ corridor: c, isExpanded, onToggle, onSimulate, onApprove, onDeploy }) => {
  const config = VEHICLE_TYPE_CONFIG[c.vehicleType];
  const status = c.status;

  const statusBadge: Record<CorridorStatus, { text: string; style: string } | null> = {
    idle: { text: 'STANDBY', style: 'bg-slate-800 text-slate-400' },
    simulated: { text: 'SIMULATED', style: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
    approved: { text: 'APPROVED', style: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' },
    active: { text: 'ACTIVE', style: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' },
    cleared: { text: 'CLEARED', style: 'bg-slate-800 text-slate-500' },
  };

  const badge = statusBadge[status];
  const isActive = status === 'active';
  const isApproved = status === 'approved';

  return (
    <div className={`bg-slate-900 border rounded-2xl shadow-xl overflow-hidden transition-all ${
      isActive ? 'border-red-500/50 shadow-red-500/10' : 'border-slate-800'
    }`}>
      {/* Card Header */}
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">{c.title}</h3>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                c.priority === 'critical' ? 'bg-red-500/20 text-red-400' : c.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>{c.priority.toUpperCase()}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{c.vehicleCallsign} · {c.vehicleId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge && <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${badge.style}`}>{badge.text}</span>}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Card Body - always visible */}
      <div className="px-4 pb-3">
        {/* Route Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] font-mono">
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Current Location</span>
            <span className="text-cyan-400 font-bold text-[11px] block truncate">{c.currentLocation}</span>
          </div>
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Destination</span>
            <span className="text-emerald-400 font-bold text-[11px] block truncate">{c.destination}</span>
          </div>
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Distance</span>
            <span className="text-amber-400 font-bold text-[11px]">{c.route.distanceKm} km · {c.route.viaRoads.length} segments</span>
          </div>
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Signals Coordinated</span>
            <span className="text-purple-400 font-bold text-[11px]">{c.coordinatedSignals.length} junctions</span>
          </div>
        </div>

        {/* ETA Comparison Bar */}
        <div className="mt-3 p-3 bg-gradient-to-r from-emerald-500/10 to-slate-950 rounded-xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">ETA Comparison</span>
            <span className="text-[10px] font-mono text-emerald-300 font-bold flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {c.route.timeSavedMin} min saved
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[9px] font-mono text-slate-500 block">Normal ETA</span>
              <span className="text-lg font-bold text-red-400 font-mono">{c.route.normalEtaMin}</span>
              <span className="text-[9px] font-mono text-slate-500"> min</span>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 block">Emergency ETA</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{c.route.emergencyEtaMin}</span>
              <span className="text-[9px] font-mono text-slate-500"> min</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onSimulate(); }}
            disabled={status !== 'idle'}
            className="flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-slate-800 disabled:text-slate-600 text-purple-300 border border-purple-500/40 disabled:border-slate-800 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Play className="w-3 h-3" />
            SIMULATE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            disabled={status !== 'simulated'}
            className="flex-1 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:bg-slate-800 disabled:text-slate-600 text-cyan-300 border border-cyan-500/40 disabled:border-slate-800 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-3 h-3" />
            APPROVE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeploy(); }}
            disabled={!isApproved && !isActive}
            className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
              isActive
                ? 'bg-emerald-500 text-slate-950 cursor-default'
                : isApproved
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                : 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Siren className="w-3 h-3" />
            {isActive ? 'CORRIDOR ACTIVE' : 'DEPLOY GREEN WAVE'}
          </button>
        </div>
      </div>

      {/* Expanded: Route + Signals Detail */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-4">
          {/* AI Route Detail */}
          <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <Route className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">AI Route: {c.route.name}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {c.route.viaRoads.map((road, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-mono text-slate-300">{road}</span>
                  {idx < c.route.viaRoads.length - 1 && <span className="text-slate-600">→</span>}
                </React.Fragment>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-slate-500 block">Patient/Unit</span>
                <span className="text-slate-200 font-bold">{c.patientOrUnit}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Normal Speed</span>
                <span className="text-slate-200 font-bold">{Math.round(c.route.distanceKm / (c.route.normalEtaMin / 60))} km/h</span>
              </div>
              <div>
                <span className="text-slate-500 block">Emergency Speed</span>
                <span className="text-emerald-400 font-bold">{Math.round(c.route.distanceKm / (c.route.emergencyEtaMin / 60))} km/h</span>
              </div>
            </div>
          </div>

          {/* Coordinated Signals */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">
                Coordinated Signals ({c.coordinatedSignals.length})
              </span>
            </div>

            {/* Signal Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-800" />

              <div className="space-y-3">
                {c.coordinatedSignals.map((sig, idx) => {
                  const isLast = idx === c.coordinatedSignals.length - 1;
                  const isPreempted = sig.status === 'pre-empted' || sig.status === 'green';
                  return (
                    <div key={sig.junctionId} className="relative pl-9">
                      {/* Dot on timeline */}
                      <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                        isPreempted
                          ? 'bg-emerald-500 border-emerald-400'
                          : isActive
                          ? 'bg-amber-500 border-amber-400 animate-pulse'
                          : 'bg-slate-700 border-slate-600'
                      }`} />

                      <div className={`p-2.5 rounded-lg border ${
                        isPreempted ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-slate-200">{sig.junctionName}</span>
                            <span className="text-[9px] font-mono text-slate-500 block">{sig.distanceFromOriginKm} km from origin</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                            isPreempted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {isPreempted ? 'PRE-EMPTED' : 'PENDING'}
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400">
                          <span>Normal: <span className="text-slate-300">{sig.normalPhase}</span></span>
                          <span>Emergency: <span className="text-emerald-400">{sig.emergencyPhase}</span></span>
                          <span>Duration: <span className="text-slate-200">{sig.phaseDurationSec}s</span></span>
                          <span className={isLast ? 'text-amber-400 font-bold' : ''}>{isLast ? 'DESTINATION' : `→ Next: ${c.coordinatedSignals[idx + 1]?.junctionName.split(' ')[0]}`}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
