import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Volume2 } from 'lucide-react';

export const UserSettings: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [ecoMode, setEcoMode] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          Citizen Preferences & Settings
        </h2>
        <p className="text-xs text-slate-400">
          Customize traffic alert thresholds, routing priorities, and notification modes.
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between py-2 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              Live Traffic Push Alerts
            </h4>
            <p className="text-xs text-slate-400">Receive instant popups when high severity hazards occur on your saved route.</p>
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Eco-Friendly Route Prioritization
            </h4>
            <p className="text-xs text-slate-400">Always suggest routes with lowest carbon footprint & fuel burn.</p>
          </div>
          <input
            type="checkbox"
            checked={ecoMode}
            onChange={(e) => setEcoMode(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              Audio Warning Chimes
            </h4>
            <p className="text-xs text-slate-400">Play chime when approaching red junction or waterlogged road.</p>
          </div>
          <input
            type="checkbox"
            checked={soundAlerts}
            onChange={(e) => setSoundAlerts(e.target.checked)}
            className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
