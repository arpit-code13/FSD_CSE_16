// ── Incident Management Mock Data ──

export type IncidentType = 'accident' | 'road_blockage' | 'breakdown' | 'construction' | 'flood' | 'signal_failure';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'dispatched' | 'in_progress' | 'resolved';

export interface IncidentData {
  id: string;
  type: IncidentType;
  title: string;
  severity: IncidentSeverity;
  status: INCIDENT_STATUS;
  locationName: string;
  lat: number;
  lng: number;
  affectedRoads: string[];
  impactedLanes: number;
  estimatedDelayMin: number;
  estimatedCongestionIncreasePct: number;
  vehiclesImpacted: number;
  description: string;
  recommendedAction: string;
  dispatchedUnits: string[];
  reportedAt: string;
  reportedBy: string;
  lastUpdated: string;
}

export type INCIDENT_STATUS = 'reported' | 'dispatched' | 'in_progress' | 'resolved';

export const INCIDENT_TYPE_CONFIG: Record<IncidentType, { label: string; icon: string; color: string; defaultSeverity: IncidentSeverity }> = {
  accident: { label: 'Accident', icon: '🚗', color: 'red', defaultSeverity: 'high' },
  road_blockage: { label: 'Road Blockage', icon: '🚧', color: 'amber', defaultSeverity: 'medium' },
  breakdown: { label: 'Breakdown', icon: '🔧', color: 'cyan', defaultSeverity: 'low' },
  construction: { label: 'Construction', icon: '🏗️', color: 'purple', defaultSeverity: 'low' },
  flood: { label: 'Flood', icon: '🌊', color: 'cyan', defaultSeverity: 'critical' },
  signal_failure: { label: 'Signal Failure', icon: '🔴', color: 'red', defaultSeverity: 'high' },
};

export const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string; badge: string }> = {
  low: { label: 'Low', color: 'slate', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  medium: { label: 'Medium', color: 'amber', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  high: { label: 'High', color: 'red', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  critical: { label: 'Critical', color: 'red', badge: 'bg-red-600/30 text-red-300 border-red-500/40' },
};

export const MOCK_INCIDENTS: IncidentData[] = [
  {
    id: 'inc-201',
    type: 'accident',
    title: 'Multi-vehicle Collision on ORR South',
    severity: 'critical',
    status: 'in_progress',
    locationName: 'Bellandur EcoSpace Flyover, Outer Ring Road',
    lat: 12.9262,
    lng: 77.6762,
    affectedRoads: ['ORR South (Silk Board–Bellandur)', 'Bellandur Lake Service Road'],
    impactedLanes: 2,
    estimatedDelayMin: 45,
    estimatedCongestionIncreasePct: 28,
    vehiclesImpacted: 320,
    description: 'Three-car rear-end collision blocking 2 rightmost lanes towards Marathahalli. One vehicle overturned. Fire and rescue on scene.',
    recommendedAction: 'Deploy traffic tow truck. Activate ORR South detour via Bellandur Service Road. Broadcast citizen alert.',
    dispatchedUnits: ['PCR-04', 'Traffic Tow Truck #12', 'Fire Rescue Unit 02'],
    reportedAt: '18:05',
    reportedBy: 'Citizen Report + CCTV Auto-detect',
    lastUpdated: '18:22',
  },
  {
    id: 'inc-202',
    type: 'flood',
    title: 'Severe Waterlogging — Tin Factory Underpass',
    severity: 'critical',
    status: 'in_progress',
    locationName: 'Tin Factory Underpass, Old Madras Road',
    lat: 13.0034,
    lng: 77.6698,
    affectedRoads: ['Old Madras Road', 'Tin Factory Junction Approach'],
    impactedLanes: 3,
    estimatedDelayMin: 60,
    estimatedCongestionIncreasePct: 35,
    vehiclesImpacted: 480,
    description: '1.5 feet water accumulation post thunderstorm. All lanes impassable for two-wheelers. Heavy vehicles can pass with caution.',
    recommendedAction: 'Deploy BBMP pump squad. Close underpass to two-wheelers. Divert traffic via Hoodi Main Road.',
    dispatchedUnits: ['BBMP Pump Squad 3', 'Traffic Police Unit 09', 'NDRF Team Alpha'],
    reportedAt: '17:45',
    reportedBy: 'BBMP Control Room',
    lastUpdated: '18:18',
  },
  {
    id: 'inc-203',
    type: 'signal_failure',
    title: 'Signal Controller Malfunction — Hebbal Flyover',
    severity: 'high',
    status: 'dispatched',
    locationName: 'Hebbal Flyover Entry Junction, Bellary Road',
    lat: 13.0359,
    lng: 77.597,
    affectedRoads: ['Bellary Road', 'Hebbal Flyover Ramp', 'Airport Road Approach'],
    impactedLanes: 4,
    estimatedDelayMin: 35,
    estimatedCongestionIncreasePct: 22,
    vehiclesImpacted: 280,
    description: 'Traffic signal controller rebooted unexpectedly. All directions showing red. Manual traffic police deployed.',
    recommendedAction: 'Deploy portable signal unit. Assign 2 traffic police for manual control. Restart signal controller.',
    dispatchedUnits: ['Traffic Police Unit 01', 'Signal Maintenance Crew'],
    reportedAt: '18:12',
    reportedBy: 'IoT Sensor Alert',
    lastUpdated: '18:20',
  },
  {
    id: 'inc-204',
    type: 'breakdown',
    title: 'BMTC Electric Bus Breakdown',
    severity: 'medium',
    status: 'reported',
    locationName: 'Koramangala 100ft Road Junction',
    lat: 12.9348,
    lng: 77.6254,
    affectedRoads: ['Koramangala 100ft Road'],
    impactedLanes: 1,
    estimatedDelayMin: 20,
    estimatedCongestionIncreasePct: 12,
    vehiclesImpacted: 150,
    description: 'Electric bus immobilized in middle lane due to battery failure. Passengers evacuated safely. Bus blocking one lane.',
    recommendedAction: 'Deploy BMTC rescue vehicle. Arrange passenger transfer. Tow bus to nearest depot.',
    dispatchedUnits: [],
    reportedAt: '18:15',
    reportedBy: 'BMTC Driver Report',
    lastUpdated: '18:15',
  },
  {
    id: 'inc-205',
    type: 'construction',
    title: 'Metro Rail Viaduct Beam Repair',
    severity: 'low',
    status: 'in_progress',
    locationName: 'Indiranagar 100ft Road',
    lat: 12.9784,
    lng: 77.6408,
    affectedRoads: ['Indiranagar 100ft Road', 'CMH Road Junction Approach'],
    impactedLanes: 1,
    estimatedDelayMin: 10,
    estimatedCongestionIncreasePct: 5,
    vehiclesImpacted: 80,
    description: 'Scheduled lane closure for elevated metro track maintenance. One lane closed 9 PM–5 AM. Partial impact during evening peak.',
    recommendedAction: 'Deploy traffic cones and signage. Assign 1 traffic police. Activate variable message signs.',
    dispatchedUnits: ['BMRCL Maintenance Crew', 'Traffic Police Unit 06'],
    reportedAt: '16:00',
    reportedBy: 'BMRCL Advance Notice',
    lastUpdated: '18:00',
  },
  {
    id: 'inc-206',
    type: 'road_blockage',
    title: 'Fallen Tree Blocking Hosur Road',
    severity: 'high',
    status: 'dispatched',
    locationName: 'Hosur Road Elevated, Near Bommanahalli',
    lat: 12.885,
    lng: 77.635,
    affectedRoads: ['Hosur Road Elevated', 'Bommanahalli Link Road'],
    impactedLanes: 2,
    estimatedDelayMin: 30,
    estimatedCongestionIncreasePct: 18,
    vehiclesImpacted: 220,
    description: 'Large tree uprooted by strong winds blocking 2 lanes on Hosur Road Elevated. BBMP tree cutting squad dispatched.',
    recommendedAction: 'Deploy BBMP tree removal squad. Divert traffic via Bommanahalli Link Road. Close affected lanes.',
    dispatchedUnits: ['BBMP Tree Squad 07', 'Traffic Police Unit 11'],
    reportedAt: '18:08',
    reportedBy: 'Citizen Report',
    lastUpdated: '18:19',
  },
  {
    id: 'inc-207',
    type: 'accident',
    title: 'Auto-rickshaw vs Motorcycle Collision',
    severity: 'medium',
    status: 'resolved',
    locationName: 'MG Road Trinity Circle',
    lat: 12.973,
    lng: 77.6171,
    affectedRoads: ['MG Road'],
    impactedLanes: 1,
    estimatedDelayMin: 15,
    estimatedCongestionIncreasePct: 8,
    vehiclesImpacted: 90,
    description: 'Minor collision between auto-rickshaw and motorcycle. Both vehicles moved to road side. Minor injuries treated on scene.',
    recommendedAction: 'Clear vehicles to roadside. Record accident report. Resume normal traffic flow.',
    dispatchedUnits: ['PCR-08'],
    reportedAt: '17:50',
    reportedBy: 'Traffic Police Patrol',
    lastUpdated: '18:10',
  },
  {
    id: 'inc-208',
    type: 'construction',
    title: 'Water Main Replacement — Brigade Road',
    severity: 'low',
    status: 'in_progress',
    locationName: 'Brigade Road Junction, Near CVS',
    lat: 12.971,
    lng: 77.601,
    affectedRoads: ['Brigade Road'],
    impactedLanes: 1,
    estimatedDelayMin: 8,
    estimatedCongestionIncreasePct: 4,
    vehiclesImpacted: 60,
    description: 'BWSSB water main replacement work. Left lane closed during off-peak hours. Minimal peak impact.',
    recommendedAction: 'Deploy traffic cones. BWSSB crew on site. Minimal traffic management required.',
    dispatchedUnits: ['BWSSB Crew'],
    reportedAt: '14:00',
    reportedBy: 'BWSSB Work Order',
    lastUpdated: '18:00',
  },
];

// ── Helper: Generate next incident ID ──
export function getNextIncidentId(): string {
  return `inc-${Date.now()}`;
}

// ── Helper: Default recommended action by type ──
export function getDefaultRecommendedAction(type: IncidentType): string {
  const actions: Record<IncidentType, string> = {
    accident: 'Deploy traffic police and tow truck. Activate nearby detour. Broadcast citizen alert.',
    road_blockage: 'Clear obstruction. Divert traffic via parallel road. Deploy traffic cones.',
    breakdown: 'Deploy rescue/tow vehicle. Arrange passenger transfer if public transport.',
    construction: 'Deploy traffic cones and signage. Assign traffic police if peak hours.',
    flood: 'Deploy pump squad. Close affected road. Divert traffic via alternate route.',
    signal_failure: 'Deploy portable signal unit. Assign traffic police for manual control.',
  };
  return actions[type];
}
