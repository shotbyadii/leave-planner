import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, MapPin, ListTodo, RotateCw, Menu, X, Sparkles, Moon, Sun, Monitor, Check, AlertTriangle, Settings, User, ArrowLeft, ChevronLeft, Camera, Building2, SlidersHorizontal, ChevronRight, LogOut, ShieldCheck, Download, Upload, Save, CheckCircle2, FlaskConical, FileText, Table, Play, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicHolidays, isHoliday, isWeekend, getStoredHolidays, loadHolidaysFromSupabase } from './data/holidays';
import { checkSequentialELWarning } from './utils/leaveOptimizer';
import { fetchBookedLeaves, fetchLeavePlans, resetAllLeaves, removeLeave, deleteLeavePlan, updateLeavePlan, addLeave, createLeavePlan } from './services/leaveService';
import Calendar from './components/Calendar';
import { ExistingLeaveDetailContent } from './components/ExistingLeaveModal';
import OptimizerPanel from './components/OptimizerPanel';
import LeaveTracker from './components/LeaveTracker';
import { TimePicker } from './components/TimePicker';
import LeaveSelectionBar from './components/LeaveSelectionBar';
import WfhCheckinModal from './components/WfhCheckinModal';
import NotificationPromptModal from './components/NotificationPromptModal';
import BackupModal from './components/BackupModal';
import OnboardingModal from './components/OnboardingModal';
import SettingsModal from './components/SettingsModal';
import HolidayManager from './components/HolidayManager';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import SplashScreen from './components/SplashScreen';
import AppSkeleton from './components/AppSkeleton';
import CompanyInput from './components/CompanyInput';
import ThemeSelector from './components/ThemeSelector';
import DevToolsModal from './components/DevToolsModal';
import AppleWheelPicker from './components/AppleWheelPicker';
import { getLeaveColor, getShortform, COLOR_PALETTE } from './utils/colorUtils';
import { getCurrentUser, getCurrentSession, signOutUser, fetchUserProfile, upsertUserProfile, deleteUserAccount } from './services/authService';
import { supabase } from './lib/supabase';
import { exportUserDataToJson, exportUserDataToCsv, importUserDataFromJson } from './utils/dataMigration';
import { getCompanyLogoUrl, getCompanyInitials } from './utils/companyLogoUtils';
import TutorialOverlay from './components/TutorialOverlay';
import { isTutorialCompleted, markTutorialCompleted, resetTutorialStatus } from './services/tutorialService';
import './index.css';

function App() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const isInitialAuthDone = useRef(false);
  const [showSplash, setShowSplash] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [wfhModalOpen, setWfhModalOpen] = useState(false);
  const [hasPromptedWfh, setHasPromptedWfh] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || 'User');
  const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(localStorage.getItem('company_logo_url') || '');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatar_url') || '');
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialCustomName, setTutorialCustomName] = useState('Sep Getaway (Walkthrough Demo)');
  
  const [leaveNames, setLeaveNames] = useState(() => {
    try {
      const saved = localStorage.getItem('leave_names');
      return saved ? JSON.parse(saved) : { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' };
    } catch (e) {
      return { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' };
    }
  });

  const [leaveColors, setLeaveColors] = useState(() => {
    try {
      const saved = localStorage.getItem('leave_colors');
      return saved ? JSON.parse(saved) : { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' };
    } catch (e) {
      return { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' };
    }
  });

  const [leaves, setLeaves] = useState({
    pl: { total: parseInt(localStorage.getItem('quota_pl') || '15', 10), used: 0, label: leaveNames.pl || 'Planned Leave', color: leaveColors.pl || 'blue', bg: getLeaveColor(leaveColors.pl).bg, badge: getLeaveColor(leaveColors.pl).badge },
    el: { total: parseInt(localStorage.getItem('quota_el') || '10', 10), used: 0, label: leaveNames.el || 'Emergency Leave', color: leaveColors.el || 'orange', bg: getLeaveColor(leaveColors.el).bg, badge: getLeaveColor(leaveColors.el).badge },
    rh: { total: parseInt(localStorage.getItem('quota_rh') || '1', 10), used: 0, label: leaveNames.rh || 'Extra Leave', color: leaveColors.rh || 'green', bg: getLeaveColor(leaveColors.rh).bg, badge: getLeaveColor(leaveColors.rh).badge }
  });
  const mainScrollContainerRef = useRef(null);
  const [bookedDates, setBookedDates] = useState([]);
  const [leavePlans, setLeavePlans] = useState([]);
  const [previewDates, setPreviewDates] = useState([]);

  // Reactive Custom Company Public Holidays State
  const [currentHolidays, setCurrentHolidays] = useState(() => getStoredHolidays());

  useEffect(() => {
    // Initial sync from Supabase cloud database
    loadHolidaysFromSupabase();

    const handleHolidaysUpdated = (e) => {
      if (e.detail) setCurrentHolidays(e.detail);
      else setCurrentHolidays(getStoredHolidays());
    };
    window.addEventListener('company_holidays_updated', handleHolidaysUpdated);
    return () => window.removeEventListener('company_holidays_updated', handleHolidaysUpdated);
  }, []);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);
  const [calendarViewMode, setCalendarViewMode] = useState(window.innerWidth < 768 ? 'monthly' : 'yearly');
  const [calendarFocusedMonth, setCalendarFocusedMonth] = useState(new Date().getMonth());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSubView, setMobileSubView] = useState(null); // null | 'profile' | 'settings'
  const [mobileSettingsTab, setMobileSettingsTab] = useState('quotas'); // 'quotas' | 'backup'
  const [mobileFormName, setMobileFormName] = useState('');
  const [mobileFormCompany, setMobileFormCompany] = useState('');
  const [mobileFormAvatar, setMobileFormAvatar] = useState('');
  const [companyLogoError, setCompanyLogoError] = useState(false);
  const [mobileFormQuotas, setMobileFormQuotas] = useState({ pl: 15, el: 10, rh: 1, wfh: 10 });
  const [mobileFormNames, setMobileFormNames] = useState({});
  const [mobileFormColors, setMobileFormColors] = useState({});
  const [mobileToast, setMobileToast] = useState('');
  const [isExportingMobile, setIsExportingMobile] = useState(false);
  const [isExportingCsvMobile, setIsExportingCsvMobile] = useState(false);
  const [isImportingMobile, setIsImportingMobile] = useState(false);
  const [mobileHolidaysStagingState, setMobileHolidaysStagingState] = useState({
    isStaging: false,
    stagedCount: 0,
    confirmStaging: null,
    discardStaging: null
  });
  const mobileAvatarFileRef = useRef(null);

  const handleMobileAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setMobileFormAvatar(uploadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  };
  const [selectionStart, setSelectionStart] = useState(null);
  const [mobileConfirmOpen, setMobileConfirmOpen] = useState(false);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  // Mobile confirmation form state
  const [mobileLeaveType, setMobileLeaveType] = useState('pl');
  const [mobilePlanName, setMobilePlanName] = useState('');
  const [mobileNote, setMobileNote] = useState('');
  const [mobileFromHour, setMobileFromHour] = useState(9);
  const [mobileToHour, setMobileToHour] = useState(18);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [calendarStyle, setCalendarStyle] = useState(localStorage.getItem('calendar_cell_style') || 'capsule');
  const [focusedCellHeight, setFocusedCellHeight] = useState(Number(localStorage.getItem('dev_focused_cell_height') || 56));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;

    const applyTheme = (isDark, isSystem = false) => {
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
      if (isSystem) {
        root.classList.add('theme-system');
      } else {
        root.classList.remove('theme-system');
      }

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#000000' : '#ffffff');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches, true);
      const handleChange = (e) => applyTheme(e.matches, true);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      applyTheme(theme === 'dark', false);
    }
  }, [theme]);
  const [isLeavesLoaded, setIsLeavesLoaded] = useState(false);
  const [devDateStr, setDevDateStr] = useState(import.meta.env.DEV ? (localStorage.getItem('dev_date_override') || '') : '');

  const getTodayDate = () => {
    if (import.meta.env.DEV && devDateStr) {
      const parts = devDateStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    return new Date();
  };

  const getTodayStr = () => {
    if (import.meta.env.DEV && devDateStr) return devDateStr;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    loadLeaves();
    checkAuthUser();

    // Listen to Supabase auth state changes (e.g. Google OAuth redirect return)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Do not allow initial auth state changes to disrupt initial skeleton window
      if (!isInitialAuthDone.current) return;
      if (session?.user) {
        handleAuthSuccess(session.user);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setMobileSubView(null);
    } else {
      setMobileFormName(userName || '');
      setMobileFormCompany(companyName || '');
      setMobileFormQuotas({
        pl: leaves.pl?.total || 15,
        el: leaves.el?.total || 10,
        rh: leaves.rh?.total || 1,
        wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
      });
      setMobileFormNames({ ...leaveNames });
      setMobileFormColors({ ...leaveColors });
    }
  }, [isMobileMenuOpen, mobileSubView]);

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
    if (profile.leave_names) {
      setLeaveNames(profile.leave_names);
      localStorage.setItem('leave_names', JSON.stringify(profile.leave_names));
    }
    if (profile.leave_colors) {
      setLeaveColors(profile.leave_colors);
      localStorage.setItem('leave_colors', JSON.stringify(profile.leave_colors));
    }
    if (profile.wfh_prompt_hour) {
      setWfhPromptHour(String(profile.wfh_prompt_hour));
      localStorage.setItem('wfh_prompt_hour', String(profile.wfh_prompt_hour));
    }

    const plQuota = profile.quota_pl !== undefined && profile.quota_pl !== null ? Number(profile.quota_pl) : (profile.quotas?.pl || 15);
    const elQuota = profile.quota_el !== undefined && profile.quota_el !== null ? Number(profile.quota_el) : (profile.quotas?.el || 10);
    const rhQuota = profile.quota_rh !== undefined && profile.quota_rh !== null ? Number(profile.quota_rh) : (profile.quotas?.rh || 1);
    const wfhQuota = profile.quota_wfh !== undefined && profile.quota_wfh !== null ? Number(profile.quota_wfh) : (profile.quotas?.wfh || 10);

    localStorage.setItem('quota_pl', plQuota);
    localStorage.setItem('quota_el', elQuota);
    localStorage.setItem('quota_rh', rhQuota);
    localStorage.setItem('quota_wfh', wfhQuota);

    const namesToUse = profile.leave_names || leaveNames;
    const colorsToUse = profile.leave_colors || leaveColors;

    setLeaves(prev => ({
      pl: { 
        ...prev.pl, 
        total: plQuota, 
        label: namesToUse.pl || prev.pl.label, 
        color: colorsToUse.pl || prev.pl.color,
        bg: getLeaveColor(colorsToUse.pl || prev.pl.color).bg,
        badge: getLeaveColor(colorsToUse.pl || prev.pl.color).badge
      },
      el: { 
        ...prev.el, 
        total: elQuota, 
        label: namesToUse.el || prev.el.label, 
        color: colorsToUse.el || prev.el.color,
        bg: getLeaveColor(colorsToUse.el || prev.el.color).bg,
        badge: getLeaveColor(colorsToUse.el || prev.el.color).badge
      },
      rh: { 
        ...prev.rh, 
        total: rhQuota, 
        label: namesToUse.rh || prev.rh.label, 
        color: colorsToUse.rh || prev.rh.color,
        bg: getLeaveColor(colorsToUse.rh || prev.rh.color).bg,
        badge: getLeaveColor(colorsToUse.rh || prev.rh.color).badge
      }
    }));
  };

  const checkAuthUser = async () => {
    const startTime = Date.now();
    const waitRemaining = async (minMs = 1000) => {
      const elapsed = Date.now() - startTime;
      if (elapsed < minMs) {
        await new Promise(res => setTimeout(res, minMs - elapsed));
      }
    };

    try {
      // 1. Instant check for cached session from local storage
      const session = await getCurrentSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const profilePromise = fetchUserProfile(session.user.id);
        const leavesPromise = loadLeaves(session.user);
        
        // Wait for profile & leaves data while ensuring a crisp 1-second skeleton animation window
        const [profile] = await Promise.all([profilePromise, leavesPromise, waitRemaining(1000)]);

        if (profile) {
          syncProfileToState(profile, session.user);
        } else {
          const fallbackName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
          setUserName(fallbackName);
          localStorage.setItem('user_name', fallbackName);
        }

        isInitialAuthDone.current = true;
        setIsAuthChecking(false);
        setShowSplash(false);
        return;
      }

      // 2. Server validation fallback
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const profilePromise = fetchUserProfile(user.id);
        const leavesPromise = loadLeaves(user);
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

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthChecking(false);
    setShowSplash(false);

    if (user) {
      const nameToUse = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || userName;
      const profile = await fetchUserProfile(user.id);
      if (!profile) {
        // Fresh brand-new account: create default clean profile in Supabase
        const newProfile = await upsertUserProfile(user.id, {
          name: nameToUse,
          email: user.email,
          companyName: companyName,
          companyLogoUrl: companyLogoUrl,
          avatarUrl: avatarUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          quotas: { pl: 15, el: 10, rh: 1, wfh: 10 },
          names: { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' },
          colors: { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
          wfhPromptHour: wfhPromptHour || '12'
        });
        if (newProfile) syncProfileToState(newProfile, user);
        // Show onboarding once for brand new account creation
        setOnboardingOpen(true);
      } else {
        syncProfileToState(profile, user);
        localStorage.setItem('onboarding_completed', 'true');
      }
      await loadLeaves(user);
    }
  };

  const handleDeleteAccount = async () => {
    if (currentUser?.id) {
      await deleteUserAccount(currentUser.id);
    }
    setCurrentUser(null);
    setIsAuthChecking(false);
    setShowSplash(true);
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setIsAuthChecking(false);
    setShowSplash(true);
  };

  // Persistent Notification Permission Prompt (Until "Not Needed" is clicked)
  useEffect(() => {
    if (!isLeavesLoaded) return;
    const isDismissed = localStorage.getItem('notif_prompt_dismissed') === 'true';
    if (typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification)) {
      try {
        if (Notification.permission !== 'granted' && !isDismissed) {
          setNotifModalOpen(true);
        }
      } catch (e) {
        console.warn('Notification permission read failed:', e);
      }
    }
  }, [isLeavesLoaded]);

  const handleEnableNotif = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification)) {
      try {
        let perm;
        if (typeof Notification.requestPermission === 'function') {
          perm = await Notification.requestPermission();
        }
        if (perm === 'granted') {
          setNotifModalOpen(false);
          try {
            new Notification('Attendance Reminders Enabled', {
              body: 'You will receive daily 12 PM check-in reminders on working days.',
              icon: '/favicon.ico'
            });
          } catch (e) {
            console.warn('Notification constructor error:', e);
          }
        } else {
          setNotifModalOpen(false);
        }
      } catch (err) {
        console.warn('Notification permission request error:', err);
        setNotifModalOpen(false);
      }
    } else {
      setNotifModalOpen(false);
    }
  };

  const [wfhPromptHour, setWfhPromptHour] = useState(localStorage.getItem('wfh_prompt_hour') || '12');

  // Daily Working Day Attendance Check-in Prompt
  useEffect(() => {
    if (!isLeavesLoaded) return;
    const todayStr = getTodayStr();
    
    const isWorkday = !isWeekend(todayStr) && !isHoliday(todayStr);
    const hasStatusRecorded = bookedDates.some(b => b.date === todayStr);
    const now = getTodayDate();
    const promptHourNum = parseInt(wfhPromptHour || '12', 10);
    const isAfterPromptHour = devDateStr ? true : now.getHours() >= promptHourNum;

    if (isWorkday && !hasStatusRecorded && isAfterPromptHour && !hasPromptedWfh) {
      setWfhModalOpen(true);
      setHasPromptedWfh(true);

      if (typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification)) {
        try {
          if (Notification.permission === 'granted') {
            const period = promptHourNum >= 12 ? 'PM' : 'AM';
            const displayH = promptHourNum > 12 ? promptHourNum - 12 : (promptHourNum === 0 ? 12 : promptHourNum);
            new Notification('Daily Attendance Check-in', {
              body: `It is past ${displayH} ${period}. Please confirm if ${todayStr} is WFH or In-Office.`,
              icon: '/favicon.ico'
            });
          }
        } catch (e) {
          console.warn('Mobile notification toast error:', e);
        }
      }
    }
  }, [isLeavesLoaded, bookedDates, hasPromptedWfh, devDateStr, wfhPromptHour]);

  const handleWfhStatusSelect = async (statusType) => {
    const todayStr = getTodayStr();
    await addLeave(todayStr, statusType, statusType === 'wfh' ? 'Work From Home' : 'In-Office', null, 1, currentUser?.id);
    await loadLeaves();
    setWfhModalOpen(false);
  };

  const handleWfhMarkLeave = () => {
    const todayStr = getTodayStr();
    setWfhModalOpen(false);
    setActiveTab('calendar');
    setSelectionStart(todayStr);
    setPreviewDates([todayStr]);
    setMobileConfirmOpen(true);
  };



  const loadLeaves = async (targetUser = undefined) => {
    const activeUser = targetUser !== undefined ? targetUser : currentUser;
    const userId = activeUser?.id || null;
    const dbLeaves = await fetchBookedLeaves(userId);
    const dbPlans = await fetchLeavePlans(userId);
    setBookedDates(dbLeaves);
    setLeavePlans(dbPlans);
    updateLeaveCounts(dbLeaves);
    setIsLeavesLoaded(true);
  };

  const updateLeaveCounts = (datesArray) => {
    const plUsed = datesArray.filter(d => d.type === 'pl').reduce((sum, d) => sum + (d.duration || 1), 0);
    const elUsed = datesArray.filter(d => d.type === 'el').reduce((sum, d) => sum + (d.duration || 1), 0);
    const rhUsed = datesArray.filter(d => d.type === 'rh').reduce((sum, d) => sum + (d.duration || 1), 0);

    setLeaves(prev => ({
      ...prev,
      pl: { ...prev.pl, used: plUsed },
      el: { ...prev.el, used: elUsed },
      rh: { ...prev.rh, used: rhUsed }
    }));
  };

  const handleSaveSettings = async ({ name, companyName, companyLogoUrl, avatarUrl, quotas, names, colors, wfhPromptHour: newPromptHour }) => {
    if (name) {
      setUserName(name);
      localStorage.setItem('user_name', name);
    }
    if (companyName !== undefined) {
      setCompanyName(companyName);
      localStorage.setItem('company_name', companyName);
      const computedLogo = companyLogoUrl !== undefined ? companyLogoUrl : getCompanyLogoUrl(companyName);
      const finalLogo = computedLogo || '';
      setCompanyLogoUrl(finalLogo);
      if (finalLogo) localStorage.setItem('company_logo_url', finalLogo);
      else localStorage.removeItem('company_logo_url');
    } else if (companyLogoUrl !== undefined) {
      setCompanyLogoUrl(companyLogoUrl);
      if (companyLogoUrl) localStorage.setItem('company_logo_url', companyLogoUrl);
      else localStorage.removeItem('company_logo_url');
    }
    if (avatarUrl !== undefined) {
      setAvatarUrl(avatarUrl);
      localStorage.setItem('avatar_url', avatarUrl);
    }
    if (newPromptHour !== undefined) {
      setWfhPromptHour(String(newPromptHour));
      localStorage.setItem('wfh_prompt_hour', String(newPromptHour));
    }
    if (quotas) {
      localStorage.setItem('quota_pl', quotas.pl);
      localStorage.setItem('quota_el', quotas.el);
      localStorage.setItem('quota_rh', quotas.rh);
      localStorage.setItem('quota_wfh', quotas.wfh);
    }
    if (names) {
      setLeaveNames(names);
      localStorage.setItem('leave_names', JSON.stringify(names));
    }
    if (colors) {
      setLeaveColors(colors);
      localStorage.setItem('leave_colors', JSON.stringify(colors));
    }

    if (names || colors || quotas) {
      setLeaves(prev => {
        const next = { ...prev };
        const activeNames = names || leaveNames;
        const activeColors = colors || leaveColors;
        const activeQuotas = quotas || {};

        if (activeQuotas.pl !== undefined) next.pl.total = activeQuotas.pl;
        if (activeQuotas.el !== undefined) next.el.total = activeQuotas.el;
        if (activeQuotas.rh !== undefined) next.rh.total = activeQuotas.rh;

        if (activeNames.pl) next.pl.label = activeNames.pl;
        if (activeNames.el) next.el.label = activeNames.el;
        if (activeNames.rh) next.rh.label = activeNames.rh;

        if (activeColors.pl) { next.pl.color = activeColors.pl; next.pl.bg = getLeaveColor(activeColors.pl).bg; next.pl.badge = getLeaveColor(activeColors.pl).badge; }
        if (activeColors.el) { next.el.color = activeColors.el; next.el.bg = getLeaveColor(activeColors.el).bg; next.el.badge = getLeaveColor(activeColors.el).badge; }
        if (activeColors.rh) { next.rh.color = activeColors.rh; next.rh.bg = getLeaveColor(activeColors.rh).bg; next.rh.badge = getLeaveColor(activeColors.rh).badge; }

        return { ...next };
      });
    }

    const activeUser = currentUser || await getCurrentUser();
    if (activeUser?.id) {
      await upsertUserProfile(activeUser.id, {
        name: name || userName,
        email: activeUser.email,
        companyName: companyName !== undefined ? companyName : companyName,
        companyLogoUrl: companyLogoUrl !== undefined ? companyLogoUrl : companyLogoUrl,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : avatarUrl,
        quotas: quotas || {
          pl: leaves.pl.total,
          el: leaves.el.total,
          rh: leaves.rh.total,
          wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
        },
        names: names || leaveNames,
        colors: colors || leaveColors,
        wfhPromptHour: newPromptHour !== undefined ? newPromptHour : (wfhPromptHour || '12')
      });
    }

    const updatedColors = colors || leaveColors;
    const updatedNames = names || leaveNames;

    setLeaves(prev => ({
      pl: { 
        ...prev.pl, 
        total: quotas ? quotas.pl : prev.pl.total, 
        label: updatedNames.pl, 
        color: updatedColors.pl,
        bg: getLeaveColor(updatedColors.pl).bg,
        badge: getLeaveColor(updatedColors.pl).badge
      },
      el: { 
        ...prev.el, 
        total: quotas ? quotas.el : prev.el.total, 
        label: updatedNames.el, 
        color: updatedColors.el,
        bg: getLeaveColor(updatedColors.el).bg,
        badge: getLeaveColor(updatedColors.el).badge
      },
      rh: { 
        ...prev.rh, 
        total: quotas ? quotas.rh : prev.rh.total, 
        label: updatedNames.rh, 
        color: updatedColors.rh,
        bg: getLeaveColor(updatedColors.rh).bg,
        badge: getLeaveColor(updatedColors.rh).badge
      }
    }));
  };

  const handleOnboardingComplete = (data) => {
    handleSaveSettings(data);
    localStorage.setItem('onboarding_completed', 'true');
    setOnboardingOpen(false);
  };

  const handleReset = async () => {
    await resetAllLeaves(currentUser?.id);
    setBookedDates([]);
    setLeavePlans([]);
    updateLeaveCounts([]);
    setPreviewDates([]);
    setShowResetConfirm(false);
  };

  const handleDeleteLeave = async (dateStr) => {
    await removeLeave(dateStr, currentUser?.id);
    const newDates = bookedDates.filter(d => d.date !== dateStr);
    setBookedDates(newDates);
    updateLeaveCounts(newDates);
  };

  const handleDeletePlan = async (planId) => {
    await deleteLeavePlan(planId, currentUser?.id);
    await loadLeaves();
  };

  const handleUpdatePlan = async (planId, newName) => {
    await updateLeavePlan(planId, { name: newName }, currentUser?.id);
    await loadLeaves();
  };

  const scrollToTop = () => {
    if (mainScrollContainerRef.current) {
      mainScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviewRange = (datesArray) => {
    setActiveTab('calendar');
    setPreviewDates(datesArray);
    scrollToTop();
  };

  useEffect(() => {
    if (previewDates.length > 0) {
      const first = new Date(previewDates[0]);
      const last = new Date(previewDates[previewDates.length - 1]);
      const name = previewDates.length > 1
        ? `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      setMobilePlanName(name);
    }
  }, [previewDates.length]);

  const handleMobileApply = async () => {
    if (isTutorialActive) {
      // Sandboxed demo plan for tutorial mode: do NOT write to real database
      const chosenName = mobilePlanName || 'Sep Getaway (Walkthrough Demo)';
      setTutorialCustomName(chosenName);
      setPreviewDates([]);
      setSelectionStart(null);
      setMobileConfirmOpen(false);
      setMobileNote('');
      setMobileLeaveType('pl');
      setTutorialStepIndex(6);
      return;
    }
    const dates = previewDates;
    const elDiffHours = mobileToHour > mobileFromHour ? mobileToHour - mobileFromHour : 0;
    const isHalfDay = mobileLeaveType === 'el' && dates.length === 1 && elDiffHours > 0 && elDiffHours < 4.5;
    const durationPerDay = isHalfDay ? 0.5 : 1;
    let planId = null;
    if (dates.length > 1) {
      const plan = await createLeavePlan(mobilePlanName || 'Untitled Plan', dates[0], dates[dates.length - 1], currentUser?.id);
      planId = plan?.id || null;
    }
    for (const dateStr of dates) {
      if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
        await addLeave(dateStr, mobileLeaveType, mobileNote, planId, durationPerDay, currentUser?.id);
      }
    }
    await loadLeaves();
    setPreviewDates([]);
    setSelectionStart(null);
    setMobileConfirmOpen(false);
    setMobileNote('');
    setMobileLeaveType('pl');
  };

  const getTimeOfDayGreeting = (name) => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const firstName = name ? name.trim().split(' ')[0] : '';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${greeting}${firstName ? ' ' + firstName : ''}, it's ${dateStr}`;
  };

  const googleAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
  const effectiveAvatar = avatarUrl || googleAvatar || null;
  const effectiveCompanyLogo = companyLogoUrl || (companyName ? getCompanyLogoUrl(companyName) : null);
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'LV';

  if (isAuthChecking) {
    return <AppSkeleton />;
  }

  return (
    <div className="h-screen bg-background flex flex-col font-sans text-foreground overflow-hidden">
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-[0_1px_0_0_hsl(var(--border)),0_4px_24px_-4px_hsl(var(--foreground)/0.06)]">
        
        {/* Mobile Welcome Header (Mobile Calendar Page & Top Bar) */}
        <header className="md:hidden flex px-4 py-3 justify-between items-center bg-background/95 backdrop-blur-md border-b border-border/80">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {effectiveCompanyLogo && !companyLogoError ? (
              <img 
                src={effectiveCompanyLogo} 
                alt={companyName || 'Company Logo'} 
                className="w-9 h-9 rounded-xl object-contain border border-border bg-card p-1 shadow-sm flex-shrink-0" 
                onError={() => setCompanyLogoError(true)}
              />
            ) : (
              <div className="bg-primary text-primary-foreground rounded-xl w-9 h-9 flex items-center justify-center font-black text-xs shadow-md shadow-primary/20 flex-shrink-0 font-mono">
                {getCompanyInitials(companyName)}
              </div>
            )}
            
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest truncate">
                  {companyName || 'Leave Vault'}
                </span>
                <span className="text-[10px] text-muted-foreground/60">•</span>
                <span className="text-[10px] font-bold font-mono text-muted-foreground/80 whitespace-nowrap">
                  {getTodayDate().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-snug truncate">
                {(() => {
                  const hour = getTodayDate().getHours();
                  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
                  const firstName = userName ? userName.trim().split(' ')[0] : '';
                  return `${greeting}${firstName ? ', ' + firstName : ''}`;
                })()}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <ThemeSelector theme={theme} setTheme={setTheme} />

            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(true); setMobileSubView('profile'); }}
              className="flex items-center gap-1.5 bg-card hover:bg-muted border border-border/80 rounded-2xl pl-1 pr-2.5 py-1 transition-all active:scale-95 shadow-sm flex-shrink-0 cursor-pointer"
              title="My Profile & Account"
            >
              {effectiveAvatar ? (
                <img src={effectiveAvatar} alt={userName} className="w-6 h-6 rounded-full object-cover border border-primary/30 flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center font-mono flex-shrink-0">
                  {userInitials}
                </div>
              )}
              <span className="text-xs font-bold text-foreground truncate max-w-[64px]">
                {userName ? userName.trim().split(' ')[0] : 'User'}
              </span>
            </button>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden md:flex px-6 py-2.5 justify-between items-center gap-6">
          {/* Desktop Top Bar Left Branding */}
          <div className="flex items-center gap-3.5 flex-shrink-0">
            {effectiveCompanyLogo && !companyLogoError ? (
              <img 
                src={effectiveCompanyLogo} 
                alt={companyName || 'Company Logo'} 
                className="w-8 h-8 rounded-lg object-contain border border-border bg-card p-1 shadow-sm" 
                onError={() => setCompanyLogoError(true)}
              />
            ) : (
              <div className="bg-primary text-primary-foreground rounded-lg p-1.5 w-8 h-8 flex items-center justify-center font-black text-xs shadow-md font-mono">
                {getCompanyInitials(companyName)}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">
                  {companyName || 'Leave Vault'}
                </span>
                <span className="text-[10px] text-muted-foreground/60">•</span>
                <span className="text-[10px] font-bold font-mono text-muted-foreground/80">
                  {getTodayDate().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight leading-snug">
                {(() => {
                  const hour = getTodayDate().getHours();
                  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
                  const firstName = userName ? userName.trim().split(' ')[0] : '';
                  return `${greeting}${firstName ? ', ' + firstName : ''}`;
                })()}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-5 overflow-x-auto hide-scrollbar flex-1 min-w-0 justify-end">
            {Object.entries(leaves).map(([key, data]) => {
              const percentage = ((data.total - data.used) / data.total) * 100;
              const remaining = data.total - data.used;
              const remainingFmt = Number.isInteger(remaining) ? remaining : remaining.toFixed(1);
              const usedFmt = Number.isInteger(data.used) ? data.used : data.used.toFixed(1);
              return (
                <div key={key} className="flex flex-col w-28 flex-shrink-0">
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[10px] font-semibold font-mono text-muted-foreground uppercase">{getShortform(leaveNames[key] || data.label, key)} <span className={`ml-1 text-[9px] font-sans lowercase px-1 rounded ${data.badge}`}>{leaveNames[key] || data.label}</span></span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-xl font-bold font-mono">{remainingFmt}</span>
                    <span className="text-xs font-mono text-muted-foreground">/ {data.total}</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${data.bg}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground mt-0.5">{usedFmt} used • {remainingFmt} left</span>
                </div>
              );
            })}
            {(() => {
              const curMonthKey = new Date().toISOString().substring(0, 7);
              const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
              const remainingWfh = Math.max(0, 10 - wfhUsedThisMonth);
              const pctWfh = (wfhUsedThisMonth / 10) * 100;
              return (
                <div className="flex flex-col w-28 border-l border-border/60 pl-5 flex-shrink-0">
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[10px] font-bold font-mono text-cyan-500 uppercase">WFH <span className="ml-1 text-[8px] font-sans lowercase px-1 rounded bg-cyan-500/10 text-cyan-400">max 10/mo</span></span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-xl font-bold font-mono text-cyan-400">{wfhUsedThisMonth}</span>
                    <span className="text-xs font-mono text-muted-foreground">/ 10</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300 bg-cyan-400" style={{ width: `${pctWfh}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground mt-0.5">{remainingWfh} left this mo</span>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-3 border-l border-border/80 pl-4 flex-shrink-0 relative z-[60]">
            {/* Profile Pill with Avatar & Direct Hub Trigger */}
            {(() => {
              const googleAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
              const effectiveAvatar = avatarUrl || googleAvatar || null;
              const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'LV';

              return (
                <button 
                  type="button"
                  onClick={() => currentUser ? setSettingsModalOpen(true) : setAuthModalOpen(true)} 
                  title="Settings & Profile Hub"
                  className="flex items-center gap-2 bg-muted/60 hover:bg-muted border border-border/80 rounded-full p-1 pr-3 text-xs font-bold text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                >
                  {effectiveAvatar ? (
                    <img src={effectiveAvatar} alt={userName} className="w-6 h-6 rounded-full object-cover border border-primary/20 flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
                      {initials}
                    </div>
                  )}
                  <span className="font-bold text-xs">{userName}</span>
                </button>
              );
            })()}

            <ThemeSelector theme={theme} setTheme={setTheme} />
          </div>
        </header>

        {/* Desktop Tabs */}
        <div className="hidden md:block px-6">
          <div className="flex justify-between items-center whitespace-nowrap hide-scrollbar border-b border-border/40">
            <div className="flex gap-6 items-center">
              <button className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'calendar' ? 'border-foreground text-foreground font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('calendar')}>
                <CalendarIcon size={15} /> Calendar
              </button>
              <button className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'tracker' ? 'border-foreground text-foreground font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('tracker')}>
                <ListTodo size={15} /> Leave Tracker
                <span className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono font-bold">{bookedDates.length}</span>
              </button>
            </div>
            <button 
              disabled 
              className="py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground/40 opacity-50 cursor-not-allowed flex items-center gap-2 select-none"
              title="Trip Planner is coming soon!"
            >
              <MapPin size={15} /> Trip Planner
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground/80 border border-border/50">
                Coming Soon
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-0 md:p-6 flex flex-col md:flex-row gap-0 md:gap-6 overflow-hidden relative md:pb-0">
        {/* Dim background if preview is active */}
        {previewDates.length > 0 && activeTab === 'calendar' && (
          <div className="absolute inset-0 bg-slate-900/10 z-20 pointer-events-none transition-opacity duration-300"></div>
        )}

        {/* Desktop Optimizer Panel */}
        {activeTab === 'calendar' && (
          <div className="hidden md:flex w-80 flex-shrink-0 flex-col bg-card rounded-2xl border border-border shadow-apple-sm overflow-hidden h-full relative z-10">
            <OptimizerPanel 
              onPreviewRange={handlePreviewRange} 
              onHoverSuggestion={setHoveredSuggestion}
              bookedDates={bookedDates.map(d=>d.date)}
              viewMode={calendarViewMode}
              setFocusedMonth={setCalendarFocusedMonth}
              leaves={leaves}
            />
          </div>
        )}

        <div className={`flex-1 flex flex-col bg-background md:bg-card md:rounded-2xl md:border border-border md:shadow-apple-sm overflow-hidden h-full relative ${activeTab === 'calendar' ? 'z-30' : 'z-10'}`}>
          {activeTab === 'calendar' && (
            <div className="hidden md:flex p-4 border-b border-border gap-6 items-center bg-muted/30 overflow-x-auto whitespace-nowrap hide-scrollbar">
              <span className="text-sm font-medium text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-muted border border-border"></div> Weekend</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-purple-200"></div> Holiday</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-blue-300"></div> {getShortform(leaveNames.pl, 'PL')}</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-orange-300"></div> {getShortform(leaveNames.el, 'EL')}</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-green-300"></div> {getShortform(leaveNames.rh, 'RH')}</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-2 h-2 rounded-full bg-cyan-400"></div> {getShortform(leaveNames.wfh, 'WFH')}</div>
            </div>
          )}
          
          <div ref={mainScrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-6 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'calendar' && (
                <motion.div 
                  key="calendar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  <Calendar 
                    holidays={currentHolidays} 
                    bookedDates={bookedDates}
                    setBookedDates={setBookedDates}
                    leaves={leaves}
                    setLeaves={setLeaves}
                    loadLeaves={loadLeaves}
                    previewDates={previewDates}
                    setPreviewDates={setPreviewDates}
                    hoveredSuggestion={hoveredSuggestion}
                    viewMode={calendarViewMode}
                    setViewMode={setCalendarViewMode}
                    focusedMonth={calendarFocusedMonth}
                    setFocusedMonth={setCalendarFocusedMonth}
                    setIsSelecting={setIsSelecting}
                    selectionStart={selectionStart}
                    setSelectionStart={setSelectionStart}
                    onMobileConfirm={() => setMobileConfirmOpen(true)}
                    onAdvanceTutorial={isTutorialActive ? () => setTutorialStepIndex(prev => prev + 1) : undefined}
                    leavePlans={leavePlans}
                    todayDate={getTodayDate()}
                    calendarStyle={calendarStyle}
                    focusedCellHeight={focusedCellHeight}
                    theme={theme}
                    viewingLeave={viewingLeave}
                    setViewingLeave={setViewingLeave}
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div 
                      key={`mobile-panel-${calendarViewMode}-${calendarFocusedMonth}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeInOut" }}
                      className="md:hidden bg-card border border-border rounded-2xl shadow-apple-sm overflow-hidden flex-shrink-0"
                    >
                      <OptimizerPanel 
                        onPreviewRange={handlePreviewRange} 
                        onHoverSuggestion={setHoveredSuggestion}
                        bookedDates={bookedDates.map(d=>d.date)}
                        viewMode={calendarViewMode}
                        setFocusedMonth={setCalendarFocusedMonth}
                        inlineOnMobile={true}
                        leaves={leaves}
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
              {activeTab === 'tracker' && (
                <motion.div 
                  key="tracker"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <LeaveTracker 
                    bookedDates={bookedDates} 
                    onDelete={handleDeleteLeave} 
                    onDeletePlan={handleDeletePlan}
                    onUpdatePlan={handleUpdatePlan}
                    leaves={leaves} 
                    leavePlans={leavePlans}
                    calendarStyle={calendarStyle}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>



      {/* Dynamic Linear Blur & Multi-stop Gradient fade overlay behind floating mobile navbar */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 pointer-events-none z-40 overflow-hidden transition-all duration-200 ${
        (selectionStart !== null || previewDates.length > 0) && !mobileConfirmOpen && !isMobileMenuOpen && viewingLeave === null
          ? 'h-24'
          : 'h-40'
      }`}>
        <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,black_75%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_75%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 via-background/70 to-transparent" />
      </div>

      {/* Backdrop when mobile menu, confirmation modal, or viewing leave open */}
      <AnimatePresence>
        {(isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null) && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[48]"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setMobileConfirmOpen(false);
              setViewingLeave(null);
            }}
          />
        )}
      </AnimatePresence>

      <div className="md:hidden fixed bottom-6 left-0 right-0 z-[50] flex justify-center px-4 pointer-events-none">
        <motion.div
          id="mobile-floating-dock"
          layout
          transition={{ layout: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } }}
          className={`pointer-events-auto overflow-hidden border border-border/80 backdrop-blur-2xl transition-[border-radius,background-color,box-shadow,width,max-width] duration-200 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] ${
            isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null
              ? 'w-full rounded-[28px] bg-card/95 dark:bg-card/95'
              : (selectionStart !== null || previewDates.length > 0)
                ? 'w-full rounded-[28px] bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 shadow-2xl'
                : 'w-full max-w-sm rounded-[28px] bg-card/95 dark:bg-card/95'
          }`}
        >
          <AnimatePresence mode="wait">
            {/* ── EXISTING LEAVE DETAIL MORPHING STATE ── */}
            {viewingLeave && !isMobileMenuOpen && (
              <motion.div key="viewing-leave"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="max-h-[82vh] overflow-y-auto no-scrollbar bg-card"
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 bg-card">
                  <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>
                <ExistingLeaveDetailContent 
                  leaveObj={viewingLeave} 
                  onClose={() => setViewingLeave(null)} 
                  onCancelLeave={async (date) => {
                    await removeLeave(date);
                    await loadLeaves();
                    setViewingLeave(null);
                  }}
                  onCancelPlan={async (planId) => {
                    await deleteLeavePlan(planId);
                    await loadLeaves();
                    setViewingLeave(null);
                  }}
                  onConvertToOffice={async (date) => {
                    await removeLeave(date);
                    await addLeave(date, 'office');
                    await loadLeaves();
                    setViewingLeave(null);
                  }}
                  onConvertToWfh={async (date) => {
                    await removeLeave(date);
                    await addLeave(date, 'wfh');
                    await loadLeaves();
                    setViewingLeave(null);
                  }}
                  onConvertToLeave={async (date) => {
                    await removeLeave(date);
                    await loadLeaves();
                    setViewingLeave(null);
                    setSelectionStart(date);
                    setPreviewDates([date]);
                    setMobileConfirmOpen(true);
                  }}
                  leaves={leaves}
                  calendarStyle={calendarStyle}
                />
              </motion.div>
            )}

            {/* ── MENU STATE ── */}
            {isMobileMenuOpen && (
              <motion.div key="menu"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="max-h-[85vh] overflow-y-auto no-scrollbar"
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                <AnimatePresence mode="wait">
                  {/* ── PROFILE MORPHING SUBVIEW ── */}
                  {mobileSubView === 'profile' ? (
                    <motion.div 
                      key="mobile-profile" 
                      initial={{ opacity: 0, y: 6 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -6 }} 
                      transition={{ duration: 0.18, ease: "easeInOut" }} 
                      className="p-4 flex flex-col gap-4"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <button 
                          onClick={() => setMobileSubView(null)} 
                          className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
                          title="Back to menu"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-xs font-black uppercase tracking-wider text-foreground font-mono text-center flex-1 truncate px-2">My Profile & Account</span>
                        <button 
                          onClick={() => { setIsMobileMenuOpen(false); setMobileSubView(null); }} 
                          className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
                          title="Close"
                        >
                          <X size={16} />
                        </button>
                      </div>

                  {/* Profile Card */}
                  <div className="flex flex-col items-center text-center p-5 bg-muted/30 border border-border/80 rounded-2xl relative">
                    <div className="relative mb-2">
                      {mobileFormAvatar || effectiveAvatar ? (
                        <img src={mobileFormAvatar || effectiveAvatar} alt={userName} className="w-28 h-28 rounded-full object-cover border-4 border-primary/30 shadow-xl" />
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-primary text-primary-foreground font-black text-3xl flex items-center justify-center shadow-xl shadow-primary/20 border-4 border-primary/30">
                          {userInitials}
                        </div>
                      )}

                      {/* Camera Overlay Badge Button */}
                      <button 
                        type="button" 
                        onClick={() => mobileAvatarFileRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-background cursor-pointer"
                        title="Upload photo from device"
                      >
                        <Camera size={16} />
                      </button>
                      <input 
                        type="file" 
                        ref={mobileAvatarFileRef} 
                        accept="image/*" 
                        onChange={handleMobileAvatarUpload} 
                        className="hidden" 
                      />
                    </div>

                    <h3 className="text-base font-black text-foreground mt-2">{userName}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{currentUser?.email || 'Guest Profile'}</p>
                    <span className="mt-2 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                      <CheckCircle2 size={10} /> {currentUser ? 'Cloud Synced' : 'Guest Account'}
                    </span>
                  </div>

                  {/* Form Inputs */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Full Display Name</label>
                      <input 
                        type="text" 
                        value={mobileFormName} 
                        onChange={(e) => setMobileFormName(e.target.value)} 
                        className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Company / Workspace</label>
                      <CompanyInput 
                        value={mobileFormCompany} 
                        onChange={(val) => setMobileFormCompany(val)} 
                        placeholder="e.g. Siemens, ABB, Google"
                      />
                    </div>
                  </div>

                  {/* Quotas Summary Grid */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Annual Quotas</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-500 font-mono">PL</span>
                        <span className="text-sm font-black font-mono">{leaves.pl.total} d</span>
                      </div>
                      <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-orange-500 font-mono">EL</span>
                        <span className="text-sm font-black font-mono">{leaves.el.total} d</span>
                      </div>
                      <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-green-500 font-mono">RH</span>
                        <span className="text-sm font-black font-mono">{leaves.rh.total} d</span>
                      </div>
                      <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-cyan-500 font-mono">WFH</span>
                        <span className="text-sm font-black font-mono">{parseInt(localStorage.getItem('quota_wfh')||'10', 10)} /mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Toast Message */}
                  {mobileToast && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-500 text-center animate-in fade-in duration-200">
                      {mobileToast}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-border">
                    <button 
                      type="button" 
                      onClick={() => {
                        handleSaveSettings({ name: mobileFormName, companyName: mobileFormCompany, avatarUrl: mobileFormAvatar });
                        setMobileToast('Profile Saved!');
                        setTimeout(() => {
                          setMobileToast('');
                          setMobileSubView(null);
                        }, 500);
                      }}
                      className="w-full py-3 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2"
                    >
                      <Save size={14} /> Save Profile Changes
                    </button>



                    <button 
                      type="button" 
                      onClick={() => {
                        setMobileSubView(null);
                        setIsMobileMenuOpen(false);
                        setTutorialStepIndex(0);
                        setIsTutorialActive(true);
                      }}
                      className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Play size={14} className="fill-amber-500/40" /> Launch Interactive Tour (Walkthrough)
                    </button>

                    <button 
                      type="button" 
                      onClick={() => { setMobileSubView(null); setIsMobileMenuOpen(false); setShowResetConfirm(true); }}
                      className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                    >
                      <RotateCw size={14} /> Reset All Data
                    </button>

                    {!currentUser && (
                      <button 
                        type="button" 
                        onClick={() => { setIsMobileMenuOpen(false); setAuthModalOpen(true); }}
                        className="w-full py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                      >
                        <User size={14} /> Sign In or Create Account
                      </button>
                    )}
                  </div>
                </motion.div>

              /* ── SETTINGS MORPHING SUBVIEW ── */
              ) : mobileSubView === 'settings' ? (
                <motion.div 
                  key="mobile-settings" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }} 
                  transition={{ duration: 0.2 }} 
                  className="p-4 flex flex-col gap-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <button 
                      onClick={() => setMobileSubView(null)} 
                      className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
                      title="Back to menu"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-black uppercase tracking-wider text-foreground font-mono text-center flex-1 truncate px-2">App Settings</span>
                    <button 
                      onClick={() => { setIsMobileMenuOpen(false); setMobileSubView(null); }} 
                      className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Navigation Bar Aesthetic Tab Switcher */}
                  <div className="flex bg-muted p-1 rounded-2xl border border-border/80 gap-1 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'quotas', label: 'Quotas', icon: SlidersHorizontal },
                      { id: 'holidays', label: 'Public Holidays', icon: Clock },
                      { id: 'backup', label: 'Backups', icon: FileText }
                    ].map(tab => {
                      const Icon = tab.icon;
                      const isActive = mobileSettingsTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setMobileSettingsTab(tab.id)}
                          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 ${
                            isActive ? 'bg-background shadow-apple-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon size={13} className={isActive ? 'text-primary' : ''} />
                          <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Animated Tab Content Switcher */}
                  <AnimatePresence mode="wait">
                    {mobileSettingsTab === 'quotas' ? (
                      <motion.div
                        key="quotas"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className="flex flex-col gap-3"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Annual Leave Quotas, Colors & Custom Names</span>
                        
                        {/* 2x2 Grid Layout with AppleWheelPicker Tumbler Scroll */}
                        <div className="grid grid-cols-2 gap-2">
                          <AppleWheelPicker
                            code="PL"
                            label="Planned Leave"
                            value={mobileFormQuotas.pl ?? leaves.pl.total}
                            onChange={(val) => setMobileFormQuotas(prev => ({ ...prev, pl: val }))}
                            min={0} max={30}
                            customName={mobileFormNames.pl !== undefined ? mobileFormNames.pl : (leaveNames.pl || '')}
                            onCustomNameChange={(val) => setMobileFormNames(prev => ({ ...prev, pl: val }))}
                            color={mobileFormColors.pl || leaveColors.pl || 'blue'}
                            onColorChange={(val) => setMobileFormColors(prev => ({ ...prev, pl: val }))}
                          />
                          <AppleWheelPicker
                            code="EL"
                            label="Emergency Leave"
                            value={mobileFormQuotas.el ?? leaves.el.total}
                            onChange={(val) => setMobileFormQuotas(prev => ({ ...prev, el: val }))}
                            min={0} max={20}
                            customName={mobileFormNames.el !== undefined ? mobileFormNames.el : (leaveNames.el || '')}
                            onCustomNameChange={(val) => setMobileFormNames(prev => ({ ...prev, el: val }))}
                            color={mobileFormColors.el || leaveColors.el || 'orange'}
                            onColorChange={(val) => setMobileFormColors(prev => ({ ...prev, el: val }))}
                          />
                          <AppleWheelPicker
                            code="RH"
                            label="Extra Leave"
                            value={mobileFormQuotas.rh ?? leaves.rh.total}
                            onChange={(val) => setMobileFormQuotas(prev => ({ ...prev, rh: val }))}
                            min={0} max={10}
                            customName={mobileFormNames.rh !== undefined ? mobileFormNames.rh : (leaveNames.rh || '')}
                            onCustomNameChange={(val) => setMobileFormNames(prev => ({ ...prev, rh: val }))}
                            color={mobileFormColors.rh || leaveColors.rh || 'green'}
                            onColorChange={(val) => setMobileFormColors(prev => ({ ...prev, rh: val }))}
                          />
                          <AppleWheelPicker
                            code="WFH"
                            label="Monthly WFH"
                            value={mobileFormQuotas.wfh ?? (parseInt(localStorage.getItem('quota_wfh') || '10', 10))}
                            onChange={(val) => setMobileFormQuotas(prev => ({ ...prev, wfh: val }))}
                            min={0} max={20}
                            customName={mobileFormNames.wfh !== undefined ? mobileFormNames.wfh : (leaveNames.wfh || '')}
                            onCustomNameChange={(val) => setMobileFormNames(prev => ({ ...prev, wfh: val }))}
                            color={mobileFormColors.wfh || leaveColors.wfh || 'cyan'}
                            onColorChange={(val) => setMobileFormColors(prev => ({ ...prev, wfh: val }))}
                          />
                        </div>

                        {/* Attendance Check-in Prompt Preference */}
                        <div className="p-2.5 bg-muted/40 border border-border/80 rounded-xl flex justify-between items-center mt-1">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-bold text-foreground truncate">Check-in Prompt Time</span>
                            <span className="text-[10px] text-muted-foreground truncate">Daily WFH vs Office prompt</span>
                          </div>
                          <select
                            value={wfhPromptHour}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWfhPromptHour(val);
                              localStorage.setItem('wfh_prompt_hour', val);
                            }}
                            className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                          >
                            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => {
                              const period = h >= 12 ? 'PM' : 'AM';
                              const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                              return (
                                <option key={h} value={h}>
                                  {displayH}:00 {period}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </motion.div>
                    ) : mobileSettingsTab === 'holidays' ? (
                      <motion.div
                        key="holidays"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className="flex flex-col gap-2 min-h-[380px] max-h-[72vh] overflow-hidden"
                      >
                        <HolidayManager 
                          showTitle={false} 
                          initialHolidays={currentHolidays}
                          onStagingChange={setMobileHolidaysStagingState} 
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="backup"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className="flex flex-col gap-3.5"
                      >
                        {/* Export Account Data Section */}
                        <div className="bg-muted/40 border border-border/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-foreground block font-mono">EXPORT ACCOUNT DATA</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                              Export your PL/EL/RH leaves, WFH logs, and trip plans into JSON backup or CSV spreadsheets.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                setIsExportingMobile(true);
                                const res = await exportUserDataToJson(currentUser?.id);
                                setIsExportingMobile(false);
                                if (res.success) setMobileToast(`JSON Backup Exported! (${res.count} items)`);
                                else setMobileToast(`Export failed: ${res.error}`);
                                setTimeout(() => setMobileToast(''), 3000);
                              }}
                              disabled={isExportingMobile}
                              className="flex-1 py-2.5 bg-card border border-border text-foreground hover:bg-muted rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <Download size={14} className="text-foreground" /> {isExportingMobile ? 'Exporting...' : 'JSON Backup'}
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                setIsExportingCsvMobile(true);
                                const res = await exportUserDataToCsv(currentUser?.id);
                                setIsExportingCsvMobile(false);
                                if (res.success) setMobileToast(`CSV Exported! (${res.count} records)`);
                                else setMobileToast(`Export failed: ${res.error}`);
                                setTimeout(() => setMobileToast(''), 3000);
                              }}
                              disabled={isExportingCsvMobile}
                              className="flex-1 py-2.5 bg-card border border-border text-foreground hover:bg-muted rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <FileSpreadsheet size={14} className="text-foreground" /> {isExportingCsvMobile ? 'Exporting...' : 'CSV Report'}
                            </button>
                          </div>
                        </div>

                        {/* Import / Restore Section */}
                        <div className="bg-muted/40 border border-border/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-foreground block font-mono">RESTORE BACKUP</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                              Upload an exported JSON backup to seamlessly restore your leaves and plans.
                            </p>
                          </div>
                          <label className="w-full py-2.5 bg-card border border-dashed border-border hover:border-foreground/40 text-foreground rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer">
                            <Upload size={14} className="text-primary" /> {isImportingMobile ? 'Restoring...' : 'Upload JSON Backup File'}
                            <input 
                              type="file" 
                              accept=".json" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsImportingMobile(true);
                                const result = await importUserDataFromJson(file, currentUser?.id);
                                setIsImportingMobile(false);
                                if (result.success) {
                                  setMobileToast(`Restored ${result.leavesCount} leaves & ${result.plansCount} plans!`);
                                  const updatedLeaves = await fetchBookedLeaves(currentUser?.id);
                                  const updatedPlans = await fetchLeavePlans(currentUser?.id);
                                  setBookedLeaves(updatedLeaves);
                                  setLeavePlans(updatedPlans);
                                } else {
                                  setMobileToast(`Restore Failed: ${result.error}`);
                                }
                                e.target.value = '';
                                setTimeout(() => setMobileToast(''), 4000);
                              }} 
                              className="hidden" 
                              disabled={isImportingMobile} 
                            />
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Toast Message */}
                  {mobileToast && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-500 text-center animate-in fade-in duration-200">
                      {mobileToast}
                    </div>
                  )}

                  {/* Footer Action Buttons */}
                  {mobileSettingsTab === 'holidays' && mobileHolidaysStagingState.isStaging ? (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button 
                        type="button" 
                        onClick={() => {
                          if (mobileHolidaysStagingState.discardStaging) {
                            mobileHolidaysStagingState.discardStaging();
                          }
                        }} 
                        className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X size={14} /> Discard
                      </button>
                      <button 
                        type="button" 
                        onClick={async () => {
                          if (mobileHolidaysStagingState.saveStaging) {
                            await mobileHolidaysStagingState.saveStaging();
                            setMobileToast('Holidays saved to cloud!');
                            setTimeout(() => setMobileToast(''), 3000);
                          }
                        }} 
                        className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check size={14} strokeWidth={3} /> Save Holidays
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button 
                        type="button" 
                        onClick={() => setMobileSubView(null)} 
                        className="flex-1 py-2.5 bg-muted text-foreground text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          handleSaveSettings({
                            name: mobileFormName,
                            companyName: mobileFormCompany,
                            quotas: mobileFormQuotas,
                            names: mobileFormNames,
                            colors: mobileFormColors
                          });
                          setMobileToast('Settings Saved!');
                          setTimeout(() => {
                            setMobileToast('');
                            setMobileSubView(null);
                          }, 500);
                        }} 
                        className="flex-1 py-3 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Save size={14} /> Save Settings
                      </button>
                    </div>
                  )}
                </motion.div>

              /* ── MAIN MENU SUBVIEW ── */
              ) : (
                <motion.div 
                  key="mobile-main-menu"
                  initial={{ opacity: 0, y: 6 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -6 }} 
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                >
                  {/* Header row */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                      {effectiveCompanyLogo ? (
                        <img 
                          src={effectiveCompanyLogo} 
                          alt={companyName || 'Company Logo'} 
                          className="w-8 h-8 rounded-xl object-contain border border-border bg-card p-0.5 shadow-sm flex-shrink-0" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="bg-primary text-primary-foreground rounded-xl w-8 h-8 flex items-center justify-center font-black text-xs shadow-md flex-shrink-0 font-mono">
                          {getCompanyInitials(companyName)}
                        </div>
                      )}
                      <div className="flex flex-col leading-none">
                        <span className="font-bold font-mono text-sm text-foreground">{userName}</span>
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{currentUser?.email || 'Guest Account'}</span>
                      </div>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  {/* Mobile Profile & Settings Quick Action Buttons */}
                  <div className="p-3 grid grid-cols-2 gap-2 border-b border-border/60 bg-muted/10">
                    <button 
                      onClick={() => { setMobileSubView('profile'); }}
                      className="flex items-center gap-2.5 p-2.5 bg-card hover:bg-muted/60 border border-border rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      {effectiveAvatar ? (
                        <img src={effectiveAvatar} alt={userName} className="w-8 h-8 rounded-xl object-cover border border-primary/20 flex-shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {userInitials}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">My Profile</span>
                        <span className="text-[9px] text-muted-foreground truncate">{currentUser ? 'Account Sync' : 'View Profile'}</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => { setMobileSubView('settings'); setMobileSettingsTab('quotas'); }}
                      className="flex items-center gap-2.5 p-2.5 bg-card hover:bg-muted/60 border border-border rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                        <Settings size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">Settings</span>
                        <span className="text-[9px] text-muted-foreground truncate">Quotas & Colors</span>
                      </div>
                    </button>
                  </div>

                  {/* Balances */}
                  <div className="px-4 py-3 flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Leave & WFH Balances</span>
                    {Object.entries(leaves).map(([key, data]) => {
                      const rem = data.total - data.used;
                      const remFmt = Number.isInteger(rem) ? rem : rem.toFixed(1);
                      const usedFmt = Number.isInteger(data.used) ? data.used : data.used.toFixed(1);
                      return (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold font-mono text-foreground">{data.label} <span className="text-muted-foreground">({key})</span></span>
                            <span className="text-sm font-bold font-mono">{remFmt}<span className="text-muted-foreground font-normal text-xs"> / {data.total}</span></span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${data.bg}`} style={{ width: `${(rem/data.total)*100}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{usedFmt} used</span>
                        </div>
                      );
                    })}
                    {/* WFH Monthly Quota Row */}
                    {(() => {
                      const curMonthKey = new Date().toISOString().substring(0, 7);
                      const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
                      const maxWfh = parseInt(localStorage.getItem('quota_wfh') || '10', 10);
                      const wfhRemaining = Math.max(0, maxWfh - wfhUsedThisMonth);
                      const isWfhOverQuota = wfhUsedThisMonth >= maxWfh;
                      const wfhOverAmount = wfhUsedThisMonth - maxWfh;

                      return (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold font-mono text-foreground">Work-From-Home <span className="text-muted-foreground">(wfh)</span></span>
                            <span className="text-sm font-bold font-mono">{wfhRemaining}<span className="text-muted-foreground font-normal text-xs"> / {maxWfh}</span></span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isWfhOverQuota ? 'bg-red-500' : 'bg-cyan-400'}`} 
                              style={{ width: `${Math.min(100, (wfhRemaining / maxWfh) * 100)}%` }} 
                            />
                          </div>
                          <span className={`text-[10px] font-mono ${isWfhOverQuota ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>
                            {isWfhOverQuota ? `+${wfhOverAmount} day${wfhOverAmount === 1 ? '' : 's'} over monthly quota` : `${wfhUsedThisMonth} used this month`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Actions */}
                  <div className="px-4 pb-5 pt-2 border-t border-border flex gap-2.5">
                    <ThemeSelector theme={theme} setTheme={setTheme} direction="up" variant="full" />
                    <button onClick={handleSignOut} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold hover:bg-red-500/20 transition-colors">
                      <LogOut size={15}/> <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

          {/* ── CONFIRM STATE ── */}
          {mobileConfirmOpen && !isMobileMenuOpen && viewingLeave === null && (
            <motion.div key="confirm"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="flex flex-col max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-5 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                <h2 className="font-bold font-mono text-sm uppercase tracking-tight">Confirm Leave</h2>
                <button onClick={() => setMobileConfirmOpen(false)} className="p-1 text-muted-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-5 pb-8">
                <div>
                  <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Plan Name</label>
                  <input
                    id="tutorial-step-plan-name-mobile"
                    type="text"
                    value={mobilePlanName}
                    onChange={(e) => setMobilePlanName(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Plan Name"
                  />
                </div>

                {(() => {
                  const actualLeaves = previewDates.filter(d => !isHoliday(d) && !isWeekend(d)).length;
                  return (
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-xl border border-border/50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Leaves needed</span>
                        <span className="text-sm font-bold text-foreground leading-none">{actualLeaves}</span>
                      </div>
                      <div className="w-px h-6 bg-border/50" />
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total days</span>
                        <span className="text-sm font-bold text-foreground leading-none">{previewDates.length}</span>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Leave Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'pl', label: 'PL', left: `${leaves.pl.total - leaves.pl.used} left` },
                      { key: 'el', label: 'EL', left: `${leaves.el.total - leaves.el.used} left` },
                      { key: 'rh', label: 'RH', left: `${leaves.rh.total - leaves.rh.used} left` },
                      { key: 'wfh', label: 'WFH', left: 'Max 10/mo' }
                    ].map(item => {
                      const isActive = mobileLeaveType === item.key;
                      const colors = {
                        pl: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', shadow: 'shadow-blue-500/20' },
                        el: { border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', shadow: 'shadow-orange-500/20' },
                        rh: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', shadow: 'shadow-green-500/20' },
                        wfh: { border: 'border-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', shadow: 'shadow-cyan-500/20' }
                      };
                      const colorStyle = colors[item.key] || { border: 'border-border', bg: 'bg-card', text: 'text-muted-foreground', shadow: '' };
                      return (
                        <button
                          key={item.key}
                          id={item.key === 'pl' ? 'tutorial-step-category-pl-mobile' : undefined}
                          type="button"
                          onClick={() => {
                            setMobileLeaveType(item.key);
                            if (isTutorialActive && tutorialStepIndex === 4) setTutorialStepIndex(5);
                          }}
                          className={`py-3 px-1 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                            isActive ? `${colorStyle.border} ${colorStyle.bg} ${colorStyle.text} shadow-sm ${colorStyle.shadow} ring-1 ring-inset ring-black/5` : 'border-border bg-card text-muted-foreground opacity-60'
                          }`}
                        >
                          <span className="text-[11px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                          <span className="text-[8px] font-bold opacity-80 leading-none truncate">{item.left}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* EL Warning synced with desktop */}
                {mobileLeaveType === 'el' && checkSequentialELWarning(previewDates.filter(d => !isHoliday(d) && !isWeekend(d)), bookedDates) && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-3 items-start shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-red-800">
                      <span className="font-black block mb-1 uppercase tracking-wider text-[10px]">Medical Certificate Required</span>
                      You are applying for more than 2 consecutive Emergency Leaves across your bookings. Please ensure you have a valid medical certificate to provide to HR.
                    </div>
                  </div>
                )}

                {mobileLeaveType === 'el' && previewDates.length === 1 && (
                  <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Partial Day Selection</span>
                    </div>
                    <TimePicker
                      fromHour={mobileFromHour}
                      toHour={mobileToHour}
                      onChange={(f, t) => { setMobileFromHour(f); setMobileToHour(t); }}
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Note (Optional)</label>
                  <input
                    type="text"
                    value={mobileNote}
                    onChange={(e) => setMobileNote(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm font-bold focus:outline-none"
                    placeholder="Why are you taking leave?"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setMobileConfirmOpen(false)} className="flex-1 py-3 bg-muted border border-border text-foreground rounded-xl text-xs font-bold shadow-sm">
                    Back
                  </button>
                  <button 
                    id="tutorial-step-modal-apply-btn-mobile"
                    onClick={() => {
                      handleMobileApply();
                      if (isTutorialActive && tutorialStepIndex === 5) setTutorialStepIndex(6);
                    }} 
                    className="flex-[2] py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2"
                  >
                    Confirm & Apply <Check size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SELECTION STATE (date selected, not yet confirmed) ── */}
          {!isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && (selectionStart !== null || previewDates.length > 0) && (
            <motion.div key="selection"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="flex items-center gap-3 px-4 h-[62px]"
            >
              <div className="flex-1">
                {selectionStart && previewDates.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white leading-none">Selected {new Date(selectionStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span className="text-[9px] text-slate-300 leading-none mt-0.5">Pick end date or apply 1 day</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-none">{previewDates.length} Days Selected</span>
                    <span className="text-[9px] text-slate-300 leading-none mt-0.5">{new Date(previewDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(previewDates[previewDates.length-1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <button onClick={() => { setSelectionStart(null); setPreviewDates([]); }} className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1">
                Cancel
              </button>
              {selectionStart && previewDates.length === 0 && (
                <button onClick={() => { setPreviewDates([selectionStart]); setMobileConfirmOpen(true); }} className="flex items-center gap-1.5 text-xs font-black text-black bg-white hover:bg-slate-100 px-3.5 py-2 rounded-full shadow-md whitespace-nowrap">
                  Apply 1 Day <Check size={13} strokeWidth={3}/>
                </button>
              )}
              {previewDates.length > 0 && (
                <button 
                  id="tutorial-step-confirm-plan-btn-mobile"
                  onClick={() => { 
                    setMobileConfirmOpen(true); 
                    if (isTutorialActive && tutorialStepIndex === 3) setTutorialStepIndex(4); 
                  }} 
                  className="flex items-center gap-1.5 text-xs font-black text-black bg-white hover:bg-slate-100 px-4 py-2 rounded-full shadow-md whitespace-nowrap"
                >
                  Confirm <Check size={13} strokeWidth={3}/>
                </button>
              )}
            </motion.div>
          )}
          {!isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && selectionStart === null && previewDates.length === 0 && (
            <motion.div key="nav"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              {/* Mini usage bar */}
              {(() => {
                const total = leaves.pl.total + leaves.el.total + leaves.rh.total;
                const pctPL = (leaves.pl.used / total) * 100;
                const pctEL = (leaves.el.used / total) * 100;
                const pctRH = (leaves.rh.used / total) * 100;
                const totalUsed = leaves.pl.used + leaves.el.used + leaves.rh.used;
                const totalUsedFmt = Number.isInteger(totalUsed) ? totalUsed : totalUsed.toFixed(1);

                const curMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
                const maxWfh = parseInt(localStorage.getItem('quota_wfh') || '10', 10);
                const pctWFH = Math.min(100, (wfhUsedThisMonth / maxWfh) * 100);

                return (
                  <div className="border-b border-border/40">
                    {/* Secondary WFH bar (thin 2px cyan line over leaves bar) */}
                    <div className="h-[2px] w-full bg-cyan-950/20 dark:bg-cyan-950/40 relative overflow-hidden">
                      <div className="h-full bg-cyan-400 dark:bg-cyan-400 transition-all duration-300" style={{ width: `${pctWFH}%` }} />
                    </div>
                    {/* Main Leaves bar */}
                    <div className="h-1 w-full bg-transparent flex">
                      <div className="h-full bg-blue-500" style={{ width: `${pctPL}%` }} />
                      <div className="h-full bg-orange-500" style={{ width: `${pctEL}%` }} />
                      <div className="h-full bg-green-500" style={{ width: `${pctRH}%` }} />
                    </div>
                    <div className="flex justify-between items-center px-4 py-1.5">
                      <span className="text-[9px] font-bold tracking-widest text-foreground uppercase">{totalUsedFmt} / {total} Used</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>PL</span>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"/>EL</span>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>RH</span>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"/>WFH {wfhUsedThisMonth}/{maxWfh}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="flex justify-around items-center px-2 py-1.5">
                <button 
                  onClick={() => setActiveTab('calendar')} 
                  className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-colors ${activeTab === 'calendar' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <CalendarIcon size={20} className="mb-1"/>
                  <span className="text-[9px] font-bold tracking-wide">Calendar</span>
                </button>

                <button 
                  disabled 
                  className="flex flex-col items-center py-2 px-3 rounded-2xl text-muted-foreground/40 opacity-40 cursor-not-allowed relative select-none"
                  title="Trip Planner is coming soon"
                >
                  <div className="relative">
                    <MapPin size={20} className="mb-1"/>
                    <span className="absolute -top-1.5 -right-3 bg-muted-foreground/20 text-muted-foreground text-[8px] font-mono font-bold px-1 rounded border border-border/40">
                      SOON
                    </span>
                  </div>
                  <span className="text-[9px] font-bold tracking-wide">Trips</span>
                </button>

                <button 
                  onClick={() => setActiveTab('tracker')} 
                  className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-colors ${activeTab === 'tracker' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <div className="relative">
                    <ListTodo size={20} className="mb-1"/>
                    {bookedDates.length > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{bookedDates.length}</span>}
                  </div>
                  <span className="text-[9px] font-bold tracking-wide">Tracker</span>
                </button>

                <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center py-2 px-3 rounded-2xl text-muted-foreground hover:text-foreground">
                  <Menu size={20} className="mb-1"/>
                  <span className="text-[9px] font-bold tracking-wide">Menu</span>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
      </div>

      {/* Global Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-[100]"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }} 
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }} 
              exit={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-[calc(100%-48px)] max-w-sm bg-card border border-border rounded-[32px] p-8 shadow-2xl z-[101]"
            >
              <div className="bg-red-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-red-600 mb-4 mx-auto">
                <RotateCw size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Reset All Data?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">This will delete all your leave plans and records. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-muted text-foreground rounded-2xl text-xs font-bold">Cancel</button>
                <button onClick={handleReset} className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-red-600/20">Confirm Reset</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Selection Modal — Lifted for layering (desktop & mobile) */}
      <div className="block">
        {((selectionStart || previewDates.length > 0)) && (
          <LeaveSelectionBar 
            selectionStart={selectionStart}
            previewDates={previewDates}
            bookedDates={bookedDates}
            leaveNames={leaveNames}
            onAdvanceTutorial={isTutorialActive ? () => setTutorialStepIndex(prev => prev + 1) : undefined}
            forceExpandModal={isTutorialActive && (tutorialStepIndex === 4 || tutorialStepIndex === 5)}
            tutorialStepIndex={tutorialStepIndex}
            onCancel={() => { setSelectionStart(null); setPreviewDates([]); }}
            onApply={async (dates, type, note, planName, duration) => {
              if (isTutorialActive) {
                const finalName = planName || 'Sep Getaway (Walkthrough Demo)';
                setTutorialCustomName(finalName);
                setLeavePlans(prev => [
                  {
                    id: 'tutorial-demo-plan-temp',
                    name: finalName,
                    start_date: '2026-09-10',
                    end_date: '2026-09-15',
                    startDate: '2026-09-10',
                    endDate: '2026-09-15',
                    type: 'pl',
                    is_demo: true
                  },
                  ...prev.filter(p => p.id !== 'tutorial-demo-plan-temp')
                ]);
                setPreviewDates([]);
                setSelectionStart(null);
                return;
              }
              if (planName) setTutorialCustomName(planName);
              // Reuse logic or call a common handler
              let planId = null;
              if (dates.length > 1) {
                const plan = await createLeavePlan(planName || 'Untitled Plan', dates[0], dates[dates.length - 1], currentUser?.id);
                planId = plan?.id || null;
              }
              for (const dateStr of dates) {
                if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
                  await addLeave(dateStr, type, note, planId, duration, currentUser?.id);
                }
              }
              await loadLeaves();
              setPreviewDates([]);
              setSelectionStart(null);
            }}
            balances={{
              pl: leaves.pl.total - leaves.pl.used,
              el: leaves.el.total - leaves.el.used,
              rh: leaves.rh.total - leaves.rh.used
            }}
          />
        )}
      </div>

      {/* 12 PM Daily Attendance Check-in Modal */}
      {(() => {
        const effectiveToday = getTodayDate();
        const curMonthKey = `${effectiveToday.getFullYear()}-${String(effectiveToday.getMonth() + 1).padStart(2, '0')}`;
        const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
        const todayStr = getTodayStr();
        return (
          <WfhCheckinModal
            isOpen={wfhModalOpen}
            onClose={() => setWfhModalOpen(false)}
            onSelectStatus={handleWfhStatusSelect}
            onMarkLeave={handleWfhMarkLeave}
            wfhUsedThisMonth={wfhUsedThisMonth}
            maxWfh={10}
            todayStr={todayStr}
            bookedDates={bookedDates}
            leaveNames={leaveNames}
          />
        );
      })()}

      {/* Notification Permission Modal */}
      <NotificationPromptModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        onEnable={handleEnableNotif}
      />

      {/* Unified Settings & Account Hub Modal */}
      <AnimatePresence>
        {settingsModalOpen && (
          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            userName={userName}
            companyName={companyName}
            avatarUrl={avatarUrl}
            quotas={{
              pl: leaves.pl.total,
              el: leaves.el.total,
              rh: leaves.rh.total,
              wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
            }}
            leaveNames={leaveNames}
            leaveColors={leaveColors}
            onSaveSettings={handleSaveSettings}
            currentUser={currentUser}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onResetData={handleReset}
            onDeleteAccount={handleDeleteAccount}
            onSignOut={handleSignOut}
            onReplayTutorial={() => {
              setTutorialStepIndex(0);
              setIsTutorialActive(true);
            }}
            leavesQuota={leaves}
            onImportSuccess={async (importedQuotaSettings) => {
              await loadLeaves(currentUser);
              if (importedQuotaSettings) {
                setLeaves(prev => ({
                  pl: { ...prev.pl, total: importedQuotaSettings.pl || prev.pl.total },
                  el: { ...prev.el, total: importedQuotaSettings.el || prev.el.total },
                  rh: { ...prev.rh, total: importedQuotaSettings.rh || prev.rh.total }
                }));
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Supabase & OAuth Multi-User Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        currentProfile={{
          name: userName,
          quotas: {
            pl: leaves.pl.total,
            el: leaves.el.total,
            rh: leaves.rh.total,
            wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
          },
          names: leaveNames,
          colors: leaveColors
        }}
      />

      {/* Initial App Load & Auth Gateway Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            isOpen={showSplash}
            onClose={() => {}}
            onAuthSuccess={handleAuthSuccess}
            currentProfile={{
              name: userName,
              quotas: {
                pl: leaves.pl.total,
                el: leaves.el.total,
                rh: leaves.rh.total,
                wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
              },
              names: leaveNames,
              colors: leaveColors
            }}
          />
        )}
      </AnimatePresence>

      {/* Onboarding Flow Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={async (data) => {
          await handleSaveSettings(data);
          localStorage.setItem('onboarding_completed', 'true');
          setOnboardingOpen(false);
          setTutorialStepIndex(0);
          setIsTutorialActive(true);
        }}
      />

      {/* Post-Onboarding Interactive Guided Tutorial Overlay & Self-Executing Demo */}
      {isTutorialActive && (
        <TutorialOverlay
          currentStepIndex={tutorialStepIndex}
          setCurrentStepIndex={setTutorialStepIndex}
          onExecuteStepAction={(action) => {
            switch (action) {
              case 'prompt-open-month':
                setActiveTab('calendar');
                setCalendarViewMode('yearly');
                setSelectionStart(null);
                setPreviewDates([]);
                break;
              case 'select-start-date':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(8); // September
                setSelectionStart(null); // Wait for user to click Sept 10
                setPreviewDates([]);
                break;
              case 'select-end-range':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(8);
                setSelectionStart('2026-09-10'); // Sept 10 active
                setPreviewDates([]); // Wait for user to click Sept 15
                break;
              case 'prompt-confirm-plan':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(8);
                setSelectionStart('2026-09-10');
                setPreviewDates(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15']);
                break;
              case 'select-modal-category':
                setActiveTab('calendar');
                setSelectionStart('2026-09-10');
                setPreviewDates(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15']);
                setMobileConfirmOpen(true);
                break;
              case 'apply-modal-leave':
                setActiveTab('calendar');
                setSelectionStart('2026-09-10');
                setPreviewDates(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15']);
                setMobileConfirmOpen(true);
                break;
              case 'review-created-plan':
                setActiveTab('tracker');
                setSelectionStart(null);
                setPreviewDates([]);
                setMobileConfirmOpen(false);
                setIsMobileMenuOpen(false);
                setMobileSubView(null);
                // Inject temporary sandboxed demo plan for review step
                setLeavePlans(prev => {
                  if (prev.some(p => p.id === 'tutorial-demo-plan-temp')) return prev;
                  return [
                    {
                      id: 'tutorial-demo-plan-temp',
                      name: tutorialCustomName || 'Sep Getaway (Walkthrough Demo)',
                      start_date: '2026-09-10',
                      end_date: '2026-09-15',
                      startDate: '2026-09-10',
                      endDate: '2026-09-15',
                      type: 'pl',
                      is_demo: true
                    },
                    ...prev
                  ];
                });
                break;
              default:
                break;
            }
          }}
          onComplete={() => {
            markTutorialCompleted();
            setIsTutorialActive(false);
            setSelectionStart(null);
            setPreviewDates([]);
            setHoveredSuggestion(null);
            setMobileConfirmOpen(false);
            setIsMobileMenuOpen(false);
            setMobileSubView(null);
            setActiveTab('calendar');
            setCalendarViewMode('yearly');
            setLeavePlans(prev => prev.filter(p => p.id !== 'tutorial-demo-plan-temp'));
          }}
          onSkip={() => {
            markTutorialCompleted();
            setIsTutorialActive(false);
            setSelectionStart(null);
            setPreviewDates([]);
            setHoveredSuggestion(null);
            setMobileConfirmOpen(false);
            setIsMobileMenuOpen(false);
            setMobileSubView(null);
            setActiveTab('calendar');
            setCalendarViewMode('yearly');
            setLeavePlans(prev => prev.filter(p => p.id !== 'tutorial-demo-plan-temp'));
          }}
        />
      )}

      {/* Developer Suite FAB & Modal (Local Builds Only) */}
      {import.meta.env.DEV && (
        <>
          <button
            type="button"
            onClick={() => setDevModalOpen(true)}
            className="fixed bottom-4 left-4 z-50 p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl shadow-2xl shadow-amber-500/40 border border-amber-300 font-mono text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Developer Control Suite"
          >
            <FlaskConical size={15} /> DEV
          </button>

          <DevToolsModal
            isOpen={devModalOpen}
            onClose={() => setDevModalOpen(false)}
            getTodayStr={getTodayStr}
            devDateStr={devDateStr}
            setDevDateStr={setDevDateStr}
            setHasPromptedWfh={setHasPromptedWfh}
            calendarStyle={calendarStyle}
            onSetCalendarStyle={(style) => {
              setCalendarStyle(style);
              localStorage.setItem('calendar_cell_style', style);
            }}
            focusedCellHeight={focusedCellHeight}
            onSetFocusedCellHeight={(h) => {
              setFocusedCellHeight(h);
              localStorage.setItem('dev_focused_cell_height', h);
            }}
            onStartNewUserFlow={() => {
              setShowSplash(false);
              setAuthModalOpen(false);
              setOnboardingOpen(true);
            }}
            onStartTutorial={() => {
              setShowSplash(false);
              setAuthModalOpen(false);
              setOnboardingOpen(false);
              setIsMobileMenuOpen(false);
              setMobileSubView(null);
              setTutorialStepIndex(0);
              setIsTutorialActive(true);
            }}
            onOpenWfhCheckin={() => setWfhModalOpen(true)}
          />
        </>
      )}
    </div>
  );
};

export default App;
