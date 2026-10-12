import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, AlertTriangle, ArrowRight, Sparkles, SlidersHorizontal, ShieldAlert, Heart, Calendar, Clock } from 'lucide-react';
import { isHoliday, isWeekend, publicHolidays } from '../data/holidays';
import { TimePicker } from './TimePicker';
import { motion, AnimatePresence } from 'framer-motion';
import AppleBalanceTicker from './AppleBalanceTicker';
import { getShortform, getLeaveColor, getLeaveTheme } from '../utils/colorUtils';
import { DEFAULT_LEAVE_CONFIGS, checkLeaveConstraints, buildInitialLeaveConfigs } from '../services/leaveConfigService';
import SegmentedPolicyTabs, { MorphingTabContent } from './SegmentedPolicyTabs';

const LeaveSelectionBar = ({ 
  selectionStart, 
  previewDates = [], 
  onCancel, 
  onApply, 
  balances = {},
  leaves = {},
  leaveConfigs = null,
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

  // Active configurations for all categories
  const activeConfigs = useMemo(() => {
    const rawConfigs = Array.isArray(leaveConfigs) && leaveConfigs.length > 0
      ? leaveConfigs
      : buildInitialLeaveConfigs({ legacyNames: leaveNames, legacyColors: leaveColors });
    return rawConfigs.filter(c => c.enabled !== false);
  }, [leaveConfigs, leaveNames, leaveColors]);

  const targetWfhQuota = useMemo(() => {
    const wfhConf = activeConfigs.find(c => c.id === 'wfh');
    return wfhConf ? wfhConf.quota : maxWfh;
  }, [activeConfigs, maxWfh]);

  const wfhUsedThisMonth = useMemo(() => {
    return Array.isArray(bookedDates)
      ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).reduce((sum, b) => sum + (b.duration || 1), 0)
      : 0;
  }, [bookedDates, targetMonthKey]);

  const wfhRemaining = Math.max(0, targetWfhQuota - wfhUsedThisMonth);

  // Calculate dynamic balances for all categories
  const effectiveBalances = useMemo(() => {
    if (isTutorialMode) {
      return { pl: 15, el: 10, rh: 1, wfh: 10 };
    }

    const map = { wfh: wfhRemaining };
    const curYear = new Date().getFullYear();

    for (const conf of activeConfigs) {
      if (conf.id === 'wfh') continue;

      if (balances && balances[conf.id] !== undefined) {
        map[conf.id] = Number(balances[conf.id]);
        continue;
      }

      if (conf.tier === 'annual') {
        const used = bookedDates
          .filter(b => b && b.type === conf.id && typeof b.date === 'string' && b.date.startsWith(String(curYear)))
          .reduce((sum, b) => sum + (b.duration || 1), 0);
        map[conf.id] = Math.max(0, conf.quota - used);
      } else if (conf.tier === 'special') {
        if (conf.cadence === 'month') {
          const used = bookedDates
            .filter(b => b && b.type === conf.id && typeof b.date === 'string' && b.date.startsWith(targetMonthKey))
            .reduce((sum, b) => sum + (b.duration || 1), 0);
          map[conf.id] = Math.max(0, conf.quota - used);
        } else if (conf.cadence === 'year') {
          const used = bookedDates
            .filter(b => b && b.type === conf.id && typeof b.date === 'string' && b.date.startsWith(String(curYear)))
            .reduce((sum, b) => sum + (b.duration || 1), 0);
          map[conf.id] = Math.max(0, conf.quota - used);
        } else {
          const used = bookedDates
            .filter(b => b && b.type === conf.id)
            .reduce((sum, b) => sum + (b.duration || 1), 0);
          map[conf.id] = Math.max(0, conf.quota - used);
        }
      }
    }
    return map;
  }, [isTutorialMode, activeConfigs, balances, bookedDates, targetMonthKey, wfhRemaining]);

  const [internalExpanded, setIsExpanded] = useState(false);
  const isExpanded = forceExpandModal || internalExpanded;
  const [tickerData, setTickerData] = useState(null);

  // Active Tier tab in modal: 'annual' | 'special' | 'monthly'
  const [activeTierTab, setActiveTierTab] = useState('annual');

  const [selectedType, setSelectedType] = useState(isTutorialMode ? null : 'pl');
  const [toHour, setToHour] = useState(18);
  const [fromHour, setFromHour] = useState(9);
  const [note, setNote] = useState('');

  // Universal Duration for single-day bookings: 1 (Full Day) or 0.5 (Half Day)
  const [duration, setDuration] = useState(1);

  const actualLeaves = dates.filter(d => !isHoliday(d) && !isWeekend(d));
  const baseLeavesNeeded = actualLeaves.length;
  const isMultiple = dates.length > 1;
  const weekendsCount = dates.filter(d => isWeekend(d)).length;
  const holidaysCount = dates.filter(d => isHoliday(d) && !isWeekend(d)).length;

  const selectedConfig = useMemo(() => {
    return activeConfigs.find(c => c.id === selectedType) || activeConfigs[0] || null;
  }, [activeConfigs, selectedType]);

  // Auto-switch duration to 0.5 when balance is exactly 0.5 or less than 1 (fixes 0.5 lockout bug!)
  useEffect(() => {
    if (!isMultiple && selectedType) {
      const curBal = effectiveBalances[selectedType] ?? 0;
      if (curBal < 1 && curBal >= 0.5 && selectedConfig?.allowsHalfDay !== false) {
        setDuration(0.5);
      }
    }
  }, [selectedType, isMultiple, effectiveBalances, selectedConfig]);

  // Automatically update active tab when selectedType changes
  useEffect(() => {
    if (selectedConfig?.tier) {
      setActiveTierTab(selectedConfig.tier);
    }
  }, [selectedConfig]);

  // Hourly timepicker calculation for legacy emergency leave half-day
  const elDiffHours = toHour > fromHour ? toHour - fromHour : 0;
  const isHourlyHalfDay = selectedType === 'el' && !isMultiple && baseLeavesNeeded === 1 && elDiffHours > 0 && elDiffHours < 4.5;
  const durationPerDay = (!isMultiple && (duration === 0.5 || isHourlyHalfDay)) ? 0.5 : 1;
  const leavesNeeded = isMultiple ? baseLeavesNeeded : (durationPerDay * baseLeavesNeeded);

  // Universal constraint rule validation
  const constraintWarnings = useMemo(() => {
    if (!selectedConfig) return [];
    return checkLeaveConstraints(actualLeaves, selectedConfig, bookedDates, durationPerDay);
  }, [actualLeaves, selectedConfig, bookedDates, durationPerDay]);

  // Auto-generate plan name
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

  useEffect(() => {
    if (!isExpanded) {
      setTickerData(null);
    }
  }, [isExpanded]);

  if (dates.length === 0) return null;

  const handleApply = () => {
    if (isTutorialMode) {
      onApply(dates, selectedType || 'pl', note, planName || defaultName, durationPerDay);
      setIsExpanded(false);
      if (onAdvanceTutorial) onAdvanceTutorial();
      return;
    }

    const type = (selectedType || 'pl').toLowerCase();
    const config = selectedConfig || {};
    const totalQuota = config.quota || (type === 'wfh' ? targetWfhQuota : 15);
    const curBalance = effectiveBalances[type] ?? 15;
    const targetBalance = Math.max(0, curBalance - leavesNeeded);

    const chosenColor = config.color || (leaveColors && leaveColors[type]) || 'blue';

    setTickerData({
      initialValue: curBalance,
      targetValue: targetBalance,
      totalQuota: totalQuota,
      leaveType: type,
      leaveLabel: config.name || leaveNames[type] || type.toUpperCase(),
      leaveColor: chosenColor,
      deductedCount: leavesNeeded,
      cadence: config.cadence || 'year',
      actionType: type === 'wfh' ? 'wfh' : (config.tier === 'special' ? 'special' : 'leave')
    });
  };

  // Group active categories by tier
  const annualConfigs = activeConfigs.filter(c => c.tier === 'annual');
  const specialConfigs = activeConfigs.filter(c => c.tier === 'special');
  const monthlyConfigs = activeConfigs.filter(c => c.tier === 'monthly' || c.id === 'wfh');

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
        {isExpanded && (
          <motion.div 
            id="leave-modal-backdrop"
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
          <motion.div 
            key="expanded-modal"
            id="leave-creation-modal"
            layout
            initial={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="hidden md:flex fixed top-1/2 left-1/2 bg-card text-foreground w-[520px] max-w-[94vw] flex-col max-h-[90vh] rounded-[32px] shadow-2xl shadow-black/90 border border-border overflow-hidden z-[9990] opacity-100"
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
                    actionType={tickerData.actionType}
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
                  {/* Modal Header */}
                  <div className="p-5 sm:p-6 pt-4 md:pt-6 border-b border-border bg-muted/40 flex justify-between items-start flex-shrink-0">
                    <div>{displayDate}</div>
                    <button 
                      onClick={() => setIsExpanded(false)} 
                      className="text-muted-foreground hover:text-foreground bg-card p-1.5 rounded-full shadow-xs border border-border cursor-pointer transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Plan Breakdown Metric Chips */}
                  <div className="px-5 sm:px-6 py-3.5 bg-muted/20 border-b border-border flex flex-col gap-2.5 flex-shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">Plan Breakdown</span>
                      <span className="font-mono font-bold text-muted-foreground">{dates.length} Days Window</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(() => {
                        const activeTheme = getLeaveColor(selectedConfig?.color || 'blue');
                        return (
                          <div className={`${activeTheme.bg} rounded-xl p-2.5 flex flex-col items-center justify-center text-center text-white transition-colors shadow-sm`}>
                            <span className="text-xl font-black font-mono leading-none mb-1">{leavesNeeded}</span>
                            <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                              {leavesNeeded === 1 ? 'Leave Day' : 'Leave Days'}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="bg-muted/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center border border-border/80">
                        <span className="text-xl font-black font-mono text-foreground leading-none mb-1">{weekendsCount}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weekends</span>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center border border-border/80">
                        <span className="text-xl font-black font-mono text-foreground leading-none mb-1">{holidaysCount}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Holidays</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Body */}
                  <div className="p-5 sm:p-6 flex flex-col gap-5 flex-1 min-h-min overflow-y-auto max-h-[50vh]">
                    {/* Plan Name */}
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Plan Name</label>
                      <input
                        id="tutorial-step-plan-name"
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="e.g. Summer Vacation, Medical Leave..."
                        className="w-full border border-border rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/40 text-foreground"
                      />
                    </div>

                    {/* Tier Switcher Segmented Control */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-foreground">Leave Category</label>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">3-Tier System</span>
                      </div>

                      <SegmentedPolicyTabs
                        tabs={[
                          ...(annualConfigs.length > 0 ? [{ id: 'annual', label: 'Annual Bank', count: annualConfigs.length }] : []),
                          ...(specialConfigs.length > 0 ? [{ id: 'special', label: 'Special Benefits', count: specialConfigs.length }] : []),
                          ...(monthlyConfigs.length > 0 ? [{ id: 'monthly', label: 'Remote / WFH' }] : [])
                        ]}
                        activeTab={activeTierTab}
                        onChange={(newTab) => {
                          setActiveTierTab(newTab);
                          const targetConfigs = newTab === 'annual' ? annualConfigs : (newTab === 'special' ? specialConfigs : monthlyConfigs);
                          if (targetConfigs.length > 0) setSelectedType(targetConfigs[0].id);
                        }}
                        layoutId="leave-modal-tier-tab-pill"
                        size="sm"
                        className="mb-3"
                      />

                      {/* Category Options List for Active Tier with Smooth Morphing Container */}
                      <MorphingTabContent activeKey={activeTierTab}>
                        <div className="flex flex-col gap-2 p-1.5">
                        {(activeTierTab === 'annual' ? annualConfigs : (activeTierTab === 'special' ? specialConfigs : monthlyConfigs)).map(config => {
                          const confTheme = getLeaveTheme(config.color || 'blue');
                          const isSelected = selectedType === config.id;
                          const curBal = effectiveBalances[config.id] ?? 0;
                          
                          // RESOLVES 0.5 HALF-DAY BUG: Only disable if remaining balance is less than 0.5!
                          const minReq = (!isMultiple && config.allowsHalfDay !== false) ? 0.5 : baseLeavesNeeded;
                          const isDisabled = curBal < minReq || (config.id === 'rh' && baseLeavesNeeded > 1);

                          return (
                            <div key={config.id} className="flex flex-col gap-1.5">
                              <label
                                id={config.id === 'pl' ? 'tutorial-step-category-pl' : undefined}
                                data-surface="booking-category-item"
                                data-leave-id={config.id}
                                onClick={() => {
                                  if (!isDisabled) {
                                    setSelectedType(config.id);
                                    if (isTutorialMode && config.id === 'pl' && tutorialStepIndex === 4 && onAdvanceTutorial) {
                                      onAdvanceTutorial();
                                    }
                                  }
                                }}
                                className={`flex items-center justify-between p-3.5 border-2 rounded-2xl cursor-pointer transition-all duration-150 ${
                                  isSelected 
                                    ? `${confTheme.activeBoxBorder} bg-muted/70 dark:bg-slate-900/90 shadow-md ring-2 ring-primary/25 scale-[1.01]` 
                                    : 'border-border/70 hover:border-foreground/30 bg-card/60 opacity-75 hover:opacity-100'
                                } ${isDisabled ? 'opacity-30 pointer-events-none cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                    isSelected 
                                      ? 'border-primary bg-primary text-primary-foreground shadow-xs' 
                                      : 'border-slate-400 dark:border-slate-600 bg-transparent'
                                  }`}>
                                    {isSelected && <Check size={12} strokeWidth={3.5} />}
                                  </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-black border transition-all ${
                                        isSelected ? confTheme.badge : 'bg-muted text-muted-foreground border-border/60'
                                      }`}>
                                        {config.shortCode || getShortform(config.name, config.id.toUpperCase())}
                                      </span>
                                      <span className={`text-xs transition-colors ${
                                        isSelected ? 'font-black text-foreground' : 'font-bold text-foreground/80'
                                      }`}>
                                        {config.name}
                                      </span>
                                    </div>
                                    {config.tier === 'special' && (
                                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                        Non-deductible benefit
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[11px] font-bold font-mono border px-2.5 py-1 rounded-xl transition-all ${
                                  isSelected ? `${confTheme.activeBadge} font-black shadow-xs` : 'bg-muted/40 border-border/60 text-muted-foreground'
                                }`}>
                                  {curBal} {config.cadence === 'month' ? '/ mo left' : 'left'}
                                </span>
                              </label>

                              {/* Duration Selector for Single-Day Bookings */}
                              {isSelected && !isMultiple && config.allowsHalfDay !== false && (
                                <div className="flex items-center justify-between p-2 px-3 bg-muted/40 border border-border/80 rounded-xl animate-in fade-in duration-200">
                                  <span className="text-[11px] font-bold text-muted-foreground">Booking Duration:</span>
                                  <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border/80">
                                    <button
                                      type="button"
                                      onClick={() => setDuration(1)}
                                      disabled={curBal < 1}
                                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono transition-all ${
                                        duration === 1 ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                      } ${curBal < 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                      Full Day (1.0)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDuration(0.5)}
                                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono transition-all ${
                                        duration === 0.5 ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      Half Day (0.5)
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </MorphingTabContent>
                  </div>

                    {/* Note Input */}
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">
                        Reason / Note <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Doctor appointment, Family function..."
                        className="w-full border border-border bg-muted/40 text-foreground rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 sm:p-6 border-t border-border bg-muted/40 flex flex-row justify-end gap-3 flex-shrink-0 mt-auto sticky bottom-0 z-10">
                    <button 
                      onClick={() => setIsExpanded(false)} 
                      className="px-4 py-2.5 border border-border text-foreground bg-card hover:bg-muted rounded-2xl text-xs font-bold transition-colors shadow-xs flex-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="tutorial-step-modal-apply-btn"
                      onClick={handleApply}
                      disabled={!isTutorialMode && (effectiveBalances[selectedType] ?? 0) < leavesNeeded}
                      className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-xs font-bold transition-colors disabled:opacity-40 shadow-sm flex-[1.5] cursor-pointer"
                    >
                      Confirm & Apply
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Desktop Collapsed Floating Pill */
          <motion.div
            key="collapsed-pill"
            id="tutorial-step-selection-bar"
            layout
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="hidden md:flex fixed bottom-8 left-1/2 bg-foreground text-background w-fit md:max-w-2xl h-[56px] px-4 rounded-full shadow-2xl shadow-black/80 border border-border/20 z-[9992] overflow-visible items-center justify-between gap-6"
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
            
            <motion.div layout className="flex gap-2 border-l border-background/20 pl-4 md:pl-6 flex-shrink-0 items-center">
              <button 
                onClick={onCancel}
                className="text-xs font-bold text-background/70 hover:text-background px-3 py-2 rounded-full hover:bg-background/20 transition-colors whitespace-nowrap cursor-pointer"
              >
                Cancel
              </button>
              {selectionStart && previewDates.length === 0 && (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-background hover:bg-muted px-4 py-2 rounded-full shadow-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  Apply Single Day <Check size={14} strokeWidth={3} />
                </button>
              )}
              {previewDates.length > 0 && (
                <button 
                  id="tutorial-step-confirm-plan-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                    if (onAdvanceTutorial) onAdvanceTutorial();
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-background hover:bg-muted px-4 py-2 rounded-full shadow-md transition-colors whitespace-nowrap cursor-pointer"
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
