/**
 * Sandboxed Demo Service
 * Manages demo user state, profiles, leave plans, and individual leaves
 * entirely in sessionStorage. Zero data is persisted to Supabase.
 */

const STORAGE_KEYS = {
  USER: 'demo_user',
  PROFILE: 'demo_profile',
  LEAVES: 'demo_leaves',
  PLANS: 'demo_plans'
};

// ─── AUTHENTICATION (DEMO) ──────────────────────────────────

export const getDemoUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const signUpDemoUser = async ({ name = 'Demo User', email = 'demo@example.com', password = 'password' }) => {
  const user = {
    id: 'demo-user-' + Date.now(),
    email: email.trim(),
    user_metadata: {
      full_name: name.trim(),
      name: name.trim()
    },
    app_metadata: {
      provider: 'email'
    },
    created_at: new Date().toISOString()
  };

  try {
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (e) {}

  // Initialize fresh demo profile
  const initialProfile = {
    id: user.id,
    name: name.trim(),
    email: email.trim(),
    quota_pl: 15,
    quota_el: 10,
    quota_rh: 1,
    quota_wfh: 10,
    wfh_prompt_hour: '12',
    company_name: 'Acme Corp',
    company_logo_url: null,
    avatar_url: null,
    leave_names: { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
    leave_colors: { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' }
  };

  upsertDemoProfile(user.id, initialProfile);
  return { user, error: null };
};

export const signOutDemoUser = async () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  } catch (e) {}
};

// ─── USER PROFILE (DEMO) ────────────────────────────────────

export const fetchDemoProfile = async (userId = null) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const user = getDemoUser();
  if (user) {
    return {
      id: user.id,
      name: user.user_metadata?.full_name || 'Demo User',
      email: user.email,
      quota_pl: 15,
      quota_el: 10,
      quota_rh: 1,
      quota_wfh: 10,
      wfh_prompt_hour: '12',
      company_name: 'Acme Corp',
      company_logo_url: null,
      avatar_url: null,
      leave_names: { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
      leave_colors: { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' }
    };
  }
  return null;
};

export const upsertDemoProfile = (userId, profileData) => {
  if (typeof window === 'undefined') return null;
  try {
    const existing = fetchDemoProfile(userId) || {};
    const updated = {
      ...existing,
      ...profileData,
      id: userId || existing.id || 'demo-user',
      updated_at: new Date().toISOString()
    };
    sessionStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
};

// ─── LEAVE PLANS (DEMO) ─────────────────────────────────────

export const fetchDemoPlans = async () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.PLANS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const createDemoPlan = async (name, startDate, endDate) => {
  const plans = await fetchDemoPlans();
  const newPlan = {
    id: 'demo-plan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: name || 'Untitled Plan',
    start_date: startDate,
    end_date: endDate,
    startDate,
    endDate,
    created_at: new Date().toISOString()
  };
  plans.push(newPlan);
  sessionStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
  return newPlan;
};

export const updateDemoPlan = async (planId, updates) => {
  const plans = await fetchDemoPlans();
  const updated = plans.map(p => p.id === planId ? { ...p, ...updates } : p);
  sessionStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(updated));
  return updated.find(p => p.id === planId) || null;
};

export const deleteDemoPlan = async (planId) => {
  const plans = await fetchDemoPlans();
  const filtered = plans.filter(p => p.id !== planId);
  sessionStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(filtered));
};

// ─── INDIVIDUAL LEAVES (DEMO) ───────────────────────────────

export const fetchDemoLeaves = async () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.LEAVES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const addDemoLeave = async (dateStr, type = 'pl', note = '', planId = null, duration = 1) => {
  const leaves = await fetchDemoLeaves();
  const plans = await fetchDemoPlans();
  const plan = plans.find(p => p.id === planId);

  const filtered = leaves.filter(l => l.date !== dateStr);
  const newLeave = {
    date: dateStr,
    type,
    note: note || '',
    plan_id: planId || null,
    plan_name: plan?.name || null,
    duration: Number(duration || 1)
  };
  filtered.push(newLeave);
  sessionStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(filtered));
};

export const removeDemoLeave = async (dateStr) => {
  const leaves = await fetchDemoLeaves();
  const filtered = leaves.filter(l => l.date !== dateStr);
  sessionStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(filtered));
};

export const resetDemoLeaves = async () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEYS.LEAVES);
    sessionStorage.removeItem(STORAGE_KEYS.PLANS);
  } catch (e) {}
};

export const clearDemoSession = () => {
  if (typeof window === 'undefined') return;
  try {
    Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
    sessionStorage.removeItem('onboarding_completed');
    sessionStorage.removeItem('demo_onboarding_completed');
    sessionStorage.removeItem('pwa_session_prompted');
    sessionStorage.removeItem('leave_planner_tutorial_completed_v1');
    localStorage.removeItem('leave_planner_tutorial_completed_v1');
  } catch (e) {}
};
