import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';
import SegmentedPolicyTabs, { MorphingTabContent } from '../SegmentedPolicyTabs';
import AppleBalanceTicker from '../AppleBalanceTicker';
import { getLeaveColor, getLeaveTheme, getShortform } from '../../utils/colorUtils';
import { isHoliday, isWeekend } from '../../data/holidays';
import { LOP_CONFIG } from '../../services/leaveConfigService';

export default function MobileLeaveBookingSheet({
  onClose,
  mobileTickerData = null,
  onTickerComplete,
  mobilePlanName = '',
  setMobilePlanName,
  mobileLeavesNeeded = 0,
  previewDates = [],
  leaveConfigs = [],
  isAnnualBankDepleted = false,
  totalAnnualBankRemaining = 0,
  lopUsedThisYear = 0,
  bookedDates = [],
  leaves = {},
  mobileLeaveType = 'pl',
  setMobileLeaveType,
  mobileModalTierTab = 'annual',
  setMobileModalTierTab,
  isTutorialActive = false,
  tutorialStepIndex = 0,
  setTutorialStepIndex,
  allowsHalfDayMobile = true,
  mobileDuration = 1,
  setMobileDuration,
  selectedMobileBal = 0,
  mobileNote = '',
  setMobileNote,
  onApply
}) {
  const getTodayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const baseAnnualModalConfigs = Array.isArray(leaveConfigs)
    ? leaveConfigs.filter(c => c.tier === 'annual' && c.enabled)
    : [
        { id: 'pl', name: 'Planned Leave', shortCode: 'PL', color: 'blue', tier: 'annual', allowsHalfDay: true },
        { id: 'el', name: 'Emergency Leave', shortCode: 'EL', color: 'orange', tier: 'annual', allowsHalfDay: true, constraints: { maxConsecutive: 2 } },
        { id: 'rh', name: 'Restricted Leave', shortCode: 'RH', color: 'green', tier: 'annual', allowsHalfDay: false, constraints: { maxConsecutive: 1 } }
      ];
  const annualModalConfigs = isAnnualBankDepleted
    ? [...baseAnnualModalConfigs, LOP_CONFIG]
    : baseAnnualModalConfigs;
  const specialModalConfigs = Array.isArray(leaveConfigs)
    ? leaveConfigs.filter(c => c.tier === 'special' && c.enabled)
    : [];
  const remoteModalConfigs = Array.isArray(leaveConfigs)
    ? leaveConfigs.filter(c => (c.tier === 'monthly' || c.tier === 'remote' || c.id === 'wfh') && c.enabled)
    : [
        { id: 'wfh', name: 'Work From Home', shortCode: 'WFH', color: 'cyan', tier: 'monthly', quota: 10, cadence: 'month' }
      ];

  const modalTabs = [
    { id: 'annual', label: isAnnualBankDepleted ? 'Annual Bank (LOP)' : 'Annual Bank', count: annualModalConfigs.length },
    ...(specialModalConfigs.length > 0 ? [{ id: 'special', label: 'Special', count: specialModalConfigs.length }] : []),
    { id: 'remote', label: 'Remote / WFH' }
  ];

  const currentTabConfigs = mobileModalTierTab === 'annual'
    ? annualModalConfigs
    : (mobileModalTierTab === 'special' ? specialModalConfigs : remoteModalConfigs);

  const workingLeaves = previewDates.filter(d => !isHoliday(d) && !isWeekend(d)).length;

  return (
    <motion.div 
      key="confirm"
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      style={{ transformOrigin: 'bottom center' }}
      className="max-h-[min(85dvh,calc(100dvh-3rem-env(safe-area-inset-bottom,0px)))] flex flex-col overflow-hidden origin-bottom"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
      </div>
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex justify-between items-center flex-shrink-0">
        <h2 className="font-bold font-mono text-sm uppercase tracking-tight">Confirm Leave</h2>
        {!mobileTickerData && (
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mobileTickerData ? (
          <motion.div
            key="mobile-ticker"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="p-6 flex flex-col items-center justify-center flex-1"
          >
            <AppleBalanceTicker
              initialValue={mobileTickerData.initialValue}
              targetValue={mobileTickerData.targetValue}
              totalQuota={mobileTickerData.totalQuota}
              leaveType={mobileTickerData.leaveType}
              leaveLabel={mobileTickerData.leaveLabel}
              leaveColor={mobileTickerData.leaveColor}
              deductedCount={mobileTickerData.deductedCount}
              actionType={mobileTickerData.leaveType === 'wfh' ? 'wfh' : 'leave'}
              onComplete={onTickerComplete}
              autoDismissMs={1600}
            />
          </motion.div>
        ) : (
          <motion.div
            key="mobile-form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            {/* Scrollable Form Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4 no-scrollbar overscroll-contain">
              <div>
                <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Plan Name</label>
                <input
                  id="tutorial-step-plan-name-mobile"
                  type="text"
                  value={mobilePlanName}
                  onChange={(e) => setMobilePlanName(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Plan Name"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Leaves needed</span>
                  <span className="text-sm font-bold text-foreground leading-none">{mobileLeavesNeeded}</span>
                </div>
                <div className="w-px h-6 bg-border/50" />
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total days</span>
                  <span className="text-sm font-bold text-foreground leading-none">{previewDates.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest block">Leave Type</label>
                  <span className="text-[9px] font-mono font-bold text-muted-foreground/80">3-Tier Policy</span>
                </div>

                <SegmentedPolicyTabs
                  tabs={modalTabs}
                  activeTab={mobileModalTierTab}
                  onChange={(newTab) => {
                    setMobileModalTierTab(newTab);
                    const targetList = newTab === 'annual' ? annualModalConfigs : (newTab === 'special' ? specialModalConfigs : remoteModalConfigs);
                    const isAlreadyInTab = targetList.some(c => c.id === mobileLeaveType);
                    if (!isAlreadyInTab && targetList.length > 0) {
                      setMobileLeaveType(targetList[0].id);
                    }
                  }}
                  layoutId="mobile-confirm-modal-tier-pill"
                  size="xs"
                  className="w-full"
                />

                {mobileModalTierTab === 'annual' && isAnnualBankDepleted && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-zinc-700 dark:text-zinc-300 text-xs">
                    <AlertCircle size={14} className="text-zinc-500 flex-shrink-0" />
                    <span className="text-[11px] leading-tight">
                      {totalAnnualBankRemaining === 0.5 
                        ? "0.5 days remaining in annual bank. You can use it or take Unpaid Leave (LOP)."
                        : "Annual bank depleted. Unpaid Leave (LOP) fallback active."}
                    </span>
                  </div>
                )}

                <MorphingTabContent activeKey={mobileModalTierTab}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1.5 pb-2">
                    {currentTabConfigs.map(item => {
                      const isActive = mobileLeaveType === item.id;
                      const isLop = item.id === 'lop';
                      const curBal = isLop
                        ? lopUsedThisYear
                        : item.id === 'wfh'
                          ? Math.max(0, (item.quota || 10) - bookedDates.filter(b => b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(getTodayStr().substring(0, 7))).reduce((s, b) => s + (b.duration || 1), 0))
                          : item.cadence === 'month'
                            ? Math.max(0, (item.quota || 1) - (leaves[item.id]?.used || 0))
                            : Math.max(0, (item.quota || leaves[item.id]?.total || 10) - (leaves[item.id]?.used || 0));

                      const displayRemaining = isLop
                        ? `${lopUsedThisYear} taken`
                        : item.id === 'wfh'
                          ? `${curBal}/mo`
                          : item.cadence === 'month'
                            ? `${curBal}/mo`
                            : `${curBal} left`;

                      const minReq = (previewDates.length === 1 && item.allowsHalfDay !== false) ? 0.5 : workingLeaves;
                      const maxConsecutive = item.constraints?.maxConsecutive;
                      const isInsufficient = isLop ? false : (curBal < minReq);
                      const isConsecutiveExceeded = Boolean(maxConsecutive && workingLeaves > maxConsecutive);
                      const isRhOverLimit = item.id === 'rh' && workingLeaves > 1;

                      const isDisabled = !isTutorialActive && (
                        (workingLeaves > 0 && isInsufficient) ||
                        isConsecutiveExceeded ||
                        isRhOverLimit
                      );

                      let disableReason = null;
                      if (isDisabled) {
                        if (workingLeaves > 0 && isInsufficient) disableReason = 'Low Balance';
                        else if (isRhOverLimit) disableReason = 'Max 1 Day';
                        else if (isConsecutiveExceeded) disableReason = `Max ${maxConsecutive}d`;
                      }

                      const theme = getLeaveTheme(item.color || 'blue');
                      const colorObj = getLeaveColor(item.color || 'blue');

                      return (
                        <button
                          key={item.id}
                          id={item.id === 'pl' ? 'tutorial-step-category-pl-mobile' : undefined}
                          data-surface="booking-category-item"
                          data-leave-id={item.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              setMobileLeaveType(item.id);
                              if (isTutorialActive && tutorialStepIndex === 4 && setTutorialStepIndex) setTutorialStepIndex(5);
                            }
                          }}
                          className={`py-2.5 px-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 relative ${
                            isDisabled
                              ? 'opacity-35 cursor-not-allowed pointer-events-none bg-muted/20 border-dashed border-border/50 text-muted-foreground'
                              : isActive
                                ? `${theme.border} bg-muted/70 dark:bg-slate-900/90 text-foreground shadow-md ring-2 ring-primary/20 scale-[1.01] cursor-pointer`
                                : 'border-border/70 bg-card/60 text-muted-foreground opacity-80 hover:opacity-100 hover:text-foreground cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 leading-none">
                            <span className={`w-1.5 h-1.5 rounded-full ${colorObj.bg} flex-shrink-0`} />
                            <span className="text-[11px] font-black uppercase tracking-wider font-mono">
                              {item.id === 'wfh' ? 'WFH' : (item.shortCode || getShortform(item.name))}
                            </span>
                          </div>
                          <span className="text-[8px] font-bold opacity-80 leading-none truncate font-mono">
                            {displayRemaining}
                          </span>
                          {disableReason && (
                            <span className="text-[8px] font-bold font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 leading-none mt-0.5">
                              {disableReason}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </MorphingTabContent>
              </div>

              {/* Desktop-like Duration Selector for Single-Day Bookings */}
              {allowsHalfDayMobile && previewDates.length === 1 && (
                <div className="p-3 bg-muted/40 border border-border/80 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">Booking Duration</span>
                    <span className="text-[10px] font-mono text-muted-foreground">Select leave duration</span>
                  </div>
                  <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border/80">
                    <button
                      type="button"
                      onClick={() => setMobileDuration(1)}
                      disabled={mobileLeaveType !== 'lop' && selectedMobileBal < 1}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                        mobileDuration === 1 
                          ? 'bg-primary text-primary-foreground shadow-xs' 
                          : 'text-muted-foreground hover:text-foreground'
                      } ${mobileLeaveType !== 'lop' && selectedMobileBal < 1 ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                    >
                      Full Day (1.0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileDuration(0.5)}
                      disabled={mobileLeaveType !== 'lop' && selectedMobileBal < 0.5}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                        mobileDuration === 0.5 
                          ? 'bg-primary text-primary-foreground shadow-xs' 
                          : 'text-muted-foreground hover:text-foreground'
                      } ${mobileLeaveType !== 'lop' && selectedMobileBal < 0.5 ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                    >
                      Half Day (0.5)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Note (Optional)</label>
                <input
                  type="text"
                  value={mobileNote}
                  onChange={(e) => setMobileNote(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm font-bold focus:outline-none"
                  placeholder="Why are you taking leave?"
                />
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="px-5 pt-2.5 pb-3.5 border-t border-border bg-card/95 backdrop-blur-md flex gap-3 flex-shrink-0">
              <button onClick={onClose} className="flex-1 py-3 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-xl text-xs font-bold shadow-sm cursor-pointer active:scale-98 transition-all">
                Back
              </button>
              <button 
                id="tutorial-step-modal-apply-btn-mobile"
                onClick={onApply} 
                disabled={!isTutorialActive && mobileLeaveType !== 'lop' && (selectedMobileBal < mobileLeavesNeeded || selectedMobileBal <= 0)}
                className={`flex-[2] py-3 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all ${
                  !isTutorialActive && mobileLeaveType !== 'lop' && (selectedMobileBal < mobileLeavesNeeded || selectedMobileBal <= 0)
                    ? 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed pointer-events-none'
                    : 'bg-primary text-primary-foreground cursor-pointer active:scale-98'
                }`}
              >
                Confirm & Apply <Check size={14} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
