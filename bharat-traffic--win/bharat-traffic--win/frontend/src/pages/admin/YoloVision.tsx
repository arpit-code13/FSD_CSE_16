import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Camera,
  Eye,
  Car,
  Bus,
  Truck,
  Bike,
  Activity,
  Clock,
  AlertTriangle,
  Wifi,
  WifiOff,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Shield,
  Cpu,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  yoloService,
  createYoloWs,
  VEHICLE_COLORS as SVC_COLORS,
  type CameraFeed,
  type Detection,
  type VehicleCount,
  type YoloAlert,
  type DensityTrendPoint,
  type YoloSnapshot,
  type InsightBundle,
  type ModelInfo,
} from '../../services/yoloService';

// ── Color map for bounding boxes ──
const BOX_COLORS: Record<string, string> = SVC_COLORS;

// ── Main Component ──────────────────────────────────────────────────
export const AdminYoloVision: React.FC = () => {
  // Camera state
  const [cameras, setCameras] = useState<CameraFeed[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Live data from backend / WS
  const [fps, setFps] = useState(22.4);
  const [confidence, setConfidence] = useState(92);
  const [totalVehicles, setTotalVehicles] = useState(72);
  const [trafficDensity, setTrafficDensity] = useState(78);
  const [queueLength, setQueueLength] = useState(186);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState<VehicleCount[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Density trend + alerts + insight
  const [densityTrend, setDensityTrend] = useState<DensityTrendPoint[]>([]);
  const [alerts, setAlerts] = useState<YoloAlert[]>([]);
  const [insightBundle, setInsightBundle] = useState<InsightBundle | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // WebSocket ref for cleanup
  const wsCleanupRef = useRef<(() => void) | null>(null);

  // ── Clock ──
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Load cameras on mount ──
  useEffect(() => {
    yoloService.getCameras().then((cams) => {
      setCameras(cams);
      if (cams.length > 0) setSelectedCamera(cams[0]);
    });
    yoloService.getModelInfo().then(setModelInfo);
  }, []);

  // ── Load density trend + alerts + insight on camera change ──
  useEffect(() => {
    const camId = selectedCamera?.id || 'cam-01';
    yoloService.getDensityTrend(camId, 12).then((trend) => setDensityTrend(trend.points));
    yoloService.getAlerts(10).then(setAlerts);
    yoloService.getInsight(camId).then(setInsightBundle);
  }, [selectedCamera?.id]);

  // ── WebSocket: real-time YOLO snapshots ──
  useEffect(() => {
    const camId = selectedCamera?.id || 'cam-01';

    // cleanup previous WS
    if (wsCleanupRef.current) {
      wsCleanupRef.current();
      wsCleanupRef.current = null;
    }

    const cleanup = createYoloWs({
      cameraId: camId,
      onSnapshot: (snap: YoloSnapshot) => {
        setFps(snap.fps);
        setConfidence(snap.confidence);
        setTotalVehicles(snap.total_vehicles);
        setTrafficDensity(snap.traffic_density);
        setQueueLength(snap.queue_length_meters);
        setDetections(snap.detections);
        setVehicleCounts(snap.vehicle_counts);
      },
      onAlert: (alert: YoloAlert) => {
        setAlerts((prev) => [alert, ...prev].slice(0, 15));
      },
      onConnect: () => setIsDemoMode(false),
      onDisconnect: () => setIsDemoMode(true),
      onError: () => setIsDemoMode(true),
    });

    wsCleanupRef.current = cleanup;
    return () => cleanup();
  }, [selectedCamera?.id]);

  // Also poll REST fallback every 3s when WS is not connected
  useEffect(() => {
    if (!isDemoMode) return; // WS is active, skip polling
    const camId = selectedCamera?.id || 'cam-01';
    const interval = setInterval(() => {
      yoloService.getSnapshot(camId).then((snap) => {
        setFps(snap.fps);
        setConfidence(snap.confidence);
        setTotalVehicles(snap.total_vehicles);
        setTrafficDensity(snap.traffic_density);
        setQueueLength(snap.queue_length_meters);
        setDetections(snap.detections);
        setVehicleCounts(snap.vehicle_counts);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isDemoMode, selectedCamera?.id]);

  // ── Derived data ──
  const totalDetected = useMemo(() => vehicleCounts.reduce((sum, v) => sum + v.count, 0) || totalVehicles, [vehicleCounts, totalVehicles]);

  const pieDistribution = useMemo(() => {
    if (vehicleCounts.length === 0) {
      return [
        { name: 'Cars', value: 42, color: '#22c55e' },
        { name: 'Bikes', value: 18, color: '#a855f7' },
        { name: 'Buses', value: 5, color: '#f97316' },
        { name: 'Trucks', value: 7, color: '#ef4444' },
      ];
    }
    return vehicleCounts
      .filter((vc) => vc.count > 0)
      .map((vc) => ({
        name: vc.label,
        value: vc.count,
        color: BOX_COLORS[vc.vehicle_type] || '#64748b',
      }));
  }, [vehicleCounts]);

  // KPI values from vehicleCounts (fallback to static)
  const getKpiCount = useCallback(
    (type: string) => {
      const found = vehicleCounts.find((vc) => vc.vehicle_type === type);
      return found || { count: 0, percentage: 0, trend: 'stable' as const };
    },
    [vehicleCounts],
  );
  const carKpi = getKpiCount('car');
  const bikeKpi = getKpiCount('bike');
  const busKpi = getKpiCount('bus');
  const truckKpi = getKpiCount('truck');

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cam = cameras.find((c) => c.id === e.target.value);
    if (cam) setSelectedCamera(cam);
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            YOLO VISION MONITOR
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded">BETA</span>
            {isDemoMode && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded">YOLO DEMO</span>
            )}
          </h2>
          <p className="text-[11px] text-slate-400">
            Real-time AI-powered traffic monitoring using YOLO object detection
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Camera Selector */}
          <select
            value={selectedCamera?.id || 'cam-01'}
            onChange={handleCameraChange}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                Camera: {cam.name}
              </option>
            ))}
          </select>

          {/* Camera Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
            selectedCamera?.status === 'online'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {selectedCamera?.status === 'online' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={`text-[10px] font-mono font-bold ${
              selectedCamera?.status === 'online' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {(selectedCamera?.status || 'offline').toUpperCase()}
            </span>
          </div>

          {/* FPS */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono text-slate-400">FPS:</span>
            <span className="text-[10px] font-mono font-bold text-cyan-400">{fps.toFixed(1)}</span>
          </div>

          {/* Model Info */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-mono font-bold text-purple-400">{modelInfo?.model_name || 'YOLOv8'}</span>
          </div>

          {/* Demo Toggle */}
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
              isDemoMode
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {isDemoMode ? 'DEMO MODE' : 'LIVE MODE'}
          </button>
        </div>
      </div>

      {/* ── 8 KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiMini label="Vehicles Detected" value={totalVehicles.toString()} icon={Car} color="cyan" subtitle={`↑ 12 vs last min`} />
        <KpiMini label="Cars" value={carKpi.count.toString()} icon={Car} color="emerald" subtitle={`${carKpi.percentage}%`} />
        <KpiMini label="Bikes" value={bikeKpi.count.toString()} icon={Bike} color="purple" subtitle={`${bikeKpi.percentage}%`} />
        <KpiMini label="Buses" value={busKpi.count.toString()} icon={Bus} color="amber" subtitle={`${busKpi.percentage}%`} />
        <KpiMini label="Trucks" value={truckKpi.count.toString()} icon={Truck} color="red" subtitle={`${truckKpi.percentage}%`} />
        <KpiMini label="Traffic Density" value={`${trafficDensity}%`} icon={Activity} color="amber" subtitle={trafficDensity > 70 ? 'High' : trafficDensity > 40 ? 'Medium' : 'Low'} />
        <KpiMini label="Queue Length" value={`${queueLength}m`} icon={Clock} color="purple" subtitle={`↑ 26m vs last min`} />
        <KpiMini label="Confidence" value={`${confidence.toFixed(0)}%`} icon={Shield} color="emerald" subtitle={confidence > 90 ? 'Very High' : confidence > 70 ? 'High' : 'Medium'} />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Camera Feed + Detections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Camera Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                LIVE CAMERA FEED (YOLO DETECTION)
              </h3>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">LIVE</span>
              </div>
            </div>

            {/* Camera Feed Area */}
            <div className="relative bg-slate-950 aspect-video">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} />

                {/* YOLO Detection Boxes */}
                {detections.map((det) => (
                  <div
                    key={det.id}
                    className="absolute border-2 rounded"
                    style={{
                      left: `${(det.bbox.x / 800) * 100}%`,
                      top: `${(det.bbox.y / 400) * 100}%`,
                      width: `${(det.bbox.width / 800) * 100}%`,
                      height: `${(det.bbox.height / 400) * 100}%`,
                      borderColor: BOX_COLORS[det.vehicle_type] || '#64748b',
                      backgroundColor: `${BOX_COLORS[det.vehicle_type] || '#64748b'}20`,
                    }}
                  >
                    <span
                      className="absolute -top-5 left-0 px-1 py-0.5 text-[8px] font-mono font-bold rounded whitespace-nowrap"
                      style={{ backgroundColor: BOX_COLORS[det.vehicle_type] || '#64748b', color: '#000' }}
                    >
                      {det.vehicle_type} {det.confidence.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Camera Info Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2 py-1 bg-black/60 text-[9px] font-mono text-emerald-400 rounded">
                  ● REC
                </span>
                <span className="px-2 py-1 bg-black/60 text-[9px] font-mono text-white rounded">
                  {currentTime.toLocaleTimeString('en-IN', { hour12: false })}
                </span>
              </div>

              {/* Resolution */}
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-[9px] font-mono text-white rounded">
                {selectedCamera?.resolution || '1280x720'}
              </div>
            </div>

            {/* Camera Info Bar */}
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Camera: <span className="text-slate-200">{selectedCamera?.name || 'Loading...'}</span></span>
              <span className="text-slate-400">Location: <span className="text-slate-200">{selectedCamera?.location || '---'}</span></span>
              <span className="text-slate-400">Resolution: <span className="text-slate-200">{selectedCamera?.resolution || '---'}</span></span>
            </div>
          </div>

          {/* Real-Time Counts + Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Real-Time Counts */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  REAL-TIME COUNTS
                </h3>
              </div>
              <div className="p-4">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left pb-2">Type</th>
                      <th className="text-right pb-2">Count</th>
                      <th className="text-right pb-2">%</th>
                      <th className="text-right pb-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleCounts.length > 0 ? vehicleCounts.filter(vc => vc.count > 0 || vc.vehicle_type === 'car' || vc.vehicle_type === 'bike' || vc.vehicle_type === 'bus' || vc.vehicle_type === 'truck').map((v) => (
                      <tr key={v.vehicle_type} className="border-b border-slate-800/50">
                        <td className="py-2 text-slate-200 font-semibold">{v.label}</td>
                        <td className="py-2 text-right text-slate-200">{v.count}</td>
                        <td className="py-2 text-right text-slate-400">{v.percentage}%</td>
                        <td className="py-2 text-right">
                          {v.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400 inline" />}
                          {v.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400 inline" />}
                          {v.trend === 'stable' && <Minus className="w-3 h-3 text-slate-400 inline" />}
                        </td>
                      </tr>
                    )) : (
                      // Fallback static rows
                      <>
                        {[
                          { type: 'Cars', count: 42, percentage: 58.3, trend: 'up' as const },
                          { type: 'Bikes', count: 18, percentage: 25.0, trend: 'up' as const },
                          { type: 'Buses', count: 5, percentage: 6.9, trend: 'down' as const },
                          { type: 'Trucks', count: 7, percentage: 9.7, trend: 'stable' as const },
                        ].map((v) => (
                          <tr key={v.type} className="border-b border-slate-800/50">
                            <td className="py-2 text-slate-200 font-semibold">{v.type}</td>
                            <td className="py-2 text-right text-slate-200">{v.count}</td>
                            <td className="py-2 text-right text-slate-400">{v.percentage}%</td>
                            <td className="py-2 text-right">
                              {v.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400 inline" />}
                              {v.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400 inline" />}
                              {v.trend === 'stable' && <Minus className="w-3 h-3 text-slate-400 inline" />}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                    <tr className="font-bold">
                      <td className="py-2 text-slate-200">Total</td>
                      <td className="py-2 text-right text-cyan-400">{totalDetected}</td>
                      <td className="py-2 text-right text-slate-400">100%</td>
                      <td className="py-2 text-right"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Alerts & Events */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ALERTS & EVENTS
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {(alerts.length > 0 ? alerts : [
                  { id: '1', severity: 'critical' as const, title: 'High congestion detected', message: 'Density above 75% at ITO Flyover', timestamp: '21:54:40', camera_id: 'cam-01', auto_generated: true },
                  { id: '2', severity: 'warning' as const, title: 'Queue length increasing', message: 'Queue length 186m and growing', timestamp: '21:54:20', camera_id: 'cam-01', auto_generated: true },
                  { id: '3', severity: 'info' as const, title: 'Heavy truck detected', message: 'High truck count: 7', timestamp: '21:53:55', camera_id: 'cam-01', auto_generated: true },
                  { id: '4', severity: 'success' as const, title: 'Camera quality good', message: 'Detection confidence stable at 92%', timestamp: '21:53:30', camera_id: 'cam-01', auto_generated: true },
                ]).slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'critical' ? 'bg-red-950/20 border-red-500/30' :
                      alert.severity === 'warning' ? 'bg-amber-950/20 border-amber-500/30' :
                      alert.severity === 'info' ? 'bg-blue-950/20 border-blue-500/30' :
                      'bg-emerald-950/20 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-200">{alert.title}</span>
                      <span className="text-[9px] font-mono text-slate-500">{alert.timestamp}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">{alert.message}</p>
                  </div>
                ))}
                <button className="w-full py-2 text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                  View All Events →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Distribution + Density Trend */}
        <div className="space-y-4">
          {/* Vehicle Type Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
              <PieChart className="w-3.5 h-3.5 text-purple-400" />
              VEHICLE TYPE DISTRIBUTION
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieDistribution.map((v) => (
                  <div key={v.name} className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: v.color }} />
                      <span className="text-slate-300">{v.name}</span>
                    </div>
                    <span className="text-slate-100 font-bold">{v.value} ({totalDetected > 0 ? ((v.value / totalDetected) * 100).toFixed(1) : '0.0'}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Traffic Density Trend */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              TRAFFIC DENSITY TREND
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={densityTrend.length > 0 ? densityTrend : [
                  { time: '21:40', density: 55, queue: 120 },
                  { time: '21:45', density: 62, queue: 140 },
                  { time: '21:50', density: 71, queue: 165 },
                  { time: '21:55', density: 78, queue: 186 },
                  { time: '22:00', density: 72, queue: 170 },
                ]}>
                  <defs>
                    <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="density" stroke="#f59e0b" fillOpacity={1} fill="url(#densityGradient)" name="Density %" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-2">
              <span>Density (%)</span>
              <span className="text-amber-400">Current: {trafficDensity}%</span>
            </div>
          </div>

          {/* Queue Length Trend */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              QUEUE LENGTH TREND
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={densityTrend.length > 0 ? densityTrend : [
                  { time: '21:40', density: 55, queue: 120 },
                  { time: '21:45', density: 62, queue: 140 },
                  { time: '21:50', density: 71, queue: 165 },
                  { time: '21:55', density: 78, queue: 186 },
                  { time: '22:00', density: 72, queue: 170 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="queue" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} name="Queue (m)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-2">
              <span>Queue Length (m)</span>
              <span className="text-purple-400">Current: {queueLength}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: AI Insight + Prediction + Recommendation + Model Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* AI Insight */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            AI INSIGHT
          </h3>
          <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
            {insightBundle?.insight?.summary || 'Traffic density is high due to increased vehicle inflow. Queue likely to grow by 15-20% in next 15 minutes.'}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-500">Confidence:</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${insightBundle?.insight?.confidence || confidence}%` }} />
            </div>
            <span className="text-[9px] font-mono font-bold text-cyan-400">{(insightBundle?.insight?.confidence || confidence).toFixed(0)}%</span>
          </div>
        </div>

        {/* Prediction */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            PREDICTION <span className="text-[9px] font-normal text-slate-500">(Next 15 Min)</span>
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-[9px] text-slate-500 block">Predicted Density</span>
              <span className="text-lg font-bold text-slate-100 font-mono">{insightBundle?.prediction?.predicted_density || Math.min(100, trafficDensity + 7)}%</span>
              <span className="text-[9px] text-amber-400 block">{insightBundle?.prediction?.predicted_density_label || 'High'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Predicted Queue</span>
              <span className="text-lg font-bold text-slate-100 font-mono">{insightBundle?.prediction?.predicted_queue_meters || queueLength + 34}m</span>
              <span className="text-[9px] text-red-400 block">↑ {insightBundle?.prediction?.predicted_queue_delta_meters || 34}m</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Avg Speed</span>
              <span className="text-lg font-bold text-slate-100 font-mono">{insightBundle?.prediction?.predicted_avg_speed_kmh || 18} km/h</span>
              <span className="text-[9px] text-red-400 block">↓ {Math.abs(insightBundle?.prediction?.speed_delta_kmh || 4)} km/h</span>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            RECOMMENDATION
          </h3>
          <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
            {insightBundle?.recommendation?.text || 'Increase green time on ITO signal by 12s and divert heavy vehicles via Ring Road.'}
          </p>
          <button className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-mono font-bold transition-all">
            {insightBundle?.recommendation?.action_label || 'Apply Recommendation'}
          </button>
        </div>

        {/* Model Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            MODEL INFO
          </h3>
          <div className="space-y-2 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Model:</span>
              <span className="text-slate-200 font-bold">{modelInfo?.model_name || 'YOLOv8n'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dataset:</span>
              <span className="text-slate-200">{modelInfo?.dataset || 'COCO + Custom Traffic'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Updated:</span>
              <span className="text-slate-200">{modelInfo?.last_updated ? new Date(modelInfo.last_updated).toLocaleDateString('en-IN') : '03 Sep 2025'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Inference:</span>
              <span className="text-slate-200">{modelInfo?.inference_device || 'Edge GPU (RTX 3050)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>YOLO Vision uses AI to detect and classify vehicles in real-time. Data is processed locally and aggregated for digital twin.</span>
        <span>Powered by AI • {modelInfo?.model_name || 'YOLOv8'} • OpenCV • FastAPI</span>
      </div>
    </div>
  );
};

// ── KPI Mini Card ──
const KpiMini: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}> = ({ label, value, icon: Icon, color, subtitle }) => {
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-400',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
  };
  const iconBg: Record<string, string> = {
    cyan: 'bg-cyan-500/20 text-cyan-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className={`p-3 rounded-xl border bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-between`}>
      <div>
        <p className="text-[9px] text-slate-400 font-medium">{label}</p>
        <h3 className="text-lg font-bold text-slate-100 font-mono tracking-tight">{value}</h3>
        {subtitle && (
          <p className="text-[9px] font-mono text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className={`p-2 rounded-lg ${iconBg[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
};
