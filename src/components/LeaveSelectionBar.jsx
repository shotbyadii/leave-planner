import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { isHoliday, isWeekend, publicHolidays } from '../data/holidays';
import { checkSequentialELWarning } from '../utils/leaveOptimizer';
import { TimePicker } from './TimePicker';
import { motion, AnimatePresence } from 'framer-motion';
import AppleBalanceTicker from './AppleBalanceTicker';
import { getShortform, getLeaveColor, getLeaveTheme } from '../utils/colorUtils';

const LeaveSelectionBar = ({ 
  selectionStart, 
  previewDates, 
  onCancel, 
  onApply, 
  balances,
  leaves = {},
  maxWfh = 10,
  bookedDates = [],
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  onAdvanceTutorial,
  forceExpandModal = false,
  tutorialStepIndex = 0,
  suggestedPlanName = null
}) => {
  const isTutorialMode = Boolean(onAdvanceTutorial);

  const dates = previewDates.length > 0 ? previewDates : (selectionStart ? [selectionStart] : []);
  const targetMonthKey = (dates[0] || '').substring(0, 7) || new Date().toISOString().substring(0, 7);
  const wfhUsedThisMonth = Array.isArray(bookedDates)
    ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).length
    : 0;
  const wfhRemaining = Math.max(0, maxWfh - wfhUsedThisMonth);

  const effectiveBalances = isTutorialMode 
    ? { pl: 15, el: 10, rh: 1, wfh: 10 }
    : {
        pl: leaves?.pl ? Math.max(0, leaves.pl.total - leaves.pl.used) : (balances?.pl ?? 15),
        el: leaves?.el ? Math.max(0, leaves.el.total - leaves.el.used) : (balances?.el ?? 10),
        rh: leaves?.rh ? Math.max(0, leaves.rh.total - leaves.rh.used) : (balances?.rh ?? 1),
        wfh: wfhRemaining,
        ...balances
      };

  const [internalExpanded, setIsExpanded] = useState(false);
  const isExpanded = forceExpandModal || internalExpanded;
  const [tickerData, setTickerData] = useState(null);

  const [selectedType, setSelectedType] = useState(isTutorialMode ? null : 'pl');
  const [toHour, setToHour] = useState(18);
  const [note, setNote] = useState('');
  const [fromHour, setFromHour] = useState(9);

  useEffect(() => {
    if (!isExpanded) {
      setTickerData(null);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (isTutorialMode) {
      if (tutorialStepIndex === 4) {
        setSelectedType(null);
      } else if (tutorialStepIndex === 5) {
        setSelectedType('pl');
      }
    }
  }, [isTutorialMode, tutorialStepIndex]);

  const actualLeaves = dates.filter(d => !isHoliday(d) && !isWeekend(d));
  const baseLeavesNeeded = actualLeaves.length;
  const hasMultiple = baseLeavesNeeded > 1;

  const isMultiple = dates.length > 1;
  const weekendsCount = dates.filter(d => isWeekend(d)).length;
  const holidaysCount = dates.filter(d => isHoliday(d) && !isWeekend(d)).length;

  const elDiffHours = toHour > fromHour ? toHour - fromHour : 0;
  const isHalfDay = selectedType === 'el' && !isMultiple && baseLeavesNeeded === 1 && elDiffHours > 0 && elDiffHours < 4.5;
  const durationPerDay = isHalfDay ? 0.5 : 1;
  const leavesNeeded = isHalfDay ? 0.5 : baseLeavesNeeded;

  const showElWarning = selectedType === 'el' && checkSequentialELWarning(actualLeaves, bookedDates);

  // Auto-generate plan name: check suggestedPlanName or public holiday in range
  const first = dates.length > 0 ? new Date(dates[0]) : new Date();
  const last = dates.length > 0 ? new Date(dates[dates.length - 1]) : new Date();
  
  const holidayInWindow = dates.map(d => isHoliday(d)).find(Boolean);
  const holidayTitle = suggestedPlanName || (holidayInWindow ? holidayInWindow.name : null);

  const defaultName = holidayTitle
    ? holidayTitle
    : (isMultiple
        ? `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));

  const [planName, setPlanName] = useState(defaultName);

  useEffect(() => {
    setPlanName(defaultName);
  }, [dates.length, suggestedPlanName, dates[0]]);

  if (dates.length === 0) return null;

  const handleApply = () => {
    if (isTutorialMode) {
      onApply(dates, selectedType || 'pl', note, planName || defaultName, durationPerDay);
      setIsExpanded(false);
      if (onAdvanceTutorial) onAdvanceTutorial();
      return;
    }

    const type = (selectedType || 'pl').toLowerCase();
    const totalQuota = type === 'wfh' ? maxWfh : (leaves?.[type]?.total || (type === 'el' ? 10 : type === 'rh' ? 1 : 15));
    const curBalance = effectiveBalances[type] ?? (type === 'wfh' ? wfhRemaining : 15);
    const targetBalance = Math.max(0, curBalance - leavesNeeded);

    const chosenColor = (leaveColors && leaveColors[type]) || (type === 'el' ? 'orange' : type === 'rh' ? 'green' : type === 'wfh' ? 'cyan' : 'blue');

    setTickerData({
      initialValue: curBalance,
      targetValue: targetBalance,
      totalQuota: totalQuota,
      leaveType: type,
      leaveLabel: leaveNames[type] || type.toUpperCase(),
      leaveColor: chosenColor,
      deductedCount: leavesNeeded
    });
  };

  let displayDate = '';
  if (isMultiple) {
    displayDate = (
      <div className="flex items-center gap-3 text-foreground">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">From</span>
          <span className="text-lg font-bold">{first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        <ArrowRight className="text-muted-foreground/50 mt-3" size={20} />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">To</span>
          <span className="text-lg font-bold">{last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    );
  } else {
    displayDate = (
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Date</span>
        <span className="text-lg font-bold">{first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {/* Backdrop for expanded modal */}
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden md:block fixed inset-0 bg-black/75 backdrop-blur-md z-[9989]"
            onClick={tickerData ? undefined : () => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isExpanded ? (
          /* Modal Form Content (desktop expanded) */
          <motion.div 
            key="expanded-modal"
            layout
            initial={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="hidden md:flex fixed top-1/2 left-1/2 bg-slate-900 text-slate-50 dark:bg-zinc-900 dark:text-zinc-50 w-[480px] max-w-[92vw] flex-col max-h-[88vh] rounded-[32px] shadow-2xl shadow-black/90 border border-border overflow-hidden z-[9990] opacity-100"
          >
            <AnimatePresence mode="wait" initial={false}>
              {tickerData ? (
                <motion.div 
                  key="modal-ticker"
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
                    actionType={tickerData.leaveType === 'wfh' ? 'wfh' : 'leave'}
                    onComplete={() => {
                      onApply(dates, selectedType || 'pl', note, planName || defaultName, durationPerDay);
                      setIsExpanded(false);
                      setTickerData(null);
                    }}
                    autoDismissMs={1600}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="modal-form"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col w-full"
                >
                  <div className="p-5 sm:p-6 pt-4 md:pt-6 border-b border-border bg-muted flex justify-between items-start flex-shrink-0">
                    <div>{displayDate}</div>
                    <button onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground bg-card p-1 rounded-md shadow-sm border border-border cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>

                <div className="px-4 sm:px-6 py-4 bg-muted border-b border-border flex flex-col gap-3 flex-shrink-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Plan Breakdown</span>
                    <span className="font-bold text-muted-foreground">{dates.length} Days Total</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      const activeTheme = getLeaveColor(leaveColors[selectedType || 'pl'] || 'blue');
                      return (
                        <div className={`${activeTheme.bg} rounded-lg p-2 flex flex-col items-center justify-center text-center text-white transition-colors shadow-sm`}>
                          <span className="text-xl font-bold leading-none mb-1">{leavesNeeded}</span>
                          <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{leavesNeeded === 1 ? 'Leave' : 'Leaves'}</span>
                        </div>
                      );
                    })()}
                    <div className="bg-muted-foreground/10 rounded-lg p-2 flex flex-col items-center justify-center text-center border border-border">
                      <span className="text-xl font-bold text-foreground leading-none mb-1">{weekendsCount}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weekends</span>
                    </div>
                    <div className="bg-muted-foreground/10 rounded-lg p-2 flex flex-col items-center justify-center text-center border border-border">
                      <span className="text-xl font-bold text-foreground leading-none mb-1">{holidaysCount}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Holidays</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 flex-1 min-h-min overflow-y-auto pb-24 md:pb-6">
                  {/* Plan Name */}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Plan Name</label>
                    <input
                      id="tutorial-step-plan-name"
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="e.g. Summer Vacation, Medical Leave..."
                      className="w-full border border-border rounded-lg p-2.5 text-sm font-medium focus:outline-none focus:border-foreground/50 focus:ring-1 focus:ring-foreground/50 bg-card text-foreground"
                    />
                  </div>

                  {/* Leave Type */}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-3 block">Leave Type</label>
                    <div className="flex flex-col gap-3">
                      {/* PL */}
                      {(() => {
                        const plStyle = getLeaveTheme(leaveColors.pl || 'blue');
                        const isSelected = selectedType === 'pl';
                        return (
                          <label 
                            id="tutorial-step-category-pl" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedType('pl');
                              if (onAdvanceTutorial) {
                                onAdvanceTutorial();
                              }
                            }}
                            className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                              isSelected 
                                ? `${plStyle.activeBoxBorder} ${plStyle.activeBoxBg} ring-1 ${plStyle.activeBoxBorder} shadow-sm` 
                                : 'border-border hover:border-foreground/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                isSelected ? plStyle.activeBoxBorder : 'border-muted-foreground/40'
                              }`}>
                                {isSelected && <div className={`w-2 h-2 rounded-full ${plStyle.bg}`} />}
                              </div>
                              <span className={`font-bold text-sm ${isSelected ? plStyle.activeText : 'text-foreground'}`}>
                                {getShortform(leaveNames.pl, 'PL')} — {leaveNames.pl}
                              </span>
                            </div>
                            <span className={`text-xs font-bold border px-2 py-1 rounded-lg ${
                              isSelected ? plStyle.activeBadge : 'bg-background border-border text-muted-foreground'
                            }`}>
                              {effectiveBalances.pl} left
                            </span>
                          </label>
                        );
                      })()}

                      {/* EL with clock picker */}
                      {(() => {
                        const elStyle = getLeaveTheme(leaveColors.el || 'orange');
                        const isSelected = selectedType === 'el';
                        const isElDisabled = effectiveBalances.el < baseLeavesNeeded || isTutorialMode;
                        return (
                          <div className="flex flex-col gap-2">
                            <label 
                              onClick={() => !isElDisabled && setSelectedType('el')}
                              className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                                isSelected 
                                  ? `${elStyle.activeBoxBorder} ${elStyle.activeBoxBg} ring-1 ${elStyle.activeBoxBorder} shadow-sm` 
                                  : 'border-border hover:border-foreground/30'
                              } ${isElDisabled ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                  isSelected ? elStyle.activeBoxBorder : 'border-muted-foreground/40'
                                }`}>
                                  {isSelected && <div className={`w-2 h-2 rounded-full ${elStyle.bg}`} />}
                                </div>
                                <span className={`font-bold text-sm ${isSelected ? elStyle.activeText : 'text-foreground'}`}>
                                  {getShortform(leaveNames.el, 'EL')} — {leaveNames.el}
                                </span>
                              </div>
                              <span className={`text-xs font-bold border px-2 py-1 rounded-lg ${
                                isSelected ? elStyle.activeBadge : 'bg-background border-border text-muted-foreground'
                              }`}>
                                {effectiveBalances.el} left
                              </span>
                            </label>

                            {isSelected && !isMultiple && (
                              <div className="animate-in slide-in-from-top-2 duration-200">
                                <TimePicker
                                  fromHour={fromHour}
                                  toHour={toHour}
                                  onChange={(f, t) => { setFromHour(f); setToHour(t); }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* RH */}
                      {(() => {
                        const rhStyle = getLeaveTheme(leaveColors.rh || 'green');
                        const isSelected = selectedType === 'rh';
                        const isRhDisabled = effectiveBalances.rh < baseLeavesNeeded || baseLeavesNeeded > 1 || isTutorialMode;
                        return (
                          <label 
                            onClick={() => !isRhDisabled && setSelectedType('rh')}
                            className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                              isSelected 
                                ? `${rhStyle.activeBoxBorder} ${rhStyle.activeBoxBg} ring-1 ${rhStyle.activeBoxBorder} shadow-sm` 
                                : 'border-border hover:border-foreground/30'
                            } ${isRhDisabled ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                isSelected ? rhStyle.activeBoxBorder : 'border-muted-foreground/40'
                              }`}>
                                {isSelected && <div className={`w-2 h-2 rounded-full ${rhStyle.bg}`} />}
                              </div>
                              <span className={`font-bold text-sm ${isSelected ? rhStyle.activeText : 'text-foreground'}`}>
                                {getShortform(leaveNames.rh, 'RH')} — {leaveNames.rh}
                              </span>
                            </div>
                            <span className={`text-xs font-bold border px-2 py-1 rounded-lg ${
                              isSelected ? rhStyle.activeBadge : 'bg-background border-border text-muted-foreground'
                            }`}>
                              {effectiveBalances.rh} left
                            </span>
                          </label>
                        );
                      })()}

                      {/* WFH */}
                      {(() => {
                        const wfhStyle = getLeaveTheme(leaveColors.wfh || 'cyan');
                        const isSelected = selectedType === 'wfh';
                        return (
                          <label 
                            onClick={() => !isTutorialMode && setSelectedType('wfh')}
                            className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                              isSelected 
                                ? `${wfhStyle.activeBoxBorder} ${wfhStyle.activeBoxBg} ring-1 ${wfhStyle.activeBoxBorder} shadow-sm` 
                                : 'border-border hover:border-foreground/30'
                            } ${isTutorialMode ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                isSelected ? wfhStyle.activeBoxBorder : 'border-muted-foreground/40'
                              }`}>
                                {isSelected && <div className={`w-2 h-2 rounded-full ${wfhStyle.bg}`} />}
                              </div>
                              <span className={`font-bold text-sm ${isSelected ? wfhStyle.activeText : 'text-foreground'}`}>
                                {getShortform(leaveNames.wfh, 'WFH')} — {leaveNames.wfh}
                              </span>
                            </div>
                            <span className={`text-xs font-bold border px-2 py-1 rounded-lg ${
                              isSelected ? wfhStyle.activeBadge : 'bg-background border-border text-muted-foreground'
                            }`}>
                              Max 10/mo
                            </span>
                          </label>
                        );
                      })()}
                    </div>
                  </div>

                  {showElWarning && (
                    <div className="bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl p-3.5 flex gap-3 items-start shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                      <div className="text-xs">
                        <span className="font-black block mb-1 uppercase tracking-wider text-[10px]">Medical Certificate Required</span>
                        You are applying for more than 2 consecutive Emergency Leaves across your bookings. Please ensure you have a valid medical certificate to provide to HR.
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Family vacation, Medical appointment..."
                      className="w-full border border-border bg-card text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:border-foreground/50 focus:ring-1 focus:ring-foreground/50"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-border bg-muted flex flex-row justify-end gap-3 flex-shrink-0 mt-auto sticky bottom-0 z-10">
                  <button onClick={() => setIsExpanded(false)} className="px-4 py-2.5 border border-border text-foreground bg-white dark:bg-zinc-800 hover:bg-muted rounded-xl text-sm font-bold transition-colors shadow-sm flex-1 cursor-pointer">
                    Cancel
                  </button>
                  <button
                    id="tutorial-step-modal-apply-btn"
                    onClick={handleApply}
                    disabled={!isTutorialMode && balances[selectedType] < leavesNeeded}
                    className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-md flex-[1.5] cursor-pointer"
                  >
                    Confirm & Apply
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        ) : (
          /* Pill Content (desktop collapsed) */
          <motion.div
            key="collapsed-pill"
            layout
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            id="tutorial-step-selection-bar"
            className="hidden md:flex fixed bottom-8 left-1/2 bg-foreground text-background w-fit md:max-w-2xl h-[56px] px-3.5 rounded-full shadow-2xl shadow-black/80 border border-border/20 z-[60] overflow-hidden items-center justify-between gap-6"
          >
            <motion.div layout className="flex items-center gap-3 flex-1">
              {selectionStart && previewDates.length === 0 ? (
                <div className="flex items-center gap-2.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0"></div>
                   <div className="flex flex-col">
                     <span className="text-xs font-bold text-background leading-none">
                       Selected {new Date(selectionStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                     </span>
                     <span className="text-[10px] text-background/70 leading-none mt-1">
                       Select end date for range, or apply 1 day directly.
                     </span>
                   </div>
                </div>
              ) : (
                <>
                  <div className="bg-background/20 text-background text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-background/20 w-fit leading-none whitespace-nowrap">
                    {baseLeavesNeeded} {baseLeavesNeeded === 1 ? 'leave' : 'leaves'} needed
                  </div>
                  <span className="text-xs font-medium text-background/70 whitespace-nowrap">{dates.length} days total</span>
                </>
              )}
            </motion.div>
            
            <motion.div id="tutorial-step-confirm-modal" layout className="flex gap-2 border-l border-background/20 pl-4 md:pl-6 flex-shrink-0 items-center">
              <button 
                onClick={onCancel}
                className="text-xs font-bold text-background/70 hover:text-background px-3 py-2 rounded-full hover:bg-background/20 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              {selectionStart && previewDates.length === 0 && (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-background hover:bg-muted px-4 py-2 rounded-full shadow-md transition-colors whitespace-nowrap"
                >
                  Apply Single Day <Check size={14} strokeWidth={3} />
                </button>
              )}
              {previewDates.length > 0 && (
                <button 
                  id="tutorial-step-confirm-plan-btn"
                  onClick={() => { setIsExpanded(true); if (onAdvanceTutorial) onAdvanceTutorial(); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-background hover:bg-muted px-4 py-2 rounded-full shadow-md transition-colors whitespace-nowrap"
                >
                  Confirm Plan <Check size={14} strokeWidth={3} />
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LeaveSelectionBar;
