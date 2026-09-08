import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserLayout } from '../layouts/UserLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Auth pages
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';

// User views
import { UserDashboard } from '../pages/user/Dashboard';
import { UserLiveTraffic } from '../pages/user/LiveTraffic';
import { UserRoutePlanner } from '../pages/user/RoutePlanner';
import { UserTrafficAlerts } from '../pages/user/TrafficAlerts';
import { UserPredictions } from '../pages/user/Predictions';
import { UserMyTrips } from '../pages/user/MyTrips';
import { UserSettings } from '../pages/user/Settings';

// Admin views
import { AdminOverview } from '../pages/admin/Overview';
import { AdminLiveTraffic } from '../pages/admin/LiveTraffic';
import { AdminDigitalTwin } from '../pages/admin/DigitalTwin';
import { AdminYoloVision } from '../pages/admin/YoloVision';
import { AdminPredictions } from '../pages/admin/Predictions';
import { AdminSignalOptimization } from '../pages/admin/SignalOptimization';
import { AdminWhatIfScenarios } from '../pages/admin/WhatIfScenarios';
import { AdminEmergencyCorridor } from '../pages/admin/EmergencyCorridor';
import { AdminIncidentManagement } from '../pages/admin/IncidentManagement';
import { AdminAnalytics } from '../pages/admin/Analytics';
import { AdminReports } from '../pages/admin/Reports';
import { AdminCityManagement } from '../pages/admin/CityManagement';
import { AdminSettings } from '../pages/admin/Settings';

export const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Default Landing Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* User Routes inside UserLayout */}
        <Route element={<UserLayout />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/live-traffic" element={<UserLiveTraffic />} />
          <Route path="/user/routes" element={<UserRoutePlanner />} />
          <Route path="/user/route-planner" element={<Navigate to="/user/routes" replace />} />
          <Route path="/user/alerts" element={<UserTrafficAlerts />} />
          <Route path="/user/predictions" element={<UserPredictions />} />
          <Route path="/user/trips" element={<UserMyTrips />} />
          <Route path="/user/my-trips" element={<Navigate to="/user/trips" replace />} />
          <Route path="/user/settings" element={<UserSettings />} />
        </Route>

        {/* Admin Routes inside AdminLayout */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<Navigate to="/admin/overview" replace />} />
          <Route path="/admin/overview" element={<AdminOverview />} />
          <Route path="/admin/live-traffic" element={<AdminLiveTraffic />} />
          <Route path="/admin/digital-twin" element={<AdminDigitalTwin />} />
          <Route path="/admin/yolo-vision" element={<AdminYoloVision />} />
          <Route path="/admin/predictions" element={<AdminPredictions />} />
          <Route path="/admin/signal-optimization" element={<AdminSignalOptimization />} />
          <Route path="/admin/what-if" element={<AdminWhatIfScenarios />} />
          <Route path="/admin/emergency" element={<AdminEmergencyCorridor />} />
          <Route path="/admin/emergency-corridor" element={<Navigate to="/admin/emergency" replace />} />
          <Route path="/admin/incidents" element={<AdminIncidentManagement />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/cities" element={<AdminCityManagement />} />
          <Route path="/admin/city-management" element={<Navigate to="/admin/cities" replace />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};
