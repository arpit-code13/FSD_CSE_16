import React, { useEffect, useRef, useState } from 'react';
import type { Junction, Incident, RouteOption } from '../../types/traffic';
import { AlertCircle, Loader2 } from 'lucide-react';

interface GoogleTrafficMapProps {
  center: [number, number]; // [lng, lat]
  zoom?: number;
  showTrafficLayer?: boolean;
  junctions?: Junction[];
  incidents?: Incident[];
  routes?: RouteOption[];
  onJunctionClick?: (junction: Junction) => void;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
    __google_maps_callback?: () => void;
  }
}

/**
 * Loads Google Maps JavaScript API dynamically if not already loaded.
 * Example reference: https://developers.google.com/maps/documentation/javascript/examples/layer-traffic?utm_campaign=gmp_git_agentskills_v1
 */
function loadGoogleMapsScript(apiKey?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      return resolve(window.google.maps);
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkLoaded);
          resolve(window.google.maps);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    script.src = `https://maps.googleapis.com/maps/api/js?libraries=places,geometry${keyParam}&callback=__google_maps_callback`;
    script.async = true;
    script.defer = true;

    window.__google_maps_callback = () => {
      resolve(window.google.maps);
    };

    script.onerror = (err) => {
      reject(err);
    };

    document.head.appendChild(script);
  });
}

export const GoogleTrafficMap: React.FC<GoogleTrafficMapProps> = ({
  center,
  zoom = 12,
  showTrafficLayer = true,
  junctions = [],
  incidents = [],
  routes = [],
  onJunctionClick,
  className = 'w-full h-full',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 1. Initialize Map and TrafficLayer
  useEffect(() => {
    let isMounted = true;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    loadGoogleMapsScript(apiKey)
      .then((googleMaps) => {
        if (!isMounted || !containerRef.current) return;

        // Create Map instance
        const map = new googleMaps.Map(containerRef.current, {
          center: { lat: center[1], lng: center[0] },
          zoom: zoom,
          mapTypeId: 'roadmap',
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'all',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#746855' }],
            },
          ],
        });

        // Initialize Google TrafficLayer
        // https://developers.google.com/maps/documentation/javascript/examples/layer-traffic?utm_campaign=gmp_git_agentskills_v1
        const trafficLayer = new googleMaps.TrafficLayer();
        if (showTrafficLayer) {
          trafficLayer.setMap(map);
        }

        mapRef.current = map;
        trafficLayerRef.current = trafficLayer;
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[GoogleTrafficMap] Script load error:', err);
        setLoadError('Unable to connect to Google Maps JavaScript API. Using fallback tile overlay.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, []);

  // 2. Center and Zoom updates
  useEffect(() => {
    if (mapRef.current && window.google?.maps) {
      mapRef.current.panTo({ lat: center[1], lng: center[0] });
    }
  }, [center[0], center[1]]);

  useEffect(() => {
    if (mapRef.current && window.google?.maps && zoom) {
      mapRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // 3. Toggle Traffic Layer dynamically
  useEffect(() => {
    if (trafficLayerRef.current) {
      if (showTrafficLayer) {
        trafficLayerRef.current.setMap(mapRef.current);
      } else {
        trafficLayerRef.current.setMap(null);
      }
    }
  }, [showTrafficLayer]);

  // 4. Render Junctions & Incidents
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const googleMaps = window.google.maps;

    // Add Junction Markers
    junctions.forEach((j) => {
      const marker = new googleMaps.Marker({
        position: { lat: j.lat, lng: j.lng },
        map: mapRef.current,
        title: j.name,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: j.status === 'critical' || j.status === 'red' ? '#ef4444' : j.status === 'yellow' ? '#f59e0b' : '#10b981',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      if (onJunctionClick) {
        marker.addListener('click', () => onJunctionClick(j));
      }
      markersRef.current.push(marker);
    });

    // Add Incident Markers
    incidents.forEach((inc) => {
      const marker = new googleMaps.Marker({
        position: { lat: inc.lat, lng: inc.lng },
        map: mapRef.current,
        title: inc.title || inc.description,
        icon: {
          path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
          scale: 0.7,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });
      markersRef.current.push(marker);
    });
  }, [junctions, incidents, onJunctionClick]);

  // 5. Render Route polylines
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const googleMaps = window.google.maps;

    routes.forEach((route) => {
      const path = route.coordinates.map(([lng, lat]) => ({ lat, lng }));
      const polyline = new googleMaps.Polyline({
        path,
        geodesic: true,
        strokeColor: route.isRecommended ? '#06b6d4' : '#f59e0b',
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map: mapRef.current,
      });
      polylinesRef.current.push(polyline);
    });
  }, [routes]);

  return (
    <div className={`relative ${className} bg-slate-950`}>
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
          <span className="text-xs font-mono text-cyan-200">Initializing Google Maps &amp; Traffic Layer...</span>
        </div>
      )}

      {loadError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-md bg-amber-950/90 border border-amber-500/40 text-amber-200 px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{loadError}</span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
