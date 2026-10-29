import { isWeekend, isHoliday } from '../data/holidays.js';

/**
 * Scans the current month up to today (or devDateOverride) for working days that have no recorded attendance or leave.
 * Accepts either an options object or positional arguments for backwards compatibility.
 *
 * @param {Object|Array} optionsOrBookedDates - Options object or bookedDates array
 * @param {Date|string} [optionsOrBookedDates.todayDate] - Current Date object or today date string YYYY-MM-DD
 * @param {Array} [optionsOrBookedDates.bookedDates] - List of booked leaves [{ date, type, duration, ... }]
 * @param {Array} [optionsOrBookedDates.holidays] - Custom holidays list if any (falls back to isHoliday helper)
 * @param {string|number} [optionsOrBookedDates.promptHour] - Configured check-in prompt hour ('12')
 * @param {string} [optionsOrBookedDates.devDateOverride] - Dev suite date string override
 * @param {string} [optionsOrBookedDates.mode] - 'multi_day' (catch-up across month) | 'current_day' (today only)
 * @returns {Array<string>} List of missing date strings in chronological order ['YYYY-MM-DD', ...]
 */
export const getMissingAttendanceDays = (
  optionsOrBookedDates = {},
  maybeTodayDate,
  maybePromptHourOrLookback,
  maybeDevDateOverride,
  maybeMode
) => {
  let todayDate, bookedDates, holidays, promptHour, devDateOverride, mode;

  if (Array.isArray(optionsOrBookedDates)) {
    // Positional call compatibility: (bookedDates, todayDate, promptHourOrLookback, devDateOverride, mode)
    bookedDates = optionsOrBookedDates;
    todayDate = maybeTodayDate;
    promptHour = (typeof maybePromptHourOrLookback === 'string' || typeof maybePromptHourOrLookback === 'number') && String(maybePromptHourOrLookback).length <= 2
      ? String(maybePromptHourOrLookback)
      : '12';
    devDateOverride = maybeDevDateOverride || '';
    mode = maybeMode || 'multi_day';
    holidays = [];
  } else {
    // Standard options object call
    ({
      todayDate,
      bookedDates = [],
      holidays = [],
      promptHour = '12',
      devDateOverride = '',
      mode = 'multi_day'
    } = optionsOrBookedDates || {});
  }

  let todayObj;
  if (typeof todayDate === 'string' && todayDate.includes('-')) {
    const [y, m, d] = todayDate.split('-').map(Number);
    todayObj = new Date(y, m - 1, d);
  } else if (todayDate instanceof Date && !isNaN(todayDate.getTime())) {
    todayObj = new Date(todayDate);
  } else {
    todayObj = new Date();
  }

  const todayYear = todayObj.getFullYear();
  const todayMonth = todayObj.getMonth(); // 0-indexed
  const todayDay = todayObj.getDate();

  const bookedMap = new Set();
  (bookedDates || []).forEach(b => {
    if (typeof b === 'string') {
      bookedMap.add(b.slice(0, 10));
    } else if (b && typeof b.date === 'string') {
      bookedMap.add(b.date.slice(0, 10));
    }
  });

  const promptHourNum = parseInt(promptHour || '12', 10);
  const now = new Date();
  // If running with a devDateOverride, we simulate being past prompt hour, else check current hour
  const isPastPromptHour = devDateOverride ? true : now.getHours() >= promptHourNum;
  const holidayList = holidays && holidays.length > 0 ? holidays : null;

  // Single-day mode: check today only
  if (mode === 'current_day') {
    const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
    const isWorkday = !isWeekend(todayStr) && !isHoliday(todayStr, holidayList);
    if (isWorkday && isPastPromptHour && !bookedMap.has(todayStr)) {
      return [todayStr];
    }
    return [];
  }

  // Multi-day mode: scan from 1st of current month up to today
  const missingDays = [];
  for (let day = 1; day <= todayDay; day++) {
    const dateStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWorkday = !isWeekend(dateStr) && !isHoliday(dateStr, holidayList);
    if (!isWorkday) continue;

    // If day is today, only count as missing if we're past the prompt hour
    if (day === todayDay) {
      if (isPastPromptHour && !bookedMap.has(dateStr)) {
        missingDays.push(dateStr);
      }
    } else {
      // Past days in the current month: if not in bookedMap, it is missing attendance
      if (!bookedMap.has(dateStr)) {
        missingDays.push(dateStr);
      }
    }
  }

  return missingDays;
};

/**
 * Format a date string (YYYY-MM-DD) into user-friendly strings.
 */
export const formatCatchupDate = (dateStr) => {
  if (!dateStr || !dateStr.includes('-')) {
    return { weekday: '', formatted: dateStr, dayNum: '' };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return {
    weekday: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
    formatted: dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    shortDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    dayNum: d
  };
};
