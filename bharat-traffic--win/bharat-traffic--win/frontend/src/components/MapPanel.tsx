import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapPanelProps {
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const MapPanel: React.FC<MapPanelProps> = ({
  center = [77.6228, 12.9172],
  zoom = 12,
  interactive = true,
  className = 'h-[400px]',
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; CARTO &copy; OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: center,
      zoom: zoom,
      interactive: interactive,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [center, zoom, interactive]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 ${className}`}>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      {children}
    </div>
  );
};
