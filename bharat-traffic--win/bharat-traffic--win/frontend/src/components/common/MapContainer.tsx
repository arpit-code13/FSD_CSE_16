import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Junction, Incident, RouteOption, DigitalTwinNode } from '../../types/traffic';
import type { RoadGeoJSONCollection, RoadSegmentProperties } from '../../data/mockGeoJSON';
import type { SyntheticCamera, SyntheticSensor, SyntheticBusStop, SyntheticMetroStation } from '../../types/synthetic';
import type { TrafficFlowGeoJSON } from '../../services/hereTrafficApi';
import { CITIES } from '../../data/cityData';
import { mapSearchService, type SearchResult } from '../../services/mapApi';
import { useApp } from '../../context/AppContext';
import { GoogleTrafficMap } from './GoogleTrafficMap';
import {
  Layers,
  Search,
  MapPin,
  X,
  Globe,
  ChevronDown,
  Zap,
} from 'lucide-react';

interface GreenCorridor {
  id: string;
  vehicleType: string;
  vehicleCallsign: string;
  title: string;
  currentLat: number;
  currentLng: number;
  destLat: number;
  destLng: number;
  etaMin: number;
  status: string;
  coordinates: [number, number][];
}

interface MapProps {
  junctions?: Junction[];
  incidents?: Incident[];
  digitalTwinNodes?: DigitalTwinNode[];
  routes?: RouteOption[];
  roadGeoJSON?: RoadGeoJSONCollection;
  greenCorridors?: GreenCorridor[];
  selectedRoadId?: string | null;
  selectedJunctionId?: string | null;
  selectedRouteId?: string | null;
  onRoadClick?: (road: RoadSegmentProperties) => void;
  onJunctionClick?: (junction: Junction) => void;
  onTrafficFlowClick?: (props: { speed: number; freeFlowSpeed: number; jamFactor: number; confidence: number; trafficLevel: string; roadName: string; updated: string; source: string; lat: number; lng: number }) => void;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  interactive?: boolean;
  /** Hide admin-specific overlays (junctions, vehicles, cameras, sensors, transit) for user-only maps */
  hideAdminOverlays?: boolean;
  /** Real-time traffic flow GeoJSON from HERE Traffic v7 (or synthetic fallback) */
  trafficFlowGeoJSON?: TrafficFlowGeoJSON | null;
  /** Synthetic data objects from SyntheticTrafficProvider */
  cameras?: SyntheticCamera[];
  sensors?: SyntheticSensor[];
  busStops?: SyntheticBusStop[];
  metroStations?: SyntheticMetroStation[];
}

type MapStyleType = 'dark' | 'satellite' | 'traffic' | 'streets' | 'google-traffic' | 'google-satellite-traffic';

// Tile sources
const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ARCGIS_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const GOOGLE_TRAFFIC_TILE = 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}';
const GOOGLE_SATELLITE_TRAFFIC_TILE = 'https://mt1.google.com/vt/lyrs=y,traffic&x={x}&y={y}&z={z}';

export const GOOGLE_TRAFFIC_OVERLAY_TILES = [
  'https://mt0.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
  'https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
  'https://mt2.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
  'https://mt3.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
];

interface MapStyleDef {
  name: string;
  url: string;
  icon: string;
  /** Optional raster paint overrides applied to the base tile layer. */
  paint?: Record<string, unknown>;
}

const MAP_STYLES: Record<MapStyleType, MapStyleDef> = {
  dark: {
    name: 'Command Dark',
    url: import.meta.env.VITE_MAP_DARK_URL || OSM_TILE,
    icon: '🌙',
    paint: {
      'raster-saturation': -0.85,
      'raster-brightness-max': 0.18,
      'raster-contrast': 0.1,
    },
  },
  satellite: {
    name: 'Satellite Aerial',
    url: import.meta.env.VITE_MAP_SATELLITE_URL || ARCGIS_SATELLITE,
    icon: '🛰️',
  },
  traffic: {
    name: 'Traffic Density',
    url: import.meta.env.VITE_MAP_TRAFFIC_URL || OSM_TILE,
    icon: '🚦',
    paint: {
      'raster-saturation': -0.4,
      'raster-brightness-max': 0.65,
    },
  },
  streets: {
    name: 'Standard Streets',
    url: import.meta.env.VITE_MAP_STREETS_URL || OSM_TILE,
    icon: '🏙️',
  },
  'google-traffic': {
    name: 'Google Live Traffic',
    url: GOOGLE_TRAFFIC_TILE,
    icon: '🟢',
  },
  'google-satellite-traffic': {
    name: 'Google Satellite Traffic',
    url: GOOGLE_SATELLITE_TRAFFIC_TILE,
    icon: '🛰️',
  },
};

function buildMapStyle(tileUrl: string, paint?: Record<string, unknown>) {
  const isGoogle = tileUrl.includes('google.com');
  return {
    version: 8 as const,
    sources: {
      'base-tile-src': {
        type: 'raster' as const,
        tiles: [tileUrl],
        tileSize: 256,
        attribution: isGoogle ? '&copy; Google Maps &copy; OpenStreetMap' : '&copy; OpenStreetMap',
      },
    },
    layers: [
      {
        id: 'base-tile-layer',
        type: 'raster' as const,
        source: 'base-tile-src',
        minzoom: 0,
        maxzoom: 20,
        ...(paint || {}),
      },
    ],
  };
}

export const MapContainer: React.FC<MapProps> = ({
  junctions = [],
  incidents = [],
  routes = [],
  roadGeoJSON,
  selectedRouteId,
  greenCorridors = [],
  onRoadClick,
  onJunctionClick,
  onTrafficFlowClick,
  center,
  zoom = 12,
  interactive = true,
  hideAdminOverlays = false,
  trafficFlowGeoJSON,
  cameras = [],
  sensors = [],
  busStops = [],
  metroStations = [],
}) => {
  const { selectedCity, setSelectedCity } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);

  // Persistent marker references to prevent DOM tearing / marker blinking
  const junctionMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement; popup: maplibregl.Popup }>>(new Map());
  const vehicleMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement; popup: maplibregl.Popup }>>(new Map());
  const incidentMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const cameraMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const sensorMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const busStopMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const metroMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const routeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const searchMarkersRef = useRef<maplibregl.Marker[]>([]);
  const trafficFlowRef = useRef<TrafficFlowGeoJSON | null>(trafficFlowGeoJSON ?? null);

  const [currentStyle, setCurrentStyle] = useState<MapStyleType>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [mapEngine, setMapEngine] = useState<'maplibre' | 'google-native'>('maplibre');
  const prevStyleRef = useRef<MapStyleType>(currentStyle);

  // Refs that hold the latest props for use in callbacks without re-creating the map
  const onRoadClickRef = useRef(onRoadClick);
  const onJunctionClickRef = useRef(onJunctionClick);
  const onTrafficFlowClickRef = useRef(onTrafficFlowClick);
  useEffect(() => { onRoadClickRef.current = onRoadClick; }, [onRoadClick]);
  useEffect(() => { onJunctionClickRef.current = onJunctionClick; }, [onJunctionClick]);
  useEffect(() => { onTrafficFlowClickRef.current = onTrafficFlowClick; }, [onTrafficFlowClick]);

  const cityConfig = CITIES[selectedCity] || CITIES['Bengaluru'];
  const activeCenter = center || cityConfig.center;

  // Clear all markers helper
  const clearAllMarkers = () => {
    junctionMarkersRef.current.forEach((item) => item.marker.remove());
    junctionMarkersRef.current.clear();

    vehicleMarkersRef.current.forEach((item) => item.marker.remove());
    vehicleMarkersRef.current.clear();

    incidentMarkersRef.current.forEach((item) => item.marker.remove());
    incidentMarkersRef.current.clear();

    cameraMarkersRef.current.forEach((item) => item.marker.remove());
    cameraMarkersRef.current.clear();

    sensorMarkersRef.current.forEach((item) => item.marker.remove());
    sensorMarkersRef.current.clear();

    busStopMarkersRef.current.forEach((item) => item.marker.remove());
    busStopMarkersRef.current.clear();

    metroMarkersRef.current.forEach((item) => item.marker.remove());
    metroMarkersRef.current.clear();

    routeMarkersRef.current.forEach((m) => m.remove());
    routeMarkersRef.current = [];

    searchMarkersRef.current.forEach((m) => m.remove());
    searchMarkersRef.current = [];
  };

  // Handle Location Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await mapSearchService.searchLocations(searchQuery, selectedCity);
      setSearchResults(results);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCity]);

  // Handle City Change (fly to, don't recreate map)
  const handleCitySelect = useCallback((cityName: string) => {
    setSelectedCity(cityName);
    setShowCityMenu(false);
    const targetCity = CITIES[cityName];
    if (mapRef.current && targetCity) {
      clearAllMarkers();
      mapRef.current.flyTo({
        center: targetCity.center,
        zoom: targetCity.zoom,
        speed: 1.2,
      });
    }
  }, [setSelectedCity]);

  const handleAreaSelect = useCallback((area: { lat: number; lng: number }) => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [area.lng, area.lat], zoom: 14, speed: 1.5 });
    }
  }, []);

  const handleSelectSearchResult = useCallback((res: SearchResult) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    if (!isNaN(lat) && !isNaN(lng) && mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        speed: 1.5,
      });

      const m = new maplibregl.Marker({ color: '#06b6d4' })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup().setHTML(`<b style="color: #0284c7;">${res.display_name}</b>`))
        .addTo(mapRef.current);
      searchMarkersRef.current.push(m);
    }
    setSearchResults([]);
    setSearchQuery('');
  }, []);

  // 1. Initialize Map ONCE per container / currentStyle / selectedCity
  useEffect(() => {
    if (!mapContainerRef.current) return;
    isMapLoadedRef.current = false;
    clearAllMarkers();

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: buildMapStyle(MAP_STYLES[currentStyle].url, MAP_STYLES[currentStyle].paint),
      center: activeCenter,
      zoom,
      interactive,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    // Handle WebGL context loss gracefully — pause rendering, resume when restored
    const canvas = map.getCanvas();
    const onContextLost = (e: Event) => { e.preventDefault(); };
    const onContextRestored = () => { map.resize(); };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    // After the base style loads, add road layers using local city GeoJSON (no external API)
    map.on('load', () => {
      try {
        addGoogleTrafficOverlay(map, showTrafficLayer, currentStyle);
        if (!hideAdminOverlays) {
          const baseGeoJSON = (roadGeoJSON || cityConfig.roadsGeoJSON) as RoadGeoJSONCollection;
          addRoadSource(map, baseGeoJSON, showTrafficLayer);
          addGreenCorridorLayers(map, greenCorridors);
        }
        addRouteLayers(map, routes);
      } catch (e) { console.warn('[MapContainer] load layers error:', e); }
      if (!hideAdminOverlays) {
        addJunctionMarkers(map, junctions.length > 0 ? junctions : cityConfig.junctions, selectedCity);
        addIncidentMarkers(map, incidents);
      }
      isMapLoadedRef.current = true;
    });

    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      isMapLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount once only

  // ── Imperative updates when props change (no map recreation) ──

  // Update tile style — re-add layers after the new style finishes loading
  // Skip the initial render since the map is already created with the correct style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Skip if style hasn't actually changed from the initial value
    if (prevStyleRef.current === currentStyle) return;
    prevStyleRef.current = currentStyle;
    isMapLoadedRef.current = false;
    map.setStyle(buildMapStyle(MAP_STYLES[currentStyle].url, MAP_STYLES[currentStyle].paint));
    // Wait for the new style to load before re-adding custom layers
    const onStyleLoad = () => {
      isMapLoadedRef.current = true;
      addGoogleTrafficOverlay(map, showTrafficLayer, currentStyle);
      if (!hideAdminOverlays) {
        const baseGeoJSON = (roadGeoJSON || cityConfig.roadsGeoJSON) as RoadGeoJSONCollection;
        addRoadSource(map, baseGeoJSON, showTrafficLayer);
      }
      addRouteLayers(map, routes);
    };
    map.once('style.load', onStyleLoad);
    return () => { map.off('style.load', onStyleLoad); };
  }, [currentStyle]);

  // Update road GeoJSON source when data or toggle changes (only if style is stable)
  useEffect(() => {
    if (hideAdminOverlays) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !isMapLoadedRef.current) return;
    const baseGeoJSON = (roadGeoJSON || cityConfig.roadsGeoJSON) as RoadGeoJSONCollection;
    addRoadSource(map, baseGeoJSON, showTrafficLayer);
  }, [roadGeoJSON, showTrafficLayer, cityConfig, hideAdminOverlays]);

  // Update green corridors on map
  useEffect(() => {
    if (hideAdminOverlays) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    addGreenCorridorLayers(map, greenCorridors);
  }, [greenCorridors, hideAdminOverlays]);

  // Update junction markers
  useEffect(() => {
    if (hideAdminOverlays) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !isMapLoadedRef.current) return;
    addJunctionMarkers(map, junctions.length > 0 ? junctions : cityConfig.junctions, selectedCity);
  }, [junctions, cityConfig, selectedCity, hideAdminOverlays]);

  // Update incident markers
  useEffect(() => {
    if (hideAdminOverlays) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !isMapLoadedRef.current) return;
    addIncidentMarkers(map, incidents);
  }, [incidents, hideAdminOverlays]);

  // Update route layers — also auto-fit bounds to show full route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !isMapLoadedRef.current) return;
    addRouteLayers(map, routes);

    // Auto-fit bounds to the selected or recommended route
    if (routes && routes.length > 0) {
      const routeToFit = routes.find((r) => r.id === selectedRouteId) || routes.find((r) => r.isRecommended) || routes[0];
      if (routeToFit?.coordinates && routeToFit.coordinates.length >= 2) {
        const bounds = routeToFit.coordinates.reduce(
          (b, coord) => b.extend(coord as maplibregl.LngLatLike),
          new maplibregl.LngLatBounds(routeToFit.coordinates[0] as maplibregl.LngLatLike, routeToFit.coordinates[0] as maplibregl.LngLatLike),
        );
        map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, maxZoom: 14, duration: 900 });
      }
    }
  }, [routes, selectedRouteId]);

  // Update traffic flow overlay (HERE real-time or synthetic) — works in all modes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !isMapLoadedRef.current) return;
    trafficFlowRef.current = trafficFlowGeoJSON ?? null;
    addTrafficFlowLayer(map, trafficFlowGeoJSON);
  }, [trafficFlowGeoJSON]);

  // Update Google Maps live traffic overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !isMapLoadedRef.current) return;
    addGoogleTrafficOverlay(map, showTrafficLayer, currentStyle);
  }, [showTrafficLayer, currentStyle]);

  // ── Imperative helpers ──

  function addGoogleTrafficOverlay(map: maplibregl.Map, show: boolean, style: MapStyleType) {
    if (map.getLayer('google-traffic-overlay-layer')) map.removeLayer('google-traffic-overlay-layer');
    if (map.getSource('google-traffic-overlay-src')) map.removeSource('google-traffic-overlay-src');

    // If style already includes Google traffic, no need for the separate overlay
    if (style === 'google-traffic' || style === 'google-satellite-traffic') return;
    if (!show) return;

    try {
      map.addSource('google-traffic-overlay-src', {
        type: 'raster',
        tiles: GOOGLE_TRAFFIC_OVERLAY_TILES,
        tileSize: 256,
        attribution: '&copy; Google Traffic Layer',
      });

      const beforeId = map.getLayer('road-segments-line') ? 'road-segments-line' : undefined;
      map.addLayer(
        {
          id: 'google-traffic-overlay-layer',
          type: 'raster',
          source: 'google-traffic-overlay-src',
          minzoom: 0,
          maxzoom: 20,
          paint: {
            'raster-opacity': 0.85,
          },
        },
        beforeId,
      );
    } catch (e) {
      console.warn('[MapContainer] Google traffic overlay load error:', e);
    }
  }

  function addRoadSource(map: maplibregl.Map, geoJSON: RoadGeoJSONCollection | undefined, show: boolean) {
    if (!geoJSON) return;

    // Remove old layers/source first (check existence to avoid console errors)
    if (map.getLayer('road-segments-line')) map.removeLayer('road-segments-line');
    if (map.getSource('road-segments-src')) map.removeSource('road-segments-src');

    if (!show) return;

    map.addSource('road-segments-src', {
      type: 'geojson',
      data: geoJSON as unknown as string,
    });

    map.addLayer({
      id: 'road-segments-line',
      type: 'line',
      source: 'road-segments-src',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'step', ['get', 'congestion'],
          '#22c55e', 40, '#eab308', 70, '#ef4444',
        ],
        'line-width': 7,
        'line-opacity': 0.85,
      },
    });

    // Re-bind click/hover handlers (callbacks may have changed)
    map.on('mouseenter', 'road-segments-line', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'road-segments-line', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('click', 'road-segments-line', (e) => {
      if (e.features?.length && onRoadClickRef.current) {
        onRoadClickRef.current(e.features[0].properties as any);
      }
    });
  }

  function addRouteLayers(map: maplibregl.Map, routeList: RouteOption[]) {
    routeList.forEach((route) => {
      const sourceId = `route-source-${route.id}`;
      const layerId = `route-layer-${route.id}`;
      if (map.getSource(sourceId)) return; // already added

      const isSelected = selectedRouteId === route.id;

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: route.coordinates },
        },
      });
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': isSelected ? '#06b6d4'
            : route.isRecommended ? '#06b6d4'
            : route.congestionLevel === 'severe' ? '#ef4444' : '#f59e0b',
          'line-width': isSelected ? 7 : route.isRecommended ? 6 : 4,
          'line-opacity': selectedRouteId ? (isSelected ? 1.0 : 0.35) : 0.85,
        },
      });
    });
  }

  function addTrafficFlowLayer(map: maplibregl.Map, flowData: TrafficFlowGeoJSON | null | undefined) {
    // Remove existing traffic flow layers
    ['traffic-flow-glow', 'traffic-flow-line'].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('traffic-flow-src')) map.removeSource('traffic-flow-src');

    if (!flowData || !flowData.features || flowData.features.length === 0) return;

    map.addSource('traffic-flow-src', {
      type: 'geojson',
      data: flowData as unknown as string,
    });

    // Wide glow underlay
    map.addLayer({
      id: 'traffic-flow-glow',
      type: 'line',
      source: 'traffic-flow-src',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'match',
          ['get', 'trafficLevel'],
          'smooth', '#22c55e',
          'moderate', '#eab308',
          'heavy', '#f97316',
          'severe', '#ef4444',
          '#94a3b8',
        ],
        'line-width': 12,
        'line-opacity': 0.18,
        'line-blur': 6,
      },
    });

    // Main traffic flow lines — colored by traffic level on the actual road geometry
    map.addLayer({
      id: 'traffic-flow-line',
      type: 'line',
      source: 'traffic-flow-src',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'match',
          ['get', 'trafficLevel'],
          'smooth', '#22c55e',
          'moderate', '#eab308',
          'heavy', '#f97316',
          'severe', '#ef4444',
          '#94a3b8',
        ],
        'line-width': 5,
        'line-opacity': 0.88,
      },
    });

    // Click handler for traffic flow segments
    map.on('click', 'traffic-flow-line', (e) => {
      if (e.features && e.features.length > 0) {
        const p = e.features[0].properties as any;
        const coords = (e.features[0].geometry as any)?.coordinates?.[0];
        const popupHtml = `
          <div style="font-family: monospace; padding: 6px; min-width: 180px;">
            <div style="font-weight: bold; color: #38bdf8; font-size: 12px; margin-bottom: 4px;">${p.roadName || 'Road Segment'}</div>
            <div style="font-size: 11px; color: #f8fafc;">
              <div>Speed: <strong>${p.speed ?? '—'} km/h</strong> (free-flow: ${p.freeFlowSpeed ?? '—'})</div>
              <div>Jam Factor: <strong>${p.jamFactor ?? '—'}</strong></div>
              <div>Confidence: <strong>${p.confidence ?? '—'}</strong></div>
              ${p.updated ? `<div>Last Updated: <strong>${p.updated}</strong></div>` : ''}
              <div style="margin-top: 4px; color: #22c55e; font-weight: bold;">Source: ${p.source ?? 'HERE'}</div>
            </div>
          </div>
        `;
        if (coords) {
          new maplibregl.Popup({ offset: 15 })
            .setLngLat(coords)
            .setHTML(popupHtml)
            .addTo(map);
        }
        // Callback for parent components (e.g., LiveTraffic command center)
        if (onTrafficFlowClickRef.current) {
          const point = e.lngLat;
          onTrafficFlowClickRef.current({
            speed: p.speed ?? 0,
            freeFlowSpeed: p.freeFlowSpeed ?? 0,
            jamFactor: p.jamFactor ?? 0,
            confidence: p.confidence ?? 0,
            trafficLevel: p.trafficLevel ?? 'unknown',
            roadName: p.roadName ?? 'Unknown Road',
            updated: p.updated ?? '',
            source: p.source ?? 'HERE',
            lat: point.lat,
            lng: point.lng,
          });
        }
      }
    });

    map.on('mouseenter', 'traffic-flow-line', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'traffic-flow-line', () => {
      map.getCanvas().style.cursor = '';
    });
  }

  function addJunctionMarkers(map: maplibregl.Map, junctionList: any[], city: string) {
    // Remove old junction markers
    mapContainerRef.current?.querySelectorAll('[data-marker="junction"]').forEach((el) => el.remove());

    junctionList.forEach((j: any) => {
      const el = document.createElement('div');
      el.dataset.marker = 'junction';
      el.className =
        'w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-125 border-2 border-slate-900 shadow-lg';

      if (j.status === 'critical') { el.style.backgroundColor = '#ef4444'; el.style.boxShadow = '0 0 12px #ef4444'; }
      else if (j.status === 'red') { el.style.backgroundColor = '#f97316'; }
      else if (j.status === 'yellow') { el.style.backgroundColor = '#eab308'; }
      else { el.style.backgroundColor = '#22c55e'; }

      const inner = document.createElement('div');
      inner.className = 'w-2 h-2 rounded-full bg-white';
      el.appendChild(inner);

      el.addEventListener('click', () => onJunctionClickRef.current?.(j));

      const popupContent = `
        <div style="font-family: monospace; padding: 4px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #38bdf8;">${j.name}</h4>
          <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Metro: ${city}</p>
          <div style="margin-top: 6px; font-size: 11px; color: #f8fafc;">
            <div>Wait Time: <strong>${j.currentWaitTimeSec || j.waitTimeSec || 60}s</strong></div>
            <div>Queue Vehicles: <strong>${j.vehicleCount || j.queueLengthVeh || 300}</strong></div>
            <div>Congestion: <strong style="color: ${(j.congestionIndex || j.congestionPct) > 80 ? '#ef4444' : '#22c55e'};">${j.congestionIndex || j.congestionPct}%</strong></div>
          </div>
        </div>
      `;

      new maplibregl.Marker(el)
        .setLngLat([j.lng, j.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(popupContent))
        .addTo(map);
    });
  }

  function addGreenCorridorLayers(map: maplibregl.Map, corridors: GreenCorridor[]) {
    // Remove existing green corridor layers
    ['green-corridor-bg', 'green-corridor-line', 'green-corridor-glow', 'green-corridor-vehicle'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('green-corridor-src')) map.removeSource('green-corridor-src');

    if (corridors.length === 0) return;

    // Build a combined GeoJSON for all active corridors
    const features = corridors
      .filter(c => c.status === 'active' && c.coordinates && c.coordinates.length > 1)
      .map(c => ({
        type: 'Feature' as const,
        properties: {
          id: c.id,
          title: c.title,
          vehicleType: c.vehicleType,
          callsign: c.vehicleCallsign,
          etaMin: c.etaMin,
          status: c.status,
          currentLat: c.currentLat,
          currentLng: c.currentLng,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: c.coordinates,
        },
      }));

    if (features.length === 0) return;

    map.addSource('green-corridor-src', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features } as any,
    });

    // Wide green glow underneath
    map.addLayer({
      id: 'green-corridor-bg',
      type: 'line',
      source: 'green-corridor-src',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#22c55e',
        'line-width': 14,
        'line-opacity': 0.15,
        'line-blur': 8,
      },
    });

    // Animated dashed green line
    map.addLayer({
      id: 'green-corridor-line',
      type: 'line',
      source: 'green-corridor-src',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#4ade80',
        'line-width': 5,
        'line-opacity': 0.95,
        'line-dasharray': [0, 4, 3],
      },
    });

    // Bright glow overlay
    map.addLayer({
      id: 'green-corridor-glow',
      type: 'line',
      source: 'green-corridor-src',
      paint: {
        'line-color': '#86efac',
        'line-width': 3,
        'line-opacity': 0.5,
        'line-blur': 3,
      },
    });

    // Vehicle position dots
    map.addLayer({
      id: 'green-corridor-vehicle',
      type: 'circle',
      source: 'green-corridor-src',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 5, 15, 10,
        ],
        'circle-color': '#22c55e',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-blur': 0.15,
      },
    });

    // Animate the dashes by updating the dasharray periodically
    let dashStep = 0;
    let animFrameId: number | null = null;
    const animateDash = () => {
      if (!map || !map.getLayer('green-corridor-line')) return;
      dashStep = (dashStep + 0.15) % 12;
      try {
        map.setPaintProperty('green-corridor-line', 'line-dasharray', [
          dashStep, 4, 3 - (dashStep % 3) + 1
        ]);
      } catch { /* map may have been removed */ }
      animFrameId = requestAnimationFrame(animateDash);
    };
    animFrameId = requestAnimationFrame(animateDash);
    // Cleanup animation when corridor layers are removed
    const onRemove = () => { if (animFrameId) cancelAnimationFrame(animFrameId); };
    map.once('remove', onRemove);
  }

  function addIncidentMarkers(map: maplibregl.Map, incList: Incident[]) {
    mapContainerRef.current?.querySelectorAll('[data-marker="incident"]').forEach((el) => el.remove());

    incList.forEach((inc) => {
      const el = document.createElement('div');
      el.dataset.marker = 'incident';
      el.className =
        'w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-lg animate-pulse border-2 border-white cursor-pointer';
      el.innerHTML = '⚠️';

      new maplibregl.Marker(el)
        .setLngLat([inc.lng, inc.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<b>${inc.title}</b><br/>${inc.locationName}`))
        .addTo(map);
    });
  }

  function addSyntheticMarkers(map: maplibregl.Map) {
    cameras.forEach((cam) => {
      if (cameraMarkersRef.current.has(cam.id)) return;
      const el = document.createElement('div');
      el.dataset.marker = 'camera';
      el.className = 'w-5 h-5 rounded bg-blue-900/80 border border-blue-400/60 flex items-center justify-center cursor-pointer text-[10px]';
      el.innerHTML = '📷';
      el.title = cam.name;
      new maplibregl.Marker(el)
        .setLngLat([cam.lng, cam.lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<b style='color:#38bdf8;'>${cam.name}</b><br/>Type: ${cam.type}<br/>Status: ${cam.status}`))
        .addTo(map);
      cameraMarkersRef.current.set(cam.id, { marker: null as any, el });
    });
    sensors.forEach((sens) => {
      if (sensorMarkersRef.current.has(sens.id)) return;
      const el = document.createElement('div');
      el.dataset.marker = 'sensor';
      el.className = 'w-5 h-5 rounded bg-purple-900/80 border border-purple-400/60 flex items-center justify-center cursor-pointer text-[10px]';
      el.innerHTML = '📡';
      el.title = sens.name;
      new maplibregl.Marker(el)
        .setLngLat([sens.lng, sens.lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<b style='color:#a855f7;'>${sens.name}</b><br/>Type: ${sens.type}<br/>Reading: ${sens.reading}`))
        .addTo(map);
      sensorMarkersRef.current.set(sens.id, { marker: null as any, el });
    });
    busStops.forEach((b) => {
      if (busStopMarkersRef.current.has(b.id)) return;
      const el = document.createElement('div');
      el.dataset.marker = 'busstop';
      el.className = 'w-5 h-5 rounded bg-cyan-800/80 border border-cyan-400/60 flex items-center justify-center cursor-pointer text-[10px]';
      el.innerHTML = '🚌';
      new maplibregl.Marker(el)
        .setLngLat([b.lng, b.lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<b style='color:#22d3ee;'>${b.name}</b><br/>Routes: ${b.routes.join(', ')}`))
        .addTo(map);
      busStopMarkersRef.current.set(b.id, { marker: null as any, el });
    });
    metroStations.forEach((m) => {
      if (metroMarkersRef.current.has(m.id)) return;
      const el = document.createElement('div');
      el.dataset.marker = 'metro';
      el.className = 'w-5 h-5 rounded bg-emerald-800/80 border border-emerald-400/60 flex items-center justify-center cursor-pointer text-[10px]';
      el.innerHTML = '🚇';
      new maplibregl.Marker(el)
        .setLngLat([m.lng, m.lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<b style='color:#34d399;'>${m.name}</b><br/>Line: ${m.line}`))
        .addTo(map);
      metroMarkersRef.current.set(m.id, { marker: null as any, el });
    });
  }

  // Update synthetic markers (cameras, sensors, bus stops, metro)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    addSyntheticMarkers(map);
  }, [cameras, sensors, busStops, metroStations]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 flex flex-col">
      {/* Top Map Header Control Bar: 4-City Tabs + Search + Toggles + Style Menu */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2 z-20 shrink-0">
        {/* When search is focused: full-width search bar. Otherwise: normal layout */}
        {showSuggestions ? (
          /* ── EXPANDED SEARCH MODE ── */
          <div className="relative flex-1 w-full">
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => { setShowSuggestions(false); setSearchQuery(''); setSearchResults([]); }}
                className="shrink-0 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  placeholder={`Search any place in ${selectedCity}...`}
                  className="w-full pl-10 pr-8 py-2 bg-slate-950 border border-cyan-500/50 rounded-lg text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-400 shadow-lg shadow-cyan-500/10"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown below the search bar */}
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-40 max-h-72 overflow-y-auto font-mono text-xs">
              {searchResults.length > 0 ? (
                /* Search Results */
                <>
                  <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/60 text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>{searchResults.length} Results</span>
                    <span className="text-cyan-500">{selectedCity}</span>
                  </div>
                  {searchResults.map((res) => (
                    <div
                      key={res.place_id}
                      onClick={() => { handleSelectSearchResult(res); setShowSuggestions(false); }}
                      className="px-3 py-2.5 hover:bg-cyan-500/15 cursor-pointer border-b border-slate-800/40 text-slate-200 flex items-start gap-3 transition-colors"
                    >
                      <div className="shrink-0 mt-0.5">
                        {res.source === 'local' ? (
                          <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                            <Globe className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-medium truncate">{res.display_name.split(',')[0]}</div>
                        <div className="text-[10px] text-slate-500 truncate">{res.display_name.split(',').slice(1, 3).join(',')}</div>
                      </div>
                      {res.source === 'local' && (
                        <span className="shrink-0 text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded mt-0.5">LOCAL</span>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                /* Popular Areas when no query */
                <>
                  <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/60 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Popular in {selectedCity}
                  </div>
                  {mapSearchService.getPopularAreas(selectedCity).slice(0, 6).map((area) => (
                    <div
                      key={area.name}
                      onClick={() => { setSearchQuery(area.name); setShowSuggestions(true); }}
                      className="px-3 py-2.5 hover:bg-cyan-500/15 cursor-pointer border-b border-slate-800/40 text-slate-200 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-medium truncate">{area.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{area.description}</div>
                      </div>
                      <span className="shrink-0 text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                        {area.category}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── NORMAL MODE: City + Areas + Compact Search + Controls ── */
          <>
            {/* 1. City Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowCityMenu(!showCityMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold font-mono text-cyan-300 hover:text-cyan-200 hover:border-cyan-500/40 transition-all"
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>{selectedCity}</span>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showCityMenu ? 'rotate-180' : ''}`} />
              </button>
              {showCityMenu && (
                <div className="absolute left-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-40 w-44 font-mono text-xs space-y-0.5">
                  <div className="text-[9px] text-slate-500 font-bold px-2 py-1 uppercase">Switch Metro</div>
                  {Object.keys(CITIES).map((cityName) => {
                    const city = CITIES[cityName];
                    const worstArea = city.areas?.reduce((w, a) => a.congestion > w.congestion ? a : w, city.areas[0]);
                    return (
                      <button
                        key={cityName}
                        onClick={() => handleCitySelect(cityName)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                          selectedCity === cityName
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span>{cityName}</span>
                        {worstArea && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            worstArea.congestion > 85 ? 'bg-red-500/20 text-red-400' :
                            worstArea.congestion > 60 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>{worstArea.congestion}%</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Area Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-cyan-400 px-2 font-bold flex items-center gap-1 hidden sm:flex">
                <Zap className="w-3 h-3" />
                AREAS:
              </span>
              {cityConfig.areas.map((area) => (
                <button
                  key={area.name}
                  onClick={() => handleAreaSelect(area)}
                  className="group flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold font-mono transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    area.congestion > 85 ? 'bg-red-500 shadow-sm shadow-red-500/50' :
                    area.congestion > 60 ? 'bg-amber-400' :
                    area.congestion > 35 ? 'bg-yellow-400' :
                    'bg-emerald-400'
                  }`} />
                  <span>{area.name}</span>
                </button>
              ))}
            </div>

            {/* 3. Compact Search Trigger */}
            <button
              onClick={() => setShowSuggestions(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search</span>
            </button>

            {/* 4. Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMapEngine(mapEngine === 'maplibre' ? 'google-native' : 'maplibre')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono border transition-all ${
                  mapEngine === 'google-native'
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Switch between MapLibre and Native Google Maps TrafficLayer engine"
              >
                <span>{mapEngine === 'google-native' ? '🌐 Google Maps' : '⚡ MapLibre'}</span>
              </button>

              <button
                onClick={() => setShowTrafficLayer(!showTrafficLayer)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono border transition-all ${
                  showTrafficLayer
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Zap className={`w-3 h-3 ${showTrafficLayer ? 'animate-pulse text-emerald-400' : ''}`} />
                <span className="hidden md:inline">Traffic Layer</span>
              </button>
              {mapEngine === 'maplibre' && (
                <div className="relative">
                  <button
                    onClick={() => setShowStyleMenu(!showStyleMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-bold font-mono text-slate-300 hover:text-white"
                  >
                    <Layers className="w-3 h-3 text-cyan-400" />
                    <span>{MAP_STYLES[currentStyle].icon}</span>
                  </button>
                  {showStyleMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-30 w-48 font-mono text-xs space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold px-2 py-1 uppercase">Select Map Style</div>
                      {(Object.keys(MAP_STYLES) as MapStyleType[]).map((styleKey) => (
                        <button
                          key={styleKey}
                          onClick={() => { setCurrentStyle(styleKey); setShowStyleMenu(false); }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                            currentStyle === styleKey
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span>{MAP_STYLES[styleKey].name}</span>
                          <span>{MAP_STYLES[styleKey].icon}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Close suggestions / city menu on outside click */}
      {(showSuggestions || showCityMenu) && (
        <div className="absolute inset-0 z-5" onClick={() => { setShowSuggestions(false); setShowCityMenu(false); }} />
      )}

      {/* Main Map Container Canvas */}
      <div className="flex-1 relative">
        {mapEngine === 'google-native' ? (
          <GoogleTrafficMap
            center={activeCenter}
            zoom={zoom}
            showTrafficLayer={showTrafficLayer}
            junctions={junctions}
            incidents={incidents}
            routes={routes}
            onJunctionClick={onJunctionClick}
          />
        ) : (
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
        )}

        {/* Legend Overlay */}
        {/* Traffic Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1 z-10 shadow-lg font-mono">
          <div className="font-bold text-slate-400 text-[10px] uppercase flex items-center justify-between gap-4">
            <span>{selectedCity} Live Network</span>
            <span className="text-cyan-400 text-[9px]">{mapEngine === 'google-native' ? 'Google Maps JS API' : 'MapLibre Engine'}</span>
          </div>
          {showTrafficLayer && (
            <div className="text-[9px] font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>GOOGLE TRAFFIC LAYER ACTIVE</span>
            </div>
          )}
          {trafficFlowRef.current?.meta?.source && (
            <div className={`text-[9px] font-bold uppercase ${
              trafficFlowRef.current.meta.source === 'HERE' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {trafficFlowRef.current.meta.source === 'HERE' ? '● REAL TRAFFIC / HERE' : '● DEMO / SYNTHETIC'}
              {trafficFlowRef.current.meta.label && (
                <span className="text-slate-500 ml-1">({trafficFlowRef.current.meta.label})</span>
              )}
            </div>
          )}
          <div className="font-bold text-slate-500 text-[9px] uppercase pt-1">TRAFFIC LEGEND</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-emerald-500 inline-block rounded" />
            <span>🟢 Clear Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-amber-500 inline-block rounded" />
            <span>🟡 Slow Traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-red-500 inline-block rounded" />
            <span>🔴 Heavy Gridlock</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-slate-500 inline-block rounded" />
            <span>⚪ No Data</span>
          </div>
          {greenCorridors.some(c => c.status === 'active') && (
            <>
              <div className="border-t border-slate-700/60 mt-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-green-400 inline-block rounded animate-pulse" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #4ade80 0px, #4ade80 4px, transparent 4px, transparent 7px)' }} />
                  <span className="text-green-400 font-bold">Green Corridor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full border border-white shadow-sm" />
                  <span className="text-[10px] text-slate-400">Emergency Vehicle</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Green Corridor Alert Banner */}
        {greenCorridors.some(c => c.status === 'active') && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-green-900/90 backdrop-blur-md px-4 py-2 rounded-lg border border-green-500/50 z-10 shadow-lg shadow-green-500/20 animate-pulse">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-green-400 font-bold">🟢 GREEN CORRIDOR ACTIVE</span>
              <span className="text-green-300">—</span>
              <span className="text-green-200">
                {greenCorridors.filter(c => c.status === 'active').map(c => `${c.title} (ETA ${c.etaMin}min)`).join(' | ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
