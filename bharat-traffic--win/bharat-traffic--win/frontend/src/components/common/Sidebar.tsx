import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import type { AdminModule } from '../../routes/adminRoutes';
import { ADMIN_MODULE_LABELS } from '../../routes/adminRoutes';
import {
  LayoutDashboard,
  Map,
  Navigation,
  AlertTriangle,
  TrendingUp,
  History,
  Settings,
  Cpu,
  Sliders,
  GitPullRequest,
  Siren,
  FileSpreadsheet,
  BarChart3,
  Building2,
  Eye,
  X,
} from 'lucide-react';

interface SidebarProps {
  onItemClick?: () => void;
}

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarGroup {
  module: AdminModule;
  items: SidebarItem[];
}

const ADMIN_GROUPS: SidebarGroup[] = [
  {
    module: 'overview',
    items: [
      { label: 'Command Overview', path: '/admin/overview', icon: LayoutDashboard },
    ],
  },
  {
    module: 'monitoring',
    items: [
      { label: 'Live Traffic', path: '/admin/live-traffic', icon: Map },
      { label: 'Digital Twin', path: '/admin/digital-twin', icon: Cpu },
      { label: 'YOLO Vision', path: '/admin/yolo-vision', icon: Eye, badge: 'NEW' },
      { label: 'Predictions', path: '/admin/predictions', icon: TrendingUp },
    ],
  },
  {
    module: 'optimization',
    items: [
      { label: 'Signal Optimization', path: '/admin/signal-optimization', icon: Sliders },
      { label: 'What-If Scenarios', path: '/admin/what-if', icon: GitPullRequest },
    ],
  },
  {
    module: 'response',
    items: [
      { label: 'Emergency Corridor', path: '/admin/emergency', icon: Siren },
      { label: 'Incidents', path: '/admin/incidents', icon: AlertTriangle },
    ],
  },
  {
    module: 'intelligence',
    items: [
      { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      { label: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
    ],
  },

  {
    module: 'system',
    items: [
      { label: 'City Management', path: '/admin/cities', icon: Building2 },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

const USER_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', path: '/user/dashboard', icon: LayoutDashboard },
  { label: 'Live Traffic', path: '/user/live-traffic', icon: Map },
  { label: 'Route Planner', path: '/user/routes', icon: Navigation },
  { label: 'Traffic Alerts', path: '/user/alerts', icon: AlertTriangle },
  { label: 'Predictions', path: '/user/predictions', icon: TrendingUp },
  { label: 'My Trips', path: '/user/trips', icon: History },
  { label: 'Settings', path: '/user/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { role } = useAuth();
  const { user, isAuthenticated } = useAuth();
  const { isRunning, snapshot } = useRealtime();

  const isAdmin = role === 'admin';

  return (
    <aside
      className={`w-64 h-full border-r flex flex-col shrink-0 ${
        isAdmin
          ? 'border-emerald-500/20 bg-slate-900/95'
          : 'border-slate-800 bg-slate-900/90'
      } backdrop-blur-md`}
    >
      {/* Sidebar Header */}
      <div
        className={`p-3 text-[11px] font-bold uppercase tracking-wider border-b flex items-center justify-between ${
          isAdmin
            ? 'text-emerald-400/80 border-emerald-500/15 bg-emerald-500/5'
            : 'text-slate-400 border-slate-800/60'
        }`}
      >
        <span>{isAdmin ? 'Command Modules' : 'Navigation'}</span>
        {onItemClick && (
          <button onClick={onItemClick} className="md:hidden p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Content */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {isAdmin ? (
          /* Admin: Grouped navigation */
          ADMIN_GROUPS.map((group) => (
            <div key={group.module} className="mb-3">
              <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-600/70 font-mono">
                {ADMIN_MODULE_LABELS[group.module]}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onItemClick}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          /* User: Flat navigation */
          USER_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })
        )}
      </nav>

      {/* Sidebar Footer */}
      <div
        className={`p-3 border-t text-[11px] text-slate-400 space-y-1 font-mono ${
          isAdmin ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-slate-800/80 bg-slate-950/40'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={isAdmin ? 'text-emerald-500' : 'text-cyan-400'}>Portal:</span>
          <span className="text-slate-200 font-bold uppercase">{role}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={isAdmin ? 'text-emerald-500' : 'text-cyan-400'}>Backend:</span>
          <span className={`font-bold ${isAuthenticated ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isAuthenticated ? 'CONNECTED' : 'NO TOKEN'}
          </span>
        </div>
        {isAdmin && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-emerald-500">Telemetry:</span>
              <span className={`font-bold flex items-center gap-1 ${isRunning ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isRunning ? '#34d399' : '#64748b' }} />
                {isRunning ? 'SIM ACTIVE' : 'PAUSED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-500">Junctions:</span>
              <span className="text-slate-200 font-bold">{snapshot.junctions.length}</span>
            </div>
          </>
        )}
        {user && (
          <div className="flex items-center justify-between">
            <span className={isAdmin ? 'text-emerald-500' : 'text-cyan-400'}>User:</span>
            <span className="text-slate-200 font-bold truncate max-w-[100px]">{user.email}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
