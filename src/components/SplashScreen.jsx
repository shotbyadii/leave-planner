import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CalendarDays, MapPin, Home, LogIn, UserPlus, Mail, Lock, 
  User, ArrowRight, ShieldCheck, X, AlertCircle, Eye, EyeOff, 
  CheckCircle2, XCircle, ChevronRight, Globe
} from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, isSupabaseConfigured } from '../services/authService';
import { signUpDemoUser } from '../services/demoService';

const SplashScreen = ({ isOpen, onClose, onAuthSuccess, currentProfile = {}, isDemoMode = false }) => {
  const [mode, setMode] = useState(isDemoMode ? 'signup' : 'login'); // 'login' | 'signup'
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

  React.useEffect(() => {
    if (isDemoMode) {
      setMode('signup');
    }
  }, [isDemoMode]);

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

    if (!email) {
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
      className={`fixed inset-0 z-[200] bg-background flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto select-none ${
        isDemoMode ? 'pt-14 sm:pt-16' : ''
      }`}
    >
      {/* Ambient Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1s]" />

      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center z-10 py-4 sm:py-6">
        
        {/* Left Column: Hero Branding & Ambient Feature Cards */}
        <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6 text-left">
          
          {/* Logo Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary text-primary-foreground font-black text-lg sm:text-xl flex items-center justify-center shadow-lg shadow-primary/20 relative overflow-hidden flex-shrink-0">
              <span>LV</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black font-mono tracking-tight text-foreground leading-none sm:leading-normal">Leave Vault</span>
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Intelligent Time Off Planner</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
              Plan Your Time Off <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                With Superpowers.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3 font-medium max-w-lg leading-relaxed">
              Auto-find long weekend bridges, organize multi-day vacations, and track your hybrid work balance effortlessly.
            </p>
          </div>

          {/* Feature Cards - Hidden on Mobile for clean focus, visible on desktop */}
          <div className="hidden sm:grid grid-cols-3 gap-2.5 sm:gap-4 mt-2 sm:mt-3">
            {[
              { 
                icon: CalendarDays, 
                title: 'Smart Optimizer', 
                desc: 'Bridge holidays for maximum time off', 
                cardBg: 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-200/90 dark:border-blue-500/30 shadow-sm',
                iconBox: 'bg-blue-600 text-white shadow-md shadow-blue-500/25',
                titleColor: 'text-blue-950 dark:text-blue-100',
                descColor: 'text-blue-700/90 dark:text-blue-300/80'
              },
              { 
                icon: MapPin, 
                title: 'Trip Planner', 
                desc: 'Plan and group multi-day vacations', 
                cardBg: 'bg-purple-50/90 dark:bg-purple-950/30 border-purple-200/90 dark:border-purple-500/30 shadow-sm',
                iconBox: 'bg-purple-600 text-white shadow-md shadow-purple-500/25',
                titleColor: 'text-purple-950 dark:text-purple-100',
                descColor: 'text-purple-700/90 dark:text-purple-300/80'
              },
              { 
                icon: Home, 
                title: 'WFH & Attendance', 
                desc: 'Track monthly quotas & check-ins', 
                cardBg: 'bg-cyan-50/90 dark:bg-cyan-950/30 border-cyan-200/90 dark:border-cyan-500/30 shadow-sm',
                iconBox: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25',
                titleColor: 'text-cyan-950 dark:text-cyan-100',
                descColor: 'text-cyan-700/90 dark:text-cyan-300/80'
              }
            ].map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div key={idx} className={`p-3 sm:p-4 rounded-2xl border flex flex-col gap-1.5 sm:gap-2 transition-all hover:scale-[1.02] ${card.cardBg}`}>
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl ${card.iconBox} flex items-center justify-center flex-shrink-0`}>
                    <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <h4 className={`text-xs sm:text-sm font-black leading-tight ${card.titleColor}`}>{card.title}</h4>
                  <p className={`text-[10px] sm:text-xs leading-snug font-medium ${card.descColor}`}>{card.desc}</p>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: Auth Gateway Card - Neutral Grey-Black with High Contrast White Button */}
        <div className="lg:col-span-5 w-full mt-4 sm:mt-0">
          <motion.div 
            layout 
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-[#121212] text-zinc-100 border border-zinc-800 rounded-[28px] sm:rounded-[32px] shadow-2xl shadow-black/90 overflow-hidden"
          >
            
            {/* Header / Tabs */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#161616] flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono">
                {verifyEmailSent ? 'Email Verification' : isDemoMode ? 'Create Demo Account' : (mode === 'login' ? 'Welcome Back' : 'Create Account')}
              </span>
              {!verifyEmailSent && !isDemoMode && (
                <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); }}
                    className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      mode === 'login' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
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
                      mode === 'signup' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            {/* Verification Screen OR Auth Form */}
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
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Verify Your Email</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mt-1.5">
                      We've sent a verification link to <span className="font-bold text-white">{email}</span>. Please check your inbox to confirm your account.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <button
                      type="button"
                      onClick={() => { setVerifyEmailSent(false); setMode('login'); }}
                      className="w-full py-3 bg-white text-black hover:bg-zinc-100 font-black text-xs rounded-2xl shadow-lg shadow-white/10 flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Back to Sign In</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="auth-form"
                  layout
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="p-5 sm:p-6 flex flex-col gap-3.5 sm:gap-4"
                >
                  
                  {!isDemoMode && !isSupabaseConfigured && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] font-medium text-amber-400 flex items-start gap-2">
                      <ShieldCheck size={16} className="flex-shrink-0 mt-0.5 text-amber-400" />
                      <span>Supabase credentials missing. Add keys to `.env` to activate live authentication.</span>
                    </div>
                  )}

                  {isDemoMode && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs font-medium text-amber-300 flex items-start gap-2">
                      <Sparkles size={16} className="flex-shrink-0 mt-0.5 text-amber-400" />
                      <span><strong>Sandbox Demo:</strong> Create a test profile to explore the leave planner and onboarding wizard. Zero verification needed.</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2 animate-in fade-in duration-200">
                      <AlertCircle size={15} className="flex-shrink-0 text-red-400" /> {errorMsg}
                    </div>
                  )}

                  {/* Google OAuth Button (Live Mode Only) */}
                  {!isDemoMode && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-3 sm:py-3.5 bg-[#1c1c1c] hover:bg-[#262626] border border-zinc-800 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
                        <div className="h-px flex-1 bg-zinc-800" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">or email</span>
                        <div className="h-px flex-1 bg-zinc-800" />
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
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Full Display Name"
                              autoComplete="off"
                              className="w-full bg-[#1c1c1c] border border-zinc-800 hover:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-[border-color,box-shadow] duration-150"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        required
                        autoComplete="email"
                        className="w-full bg-[#1c1c1c] border border-zinc-800 hover:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-[border-color,box-shadow] duration-150"
                      />
                    </div>

                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        className="w-full bg-[#1c1c1c] border border-zinc-800 hover:border-zinc-700 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-[border-color,box-shadow] duration-150"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {mode === 'signup' && (
                        <motion.div
                          key="field-confirm"
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="p-1 -m-1 flex flex-col gap-3"
                        >
                          <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm Password"
                              required={mode === 'signup'}
                              autoComplete="new-password"
                              className="w-full bg-[#1c1c1c] border border-zinc-800 hover:border-zinc-700 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-[border-color,box-shadow] duration-150"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                            >
                              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>

                          {password.length > 0 && (
                            <div className="p-3 bg-[#1c1c1c] border border-zinc-800 rounded-2xl flex flex-col gap-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                                Password Requirements
                              </span>
                              <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                  {hasMinLength ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 8+ chars
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                  {hasUppercase ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Uppercase
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                  {hasNumber ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Number
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                  {hasSpecial ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Symbol
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Remember Me Checkbox (Live Mode Only) */}
                    {!isDemoMode && (
                      <label className="flex items-center gap-2 cursor-pointer my-1 text-xs text-zinc-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 text-white focus:ring-zinc-600 accent-white"
                        />
                        <span className="font-medium">Remember login on this device</span>
                      </label>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 mt-1 bg-white text-black font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-white/10 hover:bg-zinc-100 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
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
        </div>

      </div>
    </motion.div>
  );
};

export default SplashScreen;
