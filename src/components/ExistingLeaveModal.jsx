import React from 'react';
import { Trash2, X, ArrowRight, CalendarX2, CalendarDays } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import { motion, AnimatePresence } from 'framer-motion';

const ExistingLeaveModal = ({ leaveObj, onClose, onCancelLeave, onCancelPlan, calendarStyle = 'classic' }) => {
  if (!leaveObj) return null;
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
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2 font-mono">Trip Calendar</span>
        <div className="w-full bg-muted/20 dark:bg-muted/10 rounded-2xl p-3 border border-border/10 shadow-inner">
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-[9px] font-black text-muted-foreground/40 text-center uppercase font-mono">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={idx} className="w-full h-6"></div>;
              
              let classes = calendarStyle === 'capsule'
                ? "w-full h-6 rounded-md flex items-center justify-center text-[10px] font-mono transition-all border "
                : "w-full h-6 rounded-md flex items-center justify-center text-[10px] font-mono transition-all ";
              
              if (calendarStyle === 'capsule') {
                if (cell.isLeave) {
                  classes += "bg-blue-500/15 border-blue-500/40 text-blue-400 font-black scale-105 shadow-sm";
                } else if (cell.isHoliday) {
                  classes += "bg-purple-500/15 border-purple-500/40 text-purple-400 font-black";
                } else if (cell.isWeekend) {
                  classes += "bg-muted/10 border-transparent text-muted-foreground/30 font-medium";
                } else {
                  classes += "bg-card/40 border-border/30 text-muted-foreground/60 font-bold";
                }
              } else {
                if (cell.isLeave) {
                  classes += "text-blue-500 font-black scale-110 bg-blue-500/10 rounded-full border border-blue-500/20";
                } else if (cell.isHoliday) {
                  classes += "text-purple-400 font-black";
                } else if (cell.isWeekend) {
                  classes += "text-muted-foreground/30 font-medium";
                } else {
                  classes += "text-muted-foreground/50 font-medium";
                }
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }} 
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_16px_48px_-8px_rgba(0,0,0,0.85)] shadow-black/80 overflow-hidden z-10 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/60 flex justify-between items-start sticky top-0 bg-card/95 backdrop-blur-md z-20">
          {associatedPlan ? (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono block mb-1">Leave Plan</span>
              <h3 className="text-xl font-bold text-foreground leading-tight">{associatedPlan.name}</h3>
            </div>
          ) : (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono block mb-1">
                {isAttendanceLog ? 'Attendance Record' : 'Individual Leave'}
              </span>
              <h3 className="text-xl font-bold text-foreground leading-tight">
                {targetLeave.type === 'wfh' ? 'Work From Home' : targetLeave.type === 'office' ? 'In-Office Attendance' : `${targetLeave.type.toUpperCase()} Leave`}
              </h3>
            </div>
          )}
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          {/* Target Leave Highlight Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${bannerTheme}`}>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-80 block mb-0.5 font-mono">Selected Date</span>
              <span className="text-base font-bold font-mono">
                {targetDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-card/50 font-mono">
              {targetLeave.type.toUpperCase()}
            </span>
          </div>

          {/* Linked Plan Stats */}
          {associatedPlan && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold font-mono text-muted-foreground">
                <span>Trip Duration</span>
                <span>{planStart?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {planEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center">
                  <span className="text-lg font-black text-blue-500 block font-mono">{actualLeavesCount}</span>
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider font-mono">Leaves</span>
                </div>
                <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-2.5 text-center">
                  <span className="text-lg font-black text-slate-400 block font-mono">{weekendsCount}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Weekends</span>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2.5 text-center">
                  <span className="text-lg font-black text-purple-400 block font-mono">{holidaysCount}</span>
                  <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-mono">Holidays</span>
                </div>
              </div>
            </div>
          )}

          {/* Mini Calendar View */}
          {renderMiniCalendar()}
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-6 border-t border-border bg-muted/40 flex flex-col gap-2.5 sticky bottom-0 bg-card/95 backdrop-blur-md z-20">
          <button
            onClick={() => onCancelLeave(targetLeave.date)}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <CalendarX2 size={15} /> Cancel Leave for {targetDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>

          {associatedPlan && (
            <button
              onClick={() => onCancelPlan(associatedPlan.id)}
              className="w-full py-3 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Trash2 size={15} /> Delete Entire "{associatedPlan.name}" Plan
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ExistingLeaveModal;
