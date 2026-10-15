import { useState, useEffect, useMemo, useCallback } from 'react';
import { publicHolidays, isHoliday, isWeekend } from '../data/holidays';
import { 
  fetchBookedLeaves, 
  fetchLeavePlans, 
  resetAllLeaves, 
  removeLeave, 
  deleteLeavePlan, 
  updateLeavePlan, 
  addLeave, 
  createLeavePlan 
} from '../services/leaveService';
import { 
  buildInitialLeaveConfigs, 
  LOP_CONFIG 
} from '../services/leaveConfigService';
import { getLeaveColor, getShortform } from '../utils/colorUtils';
import { hapticDateRangeCascade } from '../utils/haptics';
import { getCompanyLogoUrl } from '../utils/companyLogoUtils';
import { getCurrentUser, upsertUserProfile } from '../services/authService';
import { upsertDemoProfile } from '../services/demoService';

export function useLeaveManagement({
  currentUser,
  isDemoMode = false,
  userName = 'User',
  setUserName,
  companyName = '',
  setCompanyName,
  companyLogoUrl = '',
  setCompanyLogoUrl,
  avatarUrl = '',
  setAvatarUrl,
  wfhPromptHour = '12',
  setWfhPromptHour,
  attendanceCatchupMode = 'multi_day',
  setAttendanceCatchupMode,
  setActiveTab,
  setCalendarFocusedMonth,
  setCalendarViewMode,
  scrollToTop,
  devDateStr = null
}) {
  const [leaveNames, setLeaveNames] = useState(() => {
    try {
      const saved = localStorage.getItem('leave_names');
      return saved ? JSON.parse(saved) : { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' };
    } catch (e) {
      return { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' };
    }
  });

  const [leaveColors, setLeaveColors] = useState(() => {
    try {
      const saved = localStorage.getItem('leave_colors');
      return saved ? JSON.parse(saved) : { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' };
    } catch (e) {
      return { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' };
    }
  });

  const [leaves, setLeaves] = useState({
    pl: { total: parseInt(localStorage.getItem('quota_pl') || '15', 10), used: 0, label: leaveNames.pl || 'Planned Leave', color: leaveColors.pl || 'blue', bg: getLeaveColor(leaveColors.pl).bg, badge: getLeaveColor(leaveColors.pl).badge },
    el: { total: parseInt(localStorage.getItem('quota_el') || '10', 10), used: 0, label: leaveNames.el || 'Emergency Leave', color: leaveColors.el || 'orange', bg: getLeaveColor(leaveColors.el).bg, badge: getLeaveColor(leaveColors.el).badge },
    rh: { total: parseInt(localStorage.getItem('quota_rh') || '1', 10), used: 0, label: leaveNames.rh || 'Extra Leave', color: leaveColors.rh || 'green', bg: getLeaveColor(leaveColors.rh).bg, badge: getLeaveColor(leaveColors.rh).badge },
    wfh: { total: parseInt(localStorage.getItem('quota_wfh') || '10', 10), used: 0, label: leaveNames.wfh || 'Work From Home', color: leaveColors.wfh || 'cyan', bg: getLeaveColor(leaveColors.wfh).bg, badge: getLeaveColor(leaveColors.wfh).badge }
  });

  const [leaveConfigs, setLeaveConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem('leave_configs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return buildInitialLeaveConfigs({
      legacyQuotas: {
        pl: parseInt(localStorage.getItem('quota_pl') || '15', 10),
        el: parseInt(localStorage.getItem('quota_el') || '10', 10),
        rh: parseInt(localStorage.getItem('quota_rh') || '1', 10),
        wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10),
      },
      legacyNames: (function() {
        try {
          const s = localStorage.getItem('leave_names');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      })(),
      legacyColors: (function() {
        try {
          const s = localStorage.getItem('leave_colors');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      })()
    });
  });

  const [bookedDates, setBookedDates] = useState([]);
  const [leavePlans, setLeavePlans] = useState([]);
  const [previewDates, setPreviewDates] = useState([]);
  const [suggestedPlanName, setSuggestedPlanName] = useState(null);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);
  const [isLeavesLoaded, setIsLeavesLoaded] = useState(false);
  const [isAiPreview, setIsAiPreview] = useState(false);

  const getTodayStr = useCallback(() => {
    if (import.meta.env.DEV && devDateStr) return devDateStr;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, [devDateStr]);

  const updateLeaveCounts = useCallback((datesArray) => {
    const plUsed = datesArray.filter(d => d.type === 'pl').reduce((sum, d) => sum + (d.duration || 1), 0);
    const elUsed = datesArray.filter(d => d.type === 'el').reduce((sum, d) => sum + (d.duration || 1), 0);
    const rhUsed = datesArray.filter(d => d.type === 'rh').reduce((sum, d) => sum + (d.duration || 1), 0);

    const targetMonthKey = getTodayStr().substring(0, 7);
    const wfhUsed = datesArray
      .filter(d => d.type === 'wfh' && typeof d.date === 'string' && d.date.startsWith(targetMonthKey))
      .reduce((sum, d) => sum + (d.duration || 1), 0);

    setLeaves(prev => {
      const next = {
        ...prev,
        pl: { ...prev.pl, used: plUsed },
        el: { ...prev.el, used: elUsed },
        rh: { ...prev.rh, used: rhUsed },
        wfh: { ...prev.wfh, used: wfhUsed, total: prev.wfh?.total || parseInt(localStorage.getItem('quota_wfh') || '10', 10) }
      };

      if (Array.isArray(leaveConfigs)) {
        leaveConfigs.forEach(c => {
          const usedForType = datesArray
            .filter(d => d.type === c.id && (c.cadence === 'month' ? typeof d.date === 'string' && d.date.startsWith(targetMonthKey) : true))
            .reduce((sum, d) => sum + (d.duration || 1), 0);
          const clr = c.color || 'blue';
          next[c.id] = {
            total: c.quota,
            used: usedForType,
            label: c.name,
            color: clr,
            bg: getLeaveColor(clr).bg,
            badge: getLeaveColor(clr).badge,
            tier: c.tier,
            deductsFromAnnual: c.deductsFromAnnual
          };
        });
      }

      return next;
    });
  }, [getTodayStr, leaveConfigs]);

  const loadLeaves = useCallback(async (targetUser = undefined) => {
    const activeUser = targetUser !== undefined ? targetUser : currentUser;
    const userId = activeUser?.id || null;
    const dbLeaves = await fetchBookedLeaves(userId);
    const dbPlans = await fetchLeavePlans(userId);
    setBookedDates(dbLeaves);
    setLeavePlans(dbPlans);
    updateLeaveCounts(dbLeaves);
    setIsLeavesLoaded(true);
  }, [currentUser, updateLeaveCounts]);

  const annualTrackerEntries = useMemo(() => {
    if (Array.isArray(leaveConfigs) && leaveConfigs.length > 0) {
      return leaveConfigs.filter(c => c.tier === 'annual' && c.enabled).map(c => {
        const data = leaves[c.id] || { total: c.quota, used: 0, label: c.name };
        const total = data.total ?? c.quota ?? 0;
        const used = data.used ?? 0;
        const rem = Math.max(0, total - used);
        return {
          id: c.id,
          shortCode: c.shortCode || getShortform(c.name, c.id.toUpperCase()),
          name: c.name,
          color: c.color || 'blue',
          total,
          used,
          remaining: Number.isInteger(rem) ? rem : rem.toFixed(1)
        };
      });
    }
    return ['pl', 'el', 'rh'].map(k => {
      const data = leaves[k] || { total: 10, used: 0, label: k };
      const rem = Math.max(0, data.total - data.used);
      return {
        id: k,
        shortCode: k.toUpperCase(),
        name: leaveNames[k] || data.label,
        color: leaveColors[k] || 'blue',
        total: data.total,
        used: data.used,
        remaining: Number.isInteger(rem) ? rem : rem.toFixed(1)
      };
    });
  }, [leaveConfigs, leaves, leaveNames, leaveColors]);

  const specialTrackerEntries = useMemo(() => {
    if (Array.isArray(leaveConfigs) && leaveConfigs.length > 0) {
      return leaveConfigs.filter(c => c.tier === 'special' && c.enabled).map(c => {
        const data = leaves[c.id] || { total: c.quota, used: 0, label: c.name };
        const total = data.total ?? c.quota ?? 1;
        const used = data.used ?? 0;
        const rem = Math.max(0, total - used);
        return {
          id: c.id,
          shortCode: c.shortCode || getShortform(c.name, c.id.toUpperCase()),
          name: c.name,
          color: c.color || 'pink',
          cadence: c.cadence || 'month',
          total,
          used,
          remaining: Number.isInteger(rem) ? rem : rem.toFixed(1)
        };
      });
    }
    return [];
  }, [leaveConfigs, leaves]);

  const remoteTrackerEntry = useMemo(() => {
    const curMonthKey = new Date().toISOString().substring(0, 7);
    const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(curMonthKey)).length;
    const maxWfh = parseInt(localStorage.getItem('quota_wfh') || '10', 10);
    const rem = Math.max(0, maxWfh - wfhUsedThisMonth);
    return {
      id: 'wfh',
      shortCode: 'WFH',
      name: leaveNames.wfh || 'Work From Home',
      color: leaveColors.wfh || 'cyan',
      total: maxWfh,
      used: wfhUsedThisMonth,
      remaining: rem
    };
  }, [bookedDates, leaveNames.wfh, leaveColors.wfh]);

  const curYearStr = String(new Date().getFullYear());
  const lopUsedThisYear = useMemo(() => {
    return Array.isArray(bookedDates)
      ? bookedDates.filter(b => b && b.type === 'lop' && typeof b.date === 'string' && b.date.startsWith(curYearStr)).reduce((s, b) => s + (b.duration || 1), 0)
      : 0;
  }, [bookedDates, curYearStr]);

  const totalAnnualBankRemaining = useMemo(() => {
    return annualTrackerEntries.reduce((s, e) => s + (typeof e.remaining === 'number' ? e.remaining : parseFloat(e.remaining) || 0), 0);
  }, [annualTrackerEntries]);

  const isAnnualBankDepleted = totalAnnualBankRemaining <= 0.5;
  const isLopActive = isAnnualBankDepleted || lopUsedThisYear > 0;

  const handleSaveSettings = async ({ 
    name, 
    companyName: newCompanyName, 
    companyLogoUrl: newCompanyLogoUrl, 
    avatarUrl: newAvatarUrl, 
    quotas, 
    names, 
    colors, 
    leaveConfigs: newLeaveConfigs, 
    wfhPromptHour: newPromptHour, 
    attendanceCatchupMode: newCatchupMode 
  }) => {
    if (name && setUserName) {
      setUserName(name);
      localStorage.setItem('user_name', name);
    }
    if (newCompanyName !== undefined && setCompanyName) {
      setCompanyName(newCompanyName);
      localStorage.setItem('company_name', newCompanyName);
      const computedLogo = newCompanyLogoUrl !== undefined ? newCompanyLogoUrl : getCompanyLogoUrl(newCompanyName);
      const finalLogo = computedLogo || '';
      if (setCompanyLogoUrl) setCompanyLogoUrl(finalLogo);
      if (finalLogo) localStorage.setItem('company_logo_url', finalLogo);
      else localStorage.removeItem('company_logo_url');
    } else if (newCompanyLogoUrl !== undefined && setCompanyLogoUrl) {
      setCompanyLogoUrl(newCompanyLogoUrl);
      if (newCompanyLogoUrl) localStorage.setItem('company_logo_url', newCompanyLogoUrl);
      else localStorage.removeItem('company_logo_url');
    }
    if (newAvatarUrl !== undefined && setAvatarUrl) {
      setAvatarUrl(newAvatarUrl);
      localStorage.setItem('avatar_url', newAvatarUrl);
    }
    if (newPromptHour !== undefined && setWfhPromptHour) {
      setWfhPromptHour(String(newPromptHour));
      localStorage.setItem('wfh_prompt_hour', String(newPromptHour));
    }
    if (newCatchupMode !== undefined && setAttendanceCatchupMode) {
      setAttendanceCatchupMode(newCatchupMode);
      localStorage.setItem('attendance_catchup_mode', newCatchupMode);
    }
    if (newLeaveConfigs) {
      setLeaveConfigs(newLeaveConfigs);
      localStorage.setItem('leave_configs', JSON.stringify(newLeaveConfigs));
    }
    if (quotas) {
      if (quotas.pl !== undefined) localStorage.setItem('quota_pl', quotas.pl);
      if (quotas.el !== undefined) localStorage.setItem('quota_el', quotas.el);
      if (quotas.rh !== undefined) localStorage.setItem('quota_rh', quotas.rh);
      if (quotas.wfh !== undefined) localStorage.setItem('quota_wfh', quotas.wfh);
    }
    if (names) {
      setLeaveNames(names);
      localStorage.setItem('leave_names', JSON.stringify(names));
    }
    if (colors) {
      setLeaveColors(colors);
      localStorage.setItem('leave_colors', JSON.stringify(colors));
    }

    if (names || colors || quotas || newLeaveConfigs) {
      setLeaves(prev => {
        const next = { ...prev };
        const activeNames = names || leaveNames;
        const activeColors = colors || leaveColors;
        const activeQuotas = quotas || {};

        if (activeQuotas.pl !== undefined) next.pl.total = activeQuotas.pl;
        if (activeQuotas.el !== undefined) next.el.total = activeQuotas.el;
        if (activeQuotas.rh !== undefined) next.rh.total = activeQuotas.rh;

        if (activeNames.pl) next.pl.label = activeNames.pl;
        if (activeNames.el) next.el.label = activeNames.el;
        if (activeNames.rh) next.rh.label = activeNames.rh;

        if (activeColors.pl) { next.pl.color = activeColors.pl; next.pl.bg = getLeaveColor(activeColors.pl).bg; next.pl.badge = getLeaveColor(activeColors.pl).badge; }
        if (activeColors.el) { next.el.color = activeColors.el; next.el.bg = getLeaveColor(activeColors.el).bg; next.el.badge = getLeaveColor(activeColors.el).badge; }
        if (activeColors.rh) { next.rh.color = activeColors.rh; next.rh.bg = getLeaveColor(activeColors.rh).bg; next.rh.badge = getLeaveColor(activeColors.rh).badge; }

        if (Array.isArray(newLeaveConfigs)) {
          newLeaveConfigs.forEach(c => {
            const clr = c.color || 'blue';
            next[c.id] = {
              ...(next[c.id] || {}),
              total: c.quota,
              used: next[c.id]?.used || 0,
              label: c.name,
              color: clr,
              bg: getLeaveColor(clr).bg,
              badge: getLeaveColor(clr).badge,
              tier: c.tier,
              deductsFromAnnual: c.deductsFromAnnual
            };
          });
        }

        return { ...next };
      });
    }

    if (isDemoMode) {
      upsertDemoProfile(currentUser?.id || 'demo-user', {
        name: name || userName,
        company_name: newCompanyName !== undefined ? newCompanyName : companyName,
        company_logo_url: newCompanyLogoUrl !== undefined ? newCompanyLogoUrl : companyLogoUrl,
        avatar_url: newAvatarUrl !== undefined ? newAvatarUrl : avatarUrl,
        quota_pl: quotas ? quotas.pl : leaves.pl.total,
        quota_el: quotas ? quotas.el : leaves.el.total,
        quota_rh: quotas ? quotas.rh : leaves.rh.total,
        quota_wfh: quotas ? quotas.wfh : parseInt(localStorage.getItem('quota_wfh') || '10', 10),
        leave_names: names || leaveNames,
        leave_colors: colors || leaveColors,
        leave_configs: newLeaveConfigs || leaveConfigs,
        wfh_prompt_hour: newPromptHour !== undefined ? newPromptHour : (wfhPromptHour || '12')
      });
    } else {
      const activeUser = currentUser || await getCurrentUser();
      if (activeUser?.id) {
        await upsertUserProfile(activeUser.id, {
          name: name || userName,
          email: activeUser.email,
          companyName: newCompanyName !== undefined ? newCompanyName : companyName,
          companyLogoUrl: newCompanyLogoUrl !== undefined ? newCompanyLogoUrl : companyLogoUrl,
          avatarUrl: newAvatarUrl !== undefined ? newAvatarUrl : avatarUrl,
          quotas: quotas || {
            pl: leaves.pl.total,
            el: leaves.el.total,
            rh: leaves.rh.total,
            wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
          },
          names: names || leaveNames,
          colors: colors || leaveColors,
          leave_configs: newLeaveConfigs || leaveConfigs,
          wfhPromptHour: newPromptHour !== undefined ? newPromptHour : (wfhPromptHour || '12')
        });
      }
    }

    const updatedColors = colors || leaveColors;
    const updatedNames = names || leaveNames;

    setLeaves(prev => ({
      pl: { 
        ...prev.pl, 
        total: quotas ? quotas.pl : prev.pl.total, 
        label: updatedNames.pl, 
        color: updatedColors.pl,
        bg: getLeaveColor(updatedColors.pl).bg,
        badge: getLeaveColor(updatedColors.pl).badge
      },
      el: { 
        ...prev.el, 
        total: quotas ? quotas.el : prev.el.total, 
        label: updatedNames.el, 
        color: updatedColors.el,
        bg: getLeaveColor(updatedColors.el).bg,
        badge: getLeaveColor(updatedColors.el).badge
      },
      rh: { 
        ...prev.rh, 
        total: quotas ? quotas.rh : prev.rh.total, 
        label: updatedNames.rh, 
        color: updatedColors.rh,
        bg: getLeaveColor(updatedColors.rh).bg,
        badge: getLeaveColor(updatedColors.rh).badge
      },
      wfh: { 
        ...prev.wfh, 
        total: quotas ? quotas.wfh : (prev.wfh?.total || 10), 
        label: updatedNames.wfh || prev.wfh?.label || 'Work From Home', 
        color: updatedColors.wfh || prev.wfh?.color || 'cyan',
        bg: getLeaveColor(updatedColors.wfh || prev.wfh?.color || 'cyan').bg,
        badge: getLeaveColor(updatedColors.wfh || prev.wfh?.color || 'cyan').badge
      }
    }));
  };

  const handleReset = async () => {
    await resetAllLeaves(currentUser?.id);
    setBookedDates([]);
    setLeavePlans([]);
    updateLeaveCounts([]);
    setPreviewDates([]);
  };

  const handleDeleteLeave = async (dateStr) => {
    await removeLeave(dateStr, currentUser?.id);
    const newDates = bookedDates.filter(d => d.date !== dateStr);
    setBookedDates(newDates);
    updateLeaveCounts(newDates);
  };

  const handleDeletePlan = async (planId) => {
    await deleteLeavePlan(planId, currentUser?.id);
    await loadLeaves();
  };

  const handleUpdatePlan = async (planId, newName) => {
    await updateLeavePlan(planId, { name: newName }, currentUser?.id);
    await loadLeaves();
  };

  const handlePreviewRange = (datesArray, holidayName = null, options = {}) => {
    if (Array.isArray(datesArray) && datesArray.length > 0) {
      hapticDateRangeCascade(datesArray.length);
    }
    if (setActiveTab) setActiveTab('calendar');
    setSuggestedPlanName(holidayName || null);
    setPreviewDates(datesArray || []);
    
    if (datesArray && datesArray.length > 0 && setCalendarFocusedMonth && setCalendarViewMode) {
      const firstDate = new Date(datesArray[0]);
      if (!isNaN(firstDate.getTime())) {
        setCalendarFocusedMonth(firstDate.getMonth());
        setCalendarViewMode('monthly');
      }
    }

    if (options && options.isAiChat) {
      setIsAiPreview(true);
    } else {
      setIsAiPreview(false);
    }
    if (scrollToTop) scrollToTop();
  };

  const handleClearAiPreview = () => {
    setIsAiPreview(false);
    setPreviewDates([]);
    setSuggestedPlanName(null);
    setHoveredSuggestion(null);
  };

  const handleExecuteAiAction = async (action, details) => {
    if (!details) return;

    if (action === 'stage_plan') {
      const planName = details.planName || 'Vacation Plan';
      const startDate = details.startDate;
      const endDate = details.endDate || startDate;
      const leaveType = (details.leaveType || 'pl').toLowerCase();

      let workingDatesToBook = [];
      if (Array.isArray(details.dates) && details.dates.length > 0) {
        workingDatesToBook = details.dates.filter(d => !isHoliday(d) && !isWeekend(d));
      }
      if (workingDatesToBook.length === 0 && startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dStr = `${y}-${m}-${day}`;
          if (!isHoliday(dStr) && !isWeekend(dStr)) {
            workingDatesToBook.push(dStr);
          }
        }
      }
      if (workingDatesToBook.length === 0 && startDate) {
        workingDatesToBook = [startDate];
      }

      const curTotal = leaves && leaves[leaveType] ? leaves[leaveType].total : 15;
      const curUsed = leaves && leaves[leaveType] ? leaves[leaveType].used : 0;
      const curRemaining = Math.max(0, curTotal - curUsed);
      const requiredDays = workingDatesToBook.length;

      if (curRemaining < requiredDays) {
        alert(`Cannot book leave: Insufficient ${leaveNames[leaveType] || leaveType.toUpperCase()} quota (only ${curRemaining} remaining, but ${requiredDays} required).`);
        return;
      }

      let planId = null;
      const existingPlan = (leavePlans || []).find(p => 
        (p.name?.trim().toLowerCase() === planName.trim().toLowerCase()) &&
        (p.start_date === startDate || p.startDate === startDate) &&
        (p.end_date === endDate || p.endDate === endDate)
      );

      if (existingPlan) {
        planId = existingPlan.id;
      } else {
        try {
          const plan = await createLeavePlan(planName, startDate, endDate, currentUser?.id);
          planId = plan?.id || null;
        } catch (err) {
          console.error('Failed to create leave plan in database:', err);
        }
      }

      for (const d of workingDatesToBook) {
        await addLeave(d, leaveType, details.note || planName, planId, 1, currentUser?.id);
      }
      await loadLeaves();
    } else if (action === 'stage_leave') {
      const lType = (details.leaveType || 'pl').toLowerCase();
      const rawDates = Array.isArray(details.dates) && details.dates.length > 0
        ? details.dates
        : (details.startDate ? [details.startDate] : []);
      const datesToBook = rawDates.filter(d => !isHoliday(d) && !isWeekend(d));
      const finalDates = datesToBook.length > 0 ? datesToBook : rawDates;

      const curTotal = leaves && leaves[lType] ? leaves[lType].total : 15;
      const curUsed = leaves && leaves[lType] ? leaves[lType].used : 0;
      const curRemaining = Math.max(0, curTotal - curUsed);
      const requiredDays = finalDates.length;

      if (curRemaining < requiredDays) {
        alert(`Cannot book leave: Insufficient ${leaveNames[lType] || lType.toUpperCase()} quota (only ${curRemaining} remaining, but ${requiredDays} required).`);
        return;
      }

      for (const d of finalDates) {
        await addLeave(d, lType, details.note || 'Leave', null, 1, currentUser?.id);
      }
      await loadLeaves();
    } else if (action === 'log_wfh') {
      const datesToBook = Array.isArray(details.dates) && details.dates.length > 0
        ? details.dates
        : (details.startDate ? [details.startDate] : []);

      for (const d of datesToBook) {
        await addLeave(d, 'wfh', details.note || 'Work From Home', null, 1, currentUser?.id);
      }
      await loadLeaves();
    } else if (action === 'cancel_leave' || action === 'delete_leave') {
      const datesToCancel = details.dates || (details.startDate ? [details.startDate] : []);
      for (const d of datesToCancel) {
        await removeLeave(d, currentUser?.id);
      }
      if (details.planId) {
        await deleteLeavePlan(details.planId, currentUser?.id);
      } else if (details.planName) {
        const foundPlan = leavePlans.find(p => p.name?.toLowerCase() === details.planName?.toLowerCase());
        if (foundPlan) {
          await deleteLeavePlan(foundPlan.id, currentUser?.id);
        }
      }
      await loadLeaves();
    }

    setPreviewDates([]);
    setIsAiPreview(false);
    setSuggestedPlanName(null);
    setHoveredSuggestion(null);
  };

  return {
    leaveNames,
    setLeaveNames,
    leaveColors,
    setLeaveColors,
    leaves,
    setLeaves,
    leaveConfigs,
    setLeaveConfigs,
    bookedDates,
    setBookedDates,
    leavePlans,
    setLeavePlans,
    previewDates,
    setPreviewDates,
    suggestedPlanName,
    setSuggestedPlanName,
    hoveredSuggestion,
    setHoveredSuggestion,
    isLeavesLoaded,
    setIsLeavesLoaded,
    isAiPreview,
    setIsAiPreview,
    annualTrackerEntries,
    specialTrackerEntries,
    remoteTrackerEntry,
    lopUsedThisYear,
    totalAnnualBankRemaining,
    isAnnualBankDepleted,
    isLopActive,
    loadLeaves,
    updateLeaveCounts,
    handleSaveSettings,
    handleReset,
    handleDeleteLeave,
    handleDeletePlan,
    handleUpdatePlan,
    handlePreviewRange,
    handleClearAiPreview,
    handleExecuteAiAction,
    getTodayStr
  };
}
