import React, { useState, useMemo } from 'react';
import {
  MOCK_REPORTS,
  REPORT_TYPE_CONFIG,
  MOCK_CITIES_FOR_REPORTS,
  generateReportCSV,
  type ReportType,
  type ReportData,
} from '../../mock/mockReports';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  MapPin,
  Filter,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Cpu,
  Activity,
  Eye,
} from 'lucide-react';

const TYPE_ICONS: Record<ReportType, React.ComponentType<{ className?: string }>> = {
  traffic: BarChart3,
  incidents: AlertTriangle,
  signals: Activity,
  simulations: Cpu,
  performance: TrendingUp,
};

const STATUS_CONFIG = {
  ready: { label: 'Ready', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  generating: { label: 'Generating', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Loader2 },
  scheduled: { label: 'Scheduled', badge: 'bg-slate-800 text-slate-400 border-slate-700', icon: Clock },
};

export const AdminReports: React.FC = () => {
  const { addToast } = useToast();
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');
  const [filterCity, setFilterCity] = useState('All Cities');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  const filtered = useMemo(() => {
    return MOCK_REPORTS.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterCity !== 'All Cities' && r.city !== filterCity && r.city !== 'All Cities') return false;
      if (filterDate && r.date !== filterDate) return false;
      if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [filterType, filterCity, filterDate, searchQuery]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: MOCK_REPORTS.length };
    Object.keys(REPORT_TYPE_CONFIG).forEach((t) => {
      counts[t] = MOCK_REPORTS.filter((r) => r.type === t).length;
    });
    return counts;
  }, []);

  const handleExport = (report: ReportData) => {
    if (report.status !== 'ready') {
      addToast({ type: 'warning', title: 'Not Ready', message: `${report.title} is still ${report.status}`, duration: 3000 });
      return;
    }
    const csv = generateReportCSV(report);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}_${report.title.replace(/\s+/g, '_').toLowerCase()}.${report.format}`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Export Started', message: `${report.title} (${report.size})`, duration: 4000 });
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            REPORTS & EXPORTS
          </h2>
          <p className="text-[11px] text-slate-400">
            Traffic, incident, signal, simulation, and performance reports — filter, preview, and export.
          </p>
        </div>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          {filtered.length} reports found
        </div>
      </div>

      {/* ── Type Filter Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
            filterType === 'all' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          All ({typeCounts.all})
        </button>
        {(Object.entries(REPORT_TYPE_CONFIG) as [ReportType, typeof REPORT_TYPE_CONFIG[ReportType]][]).map(([key, cfg]) => {
          const Icon = TYPE_ICONS[key];
          return (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterType === key ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label} ({typeCounts[key] || 0})
            </button>
          );
        })}
      </div>

      {/* ── Filters Row ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-slate-500" />
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            {MOCK_CITIES_FOR_REPORTS.map((c) => (
              <option key={c} value={c} className="bg-slate-900">{c}</option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-slate-500" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Clear Filters */}
        {(filterType !== 'all' || filterCity !== 'All Cities' || filterDate || searchQuery) && (
          <button
            onClick={() => { setFilterType('all'); setFilterCity('All Cities'); setFilterDate(''); setSearchQuery(''); }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1"
          >
            <Filter className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Report List + Detail Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Report List */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.map((report) => {
            const typeCfg = REPORT_TYPE_CONFIG[report.type];
            const TypeIcon = TYPE_ICONS[report.type];
            const statusCfg = STATUS_CONFIG[report.status];
            const StatusIcon = statusCfg.icon;
            const isSelected = selectedReport?.id === report.id;

            return (
              <div
                key={report.id}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => setSelectedReport(isSelected ? null : report)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      report.status === 'ready' ? `bg-${typeCfg.color}-500/10` : 'bg-slate-800'
                    }`}>
                      <TypeIcon className={`w-4 h-4 ${report.status === 'ready' ? `text-${typeCfg.color}-400` : 'text-slate-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{report.title}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${statusCfg.badge} shrink-0`}>
                          <StatusIcon className={`w-2.5 h-2.5 inline mr-0.5 ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                        <span>{typeCfg.icon} {typeCfg.label}</span>
                        <span>·</span>
                        <span>{report.city}</span>
                        <span>·</span>
                        <span>{report.date}</span>
                        <span>·</span>
                        <span>{report.period}</span>
                        {report.rows > 0 && <><span>·</span><span>{report.rows.toLocaleString()} rows</span></>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(report); }}
                    disabled={report.status !== 'ready'}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                      report.status === 'ready'
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-3 h-3" />
                    {report.status === 'ready' ? `Export ${report.format.toUpperCase()}` : report.status === 'generating' ? 'Generating...' : 'Scheduled'}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs font-mono space-y-2">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600" />
              <p>No reports match your filters</p>
            </div>
          )}
        </div>

        {/* ── Detail Panel ── */}
        <div className="min-h-0">
          {selectedReport ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden sticky top-24">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Report Preview</span>
                </div>
                <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
              </div>

              <div className="p-4 space-y-3">
                {/* Title */}
                <h4 className="text-sm font-bold text-slate-100">{selectedReport.title}</h4>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2">
                  <MetaItem label="Type" value={REPORT_TYPE_CONFIG[selectedReport.type].label} />
                  <MetaItem label="City" value={selectedReport.city} />
                  <MetaItem label="Date" value={selectedReport.date} />
                  <MetaItem label="Period" value={selectedReport.period} />
                  <MetaItem label="Format" value={selectedReport.format.toUpperCase()} />
                  <MetaItem label="Size" value={selectedReport.size} />
                  <MetaItem label="Rows" value={selectedReport.rows > 0 ? selectedReport.rows.toLocaleString() : '—'} />
                  <MetaItem label="Generated" value={selectedReport.generatedAt} />
                </div>

                {/* Summary */}
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Summary</span>
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed">{selectedReport.summary}</p>
                </div>

                {/* Status */}
                <div className={`p-2 rounded-lg border ${STATUS_CONFIG[selectedReport.status].badge.split(' ')[0]} border-${selectedReport.status === 'ready' ? 'emerald' : selectedReport.status === 'generating' ? 'amber' : 'slate'}-500/20`}>
                  <span className="text-[10px] font-mono font-bold flex items-center gap-1.5">
                    {selectedReport.status === 'ready' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {selectedReport.status === 'generating' && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                    {selectedReport.status === 'scheduled' && <Clock className="w-3 h-3 text-slate-400" />}
                    Status: {STATUS_CONFIG[selectedReport.status].label}
                  </span>
                </div>

                {/* Export Button */}
                <button
                  onClick={() => handleExport(selectedReport)}
                  disabled={selectedReport.status !== 'ready'}
                  className={`w-full py-2.5 rounded-xl text-[11px] font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                    selectedReport.status === 'ready'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export {selectedReport.format.toUpperCase()} ({selectedReport.size})
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 text-center space-y-2 sticky top-24">
              <Eye className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-xs font-bold text-slate-300">Select a Report</h4>
              <p className="text-[10px] text-slate-500 font-mono">Click any report to preview details and export</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Meta Item ──
const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
    <span className="text-[8px] font-mono text-slate-500 uppercase block">{label}</span>
    <span className="text-[11px] font-mono text-slate-200 font-bold">{value}</span>
  </div>
);
