import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertCircle, Loader2, Mail, KeyRound } from 'lucide-react';

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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-orange-500/30">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <button
          id="back-to-landing-button"
          onClick={onBackToLanding}
          type="button"
          className="inline-flex items-center gap-2 text-sm font-mono text-[#888888] hover:text-[#EDEDED] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-8">
        <div className="rounded-lg border border-[#222222] bg-[#121212] shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded bg-orange-500 flex items-center justify-center text-white mx-auto mb-3 shadow-sm">
              <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#EDEDED] font-mono">ORBIT Access Portal</h2>
            <p className="text-sm text-[#888888] mt-1 font-mono">Secure email and password access</p>
          </div>

          <div className="grid grid-cols-2 p-1 rounded bg-[#0A0A0A] border border-[#222222] mb-6">
            <button
              id="auth-tab-signin"
              type="button"
              onClick={() => changeMode('signin')}
              className={`py-1.5 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                mode === 'signin' ? 'bg-orange-500 text-white shadow-xs' : 'text-[#888888] hover:text-[#EDEDED]'
              }`}
            >
              Sign In
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => changeMode('signup')}
              className={`py-1.5 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                mode === 'signup' ? 'bg-orange-500 text-white shadow-xs' : 'text-[#888888] hover:text-[#EDEDED]'
              }`}
            >
              Create Account
            </button>
          </div>

          {!isConfigured && (
            <div className="mb-4 p-3 rounded border border-orange-900/60 bg-orange-950/30 text-orange-200 text-xs">
              Firebase Authentication is not configured. Add the required Vite Firebase variables before signing in.
            </div>
          )}

          {(error || localError) && (
            <div className="mb-4 p-3 rounded border border-red-900/60 bg-red-950/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{error || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-mono font-medium text-[#AAAAAA] mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#666666] absolute left-3 top-2.5" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="operator@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded bg-[#0A0A0A] border border-[#222222] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password-input" className="block text-xs font-mono font-medium text-[#AAAAAA] mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#666666] absolute left-3 top-2.5" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded bg-[#0A0A0A] border border-[#222222] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-confirm-password-input" className="block text-xs font-mono font-medium text-[#AAAAAA] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#666666] absolute left-3 top-2.5" />
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded bg-[#0A0A0A] border border-[#222222] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-button"
              type="submit"
              disabled={loading || !isConfigured}
              className="w-full mt-2 py-2.5 px-4 rounded bg-orange-500 hover:bg-orange-600 text-white font-semibold font-mono text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Firebase...</span>
                </>
              ) : (
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-md mx-auto text-center text-[10px] font-mono text-[#555555]">
        <span>Protected by Firebase Authentication</span>
      </div>
    </div>
  );
};
