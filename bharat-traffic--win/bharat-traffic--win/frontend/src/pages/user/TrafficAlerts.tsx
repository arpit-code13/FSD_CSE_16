import React, { useEffect, useState } from 'react';
import { trafficService } from '../../services/api';
import type { Incident } from '../../types/traffic';
import { AlertTriangle, Plus, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const UserTrafficAlerts: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState<Incident['type']>('accident');
  const [newDesc, setNewDesc] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState('');

  useEffect(() => {
    trafficService.getIncidents().then(setIncidents);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await trafficService.reportIncident({
      title: newTitle,
      type: newType,
      severity: 'medium',
      locationName: newLocation,
      lat: 12.935,
      lng: 77.625,
      description: newDesc,
      impactedLanes: 1,
      estimatedDelayMin: 15,
    });
    setIncidents([created, ...incidents]);
    setSubmittedMessage('Alert reported successfully to Traffic Control!');
    setShowReportForm(false);
    setNewTitle('');
    setNewLocation('');
    setNewDesc('');
    setTimeout(() => setSubmittedMessage(''), 4000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Citizen Traffic Alerts & Hazard Feed
          </h2>
          <p className="text-xs text-slate-400">
            Real-time road closures, accidents, waterlogging, and crowd-reported hazards.
          </p>
        </div>
        <button
          onClick={() => setShowReportForm(!showReportForm)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Report Traffic Hazard
        </button>
      </div>

      {submittedMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {submittedMessage}
        </div>
      )}

      {/* Incident Report Modal / Form */}
      {showReportForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl shadow-2xl space-y-4 max-w-2xl"
        >
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Report New Traffic Hazard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Hazard Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Waterlogging near Silk Board Flyover"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Hazard Category
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as Incident['type'])}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
              >
                <option value="accident">Accident / Collision</option>
                <option value="waterlogging">Waterlogging / Flooding</option>
                <option value="breakdown">Vehicle Breakdown</option>
                <option value="construction">Road Construction</option>
                <option value="vip_movement">VIP Movement / Block</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Location Landmark
            </label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g. Outer Ring Road Bellandur"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Description & Details
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              placeholder="Describe lane blockage or severity..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowReportForm(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Report
            </button>
          </div>
        </form>
      )}

      {/* Alert Feed Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3 hover:border-slate-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  inc.severity === 'critical'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : inc.severity === 'high'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}
              >
                {inc.severity} Severity
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{inc.reportedAt}</span>
            </div>

            <h3 className="text-sm font-bold text-slate-100">{inc.title}</h3>
            <p className="text-xs text-slate-400">{inc.description}</p>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-300 font-mono">
              <span>Impact: {inc.impactedLanes} Lanes</span>
              <span className="text-amber-400 font-bold">+{inc.estimatedDelayMin} min delay</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
