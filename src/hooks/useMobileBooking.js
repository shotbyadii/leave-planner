import { useState, useEffect, useMemo, useCallback } from 'react';
import { publicHolidays, isHoliday, isWeekend } from '../data/holidays';
import { createLeavePlan, addLeave } from '../services/leaveService';
import { LOP_CONFIG } from '../services/leaveConfigService';
import { hapticYes } from '../utils/haptics';

export function useMobileBooking({
  previewDates = [],
  setPreviewDates,
  suggestedPlanName = null,
  leaveConfigs = [],
  leaves = {},
  leaveColors = {},
  leaveNames = {},
  bookedDates = [],
  lopUsedThisYear = 0,
  isAnnualBankDepleted = false,
  currentUser = null,
  loadLeaves,
  setActiveTab,
  isTutorialActive = false,
  setTutorialStepIndex,
  defaultTutorialPlanName = '',
  setTutorialCustomName,
  setLeavePlans,
  tutorialStartDate = '',
  tutorialEndDate = '',
  getTodayStr
}) {
  const [selectionStart, setSelectionStart] = useState(null);
  const [mobileConfirmOpen, setMobileConfirmOpen] = useState(false);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [mobileLeaveType, setMobileLeaveType] = useState('pl');
  const [mobilePlanName, setMobilePlanName] = useState('');
  const [mobileNote, setMobileNote] = useState('');
  const [mobileDuration, setMobileDuration] = useState(1);
  const [mobileTickerData, setMobileTickerData] = useState(null);
  const [mobileModalTierTab, setMobileModalTierTab] = useState('annual');

  const curTodayStr = getTodayStr ? getTodayStr() : '';

  // Calculate current mobile balance
  const selectedMobileBal = useMemo(() => {
    if (mobileLeaveType === 'lop') return lopUsedThisYear;
    const item = Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === mobileLeaveType) : null;
    if (mobileLeaveType === 'wfh') {
      const targetMonthKey = (previewDates[0] || '').substring(0, 7) || curTodayStr.substring(0, 7);
      const wfhUsedThisMonth = Array.isArray(bookedDates)
        ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).reduce((s, b) => s + (b.duration || 1), 0)
        : 0;
      return Math.max(0, (item?.quota || 10) - wfhUsedThisMonth);
    }
    if (item?.cadence === 'month') {
      return Math.max(0, (item.quota || 1) - (leaves[item.id]?.used || 0));
    }
    const total = item?.quota || (leaves[mobileLeaveType]?.total ?? 15);
    const used = leaves[mobileLeaveType]?.used ?? 0;
    return Math.max(0, total - used);
  }, [leaveConfigs, mobileLeaveType, previewDates, bookedDates, leaves, lopUsedThisYear, curTodayStr]);

  const actualLeavesMobile = useMemo(() => {
    return previewDates.filter(d => !isHoliday(d) && !isWeekend(d)).length;
  }, [previewDates]);

  const activeMobileConfig = useMemo(() => {
    if (mobileLeaveType === 'lop') return LOP_CONFIG;
    return Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === mobileLeaveType) : null;
  }, [leaveConfigs, mobileLeaveType]);

  const allowsHalfDayMobile = activeMobileConfig ? activeMobileConfig.allowsHalfDay !== false : (mobileLeaveType === 'el' || mobileLeaveType === 'pl');
  const isMobileHalfDay = previewDates.length === 1 && allowsHalfDayMobile && mobileDuration === 0.5;
  const mobileLeavesNeeded = isMobileHalfDay ? 0.5 : actualLeavesMobile;

  // Auto-switch mobile duration to 0.5 when balance is exactly 0.5 or less than 1
  useEffect(() => {
    if (previewDates.length === 1 && mobileLeaveType && mobileLeaveType !== 'lop') {
      if (allowsHalfDayMobile && selectedMobileBal < 1 && selectedMobileBal >= 0.5) {
        setMobileDuration(0.5);
      } else if (selectedMobileBal >= 1) {
        setMobileDuration(1);
      }
    }
  }, [mobileLeaveType, previewDates.length, selectedMobileBal, allowsHalfDayMobile]);

  // Keep mobile modal active tab in sync and pre-select available category if current has zero balance
  useEffect(() => {
    if (mobileConfirmOpen && mobileLeaveType) {
      if (mobileLeaveType === 'lop') {
        setMobileModalTierTab('annual');
      } else {
        const curCfg = Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === mobileLeaveType) : null;
        if (curCfg) {
          if (curCfg.tier === 'annual') setMobileModalTierTab('annual');
          else if (curCfg.tier === 'special') setMobileModalTierTab('special');
          else if (curCfg.tier === 'monthly' || curCfg.tier === 'remote' || curCfg.id === 'wfh') setMobileModalTierTab('remote');
        } else if (mobileLeaveType === 'wfh') {
          setMobileModalTierTab('remote');
        }
      }

      if (isAnnualBankDepleted && (mobileModalTierTab === 'annual' || ['pl', 'el', 'rh', 'lop'].includes(mobileLeaveType))) {
        setMobileModalTierTab('annual');
        if (selectedMobileBal <= 0 && mobileLeaveType !== 'lop') {
          setMobileLeaveType('lop');
          return;
        }
      }

      if (previewDates.length === 1) {
        if (allowsHalfDayMobile && selectedMobileBal < 1 && selectedMobileBal >= 0.5 && mobileLeaveType !== 'lop') {
          setMobileDuration(0.5);
        } else {
          setMobileDuration(1);
        }
      }

      if (selectedMobileBal <= 0 && mobileLeaveType !== 'lop' && Array.isArray(leaveConfigs)) {
        if (mobileModalTierTab === 'annual' && isAnnualBankDepleted) {
          setMobileLeaveType('lop');
          return;
        }

        const sameTierAvailable = leaveConfigs.find(c => {
          if (!c.enabled) return false;
          const tier = (c.tier === 'monthly' || c.id === 'wfh') ? 'remote' : c.tier;
          if (tier !== mobileModalTierTab) return false;
          const tot = c.quota || (leaves[c.id]?.total ?? 10);
          const u = leaves[c.id]?.used ?? 0;
          return (tot - u) > 0;
        });

        if (sameTierAvailable) {
          setMobileLeaveType(sameTierAvailable.id);
        } else if (isAnnualBankDepleted) {
          setMobileLeaveType('lop');
          setMobileModalTierTab('annual');
        } else {
          const available = leaveConfigs.find(c => {
            if (!c.enabled) return false;
            if (c.id === 'wfh') {
              const targetMonthKey = (previewDates[0] || '').substring(0, 7) || curTodayStr.substring(0, 7);
              const wfhUsed = Array.isArray(bookedDates)
                ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).reduce((s, b) => s + (b.duration || 1), 0)
                : 0;
              return ((c.quota || 10) - wfhUsed) > 0;
            }
            const tot = c.quota || (leaves[c.id]?.total ?? 10);
            const u = leaves[c.id]?.used ?? 0;
            return (tot - u) > 0;
          });
          if (available) {
            setMobileLeaveType(available.id);
            if (available.tier) setMobileModalTierTab(available.tier === 'monthly' ? 'remote' : available.tier);
          }
        }
      }
    }
  }, [mobileConfirmOpen, mobileLeaveType, leaveConfigs, selectedMobileBal, allowsHalfDayMobile, previewDates, bookedDates, leaves, isAnnualBankDepleted, mobileModalTierTab, curTodayStr]);

  // Derive suggested mobile plan name
  useEffect(() => {
    if (previewDates.length > 0) {
      const holidayInWindow = previewDates.map(d => publicHolidays.find(h => h.date === d)).find(Boolean);
      const holidayTitle = suggestedPlanName || (holidayInWindow ? holidayInWindow.name : null);

      const first = new Date(previewDates[0]);
      const last = new Date(previewDates[previewDates.length - 1]);
      const name = holidayTitle
        ? holidayTitle
        : (previewDates.length > 1
            ? `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
      setMobilePlanName(name);
    }
  }, [previewDates, suggestedPlanName]);

  const handleMobileApply = useCallback(async () => {
    hapticYes();
    if (isTutorialActive) {
      const chosenName = mobilePlanName || defaultTutorialPlanName;
      if (setTutorialCustomName) setTutorialCustomName(chosenName);
      if (setLeavePlans) {
        setLeavePlans(prev => [
          {
            id: 'tutorial-demo-plan-temp',
            name: chosenName,
            start_date: tutorialStartDate,
            end_date: tutorialEndDate,
            startDate: tutorialStartDate,
            endDate: tutorialEndDate,
            type: 'pl',
            is_demo: true
          },
          ...prev.filter(p => p.id !== 'tutorial-demo-plan-temp')
        ]);
      }
      setPreviewDates([]);
      setSelectionStart(null);
      setMobileConfirmOpen(false);
      setMobileNote('');
      setMobileLeaveType('pl');
      if (setActiveTab) setActiveTab('tracker');
      if (setTutorialStepIndex) setTutorialStepIndex(6);
      return;
    }
    const dates = previewDates;
    const actualLeaves = dates.filter(d => !isHoliday(d) && !isWeekend(d)).length;
    const type = (mobileLeaveType || 'pl').toLowerCase();
    const activeConfig = type === 'lop' ? LOP_CONFIG : (Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === type) : null);
    const allowsHalf = activeConfig ? activeConfig.allowsHalfDay !== false : (type === 'el' || type === 'pl');
    const isHalfDay = allowsHalf && dates.length === 1 && mobileDuration === 0.5;
    const durationPerDay = isHalfDay ? 0.5 : 1;
    const leavesNeeded = isHalfDay ? 0.5 : actualLeaves;

    if (type === 'lop') {
      const currentYear = new Date().getFullYear();
      const currentLopUsed = bookedDates.filter(b => b.type === 'lop' && typeof b.date === 'string' && b.date.startsWith(String(currentYear))).reduce((sum, b) => sum + (b.duration || 1), 0);
      setMobileTickerData({
        initialValue: currentLopUsed,
        targetValue: currentLopUsed + leavesNeeded,
        totalQuota: currentLopUsed + leavesNeeded,
        leaveType: 'lop',
        leaveLabel: 'Unpaid Leave (LOP)',
        leaveColor: 'zinc',
        deductedCount: leavesNeeded,
        dates: [...dates],
        note: mobileNote,
        planName: mobilePlanName,
        durationPerDay
      });
      return;
    }

    const maxWfh = activeConfig?.quota || 10;
    let curBalance = 0;
    let total = activeConfig?.quota || (leaves[type]?.total || 15);

    if (type === 'wfh') {
      const targetMonthKey = (dates[0] || '').substring(0, 7) || curTodayStr.substring(0, 7);
      const wfhUsedThisMonth = Array.isArray(bookedDates)
        ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).reduce((s, b) => s + (b.duration || 1), 0)
        : 0;
      total = maxWfh;
      curBalance = Math.max(0, maxWfh - wfhUsedThisMonth);
    } else {
      const used = leaves[type]?.used || 0;
      curBalance = Math.max(0, total - used);
    }

    if (!isTutorialActive && (curBalance < leavesNeeded || curBalance <= 0)) {
      return;
    }

    const targetBalance = Math.max(0, curBalance - leavesNeeded);
    const chosenColor = activeConfig?.color || (leaveColors && leaveColors[type]) || (type === 'el' ? 'orange' : type === 'rh' ? 'green' : type === 'wfh' ? 'cyan' : 'blue');

    setMobileTickerData({
      initialValue: curBalance,
      targetValue: targetBalance,
      totalQuota: total,
      leaveType: type,
      leaveLabel: activeConfig?.name || leaveNames[type] || type.toUpperCase(),
      leaveColor: chosenColor,
      deductedCount: leavesNeeded,
      dates: [...dates],
      note: mobileNote,
      planName: mobilePlanName,
      durationPerDay
    });
  }, [
    isTutorialActive,
    mobilePlanName,
    defaultTutorialPlanName,
    setTutorialCustomName,
    setLeavePlans,
    tutorialStartDate,
    tutorialEndDate,
    setPreviewDates,
    setActiveTab,
    setTutorialStepIndex,
    previewDates,
    mobileLeaveType,
    leaveConfigs,
    mobileDuration,
    bookedDates,
    mobileNote,
    leaves,
    curTodayStr,
    leaveColors,
    leaveNames
  ]);

  const handleMobileTickerComplete = useCallback(async () => {
    if (!mobileTickerData) return;
    const { dates, note, planName, durationPerDay, leaveType } = mobileTickerData;
    let planId = null;
    if (dates.length > 1) {
      const plan = await createLeavePlan(planName || 'Untitled Plan', dates[0], dates[dates.length - 1], currentUser?.id);
      planId = plan?.id || null;
    }
    for (const dateStr of dates) {
      if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
        await addLeave(dateStr, leaveType, note, planId, durationPerDay, currentUser?.id);
      }
    }
    if (loadLeaves) await loadLeaves();
    setPreviewDates([]);
    setSelectionStart(null);
    setMobileConfirmOpen(false);
    setMobileNote('');
    setMobileLeaveType('pl');
    setMobileTickerData(null);
  }, [mobileTickerData, currentUser?.id, loadLeaves, setPreviewDates]);

  return {
    selectionStart,
    setSelectionStart,
    mobileConfirmOpen,
    setMobileConfirmOpen,
    viewingLeave,
    setViewingLeave,
    isSelecting,
    setIsSelecting,
    mobileLeaveType,
    setMobileLeaveType,
    mobilePlanName,
    setMobilePlanName,
    mobileNote,
    setMobileNote,
    mobileDuration,
    setMobileDuration,
    mobileTickerData,
    setMobileTickerData,
    mobileModalTierTab,
    setMobileModalTierTab,
    selectedMobileBal,
    actualLeavesMobile,
    activeMobileConfig,
    allowsHalfDayMobile,
    isMobileHalfDay,
    mobileLeavesNeeded,
    handleMobileApply,
    handleMobileTickerComplete
  };
}
