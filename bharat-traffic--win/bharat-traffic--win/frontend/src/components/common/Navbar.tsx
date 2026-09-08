import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Shield,
  User,
  Radio,
  MapPin,
  AlertTriangle,
  LogOut,
  Pause,
  Play,
  Clock,
} from 'lucide-react';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { selectedCity, setSelectedCity } = useApp();
  const { user, logout, role } = useAuth();
  const { isRunning, toggleSimulation, snapshot, speed, setSpeed } = useRealtime();
  const navigate = useNavigate();

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = role === 'admin';

  return (
    <header className={`h-14 border-b px-4 flex items-center justify-between sticky top-0 z-50 ${
      isAdmin
        ? 'border-emerald-500/20 bg-slate-900/95 backdrop-blur-md'
        : 'border-slate-800 bg-slate-900/90 backdrop-blur-md'
    }`}>
      {/* Left Brand & Mobile Menu Button */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}

        <div className={`w-8 h-8 rounded-lg p-0.5 shadow-lg ${
          isAdmin
            ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/20'
            : 'bg-gradient-to-tr from-cyan-500 to-emerald-500 shadow-cyan-500/20'
        }`}>
          <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
            <Activity className={`w-4 h-4 animate-pulse ${isAdmin ? 'text-emerald-400' : 'text-cyan-400'}`} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-base sm:text-lg font-extrabold tracking-wide bg-clip-text text-transparent font-mono ${
              isAdmin
                ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-200'
                : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-200'
            }`}>
              BHARAT TRAFFIC
            </h1>
            <span className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border ${
              isAdmin
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}>
              v1.0
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            {role === 'admin' ? 'Traffic Control Command Center' : 'Citizen Mobility Portal'}
          </p>
        </div>
      </div>

      {/* Middle: Live Clock, City Selector, Simulation Status */}
      <div className="hidden lg:flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
        {/* Live Clock */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono font-bold text-cyan-300 tabular-nums">
            {currentTime.toLocaleTimeString('en-IN', { hour12: false })}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800" />

        {/* City Selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>City:</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="Bengaluru" className="bg-slate-900 text-slate-200">Bengaluru</option>
            <option value="Delhi-NCR" className="bg-slate-900 text-slate-200">Delhi-NCR</option>
            <option value="Mumbai" className="bg-slate-900 text-slate-200">Mumbai</option>
            <option value="Hyderabad" className="bg-slate-900 text-slate-200">Hyderabad</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-slate-800" />

        {/* Live Telemetry Pulse Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse-ring' : 'bg-slate-500'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
            {isRunning ? 'LIVE' : 'PAUSED'}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800" />

        {/* Simulation Speed + Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSimulation}
            className="p-1 rounded hover:bg-slate-800 transition-colors"
            title={isRunning ? 'Pause Telemetry' : 'Resume Telemetry'}
          >
            {isRunning ? (
              <Pause className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(e.target.value as 'realtime' | 'fast' | 'paused')}
            className="bg-transparent text-[10px] font-mono text-slate-400 focus:outline-none cursor-pointer"
            title="Simulation Speed"
          >
            <option value="realtime" className="bg-slate-900">1x</option>
            <option value="fast" className="bg-slate-900">3x</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-slate-800" />

        {/* Live Incident Count */}
        <div className="flex items-center gap-1.5 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 font-mono font-bold">
            {snapshot.cityStats.activeIncidents}
          </span>
          <span className="text-slate-500 hidden xl:inline">incidents</span>
        </div>
      </div>

      {/* Right: User info + Role Badge + Logout */}
      <div className="flex items-center gap-2">
        {/* User Name */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">{user.name}</span>
          </div>
        )}

        {/* Role Badge (no switcher — role is fixed after login) */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950">
          {isAdmin ? (
            <Shield className="w-3 h-3 text-emerald-400" />
          ) : (
            <User className="w-3 h-3 text-cyan-400" />
          )}
          <span className={`text-xs font-semibold ${
            isAdmin ? 'text-emerald-400' : 'text-cyan-400'
          }`}>
            {isAdmin ? 'Admin' : 'User'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
