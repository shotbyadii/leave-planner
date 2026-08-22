import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, CalendarX2, Building2, Home, Sparkles } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import { motion, AnimatePresence } from 'framer-motion';
import AppleBalanceTicker from './AppleBalanceTicker';
import { getLeaveTheme, getLeaveColor, getShortform } from '../utils/colorUtils';

export const ExistingLeaveDetailContent = ({ 
  leaveObj, 
  onClose, 
  onCancelLeave, 
  onCancelPlan, 
  onConvertToOffice,
  onConvertToWfh,
  onConvertToLeave,
  leaves,
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
  bookedDates = [],
  maxWfh = 10,
  calendarStyle = 'classic' 
}) => {
  const [tickerData, setTickerData] = useState(null);

  if (!leaveObj || !leaveObj.targetLeave) return null;
  const { targetLeave, tripDates = [], associatedPlan = null } = leaveObj;
  
  const leaveType = (targetLeave?.type || 'pl').toLowerCase();
  const isWfh = leaveType === 'wfh';
  const isOffice = leaveType === 'office';
  const isAttendanceLog = isWfh || isOffice;
  
  const targetDateStr = targetLeave?.date || '';
  let targetDateObj = new Date();
  if (targetDateStr && targetDateStr.includes('-')) {
    const [y, m, d] = targetDateStr.split('-').map(Number);
    if (y && m && d) {
      targetDateObj = new Date(y, m - 1, d);
    }
  }

  const targetMonthKey = targetDateStr ? targetDateStr.substring(0, 7) : '';
  const wfhUsedThisMonth = Array.isArray(bookedDates)
    ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).length
    : 0;
  const remainingWfh = Math.max(0, maxWfh - wfhUsedThisMonth);

  const planStart = associatedPlan ? new Date(associatedPlan.start_date || associatedPlan.startDate) : null;
  const planEnd = associatedPlan ? new Date(associatedPlan.end_date || associatedPlan.endDate) : null;

  let actualLeavesCount = 0;
  let weekendsCount = 0;
  let holidaysCount = 0;
  let totalDays = Array.isArray(tripDates) ? tripDates.length : 0;

  if (associatedPlan && Array.isArray(tripDates) && tripDates.length > 0) {
    weekendsCount = tripDates.filter(d => isWeekend(d)).length;
    holidaysCount = tripDates.filter(d => isHoliday(d) && !isWeekend(d)).length;
    actualLeavesCount = Math.max(0, totalDays - weekendsCount - holidaysCount);
  }

  const theme = getLeaveTheme(leaveColors?.[leaveType] || (leaveType === 'pl' ? 'blue' : leaveType === 'el' ? 'orange' : leaveType === 'rh' ? 'green' : 'cyan'));
  const bannerTheme = isOffice 
    ? 'bg-slate-50/60 dark:bg-slate-500/10 border-slate-200/80 dark:border-slate-500/30 text-slate-700 dark:text-slate-300'
    : `${theme.activeBoxBg} ${theme.activeBoxBorder} ${theme.activeText}`;
  const badgeTheme = isOffice 
    ? 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/40'
    : theme.activeBadge;

  const leaveTypeName = (leaveNames && leaveNames[leaveType]) || (leaves && leaves[leaveType] && (leaves[leaveType].name || leaves[leaveType].label)) || `${leaveType.toUpperCase()} Leave`;

  const handleTriggerCancelLeave = () => {
    const type = leaveType;
    const amount = targetLeave?.duration || 1;
    if (type === 'office') {
      if (onCancelLeave) onCancelLeave(targetDateStr);
      return;
    }
    if (type === 'wfh') {
      const curBalance = remainingWfh;
      const targetBalance = Math.min(maxWfh, remainingWfh + 1);
      setTickerData({
        initialValue: curBalance,
        targetValue: targetBalance,
        totalQuota: maxWfh,
        leaveType: 'wfh',
        leaveLabel: leaveNames?.wfh || 'Work From Home',
        leaveColor: leaveColors?.wfh || 'cyan',
        deductedCount: 1,
        actionType: 'restore',
        onDone: () => onCancelLeave && onCancelLeave(targetDateStr)
      });
      return;
    }
    const curBalance = (leaves && leaves[type]) ? (leaves[type].total - leaves[type].used) : 10;
    const total = (leaves && leaves[type]) ? leaves[type].total : 15;
    const targetBalance = Math.min(total, curBalance + amount);
    const chosenColor = (leaveColors && leaveColors[type]) || (type === 'el' ? 'orange' : type === 'rh' ? 'green' : type === 'wfh' ? 'cyan' : 'blue');

    setTickerData({
      initialValue: curBalance,
      targetValue: targetBalance,
      totalQuota: total,
      leaveType: type,
      leaveLabel: leaveNames?.[type] || leaveTypeName,
      leaveColor: chosenColor,
      deductedCount: amount,
      actionType: 'restore',
      onDone: () => onCancelLeave && onCancelLeave(targetDateStr)
    });
  };

  const handleTriggerConvertToOffice = () => {
    if (isWfh) {
      const curBalance = remainingWfh;
      const targetBalance = Math.min(maxWfh, remainingWfh + 1);
      setTickerData({
        initialValue: curBalance,
        targetValue: targetBalance,
        totalQuota: maxWfh,
        leaveType: 'wfh',
        leaveLabel: leaveNames?.wfh || 'Work From Home',
        leaveColor: leaveColors?.wfh || 'cyan',
        deductedCount: 1,
        actionType: 'restore',
        onDone: () => onConvertToOffice && onConvertToOffice(targetDateStr)
      });
      return;
    }
    if (onConvertToOffice) onConvertToOffice(targetDateStr);
  };

  const handleTriggerConvertToWfh = () => {
    if (isOffice) {
      const curBalance = remainingWfh;
      const targetBalance = Math.max(0, remainingWfh - 1);
      setTickerData({
        initialValue: curBalance,
        targetValue: targetBalance,
        totalQuota: maxWfh,
        leaveType: 'wfh',
        leaveLabel: leaveNames?.wfh || 'Work From Home',
        leaveColor: leaveColors?.wfh || 'cyan',
        deductedCount: 1,
        actionType: 'wfh',
        onDone: () => onConvertToWfh && onConvertToWfh(targetDateStr)
      });
      return;
    }
    if (onConvertToWfh) onConvertToWfh(targetDateStr);
  };

  const handleTriggerCancelPlan = () => {
    if (!associatedPlan) return;
    const type = (associatedPlan.type || targetLeave?.type || 'pl').toLowerCase();
    const amount = actualLeavesCount || 1;
    const curBalance = (leaves && leaves[type]) ? (leaves[type].total - leaves[type].used) : 10;
    const total = (leaves && leaves[type]) ? leaves[type].total : 15;
    const targetBalance = Math.min(total, curBalance + amount);
    const chosenColor = (leaveColors && leaveColors[type]) || (type === 'el' ? 'orange' : type === 'rh' ? 'green' : type === 'wfh' ? 'cyan' : 'blue');

    setTickerData({
      initialValue: curBalance,
      targetValue: targetBalance,
      totalQuota: total,
      leaveType: type,
      leaveLabel: leaveNames?.[type] || leaveTypeName,
      leaveColor: chosenColor,
      deductedCount: amount,
      actionType: 'restore',
      onDone: () => onCancelPlan && onCancelPlan(associatedPlan.id)
    });
  };

  const renderMiniCalendar = () => {
    if (!associatedPlan || !Array.isArray(tripDates) || tripDates.length === 0) return null;
    const sortedDates = [...tripDates].filter(d => typeof d === 'string' && d.includes('-')).sort();
    if (sortedDates.length === 0) return null;

    const startParts = sortedDates[0].split('-').map(Number);
    const endParts = sortedDates[sortedDates.length - 1].split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

    const allDates = [];
    const maxIterations = 60;
    let count = 0;
    for (let d = new Date(start); d <= end && count < maxIterations; d.setDate(d.getDate() + 1), count++) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      allDates.push({
        dateStr,
        dayOfWeek: d.getDay(),
        day: d.getDate(),
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
    <motion.div layout transition={{ type: 'spring', stiffness: 350, damping: 28 }} className="bg-card text-foreground flex flex-col w-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {tickerData ? (
          <motion.div
            key="ticker-view"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="p-6 flex flex-col items-center justify-center"
          >
            <AppleBalanceTicker
              initialValue={tickerData.initialValue}
              targetValue={tickerData.targetValue}
              totalQuota={tickerData.totalQuota}
              leaveType={tickerData.leaveType}
              leaveLabel={tickerData.leaveLabel}
              leaveColor={tickerData.leaveColor}
              deductedCount={tickerData.deductedCount}
              actionType={tickerData.actionType}
              onComplete={() => {
                tickerData.onDone();
                setTickerData(null);
              }}
              autoDismissMs={1600}
            />
          </motion.div>
        ) : (
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col w-full"
          >
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

            <div className="p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${bannerTheme}`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70 font-mono">Date</span>
                  <div className="text-sm font-black font-mono">
                    {targetDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono uppercase tracking-wider border ${badgeTheme}`}>
                    {isOffice ? 'OFFICE' : getShortform(leaveTypeName, targetLeave.type.toUpperCase())}
                  </span>
                </div>
              </div>

              {associatedPlan && (
                <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">Plan Duration</span>
                    <span className="font-bold text-foreground">
                      {planStart?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {planEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center">
                    <div className="bg-card p-2 rounded-xl border border-border/40">
                      <span className="text-xs font-black font-mono text-primary">{actualLeavesCount}</span>
                      <span className="text-[9px] block text-muted-foreground font-mono uppercase">Leaves</span>
                    </div>
                    <div className="bg-card p-2 rounded-xl border border-border/40">
                      <span className="text-xs font-black font-mono text-foreground">{weekendsCount}</span>
                      <span className="text-[9px] block text-muted-foreground font-mono uppercase">Weekends</span>
                    </div>
                    <div className="bg-card p-2 rounded-xl border border-border/40">
                      <span className="text-xs font-black font-mono text-foreground">{holidaysCount}</span>
                      <span className="text-[9px] block text-muted-foreground font-mono uppercase">Holidays</span>
                    </div>
                  </div>
                </div>
              )}

              {renderMiniCalendar()}

              {isAttendanceLog ? (
                <div className="flex flex-col gap-2 pt-1">
                  {isWfh ? (
                    <button
                      onClick={handleTriggerConvertToOffice}
                      className="w-full py-3 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <Building2 size={15} /> Switch to In-Office Attendance
                    </button>
                  ) : (
                    <button
                      onClick={handleTriggerConvertToWfh}
                      className="w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <Home size={15} /> Switch to Work From Home
                    </button>
                  )}

                  <button
                    onClick={() => onConvertToLeave(targetDateStr)}
                    className="w-full py-2.5 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                  >
                    <CalendarX2 size={14} /> Mark as Full Leave Instead
                  </button>

                  <button
                    onClick={handleTriggerCancelLeave}
                    className="w-full py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                  >
                    <Trash2 size={14} /> Delete Check-in Record
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={handleTriggerCancelLeave}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono shadow-sm"
                  >
                    <CalendarX2 size={15} /> Cancel {leaveTypeName} for {targetDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </button>

                  {associatedPlan && (
                    <button
                      onClick={handleTriggerCancelPlan}
                      className="w-full py-2.5 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <Trash2 size={14} /> Delete Entire "{associatedPlan.name}" Plan
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
  bookedDates = [],
  maxWfh = 10,
  calendarStyle = 'classic' 
}) => {
  if (!leaveObj) return null;

  const modalContainer = (
    <div className="hidden md:block fixed inset-0 z-[200] overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[201]" 
        onClick={onClose} 
      />

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
            leaveColors={leaveColors}
            leaveNames={leaveNames}
            bookedDates={bookedDates}
            maxWfh={maxWfh}
            calendarStyle={calendarStyle} 
          />
        </motion.div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContainer, document.body) : modalContainer;
};

export default ExistingLeaveModal;
