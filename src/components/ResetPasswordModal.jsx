import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { updateUserPassword } from '../services/authService';

const ResetPasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

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

    if (!password) {
      setErrorMsg('Please enter a new password.');
      return;
    }

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

    setLoading(true);
    try {
      const { error } = await updateUserPassword(password);
      if (error) throw error;
      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1600);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative bg-card border border-border text-foreground w-full max-w-md mx-auto rounded-[28px] shadow-2xl p-6 overflow-hidden z-10"
      >
        {isSuccess ? (
          <div className="py-6 flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Check size={28} strokeWidth={3} />
            </div>
            <h3 className="text-lg font-black tracking-tight text-foreground">Password Updated!</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Your password has been successfully reset. Logging you in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-border/80">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black font-mono uppercase tracking-wider text-foreground">
                  Set New Password
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Choose a secure password for your account
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-500 font-bold flex items-center gap-2">
                <span>{errorMsg}</span>
              </div>
            )}

            {/* New Password Input */}
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
                required
                autoComplete="new-password"
                className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-[border-color,box-shadow] duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Confirm Password Input */}
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                required
                autoComplete="new-password"
                className="w-full bg-muted/40 border border-border/80 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-[border-color,box-shadow] duration-150"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                title={showConfirmPassword ? 'Hide Confirm Password' : 'Show Confirm Password'}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Password Requirements Chips */}
            {password.length > 0 && (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-1 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordModal;
