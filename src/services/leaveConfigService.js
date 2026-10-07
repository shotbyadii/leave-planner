/**
 * Leave Configuration & Policy Rules Service
 * Central authority for the 3-Tier Leave Architecture:
 * - Tier 1: Annual Leave Bank (Paid vacation/sick - deducts from annual bank)
 * - Tier 2: Monthly Remote (Work From Home - resets monthly)
 * - Tier 3: Special Benefits (Menstrual, Mental Health, Bereavement, etc. - non-deductible)
 */

import { isHoliday, isWeekend } from '../data/holidays';

export const DEFAULT_LEAVE_CONFIGS = [
  // ─── Tier 1: Annual Leave Bank ─────────────────────────────
  {
    id: 'pl',
    name: 'Planned Leave',
    shortCode: 'PL',
    tier: 'annual',
    color: 'blue',
    quota: 15,
    cadence: 'year',
    deductsFromAnnual: true,
    enabled: true,
    isSystem: true,
    allowsHalfDay: true,
    constraints: {
      maxConsecutive: null,
      requiresNote: false,
      warningMessage: null,
    }
  },
  {
    id: 'el',
    name: 'Emergency Leave',
    shortCode: 'EL',
    tier: 'annual',
    color: 'orange',
    quota: 10,
    cadence: 'year',
    deductsFromAnnual: true,
    enabled: true,
    isSystem: true,
    allowsHalfDay: true,
    constraints: {
      maxConsecutive: 2,
      requiresNote: true,
      warningMessage: 'Medical certificate / HR documentation required for more than 2 consecutive emergency leaves.',
    }
  },
  {
    id: 'rh',
    name: 'Restricted Leave',
    shortCode: 'RH',
    tier: 'annual',
    color: 'green',
    quota: 1,
    cadence: 'year',
    deductsFromAnnual: true,
    enabled: true,
    isSystem: true,
    allowsHalfDay: false,
    constraints: {
      maxConsecutive: 1,
      requiresNote: false,
      warningMessage: 'Restricted leave can only be taken for declared optional holidays.',
    }
  },

  // ─── Tier 2: Monthly Remote (WFH) ──────────────────────────
  {
    id: 'wfh',
    name: 'Work From Home',
    shortCode: 'WFH',
    tier: 'monthly',
    color: 'cyan',
    quota: 10,
    cadence: 'month',
    deductsFromAnnual: false,
    enabled: true,
    isSystem: true,
    allowsHalfDay: false,
    constraints: {
      maxConsecutive: 3,
      requiresNote: false,
      warningMessage: 'You have logged 3 consecutive WFH days. Company policy recommends working in-office today.',
    }
  },

  // ─── Tier 3: Special & Policy Benefits (Bonus Leaves) ───────
  {
    id: 'menstrual',
    name: 'Menstrual Leave',
    shortCode: 'ML',
    tier: 'special',
    color: 'pink',
    quota: 1,
    cadence: 'month',
    deductsFromAnnual: false,
    enabled: false,
    isSystem: false,
    allowsHalfDay: true,
    constraints: {
      maxConsecutive: 1,
      requiresNote: false,
      warningMessage: 'Menstrual leave is limited to 1 day per calendar month.',
    }
  },
  {
    id: 'mental',
    name: 'Mental Health Day',
    shortCode: 'MH',
    tier: 'special',
    color: 'purple',
    quota: 2,
    cadence: 'year',
    deductsFromAnnual: false,
    enabled: false,
    isSystem: false,
    allowsHalfDay: true,
    constraints: {
      maxConsecutive: 1,
      requiresNote: false,
      warningMessage: 'Mental health days are designed for single-day rest and recuperation.',
    }
  },
  {
    id: 'bereavement',
    name: 'Bereavement Leave',
    shortCode: 'BL',
    tier: 'special',
    color: 'indigo',
    quota: 5,
    cadence: 'event',
    deductsFromAnnual: false,
    enabled: false,
    isSystem: false,
    allowsHalfDay: false,
    constraints: {
      maxConsecutive: 5,
      requiresNote: true,
      warningMessage: 'Please provide relevant details or documentation for HR records.',
    }
  },
  {
    id: 'parental',
    name: 'Parental Leave',
    shortCode: 'PLV',
    tier: 'special',
    color: 'amber',
    quota: 60,
    cadence: 'total',
    deductsFromAnnual: false,
    enabled: false,
    isSystem: false,
    allowsHalfDay: false,
    constraints: {
      maxConsecutive: null,
      requiresNote: true,
      warningMessage: 'Parental leave requires workspace manager pre-approval.',
    }
  }
];

/**
 * Derives a short 2-3 letter code from a leave name
 */
export const deriveShortCode = (name) => {
  if (!name) return 'LV';
  const clean = name.replace(/[^a-zA-Z\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase() || 'LV';
};

/**
 * Merges stored profile data with standard defaults, ensuring backward compatibility.
 */
export const buildInitialLeaveConfigs = ({
  storedConfigs = null,
  legacyQuotas = null,
  legacyNames = null,
  legacyColors = null,
} = {}) => {
  if (Array.isArray(storedConfigs) && storedConfigs.length > 0) {
    // Merge existing stored configs with any newly introduced system presets
    const existingIds = new Set(storedConfigs.map(c => c.id));
    const merged = [...storedConfigs];

    for (const def of DEFAULT_LEAVE_CONFIGS) {
      if (!existingIds.has(def.id)) {
        merged.push({ ...def, enabled: false });
      }
    }
    return merged;
  }

  // Migrate from legacy schemas (quota_pl, quota_el, quota_rh, quota_wfh, leave_names, leave_colors)
  return DEFAULT_LEAVE_CONFIGS.map(def => {
    const next = { ...def, constraints: { ...def.constraints } };
    if (legacyQuotas && legacyQuotas[def.id] !== undefined) {
      next.quota = Number(legacyQuotas[def.id]);
    }
    if (legacyNames && legacyNames[def.id]) {
      next.name = legacyNames[def.id];
      next.shortCode = deriveShortCode(legacyNames[def.id]);
    }
    if (legacyColors && legacyColors[def.id]) {
      next.color = legacyColors[def.id];
    }
    return next;
  });
};

/**
 * Checks consecutive working days across booked dates and currently applied dates,
 * properly bridging weekends and company holidays.
 */
export const countConsecutiveWorkingDays = (appliedDates = [], leaveTypeId, allBookedDates = []) => {
  if (!appliedDates || appliedDates.length === 0) return 0;

  const relevantDates = new Set(appliedDates);
  for (const b of allBookedDates) {
    if (b && b.type === leaveTypeId && b.date) {
      relevantDates.add(b.date);
    }
  }

  let maxConsecutive = 0;

  for (const dateStr of appliedDates) {
    let count = 1;

    // Walk backwards, skipping weekends & holidays
    let cur = new Date(dateStr + 'T00:00:00');
    cur.setDate(cur.getDate() - 1);
    let safety = 0;
    while (safety++ < 45) {
      if (isNaN(cur.getTime())) break;
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      if (relevantDates.has(ds)) {
        count++;
        cur.setDate(cur.getDate() - 1);
      } else if (isWeekend(ds) || isHoliday(ds)) {
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }

    // Walk forwards, skipping weekends & holidays
    cur = new Date(dateStr + 'T00:00:00');
    cur.setDate(cur.getDate() + 1);
    safety = 0;
    while (safety++ < 45) {
      if (isNaN(cur.getTime())) break;
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      if (relevantDates.has(ds)) {
        count++;
        cur.setDate(cur.getDate() + 1);
      } else if (isWeekend(ds) || isHoliday(ds)) {
        cur.setDate(cur.getDate() + 1);
      } else {
        break;
      }
    }

    if (count > maxConsecutive) {
      maxConsecutive = count;
    }
  }

  return maxConsecutive;
};

/**
 * Groups dates by calendar month string YYYY-MM
 */
export const splitDatesByMonth = (dates = []) => {
  return dates.reduce((acc, d) => {
    if (!d || typeof d !== 'string') return acc;
    const monthKey = d.substring(0, 7);
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(d);
    return acc;
  }, {});
};

/**
 * Dynamic policy constraint validator for leave bookings
 */
export const checkLeaveConstraints = (dates = [], leaveConfig, allBookedDates = [], durationPerDay = 1) => {
  if (!leaveConfig || !dates || dates.length === 0) return [];
  const warnings = [];

  // Filter actual working days (excluding holidays & weekends)
  const workingDays = dates.filter(d => !isHoliday(d) && !isWeekend(d));
  if (workingDays.length === 0) return [];

  const totalUnits = workingDays.length * (durationPerDay || 1);

  // 1. Max Consecutive Days Constraint
  const maxConsecutive = leaveConfig.constraints?.maxConsecutive;
  if (maxConsecutive && maxConsecutive > 0) {
    const consecutiveCount = countConsecutiveWorkingDays(workingDays, leaveConfig.id, allBookedDates);
    if (consecutiveCount > maxConsecutive) {
      warnings.push({
        type: 'consecutive_exceeded',
        severity: 'warning',
        title: `${leaveConfig.name} Limit Notice`,
        message: leaveConfig.constraints.warningMessage ||
          `You are applying for ${consecutiveCount} consecutive ${leaveConfig.name} days. Policy limit is ${maxConsecutive} days.`
      });
    }
  }

  // 2. Monthly Cadence Quota Check across month boundaries
  if (leaveConfig.cadence === 'month') {
    const monthsMap = splitDatesByMonth(workingDays);
    for (const [monthKey, monthDates] of Object.entries(monthsMap)) {
      const unitsInMonth = monthDates.length * (durationPerDay || 1);
      const usedInMonth = allBookedDates
        .filter(b => b.type === leaveConfig.id && typeof b.date === 'string' && b.date.startsWith(monthKey))
        .reduce((sum, b) => sum + (b.duration || 1), 0);

      const availableInMonth = Math.max(0, leaveConfig.quota - usedInMonth);
      if (unitsInMonth > availableInMonth) {
        const monthName = new Date(monthKey + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long' });
        warnings.push({
          type: 'monthly_quota_exceeded',
          severity: 'alert',
          title: 'Monthly Allowance Exceeded',
          message: `${monthName} quota exceeded for ${leaveConfig.name}: ${unitsInMonth} requested, only ${availableInMonth} remaining.`
        });
      }
    }
  }

  return warnings;
};
