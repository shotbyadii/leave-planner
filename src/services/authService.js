import { supabase } from '../lib/supabase';

const _url = import.meta.env.VITE_SUPABASE_URL || '';
const _key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = _url !== '' && _url !== 'https://placeholder.supabase.co'
                                  && _key !== '' && _key !== 'placeholder-key';

// ─── AUTHENTICATION ────────────────────────────────────────

export const signUpWithEmail = async (email, password, metadata = {}, rememberMe = true) => {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase credentials not configured in .env file.') };
  }

  localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata.name || 'User'
      }
    }
  });

  if (error) return { data: null, error };

  if (data.user) {
    await upsertUserProfile(data.user.id, {
      name: metadata.name || 'User',
      email,
      quotas: metadata.quotas,
      names: metadata.names,
      colors: metadata.colors
    });
  }

  return { data, error: null };
};

export const signInWithEmail = async (email, password, rememberMe = true) => {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase credentials not configured in .env file.') };
  }

  localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase credentials not configured in .env file.') };
  }

  localStorage.setItem('remember_me', 'true');
  const redirectTo = window.location.origin;
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
};

export const signOutUser = async () => {
  localStorage.removeItem('remember_me');
  if (!isSupabaseConfigured) return { error: null };
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured) return null;

  const { data } = await supabase.auth.getUser();
  return data?.user || null;
};

// ─── USER PROFILE DATA SYNC ────────────────────────────────

export const upsertUserProfile = async (userId, profileData) => {
  if (!isSupabaseConfigured || !userId) return null;

  const payload = {
    id: userId,
    name: profileData.name,
    email: profileData.email,
    quota_pl: profileData.quotas?.pl,
    quota_el: profileData.quotas?.el,
    quota_rh: profileData.quotas?.rh,
    quota_wfh: profileData.quotas?.wfh,
    leave_names: profileData.names,
    leave_colors: profileData.colors,
    avatar_url: profileData.avatarUrl || profileData.avatar_url || null,
    company_name: profileData.companyName || profileData.company_name || null,
    company_logo_url: profileData.companyLogoUrl || profileData.company_logo_url || null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select()
    .single();

  if (error) console.error('Supabase profiles upsert error:', error);
  return data;
};

export const fetchUserProfile = async (userId) => {
  if (!isSupabaseConfigured || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) console.error('Supabase profile fetch error:', error);
  return data;
};

export const deleteUserAccount = async (userId) => {
  if (!isSupabaseConfigured || !userId) {
    localStorage.clear();
    return { error: null };
  }

  // Delete user's profile and data from DB
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileError) console.error('Error deleting profile:', profileError);

  const { error: leavesError } = await supabase.from('leaves').delete().eq('user_id', userId);
  if (leavesError) console.error('Error deleting user leaves:', leavesError);

  const { error: plansError } = await supabase.from('leave_plans').delete().eq('user_id', userId);
  if (plansError) console.error('Error deleting user plans:', plansError);

  await signOutUser();
  localStorage.clear();
  return { error: null };
};
