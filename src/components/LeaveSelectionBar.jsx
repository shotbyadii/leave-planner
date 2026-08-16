import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import { checkSequentialELWarning } from '../utils/leaveOptimizer';
import { TimePicker } from './TimePicker';
import { motion, AnimatePresence } from 'framer-motion';

import { getShortform } from '../utils/colorUtils';

const LeaveSelectionBar = ({ 
  selectionStart, 
  previewDates, 
  onCancel, 
  onApply, 
  balances,
  bookedDates = [],
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
  onAdvanceTutorial,
  forceExpandModal = false,
  tutorialStepIndex = 0
}) => {
  const isTutorialMode = Boolean(onAdvanceTutorial);
  const effectiveBalances = isTutorialMode 
    ? { pl: 15, el: 10, rh: 1, wfh: 10 }
    : balances;

  const [internalExpanded, setIsExpanded] = useState(false);
  const isExpanded = forceExpandModal || internalExpanded;

  const [selectedType, setSelectedType] = useState(isTutorialMode ? null : 'pl');
  const [toHour, setToHour] = useState(18);
  const [note, setNote] = useState('');
  const [fromHour, setFromHour] = useState(9);

  useEffect(() => {
    if (isTutorialMode) {
      if (tutorialStepIndex === 4) {
        setSelectedType(null);
      } else if (tutorialStepIndex === 5) {
        setSelectedType('pl');
      }
    }
  }, [isTutorialMode, tutorialStepIndex]);

  const colors = {
    pl: { 
      border: 'border-blue-500', 
      bg: 'bg-blue-50 dark:bg-blue-500/10', 
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-100/50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
    },
    el: { 
      border: 'border-orange-500', 
      bg: 'bg-orange-50 dark:bg-orange-500/10', 
      text: 'text-orange-700 dark:text-orange-400',
      badge: 'bg-orange-100/50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300'
    },
    rh: { 
      border: 'border-green-500', 
      bg: 'bg-green-50 dark:bg-green-500/10', 
      text: 'text-green-700 dark:text-green-400',
      badge: 'bg-green-100/50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
    },
    wfh: { 
      border: 'border-cyan-500', 
      bg: 'bg-cyan-50 dark:bg-cyan-500/10', 
      text: 'text-cyan-700 dark:text-cyan-400',
      badge: 'bg-cyan-100/50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300'
    }
  };

  const dates = previewDates.length > 0 ? previewDates : (selectionStart ? [selectionStart] : []);
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

  // Auto-generate plan name
  const first = dates.length > 0 ? new Date(dates[0]) : new Date();
  const last = dates.length > 0 ? new Date(dates[dates.length - 1]) : new Date();
  
  const defaultName = isMultiple
    ? `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const [planName, setPlanName] = useState(defaultName);

  useEffect(() => {
    setPlanName(defaultName);
  }, [dates.length]);

  if (dates.length === 0) return null;

  const handleApply = () => {
    onApply(dates, selectedType || 'pl', note, planName || defaultName, durationPerDay);
    setIsExpanded(false);
    if (onAdvanceTutorial) onAdvanceTutorial();
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
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isExpanded ? (
          /* Modal Form Content (desktop expanded) */
          <motion.div 
            key="expanded-modal"
            initial={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="hidden md:flex fixed top-1/2 left-1/2 bg-slate-900 text-slate-50 dark:bg-zinc-900 dark:text-zinc-50 w-[480px] max-w-[92vw] flex-col max-h-[88vh] rounded-[32px] shadow-2xl shadow-black/90 border border-border overflow-hidden z-[9990] opacity-100"
          >
            <div className="p-5 sm:p-6 pt-4 md:pt-6 border-b border-border bg-muted flex justify-between items-start flex-shrink-0">
              <div>{displayDate}</div>
              <button onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground bg-card p-1 rounded-md shadow-sm border border-border">
                <X size={16} />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-4 bg-muted border-b border-border flex flex-col gap-3 flex-shrink-0">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Plan Breakdown</span>
                <span className="font-bold text-muted-foreground">{dates.length} Days Total</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-600 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-white leading-none mb-1">{leavesNeeded}</span>
                  <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Leaves</span>
                </div>
                <div className="bg-slate-500 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-white leading-none mb-1">{weekendsCount}</span>
                  <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Weekends</span>
                </div>
                <div className="bg-purple-600 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-white leading-none mb-1">{holidaysCount}</span>
                  <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Holidays</span>
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
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === 'pl' ? `${colors.pl.border} ${colors.pl.bg}` : 'border-border hover:border-foreground/30'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="leaveType" value="pl" checked={selectedType === 'pl'} onChange={() => {}} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span className={`font-medium ${selectedType === 'pl' ? colors.pl.text : 'text-foreground'}`}>{getShortform(leaveNames.pl, 'PL')} — {leaveNames.pl}</span>
                    </div>
                    <span className={`text-xs font-medium border px-2 py-1 rounded ${selectedType === 'pl' ? colors.pl.badge : 'bg-background border-border text-muted-foreground'}`}>{effectiveBalances.pl} left</span>
                  </label>

                  {/* EL with clock picker */}
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === 'el' ? `${colors.el.border} ${colors.el.bg}` : 'border-border hover:border-foreground/30'} ${(effectiveBalances.el < baseLeavesNeeded || isTutorialMode) ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="leaveType" value="el" checked={selectedType === 'el'} onChange={() => {}} onClick={() => !isTutorialMode && effectiveBalances.el >= baseLeavesNeeded && setSelectedType('el')} disabled={isTutorialMode || effectiveBalances.el < baseLeavesNeeded} className="w-4 h-4 text-orange-500 focus:ring-orange-400" />
                        <span className={`font-medium ${selectedType === 'el' ? colors.el.text : 'text-foreground'}`}>{getShortform(leaveNames.el, 'EL')} — {leaveNames.el}</span>
                      </div>
                      <span className={`text-xs font-medium border px-2 py-1 rounded ${selectedType === 'el' ? colors.el.badge : 'bg-background border-border text-muted-foreground'}`}>{effectiveBalances.el} left</span>
                    </label>

                    {selectedType === 'el' && !isMultiple && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
                        <TimePicker
                          fromHour={fromHour}
                          toHour={toHour}
                          onChange={(f, t) => { setFromHour(f); setToHour(t); }}
                        />
                      </div>
                    )}
                  </div>

                  <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === 'rh' ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'border-border hover:border-foreground/30'} ${(effectiveBalances.rh < baseLeavesNeeded || baseLeavesNeeded > 1 || isTutorialMode) ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="leaveType" value="rh" checked={selectedType === 'rh'} onChange={() => {}} onClick={() => !isTutorialMode && baseLeavesNeeded <= 1 && effectiveBalances.rh >= baseLeavesNeeded && setSelectedType('rh')} disabled={isTutorialMode || effectiveBalances.rh < baseLeavesNeeded || baseLeavesNeeded > 1} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                      <span className={`font-medium ${selectedType === 'rh' ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>{getShortform(leaveNames.rh, 'RH')} — {leaveNames.rh}</span>
                    </div>
                    <span className={`text-xs font-medium border px-2 py-1 rounded ${selectedType === 'rh' ? 'bg-green-100/50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-background border-border text-muted-foreground'}`}>{effectiveBalances.rh} left</span>
                  </label>

                  <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === 'wfh' ? `${colors.wfh.border} ${colors.wfh.bg}` : 'border-border hover:border-foreground/30'} ${isTutorialMode ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="leaveType" value="wfh" checked={selectedType === 'wfh'} onChange={() => {}} onClick={() => !isTutorialMode && setSelectedType('wfh')} disabled={isTutorialMode} className="w-4 h-4 text-cyan-500 focus:ring-cyan-400" />
                      <span className={`font-medium ${selectedType === 'wfh' ? colors.wfh.text : 'text-foreground'}`}>{getShortform(leaveNames.wfh, 'WFH')} — {leaveNames.wfh}</span>
                    </div>
                    <span className={`text-xs font-medium border px-2 py-1 rounded ${selectedType === 'wfh' ? colors.wfh.badge : 'bg-background border-border text-muted-foreground'}`}>Max 10/mo</span>
                  </label>
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
              <button onClick={() => setIsExpanded(false)} className="px-4 py-2.5 border border-border text-foreground bg-white dark:bg-zinc-800 hover:bg-muted rounded-xl text-sm font-bold transition-colors shadow-sm flex-1">
                Cancel
              </button>
              <button
                id="tutorial-step-modal-apply-btn"
                onClick={handleApply}
                disabled={!isTutorialMode && balances[selectedType] < leavesNeeded}
                className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-md flex-[1.5]"
              >
                Confirm & Apply
              </button>
            </div>
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
                    {baseLeavesNeeded} {baseLeavesNeeded === 1 ? 'leaf' : 'leaves'} needed
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
