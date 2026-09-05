import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertCircle, Loader2, Mail, KeyRound, ShieldCheck, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { ThreeEnergyGlobe } from '../components/common/ThreeEnergyGlobe';
import { OrbitLogo } from '../components/common/OrbitLogo';

export const EXACT_LOGIN_ERROR_MESSAGE = 'Unable to sign in. Check your credentials or create an ORBIT account.';

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
  const [signupErrorMessage, setSignupErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Track the credentials that failed authentication to prevent synthetic browser events
  // or unchanged input re-renders from prematurely clearing the error message.
  const failedCredentialsRef = useRef<{ email: string; password: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeMode = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setLoginErrorMessage(null);
    setSignupErrorMessage(null);
    clearError();
    failedCredentialsRef.current = null;
    setPassword('');
    setConfirmPassword('');
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (signupErrorMessage) setSignupErrorMessage(null);
    // Only clear login error when user actively modifies the email address
    if (failedCredentialsRef.current) {
      if (val.trim() !== failedCredentialsRef.current.email) {
        setLoginErrorMessage(null);
        clearError();
        failedCredentialsRef.current = null;
      }
    } else if (loginErrorMessage) {
      setLoginErrorMessage(null);
      clearError();
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (signupErrorMessage) setSignupErrorMessage(null);
    // Only clear login error when user actively edits the password
    if (failedCredentialsRef.current) {
      if (val !== failedCredentialsRef.current.password && (val.length > 0 || failedCredentialsRef.current.password === '')) {
        setLoginErrorMessage(null);
        clearError();
        failedCredentialsRef.current = null;
      }
    } else if (loginErrorMessage) {
      setLoginErrorMessage(null);
      clearError();
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    if (signupErrorMessage) setSignupErrorMessage(null);
    clearError();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === 'signup') {
      setSignupErrorMessage(null);
      clearError();
    }

    if (!isConfigured) {
      if (mode === 'signin') {
        failedCredentialsRef.current = { email: email.trim(), password };
        setLoginErrorMessage(EXACT_LOGIN_ERROR_MESSAGE);
      } else {
        setSignupErrorMessage('Firebase Authentication is awaiting configuration variables in your environment.');
      }
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setSignupErrorMessage('Passwords do not match.');
      return;
    }

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        setLoginErrorMessage(null);
        clearError();
        failedCredentialsRef.current = null;
      } else {
        await signUp(email.trim(), password);
      }
      onSuccessRedirect();
    } catch (authError: unknown) {
      if (mode === 'signin') {
        // Record failed credentials so synthetic events won't clear it
        failedCredentialsRef.current = { email: email.trim(), password };
        // For security and consistency, ALL failed login attempts show the SAME persistent message.
        setLoginErrorMessage(EXACT_LOGIN_ERROR_MESSAGE);
      } else {
        setSignupErrorMessage(authError instanceof Error && authError.message ? authError.message : 'Account registration failed.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDE: Interactive Globe & Energy Network Visual           */}
      {/* ------------------------------------------------------------- */}
      <div className="orbit-auth-globe relative w-full lg:w-[52%] xl:w-[58%] min-h-[380px] lg:min-h-screen flex flex-col">
        {/* Ambient glow */}
        <div className="orbit-auth-globe-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        {/* Subtle boundary glow connecting to auth panel */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-orange-500/20 to-transparent pointer-events-none hidden lg:block" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            id="back-to-landing-button"
            onClick={onBackToLanding}
            type="button"
            title="Back to Overview"
            className="orbit-auth-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Top-left: Subtle technical annotation */}
        <div className={`absolute top-4 left-14 z-10 ${mounted ? 'orbit-auth-entrance orbit-auth-entrance-delay-2' : 'opacity-0'}`}>
          <div className="orbit-auth-annotation">
            <span className="orbit-auth-annotation-label">GLOBAL NETWORK</span>
            <span className="orbit-auth-annotation-status">
              <span className="orbit-auth-annotation-dot" />
              LIVE
            </span>
          </div>
        </div>

        {/* The 3D Globe */}
        <div className="w-full h-full flex-1 flex">
          <ThreeEnergyGlobe />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT SIDE: White ORBIT Authentication Panel                  */}
      {/* ------------------------------------------------------------- */}
      <div className="orbit-auth-panel relative w-full lg:w-[48%] xl:w-[42%] min-h-screen flex flex-col justify-between p-5 sm:p-7 lg:px-9 lg:py-6 xl:px-10 xl:py-7">
        {/* Top: Brand + Badge */}
        <div className={`flex items-center justify-between mb-4 sm:mb-5 ${mounted ? 'orbit-auth-entrance' : 'opacity-0'}`}>
          <div className="flex items-center gap-2.5">
            <OrbitLogo size="md" showWordmark={true} variant="light" />
          </div>

          <div className="orbit-auth-badge">
            <span className="orbit-auth-badge-dot" />
            <span>SECURE ACCESS</span>
          </div>
        </div>

        {/* Center: Auth Content */}
        <div className="my-auto max-w-[350px] sm:max-w-[360px] w-full mx-auto">
          {/* Welcome */}
          <div className={`mb-4 sm:mb-5 ${mounted ? 'orbit-auth-entrance orbit-auth-entrance-delay-1' : 'opacity-0'}`}>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--auth-text)]">
              {mode === 'signin' ? 'Welcome back.' : 'Create account.'}
            </h1>
            <p className="mt-1 text-[13.5px] leading-normal text-[var(--auth-text-secondary)]">
              {mode === 'signin'
                ? 'Access the ORBIT energy intelligence command console.'
                : 'Register operator credentials for scenario simulation.'}
            </p>
          </div>

          {/* Tabs */}
          <div className={`orbit-auth-tabs mb-3.5 sm:mb-4 ${mounted ? 'orbit-auth-entrance orbit-auth-entrance-delay-2' : 'opacity-0'}`}>
            <button
              id="auth-tab-signin"
              type="button"
              onClick={() => changeMode('signin')}
              className={`orbit-auth-tab ${mode === 'signin' ? 'orbit-auth-tab-active' : ''}`}
            >
              Log In
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => changeMode('signup')}
              className={`orbit-auth-tab ${mode === 'signup' ? 'orbit-auth-tab-active' : ''}`}
            >
              Sign Up
            </button>
          </div>

          {/* Firebase config warning */}
          {!isConfigured && (
            <div className={`orbit-auth-warning mb-3.5 ${mounted ? 'orbit-auth-entrance orbit-auth-entrance-delay-3' : 'opacity-0'}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Firebase Authentication is awaiting config variables. Provide VITE_FIREBASE_API_KEY to authenticate live.</span>
            </div>
          )}

          {/* Persistent Login Error Message */}
          {mode === 'signin' && loginErrorMessage && (
            <div
              id="auth-login-error-banner"
              className={`orbit-auth-failed-banner mb-3.5 ${mounted ? 'orbit-auth-entrance' : ''}`}
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#ea580c] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] leading-snug font-medium text-[#7c2d12]">
                    {loginErrorMessage}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-orange-200/60">
                    <span className="text-[11.5px] text-[var(--auth-text-muted)]">
                      New to ORBIT?
                    </span>
                    <button
                      type="button"
                      id="auth-failed-signup-btn"
                      onClick={() => changeMode('signup')}
                      className="orbit-auth-new-user-btn"
                    >
                      <span>Sign Up</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sign Up Error Banner */}
          {mode === 'signup' && (signupErrorMessage || error) && (
            <div className="orbit-auth-error mb-3.5" role="alert" aria-live="assertive">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{signupErrorMessage || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={`space-y-3 ${mounted ? 'orbit-auth-entrance orbit-auth-entrance-delay-3' : 'opacity-0'}`}>
            {/* Email */}
            <div>
              <label htmlFor="auth-email-input" className="orbit-auth-label">
                Email address
              </label>
              <div className="orbit-auth-input-group">
                <Mail className="orbit-auth-input-icon w-4 h-4" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="operator@orbit-energy.gov"
                  value={email}
                  onChange={(event) => handleEmailChange(event.target.value)}
                  className="orbit-auth-input"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password-input" className="orbit-auth-label" style={{ marginBottom: 0 }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button type="button" className="orbit-auth-link text-[12px]">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="orbit-auth-input-group">
                <KeyRound className="orbit-auth-input-icon w-4 h-4" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => handlePasswordChange(event.target.value)}
                  className="orbit-auth-input"
                  style={{ paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="orbit-auth-eye"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-confirm-password-input" className="orbit-auth-label">
                  Confirm Password
                </label>
                <div className="orbit-auth-input-group">
                  <KeyRound className="orbit-auth-input-icon w-4 h-4" />
                  <input
                    id="auth-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) => handleConfirmPasswordChange(event.target.value)}
                    className="orbit-auth-input"
                  />
                </div>
              </div>
            )}

            {/* Remember me */}
            {mode === 'signin' && (
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="orbit-auth-checkbox"
                />
                <label htmlFor="remember-me" className="text-[12.5px] text-[var(--auth-text-secondary)] cursor-pointer select-none">
                  Remember me
                </label>
              </div>
            )}

            {/* CTA */}
            <button
              id="auth-submit-button"
              type="submit"
              disabled={loading}
              className="orbit-auth-cta mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 orbit-auth-spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Log In' : 'Create Account'}</span>
                  <ArrowRight className="orbit-auth-cta-arrow w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Account switch */}
          <div className={`text-center mt-3.5 pt-3 border-t border-[var(--auth-border)] ${mounted ? 'orbit-auth-entrance orbit-auth-entrance-delay-5' : 'opacity-0'}`}>
            {mode === 'signin' ? (
              <p className="text-[12.5px] text-[var(--auth-text-muted)]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('signup')}
                  className="orbit-auth-link"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-[12.5px] text-[var(--auth-text-muted)]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('signin')}
                  className="orbit-auth-link"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer: Trust indicators */}
        <div className={`mt-4 pt-3 border-t border-[var(--auth-border)] flex items-center justify-between ${mounted ? 'orbit-auth-entrance orbit-auth-entrance-delay-6' : 'opacity-0'}`}>
          <div className="orbit-auth-trust">
            <Lock className="w-3 h-3" />
            <span>Encrypted Access</span>
          </div>
          <div className="orbit-auth-trust">
            <ShieldCheck className="w-3 h-3 text-[var(--auth-accent)]" />
            <span>Firebase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
