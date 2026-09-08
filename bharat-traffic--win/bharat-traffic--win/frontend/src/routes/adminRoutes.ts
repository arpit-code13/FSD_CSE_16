export interface RouteConfig {
  path: string;
  name: string;
  module: string;
}

export type AdminModule = 'overview' | 'monitoring' | 'optimization' | 'response' | 'intelligence' | 'system';

export const ADMIN_MODULE_LABELS: Record<AdminModule, string> = {
  overview: 'Overview',
  monitoring: 'Monitoring',
  optimization: 'Optimization',
  response: 'Response',
  intelligence: 'Intelligence',
  system: 'System',
};

export const ADMIN_ROUTES: RouteConfig[] = [
  { path: '/admin/overview', name: 'Overview', module: 'overview' },
  { path: '/admin/live-traffic', name: 'Live Traffic', module: 'monitoring' },
  { path: '/admin/digital-twin', name: 'Digital Twin', module: 'monitoring' },
  { path: '/admin/yolo-vision', name: 'YOLO Vision', module: 'monitoring' },
  { path: '/admin/predictions', name: 'Predictions', module: 'monitoring' },
  { path: '/admin/signal-optimization', name: 'Signal Optimization', module: 'optimization' },
  { path: '/admin/what-if', name: 'What-If Scenarios', module: 'optimization' },
  { path: '/admin/emergency', name: 'Emergency Corridor', module: 'response' },
  { path: '/admin/incidents', name: 'Incidents', module: 'response' },
  { path: '/admin/analytics', name: 'Analytics', module: 'intelligence' },
  { path: '/admin/reports', name: 'Reports', module: 'intelligence' },
  { path: '/admin/cities', name: 'City Management', module: 'system' },

  { path: '/admin/settings', name: 'Settings', module: 'system' },
];
