import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, CalendarX2, Bell, AlertTriangle, X, Check, Sparkles } from 'lucide-react';
import { isWeekend, publicHolidays } from '../data/holidays';
import { getShortform } from '../utils/colorUtils';

const WfhCheckinModal = ({ 
  isOpen, 
  onClose, 
  onSelectStatus, 
  onMarkLeave, 
  wfhUsedThisMonth = 0, 
  maxWfh = 10,
  todayStr = '',
  bookedDates = [],
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' }
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
            body: 'Notifications enabled! You will be reminded daily at your preferred check-in time.',
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

  const remainingWfh = Math.max(0, maxWfh - wfhUsedThisMonth);
  const isOverQuota = wfhUsedThisMonth >= maxWfh;
  const isWarning = !isOverQuota && remainingWfh <= 2;

  let todayObj;
  if (todayStr && todayStr.includes('-')) {
    const [y, m, d] = todayStr.split('-').map(Number);
    todayObj = new Date(y, m - 1, d);
  } else {
    todayObj = new Date();
  }
  const dateFormatted = todayObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const currentMonthName = todayObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Mini Calendar Calculations
  const year = todayObj.getFullYear();
  const month = todayObj.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDateNum = todayObj.getDate();

  // Map booked dates in current month by date string YYYY-MM-DD
  const bookedMap = {};
  bookedDates.forEach(b => {
    if (b.date) bookedMap[b.date] = b.type;
  });

  const alertStyle = isOverQuota
    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
    : (isWarning
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-300');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
            onClick={onClose} 
          />

          {/* Modal Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.96 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 15, scale: 0.96 }} 
            transition={{ type: 'spring', damping: 26, stiffness: 340 }} 
            className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden z-10"
          >
            
            {/* Header */}
            <div className="p-5 border-b border-border bg-muted/40 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 flex items-center gap-1.5 font-mono">
                  <Sparkles size={12} /> Daily Attendance Check-in
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{dateFormatted}</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 items-center text-center">
              
              {/* Mini Calendar View Component */}
              <div className="w-full bg-muted/30 border border-border rounded-2xl p-3.5 flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-black uppercase font-mono tracking-wider text-foreground">{currentMonthName}</span>
                  <span className="text-[10px] font-bold font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {wfhUsedThisMonth} / {maxWfh} WFH Used
                  </span>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground font-mono">
                  <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold font-mono">
                  {/* Empty offset padding */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-7" />
                  ))}

                  {/* Month Days */}
                  {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isToday = dayNum === todayDateNum;
                    const dayObj = new Date(year, month, dayNum);
                    const isWknd = isWeekend(dayObj);
                    const bookedType = bookedMap[dateStr];

                    let textStyle = isWknd ? 'text-muted-foreground/40' : 'text-foreground';
                    let bgStyle = isWknd ? 'bg-muted/20 border-transparent' : 'bg-card/50 border border-border/50';

                    if (bookedType === 'wfh') {
                      textStyle = 'text-cyan-400 font-black';
                      bgStyle = 'bg-cyan-500/15 border border-cyan-500/40';
                    } else if (bookedType === 'pl') {
                      textStyle = 'text-blue-400 font-black';
                      bgStyle = 'bg-blue-500/15 border border-blue-500/40';
                    } else if (bookedType === 'el') {
                      textStyle = 'text-orange-400 font-black';
                      bgStyle = 'bg-orange-500/15 border border-orange-500/40';
                    } else if (bookedType === 'rh') {
                      textStyle = 'text-emerald-400 font-black';
                      bgStyle = 'bg-emerald-500/15 border border-emerald-500/40';
                    }

                    if (isToday) {
                      bgStyle += ' ring-2 ring-cyan-400 border-2 border-cyan-400 shadow-sm';
                      if (!bookedType) textStyle = 'text-cyan-400 font-black';
                    }

                    return (
                      <div
                        key={dateStr}
                        className={`h-7 rounded-xl flex items-center justify-center transition-all ${bgStyle} ${textStyle}`}
                      >
                        <span>{dayNum}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-3 pt-1.5 border-t border-border/40 text-[9px] font-bold font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-md bg-cyan-500/20 border border-cyan-400 text-cyan-400 text-[8px] flex items-center justify-center font-black">#</span> {getShortform(leaveNames.wfh, 'WFH')}</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-md bg-blue-500/20 border border-blue-400 text-blue-400 text-[8px] flex items-center justify-center font-black">#</span> {getShortform(leaveNames.pl, 'PL')}</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-md bg-orange-500/20 border border-orange-400 text-orange-400 text-[8px] flex items-center justify-center font-black">#</span> {getShortform(leaveNames.el, 'EL')}</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-md bg-emerald-500/20 border border-emerald-400 text-emerald-400 text-[8px] flex items-center justify-center font-black">#</span> {getShortform(leaveNames.rh, 'RH')}</div>
                </div>
              </div>

              {/* Status Alert Banner */}
              <div className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 text-left ${alertStyle}`}>
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>
                  {isOverQuota 
                    ? `Monthly WFH limit (${maxWfh} days) reached! Additional WFH days will be marked over quota.`
                    : `${remainingWfh} Work-From-Home days available this month.`}
                </span>
              </div>

              {/* Prompt Text */}
              <p className="text-xs font-bold text-muted-foreground">
                It is past 12:00 PM. How are you working today?
              </p>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => onSelectStatus('wfh')}
                  className="py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Home size={16} /> Work From Home
                </button>

                <button
                  onClick={() => onSelectStatus('office')}
                  className="py-3 px-4 bg-muted border border-border hover:bg-muted/80 text-foreground font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Building2 size={16} /> In-Office
                </button>
              </div>

              {/* Mark Leave Button */}
              <button
                onClick={onMarkLeave}
                className="w-full py-2.5 bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CalendarX2 size={15} /> Taking a Leave Today Instead?
              </button>

              {/* Notification Permission Prompt */}
              {isNotificationSupported && notifPermission !== 'granted' && (
                <button
                  onClick={handleRequestNotif}
                  className="mt-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell size={13} /> Enable Browser Notification Reminders
                </button>
              )}

            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WfhCheckinModal;
