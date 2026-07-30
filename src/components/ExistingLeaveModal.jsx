import React from 'react';
import { Trash2, X, ArrowRight, CalendarX2, CalendarDays } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';

const ExistingLeaveModal = ({ leaveObj, onClose, onCancelLeave, onCancelPlan }) => {
  const { targetLeave, tripDates = [], associatedPlan = null } = leaveObj;
  
  const isAttendanceLog = ['wfh', 'office'].includes(targetLeave.type);
  const isMultiple = !!associatedPlan && tripDates.length > 1;
  const targetDateObj = new Date(targetLeave.date);

  const planStart = associatedPlan ? new Date(associatedPlan.start_date || associatedPlan.startDate) : null;
  const planEnd = associatedPlan ? new Date(associatedPlan.end_date || associatedPlan.endDate) : null;

  // Calculate trip stats if linked to an explicit plan
  let actualLeavesCount = 0;
  let weekendsCount = 0;
  let holidaysCount = 0;
  let totalDays = tripDates.length;

  if (associatedPlan && tripDates.length > 0) {
    weekendsCount = tripDates.filter(d => isWeekend(d)).length;
    holidaysCount = tripDates.filter(d => isHoliday(d) && !isWeekend(d)).length;
    actualLeavesCount = totalDays - weekendsCount - holidaysCount;
  }

  const bannerTheme = targetLeave.type === 'wfh' 
    ? 'bg-cyan-500/15 dark:bg-cyan-500/25 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
    : targetLeave.type === 'office'
    ? 'bg-slate-500/15 dark:bg-slate-500/25 border-slate-500/30 text-slate-600 dark:text-slate-300'
    : 'bg-orange-500/15 dark:bg-orange-500/25 border-orange-500/30 text-orange-600 dark:text-orange-400';

  const renderMiniCalendar = () => {
    if (!associatedPlan || tripDates.length === 0) return null;
    const year = 2026;
    const start = new Date(tripDates[0]);
    const end = new Date(tripDates[tripDates.length - 1]);

    const allDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      allDates.push({
        dateStr,
        dayOfWeek: new Date(dateStr).getDay(),
        day: new Date(dateStr).getDate(),
        isLeave: tripDates.includes(dateStr) && !isWeekend(dateStr) && !isHoliday(dateStr),
        isWeekend: isWeekend(dateStr),
        isHoliday: !!isHoliday(dateStr)
      });
    }

    const startDow = allDates[0]?.dayOfWeek || 0;
    const padBefore = Array(startDow).fill(null);
    const cells = [...padBefore, ...allDates];

    return (
      <div>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Trip Calendar</span>
        <div className="w-full bg-muted/20 dark:bg-muted/10 rounded-2xl p-3 border border-border/10 shadow-inner">
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-[9px] font-black text-muted-foreground/40 text-center uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={idx} className="w-full aspect-square"></div>;
              
              let classes = "w-full aspect-square rounded-lg flex items-center justify-center text-[11px] font-mono transition-all ";
              if (cell.isLeave) {
                classes += "text-blue-500 font-black scale-110";
              } else if (cell.isHoliday) {
                classes += "text-purple-400 font-black";
              } else if (cell.isWeekend) {
                classes += "text-muted-foreground/30 font-medium";
              } else {
                classes += "text-muted-foreground/50 font-medium";
              }
              
              return (
                <div key={idx} className={classes} title={cell.dateStr}>
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col justify-end sm:justify-end items-center pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md mx-auto mb-36 sm:mb-6 rounded-[32px] border border-border shadow-[0_16px_48px_-8px_rgba(0,0,0,0.85)] shadow-black/80 overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-8 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] max-h-[85vh] overflow-y-auto no-scrollbar">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/60 flex justify-between items-start sticky top-0 bg-card/95 backdrop-blur-md z-20">
          {associatedPlan ? (
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">Trip Plan</span>
              <h3 className="text-xl font-black text-foreground tracking-tight leading-snug">{associatedPlan.name}</h3>
              <div className="inline-flex items-center gap-1.5 mt-2 bg-muted/80 px-2.5 py-1 rounded-xl text-xs font-bold text-foreground border border-border/40">
                <CalendarDays size={13} className="text-primary" />
                {planStart?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                <span className="text-muted-foreground/40">→</span>
                {planEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ) : (
            <div className="text-lg font-bold text-foreground">
              {targetDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-card p-1.5 rounded-xl shadow-sm border border-border">
            <X size={16} />
          </button>
        </div>

        {/* Explicit Trip Breakdown Stats Pill Row */}
        {associatedPlan && (
          <div className="p-4 bg-muted/30 border-b border-border grid grid-cols-4 gap-2">
            <div className="flex flex-col bg-blue-50/50 dark:bg-blue-500/10 px-2.5 py-2 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-center">
              <span className="text-[8px] font-black text-blue-600/70 dark:text-blue-400 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">Leaves</span>
              <span className="text-base font-black text-blue-600 leading-none">{actualLeavesCount}</span>
            </div>
            <div className="flex flex-col bg-slate-50/50 dark:bg-slate-400/10 px-2.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700/30 text-center">
              <span className="text-[8px] font-black text-slate-500/70 dark:text-slate-400 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">Weekends</span>
              <span className="text-base font-black text-slate-600 dark:text-slate-400 leading-none">{weekendsCount}</span>
            </div>
            <div className="flex flex-col bg-purple-50/50 dark:bg-purple-500/10 px-2.5 py-2 rounded-2xl border border-purple-100 dark:border-purple-500/20 text-center">
              <span className="text-[8px] font-black text-purple-600/70 dark:text-purple-400 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">Holidays</span>
              <span className="text-base font-black text-purple-600 dark:text-purple-400 leading-none">{holidaysCount}</span>
            </div>
            <div className="flex flex-col bg-foreground text-background px-2.5 py-2 rounded-2xl text-center shadow-sm">
              <span className="text-[8px] font-black opacity-60 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">Total</span>
              <span className="text-base font-black leading-none">{totalDays}d</span>
            </div>
          </div>
        )}

        {/* Selected Date Context Banner */}
        <div className={`px-4 sm:px-6 py-3.5 border-b flex items-center gap-3 ${bannerTheme}`}>
          <div className="p-2 bg-black/10 dark:bg-white/10 rounded-xl">
            <CalendarX2 size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              {isAttendanceLog ? 'Work Location Log: ' : 'Selected Date: '} 
              <span className="font-black">{targetDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
            </div>
            {isAttendanceLog ? (
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {targetLeave.type === 'wfh' ? 'Work From Home • 10 days/mo quota' : 'In-Office Attendance Log'}
              </div>
            ) : associatedPlan ? (
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Linked to "{associatedPlan.name}" plan.</div>
            ) : (
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Single-day leave booking.</div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              {isAttendanceLog ? 'Log Type' : 'Leave Type'}
            </span>
            <span className="px-3 py-1 bg-muted border border-border text-foreground rounded-xl text-xs font-black uppercase tracking-wider">
              {targetLeave.type}
            </span>
          </div>
          
          {associatedPlan && renderMiniCalendar()}

          {targetLeave.note && (
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Note</span>
              <p className="text-sm text-foreground/80 font-medium bg-muted/30 p-3 rounded-xl border border-border/10 italic">"{targetLeave.note}"</p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-border bg-muted/30 flex flex-row gap-3">
          {associatedPlan && (
            <button 
              onClick={() => (onCancelPlan ? onCancelPlan(associatedPlan.id) : onCancelLeave(tripDates))} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-card border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl text-xs font-bold shadow-sm transition-colors"
            >
              <Trash2 size={15} /> Delete Trip
            </button>
          )}
          
          <button 
            onClick={() => onCancelLeave(targetLeave.date)} 
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-card border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl text-xs font-bold transition-colors shadow-sm"
          >
            <Trash2 size={15} /> {isAttendanceLog ? 'Delete Log' : 'Delete Day'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExistingLeaveModal;
