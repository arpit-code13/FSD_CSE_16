export interface CityArea {
  name: string;
  lat: number;
  lng: number;
  /** 0-100 congestion score */
  congestion: number;
  /** Human-readable traffic label */
  trafficStatus: 'Gridlock' | 'Heavy' | 'Slow' | 'Clear';
}

export interface CityConfig {
  id: string;
  name: string;
  state: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  /** Key neighborhoods / heavy-traffic zones shown above the map */
  areas: CityArea[];
  defaultOrigin: string;
  defaultDestination: string;
  routes: Array<{
    id: string;
    name: string;
    summary: string;
    distanceKm: number;
    durationMin: number;
    standardDurationMin: number;
    timeSavedMin: number;
    co2Kg: number;
    congestionLevel: 'clear' | 'moderate' | 'severe';
    isRecommended: boolean;
    coordinates: [number, number][];
  }>;
  vehicles: Array<{
    id: string;
    type: 'ambulance' | 'fire_brigade' | 'city_bus' | 'heavy_freight' | 'high_traffic_cluster';
    name: string;
    lat: number;
    lng: number;
    speedKmh: number;
    status: 'emergency_priority' | 'active_transit' | 'heavy_congestion';
    destination: string;
    etaMin?: number;
    detail?: string;
  }>;
  junctions: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    status: 'critical' | 'red' | 'yellow' | 'green';
    waitTimeSec: number;
    queueLengthVeh: number;
    congestionPct: number;
  }>;
  roadsGeoJSON: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: {
        id: string;
        name: string;
        congestion: number;
        avgSpeedKmh: number;
        densityVehKm: number;
        roadStatus: string;
      };
      geometry: {
        type: 'LineString';
        coordinates: [number, number][];
      };
    }>;
  };
}

export const CITIES: Record<string, CityConfig> = {
  Bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    center: [77.5946, 12.9716],
    zoom: 12,
    areas: [
      { name: 'Silk Board Junction', lat: 12.9170, lng: 77.6229, congestion: 94, trafficStatus: 'Gridlock' },
      { name: 'Marathahalli Bridge', lat: 12.9352, lng: 77.6967, congestion: 82, trafficStatus: 'Heavy' },
      { name: 'Electronic City Phase 1', lat: 12.8399, lng: 77.6770, congestion: 68, trafficStatus: 'Heavy' },
      { name: 'MG Road', lat: 12.9758, lng: 77.6065, congestion: 45, trafficStatus: 'Slow' },
      { name: 'Koramangala', lat: 12.9352, lng: 77.6245, congestion: 35, trafficStatus: 'Clear' },
    ],
    defaultOrigin: 'Koramangala 5th Block, Bengaluru',
    defaultDestination: 'Whitefield ITPL, Bengaluru',
    routes: [
      {
        id: 'blr-route-1',
        name: 'Smart Dynamic Bypass (AI Recommended)',
        summary: 'Via Inner Ring Rd → Old Airport Rd → Varthur Main Rd',
        distanceKm: 18.4,
        durationMin: 38,
        standardDurationMin: 55,
        timeSavedMin: 17,
        co2Kg: 2.1,
        congestionLevel: 'clear',
        isRecommended: true,
        coordinates: [
          [77.6228, 12.9348],
          [77.635, 12.945],
          [77.65, 12.955],
          [77.68, 12.965],
          [77.72, 12.985],
          [77.74, 12.986],
        ],
      },
      {
        id: 'blr-route-2',
        name: 'Direct Outer Ring Road Corridor',
        summary: 'Via Agara Junction → Bellandur EcoSpace Flyover',
        distanceKm: 19.8,
        durationMin: 58,
        standardDurationMin: 58,
        timeSavedMin: 0,
        co2Kg: 3.4,
        congestionLevel: 'severe',
        isRecommended: false,
        coordinates: [
          [77.6228, 12.9172],
          [77.6408, 12.922],
          [77.66, 12.924],
          [77.6762, 12.9262],
          [77.7011, 12.9569],
        ],
      },
    ],
    vehicles: [
      {
        id: 'amb-blr-1',
        type: 'ambulance',
        name: '108 Cardiac Response Ambulance (KA-01-GA-9112)',
        lat: 12.9348,
        lng: 77.605,
        speedKmh: 64,
        status: 'emergency_priority',
        destination: 'Manipal Hospital, Old Airport Rd',
        etaMin: 9,
        detail: 'Green Corridor Signal Override Active',
      },
      {
        id: 'amb-blr-2',
        type: 'ambulance',
        name: 'Trauma Care Emergency Unit (KA-05-EM-4081)',
        lat: 12.9569,
        lng: 77.7011,
        speedKmh: 58,
        status: 'emergency_priority',
        destination: 'Vaidehi Super Speciality Hospital, Whitefield',
        etaMin: 6,
        detail: 'Patient Pre-Arrival Telemetry Active',
      },
      {
        id: 'bus-blr-1',
        type: 'city_bus',
        name: 'BMTC Volvo Electric Express #500D',
        lat: 12.9172,
        lng: 77.6228,
        speedKmh: 14,
        status: 'active_transit',
        destination: 'Kadubeesanahalli Bus Stop',
        detail: 'Occupancy: 88% (Heavy Commuter Flow)',
      },
      {
        id: 'truck-blr-1',
        type: 'heavy_freight',
        name: 'Container Freight Transporter (16-Wheeler)',
        lat: 13.0359,
        lng: 77.597,
        speedKmh: 18,
        status: 'heavy_congestion',
        destination: 'Peenya Industrial Zone',
        detail: 'Restricted Heavy Freight Lane',
      },
      {
        id: 'cluster-blr-1',
        type: 'high_traffic_cluster',
        name: 'Silk Board Chokepoint High-Density Cluster',
        lat: 12.9172,
        lng: 77.6228,
        speedKmh: 8,
        status: 'heavy_congestion',
        destination: 'Bellandur EcoSpace Corridor',
        detail: '1,466 Vehicles Queued (94% Bottleneck)',
      },
    ],
    junctions: [
      { id: 'blr-1', name: 'Silk Board Junction', lat: 12.9172, lng: 77.6228, status: 'critical', waitTimeSec: 226, queueLengthVeh: 1466, congestionPct: 94 },
      { id: 'blr-2', name: 'Dairy Circle Flyover', lat: 12.9348, lng: 77.605, status: 'red', waitTimeSec: 126, queueLengthVeh: 886, congestionPct: 79 },
      { id: 'blr-3', name: 'HSR Layout BDA Complex', lat: 12.9116, lng: 77.6476, status: 'yellow', waitTimeSec: 74, queueLengthVeh: 388, congestionPct: 67 },
      { id: 'blr-4', name: 'Hebbal Flyover Junction', lat: 13.0359, lng: 77.597, status: 'critical', waitTimeSec: 225, queueLengthVeh: 1640, congestionPct: 91 },
      { id: 'blr-5', name: 'MG Road Trinity Circle', lat: 12.973, lng: 77.6171, status: 'green', waitTimeSec: 49, queueLengthVeh: 306, congestionPct: 35 },
      { id: 'blr-6', name: 'Marathahalli Multiplex', lat: 12.9569, lng: 77.7011, status: 'red', waitTimeSec: 170, queueLengthVeh: 1070, congestionPct: 79 },
    ],
    roadsGeoJSON: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'blr-r1', name: 'Outer Ring Road (Silk Board - Bellandur)', congestion: 92, avgSpeedKmh: 11, densityVehKm: 145, roadStatus: 'Gridlock' },
          geometry: { type: 'LineString', coordinates: [[77.6228, 12.9172], [77.6408, 12.922], [77.66, 12.924], [77.6762, 12.9262]] },
        },
        {
          type: 'Feature',
          properties: { id: 'blr-r2', name: 'Bellandur to Marathahalli Expressway', congestion: 85, avgSpeedKmh: 14, densityVehKm: 110, roadStatus: 'Heavy Congestion' },
          geometry: { type: 'LineString', coordinates: [[77.6762, 12.9262], [77.69, 12.94], [77.7011, 12.9569]] },
        },
        {
          type: 'Feature',
          properties: { id: 'blr-r3', name: 'HAL Old Airport Road (CBD Bypass)', congestion: 32, avgSpeedKmh: 42, densityVehKm: 45, roadStatus: 'Clear' },
          geometry: { type: 'LineString', coordinates: [[77.6228, 12.9348], [77.65, 12.96], [77.68, 12.965], [77.72, 12.985]] },
        },
        {
          type: 'Feature',
          properties: { id: 'blr-r4', name: 'Hosur Road Elevated Expressway', congestion: 58, avgSpeedKmh: 34, densityVehKm: 75, roadStatus: 'Slow Traffic' },
          geometry: { type: 'LineString', coordinates: [[77.6228, 12.9172], [77.635, 12.89], [77.65, 12.85]] },
        },
      ],
    },
  },

  'Delhi-NCR': {
    id: 'delhi-ncr',
    name: 'Delhi-NCR',
    state: 'Delhi / Haryana / UP',
    center: [77.2090, 28.6139],
    zoom: 11.5,
    areas: [
      { name: 'AIIMS Ring Road', lat: 28.5672, lng: 77.2102, congestion: 96, trafficStatus: 'Gridlock' },
      { name: 'DND Flyway', lat: 28.5850, lng: 77.2890, congestion: 88, trafficStatus: 'Heavy' },
      { name: 'Gurgaon IFFCO Chowk', lat: 28.4744, lng: 77.0783, congestion: 78, trafficStatus: 'Heavy' },
      { name: 'Connaught Place', lat: 28.6315, lng: 77.2167, congestion: 55, trafficStatus: 'Slow' },
      { name: 'Noida Sector 18', lat: 28.5700, lng: 77.3260, congestion: 38, trafficStatus: 'Clear' },
    ],
    defaultOrigin: 'Connaught Place, New Delhi',
    defaultDestination: 'Gurgaon Cyber City, Delhi-NCR',
    routes: [
      {
        id: 'del-route-1',
        name: 'Vasant Kunj AI Express Route (AI Recommended)',
        summary: 'Via Nelson Mandela Marg → Mehrauli-Gurgaon Rd Bypass',
        distanceKm: 24.2,
        durationMin: 42,
        standardDurationMin: 68,
        timeSavedMin: 26,
        co2Kg: 2.8,
        congestionLevel: 'clear',
        isRecommended: true,
        coordinates: [
          [77.2167, 28.6315],
          [77.2100, 28.5672],
          [77.1550, 28.5250],
          [77.0850, 28.4900],
          [77.0725, 28.4721],
        ],
      },
      {
        id: 'del-route-2',
        name: 'NH-48 Main Expressway Corridor',
        summary: 'Via Dhaula Kuan Interchange → Gurgaon Toll Plaza',
        distanceKm: 26.5,
        durationMin: 68,
        standardDurationMin: 68,
        timeSavedMin: 0,
        co2Kg: 4.2,
        congestionLevel: 'severe',
        isRecommended: false,
        coordinates: [
          [77.2167, 28.6315],
          [77.1650, 28.5920],
          [77.1250, 28.5400],
          [77.0725, 28.4721],
        ],
      },
    ],
    vehicles: [
      {
        id: 'amb-del-1',
        type: 'ambulance',
        name: 'AIIMS Advanced Life Support Ambulance (DL-01-AM-1002)',
        lat: 28.5672,
        lng: 77.2100,
        speedKmh: 70,
        status: 'emergency_priority',
        destination: 'AIIMS Emergency Trauma Centre, Ring Rd',
        etaMin: 5,
        detail: 'Green Corridor Active - AIIMS Junction Priority',
      },
      {
        id: 'bus-del-1',
        type: 'city_bus',
        name: 'DTC Low-Floor Electric Bus #429',
        lat: 28.6315,
        lng: 77.2167,
        speedKmh: 22,
        status: 'active_transit',
        destination: 'ISBT Kashmiri Gate',
        detail: 'Occupancy: 94% (Kashmiri Gate Route)',
      },
      {
        id: 'truck-del-1',
        type: 'heavy_freight',
        name: 'Interstate Freight Logistics Trailer',
        lat: 28.5684,
        lng: 77.2796,
        speedKmh: 15,
        status: 'heavy_congestion',
        destination: 'Noida Freight Depot',
        detail: 'DND Toll Queue Delay (+15 mins)',
      },
      {
        id: 'cluster-del-1',
        type: 'high_traffic_cluster',
        name: 'Gurgaon Toll Plaza Chokepoint Cluster',
        lat: 28.4721,
        lng: 77.0725,
        speedKmh: 9,
        status: 'heavy_congestion',
        destination: 'Cyber City Expressway',
        detail: '1,850 Vehicles Queued',
      },
    ],
    junctions: [
      { id: 'del-1', name: 'Connaught Place Outer Circle', lat: 28.6315, lng: 77.2167, status: 'yellow', waitTimeSec: 85, queueLengthVeh: 620, congestionPct: 65 },
      { id: 'del-2', name: 'DND Flyway Toll Plaza', lat: 28.5684, lng: 77.2796, status: 'critical', waitTimeSec: 210, queueLengthVeh: 1850, congestionPct: 92 },
      { id: 'del-3', name: 'Gurgaon IFFCO Chowk', lat: 28.4721, lng: 77.0725, status: 'red', waitTimeSec: 165, queueLengthVeh: 1240, congestionPct: 84 },
      { id: 'del-4', name: 'AIIMS Ring Road Flyover', lat: 28.5672, lng: 77.2100, status: 'critical', waitTimeSec: 240, queueLengthVeh: 1980, congestionPct: 96 },
      { id: 'del-5', name: 'Noida Sector 18 Underpass', lat: 28.5708, lng: 77.3261, status: 'green', waitTimeSec: 42, queueLengthVeh: 290, congestionPct: 38 },
    ],
    roadsGeoJSON: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'del-r1', name: 'Ring Road (AIIMS to Dhaula Kuan)', congestion: 94, avgSpeedKmh: 10, densityVehKm: 160, roadStatus: 'Gridlock' },
          geometry: { type: 'LineString', coordinates: [[77.2100, 28.5672], [77.1850, 28.5800], [77.1650, 28.5920]] },
        },
        {
          type: 'Feature',
          properties: { id: 'del-r2', name: 'Delhi-Gurgaon Expressway (NH-48)', congestion: 88, avgSpeedKmh: 18, densityVehKm: 135, roadStatus: 'Heavy Congestion' },
          geometry: { type: 'LineString', coordinates: [[77.1650, 28.5920], [77.1250, 28.5400], [77.0725, 28.4721]] },
        },
        {
          type: 'Feature',
          properties: { id: 'del-r3', name: 'DND Flyway (Mayur Vihar to Noida)', congestion: 76, avgSpeedKmh: 24, densityVehKm: 95, roadStatus: 'Slow Traffic' },
          geometry: { type: 'LineString', coordinates: [[77.2796, 28.5684], [77.3050, 28.5700], [77.3261, 28.5708]] },
        },
      ],
    },
  },

  Mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    center: [72.8777, 19.0760],
    zoom: 11.5,
    areas: [
      { name: 'Bandra-Worli Sea Link', lat: 19.0370, lng: 72.8200, congestion: 95, trafficStatus: 'Gridlock' },
      { name: 'Dadar TT Circle', lat: 19.0176, lng: 72.8435, congestion: 85, trafficStatus: 'Heavy' },
      { name: 'Andheri Signal', lat: 19.1197, lng: 72.8464, congestion: 72, trafficStatus: 'Heavy' },
      { name: 'BKC Junction', lat: 19.0607, lng: 72.8696, congestion: 50, trafficStatus: 'Slow' },
      { name: 'Marine Drive', lat: 18.9432, lng: 72.8234, congestion: 28, trafficStatus: 'Clear' },
    ],
    defaultOrigin: 'Bandra Kurla Complex (BKC), Mumbai',
    defaultDestination: 'Chhatrapati Shivaji Airport, Mumbai',
    routes: [
      {
        id: 'bom-route-1',
        name: 'SANTACRUZ-CHEMBUR LINK ROAD (AI Recommended)',
        summary: 'Via BKC Connector → SCLR Flyover → Airport T2 Skywalk',
        distanceKm: 12.8,
        durationMin: 24,
        standardDurationMin: 48,
        timeSavedMin: 24,
        co2Kg: 1.5,
        congestionLevel: 'clear',
        isRecommended: true,
        coordinates: [
          [72.8530, 19.0600],
          [72.8700, 19.0750],
          [72.8800, 19.0880],
          [72.8650, 19.0950],
          [72.8464, 19.1197],
        ],
      },
      {
        id: 'bom-route-2',
        name: 'Western Express Highway Arterial',
        summary: 'Via Kalanagar Junction → Sion-Bandra Link Rd',
        distanceKm: 15.1,
        durationMin: 48,
        standardDurationMin: 48,
        timeSavedMin: 0,
        co2Kg: 2.9,
        congestionLevel: 'severe',
        isRecommended: false,
        coordinates: [
          [72.8530, 19.0600],
          [72.8500, 19.0900],
          [72.8464, 19.1197],
        ],
      },
    ],
    vehicles: [
      {
        id: 'amb-bom-1',
        type: 'ambulance',
        name: 'Lilavati Cardiac Emergency Response Ambulance',
        lat: 19.0600,
        lng: 72.8530,
        speedKmh: 68,
        status: 'emergency_priority',
        destination: 'Lilavati Hospital, Bandra West',
        etaMin: 7,
        detail: 'BKC Signal Clearance Override Active',
      },
      {
        id: 'bus-bom-1',
        type: 'city_bus',
        name: 'BEST AC Electric Bus #A-340',
        lat: 19.0178,
        lng: 72.8478,
        speedKmh: 18,
        status: 'active_transit',
        destination: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
        detail: 'Occupancy: 90%',
      },
      {
        id: 'cluster-bom-1',
        type: 'high_traffic_cluster',
        name: 'Bandra-Worli Sea Link Toll Bottleneck',
        lat: 19.0330,
        lng: 72.8170,
        speedKmh: 6,
        status: 'heavy_congestion',
        destination: 'Worli Seaface Expressway',
        detail: '2,100 Vehicles Queued (95% Gridlock)',
      },
    ],
    junctions: [
      { id: 'bom-1', name: 'Bandra-Worli Sea Link Toll', lat: 19.0330, lng: 72.8170, status: 'critical', waitTimeSec: 250, queueLengthVeh: 2100, congestionPct: 95 },
      { id: 'bom-2', name: 'BKC Kalanagar Junction', lat: 19.0600, lng: 72.8530, status: 'red', waitTimeSec: 180, queueLengthVeh: 1420, congestionPct: 87 },
      { id: 'bom-3', name: 'Dadar TT Circle', lat: 19.0178, lng: 72.8478, status: 'yellow', waitTimeSec: 95, queueLengthVeh: 710, congestionPct: 68 },
      { id: 'bom-4', name: 'Western Express Highway (Andheri)', lat: 19.1197, lng: 72.8464, status: 'critical', waitTimeSec: 235, queueLengthVeh: 1890, congestionPct: 93 },
      { id: 'bom-5', name: 'Marine Drive Nariman Point', lat: 18.9260, lng: 72.8230, status: 'green', waitTimeSec: 35, queueLengthVeh: 240, congestionPct: 28 },
    ],
    roadsGeoJSON: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'bom-r1', name: 'Western Express Highway (Andheri to BKC)', congestion: 95, avgSpeedKmh: 9, densityVehKm: 175, roadStatus: 'Gridlock' },
          geometry: { type: 'LineString', coordinates: [[72.8464, 19.1197], [72.8500, 19.0900], [72.8530, 19.0600]] },
        },
        {
          type: 'Feature',
          properties: { id: 'bom-r2', name: 'Bandra-Worli Sea Link Corridor', congestion: 45, avgSpeedKmh: 55, densityVehKm: 60, roadStatus: 'Clear' },
          geometry: { type: 'LineString', coordinates: [[72.8350, 19.0500], [72.8170, 19.0330], [72.8150, 19.0050]] },
        },
        {
          type: 'Feature',
          properties: { id: 'bom-r3', name: 'Eastern Freeway (Chembur to South Mumbai)', congestion: 38, avgSpeedKmh: 62, densityVehKm: 42, roadStatus: 'Clear' },
          geometry: { type: 'LineString', coordinates: [[72.8900, 19.0400], [72.8600, 18.9800], [72.8400, 18.9400]] },
        },
      ],
    },
  },

  Hyderabad: {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    center: [78.4867, 17.3850],
    zoom: 12,
    areas: [
      { name: 'HITECH City', lat: 17.4435, lng: 78.3772, congestion: 91, trafficStatus: 'Gridlock' },
      { name: 'Mehdipatnam', lat: 17.3889, lng: 78.4386, congestion: 79, trafficStatus: 'Heavy' },
      { name: 'Ameerpet Junction', lat: 17.4156, lng: 78.4347, congestion: 66, trafficStatus: 'Slow' },
      { name: 'Secunderabad Station', lat: 17.4399, lng: 78.5010, congestion: 48, trafficStatus: 'Slow' },
      { name: 'Charminar', lat: 17.3616, lng: 78.4747, congestion: 32, trafficStatus: 'Clear' },
    ],
    defaultOrigin: 'HITECH City Cyber Towers, Hyderabad',
    defaultDestination: 'Begumpet Airport Plaza, Hyderabad',
    routes: [
      {
        id: 'hyd-route-1',
        name: 'Durgam Cheruvu Cable Bridge Express (AI Recommended)',
        summary: 'Via Cable Bridge → Jubilee Hills Road No 36 → Begumpet',
        distanceKm: 14.5,
        durationMin: 28,
        standardDurationMin: 52,
        timeSavedMin: 24,
        co2Kg: 1.8,
        congestionLevel: 'clear',
        isRecommended: true,
        coordinates: [
          [78.3808, 17.4504],
          [78.3950, 17.4420],
          [78.4072, 17.4319],
          [78.4450, 17.4400],
          [78.4682, 17.4448],
        ],
      },
      {
        id: 'hyd-route-2',
        name: 'Gachibowli Outer Expressway Corridor',
        summary: 'Via Bio-Diversity Flyover → Mindspace Junction',
        distanceKm: 17.2,
        durationMin: 52,
        standardDurationMin: 52,
        timeSavedMin: 0,
        co2Kg: 3.1,
        congestionLevel: 'severe',
        isRecommended: false,
        coordinates: [
          [78.3808, 17.4504],
          [78.3615, 17.4401],
          [78.4072, 17.4319],
          [78.4682, 17.4448],
        ],
      },
    ],
    vehicles: [
      {
        id: 'amb-hyd-1',
        type: 'ambulance',
        name: 'Apollo Jubilee Hills Emergency Ambulance (TS-09-EM-8080)',
        lat: 17.4319,
        lng: 78.4072,
        speedKmh: 62,
        status: 'emergency_priority',
        destination: 'Apollo Hospital, Jubilee Hills Rd #92',
        etaMin: 6,
        detail: 'Green Corridor Signal Override Active',
      },
      {
        id: 'bus-hyd-1',
        type: 'city_bus',
        name: 'TSRTC Pushpak Airport Liner #219',
        lat: 17.4504,
        lng: 78.3808,
        speedKmh: 28,
        status: 'active_transit',
        destination: 'Rajiv Gandhi International Airport',
        detail: 'Occupancy: 76%',
      },
      {
        id: 'cluster-hyd-1',
        type: 'high_traffic_cluster',
        name: 'Cyber Towers Chokepoint Cluster',
        lat: 17.4504,
        lng: 78.3808,
        speedKmh: 10,
        status: 'heavy_congestion',
        destination: 'Mindspace Junction Corridor',
        detail: '1,520 Vehicles Queued',
      },
    ],
    junctions: [
      { id: 'hyd-1', name: 'HITECH City Cyber Towers', lat: 17.4504, lng: 78.3808, status: 'critical', waitTimeSec: 215, queueLengthVeh: 1520, congestionPct: 91 },
      { id: 'hyd-2', name: 'Gachibowli Bio-Diversity Flyover', lat: 17.4401, lng: 78.3615, status: 'red', waitTimeSec: 155, queueLengthVeh: 1100, congestionPct: 82 },
      { id: 'hyd-3', name: 'Begumpet Airport Road', lat: 17.4448, lng: 78.4682, status: 'yellow', waitTimeSec: 80, queueLengthVeh: 580, congestionPct: 62 },
      { id: 'hyd-4', name: 'Jubilee Hills Checkpost', lat: 17.4319, lng: 78.4072, status: 'critical', waitTimeSec: 195, queueLengthVeh: 1380, congestionPct: 89 },
      { id: 'hyd-5', name: 'Charminar Heritage Plaza', lat: 17.3616, lng: 78.4747, status: 'green', waitTimeSec: 40, queueLengthVeh: 260, congestionPct: 32 },
    ],
    roadsGeoJSON: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'hyd-r1', name: 'Outer Ring Road (Gachibowli to Shamshabad)', congestion: 25, avgSpeedKmh: 85, densityVehKm: 30, roadStatus: 'Clear' },
          geometry: { type: 'LineString', coordinates: [[78.3615, 17.4401], [78.3800, 17.3800], [78.4200, 17.2500]] },
        },
        {
          type: 'Feature',
          properties: { id: 'hyd-r2', name: 'HITECH City Main Arterial Corridor', congestion: 92, avgSpeedKmh: 12, densityVehKm: 148, roadStatus: 'Gridlock' },
          geometry: { type: 'LineString', coordinates: [[78.3615, 17.4401], [78.3808, 17.4504], [78.4072, 17.4319]] },
        },
        {
          type: 'Feature',
          properties: { id: 'hyd-r3', name: 'PVNR Elevated Expressway', congestion: 52, avgSpeedKmh: 45, densityVehKm: 70, roadStatus: 'Slow Traffic' },
          geometry: { type: 'LineString', coordinates: [[78.4480, 17.3950], [78.4350, 17.3600], [78.4200, 17.3200]] },
        },
      ],
    },
  },
};
