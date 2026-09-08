import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { useRealtime } from '../context/RealtimeContext';
import { useApp } from '../context/AppContext';
import {
  Shield,
  Radio,
  Clock,
  Activity,
  AlertTriangle,
  Siren,
} from 'lucide-react';

const MODULE_TITLES: Record<string, string> = {
  '/admin/overview': 'Command Overview',
  '/admin/live-traffic': 'Live Traffic Monitor',
  '/admin/digital-twin': 'Digital Twin Simulation',
  '/admin/yolo-vision': 'YOLO Vision',
  '/admin/predictions': 'AI Predictions',
  '/admin/signal-optimization': 'Signal Optimization',
  '/admin/what-if': 'What-If Scenarios',
  '/admin/emergency': 'Emergency Corridor',
  '/admin/incidents': 'Incident Management',
  '/admin/analytics': 'Analytics Dashboard',
  '/admin/reports': 'Reports & Exports',
  '/admin/cities': 'City Management',
  '/admin/settings': 'System Settings',
};

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { snapshot, isRunning } = useRealtime();
  const { selectedCity } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const moduleTitle = MODULE_TITLES[location.pathname] || 'Command Center';
  const criticalCount = snapshot.junctions.filter(
    (j) => j.status === 'critical' || j.status === 'red'
  ).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

      {/* Admin Status Strip — unique to command center */}
      <div className="h-8 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between px-4 text-[10px] font-mono shrink-0">
        {/* Left: System Identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Shield className="w-3 h-3" />
            <span className="font-bold uppercase tracking-wider">Command Center</span>
          </div>
          <div className="h-3 w-[1px] bg-emerald-500/20" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-emerald-500">Module:</span>
            <span className="text-slate-200 font-bold">{moduleTitle}</span>
          </div>
        </div>

        {/* Center: Live Telemetry Summary */}
        <div className="hidden md:flex items-center gap-5 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isRunning ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-slate-500'}`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isRunning ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </span>
            <span className="text-emerald-400 font-bold">{isRunning ? 'LIVE' : 'PAUSED'}</span>
          </div>

          <span className="text-emerald-600">|</span>

          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>Congestion: <span className="text-slate-200 font-bold">{snapshot.cityStats.cityCongestionIndex}%</span></span>
          </div>

          <span className="text-emerald-600">|</span>

          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Incidents: <span className="text-amber-300 font-bold">{snapshot.cityStats.activeIncidents}</span></span>
          </div>

          {criticalCount > 0 && (
            <>
              <span className="text-emerald-600">|</span>
              <div className="flex items-center gap-1">
                <Siren className="w-3 h-3 text-red-400" />
                <span className="text-red-400 font-bold">Critical: {criticalCount}</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Clock + City */}
        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 font-bold">{selectedCity}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-300 font-bold tabular-nums">
              {currentTime.toLocaleTimeString('en-IN', { hour12: false })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar />
        </div>

        {/* Mobile Slide-Out Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 h-full">
              <Sidebar onItemClick={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Mobile hamburger (shown only on mobile) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 lg:p-8">
          {/* Page Header — command center style */}
          <div className="mb-4 flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className="text-emerald-500">BT</span>
            <span>/</span>
            <span className="text-emerald-400">admin</span>
            <span>/</span>
            <span className="text-slate-300">{location.pathname.split('/').pop()}</span>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
