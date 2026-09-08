import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';
import {
  Activity,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Shield,
  User,
} from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Detect role from email domain
  const detectedRole = email.endsWith('@bharat.traffic.twin') ? 'admin' : 'user';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    if (!email) {
      setValidationError('Please enter your email address');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    try {
      const loggedUser = await login({ email, password });
      // Navigate based on role from the backend
      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Glow background effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 text-center space-y-2 relative z-10">
        <div className="inline-flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 p-0.5">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <span className="text-sm font-extrabold tracking-wide bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent font-mono">
            BHARAT TRAFFIC
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Sign In to Portal
        </h1>
        <p className="text-xs text-slate-400 max-w-sm">
          Access real-time citizen mobility advice or city control telemetry.
        </p>
      </div>

      {/* Card Form */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 relative z-10 backdrop-blur-md space-y-5">
        {/* Portal Mode Badge — role detected from email domain */}
        <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">
            {email ? (
              <>Role detected from <strong className="text-slate-300">{email.split('@')[1]}</strong></>
            ) : (
              'Enter your email to detect role.'
            )}
          </span>
          <Badge color={detectedRole === 'admin' ? 'amber' : 'cyan'} dot>
            {detectedRole === 'admin' ? (
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Admin Access</span>
            ) : (
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> Citizen Access</span>
            )}
          </Badge>
        </div>

        {/* Error State Banner */}
        {(validationError || error) && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] text-cyan-400 hover:underline font-mono"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In
          </Button>
        </form>



        {/* Register Redirect Link */}
        <div className="text-center pt-2 text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-cyan-400 font-bold hover:underline">
            Register New Account
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};
