import { supabase } from '../lib/supabase';
import {
  fetchDemoLeaves,
  addDemoLeave,
  removeDemoLeave,
  resetDemoLeaves,
  fetchDemoPlans,
  createDemoPlan,
  updateDemoPlan,
  deleteDemoPlan
} from './demoService';

// Helper to prevent crashes if user hasn't added real keys yet
const _url = import.meta.env.VITE_SUPABASE_URL || '';
const _key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isConfigured = _url !== '' && _url !== 'https://placeholder.supabase.co'
                  && _key !== '' && _key !== 'placeholder-key';

export const isDemoModeActive = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  return path.startsWith('/demo') || hash.startsWith('#/demo') || search.get('mode') === 'demo';
};

// ─── Leave Plans ───────────────────────────────────────────

export const fetchLeavePlans = async (userId = null) => {
  if (isDemoModeActive()) {
    return await fetchDemoPlans();
  }
  if (!isConfigured) return [];
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }

  let query = supabase.from('leave_plans').select('*').order('start_date', { ascending: true });
  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  } else {
    query = query.is('user_id', null);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Supabase fetch leave_plans error:', error);
    return [];
  }
  return data;
};

export const createLeavePlan = async (name, startDate, endDate, userId = null) => {
  if (isDemoModeActive()) {
    return await createDemoPlan(name, startDate, endDate);
  }
  if (!isConfigured) return null;
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }
  const payload = { name, start_date: startDate, end_date: endDate };
  if (targetUserId) payload.user_id = targetUserId;

  const { data, error } = await supabase
    .from('leave_plans')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('Supabase create leave_plan error:', error);
    return null;
  }
  return data;
};

export const updateLeavePlan = async (planId, updates, userId = null) => {
  if (isDemoModeActive()) {
    return await updateDemoPlan(planId, updates);
  }
  if (!isConfigured) return null;
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }
  let query = supabase.from('leave_plans').update(updates).eq('id', planId);
  if (targetUserId) query = query.eq('user_id', targetUserId);

  const { data, error } = await query.select().single();
  if (error) {
    console.error('Supabase update leave_plan error:', error);
    return null;
  }
  return data;
};

export const deleteLeavePlan = async (planId, userId = null) => {
  if (isDemoModeActive()) {
    return await deleteDemoPlan(planId);
  }
  if (!isConfigured) return;
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }
  let query = supabase.from('leave_plans').delete().eq('id', planId);
  if (targetUserId) query = query.eq('user_id', targetUserId);

  const { error } = await query;
  if (error) console.error('Supabase delete leave_plan error:', error);
};

// ─── Individual Leaves ─────────────────────────────────────

export const fetchBookedLeaves = async (userId = null) => {
  if (isDemoModeActive()) {
    return await fetchDemoLeaves();
  }
  if (!isConfigured) return [];
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }

  let query = supabase.from('leaves').select('*, leave_plans(name)');
  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query;
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
    duration: row.duration !== undefined ? Number(row.duration) : 1
  }));
};

export const addLeave = async (dateStr, type = 'pl', note = '', planId = null, duration = 1, userId = null) => {
  if (isDemoModeActive()) {
    return await addDemoLeave(dateStr, type, note, planId, duration);
  }
  if (!isConfigured) return;
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }
  const payload = { date: dateStr, leave_type: type, status: 'planned', duration };
  if (note) payload.note = note;
  if (planId) payload.plan_id = planId;
  if (targetUserId) payload.user_id = targetUserId;

  const onConflictConstraint = targetUserId ? 'user_id,date' : 'date';
  const { error } = await supabase.from('leaves').upsert([payload], { onConflict: onConflictConstraint });
  if (error) {
    console.error('Supabase insert error:', error);
  }
};

export const removeLeave = async (dateStr, userId = null) => {
  if (isDemoModeActive()) {
    return await removeDemoLeave(dateStr);
  }
  if (!isConfigured) return;
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }
  let query = supabase.from('leaves').delete().eq('date', dateStr);
  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  } else {
    query = query.is('user_id', null);
  }

  const { error } = await query;
  if (error) console.error('Supabase delete error:', error);
};

export const resetAllLeaves = async (userId = null) => {
  if (isDemoModeActive()) {
    return await resetDemoLeaves();
  }
  if (!isConfigured) return;
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id || null;
  }

  if (targetUserId) {
    const { error: planError } = await supabase.from('leave_plans').delete().eq('user_id', targetUserId);
    if (planError) console.error('Supabase reset user plans error:', planError);

    const { error: leaveError } = await supabase.from('leaves').delete().eq('user_id', targetUserId);
    if (leaveError) console.error('Supabase reset user leaves error:', leaveError);
  } else {
    const { error: planError } = await supabase.from('leave_plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (planError) console.error('Supabase reset plans error:', planError);

    const { error } = await supabase.from('leaves').delete().neq('date', '1900-01-01');
    if (error) console.error('Supabase reset error:', error);
  }
};
