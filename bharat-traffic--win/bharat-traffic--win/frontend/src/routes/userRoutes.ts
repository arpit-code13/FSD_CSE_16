export interface RouteConfig {
  path: string;
  name: string;
}

export const USER_ROUTES: RouteConfig[] = [
  { path: '/user/dashboard', name: 'Dashboard' },
  { path: '/user/live-traffic', name: 'Live Traffic' },
  { path: '/user/routes', name: 'Route Planner' },
  { path: '/user/alerts', name: 'Traffic Alerts' },
  { path: '/user/predictions', name: 'Predictions' },
  { path: '/user/trips', name: 'My Trips' },
  { path: '/user/settings', name: 'Settings' },
];
