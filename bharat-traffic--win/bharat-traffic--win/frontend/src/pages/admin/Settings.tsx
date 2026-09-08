import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [fastApiUrl, setFastApiUrl] = useState('http://localhost:8000/api');
  const [sumoHost, setSumoHost] = useState('localhost:8873');
  const [autoOverride, setAutoOverride] = useState(true);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-slate-100 font-mono flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-400" />
          COMMAND CENTER SYSTEM CONFIGURATION & API KEYS
        </h2>
        <p className="text-xs text-slate-400">
          FastAPI backend connectivity, SUMO TraCI port endpoints, and emergency threshold parameters.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
            Backend Endpoint Settings (FastAPI)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-mono font-semibold block mb-1">
                FastAPI Base API URL
              </label>
              <input
                type="text"
                value={fastApiUrl}
                onChange={(e) => setFastApiUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-mono font-semibold block mb-1">
                SUMO TraCI Port Host
              </label>
              <input
                type="text"
                value={sumoHost}
                onChange={(e) => setSumoHost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
            Automated Override Triggers
          </h4>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200">Auto-Green Corridor Pre-emption</span>
              <p className="text-xs text-slate-400">Automatically switch signal phases to green when emergency vehicle GPS is within 500m.</p>
            </div>
            <input
              type="checkbox"
              checked={autoOverride}
              onChange={(e) => setAutoOverride(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg">
            Save Command Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
