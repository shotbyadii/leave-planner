import { supabase } from '../lib/supabase';

export const defaultPublicHolidays = [
  { id: 'def-1', date: '2026-01-01', name: 'New Year', type: 'public' },
  { id: 'def-2', date: '2026-01-14', name: 'Makara Sankranti', type: 'public' },
  { id: 'def-3', date: '2026-01-26', name: 'Republic Day', type: 'public' },
  { id: 'def-4', date: '2026-03-19', name: 'Chandramana Ugadi/Gudipadwa', type: 'public' },
  { id: 'def-5', date: '2026-05-01', name: 'May Day', type: 'public' },
  { id: 'def-6', date: '2026-05-28', name: 'Bakrid', type: 'public' },
  { id: 'def-7', date: '2026-09-14', name: 'Ganesh Chaturthi', type: 'public' },
  { id: 'def-8', date: '2026-10-02', name: 'Gandhi Jayanthi', type: 'public' },
  { id: 'def-9', date: '2026-10-19', name: 'Ayudha Pooja/Mahanavami', type: 'public' },
  { id: 'def-10', date: '2026-11-09', name: 'Deepavali/ Diwali Padwa/Vikram', type: 'public' },
  { id: 'def-11', date: '2026-12-25', name: 'Christmas', type: 'public' }
];

export const STORAGE_KEY_HOLIDAYS = 'company_public_holidays';

/**
 * Deduplicates a list of holidays strictly by date (ISO YYYY-MM-DD),
 * ensuring zero duplicate dates ever exist.
 */
export const deduplicateHolidays = (list = []) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  
  list.forEach(h => {
    if (!h || typeof h !== 'object' || !h.date) return;
    const cleanDate = String(h.date).trim();
    if (!cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    
    // If not seen or if the new one has a more descriptive name, keep it
    if (!map.has(cleanDate)) {
      map.set(cleanDate, {
        id: h.id || `hol-${cleanDate}`,
        date: cleanDate,
        name: String(h.name || 'Public Holiday').trim(),
        type: h.type || 'public'
      });
    } else {
      const existing = map.get(cleanDate);
      if (h.name && h.name.trim().length > (existing.name || '').length) {
        map.set(cleanDate, {
          ...existing,
          name: h.name.trim()
        });
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const getStoredHolidays = () => {
  if (typeof window === 'undefined') return defaultPublicHolidays;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateHolidays(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to load stored holidays:', err);
  }
  return defaultPublicHolidays;
};

/**
 * Save holidays locally and sync to Supabase `company_holidays` table.
 */
export const saveStoredHolidays = async (holidays) => {
  if (typeof window === 'undefined') return;
  const deduped = deduplicateHolidays(holidays);

  // 1. Save to local storage & dispatch event immediately for UI reactivity
  try {
    localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(deduped));
    window.dispatchEvent(new CustomEvent('company_holidays_updated', { detail: deduped }));
  } catch (err) {
    console.error('Failed to save holidays to localStorage:', err);
  }

  // 2. Sync to Supabase in background
  try {
    // Delete existing holidays and insert current full list for clean sync
    const { error: deleteError } = await supabase
      .from('company_holidays')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    if (deleteError) {
      console.warn('Supabase holiday delete warning:', deleteError);
    }

    if (deduped.length > 0) {
      const rowsToInsert = deduped.map(h => ({
        id: h.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: h.date,
        name: h.name,
        type: h.type || 'public'
      }));

      const { error: insertError } = await supabase
        .from('company_holidays')
        .upsert(rowsToInsert);

      if (insertError) {
        console.warn('Supabase holiday insert warning:', insertError);
      }
    }
  } catch (err) {
    console.error('Supabase holiday sync error:', err);
  }
};

/**
 * Load holidays from Supabase into localStorage on app startup
 */
export const loadHolidaysFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('company_holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.warn('Could not fetch company_holidays from Supabase:', error);
      return getStoredHolidays();
    }

    if (data && data.length > 0) {
      const formatted = deduplicateHolidays(data.map(h => ({
        id: h.id,
        date: h.date,
        name: h.name,
        type: h.type || 'public'
      })));

      saveStoredHolidays(formatted);
      return formatted;
    }
  } catch (err) {
    console.error('Error fetching company_holidays from Supabase:', err);
  }
  return getStoredHolidays();
};

export const publicHolidays = getStoredHolidays();

export const isHoliday = (dateString, customList = null) => {
  const list = customList || getStoredHolidays();
  return list.find(h => h.date === dateString);
};

export const isWeekend = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};
