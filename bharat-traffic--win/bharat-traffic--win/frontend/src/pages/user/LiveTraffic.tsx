import React, { useEffect, useState, useMemo } from 'react';
import { trafficService } from '../../services/api';
import type { Incident } from '../../types/traffic';
import { useRealtime } from '../../context/RealtimeContext';
import { getSyntheticTrafficData } from '../../services/syntheticTrafficProvider';
import type { SyntheticTrafficData } from '../../types/synthetic';
import type { RoadSegmentProperties } from '../../data/mockGeoJSON';
import { MapContainer } from '../../components/common/MapContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import {
  Map,
  Gauge,
  Activity,
  AlertTriangle,
  Car,
  Search,
  Info,
  X,
  Navigation,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const UserLiveTraffic: React.FC = () => {
  const { wsConnected, wsMode } = useRealtime();
  const { selectedCity } = useApp();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedRoad, setSelectedRoad] = useState<RoadSegmentProperties | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate synthetic traffic data for the current city (deterministic per city)
  const synthData: SyntheticTrafficData = useMemo(
    () => getSyntheticTrafficData(selectedCity),
    [selectedCity]
  );

  // Reset selected road when city changes
  useEffect(() => {
    setSelectedRoad(null);
  }, [selectedCity]);

  useEffect(() => {
    trafficService.getIncidents().then(setIncidents);
  }, []);

  // Merge synthetic incidents with API incidents for display
  const allIncidents: Incident[] = useMemo(() => {
    const syntheticIncidents: Incident[] = synthData.incidents.map((inc) => ({
      id: inc.id,
      title: inc.title,
      locationName: inc.locationName,
      lat: inc.lat,
      lng: inc.lng,
      severity: inc.severity,
      type: inc.type,
      status: 'reported' as const,
      reportedAt: inc.reportedAt,
      description: `${inc.title} at ${inc.locationName}`,
      impactedLanes: inc.severity === 'critical' ? 3 : inc.severity === 'high' ? 2 : 1,
      estimatedDelayMin: inc.estimatedDelayMin,
    }));
    // Combine, avoiding duplicates by id
    const existingIds = new Set(syntheticIncidents.map((i) => i.id));
    const apiIncidents = incidents.filter((i) => !existingIds.has(i.id));
    return [...syntheticIncidents, ...apiIncidents];
  }, [synthData, incidents]);

  // Convert synthetic roads to RoadSegmentProperties for the road list
  const roadList: RoadSegmentProperties[] = useMemo(() => {
    return synthData.roads.map((r) => ({
      id: r.id,
      name: r.roadName,
      corridor: `${selectedCity} Arterial`,
      congestion: r.congestion,
      avgSpeedKmh: r.speed,
      densityVehKm: Math.round(r.vehicleCount * 0.6),
      roadStatus: r.congestion > 70 ? 'Gridlock' as const : r.congestion > 40 ? 'Heavy Congestion' as const : r.congestion > 20 ? 'Slow Traffic' as const : 'Clear' as const,
      incidentCount: 0,
      laneCount: 3,
      lengthKm: Math.round(r.coordinates.length * 1.2),
      lastUpdated: 'SYNTHETIC',
    }));
  }, [synthData, selectedCity]);

  const filteredRoads = roadList.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.corridor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 h-[calc(100vh-5.5rem)] flex flex-col">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-100 font-mono flex items-center gap-2">
              <Map className="w-5 h-5 text-cyan-400" />
              Live City Traffic Map & GIS Telemetry
            </h2>
            <Badge color="cyan" dot>
              GeoJSON Vector Layer
            </Badge>
            <Badge color="amber" dot>
              SYNTHETIC DEMO
            </Badge>
            <Badge color={wsConnected ? 'emerald' : 'amber'} dot>
              {wsMode === 'websocket' ? 'Live WS' : wsMode === 'rest' ? 'REST Poll' : 'Offline'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspect {selectedCity} synthetic traffic density, average speeds, road congestion indices, and active hazards. Click any road segment to view telemetry.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search road or corridor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Main Grid View: MapLibre Map (3 cols) + Inspector Panel (1 col) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* MapLibre GeoJSON Container */}
        <div className="lg:col-span-3 h-full relative">
          <MapContainer
            roadGeoJSON={synthData.roadsGeoJSON as any}
            incidents={allIncidents}
            cameras={synthData.cameras}
            sensors={synthData.sensors}
            busStops={synthData.busStops}
            metroStations={synthData.metroStations}
            onRoadClick={(road) => setSelectedRoad(road)}
            selectedRoadId={selectedRoad?.id}
          />
        </div>

        {/* Right Side Inspector & Segment List */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Synthetic Stats Card */}
          <Card
            variant="command"
            header={
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  {selectedCity} Stats
                </span>
                <span className="text-[9px] text-amber-500/80 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">SYNTHETIC</span>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400">Avg Speed</span>
                <span className="text-sm font-bold text-slate-100">{synthData.stats.avgSpeedKmh} km/h</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400">Congestion</span>
                <span className={`text-sm font-bold ${synthData.stats.congestionIndex > 70 ? 'text-red-400' : synthData.stats.congestionIndex > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {synthData.stats.congestionIndex}%
                </span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400">Cameras</span>
                <span className="text-sm font-bold text-blue-400">{synthData.stats.totalCameras}</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400">Sensors</span>
                <span className="text-sm font-bold text-purple-400">{synthData.stats.totalSensors}</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400">Incidents</span>
                <span className="text-sm font-bold text-red-400">{synthData.stats.totalIncidents}</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400">Junctions</span>
                <span className="text-sm font-bold text-cyan-400">{synthData.stats.totalJunctions}</span>
              </div>
            </div>
          </Card>

          {/* Selected Road Telemetry Inspector Card */}
          {selectedRoad ? (
            <Card
              variant="command"
              header={
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Road Segment Inspector
                  </span>
                  <button
                    onClick={() => setSelectedRoad(null)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              }
            >
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{selectedRoad.name}</h4>
                  <p className="text-[11px] text-slate-400">{selectedRoad.corridor}</p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Road Status:</span>
                  <Badge
                    color={
                      selectedRoad.roadStatus === 'Gridlock'
                        ? 'red'
                        : selectedRoad.roadStatus === 'Heavy Congestion'
                        ? 'red'
                        : selectedRoad.roadStatus === 'Slow Traffic'
                        ? 'amber'
                        : 'emerald'
                    }
                    dot
                  >
                    {selectedRoad.roadStatus}
                  </Badge>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      Avg Speed
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {selectedRoad.avgSpeedKmh} km/h
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Car className="w-3 h-3 text-emerald-400" />
                      Traffic Density
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {selectedRoad.densityVehKm} veh/km
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-amber-400" />
                      Congestion
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        selectedRoad.congestion > 70
                          ? 'text-red-400'
                          : selectedRoad.congestion > 40
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedRoad.congestion}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      Incidents
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {selectedRoad.incidentCount} Active
                    </span>
                  </div>
                </div>

                {/* Data Source */}
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-[10px] font-bold text-center">
                  Data Source: SYNTHETIC DEMO
                </div>

                {/* Bypass Action Button */}
                <Link to="/user/routes" className="block pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    leftIcon={<Navigation className="w-3.5 h-3.5" />}
                  >
                    Bypass This Segment
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="p-6 border border-slate-800 rounded-2xl bg-slate-900/60 text-center space-y-2">
              <Info className="w-6 h-6 text-cyan-400 mx-auto" />
              <p className="text-xs text-slate-300 font-mono">
                Click any colored road line on the map to inspect live speed, density, and congestion.
              </p>
            </div>
          )}

          {/* Road Segment List Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col flex-1 overflow-hidden">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono pb-2 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span>Arterial Road Network</span>
              <span className="text-[10px] text-cyan-400">{filteredRoads.length} Segments</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 mt-2.5 pr-1">
              {filteredRoads.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoad(r)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedRoad?.id === r.id
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{r.name}</h4>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        r.congestion > 70
                          ? 'bg-red-500/20 text-red-400'
                          : r.congestion > 40
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {r.congestion}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Speed: <strong className="text-slate-200">{r.avgSpeedKmh} km/h</strong></span>
                    <span>Density: <strong className="text-slate-200">{r.densityVehKm} v/km</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
