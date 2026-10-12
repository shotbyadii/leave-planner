import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Building2, 
  CalendarX2, 
  Bell, 
  AlertTriangle, 
  X, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Layers
} from 'lucide-react';
import { isWeekend, publicHolidays } from '../data/holidays';
import { getShortform } from '../utils/colorUtils';
import AppleBalanceTicker from './AppleBalanceTicker';
import { showAppNotification, requestNotificationPermission, isNotificationSupported, subscribeUserToPush } from '../utils/notificationService';
import { countConsecutiveWorkingDays } from '../services/leaveConfigService';
import { formatCatchupDate } from '../utils/attendanceCatchupUtils';

const WfhCheckinModal = ({ 
  isOpen, 
  onClose, 
  onSelectStatus, 
  onMarkLeave, 
  onBatchSelectStatus = null,
  wfhUsedThisMonth = 0, 
  maxWfh = 10,
  todayStr = '',
  missingDays = [], // Array of YYYY-MM-DD strings
  bookedDates = [],
  leaveConfigs = null,
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  wfhPromptHour = '12'
}) => {
  const [notifPermission, setNotifPermission] = useState('default');
  const [selectedAction, setSelectedAction] = useState(null);
  const [showQuickLeaves, setShowQuickLeaves] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next

  // Active stack of missing days: fallback to [todayStr] if missingDays is empty
  const dayStack = useMemo(() => {
    if (Array.isArray(missingDays) && missingDays.length > 0) {
      return missingDays;
    }
    return todayStr ? [todayStr] : [];
  }, [missingDays, todayStr]);

  // Clamp activeCardIndex when dayStack length changes
  useEffect(() => {
    if (activeCardIndex >= dayStack.length && dayStack.length > 0) {
      setActiveCardIndex(Math.max(0, dayStack.length - 1));
    }
  }, [dayStack.length, activeCardIndex]);

  // Reset states when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedAction(null);
      setShowQuickLeaves(false);
    } else {
      setSelectedAction(null);
      setShowQuickLeaves(false);
      setActiveCardIndex(0);
    }
  }, [isOpen]);

  const activeDateStr = dayStack[activeCardIndex] || todayStr;
  const isMultiDayMode = dayStack.length > 1;

  // Adjacent cards for 3D multi-day horizontal swipe stack
  const prevDate1 = isMultiDayMode && activeCardIndex > 0 ? dayStack[activeCardIndex - 1] : null;
  const prevDate2 = isMultiDayMode && activeCardIndex > 1 ? dayStack[activeCardIndex - 2] : null;
  const nextDate1 = isMultiDayMode && activeCardIndex < dayStack.length - 1 ? dayStack[activeCardIndex + 1] : null;
  const nextDate2 = isMultiDayMode && activeCardIndex + 2 < dayStack.length ? dayStack[activeCardIndex + 2] : null;

  const prevDate1Info = prevDate1 ? formatCatchupDate(prevDate1) : null;
  const nextDate1Info = nextDate1 ? formatCatchupDate(nextDate1) : null;

  const formatHour = (hourStr) => {
    const h = parseInt(hourStr || '12', 10);
    if (isNaN(h)) return '12:00 PM';
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  };

  const notificationSupported = isNotificationSupported();

  useEffect(() => {
    if (notificationSupported) {
      try {
        setNotifPermission(Notification.permission);
      } catch (e) {
        console.warn('Notification permission check error:', e);
      }
    }
  }, [notificationSupported]);

  const handleRequestNotif = async () => {
    if (!notificationSupported) return;
    try {
      const pushRes = await subscribeUserToPush();
      if (pushRes && pushRes.success) {
        setNotifPermission('granted');
        showAppNotification('WFH & Attendance Check-in', {
          body: 'Web Push enabled! You will receive daily check-in reminders even when Leave Planner is closed.',
          tag: 'wfh-checkin-confirmation'
        });
        return;
      }
      const res = await requestNotificationPermission();
      if (res) setNotifPermission(res);
      if (res === 'granted') {
        showAppNotification('WFH & Attendance Check-in', {
          body: 'Notifications enabled! You will be reminded daily at your preferred check-in time.',
          tag: 'wfh-checkin-confirmation'
        });
      }
    } catch (err) {
      console.warn('Notification requestPermission error:', err);
    }
  };

  const wfhConfig = Array.isArray(leaveConfigs)
    ? leaveConfigs.find(c => c.id === 'wfh')
    : null;
  const isWfhEnabled = wfhConfig ? wfhConfig.enabled : true;
  const effectiveMaxWfh = wfhConfig ? wfhConfig.quota : maxWfh;
  const maxConsecutiveWfh = wfhConfig?.constraints?.maxConsecutive || null;

  const remainingWfh = Math.max(0, effectiveMaxWfh - wfhUsedThisMonth);
  const isOverQuota = wfhUsedThisMonth >= effectiveMaxWfh;
  const isWarning = !isOverQuota && remainingWfh <= 2;

  // Consecutive WFH check for active date
  const consecutiveWfhCount = activeDateStr 
    ? countConsecutiveWorkingDays([activeDateStr], 'wfh', bookedDates)
    : 0;
  const isConsecutiveLimitExceeded = Boolean(maxConsecutiveWfh && consecutiveWfhCount > maxConsecutiveWfh);

  // Available quick leaves to take on active date (Tier 3 special benefits + Emergency Leave)
  const quickLeaves = (Array.isArray(leaveConfigs) ? leaveConfigs : [])
    .filter(c => c.enabled && (c.tier === 'special' || c.id === 'el'));

  // Currently selected action item details
  const activeSelectedConfig = Array.isArray(leaveConfigs)
    ? leaveConfigs.find(c => c.id === selectedAction)
    : null;
  const selectedLabel = activeSelectedConfig?.name || leaveNames[selectedAction] || (selectedAction === 'office' ? 'In-Office' : selectedAction);
  const selectedColor = activeSelectedConfig?.color || leaveColors?.[selectedAction] || 'cyan';
  const selectedTotal = activeSelectedConfig?.quota || (selectedAction === 'wfh' ? effectiveMaxWfh : 10);
  const usedForSelected = bookedDates.filter(b => b.type === selectedAction).reduce((acc, b) => acc + (b.duration || 1), 0);
  const remainingForSelected = selectedAction === 'wfh' ? remainingWfh : Math.max(0, selectedTotal - usedForSelected);

  // Date parsing for the active card
  let activeDateObj;
  if (activeDateStr && activeDateStr.includes('-')) {
    const [y, m, d] = activeDateStr.split('-').map(Number);
    activeDateObj = new Date(y, m - 1, d);
  } else {
    activeDateObj = new Date();
  }
  const dateFormatted = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const currentMonthName = activeDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCardToday = activeDateStr === todayStr;

  // Mini Calendar Calculations
  const year = activeDateObj.getFullYear();
  const month = activeDateObj.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const activeDateNum = activeDateObj.getDate();

  // Map booked dates in current month by date string YYYY-MM-DD
  const bookedMap = useMemo(() => {
    const map = {};
    bookedDates.forEach(b => {
      if (b && b.date) map[b.date] = b.type;
    });
    return map;
  }, [bookedDates]);

  const alertStyle = !isWfhEnabled
    ? 'bg-muted border-border text-muted-foreground'
    : (isOverQuota
      ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
      : (isWarning
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-300'));

  // Navigation handlers
  const handlePrevCard = useCallback(() => {
    if (activeCardIndex > 0) {
      setDirection(-1);
      setActiveCardIndex(prev => prev - 1);
      setSelectedAction(null);
      setShowQuickLeaves(false);
    }
  }, [activeCardIndex]);

  const handleNextCard = useCallback(() => {
    if (activeCardIndex < dayStack.length - 1) {
      setDirection(1);
      setActiveCardIndex(prev => prev + 1);
      setSelectedAction(null);
      setShowQuickLeaves(false);
    }
  }, [activeCardIndex, dayStack.length]);

  // Keyboard navigation support on desktop
  useEffect(() => {
    if (!isOpen || selectedAction) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        handleNextCard();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedAction, handlePrevCard, handleNextCard, onClose]);

  // Mobile swipe drag end handler with distance & flick velocity support
  const handleDragEnd = (event, info) => {
    const swipeThreshold = 35;
    const velocityThreshold = 220;
    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      // Swiped right -> go to previous card if available
      if (activeCardIndex > 0) {
        handlePrevCard();
      }
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      // Swiped left -> go to next card if available
      if (activeCardIndex < dayStack.length - 1) {
        handleNextCard();
      }
    }
  };

  const handleActionComplete = (status) => {
    if (onSelectStatus) {
      onSelectStatus(status, activeDateStr);
    }
    // If there are more cards after this one, advance index, else close
    if (activeCardIndex < dayStack.length - 1) {
      setDirection(1);
      setActiveCardIndex(prev => prev + 1);
      setSelectedAction(null);
      setShowQuickLeaves(false);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
            onClick={selectedAction ? undefined : onClose} 
          />

          {/* Modal Container */}
          <div className={`relative w-full ${isMultiDayMode ? 'max-w-[340px] sm:max-w-md' : 'max-w-md'} mx-auto z-10 flex flex-col items-center`}>
            
            {/* Top Multi-Day Stack Header / Counter */}
            {isMultiDayMode && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center justify-between px-3 py-2 mb-2 bg-card/90 backdrop-blur-md rounded-2xl border border-border/80 text-xs shadow-lg"
              >
                <div className="flex items-center gap-2 font-mono">
                  <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Layers size={14} />
                  </div>
                  <span className="font-bold text-foreground">
                    Day {activeCardIndex + 1} of {dayStack.length}
                  </span>
                </div>

                {/* Navigation Arrows */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevCard}
                    disabled={activeCardIndex === 0}
                    className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Previous day"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextCard}
                    disabled={activeCardIndex === dayStack.length - 1}
                    className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Next day"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3D Tilted Card Stack Wrapper with Left/Right Peeking Cards */}
            <div className="relative w-full flex items-center justify-center perspective-[1000px]">
              
              {/* Left Peeking Card 2 (Secondary ghost card behind left) */}
              {isMultiDayMode && prevDate2 && (
                <div 
                  className="absolute -left-6 sm:-left-9 inset-y-4 w-full bg-card/30 rounded-[30px] sm:rounded-[32px] border border-border/40 shadow-md pointer-events-none select-none transition-all duration-300"
                  style={{
                    transform: 'scale(0.85) rotate(-3deg)',
                    opacity: 0.22,
                    zIndex: 0,
                    transformOrigin: 'right center',
                  }}
                />
              )}

              {/* Left Peeking Card 1 (Immediate previous day) */}
              {isMultiDayMode && prevDate1 && (
                <button
                  type="button"
                  onClick={handlePrevCard}
                  title={`Previous: ${prevDate1Info?.formatted || prevDate1}`}
                  aria-label={`Go to previous day: ${prevDate1Info?.formatted || prevDate1}`}
                  className="group absolute -left-4 sm:-left-7 inset-y-2 sm:inset-y-3 w-full bg-card/70 hover:bg-card/90 border border-border/70 hover:border-cyan-500/50 rounded-[30px] sm:rounded-[32px] shadow-xl backdrop-blur-md cursor-pointer transition-all duration-200 select-none flex flex-col justify-between py-4 pl-1 sm:pl-2 text-left"
                  style={{
                    transform: 'scale(0.92) rotate(-1.5deg)',
                    opacity: 0.48,
                    zIndex: 1,
                    transformOrigin: 'right center',
                  }}
                >
                  <div className="flex flex-col items-center gap-1.5 w-6 sm:w-8 pt-1">
                    <div className="p-1 rounded-full bg-muted/80 text-muted-foreground group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                      <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-[10px] font-mono font-black text-muted-foreground group-hover:text-foreground">
                      {prevDate1Info?.dayNum}
                    </span>
                    <span className="text-[8px] font-mono uppercase font-bold text-muted-foreground/60 tracking-wider">
                      {prevDate1Info?.weekday}
                    </span>
                  </div>
                </button>
              )}

              {/* Right Peeking Card 2 (Secondary ghost card behind right) */}
              {isMultiDayMode && nextDate2 && (
                <div 
                  className="absolute -right-6 sm:-right-9 inset-y-4 w-full bg-card/30 rounded-[30px] sm:rounded-[32px] border border-border/40 shadow-md pointer-events-none select-none transition-all duration-300"
                  style={{
                    transform: 'scale(0.85) rotate(3deg)',
                    opacity: 0.22,
                    zIndex: 0,
                    transformOrigin: 'left center',
                  }}
                />
              )}

              {/* Right Peeking Card 1 (Immediate next day) */}
              {isMultiDayMode && nextDate1 && (
                <button
                  type="button"
                  onClick={handleNextCard}
                  title={`Next: ${nextDate1Info?.formatted || nextDate1}`}
                  aria-label={`Go to next day: ${nextDate1Info?.formatted || nextDate1}`}
                  className="group absolute -right-4 sm:-right-7 inset-y-2 sm:inset-y-3 w-full bg-card/70 hover:bg-card/90 border border-border/70 hover:border-cyan-500/50 rounded-[30px] sm:rounded-[32px] shadow-xl backdrop-blur-md cursor-pointer transition-all duration-200 select-none flex flex-col justify-between items-end py-4 pr-1 sm:pr-2 text-right"
                  style={{
                    transform: 'scale(0.92) rotate(1.5deg)',
                    opacity: 0.48,
                    zIndex: 1,
                    transformOrigin: 'left center',
                  }}
                >
                  <div className="flex flex-col items-center gap-1.5 w-6 sm:w-8 pt-1">
                    <div className="p-1 rounded-full bg-muted/80 text-muted-foreground group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-[10px] font-mono font-black text-muted-foreground group-hover:text-foreground">
                      {nextDate1Info?.dayNum}
                    </span>
                    <span className="text-[8px] font-mono uppercase font-bold text-muted-foreground/60 tracking-wider">
                      {nextDate1Info?.weekday}
                    </span>
                  </div>
                </button>
              )}

              {/* Foreground Active Card */}
              <motion.div 
                layout
                drag={isMultiDayMode ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={isMultiDayMode ? handleDragEnd : undefined}
                initial={{ opacity: 0, y: 20, scale: 0.96 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 15, scale: 0.96 }} 
                transition={{ type: 'spring', damping: 26, stiffness: 340 }} 
                className={`relative bg-card w-full rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden z-10 flex flex-col max-h-[min(88dvh,calc(100dvh-3rem-env(safe-area-inset-bottom,0px)))] ${isMultiDayMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex justify-between items-center flex-shrink-0">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 flex items-center gap-1 font-mono">
                        <Sparkles size={11} />
                        Attendance Check-in
                      </span>
                      {isMultiDayMode && isCardToday && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border">
                          TODAY
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
                      {dateFormatted}
                    </h3>
                  </div>

                  {!selectedAction && (
                    <button 
                      onClick={onClose}
                      className="p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors cursor-pointer flex-shrink-0"
                      title="Dismiss"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 flex flex-col gap-3.5 items-center text-center flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain pb-6">
                  <AnimatePresence mode="wait" initial={false}>
                    {selectedAction ? (
                      <motion.div
                        key="wfh-ticker"
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -10 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className="w-full flex flex-col items-center justify-center py-2"
                      >
                        <AppleBalanceTicker
                          initialValue={remainingForSelected}
                          targetValue={selectedAction === 'office' ? remainingForSelected : Math.max(0, remainingForSelected - 1)}
                          totalQuota={selectedTotal}
                          leaveType={selectedAction}
                          leaveLabel={selectedLabel}
                          leaveColor={selectedColor}
                          deductedCount={selectedAction === 'office' ? 0 : 1}
                          actionType={selectedAction}
                          onComplete={() => {
                            handleActionComplete(selectedAction);
                          }}
                          autoDismissMs={1300}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`wfh-options-${activeDateStr}`}
                        initial={{ opacity: 0, x: direction * 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -direction * 40 }}
                        transition={{ duration: 0.18 }}
                        className="w-full flex flex-col gap-3 items-center text-center"
                      >
                        {/* Healthy Balance Banner */}
                        <div className={`w-full p-2.5 sm:p-3 rounded-2xl border flex items-center gap-2.5 text-xs text-left ${alertStyle}`}>
                          <AlertTriangle size={16} className="flex-shrink-0" />
                          <span>
                            {!isWfhEnabled ? (
                              <><strong>Remote Policy:</strong> Work From Home is disabled by your policy settings.</>
                            ) : isOverQuota ? (
                              <><strong>Quota Exceeded:</strong> You have used all {effectiveMaxWfh} WFH days.</>
                            ) : isWarning ? (
                              <><strong>Running Low:</strong> Only {remainingWfh} WFH day{remainingWfh === 1 ? '' : 's'} remaining this month.</>
                            ) : (
                              <><strong>Healthy Balance:</strong> You have {remainingWfh} WFH days left this month.</>
                            )}
                          </span>
                        </div>

                        {/* Consecutive WFH Limit Alert */}
                        {isWfhEnabled && isConsecutiveLimitExceeded && (
                          <div className="w-full p-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 text-left">
                            <AlertTriangle size={15} className="flex-shrink-0" />
                            <span>
                              <strong>Consecutive Limit:</strong> Logging WFH on this date makes {consecutiveWfhCount} consecutive days (policy guideline is max {maxConsecutiveWfh}).
                            </span>
                          </div>
                        )}

                        {/* Mini Calendar Overview */}
                        <div className="w-full bg-muted/30 border border-border rounded-2xl p-3 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-black uppercase font-mono tracking-wider text-foreground">
                              {currentMonthName}
                            </span>
                            <span className="text-[10px] font-bold font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                              {wfhUsedThisMonth} / {effectiveMaxWfh} WFH Used
                            </span>
                          </div>

                          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground font-mono">
                            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold font-mono">
                            {Array.from({ length: firstDayIndex }).map((_, i) => (
                              <div key={`empty-${i}`} className="h-6 sm:h-7" />
                            ))}

                            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                              const dayNum = i + 1;
                              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                              const isActiveCardDay = dayNum === activeDateNum;
                              const bookedType = bookedMap[dateStr];
                              const isMissingStackDay = dayStack.includes(dateStr);

                              let cellBg = "text-muted-foreground/60";
                              let cellBorder = "border-transparent";

                              if (isActiveCardDay) {
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
                              } else if (isMissingStackDay) {
                                cellBg = "bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold";
                                cellBorder = "border-amber-500/30";
                              }

                              return (
                                <div 
                                  key={`day-${dayNum}`}
                                  className={`h-6 sm:h-7 rounded-lg flex items-center justify-center border transition-all ${cellBg} ${cellBorder}`}
                                >
                                  {dayNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Prompt Caption */}
                        <p className="text-xs font-bold text-muted-foreground mt-0.5">
                          {isCardToday 
                            ? `It is past ${formatHour(wfhPromptHour)}. How are you working today?`
                            : `Did you work remotely or in the office on this day?`}
                        </p>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
                          <button
                            disabled={!isWfhEnabled || isOverQuota}
                            onClick={() => setSelectedAction('wfh')}
                            className={`py-2.5 sm:py-3 px-3 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                              !isWfhEnabled || isOverQuota
                                ? 'bg-muted text-muted-foreground/50 border border-border cursor-not-allowed opacity-60'
                                : 'bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg shadow-cyan-500/20'
                            }`}
                          >
                            <Home size={15} /> {!isWfhEnabled ? 'WFH Disabled' : 'Work From Home'}
                          </button>

                          <button
                            onClick={() => setSelectedAction('office')}
                            className="py-2.5 sm:py-3 px-3 bg-muted border border-border hover:bg-muted/80 text-foreground font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                          >
                            <Building2 size={15} /> In-Office
                          </button>
                        </div>

                        {/* Expandable Quick Leaves Drawer */}
                        <div className="w-full flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setShowQuickLeaves(prev => !prev)}
                            className="w-full py-2 bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-2xl flex items-center justify-between px-3.5 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <CalendarX2 size={14} /> 
                              {isCardToday ? 'Taking a Leave Today Instead?' : 'Were you on Leave that day?'}
                            </span>
                            {showQuickLeaves ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          <AnimatePresence>
                            {showQuickLeaves && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="w-full overflow-hidden flex flex-col gap-2 pt-1"
                              >
                                {quickLeaves.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {quickLeaves.map(q => {
                                      const short = q.shortCode || getShortform(q.name);
                                      return (
                                        <button
                                          key={q.id}
                                          type="button"
                                          onClick={() => setSelectedAction(q.id)}
                                          className="p-2.5 bg-card hover:bg-muted border border-border/80 hover:border-border rounded-xl flex items-center gap-2 text-left transition-all active:scale-95 cursor-pointer"
                                        >
                                          <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center font-mono text-[10px] font-black text-foreground border border-border">
                                            {short}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground truncate">{q.name}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono">{q.quota} {q.cadence === 'month' ? '/mo' : '/yr'}</div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onMarkLeave) onMarkLeave(activeDateStr);
                                  }}
                                  className="w-full py-2 bg-muted/60 hover:bg-muted border border-dashed border-border text-foreground/80 hover:text-foreground text-[11px] font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <span>Open Full Planner / Select Date Range</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>



                        {notificationSupported && notifPermission !== 'granted' && (
                          <button
                            onClick={handleRequestNotif}
                            className="mt-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5 cursor-pointer"
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

            {/* Multi-day Interactive Dots */}
            {isMultiDayMode && dayStack.length > 1 && (
              <div className="flex items-center justify-center mt-2.5 z-20">
                <div className="flex items-center gap-1.5 p-1 bg-card/80 backdrop-blur-md rounded-full border border-border/70 shadow-md">
                  {dayStack.map((d, idx) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (idx === activeCardIndex) return;
                        setDirection(idx > activeCardIndex ? 1 : -1);
                        setActiveCardIndex(idx);
                        setSelectedAction(null);
                        setShowQuickLeaves(false);
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === activeCardIndex
                          ? 'w-5 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                          : idx < activeCardIndex
                          ? 'w-1.5 bg-muted-foreground/60 hover:bg-muted-foreground'
                          : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                      }`}
                      title={`Jump to day ${idx + 1} (${formatCatchupDate(d).shortDate})`}
                      aria-label={`Jump to day ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WfhCheckinModal;
