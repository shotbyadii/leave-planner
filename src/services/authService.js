import { supabase } from '../lib/supabase';

const _url = import.meta.env.VITE_SUPABASE_URL || '';
const _key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = _url !== '' && _url !== 'https://placeholder.supabase.co'
                                  && _key !== '' && _key !== 'placeholder-key';

// ─── AUTHENTICATION ────────────────────────────────────────

export const signUpWithEmail = async (email, password, metadata = {}) => {
  if (!isSupabaseConfigured) {
    // Offline / Guest Fallback
    const mockUser = { id: 'guest-' + Date.now(), email, user_metadata: { name: metadata.name || 'User' } };
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    return { data: { user: mockUser }, error: null };
  }

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

export const signInWithEmail = async (email, password) => {
  if (!isSupabaseConfigured) {
    const mockUser = { id: 'guest-user', email, user_metadata: { name: 'User' } };
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    return { data: { user: mockUser }, error: null };
  }

  return await supabase.auth.signInWithPassword({ email, password });
};

export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured) {
    const mockUser = { id: 'google-user', email: 'google.user@gmail.com', user_metadata: { name: 'Google User' } };
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    return { data: { user: mockUser }, error: null };
  }

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
};

export const signOutUser = async () => {
  if (!isSupabaseConfigured) {
    localStorage.removeItem('auth_user');
    return { error: null };
  }

  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured) {
    const local = localStorage.getItem('auth_user');
    return local ? JSON.parse(local) : null;
  }

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
