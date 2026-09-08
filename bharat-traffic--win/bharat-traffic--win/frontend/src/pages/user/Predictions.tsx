import React, { useEffect, useState } from 'react';
import { trafficService } from '../../services/api';
import type { TrafficPrediction } from '../../types/traffic';
import { TrendingUp, Clock, AlertCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const UserPredictions: React.FC = () => {
  const [predictions, setPredictions] = useState<TrafficPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trafficService.getPredictions().then((data) => {
      setPredictions(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 font-mono animate-pulse">Loading predictive curves...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Traffic Predictions & Hourly Forecasting
        </h2>
        <p className="text-xs text-slate-400">
          AI forecasted congestion curves and recommended departure windows to avoid gridlock.
        </p>
      </div>

      {/* Hourly Trend Graph */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-200">
            24-Hour City Congestion Curve (%)
          </h3>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" /> Actual Congestion
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-3 h-3 rounded-full bg-purple-400 inline-block" /> AI Predicted Curve
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={predictions}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="actualCongestion" stroke="#06b6d4" fillOpacity={1} fill="url(#colorActual)" name="Actual" />
              <Area type="monotone" dataKey="predictedCongestion" stroke="#a855f7" fillOpacity={1} fill="url(#colorPredicted)" name="AI Predicted" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best & Worst Time Advice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Clock className="w-4 h-4" /> Recommended Departure Windows
          </div>
          <p className="text-xs text-slate-300 font-semibold">
            Morning: 06:15 AM - 07:45 AM (Avg Speed 42 km/h)
          </p>
          <p className="text-xs text-slate-300 font-semibold">
            Afternoon: 01:00 PM - 03:30 PM (Avg Speed 35 km/h)
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-red-500/20 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertCircle className="w-4 h-4" /> Peak Rush Hours to Avoid
          </div>
          <p className="text-xs text-slate-300 font-semibold">
            Morning Peak: 08:45 AM - 10:15 AM (Congestion Index 94%)
          </p>
          <p className="text-xs text-slate-300 font-semibold">
            Evening Peak: 05:45 PM - 07:30 PM (Congestion Index 96%)
          </p>
        </div>
      </div>
    </div>
  );
};
