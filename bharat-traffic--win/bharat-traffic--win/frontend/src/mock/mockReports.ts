// ── Reports Mock Data ──

export type ReportType = 'traffic' | 'incidents' | 'signals' | 'simulations' | 'performance';

export type ReportFormat = 'csv' | 'pdf' | 'xlsx';

export interface ReportData {
  id: string;
  title: string;
  type: ReportType;
  city: string;
  date: string;
  generatedAt: string;
  size: string;
  format: ReportFormat;
  status: 'ready' | 'generating' | 'scheduled';
  summary: string;
  rows: number;
  period: string;
}

export const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string; color: string; description: string }> = {
  traffic: { label: 'Traffic', icon: '📊', color: 'cyan', description: 'Congestion, speed, flow, density metrics' },
  incidents: { label: 'Incidents', icon: '🚨', color: 'amber', description: 'Incident logs, response times, resolution' },
  signals: { label: 'Signals', icon: '🚦', color: 'emerald', description: 'Signal efficiency, phase timing, optimization' },
  simulations: { label: 'Simulations', icon: '🧪', color: 'purple', description: 'What-if scenarios, impact analysis, recovery' },
  performance: { label: 'Performance', icon: '📈', color: 'red', description: 'System KPIs, throughput, emissions, twins' },
};

export const MOCK_REPORTS: ReportData[] = [
  // Traffic Reports
  { id: 'rpt-001', title: 'Weekly City Congestion Summary', type: 'traffic', city: 'Bengaluru', date: '2026-08-24', generatedAt: '06:00', size: '2.4 MB', format: 'csv', status: 'ready', summary: '148 junctions, avg congestion 68%, peak 96% at 18:00', rows: 14208, period: '7 days' },
  { id: 'rpt-002', title: 'ORR Corridor Hourly Speed Report', type: 'traffic', city: 'Bengaluru', date: '2026-08-24', generatedAt: '06:00', size: '1.8 MB', format: 'csv', status: 'ready', summary: 'ORR South avg 12 km/h, ORR East avg 14 km/h, Hosur Rd avg 34 km/h', rows: 8640, period: '24 hours' },
  { id: 'rpt-003', title: 'Multi-City Traffic Density Comparison', type: 'traffic', city: 'All Cities', date: '2026-08-23', generatedAt: '05:30', size: '4.2 MB', format: 'xlsx', status: 'ready', summary: 'Bengaluru 68%, Delhi 72%, Mumbai 78%, Hyderabad 55%', rows: 28800, period: '7 days' },
  { id: 'rpt-004', title: 'Vehicle Flow Heatmap Data Export', type: 'traffic', city: 'Bengaluru', date: '2026-08-22', generatedAt: '06:00', size: '3.1 MB', format: 'csv', status: 'ready', summary: 'Hourly vehicle counts across 148 junctions, peak 50k veh/hr', rows: 24864, period: '7 days' },

  // Incident Reports
  { id: 'rpt-010', title: 'Weekly Incident Summary & Response Audit', type: 'incidents', city: 'Bengaluru', date: '2026-08-24', generatedAt: '06:00', size: '1.5 MB', format: 'csv', status: 'ready', summary: '42 incidents this week, avg response 8.2 min, 95% resolved', rows: 1890, period: '7 days' },
  { id: 'rpt-011', title: 'Incident Type Distribution Analysis', type: 'incidents', city: 'Bengaluru', date: '2026-08-23', generatedAt: '06:00', size: '890 KB', format: 'pdf', status: 'ready', summary: 'Accidents 35%, Waterlogging 25%, Breakdown 20%, Construction 12%, Other 8%', rows: 420, period: '30 days' },
  { id: 'rpt-012', title: 'Emergency Response Time Benchmark', type: 'incidents', city: 'All Cities', date: '2026-08-22', generatedAt: '05:30', size: '2.1 MB', format: 'xlsx', status: 'ready', summary: 'Bengaluru avg 8.2 min, Delhi 9.1 min, Mumbai 10.5 min, Hyderabad 7.8 min', rows: 3600, period: '30 days' },

  // Signal Reports
  { id: 'rpt-020', title: 'Signal Optimization Efficiency Audit', type: 'signals', city: 'Bengaluru', date: '2026-08-24', generatedAt: '06:00', size: '1.2 MB', format: 'csv', status: 'ready', summary: '112 adaptive signals, avg efficiency 94%, 36 fixed, 4 emergency', rows: 2160, period: '7 days' },
  { id: 'rpt-021', title: 'Phase Timing Optimization Report', type: 'signals', city: 'Bengaluru', date: '2026-08-23', generatedAt: '06:00', size: '980 KB', format: 'pdf', status: 'ready', summary: 'Avg cycle 140s, 28 junctions recommended for retiming, 15% wait time reduction possible', rows: 1008, period: '7 days' },
  { id: 'rpt-022', title: 'Green Wave Corridor Performance', type: 'signals', city: 'Bengaluru', date: '2026-08-22', generatedAt: '05:30', size: '1.4 MB', format: 'csv', status: 'ready', summary: 'ORR South green wave success rate 78%, Hosur Rd 85%, MG Road 92%', rows: 3024, period: '7 days' },

  // Simulation Reports
  { id: 'rpt-030', title: 'What-If Simulation Results Compendium', type: 'simulations', city: 'Bengaluru', date: '2026-08-24', generatedAt: '06:00', size: '2.8 MB', format: 'csv', status: 'ready', summary: '24 simulations run, avg congestion spike +32%, avg recovery 85 min', rows: 5760, period: '30 days' },
  { id: 'rpt-031', title: 'Digital Twin Validation & Accuracy Report', type: 'simulations', city: 'Bengaluru', date: '2026-08-23', generatedAt: '06:00', size: '5.2 MB', format: 'pdf', status: 'ready', summary: 'Twin accuracy 89.2%, speed deviation avg 3.8 km/h, flow rate error 6.2%', rows: 8640, period: '30 days' },
  { id: 'rpt-032', title: 'Weather Impact Simulation Analysis', type: 'simulations', city: 'All Cities', date: '2026-08-21', generatedAt: '05:30', size: '3.4 MB', format: 'xlsx', status: 'ready', summary: '8 rain events simulated, avg congestion spike +38%, recovery time 90-120 min', rows: 4800, period: '30 days' },

  // Performance Reports
  { id: 'rpt-040', title: 'Daily System KPI Dashboard Export', type: 'performance', city: 'Bengaluru', date: '2026-08-24', generatedAt: '06:00', size: '680 KB', format: 'csv', status: 'ready', summary: '148 junctions online, 48.9k vehicles tracked, 342.8t emissions, 99.8% uptime', rows: 1440, period: '24 hours' },
  { id: 'rpt-041', title: 'Monthly Throughput & Emissions Benchmark', type: 'performance', city: 'All Cities', date: '2026-08-20', generatedAt: '05:00', size: '6.1 MB', format: 'xlsx', status: 'ready', summary: 'Bengaluru 342.8t/day, Delhi 520.1t/day, Mumbai 480.3t/day, Hyderabad 210.5t/day', rows: 43200, period: '30 days' },
  { id: 'rpt-042', title: 'AI Routing Carbon Savings Report', type: 'performance', city: 'Bengaluru', date: '2026-08-18', generatedAt: '06:00', size: '1.1 MB', format: 'pdf', status: 'ready', summary: 'AI routing saved 8.4 kg CO2/user/month, 12,400 users active, 2,140 kg CO2 total', rows: 3720, period: '30 days' },

  // Generating / Scheduled
  { id: 'rpt-050', title: 'Real-Time Corridor Efficiency Monitor', type: 'traffic', city: 'Bengaluru', date: '2026-08-25', generatedAt: '—', size: '—', format: 'csv', status: 'generating', summary: 'Generating live corridor data...', rows: 0, period: 'Live' },
  { id: 'rpt-051', title: 'End-of-Day Compliance Summary', type: 'performance', city: 'Bengaluru', date: '2026-08-25', generatedAt: '23:59', size: '—', format: 'pdf', status: 'scheduled', summary: 'Scheduled for auto-generation at 23:59', rows: 0, period: '24 hours' },
];

export const MOCK_CITIES_FOR_REPORTS = ['All Cities', 'Bengaluru', 'Delhi-NCR', 'Mumbai', 'Hyderabad'];

// ── Generate CSV content for export ──
export function generateReportCSV(report: ReportData): string {
  const header = 'Report ID,Title,Type,City,Date,Period,Status,Rows,Size';
  const row = `${report.id},"${report.title}",${report.type},${report.city},${report.date},${report.period},${report.status},${report.rows},${report.size}`;
  return `${header}\n${row}\n\n# Summary\n${report.summary}`;
}
