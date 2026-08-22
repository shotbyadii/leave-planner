import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, CalendarX2, Bell, AlertTriangle, X, Check, Sparkles } from 'lucide-react';
import { isWeekend, publicHolidays } from '../data/holidays';
import { getShortform } from '../utils/colorUtils';
import AppleBalanceTicker from './AppleBalanceTicker';

const WfhCheckinModal = ({ 
  isOpen, 
  onClose, 
  onSelectStatus, 
  onMarkLeave, 
  wfhUsedThisMonth = 0, 
  maxWfh = 10,
  todayStr = '',
  bookedDates = [],
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  wfhPromptHour = '12'
}) => {
  const [notifPermission, setNotifPermission] = useState('default');
  const [selectedAction, setSelectedAction] = useState(null);

  const formatHour = (hourStr) => {
    const h = parseInt(hourStr || '12', 10);
    if (isNaN(h)) return '12:00 PM';
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  };

  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAction(null);
    }
  }, [isOpen]);

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
            onClick={selectedAction ? undefined : onClose} 
          />

          <motion.div 
            layout
            initial={{ opacity: 0, y: 20, scale: 0.96 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 15, scale: 0.96 }} 
            transition={{ type: 'spring', damping: 26, stiffness: 340 }} 
            className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden z-10"
          >
            
            <div className="p-5 border-b border-border bg-muted/40 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 flex items-center gap-1.5 font-mono">
                  <Sparkles size={12} /> Daily Attendance Check-in
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{dateFormatted}</h3>
              </div>
              {!selectedAction && (
                <button 
                  onClick={onClose}
                  className="p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="p-5 flex flex-col gap-4 items-center text-center">
              <AnimatePresence mode="wait" initial={false}>
                {selectedAction ? (
                  <motion.div
                    key="wfh-ticker"
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -10 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="w-full flex flex-col items-center justify-center"
                  >
                    <AppleBalanceTicker
                      initialValue={remainingWfh}
                      targetValue={selectedAction === 'wfh' ? Math.max(0, remainingWfh - 1) : remainingWfh}
                      totalQuota={maxWfh}
                      leaveType="wfh"
                      leaveLabel={leaveNames.wfh || 'Work From Home'}
                      leaveColor={leaveColors?.wfh || 'cyan'}
                      deductedCount={1}
                      actionType={selectedAction}
                      onComplete={() => {
                        onSelectStatus(selectedAction);
                      }}
                      autoDismissMs={1500}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="wfh-options"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="w-full flex flex-col gap-3.5 items-center text-center"
                  >
                    {/* Healthy Balance Banner (Moved above calendar for clean layout) */}
                    <div className={`w-full p-3 rounded-2xl border flex items-center gap-2.5 text-xs text-left ${alertStyle}`}>
                      <AlertTriangle size={16} className="flex-shrink-0" />
                      <span>
                        {isOverQuota ? (
                          <><strong>Quota Exceeded:</strong> You have used all {maxWfh} WFH days.</>
                        ) : isWarning ? (
                          <><strong>Running Low:</strong> Only {remainingWfh} WFH day{remainingWfh === 1 ? '' : 's'} remaining this month.</>
                        ) : (
                          <><strong>Healthy Balance:</strong> You have {remainingWfh} WFH days left this month.</>
                        )}
                      </span>
                    </div>

                    <div className="w-full bg-muted/30 border border-border rounded-2xl p-3.5 flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-black uppercase font-mono tracking-wider text-foreground">{currentMonthName}</span>
                        <span className="text-[10px] font-bold font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          {wfhUsedThisMonth} / {maxWfh} WFH Used
                        </span>
                      </div>

                      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground font-mono">
                        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold font-mono">
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-7" />
                        ))}

                        {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                          const dayNum = i + 1;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          const isToday = dayNum === todayDateNum;
                          const bookedType = bookedMap[dateStr];
                          const isPast = dayNum < todayDateNum;

                          let cellBg = "text-muted-foreground/60";
                          let cellBorder = "border-transparent";

                          if (isToday) {
                            cellBg = "bg-cyan-500 text-black font-black shadow-md shadow-cyan-500/30 scale-105";
                            cellBorder = "border-cyan-400";
                          } else if (bookedType === 'wfh') {
                            cellBg = "bg-cyan-500/20 text-cyan-400 font-black";
                            cellBorder = "border-cyan-500/30";
                          } else if (bookedType === 'office') {
                            cellBg = "bg-muted text-foreground/80 font-bold";
                            cellBorder = "border-border";
                          } else if (bookedType) {
                            cellBg = "bg-blue-500/20 text-blue-400 font-black";
                            cellBorder = "border-blue-500/30";
                          } else if (isPast) {
                            cellBg = "text-muted-foreground/30";
                          }

                          return (
                            <div 
                              key={`day-${dayNum}`}
                              className={`h-7 rounded-lg flex items-center justify-center border transition-all ${cellBg} ${cellBorder}`}
                            >
                              {dayNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-xs font-bold text-muted-foreground mt-0.5">
                      It is past {formatHour(wfhPromptHour)}. How are you working today?
                    </p>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        onClick={() => setSelectedAction('wfh')}
                        className="py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <Home size={16} /> Work From Home
                      </button>

                      <button
                        onClick={() => setSelectedAction('office')}
                        className="py-3 px-4 bg-muted border border-border hover:bg-muted/80 text-foreground font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <Building2 size={16} /> In-Office
                      </button>
                    </div>

                    <button
                      onClick={onMarkLeave}
                      className="w-full py-2.5 bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <CalendarX2 size={15} /> Taking a Leave Today Instead?
                    </button>

                    {isNotificationSupported && notifPermission !== 'granted' && (
                      <button
                        onClick={handleRequestNotif}
                        className="mt-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <Bell size={13} /> Enable Browser Notification Reminders
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WfhCheckinModal;
