import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { getShortform } from '../utils/colorUtils';
import AppleBalanceTicker from './AppleBalanceTicker';
import { showAppNotification, requestNotificationPermission, isNotificationSupported, subscribeUserToPush } from '../utils/notificationService';
import { countConsecutiveWorkingDays } from '../services/leaveConfigService';
import { formatCatchupDate } from '../utils/attendanceCatchupUtils';
import { hapticSwipeCard, hapticYes, hapticNo, hapticLight } from '../utils/haptics';

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
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [stageWidth, setStageWidth] = useState(336);
  const carouselStageRef = useRef(null);

  // Active stack of missing days: fallback to [todayStr] if missingDays is empty
  const computedDayStack = useMemo(() => {
    if (Array.isArray(missingDays) && missingDays.length > 0) {
      return missingDays;
    }
    return todayStr ? [todayStr] : [];
  }, [missingDays, todayStr]);

  // Freeze dayStack during exit animation so closing the modal after logging the last day doesn't jump mid-exit
  const frozenStackRef = useRef(computedDayStack);
  if (isOpen) {
    frozenStackRef.current = computedDayStack;
  }
  const dayStack = isOpen ? computedDayStack : frozenStackRef.current;

  // Measure carousel card width so adjacent cards sit at an exact pixel stride
  useEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      if (carouselStageRef.current) {
        const w = carouselStageRef.current.offsetWidth;
        if (w > 100) setStageWidth(w);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 60);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [isOpen, dayStack.length]);

  // Clamp activeCardIndex when dayStack length changes while open
  useEffect(() => {
    if (isOpen && activeCardIndex >= dayStack.length && dayStack.length > 0) {
      setActiveCardIndex(Math.max(0, dayStack.length - 1));
    }
  }, [isOpen, dayStack.length, activeCardIndex]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAction(null);
      setShowQuickLeaves(false);
      setActiveCardIndex(0);
      setDragDeltaX(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  const activeDateStr = dayStack[activeCardIndex] || todayStr;
  const isMultiDayMode = dayStack.length > 1;
  const stridePx = Math.round(stageWidth * 0.93);

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
        showAppNotification('Leave Vault', {
          body: 'Web Push enabled! You will receive daily check-in reminders even when Leave Vault is closed.',
          tag: 'wfh-checkin-confirmation'
        });
        return;
      }
      const res = await requestNotificationPermission();
      if (res) setNotifPermission(res);
      if (res === 'granted') {
        showAppNotification('Leave Vault', {
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
      hapticSwipeCard();
      setIsDragging(false);
      setDragDeltaX(0);
      setActiveCardIndex(prev => prev - 1);
      setSelectedAction(null);
      setShowQuickLeaves(false);
    }
  }, [activeCardIndex]);

  const handleNextCard = useCallback(() => {
    if (activeCardIndex < dayStack.length - 1) {
      hapticSwipeCard();
      setIsDragging(false);
      setDragDeltaX(0);
      setActiveCardIndex(prev => prev + 1);
      setSelectedAction(null);
      setShowQuickLeaves(false);
    }
  }, [activeCardIndex, dayStack.length]);

  const handleDismissModal = useCallback(() => {
    hapticNo();
    onClose();
  }, [onClose]);

  // Keyboard navigation support on desktop
  useEffect(() => {
    if (!isOpen || selectedAction) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        handleNextCard();
      } else if (e.key === 'Escape') {
        handleDismissModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedAction, handlePrevCard, handleNextCard, handleDismissModal]);

  // Unified Touch + Mouse horizontal carousel swipe engine
  const swipeRef = useRef({
    startX: null,
    startY: null,
    startTime: 0,
    isHorizontal: null,
    wasSwiped: false,
    isMouseDown: false
  });

  const beginSwipe = (clientX, clientY, isMouse = false) => {
    if (!isMultiDayMode || selectedAction) return;
    swipeRef.current.startX = clientX;
    swipeRef.current.startY = clientY;
    swipeRef.current.startTime = Date.now();
    swipeRef.current.isHorizontal = null;
    swipeRef.current.wasSwiped = false;
    swipeRef.current.isMouseDown = isMouse;
  };

  const moveSwipe = (clientX, clientY) => {
    if (swipeRef.current.startX === null || !isMultiDayMode || selectedAction) return;
    const dx = clientX - swipeRef.current.startX;
    const dy = clientY - swipeRef.current.startY;

    if (swipeRef.current.isHorizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      const isHoriz = Math.abs(dx) > Math.abs(dy) * 1.1;
      swipeRef.current.isHorizontal = isHoriz;
      if (isHoriz) {
        setIsDragging(true);
      }
    }

    if (swipeRef.current.isHorizontal) {
      if (Math.abs(dx) > 14) {
        swipeRef.current.wasSwiped = true;
      }
      const atBoundary = (activeCardIndex === 0 && dx > 0) || (activeCardIndex === dayStack.length - 1 && dx < 0);
      const dampedDx = atBoundary ? dx * 0.25 : dx * 0.88;
      setDragDeltaX(dampedDx);
    }
  };

  const endSwipe = (clientX) => {
    if (swipeRef.current.startX === null) return;
    const dx = (clientX ?? swipeRef.current.startX) - swipeRef.current.startX;
    const dt = Math.max(1, Date.now() - swipeRef.current.startTime);
    const vx = (dx / dt) * 1000;
    const wasHoriz = swipeRef.current.isHorizontal;

    swipeRef.current.startX = null;
    swipeRef.current.startY = null;
    swipeRef.current.isHorizontal = null;
    swipeRef.current.isMouseDown = false;

    // Synchronously transition to target card and reset dragDeltaX so cards continue forward smoothly
    setIsDragging(false);
    setDragDeltaX(0);

    if (wasHoriz) {
      if ((dx < -38 || vx < -220) && activeCardIndex < dayStack.length - 1) {
        hapticSwipeCard();
        setActiveCardIndex(prev => prev + 1);
        setSelectedAction(null);
        setShowQuickLeaves(false);
      } else if ((dx > 38 || vx > 220) && activeCardIndex > 0) {
        hapticSwipeCard();
        setActiveCardIndex(prev => prev - 1);
        setSelectedAction(null);
        setShowQuickLeaves(false);
      }
    }

    if (swipeRef.current.wasSwiped) {
      setTimeout(() => {
        swipeRef.current.wasSwiped = false;
      }, 90);
    }
  };

  const handleCardTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      beginSwipe(e.touches[0].clientX, e.touches[0].clientY, false);
    }
  };

  const handleCardTouchMove = (e) => {
    if (e.touches && e.touches.length === 1) {
      moveSwipe(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleCardTouchEnd = (e) => {
    const endX = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0].clientX : null;
    endSwipe(endX);
  };

  const handleCardMouseDown = (e) => {
    if (e.button !== 0) return;
    beginSwipe(e.clientX, e.clientY, true);
  };

  const handleCardMouseMove = (e) => {
    if (!swipeRef.current.isMouseDown) return;
    moveSwipe(e.clientX, e.clientY);
  };

  const handleCardMouseUp = (e) => {
    if (!swipeRef.current.isMouseDown) return;
    endSwipe(e.clientX);
  };

  const handleCardClickCapture = (e) => {
    if (swipeRef.current.wasSwiped) {
      e.stopPropagation();
      e.preventDefault();
      swipeRef.current.wasSwiped = false;
    }
  };

  const handleActionComplete = (status) => {
    if (onSelectStatus) {
      onSelectStatus(status, activeDateStr);
    }
    // If there are more cards after this one, advance index, else close
    if (activeCardIndex < dayStack.length - 1) {
      hapticSwipeCard();
      setIsDragging(false);
      setDragDeltaX(0);
      setActiveCardIndex(prev => prev + 1);
      setSelectedAction(null);
      setShowQuickLeaves(false);
    } else {
      onClose();
    }
  };

  const renderCarouselCard = (cardDateStr, idx) => {
    const isCenterCard = idx === activeCardIndex;
    const relIndex = idx - activeCardIndex;
    const offsetPx = relIndex * stridePx + dragDeltaX;
    const absDist = Math.abs(offsetPx) / Math.max(1, stridePx);
    const cardScale = Math.max(0.84, 1 - Math.min(1.5, absDist) * 0.09);
    const cardOpacity = Math.max(0, 1 - Math.min(1.8, absDist) * 0.48);
    const cardZIndex = 30 - Math.round(absDist * 10);

    // Date parsing for this specific card
    let cardDateObj;
    if (cardDateStr && cardDateStr.includes('-')) {
      const [y, m, d] = cardDateStr.split('-').map(Number);
      cardDateObj = new Date(y, m - 1, d);
    } else {
      cardDateObj = new Date();
    }
    const cardDateFormatted = cardDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const cardMonthName = cardDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isCardToday = cardDateStr === todayStr;

    const cardYear = cardDateObj.getFullYear();
    const cardMonth = cardDateObj.getMonth();
    const cardFirstDayIndex = new Date(cardYear, cardMonth, 1).getDay();
    const cardTotalDaysInMonth = new Date(cardYear, cardMonth + 1, 0).getDate();
    const cardDateNum = cardDateObj.getDate();

    const cardConsecutiveWfhCount = cardDateStr
      ? countConsecutiveWorkingDays([cardDateStr], 'wfh', bookedDates)
      : 0;
    const isCardConsecutiveExceeded = Boolean(maxConsecutiveWfh && cardConsecutiveWfhCount > maxConsecutiveWfh);

    return (
      <motion.div
        key={cardDateStr}
        initial={false}
        animate={{
          x: offsetPx,
          scale: cardScale,
          opacity: cardOpacity
        }}
        transition={
          isDragging
            ? { duration: 0 }
            : { type: 'spring', stiffness: 360, damping: 32, mass: 0.85 }
        }
        style={{ zIndex: cardZIndex }}
        onClick={!isCenterCard ? () => {
          if (swipeRef.current.wasSwiped) return;
          if (idx < activeCardIndex) handlePrevCard();
          else if (idx > activeCardIndex) handleNextCard();
        } : undefined}
        className={`col-start-1 row-start-1 relative bg-card w-full rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[min(86dvh,calc(100dvh-4.5rem-env(safe-area-inset-bottom,0px)))] touch-pan-y ${
          isMultiDayMode ? (isCenterCard ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer') : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex justify-between items-center flex-shrink-0">
          <div className="min-w-0 pr-2 overflow-hidden text-left">
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
              {cardDateFormatted}
            </h3>
          </div>

          {isCenterCard && !selectedAction && (
            <button 
              onClick={handleDismissModal}
              className="p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors cursor-pointer flex-shrink-0"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className={`p-4 sm:p-5 flex flex-col gap-3.5 items-center text-center flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain pb-6 ${!isCenterCard ? 'pointer-events-none' : ''}`}>
          {isCenterCard && selectedAction ? (
            <motion.div
              key="wfh-ticker"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
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
            <div className="w-full flex flex-col gap-3 items-center text-center">
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
              {isWfhEnabled && isCardConsecutiveExceeded && (
                <div className="w-full p-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 text-left">
                  <AlertTriangle size={15} className="flex-shrink-0" />
                  <span>
                    <strong>Consecutive Limit:</strong> Logging WFH on this date makes {cardConsecutiveWfhCount} consecutive days (policy guideline is max {maxConsecutiveWfh}).
                  </span>
                </div>
              )}

              {/* Mini Calendar Overview */}
              <div className="w-full bg-muted/30 border border-border rounded-2xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-black uppercase font-mono tracking-wider text-foreground">
                    {cardMonthName}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {wfhUsedThisMonth} / {effectiveMaxWfh} WFH Used
                  </span>
                </div>

                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground font-mono">
                  <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold font-mono">
                  {Array.from({ length: cardFirstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-6 sm:h-7" />
                  ))}

                  {Array.from({ length: cardTotalDaysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${cardYear}-${String(cardMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isActiveCardDay = dayNum === cardDateNum;
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
                  onClick={() => {
                    hapticYes();
                    setSelectedAction('wfh');
                  }}
                  className={`py-2.5 sm:py-3 px-3 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    !isWfhEnabled || isOverQuota
                      ? 'bg-muted text-muted-foreground/50 border border-border cursor-not-allowed opacity-60'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg shadow-cyan-500/20'
                  }`}
                >
                  <Home size={15} /> {!isWfhEnabled ? 'WFH Disabled' : 'Work From Home'}
                </button>

                <button
                  onClick={() => {
                    hapticYes();
                    setSelectedAction('office');
                  }}
                  className="py-2.5 sm:py-3 px-3 bg-muted border border-border hover:bg-muted/80 text-foreground font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Building2 size={15} /> In-Office
                </button>
              </div>

              {/* Expandable Quick Leaves Drawer */}
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setShowQuickLeaves(prev => !prev);
                  }}
                  className="w-full py-2 bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-2xl flex items-center justify-between px-3.5 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CalendarX2 size={14} /> 
                    {isCardToday ? 'Taking a Leave Today Instead?' : 'Were you on Leave that day?'}
                  </span>
                  {isCenterCard && showQuickLeaves ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isCenterCard && showQuickLeaves && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
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
                              onClick={() => {
                                hapticYes();
                                setSelectedAction(q.id);
                              }}
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
                        hapticLight();
                        if (onMarkLeave) onMarkLeave(cardDateStr);
                      }}
                      className="w-full py-2 bg-muted/60 hover:bg-muted border border-dashed border-border text-foreground/80 hover:text-foreground text-[11px] font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Open Full Planner / Select Date Range</span>
                    </button>
                  </motion.div>
                )}
              </div>

              {notificationSupported && notifPermission !== 'granted' && (
                <button
                  onClick={handleRequestNotif}
                  className="mt-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell size={13} /> Enable Browser Notification Reminders
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none overflow-hidden">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }} 
            transition={{ duration: 0.2 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
            onClick={selectedAction ? undefined : handleDismissModal} 
          />

          {/* Modal Container — Unified entry & exit animation */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 26, stiffness: 340 } }}
            exit={{ opacity: 0, y: 14, scale: 0.96, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
            className="relative w-full max-w-md mx-auto z-10 flex flex-col items-center"
          >
            
            {/* Top Multi-Day Stack Header / Counter */}
            {isMultiDayMode && (
              <div 
                className="w-[84vw] max-w-[336px] sm:max-w-[400px] flex items-center justify-between px-3 py-2 mb-2.5 bg-card rounded-2xl border border-border/80 text-xs shadow-lg z-30"
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
              </div>
            )}

            {/* Horizontal Multi-Card Carousel Stage */}
            <div
              ref={carouselStageRef}
              onTouchStart={isMultiDayMode ? handleCardTouchStart : undefined}
              onTouchMove={isMultiDayMode ? handleCardTouchMove : undefined}
              onTouchEnd={isMultiDayMode ? handleCardTouchEnd : undefined}
              onTouchCancel={isMultiDayMode ? handleCardTouchEnd : undefined}
              onMouseDown={isMultiDayMode ? handleCardMouseDown : undefined}
              onMouseMove={isMultiDayMode ? handleCardMouseMove : undefined}
              onMouseUp={isMultiDayMode ? handleCardMouseUp : undefined}
              onMouseLeave={isMultiDayMode ? handleCardMouseUp : undefined}
              onClickCapture={isMultiDayMode ? handleCardClickCapture : undefined}
              className={`relative ${isMultiDayMode ? 'w-[84vw] max-w-[336px] sm:max-w-[400px]' : 'w-full max-w-md'} grid grid-cols-1 grid-rows-1 items-center justify-items-center overflow-visible`}
            >
              {dayStack.map((cardDateStr, idx) => {
                if (Math.abs(idx - activeCardIndex) > 2) return null;
                return renderCarouselCard(cardDateStr, idx);
              })}
            </div>

            {/* Multi-day Interactive Dots */}
            {isMultiDayMode && dayStack.length > 1 && (
              <div className="flex items-center justify-center mt-2.5 z-30">
                <div className="flex items-center gap-1.5 p-1 bg-card rounded-full border border-border/70 shadow-md">
                  {dayStack.map((d, idx) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (idx === activeCardIndex) return;
                        hapticSwipeCard();
                        setIsDragging(false);
                        setDragDeltaX(0);
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
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WfhCheckinModal;
