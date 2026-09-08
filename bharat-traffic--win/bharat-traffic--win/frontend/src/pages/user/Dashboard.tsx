import React, { useEffect, useState } from 'react';
import { trafficService } from '../../services/api';
import type { RouteOption, Incident, TrafficPrediction } from '../../types/traffic';
import { KpiCard } from '../../components/KpiCard';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { MapContainer } from '../../components/common/MapContainer';
import { LoadingState } from '../../components/LoadingState';
import { useApp } from '../../context/AppContext';
import { CITIES } from '../../data/cityData';
import { Link } from 'react-router-dom';
import {
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  Sparkles,
  Leaf,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Gauge,
  Car,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const UserDashboard: React.FC = () => {
  const { selectedCity } = useApp();
  const cityConfig = CITIES[selectedCity] || CITIES['Bengaluru'];

  const [currentLocation, setCurrentLocation] = useState(cityConfig.defaultOrigin);
  const [destination, setDestination] = useState(cityConfig.defaultDestination);
  const [recommendedRoute, setRecommendedRoute] = useState<RouteOption | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [predictions, setPredictions] = useState<TrafficPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync telemetry and routes whenever selectedCity changes
  useEffect(() => {
    setCurrentLocation(cityConfig.defaultOrigin);
    setDestination(cityConfig.defaultDestination);
    setLoading(true);

    const formattedRoutes: RouteOption[] = (cityConfig.routes || []).map((r) => ({
      id: r.id,
      name: r.name,
      origin: cityConfig.defaultOrigin,
      destination: cityConfig.defaultDestination,
      viaRoads: (r.summary || '').split(' → '),
      distanceKm: r.distanceKm,
      durationMin: r.durationMin,
      normalDurationMin: r.standardDurationMin,
      timeSavedMin: r.timeSavedMin,
      co2EmissionsKg: r.co2Kg,
      congestionLevel: r.congestionLevel,
      isRecommended: r.isRecommended,
      coordinates: r.coordinates,
    }));

    setRecommendedRoute(formattedRoutes[0] || null);

    // Safety timer: render with mock data after 3s even if API is CORS-blocked
    const safetyTimer = setTimeout(() => setLoading(false), 3000);

    Promise.all([
      trafficService.getIncidents(),
      trafficService.getPredictions(),
    ]).then(([incs, preds]) => {
      clearTimeout(safetyTimer);
      setIncidents(incs || []);
      setPredictions((preds || []).slice(0, 8));
      setLoading(false);
    }).catch(() => {
      clearTimeout(safetyTimer);
      setLoading(false);
    });
  }, [selectedCity, cityConfig]);

  if (loading) {
    return <LoadingState message={`Connecting to ${selectedCity} Traffic Intelligence Feed...`} />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner: Current Location & Destination */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-cyan-500/20 p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1.5 w-max font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              AI Commute Avoidance Engine ({selectedCity.toUpperCase()})
            </span>
            <Badge color="emerald" dot>Live Sync</Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            How can I avoid traffic in {selectedCity} today?
          </h2>
          {/* Location & Destination Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono pt-1">
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">From:</span>
              <span className="font-semibold text-slate-100">{currentLocation}</span>
            </div>
            <span className="text-cyan-400 font-bold">→</span>
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">To:</span>
              <span className="font-semibold text-slate-100">{destination}</span>
            </div>
          </div>
        </div>

        <Link to="/user/routes">
          <Button variant="primary" size="md" leftIcon={<Navigation className="w-4 h-4" />}>
            Plan Custom Route
          </Button>
        </Link>
      </div>

      {/* 2. KPI Telemetry Matrix (ETA, Traffic Condition, Time Saved, Carbon Saved) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Recommended Route ETA"
          value={`${recommendedRoute?.durationMin || 38} mins`}
          subtitle={`Saves ${recommendedRoute?.timeSavedMin || 17} mins vs normal route`}
          trend="up"
          icon={Clock}
          color="emerald"
        />
        <KpiCard
          title="Live Traffic Condition"
          value="Moderate (68%)"
          subtitle={`Active monitoring across ${selectedCity}`}
          trend="down"
          icon={ShieldCheck}
          color="cyan"
        />
        <KpiCard
          title="Optimal Departure Window"
          value="10:15 - 11:30 AM"
          subtitle="Avoid Morning Peak Hours"
          trend="neutral"
          icon={TrendingUp}
          color="amber"
        />
        <KpiCard
          title="Weekly Carbon Saved"
          value="8.4 kg CO2"
          subtitle="Eco-routing selection active"
          trend="up"
          icon={Leaf}
          color="purple"
        />
      </div>

      {/* 3. Main Split Grid: Recommended Route + MapLibre Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Route Card */}
        <Card
          variant="command"
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
                  Top Recommended Bypass Route ({selectedCity})
                </h3>
              </div>
              <Badge color="emerald" dot>AI Top Pick</Badge>
            </div>
          }
          footer={
            <Link to="/user/routes" className="w-full">
              <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View Full Route Turn-By-Turn
              </Button>
            </Link>
          }
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-bold text-slate-100">
                {recommendedRoute?.name || 'Smart Dynamic Bypass (AI Recommended)'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Via: {(recommendedRoute?.viaRoads || []).join(' → ')}
              </p>
            </div>

            {/* Travel Summary Metrics */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Trip Distance:</span>
                <span className="font-bold text-slate-100">{recommendedRoute?.distanceKm || 18.4} km</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Estimated Time (ETA):</span>
                <span className="font-bold text-emerald-400">{recommendedRoute?.durationMin || 38} mins</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Standard Traffic Route:</span>
                <span className="font-bold text-red-400">{recommendedRoute?.normalDurationMin || 55} mins</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1 text-purple-300">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  CO2 Emissions:
                </span>
                <span className="font-bold text-purple-300">{recommendedRoute?.co2EmissionsKg || 2.1} kg</span>
              </div>
            </div>

            {/* Traffic Condition Status */}
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
              <span className="text-slate-300">Corridor Traffic Condition:</span>
              <Badge color="emerald">Clear & Smooth Flow</Badge>
            </div>
          </div>
        </Card>

        {/* Interactive MapLibre GL Panel + Live Traffic Feed Underneath */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col h-[460px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                Live Route Geometry & Junction Overlay ({selectedCity})
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">
                MapLibre GL Active
              </span>
            </div>
            <div className="flex-1">
              <MapContainer routes={recommendedRoute ? [recommendedRoute] : []} />
            </div>
          </div>

          {/* ── LIVE REAL TRAFFIC CORRIDOR INTELLIGENCE TABLE UNDER MAP ── */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Real-Time {selectedCity} Corridor Traffic Feed
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Live telemetry from IoT sensors & digital twin traffic monitors across major {selectedCity} arteries.
                </p>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                SENSORS LIVE
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-3">Corridor / Road Segment</th>
                    <th className="py-2 px-3">Current Speed</th>
                    <th className="py-2 px-3">Density</th>
                    <th className="py-2 px-3">Congestion</th>
                    <th className="py-2 px-3">Traffic Status</th>
                    <th className="py-2 px-3">Active Telemetry</th>
                  </tr>
                </thead>
                <tbody>
                  {(cityConfig?.roadsGeoJSON?.features ?? []).map((f) => (
                    <tr key={f.properties.id} className="border-b border-slate-800/60 hover:bg-slate-950/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-2">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{f.properties.name}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-cyan-400">{f.properties.avgSpeedKmh} km/h</td>
                      <td className="py-2.5 px-3 text-slate-300">{f.properties.densityVehKm} v/km</td>
                      <td className="py-2.5 px-3 font-bold" style={{ color: f.properties.congestion > 70 ? '#ef4444' : f.properties.congestion > 40 ? '#eab308' : '#22c55e' }}>
                        {f.properties.congestion}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          f.properties.roadStatus === 'Gridlock' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          f.properties.roadStatus === 'Heavy Congestion' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          f.properties.roadStatus === 'Slow Traffic' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {f.properties.roadStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {(cityConfig.vehicles || []).length > 0 ? (
                            (cityConfig.vehicles || []).map((v) => (
                              <span key={v.id} className="text-sm" title={`${v.name} (${v.status})`}>
                                {v.type === 'ambulance' ? '🚑' : v.type === 'city_bus' ? '🚌' : '🚘'}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              <Car className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                              Active Monitoring
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: Traffic Alerts + Traffic Prediction Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Traffic Alerts */}
        <Card
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Live Traffic Alerts & Road Hazards ({incidents.length})
                </h3>
              </div>
              <Link to="/user/alerts" className="text-[11px] text-cyan-400 hover:underline font-mono">
                View All Alerts →
              </Link>
            </div>
          }
        >
          <div className="space-y-3">
            {(incidents || []).slice(0, 3).map((inc) => (
              <div
                key={inc.id}
                className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge color={inc.severity === 'critical' ? 'red' : 'amber'} size="sm">
                      {inc.type}
                    </Badge>
                    <span className="text-xs font-bold text-slate-200">{inc.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{inc.locationName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-amber-400 block">
                    +{inc.estimatedDelayMin} min delay
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{inc.reportedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Traffic Prediction Trend */}
        <Card
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Hourly Traffic Congestion Forecast ({selectedCity})
                </h3>
              </div>
              <Link to="/user/predictions" className="text-[11px] text-cyan-400 hover:underline font-mono">
                Full Forecast →
              </Link>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              AI predicted congestion curve (%) for your {selectedCity} corridor over the next 8 hours:
            </p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictions}>
                  <defs>
                    <linearGradient id="userPredColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="predictedCongestion" stroke="#a855f7" fillOpacity={1} fill="url(#userPredColor)" name="Congestion Index" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Travel Summary Footer Card */}
      <Card variant="bordered">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Monthly Commute Summary ({selectedCity})</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                By choosing AI bypass routes in {selectedCity}, you saved 3.2 hours of drive time and 8.4 kg CO2 this month.
              </p>
            </div>
          </div>
          <Link to="/user/trips">
            <Button variant="secondary" size="sm">
              View All Trip History
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
