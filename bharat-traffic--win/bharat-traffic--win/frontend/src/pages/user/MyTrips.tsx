import React, { useEffect, useState } from 'react';
import { trafficService } from '../../services/api';
import type { TripHistory } from '../../types/traffic';
import { History, Calendar, MapPin, Zap } from 'lucide-react';

export const UserMyTrips: React.FC = () => {
  const [trips, setTrips] = useState<TripHistory[]>([]);

  useEffect(() => {
    trafficService.getTripHistory().then(setTrips);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          My Saved Commutes & Trip History
        </h2>
        <p className="text-xs text-slate-400">
          Track your past travel times, frequent routes, and aggregate time saved through smart AI bypasses.
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Recent Completed Trips</h3>

        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{trip.origin}</span>
                  <span className="text-slate-500">→</span>
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{trip.destination}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {trip.date}
                  </span>
                  <span>{trip.distanceKm} km</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {trip.durationMin} mins
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Saved {trip.trafficSavedMin} mins
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
