import React, { useState, useEffect } from 'react';
import { isHoliday, isWeekend } from '../data/holidays';
import { addLeave, removeLeave, createLeavePlan } from '../services/leaveService';
import LeaveSelectionBar from './LeaveSelectionBar';
import ExistingLeaveModal from './ExistingLeaveModal';
import { ChevronDown, ChevronRight, Check, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

const Calendar = ({ holidays, bookedDates, setBookedDates, leaves, setLeaves, loadLeaves, previewDates, setPreviewDates, hoveredSuggestion, viewMode, setViewMode, focusedMonth, setFocusedMonth, setIsSelecting, selectionStart, setSelectionStart, onMobileConfirm, leavePlans = [] }) => {
  const year = 2026;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const [viewingLeave, setViewingLeave] = useState(null);
  const [localSelectionStart, setLocalSelectionStart] = useState(null);
  const _selectionStart = selectionStart !== undefined ? selectionStart : localSelectionStart;
  const _setSelectionStart = setSelectionStart || setLocalSelectionStart;

  useEffect(() => {
    if (setIsSelecting) {
      setIsSelecting(!!_selectionStart);
    }
  }, [_selectionStart, setIsSelecting]);

  const today = new Date();
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

  const renderMonth = (monthIndex, isLarge = false, isInteractive = true, isPastOverride = null, wrapperClasses = '', onClick = null) => {
    const isMini = !isLarge;
    const isPastMonth = isPastOverride !== null ? isPastOverride : isMonthPast(monthIndex);
    const opacityClass = isPastMonth && !isLarge ? 'opacity-50 grayscale' : 'opacity-100';
    const daysInMonth = getDaysInMonth(monthIndex);
    const firstDay = getFirstDayOfMonth(monthIndex);
    const days = [];
    const monthHolidays = [];

    const cellClass = isLarge ? "w-10 h-10 md:w-12 md:h-12 text-sm md:text-base" : (isMini ? "w-1.5 h-1.5 md:w-6 md:h-6 text-[0px] md:text-sm" : "w-8 h-8 text-sm");
    const headerClass = isLarge ? "w-10 md:w-12 text-[10px] md:text-xs" : (isMini ? "w-1.5 md:w-6 text-[0px] md:text-[10px]" : "w-8 text-[10px]");

    const currentMonth = new Date().getMonth();
    const isCurrentMonth = monthIndex === currentMonth;
    const useNavy = isLarge || (isMini && isCurrentMonth && !isPastMonth);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`e-${i}`} className={cellClass}></div>);
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

      let baseClasses = `${cellClass} rounded-full flex items-center justify-center transition-all relative select-none `;

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

      const isWfh = bookedLeave?.type === 'wfh';

      days.push(
        <div key={`d-${i}`} className={baseClasses} onClick={(e) => { if (isInteractive) { e.stopPropagation(); handleDayClick(monthIndex, i); } }} title={holidayInfo ? holidayInfo.name : (isWfh ? 'Work From Home' : (isPast ? 'Past date — click to log retroactive leave' : ''))}>
          {isWfh && (
            <span className={isMini ? "absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/90 z-20 pointer-events-none ring-1 ring-background/40" : "absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/90 z-20 pointer-events-none"} />
          )}
          <span className={isMini ? 'hidden md:inline' : ''}>{i}</span>
        </div>
      );
    }

    const cardBg = useNavy
      ? 'bg-gradient-to-br from-[#0f172a] via-[#1e3a6e] to-[#1d4ed8] border-blue-900/30 shadow-apple-md'
      : 'bg-card border-border shadow-apple-sm';

    return (
      <motion.div
        layoutId={`month-card-${monthIndex}`}
        key={monthIndex}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.02 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`${cardBg} border flex flex-col transition-colors origin-center ${isLarge ? 'p-4 md:p-6 rounded-2xl' : (isMini ? 'p-2.5 rounded-xl h-full aspect-[4/3] md:aspect-auto flex flex-col justify-between' : 'p-5 rounded-2xl hover:border-foreground/20')} ${opacityClass} ${wrapperClasses}`}
      >
        <div className={`flex justify-between items-center ${isLarge ? 'mb-4' : (isMini ? 'mb-2' : 'mb-4')}`}>
          <h3 className={`font-semibold leading-none ${useNavy ? 'text-white' : 'text-foreground'} ${isLarge ? 'text-lg md:text-xl' : (isMini ? 'text-[11px] uppercase tracking-wider' : 'text-lg group-hover:text-muted-foreground')}`}>
            {isMini ? monthNames[monthIndex].substring(0,3) : monthNames[monthIndex]}
          </h3>
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
    <>
      <div className="flex flex-col gap-6 relative z-10 h-full">
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

        {viewMode === 'yearly' ? (
          <motion.div layout className="grid grid-cols-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 md:gap-6 items-start pb-4">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].sort((a,b) => isMonthPast(a) === isMonthPast(b) ? a-b : (isMonthPast(a) ? 1 : -1)).map(m => renderMonth(m, false, false, null, "cursor-pointer hover:opacity-90", () => { setFocusedMonth(m); setViewMode('monthly'); }))}
          </motion.div>
        ) : (
          <motion.div layout className="flex flex-col md:flex-row gap-6 items-start h-auto md:h-[calc(100vh-280px)]">
            <div className="flex-1 flex justify-center w-full relative z-10">
              <div className="w-full max-w-2xl">{renderMonth(focusedMonth, true)}</div>
            </div>
            <div className="hidden md:flex w-80 flex-shrink-0 flex-col gap-4 overflow-y-auto h-full pr-2 pb-20 no-scrollbar relative z-10">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(m => m !== focusedMonth).sort((a,b) => isMonthPast(a) === isMonthPast(b) ? a-b : (isMonthPast(a) ? 1 : -1)).map(m => renderMonth(m, false, false, isMonthPast(m), `cursor-pointer transition-all w-full ${isMonthPast(m) ? 'opacity-40' : 'opacity-100'}`, () => setFocusedMonth(m)))}
            </div>
          </motion.div>
        )}
      </div>

      {viewingLeave && (
        <ExistingLeaveModal 
          leaveObj={viewingLeave} 
          onClose={() => setViewingLeave(null)} 
          onCancelLeave={handleCancelLeave}
          onCancelPlan={handleCancelPlan}
        />
      )}
    </>
  );
};

export default Calendar;
