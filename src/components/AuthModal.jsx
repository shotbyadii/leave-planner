import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, User, ArrowRight, ShieldCheck, X, AlertCircle, Eye, EyeOff, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, isSupabaseConfigured } from '../services/authService';
import { signUpDemoUser } from '../services/demoService';

const AuthModal = ({ isOpen, onClose, onAuthSuccess, currentProfile = {}, isDemoMode = false }) => {
  const [mode, setMode] = useState(isDemoMode ? 'signup' : 'login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);

  // Clear fields appropriately on mode change or modal open
  const handleSwitchMode = (newMode) => {
    if (isDemoMode) return;
    setMode(newMode);
    setErrorMsg('');
    setPassword('');
    setConfirmPassword('');
    if (newMode === 'signup') {
      setName('');
      setEmail('');
      setCompanyName('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setPassword('');
      setConfirmPassword('');
      if (isDemoMode) {
        setMode('signup');
      }
      if (mode === 'signup' || isDemoMode) {
        setName('');
        setEmail('');
        setCompanyName('');
      }
    }
  }, [isOpen, mode, isDemoMode]);

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
        // Sandboxed demo signup: Zero email verification required
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
          companyName: companyName.trim(),
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
            onClick={onClose} 
          />

      {/* Auth Card */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20, scale: 0.96 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: 15, scale: 0.96 }} 
        transition={{ type: 'spring', damping: 28, stiffness: 320 }} 
        className="relative bg-card dark:bg-[#121212] dark:text-zinc-100 dark:border-zinc-800 w-full max-w-md mx-auto rounded-[32px] border border-border shadow-2xl overflow-hidden z-10 flex flex-col"
      >
        
        {/* Header */}
        <div className="p-6 border-b border-border dark:border-zinc-800 bg-muted/40 dark:bg-[#161616] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md ${
              isDemoMode ? 'bg-amber-500 text-black text-lg' : 'bg-primary text-primary-foreground'
            }`}>
              {isDemoMode ? '🎮' : 'LV'}
            </div>
            <div>
              <h3 className="text-base font-black text-foreground dark:text-zinc-100">
                {isDemoMode ? 'Create Demo Account' : 'Leave Vault Account'}
              </h3>
              <p className="text-[11px] text-muted-foreground dark:text-zinc-400 font-medium">
                {isDemoMode ? 'Instant sandbox access • Zero verification required' : 'Sync profiles & leave plans across devices'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white bg-muted/60 dark:bg-zinc-800 hover:bg-muted rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Verify Email Screen OR Auth Form */}
        <AnimatePresence mode="wait">
          {verifyEmailSent ? (
            <motion.div 
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-8 flex flex-col items-center text-center gap-4"
            >
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shadow-inner animate-pulse">
                <Mail size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground dark:text-zinc-100 tracking-tight">Verify Your Email</h3>
                <p className="text-xs text-muted-foreground dark:text-zinc-400 leading-relaxed mt-1.5">
                  We've sent a verification link to <span className="font-bold text-foreground dark:text-zinc-100">{email}</span>. Please check your inbox to confirm your account.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-3">
                <button
                  type="button"
                  onClick={() => { setVerifyEmailSent(false); setMode('login'); }}
                  className="w-full py-3 bg-primary dark:bg-white text-primary-foreground dark:text-black font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <span>Back to Sign In</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {/* Tab Switcher (Only in Live Mode) */}
              {!isDemoMode && (
                <div className="flex border-b border-border dark:border-zinc-800 bg-muted/20 dark:bg-[#181818]">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className={`flex-1 py-3 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2 ${
                      mode === 'login' ? 'border-b-2 border-primary dark:border-white text-foreground dark:text-white bg-card dark:bg-[#121212]' : 'text-muted-foreground dark:text-zinc-400 hover:text-foreground'
                    }`}
                  >
                    <LogIn size={14} /> Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signup')}
                    className={`flex-1 py-3 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2 ${
                      mode === 'signup' ? 'border-b-2 border-primary dark:border-white text-foreground dark:text-white bg-card dark:bg-[#121212]' : 'text-muted-foreground dark:text-zinc-400 hover:text-foreground'
                    }`}
                  >
                    <UserPlus size={14} /> Create Account
                  </button>
                </div>
              )}

            {/* Body Form */}
            <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto no-scrollbar">
              
              {!isDemoMode && !isSupabaseConfigured && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Supabase credentials missing. Add keys to `.env` to activate live authentication.</span>
                </div>
              )}

              {isDemoMode && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs font-medium text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <Sparkles size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
                  <span><strong>Sandbox Mode:</strong> Try any name/email/password. All data is saved in session and disappears on tab close.</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle size={15} className="flex-shrink-0" /> {errorMsg}
                </div>
              )}

              {/* Google OAuth Button (Live Mode only) */}
              {!isDemoMode && (
                <>
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
                </>
              )}

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {mode === 'signup' && (
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Display Name"
                      autoComplete="off"
                      className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-[border-color,box-shadow] duration-150"
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
                    autoComplete={mode === 'signup' ? 'off' : 'username'}
                    className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-[border-color,box-shadow] duration-150"
                  />
                </div>

                {/* Password Input with Eye Toggle */}
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-[border-color,box-shadow] duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Confirm Password (Sign Up Mode) */}
                {mode === 'signup' && (
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      required
                      autoComplete="new-password"
                      className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-[border-color,box-shadow] duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={showConfirmPassword ? 'Hide Confirm Password' : 'Show Confirm Password'}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                )}

                {/* Real-time Password Strength Indicator (Sign Up Mode in Live) */}
                {!isDemoMode && mode === 'signup' && password.length > 0 && (
                  <div className="p-3 bg-muted/30 border border-border/60 rounded-2xl flex flex-col gap-1.5 animate-in fade-in duration-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-mono">
                      Password Requirements
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                        {hasMinLength ? <CheckCircle2 size={12} /> : <XCircle size={12} />} At least 8 chars
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                        {hasUppercase ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Uppercase (A-Z)
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                        {hasNumber ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Number (0-9)
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                        {hasSpecial ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 1 Symbol (!@#$)
                      </div>
                    </div>
                  </div>
                )}

                {/* Remember Me Checkbox (Live Mode only) */}
                {!isDemoMode && (
                  <label className="flex items-center gap-2 cursor-pointer my-1 text-xs text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                    />
                    <span className="font-medium">Remember login on this device</span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 mt-1 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${
                    isDemoMode
                      ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                      : 'bg-primary dark:bg-white text-primary-foreground dark:text-black'
                  }`}
                >
                  {loading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>{isDemoMode ? 'Launch Sandbox Planner' : (mode === 'login' ? 'Sign In' : 'Create Account')}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

            </div>
          </motion.div>
        )}
        </AnimatePresence>

      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
