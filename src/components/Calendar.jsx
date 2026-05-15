import React, { useState, useEffect } from 'react';
import { isHoliday, isWeekend } from '../data/holidays';
import { addLeave, removeLeave, createLeavePlan } from '../services/leaveService';
import LeaveModal from './LeaveModal';
import ExistingLeaveModal from './ExistingLeaveModal';
import { ChevronDown, ChevronRight, Check, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';

const Calendar = ({ holidays, bookedDates, setBookedDates, leaves, setLeaves, loadLeaves, previewDates, setPreviewDates, hoveredSuggestion, viewMode, setViewMode, focusedMonth, setFocusedMonth }) => {
  const year = 2026;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const [modalDate, setModalDate] = useState(null);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [collapsedMonths, setCollapsedMonths] = useState([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const past = [];
    for(let m=0; m<12; m++) {
      const lastDay = new Date(year, m + 1, 0);
      if (lastDay < today) past.push(m);
    }
    setCollapsedMonths(past);
  }, []);

  const getDaysInMonth = (month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month) => new Date(year, month, 1).getDay();

  const isMonthPast = (monthIndex) => {
    const lastDay = new Date(year, monthIndex + 1, 0);
    return lastDay < today;
  };

  const toggleMonth = (monthIndex) => {
    // Only allow collapsing past months
    if (!isMonthPast(monthIndex) && !collapsedMonths.includes(monthIndex)) return;
    setCollapsedMonths(prev => 
      prev.includes(monthIndex) 
        ? prev.filter(m => m !== monthIndex) 
        : [...prev, monthIndex]
    );
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
    let tripDates = [dateStr];
    
    let d = new Date(dateStr);
    while (true) {
      d.setDate(d.getDate() - 1);
      const prevDateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isBooked = bookedDates.some(b => b.date === prevDateStr);
      if (isBooked || isWeekend(prevDateStr) || isHoliday(prevDateStr)) {
        tripDates.unshift(prevDateStr);
      } else {
        break;
      }
    }
    
    d = new Date(dateStr);
    while (true) {
      d.setDate(d.getDate() + 1);
      const nextDateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isBooked = bookedDates.some(b => b.date === nextDateStr);
      if (isBooked || isWeekend(nextDateStr) || isHoliday(nextDateStr)) {
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
      const tripDates = findTripForDate(dateStr);
      setViewingLeave({
        targetLeave: existingLeave,
        tripDates: tripDates
      });
      return;
    }

    if (selectionStart) {
      const range = getAllDatesInRange(selectionStart, dateStr);
      setPreviewDates(range);
      setSelectionStart(null);
    } else {
      if (previewDates.length > 0) {
        setPreviewDates([]);
      }
      setSelectionStart(dateStr);
    }
  };

  const handleModalApply = async (datesArray, type, note, planName, durationPerDay = 1) => {
    let planId = null;
    if (datesArray.length > 1) {
      const plan = await createLeavePlan(
        planName || 'Untitled Plan',
        sortedDates[0],
        sortedDates[sortedDates.length - 1]
      );
      planId = plan?.id || null;
    }

    for (const dateStr of datesArray) {
      if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
        await addLeave(dateStr, type, note, planId, durationPerDay);
      }
    }
    await loadLeaves();
    setModalDate(null);
    setPreviewDates([]);
  };

  const handleCancelLeave = async (dateStrOrArray) => {
    if (Array.isArray(dateStrOrArray)) {
      for (const dateStr of dateStrOrArray) {
        if (bookedDates.some(b => b.date === dateStr)) {
          await removeLeave(dateStr);
        }
      }
    } else {
      await removeLeave(dateStrOrArray);
    }
    await loadLeaves();
    setViewingLeave(null);
  };

  const renderMonth = (monthIndex, isLarge = false, isInteractive = true, isCollapsedOverride = null) => {
    const isCollapsed = isCollapsedOverride !== null ? isCollapsedOverride : (!isLarge && viewMode === 'yearly' && collapsedMonths.includes(monthIndex));
    const daysInMonth = getDaysInMonth(monthIndex);
    const firstDay = getFirstDayOfMonth(monthIndex);
    
    if (isCollapsed) {
      return (
        <div key={monthIndex} onClick={() => toggleMonth(monthIndex)} className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm cursor-pointer flex justify-between items-center transition-colors h-16">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-500">{monthNames[monthIndex]} {year}</h3>
            <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">Past</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </div>
      );
    }

    const days = [];
    const monthHolidays = [];

    const cellClass = isLarge ? "w-14 h-14 text-base" : "w-8 h-8 text-sm";
    const headerClass = isLarge ? "w-14 text-xs" : "w-8 text-[10px]";

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

      let baseClasses = `${cellClass} rounded-full flex items-center justify-center transition-all relative `;
      
      if (isSelected) {
        if (holidayInfo || weekend) {
          baseClasses += "bg-slate-300 text-slate-800 font-bold z-10 scale-105 shadow-md border border-slate-400 border-dashed";
        } else {
          baseClasses += "bg-slate-800 text-white font-bold ring-4 ring-slate-200 z-10 scale-105 shadow-md";
        }
      } else if (isToday) {
         baseClasses += "bg-blue-600 text-white font-bold ring-2 ring-blue-200 z-10 scale-105 shadow-md animate-pulse-subtle";
      } else if (isHovered) {
         if (holidayInfo || weekend) {
           baseClasses += "bg-yellow-100 text-yellow-900 border border-yellow-300 border-dashed scale-105 z-10";
         } else {
           baseClasses += "bg-yellow-300 text-yellow-900 font-bold ring-2 ring-yellow-400 scale-105 z-10 shadow-sm";
         }
      } else if (bookedLeave) {
        if (bookedLeave.type === 'pl') baseClasses += "bg-blue-300 text-blue-900 font-medium cursor-pointer shadow-sm ring-1 ring-blue-400";
        else if (bookedLeave.type === 'el') baseClasses += "bg-orange-300 text-orange-900 font-medium cursor-pointer shadow-sm ring-1 ring-orange-400";
        else if (bookedLeave.type === 'rh') baseClasses += "bg-green-300 text-green-900 font-medium cursor-pointer shadow-sm ring-1 ring-green-400";
      } else if (holidayInfo) {
        baseClasses += "bg-purple-200 text-purple-900 font-medium";
      } else if (weekend) {
        baseClasses += "text-slate-400 bg-slate-50";
      } else if (isPast) {
        baseClasses += "text-slate-300 bg-slate-50/50 opacity-50 hover:opacity-70 hover:bg-slate-100 cursor-pointer";
      } else {
        baseClasses += "hover:bg-slate-100 cursor-pointer text-slate-700";
      }

      days.push(
        <div 
          key={`d-${i}`} 
          className={baseClasses}
          onClick={(e) => {
            if (isInteractive) {
              e.stopPropagation();
              handleDayClick(monthIndex, i);
            }
          }}
          title={holidayInfo ? holidayInfo.name : (isPast ? 'Past date — click to log retroactive leave' : '')}
        >
          {i}
        </div>
      );
    }

    return (
      <div key={monthIndex} className={`bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col ${isLarge ? 'p-8' : 'p-5 hover:border-slate-300 transition-colors'}`}>
        <div 
          className={`flex justify-between items-center mb-4 ${!isLarge && viewMode === 'yearly' ? 'cursor-pointer group' : ''}`} 
          onClick={() => {
            if (!isLarge && viewMode === 'yearly') toggleMonth(monthIndex);
          }}
        >
          <h3 className={`font-semibold text-slate-800 ${isLarge ? 'text-2xl' : 'text-lg group-hover:text-slate-600 transition-colors'}`}>
            {monthNames[monthIndex]}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`${isLarge ? 'text-sm' : 'text-xs'} font-medium text-slate-400`}>{year}</span>
            {!isLarge && viewMode === 'yearly' && <ChevronDown size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />}
          </div>
        </div>
        
        <div className={`grid grid-cols-7 ${isLarge ? 'gap-2 mb-4' : 'gap-1 mb-2'}`}>
          {dayNames.map(d => (
            <div key={d} className={`${headerClass} font-semibold text-slate-400 text-center`}>{d}</div>
          ))}
        </div>
        
        <div className={`grid grid-cols-7 ${isLarge ? 'gap-2' : 'gap-1'}`}>
          {days}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          {monthHolidays.length > 0 ? (
            <div className={`grid ${isLarge ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-x-3 gap-y-1'}`}>
              {monthHolidays.map((h, idx) => (
                <div key={idx} className={`flex items-center gap-1.5 ${isLarge ? 'text-sm' : 'text-[10px]'} text-slate-500 min-w-0`}>
                  <div className={`${isLarge ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full bg-purple-400 flex-shrink-0`}></div>
                  <span className="font-bold text-slate-600 flex-shrink-0">{h.day}</span>
                  <span className="truncate" title={h.name}>{h.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-slate-300 italic ${isLarge ? 'text-sm' : 'text-[10px]'}`}>No holidays</div>
          )}
        </div>
      </div>
    );
  };

  const actualLeavesNeeded = previewDates.filter(d => !isHoliday(d) && !isWeekend(d));
  const hasMultiple = actualLeavesNeeded.length > 1;

  return (
    <>
      <div className="flex flex-col gap-6 relative z-10 h-full">
        
        {/* View Toggle Header */}
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
          <button 
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'monthly' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CalendarIcon size={16} /> Focused View
          </button>
          <button 
            onClick={() => setViewMode('yearly')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'yearly' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid size={16} /> Yearly Grid
          </button>
        </div>

        {viewMode === 'yearly' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start pb-20">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
              .sort((a, b) => {
                const ap = isMonthPast(a);
                const bp = isMonthPast(b);
                if (ap === bp) return a - b;
                return ap ? 1 : -1;
              })
              .map(m => (
                <div key={m} id={`month-card-${m}`}>
                  {renderMonth(m, false)}
                </div>
              ))}
          </div>
        ) : (
          <div className="flex gap-6 items-start h-[calc(100vh-280px)]">
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-2xl">
                {renderMonth(focusedMonth, true)}
              </div>
            </div>
            
            <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto h-full pr-2 no-scrollbar pb-20">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
                .filter(m => m !== focusedMonth)
                .sort((a, b) => {
                  const ap = isMonthPast(a);
                  const bp = isMonthPast(b);
                  if (ap === bp) return a - b;
                  return ap ? 1 : -1;
                })
                .map(m => {
                  const isPast = isMonthPast(m);
                  return (
                  <div key={m} onClick={() => setFocusedMonth(m)} className={`cursor-pointer hover:opacity-100 transition-opacity transform hover:scale-[1.02] ${isPast ? 'opacity-40' : 'opacity-70'}`}>
                    {renderMonth(m, false, false, isPast)}
                  </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {(selectionStart || previewDates.length > 0) && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 px-6 py-3 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-3">
            {selectionStart && previewDates.length === 0 ? (
              <>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-slate-700">Select an end date...</span>
              </>
            ) : (
              <>
                <div className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                  {actualLeavesNeeded.length} leave{hasMultiple ? 's' : ''} needed
                </div>
                <span className="text-sm font-medium text-slate-500">{previewDates.length} days total</span>
              </>
            )}
          </div>
          
          <div className="flex gap-2 border-l border-slate-100 pl-6">
            <button 
              onClick={() => { setSelectionStart(null); setPreviewDates([]); }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            {previewDates.length > 0 && (
              <button 
                onClick={() => setModalDate({ dates: previewDates })}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-slate-900 hover:bg-black px-4 py-1.5 rounded-full shadow-md transition-colors"
              >
                Continue <Check size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {modalDate && (
        <LeaveModal 
          dateObj={modalDate} 
          onClose={() => { setModalDate(null); setPreviewDates([]); }} 
          onApply={handleModalApply}
          balances={{
            pl: leaves.pl.total - leaves.pl.used,
            el: leaves.el.total - leaves.el.used,
            rh: leaves.rh.total - leaves.rh.used
          }}
        />
      )}

      {viewingLeave && (
        <ExistingLeaveModal 
          leaveObj={viewingLeave}
          onClose={() => setViewingLeave(null)}
          onCancelLeave={handleCancelLeave}
        />
      )}
    </>
  );
};

export default Calendar;
