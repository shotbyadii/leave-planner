import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Building2, Home, Calendar, RotateCcw } from 'lucide-react';
import { getShortform } from '../utils/colorUtils';

/**
 * AppleBalanceTicker
 * Adaptive Apple-style mechanical number ticker with dynamic warning states,
 * synchronized progress bar, and adaptive context messaging.
 */
const COLOR_CONFIG = {
  blue: {
    text: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    bar: 'bg-blue-500',
    glow: 'from-blue-500/25 to-indigo-500/10'
  },
  orange: {
    text: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    bar: 'bg-orange-500',
    glow: 'from-orange-500/25 to-amber-500/10'
  },
  green: {
    text: 'text-green-500 dark:text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    badge: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
    bar: 'bg-green-500',
    glow: 'from-green-500/25 to-emerald-500/10'
  },
  purple: {
    text: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    bar: 'bg-purple-500',
    glow: 'from-purple-500/25 to-pink-500/10'
  },
  pink: {
    text: 'text-pink-500 dark:text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    bar: 'bg-pink-500',
    glow: 'from-pink-500/25 to-rose-500/10'
  },
  cyan: {
    text: 'text-cyan-500 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    badge: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    bar: 'bg-cyan-500',
    glow: 'from-cyan-500/25 to-blue-500/10'
  },
  amber: {
    text: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    bar: 'bg-amber-500',
    glow: 'from-amber-500/25 to-yellow-500/10'
  },
  indigo: {
    text: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    bar: 'bg-indigo-500',
    glow: 'from-indigo-500/25 to-purple-500/10'
  }
};

/**
 * AppleBalanceTicker
 * Adaptive Apple-style mechanical number ticker with dynamic warning states,
 * synchronized progress bar, and adaptive context messaging.
 */
const AppleBalanceTicker = ({
  initialValue = 15,
  targetValue = 10,
  totalQuota = 15,
  leaveType = 'pl',
  leaveLabel = 'Planned Leave',
  leaveColor = null,
  deductedCount = 1,
  actionType = 'leave', // 'leave' | 'wfh' | 'office'
  onComplete,
  autoDismissMs = 1600
}) => {
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isDoneTicking, setIsDoneTicking] = useState(false);
  const timerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isOffice = actionType === 'office';
  const diff = Math.abs(initialValue - targetValue);

  // Adaptive ticker countdown sequence
  useEffect(() => {
    setCurrentValue(initialValue);
    setIsDoneTicking(false);

    if (isOffice || diff === 0) {
      setCurrentValue(targetValue);
      setIsDoneTicking(true);
      dismissTimerRef.current = setTimeout(() => {
        if (onCompleteRef.current) onCompleteRef.current();
      }, autoDismissMs);
      return;
    }

    // Determine adaptive step duration
    // Single step (e.g. 15 -> 14): deliberate smooth tick ~550ms
    // Multi step (e.g. 15 -> 10, diff 5): adaptive stepping ~110-240ms per step
    const stepDuration = diff === 1 ? 550 : Math.max(110, Math.min(240, 900 / diff));
    
    let current = initialValue;
    const isDecrement = initialValue > targetValue;

    // Small initial delay so user perceives the starting number before the roll
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        if (isDecrement) {
          current -= (diff < 1 ? 0.5 : 1);
          if (current <= targetValue) {
            current = targetValue;
            clearInterval(timerRef.current);
            setIsDoneTicking(true);
            dismissTimerRef.current = setTimeout(() => {
              if (onCompleteRef.current) onCompleteRef.current();
            }, autoDismissMs);
          }
        } else {
          current += 1;
          if (current >= targetValue) {
            current = targetValue;
            clearInterval(timerRef.current);
            setIsDoneTicking(true);
            dismissTimerRef.current = setTimeout(() => {
              if (onCompleteRef.current) onCompleteRef.current();
            }, autoDismissMs);
          }
        }
        setCurrentValue(Number(current.toFixed(1)));
      }, stepDuration);
    }, 280);

    return () => {
      clearTimeout(startDelay);
      if (timerRef.current) clearInterval(timerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [initialValue, targetValue, diff, isOffice, autoDismissMs]);

  // Color & Theme calculations based on the live current value
  const isDepleted = currentValue <= 0;
  const isLow = !isDepleted && currentValue <= 3;
  const isHealthy = !isDepleted && !isLow;

  const getStatusTheme = () => {
    if (isOffice) {
      return {
        text: 'text-emerald-500 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        bar: 'bg-emerald-500',
        glow: 'from-emerald-500/25 to-teal-500/10'
      };
    }
    // Depleted: Common Alert Red
    if (isDepleted) {
      return {
        text: 'text-red-500 dark:text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
        bar: 'bg-red-500',
        glow: 'from-red-500/25 to-orange-500/10'
      };
    }
    // Low: Common Warning Amber / Orange
    if (isLow) {
      return {
        text: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        bar: 'bg-amber-500',
        glow: 'from-amber-500/25 to-yellow-500/10'
      };
    }
    // Healthy: Adapt to the specific leave type & customized color
    const effectiveColorKey = leaveColor || (
      leaveType === 'wfh' ? 'cyan' :
      leaveType === 'el' ? 'orange' :
      leaveType === 'rh' ? 'green' :
      'blue'
    );
    return COLOR_CONFIG[effectiveColorKey] || COLOR_CONFIG.blue;
  };

  const theme = getStatusTheme();
  const shortCode = getShortform(leaveLabel, leaveType.toUpperCase());

  // Message derivation
  const getContextMessage = () => {
    if (isOffice) {
      return {
        title: 'In-Office Recorded',
        desc: 'Attendance recorded for today. No leaves or WFH quota deducted.',
        icon: Building2
      };
    }

    if (actionType === 'wfh') {
      if (targetValue <= 0) {
        return {
          title: 'Monthly WFH Quota Reached',
          desc: `All ${totalQuota} WFH days used this month. Additional days will be logged over quota.`,
          icon: AlertCircle
        };
      }
      if (targetValue <= 3) {
        return {
          title: 'WFH Balance Running Low',
          desc: `Heads up! Only ${targetValue} WFH day${targetValue === 1 ? '' : 's'} remaining this month.`,
          icon: AlertTriangle
        };
      }
      return {
        title: 'Work From Home Logged',
        desc: `Check-in recorded! You have ${targetValue} WFH days remaining this month.`,
        icon: Home
      };
    }

    // Cancellation / Restoration
    if (actionType === 'restore' || actionType === 'cancel') {
      if (leaveType === 'wfh') {
        return {
          title: `${deductedCount} WFH Day${deductedCount === 1 ? '' : 's'} Restored`,
          desc: `Check-in cancelled! You now have ${targetValue} WFH days remaining this month.`,
          icon: RotateCcw
        };
      }
      return {
        title: `${deductedCount} Day${deductedCount === 1 ? '' : 's'} ${leaveLabel} Restored`,
        desc: `Booking cancelled! Your balance is restored back to ${targetValue} days in your annual quota.`,
        icon: RotateCcw
      };
    }

    // Regular Leave (PL / EL / RH) Booking
    if (targetValue <= 0) {
      return {
        title: `${leaveLabel} Fully Booked`,
        desc: `All ${totalQuota} days of ${leaveLabel} used for the annual cycle.`,
        icon: AlertCircle
      };
    }
    if (targetValue <= 3) {
      return {
        title: `Running Low on ${leaveLabel}`,
        desc: `Heads up! Only ${targetValue} day${targetValue === 1 ? '' : 's'} of ${leaveLabel} left.`,
        icon: AlertTriangle
      };
    }
    return {
      title: `${deductedCount} Day${deductedCount === 1 ? '' : 's'} ${leaveLabel} Booked`,
      desc: `Successfully reserved! ${targetValue} days remaining in your annual quota.`,
      icon: CheckCircle2
    };
  };

  const msg = getContextMessage();
  const IconComponent = msg.icon;

  const quotaPercent = totalQuota > 0 ? Math.min(100, Math.max(0, (currentValue / totalQuota) * 100)) : 0;
  const isIncrement = targetValue > initialValue;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.2 }}
      className="w-full flex flex-col items-center gap-4 text-center py-2"
    >
      {/* Top Category Badge */}
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider border ${theme.badge}`}>
          {shortCode} • {leaveLabel} {actionType === 'restore' || actionType === 'cancel' ? '• RESTORED' : ''}
        </span>
      </div>

      {/* Apple Ticker Number Display */}
      <div className="relative w-full max-w-[280px] bg-gradient-to-b from-card via-muted/40 to-muted/20 border border-border/80 rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Subtle Ambient Glow */}
        <div className={`absolute -top-10 inset-x-0 h-24 bg-gradient-to-b ${theme.glow} blur-xl opacity-60 pointer-events-none`} />

        {/* Mechanical Tumbler Roll Window */}
        <div className="relative h-16 w-full flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentValue}
              initial={{ y: isIncrement ? 30 : -30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: isIncrement ? -30 : 30, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className={`text-5xl font-black font-mono tracking-tight ${theme.text} drop-shadow-sm`}
            >
              {currentValue}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Units / Quota Label */}
        <div className="text-[11px] font-bold font-mono text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5">
          <span>Days Left</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground/70">{totalQuota} Total</span>
        </div>

        {/* Synchronized Animated Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full mt-4 overflow-hidden border border-border/50">
          <motion.div
            className={`h-full rounded-full ${theme.bar}`}
            initial={{ width: `${Math.min(100, (initialValue / totalQuota) * 100)}%` }}
            animate={{ width: `${quotaPercent}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Adaptive Context Message Box */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`w-full max-w-sm p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-colors duration-300 ${theme.bg} ${theme.border}`}
      >
        <div className={`p-1.5 rounded-xl bg-card border ${theme.border} ${theme.text} flex-shrink-0 mt-0.5 shadow-sm`}>
          <IconComponent size={18} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className={`text-xs font-black tracking-tight ${theme.text}`}>
            {msg.title}
          </span>
          <span className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            {msg.desc}
          </span>
        </div>
      </motion.div>

      {/* Done Confirmation Indicator */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70">
        <motion.div
          animate={isDoneTicking ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={`w-2 h-2 rounded-full ${isDoneTicking ? theme.bar : 'bg-muted-foreground/40 animate-pulse'}`}
        />
        <span>
          {isDoneTicking 
            ? (isIncrement ? 'Balance restored!' : 'Balance updated!') 
            : (isIncrement ? 'Restoring your quota...' : 'Applying deduction...')}
        </span>
      </div>
    </motion.div>
  );
};

export default AppleBalanceTicker;
