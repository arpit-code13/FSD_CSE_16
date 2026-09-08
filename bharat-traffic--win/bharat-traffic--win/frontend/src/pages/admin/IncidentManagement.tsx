import React, { useState, useEffect } from 'react';
import {
  MOCK_INCIDENTS,
  INCIDENT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  getNextIncidentId,
  getDefaultRecommendedAction,
  type IncidentData,
  type IncidentType,
  type IncidentSeverity,
  type INCIDENT_STATUS,
} from '../../mock/mockIncidents';
import { useToast } from '../../context/ToastContext';
import apiClient from '../../services/apiClient';
import {
  AlertTriangle,
  Plus,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  X,
  Shield,
  Activity,
  Send,
  Filter,
  Siren,
} from 'lucide-react';

const STATUS_CONFIG: Record<INCIDENT_STATUS, { label: string; badge: string; color: string }> = {
  reported: { label: 'Reported', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', color: 'amber' },
  dispatched: { label: 'Dispatched', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', color: 'cyan' },
  in_progress: { label: 'In Progress', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', color: 'purple' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', color: 'emerald' },
};

export const AdminIncidentManagement: React.FC = () => {
  const { addToast } = useToast();
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [, setLoading] = useState(true);

  // Fetch incidents from real backend on mount
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await apiClient.get('/incidents');
        const data = res.data as any[];
        if (data && data.length > 0) {
          // Map backend severity to frontend severity
          const severityMap: Record<string, IncidentSeverity> = { minor: 'low', low: 'low', medium: 'medium', moderate: 'medium', major: 'high', high: 'high', critical: 'critical' };
          // Map backend incident_type to frontend type
          const typeMap: Record<string, IncidentType> = { accident: 'accident', breakdown: 'breakdown', construction: 'construction', flood: 'flood', signal_failure: 'signal_failure', blockage: 'road_blockage' };
          const statusMap: Record<string, INCIDENT_STATUS> = { active: 'reported', reported: 'reported', dispatched: 'dispatched', in_progress: 'in_progress', resolved: 'resolved' };
          const mapped: IncidentData[] = data.map((inc: any) => ({
            id: `inc-${inc.id}`,
            type: (typeMap[inc.incident_type] || 'accident') as IncidentType,
            title: inc.description || `${inc.incident_type} incident`,
            severity: (severityMap[inc.severity] || 'medium') as IncidentSeverity,
            status: (statusMap[inc.status] || 'reported') as INCIDENT_STATUS,
            locationName: `Location ${inc.latitude?.toFixed(4) || 'N/A'}, ${inc.longitude?.toFixed(4) || 'N/A'}`,
            lat: inc.latitude || 12.95,
            lng: inc.longitude || 77.62,
            affectedRoads: [],
            impactedLanes: 1,
            estimatedDelayMin: inc.severity === 'critical' ? 30 : inc.severity === 'high' ? 20 : 15,
            estimatedCongestionIncreasePct: inc.severity === 'critical' ? 25 : inc.severity === 'high' ? 15 : 10,
            vehiclesImpacted: inc.severity === 'critical' ? 500 : inc.severity === 'high' ? 200 : 100,
            description: inc.description || '',
            recommendedAction: getDefaultRecommendedAction(inc.incident_type || 'accident'),
            dispatchedUnits: [],
            reportedAt: inc.reported_at ? new Date(inc.reported_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Unknown',
            reportedBy: 'System',
            lastUpdated: inc.updated_at ? new Date(inc.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Unknown',
          }));
          setIncidents(mapped);
        } else {
          setIncidents([...MOCK_INCIDENTS]);
        }
      } catch {
        setIncidents([...MOCK_INCIDENTS]);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterType, setFilterType] = useState<IncidentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<INCIDENT_STATUS | 'all'>('all');

  // Create form state
  const [newType, setNewType] = useState<IncidentType>('accident');
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('medium');
  const [newRoads, setNewRoads] = useState('');

  const selected = incidents.find((i) => i.id === selectedId) || null;

  // Filters
  const filtered = incidents.filter((i) => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    total: incidents.length,
    reported: incidents.filter((i) => i.status === 'reported').length,
    dispatched: incidents.filter((i) => i.status === 'dispatched').length,
    inProgress: incidents.filter((i) => i.status === 'in_progress').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
  };

  // Actions
  const handleCreate = async () => {
    if (!newTitle || !newLocation) return;
    try {
      const res = await apiClient.post('/incidents', {
        city_id: 1,
        incident_type: newType,
        severity: newSeverity,
        description: newDescription || newTitle,
        latitude: 12.95,
        longitude: 77.62,
      });
      const created = res.data as any;
      const inc: IncidentData = {
        id: `inc-${created.id}`,
        type: newType,
        title: newTitle,
        severity: newSeverity,
        status: 'reported',
        locationName: newLocation,
        lat: created.latitude || 12.95,
        lng: created.longitude || 77.62,
        affectedRoads: newRoads.split(',').map((r) => r.trim()).filter(Boolean),
        impactedLanes: 1,
        estimatedDelayMin: 15,
        estimatedCongestionIncreasePct: 10,
        vehiclesImpacted: 100,
        description: newDescription,
        recommendedAction: getDefaultRecommendedAction(newType),
        dispatchedUnits: [],
        reportedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        reportedBy: 'Admin',
        lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      };
      setIncidents([inc, ...incidents]);
      addToast({ type: 'success', title: 'Incident Created (Backend)', message: `${inc.title} — ${inc.severity} severity`, duration: 4000 });
    } catch {
      const inc: IncidentData = {
        id: getNextIncidentId(),
        type: newType,
        title: newTitle,
        severity: newSeverity,
        status: 'reported',
        locationName: newLocation,
        lat: 12.95,
        lng: 77.62,
        affectedRoads: newRoads.split(',').map((r) => r.trim()).filter(Boolean),
        impactedLanes: 1,
        estimatedDelayMin: 15,
        estimatedCongestionIncreasePct: 10,
        vehiclesImpacted: 100,
        description: newDescription,
        recommendedAction: getDefaultRecommendedAction(newType),
        dispatchedUnits: [],
        reportedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        reportedBy: 'Manual Entry',
        lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      };
      setIncidents([inc, ...incidents]);
      addToast({ type: 'success', title: 'Incident Created (Local)', message: `${inc.title} — ${inc.severity} severity`, duration: 4000 });
    }
    setShowCreateForm(false);
    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
    setNewRoads('');
  };

  const handleUpdateStatus = async (id: string, newStatus: INCIDENT_STATUS) => {
    // Try to update via backend PATCH
    const numericId = id.replace('inc-', '');
    try {
      await apiClient.patch(`/incidents/${numericId}`, { status: newStatus });
    } catch { /* proceed with local update */ }
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus, lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) } : i))
    );
    const inc = incidents.find((i) => i.id === id);
    addToast({ type: newStatus === 'resolved' ? 'success' : 'info', title: `Incident ${STATUS_CONFIG[newStatus].label}`, message: `${inc?.title}`, duration: 4000 });
  };

  const handleDispatch = (id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? {
        ...i,
        status: 'dispatched' as INCIDENT_STATUS,
        dispatchedUnits: [...i.dispatchedUnits, `PCR-${Math.floor(Math.random() * 99)}`],
        lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      } : i))
    );
    addToast({ type: 'info', title: 'Unit Dispatched', message: 'Response unit en route to incident location', duration: 4000 });
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            INCIDENT MANAGEMENT
          </h2>
          <p className="text-[11px] text-slate-400">
            Create, track, dispatch, and resolve road incidents across the city network.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-lg flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          CREATE INCIDENT
        </button>
      </div>

      {/* ── Status Counts ── */}
      <div className="grid grid-cols-5 gap-2">
        {([
          { label: 'Total', count: counts.total, icon: AlertTriangle, color: 'text-slate-300' },
          { label: 'Reported', count: counts.reported, icon: Clock, color: 'text-amber-400' },
          { label: 'Dispatched', count: counts.dispatched, icon: Send, color: 'text-cyan-400' },
          { label: 'In Progress', count: counts.inProgress, icon: Activity, color: 'text-purple-400' },
          { label: 'Resolved', count: counts.resolved, icon: CheckCircle2, color: 'text-emerald-400' },
        ] as const).map((item) => (
          <div key={item.label} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <item.icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
            <span className={`text-lg font-bold font-mono ${item.color}`}>{item.count}</span>
            <span className="text-[9px] font-mono text-slate-500 block">{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── Create Form ── */}
      {showCreateForm && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> New Incident Report
            </h3>
            <button onClick={() => setShowCreateForm(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as IncidentType)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500">
                {Object.entries(INCIDENT_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key} className="bg-slate-900">{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Severity</label>
              <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500">
                {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Title</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Brief incident title" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Location</label>
              <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Landmark or address" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Affected Roads (comma-separated)</label>
              <input value={newRoads} onChange={(e) => setNewRoads(e.target.value)} placeholder="ORR South, Bellandur Link Rd" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Description</label>
            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} placeholder="Detailed description of the incident..." className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-[10px] font-mono font-bold rounded-lg">Cancel</button>
            <button onClick={handleCreate} disabled={!newTitle || !newLocation} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Create Incident
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
          <button onClick={() => setFilterType('all')} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${filterType === 'all' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'}`}>All</button>
          {(Object.entries(INCIDENT_TYPE_CONFIG) as [IncidentType, typeof INCIDENT_TYPE_CONFIG[IncidentType]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => setFilterType(key)} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${filterType === key ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'}`}>
              {cfg.icon}
            </button>
          ))}
        </div>
        <div className="h-4 w-[1px] bg-slate-800" />
        <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
          <button onClick={() => setFilterStatus('all')} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${filterStatus === 'all' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'}`}>All</button>
          {(['reported', 'dispatched', 'in_progress', 'resolved'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize ${filterStatus === s ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-slate-500 ml-1">{filtered.length} incidents</span>
      </div>

      {/* ── Incident List + Detail Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incident List */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.map((inc) => {
            const typeCfg = INCIDENT_TYPE_CONFIG[inc.type] || { icon: '⚠️', label: inc.type };
            const statusCfg = STATUS_CONFIG[inc.status] || { label: inc.status, badge: 'bg-slate-800 text-slate-400 border-slate-700', color: 'slate' };
            const sevCfg = SEVERITY_CONFIG[inc.severity] || { label: inc.severity, badge: 'bg-slate-800 text-slate-400 border-slate-700' };
            return (
              <button
                key={inc.id}
                onClick={() => setSelectedId(selectedId === inc.id ? null : inc.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedId === inc.id ? 'bg-slate-900 border-amber-500/30' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeCfg.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{inc.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${sevCfg.badge}`}>{inc.severity.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[200px]">{inc.locationName}</span>
                        <span>·</span>
                        <span className={statusCfg.badge.split(' ')[1]}>{statusCfg.label}</span>
                        <span>·</span>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{inc.reportedAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-amber-400 font-bold">+{inc.estimatedDelayMin}m</span>
                    <span className="text-[9px] font-mono text-slate-500 block">{inc.vehiclesImpacted} vehicles</span>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">No incidents match filters</div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="min-h-0">
          {selected ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden sticky top-24">
              {/* Detail Header */}
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{INCIDENT_TYPE_CONFIG[selected.type].icon}</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">{selected.title}</h3>
                    <span className="text-[9px] font-mono text-slate-500">{selected.id}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {/* Status & Severity */}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${STATUS_CONFIG[selected.status]?.badge || 'bg-slate-800 text-slate-400 border-slate-700'}`}>{STATUS_CONFIG[selected.status]?.label?.toUpperCase() || selected.status.toUpperCase()}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${SEVERITY_CONFIG[selected.severity]?.badge || 'bg-slate-800 text-slate-400 border-slate-700'}`}>{selected.severity.toUpperCase()}</span>
                </div>

                {/* Location */}
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Location</span>
                  <span className="text-[11px] font-mono text-slate-200 block">{selected.locationName}</span>
                </div>

                {/* Affected Roads */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Affected Roads</span>
                  <div className="flex flex-wrap gap-1">
                    {selected.affectedRoads.map((road, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-mono text-amber-300">{road}</span>
                    ))}
                  </div>
                </div>

                {/* Impact Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-center">
                    <span className="text-[8px] font-mono text-slate-500 block">Delay</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">+{selected.estimatedDelayMin}m</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-center">
                    <span className="text-[8px] font-mono text-slate-500 block">Congestion</span>
                    <span className="text-sm font-bold text-red-400 font-mono">+{selected.estimatedCongestionIncreasePct}%</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-center">
                    <span className="text-[8px] font-mono text-slate-500 block">Vehicles</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">{selected.vehiclesImpacted}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Description</span>
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed">{selected.description}</p>
                </div>

                {/* Recommended Action */}
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> Recommended Action
                  </span>
                  <p className="text-[10px] font-mono text-slate-300">{selected.recommendedAction}</p>
                </div>

                {/* Dispatched Units */}
                {selected.dispatchedUnits.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Dispatched Units</span>
                    <div className="flex flex-wrap gap-1">
                      {selected.dispatchedUnits.map((unit, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-mono text-emerald-300">{unit}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="text-[9px] font-mono text-slate-500 space-y-0.5">
                  <div>Reported: <span className="text-slate-300">{selected.reportedAt}</span> by <span className="text-slate-300">{selected.reportedBy}</span></div>
                  <div>Last Updated: <span className="text-slate-300">{selected.lastUpdated}</span></div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  {selected.status === 'reported' && (
                    <button onClick={() => handleDispatch(selected.id)} className="py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5">
                      <Send className="w-3 h-3" /> Dispatch Unit
                    </button>
                  )}
                  {selected.status === 'dispatched' && (
                    <button onClick={() => handleUpdateStatus(selected.id, 'in_progress')} className="py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5">
                      <Siren className="w-3 h-3" /> Start Response
                    </button>
                  )}
                  {(selected.status === 'in_progress' || selected.status === 'dispatched') && (
                    <button onClick={() => handleUpdateStatus(selected.id, 'resolved')} className="py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  )}
                  {selected.status === 'resolved' && (
                    <div className="col-span-2 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center text-[10px] font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" /> Incident Resolved
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 text-center space-y-2 sticky top-24">
              <Eye className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-xs font-bold text-slate-300">Select an Incident</h4>
              <p className="text-[10px] text-slate-500 font-mono">Click any incident to view details and take action</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
