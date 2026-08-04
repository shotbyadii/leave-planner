import React from 'react';
import ReactDOM from 'react-dom';
import { Trash2, X, CalendarX2, Building2, Home, Sparkles } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import { motion } from 'framer-motion';

export const ExistingLeaveDetailContent = ({ 
  leaveObj, 
  onClose, 
  onCancelLeave, 
  onCancelPlan, 
  onConvertToOffice,
  onConvertToWfh,
  onConvertToLeave,
  leaves,
  calendarStyle = 'classic' 
}) => {
  if (!leaveObj) return null;
  const { targetLeave, tripDates = [], associatedPlan = null } = leaveObj;
  
  const isWfh = targetLeave.type === 'wfh';
  const isOffice = targetLeave.type === 'office';
  const isAttendanceLog = isWfh || isOffice;
  
  const targetDateObj = new Date(targetLeave.date);
  const targetDateStr = targetLeave.date;

  const planStart = associatedPlan ? new Date(associatedPlan.start_date || associatedPlan.startDate) : null;
  const planEnd = associatedPlan ? new Date(associatedPlan.end_date || associatedPlan.endDate) : null;

  let actualLeavesCount = 0;
  let weekendsCount = 0;
  let holidaysCount = 0;
  let totalDays = tripDates.length;

  if (associatedPlan && tripDates.length > 0) {
    weekendsCount = tripDates.filter(d => isWeekend(d)).length;
    holidaysCount = tripDates.filter(d => isHoliday(d) && !isWeekend(d)).length;
    actualLeavesCount = totalDays - weekendsCount - holidaysCount;
  }

  // Dynamic banner styling matched to leave type
  let bannerTheme = 'bg-blue-50/60 dark:bg-blue-500/10 border-blue-200/80 dark:border-blue-500/30 text-blue-700 dark:text-blue-400';
  let badgeTheme = 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/40';

  if (targetLeave.type === 'wfh') {
    bannerTheme = 'bg-cyan-50/60 dark:bg-cyan-500/10 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400';
    badgeTheme = 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40';
  } else if (targetLeave.type === 'office') {
    bannerTheme = 'bg-slate-50/60 dark:bg-slate-500/10 border-slate-200/80 dark:border-slate-500/30 text-slate-700 dark:text-slate-300';
    badgeTheme = 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/40';
  } else if (targetLeave.type === 'el') {
    bannerTheme = 'bg-orange-50/60 dark:bg-orange-500/10 border-orange-200/80 dark:border-orange-500/30 text-orange-700 dark:text-orange-400';
    badgeTheme = 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-500/40';
  } else if (targetLeave.type === 'rh') {
    bannerTheme = 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400';
    badgeTheme = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40';
  }

  const leaveTypeName = leaves && leaves[targetLeave.type] ? leaves[targetLeave.type].name : `${targetLeave.type.toUpperCase()} Leave`;

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
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5 font-mono">Trip Calendar</span>
        <div className="w-full bg-card rounded-2xl p-3 border border-border/60">
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-[9px] font-black text-muted-foreground/50 text-center uppercase font-mono">{d}</div>
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
    <div className="bg-card text-foreground flex flex-col w-full">
      {/* Header - Identical to Image 2 Confirm Leave */}
      <div className="px-5 pb-4 pt-2 md:pt-4 border-b border-border/60 bg-card flex justify-between items-center flex-shrink-0">
        <div>
          <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest block mb-0.5">
            {associatedPlan ? 'Leave Plan' : isAttendanceLog ? 'Attendance Record' : 'Individual Leave'}
          </span>
          <h2 className="font-bold font-mono text-base uppercase tracking-tight text-foreground leading-none">
            {associatedPlan ? associatedPlan.name : isWfh ? 'Work From Home' : isOffice ? 'In-Office Attendance' : leaveTypeName}
          </h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body - Pure bg-card, unified spacing */}
      <div className="p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        {/* Selected Date Card */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${bannerTheme}`}>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block mb-0.5 font-mono">Selected Date</span>
            <span className="text-sm font-bold font-mono">
              {targetDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border font-mono ${badgeTheme}`}>
            {targetLeave.type.toUpperCase()}
          </span>
        </div>

        {/* Linked Plan Stats */}
        {associatedPlan && (
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-xs font-bold font-mono text-muted-foreground">
              <span>Trip Duration</span>
              <span>{planStart?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {planEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2 text-center">
                <span className="text-base font-black text-blue-500 block font-mono">{actualLeavesCount}</span>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider font-mono">Leaves</span>
              </div>
              <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-2 text-center">
                <span className="text-base font-black text-slate-400 block font-mono">{weekendsCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Weekends</span>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-center">
                <span className="text-base font-black text-purple-400 block font-mono">{holidaysCount}</span>
                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-mono">Holidays</span>
              </div>
            </div>
          </div>
        )}

        {/* Trip Calendar */}
        {renderMiniCalendar()}
      </div>

      {/* Footer - Identical to Image 2 Confirm Leave buttons */}
      <div className="p-5 pt-2 flex flex-col gap-2.5 bg-card border-t border-border/40 flex-shrink-0">
        {isWfh ? (
          <>
            <button
              onClick={() => onConvertToOffice && onConvertToOffice(targetDateStr)}
              className="w-full py-3 bg-muted border border-border text-foreground font-bold text-xs rounded-xl hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Building2 size={15} /> Convert to In-Office
            </button>
            <button
              onClick={() => onConvertToLeave && onConvertToLeave(targetDateStr)}
              className="w-full py-3 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-95 transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono shadow-md"
            >
              <Sparkles size={15} /> Convert to Leave
            </button>
          </>
        ) : isOffice ? (
          <>
            <button
              onClick={() => onConvertToWfh && onConvertToWfh(targetDateStr)}
              className="w-full py-3 bg-muted border border-border text-foreground font-bold text-xs rounded-xl hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Home size={15} /> Convert to Work From Home
            </button>
            <button
              onClick={() => onConvertToLeave && onConvertToLeave(targetDateStr)}
              className="w-full py-3 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-95 transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono shadow-md"
            >
              <Sparkles size={15} /> Convert to Leave
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onCancelLeave(targetDateStr)}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <CalendarX2 size={15} /> Cancel Leave for {targetDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>

            {associatedPlan && (
              <button
                onClick={() => onCancelPlan(associatedPlan.id)}
                className="w-full py-2.5 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
              >
                <Trash2 size={14} /> Delete Entire "{associatedPlan.name}" Plan
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ExistingLeaveModal = ({ 
  leaveObj, 
  onClose, 
  onCancelLeave, 
  onCancelPlan, 
  onConvertToOffice,
  onConvertToWfh,
  onConvertToLeave,
  leaves,
  calendarStyle = 'classic' 
}) => {
  if (!leaveObj) return null;

  const modalContainer = (
    <div className="hidden md:block fixed inset-0 z-[200] overflow-hidden">
      {/* Desktop Backdrop covering whole viewport */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[201]" 
        onClick={onClose} 
      />

      {/* Desktop Modal Card */}
      <div className="fixed inset-0 z-[202] flex items-center justify-center p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 15 }} 
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="pointer-events-auto relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          <ExistingLeaveDetailContent 
            leaveObj={leaveObj} 
            onClose={onClose} 
            onCancelLeave={onCancelLeave} 
            onCancelPlan={onCancelPlan}
            onConvertToOffice={onConvertToOffice}
            onConvertToWfh={onConvertToWfh}
            onConvertToLeave={onConvertToLeave}
            leaves={leaves}
            calendarStyle={calendarStyle} 
          />
        </motion.div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? ReactDOM.createPortal(modalContainer, document.body) : modalContainer;
};

export default ExistingLeaveModal;
