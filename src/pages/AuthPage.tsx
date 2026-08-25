import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertCircle, Loader2, Mail, KeyRound, ShieldCheck, CheckCircle2, Globe2, Radio, Lock } from 'lucide-react';
import { ThreeEnergyGlobe } from '../components/common/ThreeEnergyGlobe';

interface AuthPageProps {
  onBackToLanding: () => void;
  onSuccessRedirect: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBackToLanding, onSuccessRedirect }) => {
  const { signIn, signUp, loading, error, clearError, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const changeMode = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setLocalError(null);
    clearError();
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === 'signup' && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      onSuccessRedirect();
    } catch (authError) {
      setLocalError(authError instanceof Error ? authError.message : 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#ededed] flex flex-col lg:flex-row selection:bg-orange-500/30 overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDE: 3D Globe & Energy Intelligence Telemetry Visuals */}
      {/* ------------------------------------------------------------- */}
      <div className="relative w-full lg:w-[58%] xl:w-[62%] min-h-[500px] lg:min-h-screen bg-[#06080d] border-b lg:border-b-0 lg:border-r border-[#1e293b]/70 flex flex-col overflow-hidden">
        {/* Top Floating Controls on Globe */}
        <div className="absolute top-4 left-4 z-20 flex items-center pointer-events-none">
          <button
            id="back-to-landing-button"
            onClick={onBackToLanding}
            type="button"
            title="Back to Overview"
            className="pointer-events-auto inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono text-[#94a3b8] hover:text-white transition-colors cursor-pointer bg-[#0f172a]/90 backdrop-blur-md border border-[#334155] shadow-lg hover:border-orange-500/50"
          >
            <ArrowLeft className="w-4 h-4 text-orange-400" />
          </button>
        </div>

        {/* The 3D Three.js Interactive Globe */}
        <div className="w-full h-full flex-1 flex">
          <ThreeEnergyGlobe />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT SIDE: HackerRank-Style Dedicated Authentication Panel   */}
      {/* ------------------------------------------------------------- */}
      <div className="relative w-full lg:w-[42%] xl:w-[38%] min-h-screen bg-[#0b0f17] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
        {/* Subtle Ambient Glow in background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/[0.03] rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-mono font-bold text-sm">
              <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>
            <span className="font-mono text-base font-bold tracking-tight text-white">ORBIT</span>
          </div>

          <div className="text-[11px] font-mono text-[#64748b] bg-[#131b28] px-2.5 py-1 rounded border border-[#1e293b]">
            v2.4 SECURE
          </div>
        </div>

        {/* Main Form Center Block */}
        <div className="my-auto max-w-md w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              {mode === 'signin' ? 'Welcome back!' : 'Create Account'}
            </h2>
            <p className="text-sm text-[#94a3b8] mt-1.5 font-mono">
              {mode === 'signin'
                ? 'Login to access the energy supply chain command console.'
                : 'Register operator credentials for scenario simulation.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-lg bg-[#07090e] border border-[#1e293b] mb-6">
            <button
              id="auth-tab-signin"
              type="button"
              onClick={() => changeMode('signin')}
              className={`py-2 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => changeMode('signup')}
              className={`py-2 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isConfigured && (
            <div className="mb-5 p-3.5 rounded-lg border border-amber-900/60 bg-amber-950/30 text-amber-200 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
              <span>Firebase Authentication is awaiting config variables. Provide VITE_FIREBASE_API_KEY to authenticate live.</span>
            </div>
          )}

          {(error || localError) && (
            <div className="mb-5 p-3.5 rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-mono font-medium text-[#cbd5e1] mb-1.5">
                Your email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="operator@orbit-energy.gov"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-[#07090e] border border-[#1e293b] text-white placeholder-[#475569] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password-input" className="block text-xs font-mono font-medium text-[#cbd5e1]">
                  Password
                </label>
                {mode === 'signin' && (
                  <span className="text-[11px] font-mono text-orange-400 hover:text-orange-300 cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-[#07090e] border border-[#1e293b] text-white placeholder-[#475569] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-confirm-password-input" className="block text-xs font-mono font-medium text-[#cbd5e1] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3" />
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-[#07090e] border border-[#1e293b] text-white placeholder-[#475569] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                  />
                </div>
              </div>
            )}

            {mode === 'signin' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-mono text-[#94a3b8] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#334155] bg-[#07090e] text-orange-500 focus:ring-orange-500/20"
                  />
                  <span>Remember me</span>
                </label>
              </div>
            )}

            <button
              id="auth-submit-button"
              type="submit"
              disabled={loading || !isConfigured}
              className="w-full mt-3 py-3 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold font-mono text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{mode === 'signin' ? 'Log In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Bottom Switcher */}
          <div className="text-center mt-6 pt-6 border-t border-[#1e293b] text-xs font-mono text-[#94a3b8]">
            {mode === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('signup')}
                  className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer underline-offset-4 hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('signin')}
                  className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer underline-offset-4 hover:underline"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="mt-8 pt-4 border-t border-[#1e293b]/50 flex items-center justify-between text-[11px] font-mono text-[#64748b]">
          <div className="flex items-center gap-1.5 text-emerald-400/90">
            <Lock className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted Access</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span>Firebase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};

