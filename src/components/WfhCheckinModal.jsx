import React, { useState, useEffect } from 'react';
import { Home, Building2, CalendarX2, Bell, AlertTriangle, X, Check, Sparkles } from 'lucide-react';

const WfhCheckinModal = ({ 
  isOpen, 
  onClose, 
  onSelectStatus, 
  onMarkLeave, 
  wfhUsedThisMonth = 0, 
  maxWfh = 10,
  todayStr = ''
}) => {
  const [notifPermission, setNotifPermission] = useState('default');

  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification);

  useEffect(() => {
    if (isNotificationSupported) {
      try {
        setNotifPermission(Notification.permission);
      } catch (e) {
        console.warn('Notification permission check error:', e);
      }
    }
  }, [isNotificationSupported]);

  const handleRequestNotif = async () => {
    if (!isNotificationSupported) return;
    try {
      let res;
      if (typeof Notification.requestPermission === 'function') {
        res = await Notification.requestPermission();
      }
      if (res) setNotifPermission(res);
      if (res === 'granted') {
        try {
          new Notification('WFH & Attendance Check-in', {
            body: 'Notifications enabled! You will be reminded daily after 12 PM.',
            icon: '/favicon.ico'
          });
        } catch (e) {
          console.warn('Notification constructor error:', e);
        }
      }
    } catch (err) {
      console.warn('Notification requestPermission error:', err);
    }
  };

  if (!isOpen) return null;

  const remainingWfh = Math.max(0, maxWfh - wfhUsedThisMonth);
  const isOverQuota = wfhUsedThisMonth >= maxWfh;
  const isWarning = !isOverQuota && remainingWfh <= 2;
  const percentage = Math.min(100, Math.round((wfhUsedThisMonth / maxWfh) * 100));

  const todayObj = todayStr ? new Date(todayStr) : new Date();
  const dateFormatted = todayObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // SVG Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const gaugeStroke = isOverQuota ? 'stroke-red-500' : (isWarning ? 'stroke-amber-500' : 'stroke-cyan-500');
  const textColor = isOverQuota ? 'text-red-500' : (isWarning ? 'text-amber-500' : 'text-cyan-400');
  const alertStyle = isOverQuota
    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
    : (isWarning
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-300');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/40 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 flex items-center gap-1.5">
              <Sparkles size={12} /> Daily Attendance Check-in
            </span>
            <h3 className="text-lg font-bold text-foreground mt-0.5">{dateFormatted}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors"
            title="Dismiss for now (will ask again on refresh)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 items-center text-center">
          
          {/* Gauge Widget */}
          <div className="relative flex flex-col items-center justify-center my-1">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-muted"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                className={`transition-all duration-700 ease-out ${gaugeStroke}`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center inset-0">
              <span className={`text-2xl font-black font-mono leading-none ${textColor}`}>
                {wfhUsedThisMonth}<span className="text-xs font-bold text-muted-foreground">/{maxWfh}</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">WFH Used</span>
            </div>
          </div>

          {/* Status Message */}
          <div className={`p-3.5 rounded-2xl border text-xs font-medium w-full flex items-start gap-2.5 text-left leading-relaxed ${alertStyle}`}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              {isOverQuota
                ? `Monthly WFH Quota Over! (${wfhUsedThisMonth}/${maxWfh} used). Selecting WFH assumes you have manager/HR approval for exceeding your monthly quota.`
                : isWarning
                ? `Low WFH Balance! Only ${remainingWfh} WFH day${remainingWfh === 1 ? '' : 's'} remaining this month.`
                : `${remainingWfh} Work-From-Home day${remainingWfh === 1 ? '' : 's'} available this month.`}
            </span>
          </div>

          <p className="text-xs font-semibold text-muted-foreground">
            It is past 12:00 PM. How are you working today?
          </p>

          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => onSelectStatus('wfh')}
              className="py-3.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Home size={16} strokeWidth={2.5} /> Work From Home
            </button>
            <button
              onClick={() => onSelectStatus('office')}
              className="py-3.5 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Building2 size={16} strokeWidth={2.5} /> In-Office
            </button>
          </div>

          {/* Tertiary Button: Mark as Leave */}
          <button
            onClick={onMarkLeave}
            className="w-full py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-dashed border-border/60"
          >
            <CalendarX2 size={14} /> Taking a Leave Today Instead?
          </button>

          {/* Notification Permission Prompt */}
          {isNotificationSupported && notifPermission !== 'granted' && (
            <button
              onClick={handleRequestNotif}
              className="mt-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5"
            >
              <Bell size={13} /> Enable 12 PM Browser Notification Reminders
            </button>
          )}

        </div>

      </div>
    </div>
  );
};

export default WfhCheckinModal;
