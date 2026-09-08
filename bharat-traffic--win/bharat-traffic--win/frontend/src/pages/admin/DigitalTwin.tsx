import React, { useState, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import {
  getCorridorsForZone,
  getRoadsForCorridor,
  getIntersectionsForRoad,
  getSignalForIntersection,
  getZoneById,
  getCorridorById,
  getRoadById,
  getCityTwinData,
  type TwinZone,
  type TwinCorridor,
  type TwinRoad,
  type TwinIntersection,
} from '../../mock/mockTwinHierarchy';
import {
  Cpu,
  RefreshCcw,
  ChevronRight,
  Home,
  MapPin,
  Car,
  Gauge,
  Activity,
  Clock,
  Layers,
  Signal,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// ── Hierarchy breadcrumb level ──
type DrillLevel = 'city' | 'zone' | 'corridor' | 'road' | 'intersection';

interface DrillState {
  level: DrillLevel;
  zoneId?: string;
  corridorId?: string;
  roadId?: string;
  intersectionId?: string;
}

const STATIC_LEVEL_LABELS: Record<Exclude<DrillLevel, 'city'>, string> = {
  zone: 'Zone',
  corridor: 'Corridor',
  road: 'Road',
  intersection: 'Intersection',
};

const STATUS_COLORS: Record<string, string> = {
  'Gridlock': '#ef4444',
  'Heavy Congestion': '#f97316',
  'Slow Traffic': '#eab308',
  'Clear': '#22c55e',
};

export const AdminDigitalTwin: React.FC = () => {
  const { addToast } = useToast();
  const { selectedCity } = useApp();
  const [drill, setDrill] = useState<DrillState>({ level: 'city' });

  // ── City-specific data from provider (DEMO/MOCK) ──
  const cityData = useMemo(() => getCityTwinData(selectedCity), [selectedCity]);
  const { zones: TWIN_ZONES, corridors: TWIN_CORRIDORS, roads: TWIN_ROADS, intersections: TWIN_INTERSECTIONS } = cityData;

  // Derived data for current drill level
  const currentZone = drill.zoneId ? getZoneById(drill.zoneId) : null;
  const currentCorridor = drill.corridorId ? getCorridorById(drill.corridorId) : null;
  const currentRoad = drill.roadId ? getRoadById(drill.roadId) : null;
  const currentIntersection = drill.intersectionId
    ? TWIN_INTERSECTIONS.find((ix) => ix.id === drill.intersectionId)
    : null;
  const currentSignal = drill.intersectionId ? getSignalForIntersection(drill.intersectionId) : null;

  // Children for current level
  const zones = TWIN_ZONES;
  const corridors = drill.zoneId ? getCorridorsForZone(drill.zoneId) : TWIN_CORRIDORS;
  const roads = drill.corridorId ? getRoadsForCorridor(drill.corridorId) : TWIN_ROADS;
  const intersections = drill.roadId ? getIntersectionsForRoad(drill.roadId) : TWIN_INTERSECTIONS;

  // Summary KPIs for current level
  const summaryKpis = useMemo(() => {
    if (drill.level === 'city') {
      const totalVehicles = TWIN_ZONES.reduce((s, z) => s + z.totalVehicles, 0);
      const avgSpeed = Math.round(TWIN_ZONES.reduce((s, z) => s + z.avgSpeed, 0) / TWIN_ZONES.length);
      const avgCongestion = Math.round(TWIN_ZONES.reduce((s, z) => s + z.avgCongestion, 0) / TWIN_ZONES.length);
      const totalJunctions = TWIN_ZONES.reduce((s, z) => s + z.junctionCount, 0);
      return { vehicles: totalVehicles, speed: avgSpeed, congestion: avgCongestion, junctions: totalJunctions, queue: 0, signals: totalJunctions };
    }
    if (drill.level === 'zone' && currentZone) {
      const zoneCorridors = getCorridorsForZone(currentZone.id);
      const avgSpeed = Math.round(zoneCorridors.reduce((s, c) => s + c.avgSpeed, 0) / (zoneCorridors.length || 1));
      const avgCongestion = Math.round(zoneCorridors.reduce((s, c) => s + c.avgCongestion, 0) / (zoneCorridors.length || 1));
      return { vehicles: currentZone.totalVehicles, speed: avgSpeed, congestion: avgCongestion, junctions: currentZone.junctionCount, queue: 0, signals: currentZone.junctionCount };
    }
    if (drill.level === 'corridor' && currentCorridor) {
      const cRoads = getRoadsForCorridor(currentCorridor.id);
      const avgSpeed = Math.round(cRoads.reduce((s, r) => s + r.avgSpeed, 0) / (cRoads.length || 1));
      const avgCongestion = Math.round(cRoads.reduce((s, r) => s + r.congestion, 0) / (cRoads.length || 1));
      return { vehicles: currentCorridor.totalVehicles, speed: avgSpeed, congestion: avgCongestion, junctions: currentCorridor.junctionCount, queue: 0, signals: currentCorridor.junctionCount };
    }
    if (drill.level === 'road' && currentRoad) {
      const roadIxs = getIntersectionsForRoad(currentRoad.id);
      const totalQueue = roadIxs.reduce((s, ix) => s + ix.queueLength, 0);
      return { vehicles: currentRoad.totalVehicles, speed: currentRoad.avgSpeed, congestion: currentRoad.congestion, junctions: roadIxs.length, queue: totalQueue, signals: roadIxs.length };
    }
    if (drill.level === 'intersection' && currentIntersection) {
      return { vehicles: currentIntersection.vehicleCount, speed: 0, congestion: currentIntersection.congestion, junctions: 1, queue: currentIntersection.queueLength, signals: 1 };
    }
    return { vehicles: 0, speed: 0, congestion: 0, junctions: 0, queue: 0, signals: 0 };
  }, [drill, currentZone, currentCorridor, currentRoad, currentIntersection]);

  // Chart data: status distribution
  const statusDistribution = useMemo(() => {
    const items = drill.level === 'zone' ? corridors :
      drill.level === 'corridor' ? roads :
      drill.level === 'road' ? intersections.map((ix) => ({
        ...ix,
        roadStatus: ix.congestion > 85 ? 'Gridlock' : ix.congestion > 65 ? 'Heavy Congestion' : ix.congestion > 40 ? 'Slow Traffic' : 'Clear',
      })) :
      [];
    const counts: Record<string, number> = {};
    items.forEach((item: any) => {
      const status = item.roadStatus || (item.congestion > 85 ? 'Gridlock' : item.congestion > 65 ? 'Heavy Congestion' : item.congestion > 40 ? 'Slow Traffic' : 'Clear');
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [drill, corridors, roads, intersections]);

  // Chart data: speed comparison (actual vs simulated)
  const speedComparison = useMemo(() => {
    if (drill.level === 'city') {
      return TWIN_ZONES.map((z, i) => ({ name: z.name.replace(/ .+$/, ''), actual: z.avgSpeed, simulated: z.avgSpeed + [2, 3, 1, 4, 2, 3][i % 6], congestion: z.avgCongestion }));
    }
    if (drill.level === 'zone' && currentZone) {
      return corridors.map((c, i) => ({ name: c.name.split(' ')[0], actual: c.avgSpeed, simulated: c.avgSpeed + [2, 3, 1, 4, 2][i % 5], congestion: c.avgCongestion }));
    }
    if (drill.level === 'corridor' && currentCorridor) {
      return roads.map((r, i) => ({ name: r.name.split('→')[0].trim().slice(0, 12), actual: r.avgSpeed, simulated: r.avgSpeed + [2, 3, 1, 2, 3][i % 5], congestion: r.congestion }));
    }
    return [];
  }, [drill, corridors, roads, currentZone, currentCorridor]);

  // Navigation helpers
  const navigateTo = (level: DrillLevel, id?: string) => {
    setDrill((prev) => {
      if (level === 'city') return { level: 'city' };
      if (level === 'zone') return { level: 'zone', zoneId: id };
      if (level === 'corridor') return { level: 'corridor', zoneId: prev.zoneId, corridorId: id };
      if (level === 'road') return { level: 'road', zoneId: prev.zoneId, corridorId: prev.corridorId, roadId: id };
      if (level === 'intersection') return { level: 'intersection', zoneId: prev.zoneId, corridorId: prev.corridorId, roadId: prev.roadId, intersectionId: id };
      return prev;
    });

  };

  const handleRefresh = () => {
    addToast({ type: 'info', title: 'Twin Sync', message: 'Digital twin state resynchronized with live sensor feed', duration: 3000 });
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            DIGITAL TWIN — BHARAT TRAFFIC
          </h2>
          <p className="text-[11px] text-slate-400">
            Microscopic network simulation — City → Zone → Corridor → Road → Intersection → Signal
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono font-bold text-amber-400">
            DEMO DATA — source: MOCK
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-400 text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Sync Twin State
        </button>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono flex-wrap">
        <button onClick={() => navigateTo('city')} className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors">
          <Home className="w-3 h-3" /> {selectedCity}
        </button>
        {drill.zoneId && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <button onClick={() => navigateTo('zone', drill.zoneId)} className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {currentZone?.name}
            </button>
          </>
        )}
        {drill.corridorId && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <button onClick={() => navigateTo('corridor', drill.corridorId)} className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {currentCorridor?.name.split(' ').slice(0, 3).join(' ')}
            </button>
          </>
        )}
        {drill.roadId && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <button onClick={() => navigateTo('road', drill.roadId)} className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {currentRoad?.name.split('→')[0].trim()}
            </button>
          </>
        )}
        {drill.intersectionId && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-emerald-400 font-bold">{currentIntersection?.name}</span>
          </>
        )}
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiMini label="Vehicles" value={summaryKpis.vehicles.toLocaleString()} icon={Car} color="cyan" />
        <KpiMini label="Avg Speed" value={`${summaryKpis.speed} km/h`} icon={Gauge} color="emerald" />
        <KpiMini label="Congestion" value={`${summaryKpis.congestion}%`} icon={Activity} color="red" />
        <KpiMini label="Junctions" value={summaryKpis.junctions.toString()} icon={MapPin} color="amber" />
        <KpiMini label="Queue" value={`${summaryKpis.queue}m`} icon={Clock} color="purple" />
        <KpiMini label="Signals" value={summaryKpis.signals.toString()} icon={Signal} color="cyan" />
      </div>

      {/* ── Main Grid: Content List + Detail Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Children list (zones/roads/intersections) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              {drill.level === 'city' ? selectedCity : STATIC_LEVEL_LABELS[drill.level]} {drill.level !== 'intersection' ? '— Children' : '— Signal State'}
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              {drill.level === 'city' ? `${zones.length} zones` :
               drill.level === 'zone' ? `${corridors.length} corridors` :
               drill.level === 'corridor' ? `${roads.length} roads` :
               drill.level === 'road' ? `${intersections.length} intersections` :
               '1 signal'}
            </span>
          </div>

          <div className="p-4 max-h-[440px] overflow-y-auto">
            {drill.level === 'city' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {zones.map((z) => (                   <ZoneCard key={z.id} zone={z} onClick={() => navigateTo('zone', z.id)} />
                ))}
              </div>
            )}
            {drill.level === 'zone' && (
              <div className="space-y-2">
                {corridors.map((c) => (
                  <CorridorCard key={c.id} corridor={c} onClick={() => navigateTo('corridor', c.id)} />
                ))}
              </div>
            )}
            {drill.level === 'corridor' && (
              <div className="space-y-2">
                {roads.map((r) => (
                  <RoadCard key={r.id} road={r} onClick={() => navigateTo('road', r.id)} />
                ))}
              </div>
            )}
            {drill.level === 'road' && (
              <div className="space-y-2">
                {intersections.map((ix) => (
                  <IntersectionCard key={ix.id} intersection={ix} onClick={() => navigateTo('intersection', ix.id)} />
                ))}
              </div>
            )}
            {drill.level === 'intersection' && currentIntersection && currentSignal && (
              <SignalDetail intersection={currentIntersection} signal={currentSignal} />
            )}
            {drill.level === 'intersection' && currentIntersection && !currentSignal && (
              <div className="text-center py-8 text-slate-400 text-xs font-mono">
                <Signal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                No signal data for this intersection
              </div>
            )}
          </div>
        </div>

        {/* Right: Charts panel */}
        <div className="space-y-4">
          {/* Speed Comparison Chart */}
          {speedComparison.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono">
                Actual vs Twin Speed
              </h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={speedComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                    <Bar dataKey="actual" fill="#f97316" name="Actual km/h" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="simulated" fill="#06b6d4" name="Twin km/h" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-mono">
                <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-sm bg-amber-400" /> Actual</span>
                <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-sm bg-cyan-400" /> Twin</span>
              </div>
            </div>
          )}

          {/* Status Distribution Pie */}
          {statusDistribution.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono">
                Status Distribution
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                        {statusDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS[item.name] || '#64748b' }} />
                        <span className="text-slate-300">{item.name}</span>
                      </div>
                      <span className="text-slate-100 font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Congestion Radar */}
          {drill.level === 'city' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono">
                Zone Congestion Radar
              </h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={TWIN_ZONES.map((z) => ({ zone: z.name.replace(' Bengaluru', ''), congestion: z.avgCongestion, speed: z.avgSpeed }))}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="zone" stroke="#475569" fontSize={9} />
                    <PolarRadiusAxis stroke="#334155" fontSize={8} />
                    <Radar name="Congestion" dataKey="congestion" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    <Radar name="Speed" dataKey="speed" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Zone Congestion Trend (when in zone/corridor) */}
          {drill.level !== 'city' && drill.level !== 'intersection' && speedComparison.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono">
                Congestion Profile
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={speedComparison}>
                    <defs>
                      <linearGradient id="twinCong" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="congestion" stroke="#ef4444" fillOpacity={1} fill="url(#twinCong)" name="Congestion %" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── KPI Mini Card ──
const KpiMini: React.FC<{ label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }> = ({ label, value, icon: Icon, color }) => {
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-400',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
  };
  const iconBg: Record<string, string> = {
    cyan: 'bg-cyan-500/20 text-cyan-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <div className={`p-3 rounded-xl border bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-between`}>
      <div>
        <p className="text-[10px] text-slate-400">{label}</p>
        <h3 className="text-lg font-bold text-slate-100 font-mono tracking-tight">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${iconBg[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
};

// ── Zone Card ──
const ZoneCard: React.FC<{ zone: TwinZone; onClick: () => void }> = ({ zone, onClick }) => {
  const statusColor = zone.avgCongestion > 75 ? 'text-red-400' : zone.avgCongestion > 50 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <button onClick={onClick} className="w-full text-left p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-all space-y-2 group">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{zone.name}</h4>
          <span className="text-[10px] font-mono text-slate-500">{zone.junctionCount} junctions</span>
        </div>
        <span className={`text-xs font-mono font-bold ${statusColor}`}>{zone.avgCongestion}%</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400">
        <span>Vehicles: <span className="text-slate-200">{zone.totalVehicles.toLocaleString()}</span></span>
        <span>Speed: <span className="text-slate-200">{zone.avgSpeed} km/h</span></span>
        <span className="text-right text-cyan-400 group-hover:text-cyan-300">Drill In →</span>
      </div>
    </button>
  );
};

// ── Corridor Card ──
const CorridorCard: React.FC<{ corridor: TwinCorridor; onClick: () => void }> = ({ corridor, onClick }) => {
  const statusColor = corridor.avgCongestion > 85 ? 'text-red-400' : corridor.avgCongestion > 60 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <button onClick={onClick} className="w-full text-left p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-all flex justify-between items-center group">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{corridor.name}</h4>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400">{corridor.lengthKm} km</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span>Vehicles: <span className="text-slate-200">{corridor.totalVehicles.toLocaleString()}</span></span>
          <span>Speed: <span className="text-slate-200">{corridor.avgSpeed} km/h</span></span>
          <span className={statusColor}>{corridor.avgCongestion}%</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
    </button>
  );
};

// ── Road Card ──
const RoadCard: React.FC<{ road: TwinRoad; onClick: () => void }> = ({ road, onClick }) => {
  const statusStyle = {
    'Gridlock': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Heavy Congestion': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Slow Traffic': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Clear': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }[road.status];
  return (
    <button onClick={onClick} className="w-full text-left p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-all flex justify-between items-center group">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{road.name}</h4>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${statusStyle}`}>{road.status}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-400">
          <span>Vehicles: <span className="text-slate-200">{road.totalVehicles}</span></span>
          <span>Speed: <span className={road.avgSpeed < 20 ? 'text-red-400' : 'text-slate-200'}>{road.avgSpeed} km/h</span></span>
          <span>Density: <span className="text-slate-200">{road.density} v/km</span></span>
          <span>Lanes: <span className="text-slate-200">{road.laneCount}</span></span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors ml-2" />
    </button>
  );
};

// ── Intersection Card ──
const IntersectionCard: React.FC<{ intersection: TwinIntersection; onClick: () => void }> = ({ intersection, onClick }) => {
  const statusColor = intersection.congestion > 85 ? 'text-red-400' : intersection.congestion > 65 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <button onClick={onClick} className="w-full text-left p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-all space-y-2 group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{
            backgroundColor: intersection.congestion > 85 ? '#ef4444' : intersection.congestion > 65 ? '#f97316' : intersection.congestion > 40 ? '#eab308' : '#22c55e'
          }} />
          <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{intersection.name}</h4>
        </div>
        <span className={`text-xs font-mono font-bold ${statusColor}`}>{intersection.congestion}%</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-400 pl-4">
        <span>Vehicles: <span className="text-slate-200">{intersection.vehicleCount}</span></span>
        <span>Queue: <span className="text-slate-200">{intersection.queueLength}m</span></span>
        <span>Wait: <span className={intersection.waitTime > 120 ? 'text-red-400' : 'text-slate-200'}>{intersection.waitTime}s</span></span>
        <span>Mode: <span className="text-cyan-400 uppercase">{intersection.signalMode}</span></span>
      </div>
    </button>
  );
};

// ── Signal Detail (leaf level) ──
const SignalDetail: React.FC<{ intersection: TwinIntersection; signal: { mode: string; activePhaseIndex: number; cycleLengthSec: number; phases: { name: string; durationSec: number; isGreen: boolean }[] } }> = ({ intersection, signal }) => {
  return (
    <div className="space-y-4">
      {/* Intersection header */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{
            backgroundColor: intersection.congestion > 85 ? '#ef4444' : intersection.congestion > 65 ? '#f97316' : '#22c55e'
          }} />
          <h4 className="text-sm font-bold text-slate-100">{intersection.name}</h4>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
          <span>Vehicles: <span className="text-slate-200 font-bold">{intersection.vehicleCount}</span></span>
          <span>Queue: <span className="text-slate-200 font-bold">{intersection.queueLength}m</span></span>
          <span>Wait: <span className={`font-bold ${intersection.waitTime > 120 ? 'text-red-400' : 'text-slate-200'}`}>{intersection.waitTime}s</span></span>
          <span>Congestion: <span className={`font-bold ${intersection.congestion > 85 ? 'text-red-400' : 'text-amber-400'}`}>{intersection.congestion}%</span></span>
        </div>
      </div>

      {/* Signal state */}
      <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Signal className="w-3 h-3" /> Signal State
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-400">
            {signal.mode.toUpperCase()}
          </span>
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          Cycle: <span className="text-slate-200 font-bold">{signal.cycleLengthSec}s</span>
        </div>

        {/* Phase timeline */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-mono text-slate-500 uppercase">Signal Phases</span>
          {signal.phases.map((phase, idx) => (
            <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
              idx === signal.activePhaseIndex
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className={`w-3 h-3 rounded-full shrink-0 flex items-center justify-center ${
                idx === signal.activePhaseIndex
                  ? 'bg-emerald-500'
                  : 'bg-slate-700'
              }`}>
                {idx === signal.activePhaseIndex && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </div>
              <div className="flex-1">
                <span className={`text-[10px] font-bold ${idx === signal.activePhaseIndex ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {phase.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{phase.durationSec}s</span>
              <span className={`text-[9px] font-mono font-bold ${phase.isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                {phase.isGreen ? 'GREEN' : 'RED'}
              </span>
            </div>
          ))}
        </div>

        {/* Phase bar visualization */}
        <div className="space-y-1">
          <span className="text-[9px] font-mono text-slate-500 uppercase">Cycle Timeline</span>
          <div className="flex h-5 rounded-lg overflow-hidden border border-slate-800">
            {signal.phases.map((phase, idx) => {
              const width = (phase.durationSec / signal.cycleLengthSec) * 100;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-center text-[8px] font-mono font-bold transition-all ${
                    idx === signal.activePhaseIndex
                      ? 'bg-emerald-500 text-slate-950'
                      : phase.isGreen
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                  style={{ width: `${width}%` }}
                  title={`${phase.name} (${phase.durationSec}s)`}
                >
                  {width > 15 ? `${phase.durationSec}s` : ''}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <a
        href="/admin/signal-optimization"
        className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-mono font-bold transition-all"
      >
        Open Signal Controller
        <ArrowUpRight className="w-3 h-3" />
      </a>
    </div>
  );
};
