import { supabase } from '../lib/supabase';

// Helper to prevent crashes if user hasn't added real keys yet
const _url = import.meta.env.VITE_SUPABASE_URL || '';
const _key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isConfigured = _url !== '' && _url !== 'https://placeholder.supabase.co'
                  && _key !== '' && _key !== 'placeholder-key';

// ─── Leave Plans ───────────────────────────────────────────

export const fetchLeavePlans = async () => {
  if (!isConfigured) return [];
  const { data, error } = await supabase.from('leave_plans').select('*').order('start_date', { ascending: true });
  if (error) {
    console.error('Supabase fetch leave_plans error:', error);
    return [];
  }
  return data;
};

export const createLeavePlan = async (name, startDate, endDate) => {
  if (!isConfigured) return null;
  const { data, error } = await supabase
    .from('leave_plans')
    .insert([{ name, start_date: startDate, end_date: endDate }])
    .select()
    .single();
  if (error) {
    console.error('Supabase create leave_plan error:', error);
    return null;
  }
  return data;
};

export const deleteLeavePlan = async (planId) => {
  if (!isConfigured) return;
  // CASCADE will delete associated leaves
  const { error } = await supabase.from('leave_plans').delete().eq('id', planId);
  if (error) console.error('Supabase delete leave_plan error:', error);
};

// ─── Individual Leaves ─────────────────────────────────────

export const fetchBookedLeaves = async () => {
  if (!isConfigured) return [];
  const { data, error } = await supabase.from('leaves').select('*, leave_plans(name)');
  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  return data.map(row => ({
    date: row.date,
    type: row.leave_type || 'pl',
    note: row.note || '',
    plan_id: row.plan_id || null,
    plan_name: row.leave_plans?.name || null,
    duration: row.duration !== undefined ? row.duration : 1
  }));
};

export const addLeave = async (dateStr, type = 'pl', note = '', planId = null, duration = 1) => {
  if (!isConfigured) return;
  const payload = { date: dateStr, leave_type: type, status: 'planned', duration };
  if (note) payload.note = note;
  if (planId) payload.plan_id = planId;
  
  const { error } = await supabase.from('leaves').upsert([payload], { onConflict: 'date' });
  if (error) {
    console.error('Supabase insert error:', error);
  }
};

export const removeLeave = async (dateStr) => {
  if (!isConfigured) return;
  const { error } = await supabase.from('leaves').delete().eq('date', dateStr);
  if (error) console.error('Supabase delete error:', error);
};

export const resetAllLeaves = async () => {
  if (!isConfigured) return;
  // Delete all plans (cascade deletes leaves too)
  const { error: planError } = await supabase.from('leave_plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (planError) console.error('Supabase reset plans error:', planError);
  // Also delete any orphan leaves
  const { error } = await supabase.from('leaves').delete().neq('date', '1900-01-01');
  if (error) console.error('Supabase reset error:', error);
};
