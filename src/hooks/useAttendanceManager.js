import { useState, useEffect } from 'react';
import { isHoliday, isWeekend } from '../data/holidays';
import { addLeave } from '../services/leaveService';
import { LOP_CONFIG } from '../services/leaveConfigService';
import { 
  showAttendanceLiveActivity, 
  showAttendanceCatchupNotification,
  showUpcomingLeaveNotification,
  showHolidayNotification,
  showQuotaAlertNotification
} from '../utils/notificationService';
import { getMissingAttendanceDays } from '../utils/attendanceCatchupUtils';

export function useAttendanceManager({
  currentUser,
  isDemoMode = false,
  bookedDates = [],
  leaveConfigs = [],
  leaveNames = {},
  leaves = {},
  leavePlans = [],
  holidays = [],
  devDateStr = null,
  isLeavesLoaded = false,
  loadLeaves,
  onOpenLeaveBooking
}) {
  const [wfhModalOpen, setWfhModalOpen] = useState(false);
  const [wfhTargetDate, setWfhTargetDate] = useState(null);
  const [missingAttendanceDays, setMissingAttendanceDays] = useState([]);
  const [hasPromptedWfh, setHasPromptedWfh] = useState(false);
  const [wfhPromptHour, setWfhPromptHour] = useState(() => localStorage.getItem('wfh_prompt_hour') || '12');
  const [attendanceCatchupMode, setAttendanceCatchupMode] = useState(() => localStorage.getItem('attendance_catchup_mode') || 'multi_day');

  const getTodayStr = () => {
    if (import.meta.env.DEV && devDateStr) return devDateStr;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const checkAndTriggerAttendancePrompt = () => {
    const todayStr = getTodayStr();
    if (isHoliday(todayStr) || isWeekend(todayStr)) return;

    const missingDays = getMissingAttendanceDays(bookedDates, todayStr, 14);
    const hasLogToday = bookedDates.some(b => b.date === todayStr);

    const now = new Date();
    const currentHour = now.getHours();
    const targetHour = parseInt(wfhPromptHour, 10) || 12;

    // Daily Check-in Prompt
    if (!hasLogToday && currentHour >= targetHour && !hasPromptedWfh) {
      if (attendanceCatchupMode === 'multi_day' && missingDays.length > 1) {
        setMissingAttendanceDays(missingDays);
        setWfhTargetDate(missingDays[0]);
      } else {
        setMissingAttendanceDays([todayStr]);
        setWfhTargetDate(todayStr);
      }
      setWfhModalOpen(true);
      setHasPromptedWfh(true);
    }

    // Staggered Notifications
    if (currentHour >= targetHour && !hasLogToday) {
      const todayPromptKey = `notif_daily_prompt_${todayStr}`;
      if (localStorage.getItem(todayPromptKey) !== 'true') {
        showAttendanceLiveActivity({ dateStr: todayStr, userId: currentUser?.id });
        localStorage.setItem(todayPromptKey, 'true');
      }
    }

    // Multi-day Catch-up Notification
    const unloggedPastDays = missingDays.filter(d => d !== todayStr);
    if (unloggedPastDays.length > 0 && (currentHour >= 17 || (currentHour >= 9 && currentHour < 12))) {
      const catchupPromptKey = `notif_catchup_${todayStr}_count_${unloggedPastDays.length}`;
      if (localStorage.getItem(catchupPromptKey) !== 'true') {
        showAttendanceCatchupNotification({
          count: unloggedPastDays.length,
          unloggedDates: unloggedPastDays,
          userId: currentUser?.id
        });
        localStorage.setItem(catchupPromptKey, 'true');
      }
    }

    // Upcoming Leave Eve Reminder
    if (currentHour >= 17) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      
      const tomorrowPlan = (leavePlans || []).find(p => p.start_date === tomorrowStr || p.startDate === tomorrowStr);
      if (tomorrowPlan && localStorage.getItem(`notif_plan_eve_${tomorrowPlan.id}`) !== 'true') {
        showUpcomingLeaveNotification({
          planName: tomorrowPlan.name,
          startDate: tomorrowStr,
          daysCount: (bookedDates || []).filter(b => b.plan_id === tomorrowPlan.id).length || 1
        });
        localStorage.setItem(`notif_plan_eve_${tomorrowPlan.id}`, 'true');
      }

      // Public Holiday Eve Notice
      const tomorrowHoliday = (holidays || []).find(h => h.date === tomorrowStr);
      if (tomorrowHoliday && localStorage.getItem(`notif_holiday_eve_${tomorrowStr}`) !== 'true') {
        showHolidayNotification({
          holidayName: tomorrowHoliday.name,
          dateStr: tomorrowStr,
          isLongWeekend: Boolean(tomorrow.getDay() === 1 || tomorrow.getDay() === 5)
        });
        localStorage.setItem(`notif_holiday_eve_${tomorrowStr}`, 'true');
      }
    }
  };

  // Sync listener and interval checks
  useEffect(() => {
    if (!isLeavesLoaded) return;

    checkAndTriggerAttendancePrompt();

    const handleSyncAndCheck = async () => {
      if (currentUser?.id || isDemoMode) {
        if (loadLeaves) await loadLeaves(currentUser);
      }
      checkAndTriggerAttendancePrompt();
    };

    const intervalId = setInterval(handleSyncAndCheck, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSyncAndCheck();
      }
    };

    window.addEventListener('focus', handleSyncAndCheck);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleSyncAndCheck);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLeavesLoaded, bookedDates, hasPromptedWfh, devDateStr, wfhPromptHour, attendanceCatchupMode, currentUser]);

  const handleWfhStatusSelect = async (statusType, targetDateStr = null) => {
    const targetDate = targetDateStr || getTodayStr();
    const isLop = statusType === 'lop';
    const isWfh = statusType === 'wfh';
    const isOffice = statusType === 'office';
    const activeCfg = isLop ? LOP_CONFIG : (Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === statusType) : null);

    // Guard: Prevent logging regular leave if quota is exhausted
    if (!isLop && !isWfh && !isOffice) {
      const curRemaining = leaves && leaves[statusType] 
        ? Math.max(0, (leaves[statusType].total ?? activeCfg?.quota ?? 0) - (leaves[statusType].used ?? 0))
        : 1;
      if (curRemaining < 1) {
        console.warn(`Cannot log ${statusType}: quota exhausted.`);
        return;
      }
    }

    const note = isWfh ? 'Work From Home' : (isOffice ? 'In-Office' : (isLop ? 'Unpaid Leave (LOP)' : (activeCfg?.name || leaveNames[statusType] || statusType.toUpperCase())));
    await addLeave(targetDate, statusType, note, null, 1, currentUser?.id);
    if (loadLeaves) await loadLeaves();

    // Check WFH Quota Threshold
    if (isWfh) {
      const curMonthKey = targetDate.substring(0, 7);
      const curWfhCount = (bookedDates || []).filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length + 1;
      const quota = parseInt(localStorage.getItem('quota_wfh') || '10', 10);
      if (curWfhCount >= quota - 1 && localStorage.getItem(`wfh_alert_${curMonthKey}_${curWfhCount}`) !== 'true') {
        showQuotaAlertNotification({
          type: 'wfh',
          used: curWfhCount,
          total: quota,
          remaining: Math.max(0, quota - curWfhCount)
        });
        localStorage.setItem(`wfh_alert_${curMonthKey}_${curWfhCount}`, 'true');
      }
    }

    setMissingAttendanceDays(prev => {
      const updated = prev.filter(d => d !== targetDate);
      if (updated.length === 0) {
        setHasPromptedWfh(true);
        setWfhModalOpen(false);
      }
      return updated;
    });

    try {
      const bc = new BroadcastChannel('leave-vault-sync');
      bc.postMessage({ type: 'LEAVES_UPDATED', todayStr: targetDate, statusType });
      bc.close();
    } catch (e) {}
  };

  const handleBatchWfhStatusSelect = async (statusType, targetDates = []) => {
    if (!Array.isArray(targetDates) || targetDates.length === 0) return;
    const isLop = statusType === 'lop';
    const isWfh = statusType === 'wfh';
    const isOffice = statusType === 'office';
    const activeCfg = isLop ? LOP_CONFIG : (Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === statusType) : null);
    const note = isWfh ? 'Work From Home' : (isOffice ? 'In-Office' : (isLop ? 'Unpaid Leave (LOP)' : (activeCfg?.name || leaveNames[statusType] || statusType.toUpperCase())));

    for (const d of targetDates) {
      await addLeave(d, statusType, note, null, 1, currentUser?.id);
    }
    if (loadLeaves) await loadLeaves();
    setMissingAttendanceDays(prev => prev.filter(d => !targetDates.includes(d)));
    setHasPromptedWfh(true);
    setWfhModalOpen(false);

    try {
      const bc = new BroadcastChannel('leave-vault-sync');
      bc.postMessage({ type: 'LEAVES_UPDATED', batch: true, statusType });
      bc.close();
    } catch (e) {}
  };

  const handleWfhMarkLeave = (targetDateStr = null) => {
    const targetDate = targetDateStr || getTodayStr();
    setWfhModalOpen(false);
    if (onOpenLeaveBooking) {
      onOpenLeaveBooking(targetDate);
    }
  };

  return {
    wfhModalOpen,
    setWfhModalOpen,
    wfhTargetDate,
    setWfhTargetDate,
    missingAttendanceDays,
    setMissingAttendanceDays,
    hasPromptedWfh,
    setHasPromptedWfh,
    wfhPromptHour,
    setWfhPromptHour,
    attendanceCatchupMode,
    setAttendanceCatchupMode,
    handleWfhStatusSelect,
    handleBatchWfhStatusSelect,
    handleWfhMarkLeave,
    checkAndTriggerAttendancePrompt
  };
}
