import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { RouteOption } from '../../types/traffic';
import type { TrafficFlowGeoJSON } from '../../services/hereTrafficApi';
import { MapContainer } from '../../components/common/MapContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useApp } from '../../context/AppContext';
import { CITIES } from '../../data/cityData';
import { generateRoutes, routeScore } from '../../utils/routeGenerator';
import { mapSearchService, type SearchResult } from '../../services/mapApi';
import { fetchHereRoutes, fetchTrafficFlow, expandBounds, boundsFromCoordinates } from '../../services/hereTrafficApi';
import {
  Navigation,
  MapPin,
  Sparkles,
  Car,
  Bike,
  Bus,
  Zap,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react';

export const UserRoutePlanner: React.FC = () => {
  const { selectedCity } = useApp();
  const cityConfig = CITIES[selectedCity] || CITIES['Bengaluru'];

  const [fromLocation, setFromLocation] = useState(cityConfig.defaultOrigin);
  const [toLocation, setToLocation] = useState(cityConfig.defaultDestination);
  const [travelMode, setTravelMode] = useState<'car' | 'bike' | 'transit'>('car');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [routingSource, setRoutingSource] = useState<'here' | 'osrm' | 'mock' | null>(null);
  const [trafficFlow, setTrafficFlow] = useState<TrafficFlowGeoJSON | null>(null);
  const [trafficSource, setTrafficSource] = useState<string | null>(null);
  const flowTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Autocomplete state for From/To search fields
  const [fromSuggestions, setFromSuggestions] = useState<SearchResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<SearchResult[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const fromTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Generate routes from geocoded locations ────────────────────────
  const calculateRoutes = useCallback(
    async (origin: string, destination: string) => {
      setGeocodingError(null);
      setCalculating(true);

      try {
        // Geocode origin
        const originResults = await mapSearchService.searchLocations(origin, selectedCity);
        if (originResults.length === 0) {
          setGeocodingError(`Could not find location: "${origin}". Try a more specific name.`);
          setCalculating(false);
          return;
        }

        // Geocode destination
        const destResults = await mapSearchService.searchLocations(destination, selectedCity);
        if (destResults.length === 0) {
          setGeocodingError(`Could not find location: "${destination}". Try a more specific name.`);
          setCalculating(false);
          return;
        }

        const originCoords: [number, number] = [
          parseFloat(originResults[0].lon),
          parseFloat(originResults[0].lat),
        ];
        const destCoords: [number, number] = [
          parseFloat(destResults[0].lon),
          parseFloat(destResults[0].lat),
        ];

        // Route via HERE (backend proxy) → OSRM → mock fallback
        let generated: Awaited<ReturnType<typeof generateRoutes>>;
        let source: 'here' | 'osrm' | 'mock' = 'mock';
        try {
          // Attempt HERE routing via backend
          const result = await fetchHereRoutes({
            originLat: originCoords[1],
            originLng: originCoords[0],
            destLat: destCoords[1],
            destLng: destCoords[0],
            originName: origin,
            destinationName: destination,
          });
          generated = result.routes;
          source = 'here';
        } catch {
          // HERE unavailable — try OSRM
          try {
            const { fetchOSRMRoutes } = await import('../../services/routingApi');
            generated = await fetchOSRMRoutes({
              origin: originCoords,
              destination: destCoords,
              originName: origin,
              destinationName: destination,
              city: selectedCity,
            });
            source = 'osrm';
          } catch {
            // Both unavailable — use mock fallback
            generated = await generateRoutes({
              origin: originCoords,
              destination: destCoords,
              originName: origin,
              destinationName: destination,
              city: selectedCity,
            });
            source = 'mock';
          }
        }
        setRoutingSource(source);

        // Fetch HERE traffic flow for the route corridor
        try {
          const allCoords = generated.flatMap((r) => r.coordinates);
          if (allCoords.length > 0) {
            const bounds = boundsFromCoordinates(allCoords);
            if (bounds) {
              const expanded = expandBounds(bounds, 0.3);
              const flow = await fetchTrafficFlow(expanded);
              setTrafficFlow(flow);
              setTrafficSource(flow.meta.source);
            }
          }
        } catch {
          // Traffic flow fetch failed — show routes only
          setTrafficFlow(null);
        }

        // Find best route (lowest score = best ETA + congestion combo)
        let bestIdx = 0;
        let bestScore = Infinity;
        generated.forEach((r, i) => {
          const s = routeScore(r);
          if (s < bestScore) {
            bestScore = s;
            bestIdx = i;
          }
        });

        // Mark the best route
        const finalRoutes = generated.map((r, i) => ({
          ...r,
          isRecommended: i === bestIdx,
        }));

        setRoutes(finalRoutes);
        setSelectedRoute(finalRoutes[bestIdx]);
      } catch {
        setGeocodingError('Something went wrong. Please try again.');
      } finally {
        setCalculating(false);
      }
    },
    [selectedCity],
  );

  // ── Sync defaults when city changes ────────────────────────────────
  useEffect(() => {
    setFromLocation(cityConfig.defaultOrigin);
    setToLocation(cityConfig.defaultDestination);
    setTrafficFlow(null);
    setTrafficSource(null);
    // Auto-calculate for the new city's defaults
    calculateRoutes(cityConfig.defaultOrigin, cityConfig.defaultDestination);
  }, [selectedCity, cityConfig, calculateRoutes]);

  // ── Periodic traffic flow refresh (every 60 seconds) ──────────────
  useEffect(() => {
    const refreshTrafficFlow = async () => {
      if (!selectedRoute?.coordinates || selectedRoute.coordinates.length < 2) return;
      try {
        const bounds = boundsFromCoordinates(selectedRoute.coordinates);
        if (bounds) {
          const expanded = expandBounds(bounds, 0.3);
          const flow = await fetchTrafficFlow(expanded);
          setTrafficFlow(flow);
          setTrafficSource(flow.meta.source);
        }
      } catch {
        // Silently ignore refresh failures
      }
    };

    flowTimerRef.current = setInterval(refreshTrafficFlow, 60000);
    return () => {
      if (flowTimerRef.current) clearInterval(flowTimerRef.current);
    };
  }, [selectedRoute?.id]);

  // ── Autocomplete search for From field ────────────────────────────
  useEffect(() => {
    if (!fromLocation || fromLocation.trim().length < 2) {
      setFromSuggestions([]);
      return;
    }
    if (fromTimerRef.current) clearTimeout(fromTimerRef.current);
    fromTimerRef.current = setTimeout(async () => {
      const results = await mapSearchService.searchLocations(fromLocation, selectedCity);
      setFromSuggestions(results);
      setShowFromSuggestions(results.length > 0);
    }, 350);
    return () => { if (fromTimerRef.current) clearTimeout(fromTimerRef.current); };
  }, [fromLocation, selectedCity]);

  // ── Autocomplete search for To field ────────────────────────────
  useEffect(() => {
    if (!toLocation || toLocation.trim().length < 2) {
      setToSuggestions([]);
      return;
    }
    if (toTimerRef.current) clearTimeout(toTimerRef.current);
    toTimerRef.current = setTimeout(async () => {
      const results = await mapSearchService.searchLocations(toLocation, selectedCity);
      setToSuggestions(results);
      setShowToSuggestions(results.length > 0);
    }, 350);
    return () => { if (toTimerRef.current) clearTimeout(toTimerRef.current); };
  }, [toLocation, selectedCity]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) setShowFromSuggestions(false);
      if (toRef.current && !toRef.current.contains(e.target as Node)) setShowToSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Handle form submit ─────────────────────────────────────────────
  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocation.trim() || !toLocation.trim()) return;
    await calculateRoutes(fromLocation.trim(), toLocation.trim());
  };

  const recommendedRoute = routes.find((r) => r.isRecommended) || routes[0] || null;
  const alternativeRoutes = routes.filter((r) => !r.isRecommended);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-extrabold text-slate-100 font-mono flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-400" />
            Smart Route Planner & Traffic Avoidance ({selectedCity.toUpperCase()})
          </h2>
          <Badge color="cyan" dot>
            AI ROUTING MATRIX
          </Badge>
          {routingSource && (
            <Badge color={routingSource === 'here' ? 'emerald' : routingSource === 'osrm' ? 'cyan' : 'amber'}>
              {routingSource === 'here' ? '● REAL TRAFFIC / HERE' : routingSource === 'osrm' ? '● OSRM LIVE ROUTING' : '● DEMO / SYNTHETIC'}
            </Badge>
          )}
          {trafficSource && trafficSource === 'HERE' && (
            <Badge color="emerald" dot>
              REAL TRAFFIC DATA
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Enter starting location and destination in {selectedCity} to compare traffic-aware routes, distance, ETA, and time saved.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs & Route Options Cards */}
        <div className="space-y-4">
          {/* 1. From / To Inputs Form */}
          <Card
            header={
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200 uppercase">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Calculate Journey Route ({selectedCity})</span>
              </div>
            }
          >
            <form onSubmit={handleCalculate} className="space-y-3.5">
              <div ref={fromRef} className="relative">
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  From (Starting Location)
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    onFocus={() => fromSuggestions.length > 0 && setShowFromSuggestions(true)}
                    placeholder="e.g. Koramangala 5th Block, Bengaluru"
                    className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                  {fromLocation && (
                    <button type="button" onClick={() => { setFromLocation(''); setFromSuggestions([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30 max-h-40 overflow-y-auto font-mono text-xs">
                    {fromSuggestions.map((res) => (
                      <div
                        key={res.place_id}
                        onClick={() => { setFromLocation(res.display_name); setFromSuggestions([]); setShowFromSuggestions(false); }}
                        className="p-2.5 hover:bg-cyan-500/20 cursor-pointer border-b border-slate-800/60 text-slate-200 flex items-start gap-2 text-[11px] last:border-b-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{res.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div ref={toRef} className="relative">
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  To (Destination Location)
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    onFocus={() => toSuggestions.length > 0 && setShowToSuggestions(true)}
                    placeholder="e.g. Whitefield ITPL, Bengaluru"
                    className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                  {toLocation && (
                    <button type="button" onClick={() => { setToLocation(''); setToSuggestions([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30 max-h-40 overflow-y-auto font-mono text-xs">
                    {toSuggestions.map((res) => (
                      <div
                        key={res.place_id}
                        onClick={() => { setToLocation(res.display_name); setToSuggestions([]); setShowToSuggestions(false); }}
                        className="p-2.5 hover:bg-cyan-500/20 cursor-pointer border-b border-slate-800/60 text-slate-200 flex items-start gap-2 text-[11px] last:border-b-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{res.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geocoding Error */}
              {geocodingError && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[11px] font-mono">
                  {geocodingError}
                </div>
              )}

              {/* Mode Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block font-mono">
                  Travel Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTravelMode('car')}
                    className={`py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all ${
                      travelMode === 'car'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    Car
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('bike')}
                    className={`py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all ${
                      travelMode === 'bike'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    Two Wheeler
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('transit')}
                    className={`py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all ${
                      travelMode === 'transit'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Bus className="w-3.5 h-3.5" />
                    Transit
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={calculating}
                className="w-full"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Calculate Traffic-Free Route
              </Button>
            </form>
          </Card>

          {/* 2. Recommended Route Section */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-2">
              Recommended Route ({selectedCity})
            </span>
            {recommendedRoute && (
              <div
                onClick={() => setSelectedRoute(recommendedRoute)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedRoute?.id === recommendedRoute.id
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-xl shadow-cyan-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100">{recommendedRoute.name}</h4>
                  </div>
                  <Badge color="emerald" dot size="sm">
                    AI Top Pick
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Via: {(recommendedRoute?.viaRoads || []).join(' → ')}
                </p>

                {/* Key Metrics: Distance, ETA, Traffic Condition, Time Saved */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div className="p-2 bg-slate-950 rounded-lg">
                    <span className="text-slate-400 text-[10px]">Distance & ETA:</span>
                    <div className="font-bold text-cyan-400">
                      {recommendedRoute.distanceKm} km • {recommendedRoute.durationMin} mins
                    </div>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg">
                    <span className="text-slate-400 text-[10px]">Traffic Condition:</span>
                    <div className={`font-bold capitalize ${
                      recommendedRoute.congestionLevel === 'clear'
                        ? 'text-emerald-400'
                        : recommendedRoute.congestionLevel === 'moderate'
                        ? 'text-amber-400'
                        : recommendedRoute.congestionLevel === 'heavy'
                        ? 'text-orange-400'
                        : 'text-red-400'
                    }`}>
                      {recommendedRoute.congestionLevel === 'clear'
                        ? 'Clear Flow'
                        : recommendedRoute.congestionLevel === 'moderate'
                        ? 'Moderate Traffic'
                        : recommendedRoute.congestionLevel === 'heavy'
                        ? 'Heavy Congestion'
                        : 'Severe Gridlock'}
                    </div>
                  </div>
                </div>

                {recommendedRoute.timeSavedMin > 0 && (
                  <div className="mt-2.5 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Time Saved vs Normal Route:
                    </span>
                    <span>+{recommendedRoute.timeSavedMin} mins</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Alternative Routes Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
              Alternative Routes ({alternativeRoutes.length})
            </span>
            {alternativeRoutes.map((rt) => (
              <div
                key={rt.id}
                onClick={() => setSelectedRoute(rt)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedRoute?.id === rt.id
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200">{rt.name}</h4>
                  <Badge
                    color={
                      rt.congestionLevel === 'severe'
                        ? 'red'
                        : rt.congestionLevel === 'heavy'
                        ? 'amber'
                        : rt.congestionLevel === 'moderate'
                        ? 'amber'
                        : 'cyan'
                    }
                    size="sm"
                  >
                    {rt.congestionLevel}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Via: {(rt?.viaRoads || []).join(', ')}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Distance: <strong className="text-slate-200">{rt.distanceKm} km</strong></span>
                  <span className="text-slate-400">ETA: <strong className="text-slate-200">{rt.durationMin} mins</strong></span>
                </div>

                {rt.timeSavedMin > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <Zap className="w-3 h-3" />
                    +{rt.timeSavedMin} mins saved
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: MapLibre Polyline Display & Details */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          {/* Selected Route Summary Banner */}
          {selectedRoute && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  Currently Viewing Route Geometry ({selectedCity})
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">{selectedRoute.name}</h3>
                  {selectedRoute.isRecommended && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Duration</span>
                  <span className="font-bold text-cyan-400">{selectedRoute.durationMin} mins</span>
                </div>
                <div className="h-6 w-[1px] bg-slate-800" />
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Distance</span>
                  <span className="font-bold text-slate-200">{selectedRoute.distanceKm} km</span>
                </div>
                <div className="h-6 w-[1px] bg-slate-800" />
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Traffic</span>
                  <span className={`font-bold capitalize ${
                    selectedRoute.congestionLevel === 'clear'
                      ? 'text-emerald-400'
                      : selectedRoute.congestionLevel === 'moderate'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {selectedRoute.congestionLevel}
                  </span>
                </div>
                {selectedRoute.timeSavedMin > 0 && (
                  <>
                    <div className="h-6 w-[1px] bg-slate-800" />
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Time Saved</span>
                      <span className="font-bold text-emerald-400">+{selectedRoute.timeSavedMin} mins</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* MapLibre Container — isolated from admin overlays */}
          <div className="flex-1 min-h-[440px]">
            <MapContainer
              routes={routes}
              selectedRouteId={selectedRoute?.id ?? null}
              trafficFlowGeoJSON={trafficFlow}
              hideAdminOverlays
            />
          </div>
        </div>
      </div>
    </div>
  );
};
