import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  Activity,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserCheck,
  AlertCircle,
  ArrowRight,
  CheckSquare,
  Square,
  Shield,
  User,
  Phone,
  Building2,
  Briefcase,
} from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'admin'>('user');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [organization, setOrganization] = useState('');

  const isAdminEmail = email.endsWith('@bharat.traffic.twin');
  const emailDomain = email.includes('@') ? email.split('@')[1] : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    if (!name.trim()) {
      setValidationError('Please enter your full name');
      return;
    }
    if (!email || !email.includes('@')) {
      setValidationError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    if (accountType === 'admin' && !isAdminEmail) {
      setValidationError('Admin accounts require a @bharat.traffic.twin email address');
      return;
    }
    if (!agreeTerms) {
      setValidationError('You must agree to the Terms of Service');
      return;
    }

    try {
      const createdUser = await register({
        name,
        email,
        password,
        confirmPassword,
        role: accountType,
        phone: phone || undefined,
        department: accountType === 'admin' ? department : undefined,
        organization: accountType === 'admin' ? organization : undefined,
      });

      // Navigate based on role from the backend
      const isAdmin = createdUser.role === 'admin';
      navigate(isAdmin ? '/admin/dashboard' : '/user/dashboard');
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

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
          Create New Account
        </h1>
        <p className="text-xs text-slate-400 max-w-sm">
          Register to unlock AI route planning and citizen mobility features.
        </p>
      </div>

      {/* Card Form */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 relative z-10 backdrop-blur-md space-y-5">
        {/* Account Type Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Account Type:</span>
            <Badge color={accountType === 'admin' ? 'amber' : 'cyan'} dot>
              {accountType === 'admin' ? (
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Admin Operator</span>
              ) : (
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> Citizen Mobility</span>
              )}
            </Badge>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAccountType('user')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                accountType === 'user'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Citizen
            </button>
            <button
              type="button"
              onClick={() => setAccountType('admin')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                accountType === 'admin'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
          {accountType === 'admin' && !isAdminEmail && emailDomain && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Admin registration requires <strong>@bharat.traffic.twin</strong> email. Your domain is <strong>@{emailDomain}</strong>.
            </div>
          )}
        </div>

        {/* Error State Banner */}
        {(validationError || error) && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Akash Yadav"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. akash@traffic.gov.in"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-9 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Additional Info for Admin */}
          {accountType === 'admin' && (
            <div className="space-y-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="text-[11px] text-amber-400 font-mono font-bold uppercase flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Admin Registration Details
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Traffic Operations, Emergency Response"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  Organization
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Delhi Traffic Police, NHAI"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Phone for Citizen (optional) */}
          {accountType === 'user' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                Phone Number <span className="text-slate-600">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}

          {/* Terms checkbox */}
          <div className="flex items-center gap-2 pt-1 cursor-pointer" onClick={() => setAgreeTerms(!agreeTerms)}>
            {agreeTerms ? (
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span className="text-[11px] text-slate-400">
              I agree to the <span className="text-cyan-400 hover:underline">Terms of Service</span> and{' '}
              <span className="text-cyan-400 hover:underline">Privacy Policy</span>.
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Account & Enter Portal
          </Button>
        </form>

        {/* Login Redirect Link */}
        <div className="text-center pt-2 text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-cyan-400 font-bold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
