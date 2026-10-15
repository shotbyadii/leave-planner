import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  getCurrentUser, 
  fetchUserProfile, 
  upsertUserProfile, 
  deleteUserAccount, 
  signOutUser 
} from '../services/authService';
import { 
  enableDemoMode, 
  clearDemoSession, 
  fetchDemoProfile, 
  signOutDemoUser,
  getDemoUser,
  signUpDemoUser
} from '../services/demoService';
import { isDemoModeActive } from '../services/leaveService';
import { resetTutorialStatus, isTutorialCompleted } from '../services/tutorialService';

export function useAuthUser({
  onSyncProfile,
  onLeavesReset,
  loadLeaves,
  setOnboardingOpen
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  
  // Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState(() => isDemoModeActive());
  const [isDemoRestartModalOpen, setIsDemoRestartModalOpen] = useState(false);

  // Profile data
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || 'User');
  const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(localStorage.getItem('company_logo_url') || '');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatar_url') || '');

  const isInitialAuthDone = useRef(false);

  const syncProfileToState = (profile, user) => {
    if (!profile) return;
    const fallbackName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const activeName = profile.name || fallbackName;
    setUserName(activeName);
    localStorage.setItem('user_name', activeName);

    if (profile.company_name) {
      setCompanyName(profile.company_name);
      localStorage.setItem('company_name', profile.company_name);
    }
    if (profile.company_logo_url) {
      setCompanyLogoUrl(profile.company_logo_url);
      localStorage.setItem('company_logo_url', profile.company_logo_url);
    }
    if (profile.avatar_url) {
      setAvatarUrl(profile.avatar_url);
      localStorage.setItem('avatar_url', profile.avatar_url);
    }

    if (onSyncProfile) {
      onSyncProfile(profile, user);
    }
  };

  const checkInitialAuth = async () => {
    const splashStartTime = Date.now();
    const waitRemaining = async (minMs = 600) => {
      const elapsed = Date.now() - splashStartTime;
      const remaining = minMs - elapsed;
      if (remaining > 0) {
        await new Promise(r => setTimeout(r, remaining));
      }
    };

    try {
      if (isDemoMode) {
        try {
          const demoUser = getDemoUser();
          const demoOnboardingDone = sessionStorage.getItem('demo_onboarding_completed') === 'true';
          if (demoUser && demoOnboardingDone) {
            setCurrentUser(demoUser);
            const demoProfile = await fetchDemoProfile(demoUser.id);
            if (demoProfile) {
              syncProfileToState(demoProfile, demoUser);
            }
            if (loadLeaves) await loadLeaves(demoUser);
            await waitRemaining(300);
            isInitialAuthDone.current = true;
            setIsAuthChecking(false);
            setShowSplash(false);
          } else {
            await waitRemaining(300);
            isInitialAuthDone.current = true;
            setIsAuthChecking(false);
            setShowSplash(true);
            setAuthModalOpen(false);
          }
        } catch (err) {
          console.warn('Demo auth check error:', err);
          isInitialAuthDone.current = true;
          setIsAuthChecking(false);
          setShowSplash(true);
        }
        return;
      }

      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const profilePromise = fetchUserProfile(user.id);
        const leavesPromise = loadLeaves ? loadLeaves(user) : Promise.resolve();
        const [profile] = await Promise.all([profilePromise, leavesPromise, waitRemaining(1000)]);

        if (profile) {
          syncProfileToState(profile, user);
        } else {
          const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
          setUserName(fallbackName);
          localStorage.setItem('user_name', fallbackName);
        }

        isInitialAuthDone.current = true;
        setIsAuthChecking(false);
        setShowSplash(false);
      } else {
        await waitRemaining(600);
        isInitialAuthDone.current = true;
        setIsAuthChecking(false);
        setShowSplash(true);
      }
    } catch (err) {
      console.warn('Auth check encounter:', err);
      await waitRemaining(600);
      isInitialAuthDone.current = true;
      setIsAuthChecking(false);
      setShowSplash(true);
    }
  };

  useEffect(() => {
    checkInitialAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isDemoMode) return;
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user);
        setIsAuthChecking(false);
        if (isInitialAuthDone.current) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            syncProfileToState(profile, session.user);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthChecking(false);
        if (onLeavesReset) onLeavesReset();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthChecking(false);

    if (user) {
      const nameToUse = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || userName;
      setUserName(nameToUse);
      localStorage.setItem('user_name', nameToUse);

      if (isDemoMode) {
        const demoProfile = await fetchDemoProfile(user.id);
        if (demoProfile) syncProfileToState(demoProfile, user);
        const demoDone = sessionStorage.getItem('demo_onboarding_completed') === 'true' || isTutorialCompleted();
        if (!demoDone && setOnboardingOpen) {
          setOnboardingOpen(true);
        }
        if (loadLeaves) await loadLeaves(user);
        setShowSplash(false);
        return;
      }

      const profilePromise = fetchUserProfile(user.id);
      const leavesPromise = loadLeaves ? loadLeaves(user) : Promise.resolve();
      const [profile] = await Promise.all([profilePromise, leavesPromise]);

      if (!profile) {
        const newProfile = await upsertUserProfile(user.id, {
          name: nameToUse,
          email: user.email,
          companyName: companyName,
          companyLogoUrl: companyLogoUrl,
          avatarUrl: avatarUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          quotas: { pl: 15, el: 10, rh: 1, wfh: 10 },
          names: { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' },
          colors: { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
          wfhPromptHour: '12'
        });
        if (newProfile) syncProfileToState(newProfile, user);
        if (setOnboardingOpen) setOnboardingOpen(true);
      } else {
        syncProfileToState(profile, user);
        localStorage.setItem('onboarding_completed', 'true');
      }

      setShowSplash(false);
    } else {
      setShowSplash(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (isDemoMode) {
      clearDemoSession();
      setCurrentUser(null);
      if (onLeavesReset) onLeavesReset();
      setShowSplash(true);
      setAuthModalOpen(false);
      return;
    }

    if (currentUser?.id) {
      await deleteUserAccount(currentUser.id);
    }
    setCurrentUser(null);
    setIsAuthChecking(false);
    setShowSplash(true);
  };

  const handleSignOut = async () => {
    try {
      if (isDemoMode) {
        await signOutDemoUser();
      } else {
        await signOutUser();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setCurrentUser(null);
      setAuthModalOpen(false);
      setIsAuthChecking(false);
      setUserName('User');
      setCompanyName('');
      setCompanyLogoUrl('');
      setAvatarUrl('');
      localStorage.removeItem('user_name');
      localStorage.removeItem('company_name');
      localStorage.removeItem('avatar_url');
      localStorage.removeItem('company_logo_url');
      localStorage.removeItem('remember_me');
      setShowSplash(true);
      if (onLeavesReset) onLeavesReset();
      if (loadLeaves) await loadLeaves(null);
    }
  };

  const handleRestartDemo = async () => {
    clearDemoSession();
    enableDemoMode();
    setIsDemoMode(true);
    resetTutorialStatus();
    sessionStorage.removeItem('demo_onboarding_completed');
    localStorage.removeItem('onboarding_completed');
    setCurrentUser(null);
    setUserName('Demo User');
    setCompanyName('Acme Corp');
    setAuthModalOpen(false);
    if (setOnboardingOpen) setOnboardingOpen(false);
    setShowSplash(true);
    if (onLeavesReset) onLeavesReset();
    if (loadLeaves) await loadLeaves(null);
  };

  const handleExitDemo = () => {
    clearDemoSession();
    setIsDemoMode(false);
    setCurrentUser(null);
    if (onLeavesReset) onLeavesReset();
    window.location.href = window.location.origin + window.location.pathname;
  };

  const handleEnterDemoMode = async () => {
    enableDemoMode();
    setIsDemoMode(true);
    setCurrentUser(null);
    setUserName('Demo User');
    setCompanyName('Acme Corp');
    setAuthModalOpen(false);
    setShowSplash(false);
    if (loadLeaves) await loadLeaves(null);
  };

  return {
    currentUser,
    setCurrentUser,
    isAuthChecking,
    authModalOpen,
    setAuthModalOpen,
    profileModalOpen,
    setProfileModalOpen,
    resetPasswordModalOpen,
    setResetPasswordModalOpen,
    showSplash,
    setShowSplash,
    isDemoMode,
    setIsDemoMode,
    isDemoRestartModalOpen,
    setIsDemoRestartModalOpen,
    userName,
    setUserName,
    companyName,
    setCompanyName,
    companyLogoUrl,
    setCompanyLogoUrl,
    avatarUrl,
    setAvatarUrl,
    handleAuthSuccess,
    handleDeleteAccount,
    handleSignOut,
    handleRestartDemo,
    handleExitDemo,
    handleEnterDemoMode,
    syncProfileToState
  };
}
