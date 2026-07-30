import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CalendarDays, MapPin, Home, LogIn, UserPlus, Mail, Lock, 
  User, ArrowRight, ShieldCheck, X, AlertCircle, Eye, EyeOff, 
  CheckCircle2, XCircle, ChevronRight, Globe
} from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, isSupabaseConfigured } from '../services/authService';

const SplashScreen = ({ isOpen, onClose, onAuthSuccess, currentProfile = {} }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState(currentProfile.name || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);

  if (!isOpen) return null;

  // Password Strength Criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isStrongPassword = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (mode === 'signup') {
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
      className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4 md:p-8 overflow-y-auto select-none"
    >
      {/* Ambient Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1s]" />

      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 py-6">
        
        {/* Left Column: Hero Branding & Ambient Feature Cards */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          
          {/* Logo Badge */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-lg shadow-primary/20 relative overflow-hidden">
              <span>LV</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black font-mono tracking-tight text-foreground">Leave Vault</span>
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">Intelligent Time Off Planner</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
              Plan Your Time Off <br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                With Superpowers.
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-3 font-medium max-w-lg leading-relaxed">
              Auto-find long weekend bridges, plan multi-day vacations, and track your monthly 10-day WFH limits effortlessly.
            </p>
          </div>

          {/* Ambient Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {[
              { icon: CalendarDays, title: 'Smart Optimizer', desc: 'Find long weekends with 1 leave day', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
              { icon: MapPin, title: 'Trip Planner', desc: 'Organize vacations into DB plans', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
              { icon: Home, title: 'WFH Tracker', desc: '12 PM daily check-ins & quota limits', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
            ].map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div key={idx} className="p-4 rounded-2xl bg-card/60 border border-border/80 shadow-apple-sm flex flex-col gap-2 backdrop-blur-md">
                  <div className={`w-8 h-8 rounded-xl ${card.color} border flex items-center justify-center`}>
                    <IconComp size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-foreground leading-tight">{card.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-snug">{card.desc}</p>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: Auth Gateway Card */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-card border border-border rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden">
            
            {/* Header / Tabs */}
            <div className="p-5 border-b border-border bg-muted/30 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
                {verifyEmailSent ? 'Email Verification' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </span>
              {!verifyEmailSent && (
                <div className="flex bg-muted p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      mode === 'login' ? 'bg-background shadow-apple-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setErrorMsg(''); }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      mode === 'signup' ? 'bg-background shadow-apple-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            {/* Verification Screen OR Auth Form */}
            {verifyEmailSent ? (
              <div className="p-8 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shadow-inner animate-pulse">
                  <Mail size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground tracking-tight">Verify Your Email</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                    We've sent a verification link to <span className="font-bold text-foreground">{email}</span>. Please check your inbox to confirm your account.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full mt-3">
                  <button
                    type="button"
                    onClick={() => { setVerifyEmailSent(false); setMode('login'); }}
                    className="w-full py-3 bg-primary text-primary-foreground font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Back to Sign In</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 flex flex-col gap-4">
                
                {!isSupabaseConfigured && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-start gap-2">
                    <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
                    <span>Supabase credentials missing. Add keys to `.env` to activate live authentication.</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle size={15} className="flex-shrink-0" /> {errorMsg}
                  </div>
                )}

                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3.5 bg-muted/60 hover:bg-muted border border-border text-foreground font-bold text-xs rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99]"
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
                <div className="flex items-center gap-3 my-1">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground font-mono">or email</span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {mode === 'signup' && (
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Display Name"
                        className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      required
                      className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {mode === 'signup' && (
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        required
                        className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  )}

                  {/* Real-time Password Strength Indicator (Sign Up Mode) */}
                  {mode === 'signup' && password.length > 0 && (
                    <div className="p-3 bg-muted/30 border border-border/60 rounded-2xl flex flex-col gap-1.5 animate-in fade-in duration-200">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-mono">
                        Password Requirements
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                        <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                          {hasMinLength ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 8+ chars
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                          {hasUppercase ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Uppercase
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                          {hasNumber ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Number
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                          {hasSpecial ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Symbol
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Remember Me Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer my-1 text-xs text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                    />
                    <span className="font-medium">Remember login on this device</span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 mt-1 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {loading ? (
                      <span>Processing...</span>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Sign In to Vault' : 'Create Account'}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>

              </div>
            )}

          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default SplashScreen;
