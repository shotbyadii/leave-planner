import React, { useState, useEffect } from 'react';
import { isHoliday, isWeekend } from '../data/holidays';
import { addLeave, removeLeave, createLeavePlan } from '../services/leaveService';
import LeaveSelectionBar from './LeaveSelectionBar';
import ExistingLeaveModal from './ExistingLeaveModal';
import { ChevronDown, ChevronRight, Check, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

const Calendar = ({ holidays, bookedDates, setBookedDates, leaves, setLeaves, loadLeaves, previewDates, setPreviewDates, hoveredSuggestion, viewMode, setViewMode, focusedMonth, setFocusedMonth, setIsSelecting, selectionStart, setSelectionStart, onMobileConfirm, leavePlans = [], todayDate, calendarStyle = 'classic', focusedCellHeight = 56, theme = 'system', viewingLeave: propViewingLeave, setViewingLeave: propSetViewingLeave, onAdvanceTutorial }) => {
  const year = 2026;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const [internalViewingLeave, setInternalViewingLeave] = useState(null);
  const viewingLeave = propViewingLeave !== undefined ? propViewingLeave : internalViewingLeave;
  const setViewingLeave = propSetViewingLeave || setInternalViewingLeave;

  const [localSelectionStart, setLocalSelectionStart] = useState(null);
  const _selectionStart = selectionStart !== undefined ? selectionStart : localSelectionStart;
  const _setSelectionStart = setSelectionStart || setLocalSelectionStart;

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || document.documentElement.className.includes('dark');
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateDarkMode = () => {
      if (typeof document !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark') || document.documentElement.className.includes('dark');
        setIsDarkMode(isDark);
      }
    };
    updateDarkMode();

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(updateDarkMode);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, [theme]);

  const effectiveCellHeight = isMobile ? 42 : (focusedCellHeight || 56);

  useEffect(() => {
    if (setIsSelecting) {
      setIsSelecting(!!_selectionStart);
    }
  }, [_selectionStart, setIsSelecting]);

  const today = todayDate ? new Date(todayDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month) => new Date(year, month, 1).getDay();

  const isMonthPast = (monthIndex) => {
    const lastDay = new Date(year, monthIndex + 1, 0);
    return lastDay < today;
  };

  const getPlanRangeStatus = (dateStr, dayOfWeek) => {
    if (!leavePlans || leavePlans.length === 0) return null;
    for (const plan of leavePlans) {
      if (plan.start_date && plan.end_date) {
        const startStr = String(plan.start_date).split('T')[0];
        const endStr = String(plan.end_date).split('T')[0];
        if (startStr === endStr) continue;

        if (dateStr >= startStr && dateStr <= endStr) {
          const isStart = dateStr === startStr;
          const isEnd = dateStr === endStr;
          return {
            plan,
            isStart,
            isEnd,
            isMiddle: !isStart && !isEnd,
            isRowStart: dayOfWeek === 0,
            isRowEnd: dayOfWeek === 6
          };
        }
      }
    }
    return null;
  };

  const getAllDatesInRange = (startStr, endStr) => {
    const d1 = new Date(startStr);
    const d2 = new Date(endStr);
    const start = d1 < d2 ? d1 : d2;
    const end = d1 < d2 ? d2 : d1;

    const allDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      allDates.push(dateStr);
    }
    return allDates;
  };

  const findTripForDate = (dateStr) => {
    const leaveObj = bookedDates.find(b => b.date === dateStr);
    if (!leaveObj || ['wfh', 'office'].includes(leaveObj.type)) {
      return [dateStr];
    }
    let tripDates = [dateStr];
    let d = new Date(dateStr);
    while (true) {
      d.setDate(d.getDate() - 1);
      const prevDateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const prevLeave = bookedDates.find(b => b.date === prevDateStr);
      const isActualLeaveBooked = prevLeave && ['pl', 'el', 'rh'].includes(prevLeave.type);
      if (isActualLeaveBooked || isWeekend(prevDateStr) || isHoliday(prevDateStr)) {
        tripDates.unshift(prevDateStr);
      } else {
        break;
      }
    }
    d = new Date(dateStr);
    while (true) {
      d.setDate(d.getDate() + 1);
      const nextDateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const nextLeave = bookedDates.find(b => b.date === nextDateStr);
      const isActualLeaveBooked = nextLeave && ['pl', 'el', 'rh'].includes(nextLeave.type);
      if (isActualLeaveBooked || isWeekend(nextDateStr) || isHoliday(nextDateStr)) {
        tripDates.push(nextDateStr);
      } else {
        break;
      }
    }
    return tripDates;
  };

  const handleDayClick = async (month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existingLeave = bookedDates.find(d => d.date === dateStr);
    if (existingLeave) {
      // Find associated plan explicitly created in DB
      const associatedPlan = leavePlans.find(p => p.id === existingLeave.plan_id);
      let tripDates = [dateStr];
      if (associatedPlan) {
        const pStart = associatedPlan.start_date || associatedPlan.startDate;
        const pEnd = associatedPlan.end_date || associatedPlan.endDate;
        if (pStart && pEnd) {
          tripDates = getAllDatesInRange(pStart, pEnd);
        }
      }
      setViewingLeave({ targetLeave: existingLeave, tripDates, associatedPlan });
      return;
    }
    if (_selectionStart) {
      const range = getAllDatesInRange(_selectionStart, dateStr);
      setPreviewDates(range);
      _setSelectionStart(null);
    } else {
      if (previewDates.length > 0) setPreviewDates([]);
      _setSelectionStart(dateStr);
    }
    if (onAdvanceTutorial) onAdvanceTutorial();
  };

  const handleModalApply = async (datesArray, type, note, planName, durationPerDay = 1) => {
    let planId = null;
    if (datesArray.length > 1) {
      const plan = await createLeavePlan(planName || 'Untitled Plan', datesArray[0], datesArray[datesArray.length - 1]);
      planId = plan?.id || null;
    }
    for (const dateStr of datesArray) {
      if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
        await addLeave(dateStr, type, note, planId, durationPerDay);
      }
    }
    await loadLeaves();
    setPreviewDates([]);
  };

  const handleCancelLeave = async (dateStrOrArray) => {
    if (Array.isArray(dateStrOrArray)) {
      for (const dateStr of dateStrOrArray) {
        if (bookedDates.some(b => b.date === dateStr)) await removeLeave(dateStr);
      }
    } else {
      await removeLeave(dateStrOrArray);
    }
    await loadLeaves();
    setViewingLeave(null);
  };

  const handleCancelPlan = async (planId) => {
    if (onDeletePlan) {
      await onDeletePlan(planId);
    }
    await loadLeaves();
    setViewingLeave(null);
  };

  const handleConvertToOffice = async (dateStr) => {
    await removeLeave(dateStr);
    await addLeave(dateStr, 'office');
    await loadLeaves();
    setViewingLeave(null);
  };

  const handleConvertToWfh = async (dateStr) => {
    await removeLeave(dateStr);
    await addLeave(dateStr, 'wfh');
    await loadLeaves();
    setViewingLeave(null);
  };

  const handleConvertToLeave = async (dateStr) => {
    await removeLeave(dateStr);
    await loadLeaves();
    setViewingLeave(null);
    _setSelectionStart(dateStr);
    setPreviewDates([dateStr]);
    if (onMobileConfirm && typeof window !== 'undefined' && window.innerWidth < 768) {
      onMobileConfirm();
    }
  };

  const renderMonth = (monthIndex, isLarge = false, isInteractive = true, isPastOverride = null, wrapperClasses = '', onClick = null) => {
    const isMini = !isLarge;
    const isPastMonth = isPastOverride !== null ? isPastOverride : isMonthPast(monthIndex);
    const opacityClass = isPastMonth && !isLarge ? 'opacity-50 grayscale' : 'opacity-100';
    const daysInMonth = getDaysInMonth(monthIndex);
    const firstDay = getFirstDayOfMonth(monthIndex);
    const days = [];
    const monthHolidays = [];

    const isCapsule = calendarStyle === 'capsule';

    const cellClass = isLarge 
      ? (isCapsule ? "h-8 md:h-9 text-xs md:text-sm font-mono" : "w-10 h-10 md:w-12 md:h-12 text-sm md:text-base")
      : (isMini 
          ? (isCapsule ? "h-2.5 md:h-6 text-[0px] md:text-[11px] font-mono" : "w-1.5 h-1.5 md:w-6 md:h-6 text-[0px] md:text-sm")
          : (isCapsule ? "h-7 md:h-8 text-xs md:text-sm font-mono" : "w-8 h-8 text-sm"));

    const headerClass = isLarge ? "w-10 md:w-12 text-[10px] md:text-xs" : (isMini ? "w-1.5 md:w-6 text-[0px] md:text-[10px]" : "w-8 text-[10px]");

    const useNavy = isDarkMode && isLarge;

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`e-${i}`} className={cellClass} style={isLarge ? { height: `${effectiveCellHeight}px` } : {}}></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const holidayInfo = isHoliday(dateStr);
      const weekend = isWeekend(dateStr);
      const bookedLeave = bookedDates.find(d => d.date === dateStr);
      const cellDate = new Date(dateStr);
      cellDate.setHours(0,0,0,0);
      const isPast = cellDate < today;
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = previewDates.includes(dateStr) || selectionStart === dateStr;

      let isHovered = false;
      if (hoveredSuggestion) {
        const hsStart = new Date(hoveredSuggestion.startDateStr);
        const hsEnd = new Date(hoveredSuggestion.endDateStr);
        isHovered = cellDate >= hsStart && cellDate <= hsEnd;
      }

      if (holidayInfo) monthHolidays.push({ day: i, name: holidayInfo.name });

      let baseClasses = `${cellClass} ${isCapsule ? (isMini ? 'rounded-sm md:rounded-md' : 'rounded-lg md:rounded-xl') : 'rounded-full'} flex items-center justify-center transition-all relative select-none `;

      if (isCapsule) {
        if (isSelected) {
          baseClasses += useNavy
            ? "bg-primary text-primary-foreground font-black ring-4 ring-primary/30 z-10 scale-105 shadow-lg"
            : "bg-primary text-primary-foreground font-black ring-4 ring-primary/20 z-10 scale-105 shadow-lg";
        } else if (isToday) {
          baseClasses += "bg-cyan-500/10 border-2 border-cyan-500 ring-2 ring-cyan-500/30 text-cyan-500 font-black z-10 scale-105 shadow-md";
        } else if (isHovered) {
          baseClasses += "bg-yellow-400/30 text-yellow-500 font-black border border-yellow-300 scale-105 z-10";
        } else if (bookedLeave) {
          if (bookedLeave.type === 'pl') {
            baseClasses += "bg-blue-500/15 border border-blue-500/40 text-blue-500 font-black cursor-pointer shadow-sm";
          } else if (bookedLeave.type === 'el') {
            baseClasses += "bg-orange-500/15 border border-orange-500/40 text-orange-500 font-black cursor-pointer shadow-sm";
          } else if (bookedLeave.type === 'rh') {
            baseClasses += "bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 font-black cursor-pointer shadow-sm";
          } else if (bookedLeave.type === 'wfh') {
            baseClasses += "bg-cyan-500/15 border border-cyan-500/40 text-cyan-500 font-black cursor-pointer shadow-sm";
          } else {
            baseClasses += "bg-muted/40 border border-border/60 hover:bg-muted cursor-pointer text-foreground font-bold";
          }
        } else if (holidayInfo) {
          baseClasses += "bg-purple-500/15 border border-purple-500/40 text-purple-500 font-black";
        } else if (weekend) {
          baseClasses += useNavy ? "text-white/40 bg-transparent" : "text-muted-foreground/40 bg-transparent";
        } else if (isPast) {
          baseClasses += "text-muted-foreground/40 bg-muted/20 border border-border/30 opacity-50 cursor-pointer";
        } else {
          baseClasses += useNavy ? "bg-white/10 border border-white/15 hover:bg-white/25 cursor-pointer text-white font-bold" : "bg-card border border-border/60 hover:bg-muted/70 cursor-pointer text-foreground font-bold shadow-2xs";
        }
      } else {
        if (isSelected) {
          if (holidayInfo || weekend) {
            baseClasses += useNavy
              ? "bg-white/25 text-white font-bold z-10 scale-105 border border-white/40 border-dashed"
              : "bg-muted text-foreground font-bold z-10 scale-105 shadow-apple-sm border border-border border-dashed";
          } else {
            baseClasses += useNavy
              ? "bg-white text-blue-900 font-bold ring-4 ring-white/20 z-10 scale-105 shadow-apple-sm"
              : "bg-primary text-primary-foreground font-bold ring-4 ring-border z-10 scale-105 shadow-apple-sm";
          }
        } else if (isToday) {
          baseClasses += useNavy
            ? "bg-white text-blue-900 font-bold ring-2 ring-white/40 z-10 scale-105 shadow-apple-sm"
            : "bg-blue-600 text-white font-bold ring-2 ring-blue-200 z-10 scale-105 shadow-apple-sm animate-pulse-subtle";
        } else if (isHovered) {
          if (holidayInfo || weekend) {
            baseClasses += useNavy
              ? "bg-yellow-400/30 text-white border border-yellow-300/50 border-dashed scale-105 z-10"
              : "bg-yellow-100 text-yellow-900 border border-yellow-300 border-dashed scale-105 z-10";
          } else {
            baseClasses += useNavy
              ? "bg-yellow-400/50 text-white font-bold ring-2 ring-yellow-300/60 scale-105 z-10 shadow-sm"
              : "bg-yellow-300 text-yellow-900 font-bold ring-2 ring-yellow-400 scale-105 z-10 shadow-sm";
          }
        } else if (bookedLeave) {
          const typeInfo = leaves ? leaves[bookedLeave.type] : null;
          const colorBg = typeInfo?.bg || (bookedLeave.type === 'pl' ? 'bg-blue-500' : bookedLeave.type === 'el' ? 'bg-orange-500' : 'bg-green-500');
          if (['pl', 'el', 'rh'].includes(bookedLeave.type)) {
            baseClasses += `${colorBg} text-white font-medium cursor-pointer shadow-sm ring-1 ring-white/20`;
          } else if (bookedLeave.type === 'wfh') {
            baseClasses += useNavy ? "hover:bg-white/15 cursor-pointer text-white font-bold" : "hover:bg-muted cursor-pointer text-foreground font-bold";
          } else if (bookedLeave.type === 'office') {
            baseClasses += useNavy ? "hover:bg-white/15 cursor-pointer text-white/90" : "hover:bg-muted cursor-pointer text-foreground";
          }
        } else if (holidayInfo) {
          baseClasses += useNavy ? "bg-purple-500 text-white font-medium" : "bg-purple-200 text-purple-900 font-medium";
        } else if (weekend) {
          baseClasses += useNavy ? "text-white/50 bg-white/10" : "text-muted-foreground bg-muted";
        } else if (isPast) {
          baseClasses += useNavy ? "text-white/30 bg-white/5 opacity-50 hover:opacity-70 hover:bg-white/10 cursor-pointer" : "text-muted-foreground/60 bg-muted/50 opacity-50 hover:opacity-70 hover:bg-muted cursor-pointer";
        } else {
          baseClasses += useNavy ? "hover:bg-white/15 cursor-pointer text-white/90" : "hover:bg-muted cursor-pointer text-foreground";
        }
      }

      const isWfh = bookedLeave?.type === 'wfh';

      days.push(
        <div key={`d-${i}`} id={`date-cell-${year}-${monthIndex}-${i}`} className={baseClasses} style={isLarge ? { height: `${effectiveCellHeight}px` } : {}} onClick={(e) => { if (isInteractive) { e.stopPropagation(); handleDayClick(monthIndex, i); } }} title={holidayInfo ? holidayInfo.name : (isWfh ? 'Work From Home' : (isPast ? 'Past date — click to log retroactive leave' : ''))}>
          {!isCapsule && isWfh && (
            <span className={isMini ? "absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/90 z-20 pointer-events-none ring-1 ring-background/40" : "absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/90 z-20 pointer-events-none"} />
          )}
          <span className={isMini ? 'hidden md:inline' : ''}>{i}</span>
        </div>
      );
    }

    const isCurrentMonthCard = monthIndex === new Date().getMonth();

    let cardBg = 'bg-card border-border shadow-apple-sm';
    if (isLarge) {
      cardBg = isCapsule
        ? 'bg-gradient-to-br from-blue-50/95 via-sky-50/85 to-indigo-100/75 border-blue-200/70 shadow-xl shadow-blue-500/10 dark:from-slate-950 dark:via-[#0f172a] dark:to-slate-950 dark:border-slate-800/80 dark:shadow-2xl'
        : 'bg-gradient-to-br from-blue-50/95 via-sky-50/85 to-indigo-100/75 border-blue-200/70 shadow-xl shadow-blue-500/10 dark:from-[#0f172a] dark:via-[#1e3a6e] dark:to-[#1d4ed8] dark:border-blue-900/30 dark:shadow-apple-md';
    } else if (isCurrentMonthCard) {
      cardBg = 'bg-card border-2 border-blue-500/40 dark:border-blue-400/40 ring-4 ring-blue-500/10 dark:ring-blue-400/10 shadow-lg shadow-blue-500/5 relative overflow-visible';
    }

    return (
      <motion.div
        id={`month-card-${monthIndex}`}
        layoutId={isMobile ? undefined : `month-card-${monthIndex}`}
        layout={isMobile ? false : true}
        key={`month-${monthIndex}`}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.015 } : {}}
        transition={{
          layout: { type: 'spring', stiffness: 135, damping: 21, mass: 0.95 },
          opacity: { duration: 0.2 }
        }}
        className={`${cardBg} border flex flex-col transition-[opacity,background-color,border-color] duration-300 ease-out transform-gpu origin-top-left overflow-hidden ${isLarge ? 'p-4 md:p-6 rounded-2xl min-h-[300px]' : (isMini ? 'p-1.5 md:p-2.5 rounded-xl h-auto md:h-full flex flex-col justify-start md:justify-between gap-0.5 md:gap-0' : 'p-5 rounded-2xl hover:border-foreground/20')} ${isPastMonth && !isLarge ? 'opacity-50 hover:opacity-90' : opacityClass} ${wrapperClasses}`}
      >
        <div className={`flex justify-between items-center ${isLarge ? 'mb-4' : (isMini ? 'mb-2' : 'mb-4')}`}>
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold leading-none ${useNavy ? 'text-white' : 'text-foreground'} ${isLarge ? 'text-lg md:text-xl' : (isMini ? 'text-[11px] uppercase tracking-wider' : 'text-lg group-hover:text-muted-foreground')}`}>
              {isMini ? monthNames[monthIndex].substring(0,3) : monthNames[monthIndex]}
            </h3>
            {isCurrentMonthCard && !isLarge && (
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider font-mono">
                Current
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`${isLarge ? 'text-xs md:text-sm' : (isMini ? 'text-[9px]' : 'text-xs')} font-medium leading-none ${useNavy ? 'text-white/60' : 'text-muted-foreground'}`}>
              {isMini ? "'26" : year}
            </span>
          </div>
        </div>

        <div className={`grid grid-cols-7 ${isLarge ? 'gap-1 md:gap-2 mb-4' : 'gap-px md:gap-1 mb-2'} ${isMini ? 'md:mb-2' : ''}`}>
          {dayNames.map(d => (
            <div key={d} className={`${headerClass} font-semibold flex items-center justify-center ${useNavy ? 'text-white/50' : 'text-muted-foreground'}`}>
              <span className={isMini ? 'hidden md:inline' : ''}>{d}</span>
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 ${isLarge ? 'gap-1 md:gap-2 mb-3' : 'gap-px md:gap-1 mb-2.5'}`}>
          {days}
        </div>

        <div className={`mt-auto pt-3.5 border-t ${useNavy ? 'border-white/20' : 'border-border'} ${isMini ? 'hidden md:block' : ''}`}>
          {monthHolidays.length > 0 ? (
            <div className={`grid ${isLarge ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-x-3 gap-y-1'} ${isMini ? 'hidden md:grid' : ''}`}>
              {monthHolidays.map((h, idx) => (
                <div key={idx} className={`flex items-center gap-1.5 ${isLarge ? 'text-sm' : 'text-[10px]'} ${useNavy ? 'text-white/60' : 'text-muted-foreground'} min-w-0`}>
                  <div className={`${isLarge ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full ${useNavy ? 'bg-purple-300' : 'bg-purple-400'} flex-shrink-0`}></div>
                  <span className={`font-bold flex-shrink-0 ${useNavy ? 'text-white' : 'text-foreground'}`}>{h.day}</span>
                  <span className="truncate" title={h.name}>{h.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={`italic ${isLarge ? 'text-sm' : 'text-[10px]'} ${useNavy ? 'text-white/40' : 'text-muted-foreground/50'} ${isMini ? 'hidden md:block' : ''}`}>No holidays</div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <LayoutGroup id="calendar-cards">
      <div id="tutorial-step-calendar" className="flex flex-col gap-6 relative z-10 h-full">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-lg font-bold text-foreground">{viewMode === 'monthly' ? 'Focused View' : 'Yearly Grid'}</h2>
          <div className="flex bg-muted p-1 rounded-xl w-fit ml-auto shadow-inner">
            <button onClick={() => setViewMode('monthly')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'monthly' ? 'bg-background shadow-apple-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Focused View">
              <CalendarIcon size={18} />
            </button>
            <button onClick={() => setViewMode('yearly')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'yearly' ? 'bg-background shadow-apple-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Yearly Grid">
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        {isMobile ? (
          <motion.div layout transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`mobile-view-${viewMode}-${focusedMonth}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                {viewMode === 'yearly' ? (
                  <div className="grid grid-cols-3 md:grid-cols-2 gap-2 p-1 pb-6">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].sort((a,b) => isMonthPast(a) === isMonthPast(b) ? a-b : (isMonthPast(a) ? 1 : -1)).map(m => renderMonth(m, false, false, isMonthPast(m), "cursor-pointer hover:opacity-90", () => { setFocusedMonth(m); setViewMode('monthly'); if (onAdvanceTutorial) onAdvanceTutorial(); }))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 items-start p-1 w-full">
                    <div className="w-full">{renderMonth(focusedMonth, true)}</div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            layout 
            transition={{ layout: { type: 'spring', stiffness: 130, damping: 22, mass: 1 } }}
            className="w-full overflow-visible"
          >
            {viewMode === 'yearly' ? (
              <div className="grid grid-cols-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 md:gap-6 items-stretch p-2 pb-6 overflow-visible">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].sort((a,b) => isMonthPast(a) === isMonthPast(b) ? a-b : (isMonthPast(a) ? 1 : -1)).map(m => renderMonth(m, false, false, isMonthPast(m), "cursor-pointer hover:opacity-90", () => { setFocusedMonth(m); setViewMode('monthly'); if (onAdvanceTutorial) onAdvanceTutorial(); }))}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 items-start h-auto md:h-[calc(100vh-280px)] p-1 overflow-visible">
                <div className="flex-1 flex justify-start w-full relative z-10 overflow-visible">
                  <div className="w-full">{renderMonth(focusedMonth, true)}</div>
                </div>
                <div className="hidden md:flex w-80 flex-shrink-0 flex-col gap-4 overflow-y-auto overflow-x-visible h-full p-2 pb-24 no-scrollbar relative z-10">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(m => m !== focusedMonth).sort((a,b) => isMonthPast(a) === isMonthPast(b) ? a-b : (isMonthPast(a) ? 1 : -1)).map(m => renderMonth(m, false, false, isMonthPast(m), `cursor-pointer transition-all w-full flex-shrink-0 !h-auto ${isMonthPast(m) ? 'opacity-50 hover:opacity-90' : 'opacity-100'}`, () => setFocusedMonth(m)))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {viewingLeave && (
          <ExistingLeaveModal 
            leaveObj={viewingLeave} 
            onClose={() => setViewingLeave(null)} 
            onCancelLeave={handleCancelLeave}
            onCancelPlan={handleCancelPlan}
            onConvertToOffice={handleConvertToOffice}
            onConvertToWfh={handleConvertToWfh}
            onConvertToLeave={handleConvertToLeave}
            leaves={leaves}
            calendarStyle={calendarStyle}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
};

export default Calendar;
