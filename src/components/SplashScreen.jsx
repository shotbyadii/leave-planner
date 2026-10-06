import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CalendarDays, MapPin, Home, LogIn, UserPlus, Mail, Lock, 
  User, ArrowRight, ShieldCheck, X, AlertCircle, Eye, EyeOff, 
  CheckCircle2, XCircle, ChevronRight, Globe, ChevronLeft 
} from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordResetEmail, isSupabaseConfigured } from '../services/authService';
import { signUpDemoUser } from '../services/demoService';
import { APP_CONFIG } from '../constants/brand';
import HalftoneDotsBackground from './HalftoneDotsBackground';

const SplashScreen = ({ isOpen, onClose, onAuthSuccess, onEnterDemo, onExitDemo, currentProfile = {}, isDemoMode = false }) => {
  const [mode, setMode] = useState(isDemoMode ? 'signup' : 'login'); // 'login' | 'signup' | 'forgot_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const initialName = (currentProfile.name && currentProfile.name !== 'User') ? currentProfile.name : '';
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setLoading(false);
      if (isDemoMode) {
        setMode('signup');
      }
    }
  }, [isOpen, isDemoMode]);

  if (!isOpen) return null;

  // Password Strength Criteria
  const hasMinLength = isDemoMode ? password.length >= 4 : password.length >= 8;
  const hasUppercase = isDemoMode ? true : /[A-Z]/.test(password);
  const hasNumber = isDemoMode ? true : /[0-9]/.test(password);
  const hasSpecial = isDemoMode ? true : /[^A-Za-z0-9]/.test(password);
  const isStrongPassword = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'forgot_password') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      setLoading(true);
      try {
        const { error } = await sendPasswordResetEmail(email.trim());
        if (error) throw error;
        setResetEmailSent(true);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to send password reset email. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isDemoMode && !email) {
      setErrorMsg('Please enter an email address.');
      return;
    }

    if (!isDemoMode && !password) {
      setErrorMsg('Please enter a password.');
      return;
    }

    if (!isDemoMode && mode === 'signup') {
      if (!hasMinLength) {
        setErrorMsg('Password must be at least 8 characters long.');
        return;
      }
      if (!isStrongPassword) {
        setErrorMsg('Password must include uppercase, number, and special character.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please verify.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        const { user } = await signUpDemoUser({
          name: name.trim() || 'Demo User',
          email: email.trim() || 'demo@example.com',
          password: password || 'password'
        });
        if (onAuthSuccess) onAuthSuccess(user);
        onClose();
        return;
      }

      if (mode === 'login') {
        const { data, error } = await signInWithEmail(email, password, rememberMe);
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess(data?.user || null);
        onClose();
      } else {
        const { data, error } = await signUpWithEmail(email, password, {
          name: name.trim() || 'User',
          quotas: currentProfile.quotas,
          names: currentProfile.names,
          colors: currentProfile.colors
        }, rememberMe);
        if (error) throw error;
        if (isSupabaseConfigured) {
          setVerifyEmailSent(true);
        } else {
          if (onAuthSuccess) onAuthSuccess(data?.user || null);
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) throw error;
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Google OAuth failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className={`fixed inset-0 z-[200] overflow-y-auto lg:overflow-hidden select-none bg-background ${
        isDemoMode ? 'top-10' : 'top-0'
      }`}
    >
      <div className="min-h-full lg:h-full lg:max-h-full w-full flex flex-col lg:flex-row relative">
        
        {/* Left Side (Desktop): 100% height without any crop, aspect ratio locked */}
        <div className="hidden lg:flex h-full max-h-full relative bg-black items-center justify-start overflow-hidden flex-shrink-0">
          <img 
            src={APP_CONFIG.splashArt} 
            alt={APP_CONFIG.name}
            className="h-full w-auto max-h-full object-contain block"
          />
        </div>

        {/* Right Side (Desktop) / Centered View (Mobile): Auth Modal Gateway */}
        <div className="w-full lg:flex-1 min-h-full lg:h-full lg:max-h-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative bg-background lg:overflow-y-auto">
          
          {/* Interactive Halftone Dots Canvas strictly behind modal (z-0) */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
            <HalftoneDotsBackground className="w-full h-full" />
          </div>

          {/* Ambient Glow on Desktop right side */}
          <div className="hidden lg:block absolute top-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse z-0" />
          
          {/* Mobile Top Header: Logo + App Name (No other text) */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-card border border-border/80 p-1 flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden flex-shrink-0">
              <img src={APP_CONFIG.logo} alt={APP_CONFIG.name} className="w-full h-full object-contain rounded-xl" />
            </div>
            <span className="text-xl font-black font-mono tracking-tight text-foreground">
              {APP_CONFIG.name}
            </span>
          </div>

          <div className="w-full max-w-md mx-auto relative z-10">
            <motion.div 
              layout 
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-card text-card-foreground border border-border rounded-[28px] sm:rounded-[32px] shadow-2xl shadow-black/10 dark:shadow-black/90 overflow-hidden"
            >
            
            {/* Header / Tabs */}
            <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
                {verifyEmailSent 
                  ? 'Email Verification' 
                  : mode === 'forgot_password'
                    ? 'Reset Password'
                    : isDemoMode 
                      ? 'Create Demo Account' 
                      : (mode === 'login' ? 'Welcome Back' : 'Create Account')}
              </span>
              {!verifyEmailSent && !isDemoMode && mode !== 'forgot_password' && (
                <div className="flex bg-muted p-1 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); }}
                    className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setMode('signup'); 
                      setErrorMsg('');
                      if (name === 'User') setName('');
                    }}
                    className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            {/* Verification Screen OR Forgot Password Screen OR Auth Form */}
            <AnimatePresence mode="wait">
              {verifyEmailSent ? (
                <motion.div 
                  key="verify"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 sm:p-8 flex flex-col items-center text-center gap-4"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner animate-pulse">
                    <Mail size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Verify Your Email</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                      We've sent a verification link to <span className="font-bold text-foreground">{email}</span>. Please check your inbox to confirm your account.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <button
                      type="button"
                      onClick={() => { setVerifyEmailSent(false); setMode('login'); }}
                      className="w-full py-3 bg-primary text-primary-foreground hover:opacity-90 font-black text-xs rounded-2xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Back to Sign In</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ) : mode === 'forgot_password' ? (
                resetEmailSent ? (
                  <motion.div
                    key="reset-sent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 sm:p-8 flex flex-col items-center text-center gap-4"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                      <CheckCircle2 size={30} />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Recovery Link Sent</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                        If an account exists for <span className="font-bold text-foreground">{email}</span>, a secure recovery email has been sent. Check your inbox and follow the link to reset your password.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-2">
                      <button
                        type="button"
                        onClick={() => { setResetEmailSent(false); setMode('login'); }}
                        className="w-full py-3 bg-primary text-primary-foreground hover:opacity-90 font-black text-xs rounded-2xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                        <span>Back to Sign In</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="forgot-form"
                    layout
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className="p-5 sm:p-6 flex flex-col gap-3.5 sm:gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-bold text-foreground">Reset your password</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enter your registered account email to receive a password recovery link.
                      </p>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-2xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2 animate-in fade-in duration-200">
                        <AlertCircle size={15} className="flex-shrink-0 text-red-700 dark:text-red-400" /> {errorMsg}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your Account Email"
                          required
                          autoComplete="email"
                          className="w-full bg-muted/40 border border-border hover:border-border/80 focus:border-foreground rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-[border-color,box-shadow] duration-150"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 mt-1 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                      >
                        {loading ? (
                          <span>Sending link...</span>
                        ) : (
                          <>
                            <span>Send Recovery Link</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => { setMode('login'); setErrorMsg(''); }}
                        className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={14} /> Back to Sign In
                      </button>
                    </form>
                  </motion.div>
                )
              ) : (
                <motion.div 
                  key="auth-form"
                  layout
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="p-5 sm:p-6 flex flex-col gap-3.5 sm:gap-4"
                >
                  
                  {!isDemoMode && !isSupabaseConfigured && (
                    <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl text-[11px] font-semibold text-amber-950 dark:text-amber-200 flex items-start gap-2">
                      <ShieldCheck size={16} className="flex-shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                      <span>Supabase credentials missing. Add keys to `.env` to activate live authentication.</span>
                    </div>
                  )}

                  {isDemoMode && (
                    <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs font-medium text-amber-950 dark:text-amber-200 flex items-start gap-2">
                      <Sparkles size={16} className="flex-shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                      <span><strong className="font-black text-amber-950 dark:text-amber-100">Sandbox Demo:</strong> Create a test profile to explore the leave planner and onboarding wizard. Zero verification needed.</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-2xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2 animate-in fade-in duration-200">
                      <AlertCircle size={15} className="flex-shrink-0 text-red-700 dark:text-red-400" /> {errorMsg}
                    </div>
                  )}

                  {/* Google OAuth Button (Live Mode Only) */}
                  {!isDemoMode && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-3 sm:py-3.5 bg-muted/60 hover:bg-muted border border-border text-foreground font-bold text-xs rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      {/* Divider */}
                      <div className="flex items-center gap-3 my-0.5">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground font-mono">or email</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {mode === 'signup' && (
                        <motion.div
                          key="field-name"
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="p-1 -m-1"
                        >
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Full Display Name"
                              autoComplete="off"
                              className="w-full bg-muted/40 border border-border hover:border-border/80 focus:border-foreground rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-[border-color,box-shadow] duration-150"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isDemoMode ? "Email Address (optional for demo)" : "Email Address"}
                        required={!isDemoMode}
                        autoComplete="email"
                        className="w-full bg-muted/40 border border-border hover:border-border/80 focus:border-foreground rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-[border-color,box-shadow] duration-150"
                      />
                    </div>

                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isDemoMode ? "Password (optional for demo)" : "Password"}
                        required={!isDemoMode}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        className="w-full bg-muted/40 border border-border hover:border-border/80 focus:border-foreground rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-[border-color,box-shadow] duration-150"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {mode === 'signup' && !isDemoMode && (
                        <motion.div
                          key="field-confirm"
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="p-1 -m-1 flex flex-col gap-3"
                        >
                          <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm Password"
                              required={mode === 'signup' && !isDemoMode}
                              autoComplete="new-password"
                              className="w-full bg-muted/40 border border-border hover:border-border/80 focus:border-foreground rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-[border-color,box-shadow] duration-150"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>

                          {password.length > 0 && (
                            <div className="p-3 bg-muted/40 border border-border rounded-2xl flex flex-col gap-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-mono">
                                Password Requirements
                              </span>
                              <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500 font-bold' : 'text-muted-foreground/60'}`}>
                                  {hasMinLength ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 8+ chars
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-500 font-bold' : 'text-muted-foreground/60'}`}>
                                  {hasUppercase ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Uppercase
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-500 font-bold' : 'text-muted-foreground/60'}`}>
                                  {hasNumber ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Number
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-500 font-bold' : 'text-muted-foreground/60'}`}>
                                  {hasSpecial ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Symbol
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Remember Me & Forgot Password Row (Live Mode Only) */}
                    {!isDemoMode && (
                      <div className="flex items-center justify-between my-1 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-ring accent-foreground"
                          />
                          <span className="font-medium text-[11px]">Remember me</span>
                        </label>
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => { setMode('forgot_password'); setErrorMsg(''); setResetEmailSent(false); }}
                            className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 mt-1 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {loading ? (
                        <span>Processing...</span>
                      ) : (
                        <>
                          <span>{isDemoMode ? 'Launch Sandbox Planner' : (mode === 'login' ? 'Sign In to Vault' : 'Create Account')}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>

                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

          {/* Privacy Policy & Terms of Service Links */}
          <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <span>&bull;</span>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Terms of Service
            </a>
          </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default SplashScreen;
