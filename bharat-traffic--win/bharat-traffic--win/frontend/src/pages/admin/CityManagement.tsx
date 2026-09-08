import React, { useState, useMemo } from 'react';
import {
  MOCK_CITIES,
  type CityData,
  type ZoneData,
  type CorridorData,
  type RoadData,
  type IntersectionData,
} from '../../mock/mockCities';
import { useRealtime } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  MapPin,
  Signal,
  Camera,
  Wifi,
  ChevronRight,
  Edit3,
  Eye,
  Globe,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
  Zap,
  Server,
  CheckCircle2,
  Radio,
} from 'lucide-react';

// ── Types ──
type DrillLevel = 'cities' | 'city' | 'zone' | 'corridor' | 'road' | 'intersection';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-slate-800 text-slate-500 border-slate-700',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  gridlock: 'bg-red-500/20 text-red-400 border-red-500/30',
  heavy: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  slow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  clear: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const CITY_ACCENT: Record<string, string> = {
  'city-blr': 'cyan',
  'city-dl': 'amber',
  'city-ghz': 'emerald',
  'city-noida': 'purple',
  'city-lko': 'blue',
  'city-jai': 'rose',
};

export const AdminCityManagement: React.FC = () => {
  const { snapshot } = useRealtime();
  const { addToast } = useToast();

  // ── Navigation State ──
  const [level, setLevel] = useState<DrillLevel>('cities');
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<CorridorData | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadData | null>(null);
  const [selectedIntersection, setSelectedIntersection] = useState<IntersectionData | null>(null);

  // ── Add/Edit Modal State ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCity, setEditCity] = useState<CityData | null>(null);

  // ── Breadcrumb ──
  const breadcrumb = useMemo(() => {
    const crumbs: { label: string; onClick: () => void }[] = [];
    if (level === 'cities') return crumbs;
    crumbs.push({ label: 'All Cities', onClick: () => { setLevel('cities'); setSelectedCity(null); resetDrill(); } });
    if (selectedCity)    crumbs.push({ label: selectedCity.name, onClick: () => { setLevel('city'); setSelectedZone(null); setSelectedCorridor(null); setSelectedRoad(null); setSelectedIntersection(null); } });
    if (selectedZone)    crumbs.push({ label: selectedZone.name, onClick: () => { setLevel('zone'); setSelectedCorridor(null); setSelectedRoad(null); setSelectedIntersection(null); } });
    if (selectedCorridor)    crumbs.push({ label: selectedCorridor.name, onClick: () => { setLevel('corridor'); setSelectedRoad(null); setSelectedIntersection(null); } });
    if (selectedRoad)    crumbs.push({ label: selectedRoad.name, onClick: () => { setLevel('road'); setSelectedIntersection(null); } });
    if (selectedIntersection) crumbs.push({ label: selectedIntersection.name, onClick: () => {} });
    return crumbs;
  }, [level, selectedCity, selectedZone, selectedCorridor, selectedRoad, selectedIntersection]);

  function resetDrill() { setSelectedZone(null); resetCorridor(); }
  function resetCorridor() { setSelectedCorridor(null); resetRoad(); }
  function resetRoad() { setSelectedRoad(null); setSelectedIntersection(null); }

  // ── View City ──
  function viewCity(city: CityData) {
    setSelectedCity(city);
    setLevel('city');
    resetDrill();
    addToast({ type: 'info', title: 'City Selected', message: `Viewing ${city.name}, ${city.state}`, duration: 2000 });
  }

  // ── Add City ──
  const [newCityName, setNewCityName] = useState('');
  const [newCityState, setNewCityState] = useState('');
  const [newCityPop, setNewCityPop] = useState('');

  function handleAddCity() {
    if (!newCityName.trim()) { addToast({ type: 'warning', title: 'Missing Name', message: 'Enter a city name', duration: 3000 }); return; }
    addToast({ type: 'success', title: 'City Added', message: `${newCityName} registered successfully. Deploy sensors to activate.`, duration: 4000 });
    setShowAddModal(false);
    setNewCityName(''); setNewCityState(''); setNewCityPop('');
  }

  // ── Edit City ──
  const [editCityName, setEditCityName] = useState('');
  const [editCityPop, setEditCityPop] = useState('');

  function openEdit(city: CityData) {
    setEditCity(city);
    setEditCityName(city.name);
    setEditCityPop(city.population);
    setShowEditModal(true);
  }

  function handleEditCity() {
    if (!editCity) return;
    addToast({ type: 'success', title: 'City Updated', message: `${editCity.name} configuration saved`, duration: 3000 });
    setShowEditModal(false);
    setEditCity(null);
  }

  // ── Live Congestion from snapshot ──
  function getLiveCongestion(cityId: string): number {
    if (cityId === 'city-blr') return snapshot.cityStats.cityCongestionIndex;
    // Other cities use static data
    const city = MOCK_CITIES.find(c => c.id === cityId);
    return city?.avgCongestion ?? 0;
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            CITY MANAGEMENT — TRAFFIC CONTROL PLATFORM
          </h2>
          <p className="text-[11px] text-slate-400">
            City-independent platform — manage zones, corridors, roads, intersections, and signals across all deployed cities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {level !== 'cities' && (
            <button
              onClick={() => {
                if (level === 'intersection') { setLevel('road'); setSelectedIntersection(null); }
                else if (level === 'road') { setLevel('corridor'); setSelectedRoad(null); setSelectedIntersection(null); }
                else if (level === 'corridor') { setLevel('zone'); setSelectedCorridor(null); setSelectedRoad(null); setSelectedIntersection(null); }
                else if (level === 'zone') { setLevel('city'); setSelectedZone(null); resetCorridor(); }
                else if (level === 'city') { setLevel('cities'); setSelectedCity(null); resetDrill(); }
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-mono font-bold rounded-xl flex items-center gap-1.5 shadow-lg"
          >
            <Plus className="w-4 h-4" /> ADD CITY
          </button>
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
          {breadcrumb.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <button onClick={c.onClick} className="hover:text-emerald-400 transition-colors">{c.label}</button>
            </React.Fragment>
          ))}
          {selectedIntersection && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-emerald-400">{selectedIntersection.name}</span>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* LEVEL: ALL CITIES                                   */}
      {/* ════════════════════════════════════════════════════ */}
      {level === 'cities' && (
        <>
          {/* Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <MiniStat label="Total Cities" value={MOCK_CITIES.length} icon={<Globe className="w-3.5 h-3.5 text-emerald-400" />} />
            <MiniStat label="Total Junctions" value={MOCK_CITIES.reduce((s, c) => s + c.junctionCount, 0)} icon={<Signal className="w-3.5 h-3.5 text-cyan-400" />} />
            <MiniStat label="Total Sensors" value={MOCK_CITIES.reduce((s, c) => s + c.sensorCount, 0)} icon={<Wifi className="w-3.5 h-3.5 text-amber-400" />} />
            <MiniStat label="Total Cameras" value={MOCK_CITIES.reduce((s, c) => s + c.cameraCount, 0)} icon={<Camera className="w-3.5 h-3.5 text-purple-400" />} />
            <MiniStat label="Daily Vehicles" value={MOCK_CITIES.reduce((s, c) => s + c.dailyVehicles, 0)} icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />} />
            <MiniStat label="Active Incidents" value={MOCK_CITIES.reduce((s, c) => s + c.activeIncidents, 0)} icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />} />
          </div>

          {/* City Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MOCK_CITIES.map(city => {

              const accent = CITY_ACCENT[city.id] || 'cyan';
              const liveCong = getLiveCongestion(city.id);
              return (
                <div
                  key={city.id}
                  className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-${accent}-500/30 transition-all cursor-pointer group`}
                  onClick={() => viewCity(city)}
                >
                  {/* City Header */}
                  <div className={`px-5 py-4 bg-gradient-to-r from-${accent}-500/10 to-transparent border-b border-slate-800`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-100 font-mono">{city.name}</h3>
                        <p className="text-[10px] font-mono text-slate-400">{city.state} · Pop. {city.population}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${STATUS_STYLES[city.status]}`}>
                        {city.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-px bg-slate-800">
                    <MetricCell label="Zones" value={city.zoneCount} accent={accent} />
                    <MetricCell label="Junctions" value={city.junctionCount} accent={accent} />
                    <MetricCell label="Signals" value={city.signalCount} accent={accent} />
                    <MetricCell label="Sensors" value={city.sensorCount} accent={accent} />
                    <MetricCell label="Cameras" value={city.cameraCount} accent={accent} />
                    <MetricCell label="Adaptive" value={city.adaptiveSignals} accent={accent} />
                  </div>

                  {/* Live Bar */}
                  <div className="px-5 py-3 flex items-center justify-between border-t border-slate-800/60">
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                      <span className="flex items-center gap-1">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span className="text-slate-400">Congestion</span>
                        <span className={`font-bold ${liveCong > 80 ? 'text-red-400' : liveCong > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {liveCong}%
                        </span>
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">
                        <span className="font-bold text-slate-200">{city.avgSpeed}</span> km/h
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">
                        <span className="font-bold text-slate-200">{city.dailyVehicles.toLocaleString()}</span> veh/day
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* LEVEL: SINGLE CITY → ZONES                         */}
      {/* ════════════════════════════════════════════════════ */}
      {level === 'city' && selectedCity && (
        <>
          {/* City Summary */}
          <CitySummaryBar city={selectedCity} liveCongestion={getLiveCongestion(selectedCity.id)} />

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEdit(selectedCity)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5"
            >
              <Edit3 className="w-3 h-3" /> Edit City
            </button>
            <button
              onClick={() => addToast({ type: 'info', title: 'City View', message: `Viewing full ${selectedCity.name} telemetry`, duration: 2000 })}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5"
            >
              <Eye className="w-3 h-3" /> View Details
            </button>
          </div>

          {/* Zones Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Zones in {selectedCity.name} ({selectedCity.zones.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedCity.zones.map(zone => (
                <div
                  key={zone.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/30 cursor-pointer transition-all"
                  onClick={() => { setSelectedZone(zone); setLevel('zone'); }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-100 font-mono">{zone.name}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${STATUS_STYLES[zone.congestion > 80 ? 'critical' : zone.congestion > 60 ? 'heavy' : zone.congestion > 40 ? 'slow' : 'clear']}`}>
                      {zone.congestion > 80 ? 'CRITICAL' : zone.congestion > 60 ? 'HEAVY' : zone.congestion > 40 ? 'MODERATE' : 'CLEAR'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div><span className="text-slate-500">Junctions</span><span className="ml-1 text-slate-200 font-bold">{zone.junctionCount}</span></div>
                    <div><span className="text-slate-500">Vehicles</span><span className="ml-1 text-slate-200 font-bold">{zone.vehicleCount.toLocaleString()}</span></div>
                    <div><span className="text-slate-500">Avg Speed</span><span className="ml-1 text-slate-200 font-bold">{zone.avgSpeed} km/h</span></div>
                    <div><span className="text-slate-500">Congestion</span><span className={`ml-1 font-bold ${zone.congestion > 80 ? 'text-red-400' : zone.congestion > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>{zone.congestion}%</span></div>
                    <div><span className="text-slate-500">Corridors</span><span className="ml-1 text-slate-200 font-bold">{zone.corridors.length}</span></div>
                  </div>
                  {/* Congestion Bar */}
                  <div className="mt-3 w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${zone.congestion > 80 ? 'bg-red-500' : zone.congestion > 60 ? 'bg-amber-500' : zone.congestion > 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${zone.congestion}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* LEVEL: ZONE → CORRIDORS                            */}
      {/* ════════════════════════════════════════════════════ */}
      {level === 'zone' && selectedZone && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-100 font-mono flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                {selectedZone.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {selectedZone.junctionCount} junctions · {selectedZone.vehicleCount.toLocaleString()} vehicles · {selectedZone.corridors.length} corridors
              </p>
            </div>
          </div>

          {selectedZone.corridors.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono space-y-2 border border-dashed border-slate-800 rounded-xl">
              <Server className="w-8 h-8 mx-auto text-slate-600" />
              <p>No corridors registered in this zone yet</p>
              <p className="text-[10px] text-slate-600">Deploy sensors and map road segments to build the corridor hierarchy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedZone.corridors.map(corridor => (
                <div
                  key={corridor.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/30 cursor-pointer transition-all"
                  onClick={() => { setSelectedCorridor(corridor); setLevel('corridor'); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-100 font-mono">{corridor.name}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${STATUS_STYLES[corridor.status]}`}>
                      {corridor.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div><span className="text-slate-500">Length</span><span className="ml-1 text-slate-200 font-bold">{corridor.lengthKm} km</span></div>
                    <div><span className="text-slate-500">Lanes</span><span className="ml-1 text-slate-200 font-bold">{corridor.lanes}</span></div>
                    <div><span className="text-slate-500">Flow</span><span className="ml-1 text-slate-200 font-bold">{corridor.vehicleFlow.toLocaleString()}/day</span></div>
                    <div><span className="text-slate-500">Speed</span><span className="ml-1 text-slate-200 font-bold">{corridor.avgSpeed} km/h</span></div>
                    <div><span className="text-slate-500">Congestion</span><span className={`ml-1 font-bold ${corridor.congestion > 80 ? 'text-red-400' : corridor.congestion > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>{corridor.congestion}%</span></div>
                    <div><span className="text-slate-500">Roads</span><span className="ml-1 text-slate-200 font-bold">{corridor.roads.length}</span></div>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${corridor.congestion > 80 ? 'bg-red-500' : corridor.congestion > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${corridor.congestion}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* LEVEL: CORRIDOR → ROADS                            */}
      {/* ════════════════════════════════════════════════════ */}
      {level === 'corridor' && selectedCorridor && (
        <>
          <div>
            <h3 className="text-sm font-black text-slate-100 font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              {selectedCorridor.name}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {selectedCorridor.lengthKm} km · {selectedCorridor.lanes} lanes · {selectedCorridor.vehicleFlow.toLocaleString()} veh/day · {selectedCorridor.roads.length} road segments
            </p>
          </div>

          {selectedCorridor.roads.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono space-y-2 border border-dashed border-slate-800 rounded-xl">
              <Server className="w-8 h-8 mx-auto text-slate-600" />
              <p>No road segments mapped yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedCorridor.roads.map(road => (
                <div
                  key={road.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/30 cursor-pointer transition-all"
                  onClick={() => { setSelectedRoad(road); setLevel('road'); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-100 font-mono">{road.name}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${STATUS_STYLES[road.status]}`}>
                      {road.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] font-mono">
                    <div><span className="text-slate-500">Length</span><span className="ml-1 text-slate-200 font-bold">{road.lengthKm} km</span></div>
                    <div><span className="text-slate-500">Lanes</span><span className="ml-1 text-slate-200 font-bold">{road.lanes}</span></div>
                    <div><span className="text-slate-500">Vehicles</span><span className="ml-1 text-slate-200 font-bold">{road.vehicles}</span></div>
                    <div><span className="text-slate-500">Speed</span><span className="ml-1 text-slate-200 font-bold">{road.speed} km/h</span></div>
                    <div><span className="text-slate-500">Density</span><span className="ml-1 text-slate-200 font-bold">{road.density} v/km</span></div>
                    <div><span className="text-slate-500">Intersections</span><span className="ml-1 text-slate-200 font-bold">{road.intersections.length}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* LEVEL: ROAD → INTERSECTIONS                        */}
      {/* ════════════════════════════════════════════════════ */}
      {level === 'road' && selectedRoad && (
        <>
          <div>
            <h3 className="text-sm font-black text-slate-100 font-mono flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              {selectedRoad.name}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {selectedRoad.lengthKm} km · {selectedRoad.lanes} lanes · {selectedRoad.vehicles} vehicles · {selectedRoad.intersections.length} intersections
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Vehicles" value={selectedRoad.vehicles} icon={<BarChart3 className="w-3.5 h-3.5 text-cyan-400" />} />
            <MiniStat label="Avg Speed" value={`${selectedRoad.speed} km/h`} icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />} />
            <MiniStat label="Density" value={`${selectedRoad.density} v/km`} icon={<Server className="w-3.5 h-3.5 text-amber-400" />} />
            <MiniStat label="Congestion" value={`${selectedRoad.congestion}%`} icon={<AlertTriangle className={`w-3.5 h-3.5 ${selectedRoad.congestion > 80 ? 'text-red-400' : 'text-amber-400'}`} />} />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
              Intersections ({selectedRoad.intersections.length})
            </h4>
            {selectedRoad.intersections.map(int => (
              <div
                key={int.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/30 cursor-pointer transition-all"
                onClick={() => { setSelectedIntersection(int); setLevel('intersection'); }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${int.status === 'critical' ? 'bg-red-500 animate-pulse' : int.status === 'red' ? 'bg-red-400' : int.status === 'yellow' ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                    <h4 className="text-xs font-bold text-slate-100 font-mono">{int.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${STATUS_STYLES[int.status]}`}>
                      {int.status.toUpperCase()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border bg-slate-800 text-slate-300 border-slate-700">
                      {int.signalMode.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] font-mono">
                  <div><span className="text-slate-500">Vehicles</span><span className="ml-1 text-slate-200 font-bold">{int.vehicles}</span></div>
                  <div><span className="text-slate-500">Queue</span><span className="ml-1 text-slate-200 font-bold">{int.queueLength}m</span></div>
                  <div><span className="text-slate-500">Wait</span><span className="ml-1 text-slate-200 font-bold">{int.waitTime}s</span></div>
                  <div><span className="text-slate-500">Congestion</span><span className={`ml-1 font-bold ${int.congestion > 80 ? 'text-red-400' : int.congestion > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>{int.congestion}%</span></div>
                  <div><span className="text-slate-500">Sensors</span><span className="ml-1 text-slate-200 font-bold">{int.sensors}</span></div>
                  <div><span className="text-slate-500">Cameras</span><span className="ml-1 text-slate-200 font-bold">{int.cameras}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* LEVEL: INTERSECTION → SIGNAL DETAIL                */}
      {/* ════════════════════════════════════════════════════ */}
      {level === 'intersection' && selectedIntersection && (
        <>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${selectedIntersection.status === 'critical' ? 'bg-red-500 animate-pulse' : selectedIntersection.status === 'red' ? 'bg-red-400' : selectedIntersection.status === 'yellow' ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
            <div>
              <h3 className="text-sm font-black text-slate-100 font-mono">{selectedIntersection.name}</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {selectedIntersection.lat.toFixed(4)}, {selectedIntersection.lng.toFixed(4)} · {selectedIntersection.sensors} sensors · {selectedIntersection.cameras} cameras
              </p>
            </div>
          </div>

          {/* Intersection KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-mono">Vehicles</p>
              <p className="text-xl font-black text-slate-100 font-mono">{selectedIntersection.vehicles.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-mono">Queue Length</p>
              <p className="text-xl font-black text-slate-100 font-mono">{selectedIntersection.queueLength}m</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-mono">Wait Time</p>
              <p className={`text-xl font-black font-mono ${selectedIntersection.waitTime > 120 ? 'text-red-400' : selectedIntersection.waitTime > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {selectedIntersection.waitTime}s
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-mono">Congestion</p>
              <p className={`text-xl font-black font-mono ${selectedIntersection.congestion > 80 ? 'text-red-400' : selectedIntersection.congestion > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {selectedIntersection.congestion}%
              </p>
            </div>
          </div>

          {/* Signal Detail */}
          {selectedIntersection.signal ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Signal className="w-3.5 h-3.5" />
                  Signal Controller — {selectedIntersection.signal.id}
                </h4>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${STATUS_STYLES[selectedIntersection.signalMode === 'emergency' ? 'critical' : selectedIntersection.signalMode === 'adaptive' ? 'active' : 'pending']}`}>
                  {selectedIntersection.signalMode.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div><span className="text-slate-500">Cycle Length</span><span className="ml-2 text-slate-200 font-bold">{selectedIntersection.signal.cycleLength}s</span></div>
                <div><span className="text-slate-500">Phases</span><span className="ml-2 text-slate-200 font-bold">{selectedIntersection.signal.phases.length}</span></div>
              </div>

              {/* Phase Timeline */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase">Phase Timeline</span>
                <div className="flex h-8 rounded-lg overflow-hidden border border-slate-800">
                  {selectedIntersection.signal.phases.map((phase, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-center text-[9px] font-mono font-bold text-slate-950 ${
                        phase.isGreen ? 'bg-emerald-500' : 'bg-slate-700 text-slate-400'
                      }`}
                      style={{ width: `${(phase.duration / selectedIntersection.signal!.cycleLength) * 100}%` }}
                    >
                      {phase.name} ({phase.duration}s)
                    </div>
                  ))}
                </div>
              </div>

              {/* Sensor Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10"><Wifi className="w-4 h-4 text-cyan-400" /></div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono">IoT Sensors</p>
                    <p className="text-sm font-black text-slate-100 font-mono">{selectedIntersection.sensors}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10"><Camera className="w-4 h-4 text-purple-400" /></div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono">ANPR Cameras</p>
                    <p className="text-sm font-black text-slate-100 font-mono">{selectedIntersection.cameras}</p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => addToast({ type: 'info', title: 'Signal Override', message: `Opening signal controller for ${selectedIntersection!.name}`, duration: 2000 })}
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold rounded-lg border border-emerald-500/30 flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3" /> Override Signal
                </button>
                <button
                  onClick={() => addToast({ type: 'info', title: 'Sensor Calibration', message: `Calibrating ${selectedIntersection!.sensors} sensors at ${selectedIntersection!.name}`, duration: 2000 })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Radio className="w-3 h-3" /> Calibrate Sensors
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono space-y-2 border border-dashed border-slate-800 rounded-xl">
              <Signal className="w-8 h-8 mx-auto text-slate-600" />
              <p>No signal controller installed at this intersection</p>
              <button
                onClick={() => addToast({ type: 'info', title: 'Install Signal', message: `Queuing signal controller installation at ${selectedIntersection!.name}`, duration: 2000 })}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-lg border border-emerald-500/30 mx-auto flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" /> Install Signal Controller
              </button>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* ADD CITY MODAL                                     */}
      {/* ════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-100 font-mono flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> ADD NEW CITY
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">City Name *</label>
                <input
                  type="text"
                  value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  placeholder="e.g. Chennai"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">State</label>
                <input
                  type="text"
                  value={newCityState}
                  onChange={e => setNewCityState(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Population</label>
                <input
                  type="text"
                  value={newCityPop}
                  onChange={e => setNewCityPop(e.target.value)}
                  placeholder="e.g. 11.5M"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-[10px] font-mono font-bold rounded-lg">Cancel</button>
              <button onClick={handleAddCity} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Add City
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* EDIT CITY MODAL                                    */}
      {/* ════════════════════════════════════════════════════ */}
      {showEditModal && editCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-100 font-mono flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" /> EDIT CITY — {editCity.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">City Name</label>
                <input
                  type="text"
                  value={editCityName}
                  onChange={e => setEditCityName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Population</label>
                <input
                  type="text"
                  value={editCityPop}
                  onChange={e => setEditCityPop(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">State</span>
                  <span className="text-slate-200 font-bold">{editCity.state}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Timezone</span>
                  <span className="text-slate-200 font-bold">{editCity.timezone}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Deployed</span>
                  <span className="text-slate-200 font-bold">{editCity.deploymentDate}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Status</span>
                  <span className="text-emerald-400 font-bold">{editCity.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowEditModal(false); setEditCity(null); }} className="px-4 py-2 bg-slate-800 text-slate-300 text-[10px] font-mono font-bold rounded-lg">Cancel</button>
              <button onClick={handleEditCity} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── City Summary Bar ──
const CitySummaryBar: React.FC<{ city: CityData; liveCongestion: number }> = ({ city, liveCongestion }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
    <MiniStat label="Zones" value={city.zoneCount} icon={<MapPin className="w-3.5 h-3.5 text-cyan-400" />} />
    <MiniStat label="Junctions" value={city.junctionCount} icon={<Signal className="w-3.5 h-3.5 text-emerald-400" />} />
    <MiniStat label="Sensors" value={city.sensorCount} icon={<Wifi className="w-3.5 h-3.5 text-amber-400" />} />
    <MiniStat label="Cameras" value={city.cameraCount} icon={<Camera className="w-3.5 h-3.5 text-purple-400" />} />
    <MiniStat label="Adaptive" value={city.adaptiveSignals} icon={<Zap className="w-3.5 h-3.5 text-emerald-400" />} />
    <MiniStat label="Vehicles" value={city.dailyVehicles.toLocaleString()} icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />} />
    <MiniStat label="Congestion" value={`${liveCongestion}%`} icon={<AlertTriangle className={`w-3.5 h-3.5 ${liveCongestion > 80 ? 'text-red-400' : 'text-amber-400'}`} />} />
    <MiniStat label="Avg Speed" value={`${city.avgSpeed} km/h`} icon={<TrendingUp className="w-3.5 h-3.5 text-cyan-400" />} />
  </div>
);

// ── Mini Stat Card ──
const MiniStat: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-2">
    {icon}
    <div>
      <p className="text-[9px] text-slate-500 font-mono uppercase">{label}</p>
      <p className="text-xs font-black text-slate-100 font-mono">{value}</p>
    </div>
  </div>
);

// ── Metric Cell (for city card grid) ──
const MetricCell: React.FC<{ label: string; value: string | number; accent: string }> = ({ label, value, accent }) => (
  <div className="bg-slate-950 px-4 py-2">
    <p className="text-[8px] text-slate-500 font-mono uppercase">{label}</p>
    <p className={`text-xs font-black text-${accent}-400 font-mono`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
  </div>
);
