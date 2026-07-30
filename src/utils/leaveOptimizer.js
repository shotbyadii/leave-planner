import { publicHolidays, isHoliday, isWeekend } from '../data/holidays';

export const isActualLeave = (type) => ['pl', 'el', 'rh'].includes(type);
export const isAttendanceLog = (type) => ['wfh', 'office'].includes(type);

export const findOptimalWindows = ({ targetLeaves, targetDuration, targetMonth = 'all', bookedDates = [], mode = 'best' }) => {
  const year = 2026;
  const maxL = targetLeaves ? parseInt(targetLeaves, 10) : 5;
  
  const allDays = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const holiday = publicHolidays.find(h => h.date === dateStr);
    const weekend = isWeekend(dateStr);
    allDays.push({
      date: new Date(d),
      dateStr,
      isFree: !!holiday || weekend,
      holidayName: holiday ? holiday.name : null,
      monthIndex: d.getMonth()
    });
  }

  const suggestions = [];
  const today = new Date();
  today.setHours(0,0,0,0);

  const searchMax = Math.max(maxL, 10);

  for (let leavesCount = 1; leavesCount <= searchMax; leavesCount++) {
    for (let i = 0; i < allDays.length; i++) {
      let leavesUsed = 0;
      let j = i;
      const leaveDates = [];

      if (allDays[i].isFree) continue;

      while (leavesUsed < leavesCount && j < allDays.length) {
        if (!allDays[j].isFree) {
          leavesUsed++;
          leaveDates.push(allDays[j].dateStr);
        }
        j++;
      }

      if (leavesUsed === leavesCount) {
        let startIdx = i;
        while (startIdx > 0 && allDays[startIdx - 1].isFree) {
          startIdx--;
        }

        let endIdx = j - 1;
        while (endIdx < allDays.length - 1 && allDays[endIdx + 1].isFree) {
          endIdx++;
        }

        const totalDaysOff = endIdx - startIdx + 1;
        const touchesMonth = allDays.slice(startIdx, endIdx + 1).some(d => d.monthIndex === parseInt(targetMonth, 10));
        
        if (targetMonth === 'all' || touchesMonth) {
          if (allDays[startIdx].date >= today) {
            const ratio = Math.round((totalDaysOff / leavesCount) * 10) / 10;
            suggestions.push({
              startIdx,
              endIdx,
              startDateStr: allDays[startIdx].dateStr,
              endDateStr: allDays[endIdx].dateStr,
              totalDaysOff,
              leavesRequired: leavesCount,
              ratio,
              leaveDates,
              startDate: allDays[startIdx].date,
              endDate: allDays[endIdx].date,
              holidayName: allDays.slice(startIdx, endIdx + 1).find(d => d.holidayName)?.holidayName
            });
          }
        }
      }
    }
  }

  const uniqueSuggestions = [];
  const seen = new Set();
  
  suggestions.forEach(s => {
    // Drop any suggestions where required leave dates overlap with booked dates
    if (s.leaveDates.some(d => bookedDates.includes(d))) return;

    const key = `${s.startDateStr}-${s.endDateStr}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSuggestions.push(s);
    } else {
      const existingIdx = uniqueSuggestions.findIndex(ex => `${ex.startDateStr}-${ex.endDateStr}` === key);
      if (existingIdx >= 0 && s.leavesRequired < uniqueSuggestions[existingIdx].leavesRequired) {
        uniqueSuggestions[existingIdx] = s;
      }
    }
  });

  let filtered = uniqueSuggestions;
  
  if (targetDuration) {
    filtered = filtered.filter(s => s.totalDaysOff >= targetDuration);
    filtered.sort((a, b) => {
      if (a.leavesRequired === b.leavesRequired) {
        return Math.abs(a.totalDaysOff - targetDuration) - Math.abs(b.totalDaysOff - targetDuration);
      }
      return a.leavesRequired - b.leavesRequired;
    });
  } else if (mode === 'best') {
    // Sort by highest days-per-leaves ratio first
    filtered = filtered.filter(s => s.leavesRequired <= maxL);
    filtered.sort((a, b) => {
      if (b.ratio !== a.ratio) {
        return b.ratio - a.ratio;
      }
      if (b.totalDaysOff !== a.totalDaysOff) {
        return b.totalDaysOff - a.totalDaysOff;
      }
      return a.startDate.getTime() - b.startDate.getTime();
    });
  } else {
    // Manual exact or capped leave mode
    filtered = filtered.filter(s => s.leavesRequired === maxL);
    if (filtered.length === 0) {
      filtered = uniqueSuggestions.filter(s => s.leavesRequired <= maxL);
    }
    filtered.sort((a, b) => {
      if (a.totalDaysOff === b.totalDaysOff) {
        return a.leavesRequired - b.leavesRequired;
      }
      return b.totalDaysOff - a.totalDaysOff;
    });
  }

  return filtered.slice(0, 15);
};

export const formatShortDate = (date) => {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

export const checkSequentialELWarning = (candidateDates, bookedDates = []) => {
  if (!candidateDates || candidateDates.length === 0) return false;
  
  const normalize = (d) => {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0];
    if (d instanceof Date && !isNaN(d)) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return String(d);
  };

  const elSet = new Set(
    (bookedDates || []).filter(b => b.type === 'el').map(b => normalize(b.date))
  );

  const normalizedCandidates = candidateDates.map(normalize).filter(Boolean);
  normalizedCandidates.forEach(d => elSet.add(d));

  for (const dateStr of normalizedCandidates) {
    let count = 0;
    let safety = 0;

    // Walk backwards
    let cur = new Date(dateStr + 'T00:00:00');
    while (safety++ < 40) {
      if (isNaN(cur.getTime())) break;
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      if (elSet.has(ds)) {
        count++;
        cur.setDate(cur.getDate() - 1);
      } else if (isWeekend(ds) || isHoliday(ds)) {
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Walk forwards
    safety = 0;
    cur = new Date(dateStr + 'T00:00:00');
    cur.setDate(cur.getDate() + 1);
    while (safety++ < 40) {
      if (isNaN(cur.getTime())) break;
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      if (elSet.has(ds)) {
        count++;
        cur.setDate(cur.getDate() + 1);
      } else if (isWeekend(ds) || isHoliday(ds)) {
        cur.setDate(cur.getDate() + 1);
      } else {
        break;
      }
    }

    if (count > 2) return true;
  }

  return false;
};
