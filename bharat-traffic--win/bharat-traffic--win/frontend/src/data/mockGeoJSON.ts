export interface RoadSegmentProperties {
  id: string;
  name: string;
  corridor: string;
  congestion: number; // 0-100
  avgSpeedKmh: number;
  densityVehKm: number;
  roadStatus: 'Clear' | 'Slow Traffic' | 'Heavy Congestion' | 'Gridlock';
  incidentCount: number;
  laneCount: number;
  lengthKm: number;
  lastUpdated: string;
}

export interface GeoJSONRoadFeature {
  type: 'Feature';
  properties: RoadSegmentProperties;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface RoadGeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONRoadFeature[];
}

export const MOCK_ROAD_GEOJSON: RoadGeoJSONCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'road-01',
        name: 'Outer Ring Road (Silk Board to Bellandur)',
        corridor: 'ORR South Arterial',
        congestion: 92,
        avgSpeedKmh: 11,
        densityVehKm: 145,
        roadStatus: 'Gridlock',
        incidentCount: 1,
        laneCount: 3,
        lengthKm: 5.4,
        lastUpdated: 'Just now',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6228, 12.9172],
          [77.6408, 12.922],
          [77.66, 12.924],
          [77.6762, 12.9262],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'road-02',
        name: 'Bellandur to Marathahalli Bridge Expressway',
        corridor: 'ORR East Corridor',
        congestion: 85,
        avgSpeedKmh: 14,
        densityVehKm: 110,
        roadStatus: 'Heavy Congestion',
        incidentCount: 1,
        laneCount: 3,
        lengthKm: 4.2,
        lastUpdated: '1 min ago',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6762, 12.9262],
          [77.69, 12.94],
          [77.7011, 12.9569],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'road-03',
        name: 'HAL Old Airport Road (CBD Bypass)',
        corridor: 'East CBD Transit',
        congestion: 32,
        avgSpeedKmh: 42,
        densityVehKm: 45,
        roadStatus: 'Clear',
        incidentCount: 0,
        laneCount: 2,
        lengthKm: 6.8,
        lastUpdated: '3 mins ago',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6228, 12.9348],
          [77.65, 12.96],
          [77.68, 12.965],
          [77.72, 12.985],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'road-04',
        name: 'Hosur Road Elevated Expressway',
        corridor: 'South Industrial Corridor',
        congestion: 58,
        avgSpeedKmh: 34,
        densityVehKm: 75,
        roadStatus: 'Slow Traffic',
        incidentCount: 0,
        laneCount: 4,
        lengthKm: 8.5,
        lastUpdated: '2 mins ago',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6228, 12.9172],
          [77.635, 12.89],
          [77.65, 12.85],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'road-05',
        name: 'MG Road to Trinity Circle CBD',
        corridor: 'Central Metro Transit',
        congestion: 28,
        avgSpeedKmh: 46,
        densityVehKm: 38,
        roadStatus: 'Clear',
        incidentCount: 0,
        laneCount: 3,
        lengthKm: 3.1,
        lastUpdated: '5 mins ago',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.605, 12.975],
          [77.6171, 12.973],
          [77.63, 12.97],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'road-06',
        name: 'Hebbal Flyover to Ballari Road Corridor',
        corridor: 'North Airport Highway',
        congestion: 95,
        avgSpeedKmh: 9,
        densityVehKm: 160,
        roadStatus: 'Gridlock',
        incidentCount: 1,
        laneCount: 4,
        lengthKm: 7.2,
        lastUpdated: 'Just now',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.59, 13.01],
          [77.597, 13.0359],
          [77.605, 13.06],
        ],
      },
    },
  ],
};
