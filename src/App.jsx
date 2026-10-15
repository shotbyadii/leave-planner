import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicHolidays, isHoliday, isWeekend, getStoredHolidays, loadHolidaysFromSupabase } from './data/holidays';
import { isRunningStandalone } from './components/InstallPromptModal';
import Calendar from './components/Calendar';
import OptimizerPanel from './components/OptimizerPanel';
import LeaveTracker from './components/LeaveTracker';
import MobileFloatingDock from './components/mobile/MobileFloatingDock';
import DesktopHeader from './components/layout/DesktopHeader';
import MobileHeader from './components/layout/MobileHeader';
import AppModals from './components/modals/AppModals';
import AppSkeleton from './components/AppSkeleton';
import DemoBanner from './components/DemoBanner';
import { getCompanyLogoUrl } from './utils/companyLogoUtils';
import { getLeaveColor, getShortform } from './utils/colorUtils';
import { supabase } from './lib/supabase';
import { initGlobalHaptics } from './utils/haptics';
import {
  getTutorialMonthIndex,
  SHORT_MONTH_NAMES
} from './services/tutorialService';
import { 
  showAppNotification, 
  requestNotificationPermission, 
  subscribeUserToPush 
} from './utils/notificationService';
import { addLeave, removeLeave, deleteLeavePlan } from './services/leaveService';
import { useAuthUser } from './hooks/useAuthUser';
import { useAttendanceManager } from './hooks/useAttendanceManager';
import { useLeaveManagement } from './hooks/useLeaveManagement';
import { useMobileBooking } from './hooks/useMobileBooking';
import './index.css';

export default function App() {
  const mainScrollContainerRef = useRef(null);

  // App Level UI States
  const [activeTab, setActiveTab] = useState('calendar');
  const [devDateStr, setDevDateStr] = useState(import.meta.env.DEV ? (localStorage.getItem('dev_date_override') || '') : '');
  const [calendarViewMode, setCalendarViewMode] = useState(window.innerWidth < 768 ? 'monthly' : 'yearly');
  const [calendarFocusedMonth, setCalendarFocusedMonth] = useState(new Date().getMonth());
  const [calendarStyle, setCalendarStyle] = useState(localStorage.getItem('calendar_cell_style') || 'capsule');
  const [focusedCellHeight, setFocusedCellHeight] = useState(Number(localStorage.getItem('dev_focused_cell_height') || 56));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [topbarTierTab, setTopbarTierTab] = useState('annual');
  const [mobileMenuTierTab, setMobileMenuTierTab] = useState('annual');
  const [companyLogoError, setCompanyLogoError] = useState(false);

  // Mobile Navigation & View States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSubView, setMobileSubView] = useState(null);
  const [mobileSettingsTab, setMobileSettingsTab] = useState('quotas');
  const [isMobileAiOpen, setIsMobileAiOpen] = useState(false);
  const [mobileAiMode, setMobileAiMode] = useState('compact');

  // Modal Visibility States
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('profile');
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);

  // Tutorial State
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const tutorialMonthIdx = getTutorialMonthIndex();
  const tutorialMonthStr = String(tutorialMonthIdx + 1).padStart(2, '0');
  const tutorialShortMonth = SHORT_MONTH_NAMES[tutorialMonthIdx] || 'Current Month';
  const tutorialStartDate = `2026-${tutorialMonthStr}-10`;
  const tutorialEndDate = `2026-${tutorialMonthStr}-15`;
  const tutorialDateRange = [
    `2026-${tutorialMonthStr}-10`,
    `2026-${tutorialMonthStr}-11`,
    `2026-${tutorialMonthStr}-12`,
    `2026-${tutorialMonthStr}-13`,
    `2026-${tutorialMonthStr}-14`,
    `2026-${tutorialMonthStr}-15`,
  ];
  const defaultTutorialPlanName = `${tutorialShortMonth} Getaway (Walkthrough Demo)`;
  const [tutorialCustomName, setTutorialCustomName] = useState(defaultTutorialPlanName);

  // Date calculation helpers
  const getTodayDate = () => {
    if (import.meta.env.DEV && devDateStr) {
      const parts = devDateStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    return new Date();
  };

  const scrollToTop = (behavior = 'smooth') => {
    if (mainScrollContainerRef.current) {
      mainScrollContainerRef.current.scrollTo({ top: 0, behavior });
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior });
    }
  };

  // Reliably reset main scroll container and window scroll positions whenever view tab changes
  useEffect(() => {
    scrollToTop('instant');
  }, [activeTab]);

  // Custom Company Public Holidays State
  const [currentHolidays, setCurrentHolidays] = useState(() => getStoredHolidays());

  useEffect(() => {
    loadHolidaysFromSupabase();
    const handleHolidaysUpdated = (e) => {
      if (e.detail) setCurrentHolidays(e.detail);
      else setCurrentHolidays(getStoredHolidays());
    };
    window.addEventListener('company_holidays_updated', handleHolidaysUpdated);
    return () => window.removeEventListener('company_holidays_updated', handleHolidaysUpdated);
  }, []);

  // ── HOOK 1: AUTHENTICATION & PROFILE ──
  const {
    currentUser,
    isAuthChecking,
    authModalOpen,
    setAuthModalOpen,
    resetPasswordModalOpen,
    setResetPasswordModalOpen,
    showSplash,
    setShowSplash,
    isDemoMode,
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
    handleEnterDemoMode
  } = useAuthUser({
    setOnboardingOpen,
    loadLeaves: (user) => leaveManager.loadLeaves(user),
    onLeavesReset: () => {
      leaveManager.setBookedDates([]);
      leaveManager.setLeavePlans([]);
    }
  });

  // ── HOOK 2: LEAVE STATE & BALANCES ──
  const leaveManager = useLeaveManagement({
    currentUser,
    isDemoMode,
    userName,
    setUserName,
    companyName,
    setCompanyName,
    companyLogoUrl,
    setCompanyLogoUrl,
    avatarUrl,
    setAvatarUrl,
    setActiveTab,
    setCalendarFocusedMonth,
    setCalendarViewMode,
    scrollToTop,
    devDateStr
  });

  const {
    leaveNames,
    leaveColors,
    leaves,
    setLeaves,
    leaveConfigs,
    bookedDates,
    setBookedDates,
    leavePlans,
    setLeavePlans,
    previewDates,
    setPreviewDates,
    suggestedPlanName,
    setSuggestedPlanName,
    hoveredSuggestion,
    setHoveredSuggestion,
    isLeavesLoaded,
    isAiPreview,
    annualTrackerEntries,
    specialTrackerEntries,
    remoteTrackerEntry,
    lopUsedThisYear,
    totalAnnualBankRemaining,
    isAnnualBankDepleted,
    isLopActive,
    loadLeaves,
    handleSaveSettings,
    handleReset,
    handleDeleteLeave,
    handleDeletePlan,
    handleUpdatePlan,
    handlePreviewRange,
    handleClearAiPreview,
    handleExecuteAiAction,
    getTodayStr
  } = leaveManager;

  // ── HOOK 3: ATTENDANCE & NOTIFICATIONS ──
  const {
    wfhModalOpen,
    setWfhModalOpen,
    missingAttendanceDays,
    hasPromptedWfh,
    setHasPromptedWfh,
    wfhPromptHour,
    setWfhPromptHour,
    attendanceCatchupMode,
    setAttendanceCatchupMode,
    handleWfhStatusSelect,
    handleBatchWfhStatusSelect,
    handleWfhMarkLeave
  } = useAttendanceManager({
    currentUser,
    isDemoMode,
    bookedDates,
    leaveConfigs,
    leaveNames,
    leaves,
    leavePlans,
    holidays: currentHolidays,
    devDateStr,
    isLeavesLoaded,
    loadLeaves,
    onOpenLeaveBooking: (d) => {
      setActiveTab('calendar');
      bookingManager.setSelectionStart(d);
      setPreviewDates([d]);
      bookingManager.setMobileConfirmOpen(true);
    }
  });

  // ── HOOK 4: MOBILE BOOKING & TICKER ──
  const bookingManager = useMobileBooking({
    previewDates,
    setPreviewDates,
    suggestedPlanName,
    leaveConfigs,
    leaves,
    leaveColors,
    leaveNames,
    bookedDates,
    lopUsedThisYear,
    isAnnualBankDepleted,
    currentUser,
    loadLeaves,
    setActiveTab,
    isTutorialActive,
    setTutorialStepIndex,
    defaultTutorialPlanName,
    setTutorialCustomName,
    setLeavePlans,
    tutorialStartDate,
    tutorialEndDate,
    getTodayStr
  });

  const {
    selectionStart,
    setSelectionStart,
    mobileConfirmOpen,
    setMobileConfirmOpen,
    viewingLeave,
    setViewingLeave,
    setIsSelecting,
    mobileLeaveType,
    setMobileLeaveType,
    mobilePlanName,
    setMobilePlanName,
    mobileNote,
    setMobileNote,
    mobileDuration,
    setMobileDuration,
    mobileTickerData,
    mobileModalTierTab,
    setMobileModalTierTab,
    selectedMobileBal,
    allowsHalfDayMobile,
    mobileLeavesNeeded,
    handleMobileApply,
    handleMobileTickerComplete
  } = bookingManager;

  // Reset logo error when branding updates
  useEffect(() => {
    setCompanyLogoError(false);
  }, [companyName, companyLogoUrl]);

  // Tactile haptics listener
  useEffect(() => {
    return initGlobalHaptics();
  }, []);

  // Theme application
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
      if (isSystem) root.classList.add('theme-system');
      else root.classList.remove('theme-system');

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

  // Realtime Supabase Database Listener
  useEffect(() => {
    if (!currentUser?.id || isDemoMode) return;

    let channel;
    try {
      channel = supabase
        .channel(`realtime-leaves-${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leaves',
            filter: `user_id=eq.${currentUser.id}`
          },
          () => {
            loadLeaves(currentUser);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUser?.id, isDemoMode, loadLeaves]);

  // Cross-tab BroadcastChannel & ServiceWorker sync
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('leave-vault-sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'LEAVES_UPDATED') {
          loadLeaves(currentUser);
        }
      };
    } catch (e) {}

    const handleSwMessage = (event) => {
      if (event.data?.type === 'QUICK_ATTENDANCE_LOGGED' || event.data?.type === 'LEAVES_UPDATED') {
        loadLeaves(currentUser);
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      try { bc?.close(); } catch (e) {}
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [currentUser, loadLeaves]);

  // URL search params action handler
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const action = searchParams.get('action');
      const targetDate = searchParams.get('date');

      if (action === 'leave') {
        const d = targetDate || getTodayStr();
        setActiveTab('calendar');
        setSelectionStart(d);
        setPreviewDates([d]);
        setMobileConfirmOpen(true);
        window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
      } else if (action === 'attendance') {
        setWfhModalOpen(true);
        window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
      } else if (action === 'tracker') {
        setActiveTab('tracker');
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
        window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
      } else if (action === 'calendar') {
        setActiveTab('calendar');
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
        window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
      }
    } catch (e) {
      console.warn('Error checking URL search parameters:', e);
    }
  }, [getTodayStr, setPreviewDates, setSelectionStart, setMobileConfirmOpen, setWfhModalOpen]);

  // PWA Standalone Detection
  useEffect(() => {
    setIsStandaloneApp(isRunningStandalone());

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandaloneApp(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Reset subview when mobile menu closes
  useEffect(() => {
    if (!isMobileMenuOpen) setMobileSubView(null);
  }, [isMobileMenuOpen]);

  const handleEnableNotif = async () => {
    try {
      const res = await subscribeUserToPush(currentUser?.id);
      if (res && res.success) {
        showAppNotification('Attendance Reminders Active', {
          body: 'Web Push reminders active! You will receive daily check-in reminders even when the app is closed.',
          tag: 'leave-vault-welcome'
        });
      } else {
        const perm = await requestNotificationPermission();
        if (perm === 'granted') {
          showAppNotification('Attendance Reminders Active', {
            body: 'You will receive daily attendance check-in reminders on this device.',
            tag: 'leave-vault-welcome'
          });
        }
      }
    } catch (e) {
      console.warn('Could not complete notification subscription:', e);
    } finally {
      setNotifModalOpen(false);
    }
  };

  const triggerInstallPromptAfterFlow = () => {
    try {
      const isStandalone = isRunningStandalone();
      const dismissedPermanent = localStorage.getItem('pwa_prompt_dismissed_permanent') === 'true';
      if (!isStandalone && !dismissedPermanent && !isTutorialActive) {
        sessionStorage.setItem('pwa_session_prompted', 'true');
        setTimeout(() => {
          setInstallModalOpen(true);
        }, 600);
      }
    } catch (e) {}
  };

  const googleAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
  const effectiveAvatar = avatarUrl || googleAvatar || null;
  const effectiveCompanyLogo = companyLogoUrl || (companyName ? getCompanyLogoUrl(companyName) : null);
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'LV';

  if (isAuthChecking) {
    return (
      <>
        {isDemoMode && <DemoBanner onRestartDemo={handleRestartDemo} onExitDemo={handleExitDemo} />}
        <AppSkeleton />
      </>
    );
  }

  return (
    <div className={`h-screen bg-background flex flex-col font-sans text-foreground overflow-hidden ${isDemoMode ? 'pt-10' : ''}`}>
      {/* Interactive Sandbox Demo Banner */}
      {isDemoMode && (
        <DemoBanner onRestartDemo={handleRestartDemo} onExitDemo={handleExitDemo} />
      )}

      {/* Sticky Header Container */}
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-[0_1px_0_0_hsl(var(--border)),0_4px_24px_-4px_hsl(var(--foreground)/0.06)] pt-safe">
        {/* Mobile Header */}
        <MobileHeader
          effectiveCompanyLogo={effectiveCompanyLogo}
          companyLogoError={companyLogoError}
          setCompanyLogoError={setCompanyLogoError}
          companyName={companyName}
          userName={userName}
          getTodayDate={getTodayDate}
          theme={theme}
          setTheme={setTheme}
          effectiveAvatar={effectiveAvatar}
          userInitials={userInitials}
          onOpenProfile={() => {
            setIsMobileMenuOpen(true);
            setMobileSubView('profile');
          }}
        />

        {/* Desktop Header */}
        <DesktopHeader
          companyName={companyName}
          effectiveCompanyLogo={effectiveCompanyLogo}
          companyLogoError={companyLogoError}
          setCompanyLogoError={setCompanyLogoError}
          userName={userName}
          effectiveAvatar={effectiveAvatar}
          userInitials={userInitials}
          getTodayDate={getTodayDate}
          annualTrackerEntries={annualTrackerEntries}
          specialTrackerEntries={specialTrackerEntries}
          remoteTrackerEntry={remoteTrackerEntry}
          isLopActive={isLopActive}
          lopUsedThisYear={lopUsedThisYear}
          topbarTierTab={topbarTierTab}
          setTopbarTierTab={setTopbarTierTab}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          bookedDatesCount={bookedDates.length}
          currentUser={currentUser}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onSignOut={handleSignOut}
          theme={theme}
          setTheme={setTheme}
        />
      </div>

      {/* Main App Content Viewport */}
      <div className="flex-1 p-0 md:p-6 flex flex-col md:flex-row gap-0 md:gap-6 overflow-hidden relative md:pb-0">
        {/* Dim background if preview is active */}
        {previewDates.length > 0 && activeTab === 'calendar' && (
          <div className="absolute inset-0 bg-slate-900/10 z-20 pointer-events-none transition-opacity duration-300"></div>
        )}

        {/* Desktop Optimizer Panel */}
        {activeTab === 'calendar' && (
          <div className="hidden md:flex w-80 flex-shrink-0 flex-col bg-card rounded-t-2xl rounded-b-none border-t border-x border-b-0 border-border shadow-apple-sm overflow-hidden h-full relative z-10">
            <OptimizerPanel 
              onPreviewRange={handlePreviewRange} 
              onHoverSuggestion={setHoveredSuggestion}
              bookedDates={bookedDates}
              viewMode={calendarViewMode}
              setFocusedMonth={setCalendarFocusedMonth}
              leaves={leaves}
              leaveNames={leaveNames}
              leavePlans={leavePlans}
              leaveConfigs={leaveConfigs}
              companyName={companyName}
              onOpenSettings={(tab = 'profile') => { setSettingsInitialTab(tab); setSettingsModalOpen(true); }}
              onExecuteAction={handleExecuteAiAction}
            />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card via-card/80 to-transparent z-20" />
          </div>
        )}

        {/* Main Calendar / Leave Tracker Workspace */}
        <div className={`flex-1 flex flex-col bg-background md:bg-card md:rounded-t-2xl md:rounded-b-none md:border-t md:border-x md:border-b-0 border-border md:shadow-apple-sm overflow-hidden h-full relative ${activeTab === 'calendar' ? 'z-30' : 'z-10'}`}>
          {activeTab === 'calendar' && (
            <div className="hidden md:flex p-3.5 border-b border-border gap-5 items-center bg-muted/30 overflow-x-auto whitespace-nowrap hide-scrollbar">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Legend:</span>
              <div className="flex items-center gap-1.5 text-xs text-foreground font-normal">
                <div className="w-2.5 h-2.5 rounded-full bg-muted border border-border"></div> Weekend
              </div>
              <div className="flex items-center gap-1.5 text-xs text-foreground font-normal">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div> Holiday
              </div>
              {(Array.isArray(leaveConfigs) && leaveConfigs.length > 0 ? leaveConfigs.filter(c => c.enabled) : [
                { id: 'pl', name: leaveNames.pl || 'Planned Leave', shortCode: 'PL', color: leaveColors.pl || 'blue' },
                { id: 'el', name: leaveNames.el || 'Emergency Leave', shortCode: 'EL', color: leaveColors.el || 'orange' },
                { id: 'rh', name: leaveNames.rh || 'Restricted Leave', shortCode: 'RH', color: leaveColors.rh || 'green' },
                { id: 'wfh', name: leaveNames.wfh || 'Work From Home', shortCode: 'WFH', color: leaveColors.wfh || 'cyan' }
              ]).map(c => {
                const colorObj = getLeaveColor(c.color || leaveColors?.[c.id] || 'blue');
                return (
                  <div key={c.id} className="flex items-center gap-1.5 text-xs text-foreground font-normal">
                    <div className={`w-2.5 h-2.5 rounded-full ${colorObj.bg}`}></div>
                    <span>{c.shortCode || getShortform(c.name, c.id.toUpperCase())}</span>
                  </div>
                );
              })}
              {isLopActive && (
                <div className="flex items-center gap-1.5 text-xs text-foreground font-normal">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-500"></div>
                  <span>LOP</span>
                </div>
              )}
            </div>
          )}
          
          <div 
            ref={mainScrollContainerRef} 
            className={`flex-1 overflow-y-auto ${activeTab === 'calendar' && calendarViewMode === 'monthly' ? 'md:overflow-hidden' : ''} p-4 md:p-6 pb-32 md:pb-0 relative flex flex-col`}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'calendar' && (
                <motion.div 
                  key="calendar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4 md:gap-6 h-auto md:h-full"
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
                    leaveColors={leaveColors}
                    leaveNames={leaveNames}
                    leaveConfigs={leaveConfigs}
                    onClearAiPreview={handleClearAiPreview}
                  />
                  <div className="md:hidden bg-card border border-border rounded-2xl shadow-apple-sm overflow-hidden flex-shrink-0">
                    <OptimizerPanel 
                      onPreviewRange={handlePreviewRange} 
                      onHoverSuggestion={setHoveredSuggestion}
                      bookedDates={bookedDates}
                      viewMode={calendarViewMode}
                      setFocusedMonth={setCalendarFocusedMonth}
                      inlineOnMobile={true}
                      leaves={leaves}
                      leaveNames={leaveNames}
                      leavePlans={leavePlans}
                      companyName={companyName}
                      onOpenSettings={(tab = 'profile') => { setSettingsInitialTab(tab); setSettingsModalOpen(true); }}
                      onExecuteAction={handleExecuteAiAction}
                    />
                  </div>
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
                    leaveColors={leaveColors}
                    leaveNames={leaveNames}
                    leaveConfigs={leaveConfigs}
                    maxWfh={parseInt(localStorage.getItem('quota_wfh') || '10', 10)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating Mobile Background Blur */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 pointer-events-none z-40 overflow-hidden transition-all duration-200 ${
        (selectionStart !== null || previewDates.length > 0) && !mobileConfirmOpen && !isMobileMenuOpen && viewingLeave === null
          ? 'h-24'
          : 'h-40'
      }`}>
        <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,black_75%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_75%,transparent_100%)]" />
      </div>

      {/* Unified Mobile Floating Dock */}
      <MobileFloatingDock
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        mobileConfirmOpen={mobileConfirmOpen}
        setMobileConfirmOpen={setMobileConfirmOpen}
        viewingLeave={viewingLeave}
        setViewingLeave={setViewingLeave}
        isMobileAiOpen={isMobileAiOpen}
        setIsMobileAiOpen={setIsMobileAiOpen}
        mobileAiMode={mobileAiMode}
        setMobileAiMode={setMobileAiMode}
        mobileSubView={mobileSubView}
        setMobileSubView={setMobileSubView}
        mobileSettingsTab={mobileSettingsTab}
        setMobileSettingsTab={setMobileSettingsTab}
        mobileMenuTierTab={mobileMenuTierTab}
        setMobileMenuTierTab={setMobileMenuTierTab}
        mobileModalTierTab={mobileModalTierTab}
        setMobileModalTierTab={setMobileModalTierTab}
        selectionStart={selectionStart}
        setSelectionStart={setSelectionStart}
        previewDates={previewDates}
        setPreviewDates={setPreviewDates}
        isAiPreview={isAiPreview}
        bookedDates={bookedDates}
        leaves={leaves}
        leavePlans={leavePlans}
        leaveConfigs={leaveConfigs}
        currentHolidays={currentHolidays}
        holidays={currentHolidays}
        userName={userName}
        companyName={companyName}
        effectiveCompanyLogo={effectiveCompanyLogo}
        effectiveAvatar={effectiveAvatar}
        userInitials={userInitials}
        currentUser={currentUser}
        isStandaloneApp={isStandaloneApp}
        theme={theme}
        setTheme={setTheme}
        calendarStyle={calendarStyle}
        mobileTickerData={mobileTickerData}
        onTickerComplete={handleMobileTickerComplete}
        mobilePlanName={mobilePlanName}
        setMobilePlanName={setMobilePlanName}
        mobileLeavesNeeded={mobileLeavesNeeded}
        isAnnualBankDepleted={isAnnualBankDepleted}
        totalAnnualBankRemaining={totalAnnualBankRemaining}
        lopUsedThisYear={lopUsedThisYear}
        mobileLeaveType={mobileLeaveType}
        setMobileLeaveType={setMobileLeaveType}
        allowsHalfDayMobile={allowsHalfDayMobile}
        mobileDuration={mobileDuration}
        setMobileDuration={setMobileDuration}
        selectedMobileBal={selectedMobileBal}
        mobileNote={mobileNote}
        setMobileNote={setMobileNote}
        onApplyBooking={handleMobileApply}
        onRemoveLeave={async (date) => {
          await removeLeave(date, currentUser?.id);
          await loadLeaves();
        }}
        onDeleteLeavePlan={async (planId) => {
          await deleteLeavePlan(planId, currentUser?.id);
          await loadLeaves();
        }}
        onAddLeave={async (date, type) => {
          await addLeave(date, type, type.toUpperCase(), null, 1, currentUser?.id);
          await loadLeaves();
        }}
        onRefreshData={async () => {
          await loadLeaves();
        }}
        leaveNames={leaveNames}
        leaveColors={leaveColors}
        wfhPromptHour={wfhPromptHour}
        setWfhPromptHour={setWfhPromptHour}
        attendanceCatchupMode={attendanceCatchupMode}
        setAttendanceCatchupMode={setAttendanceCatchupMode}
        onSaveSettings={handleSaveSettings}
        onStartTutorial={() => {
          setTutorialStepIndex(0);
          setIsTutorialActive(true);
        }}
        onResetData={() => setShowResetConfirm(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenInstallModal={() => setInstallModalOpen(true)}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        scrollToTop={scrollToTop}
        annualTrackerEntries={annualTrackerEntries}
        specialTrackerEntries={specialTrackerEntries}
        remoteTrackerEntry={remoteTrackerEntry}
        isLopActive={isLopActive}
        onExecuteAiAction={handleExecuteAiAction}
        onPreviewAiRange={(start, end) => {
          const sDate = new Date(start);
          const eDate = new Date(end);
          const range = [];
          for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
            range.push(`${2026}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
          }
          handlePreviewRange(range, `Vacation (${start} → ${end})`);
        }}
        isTutorialActive={isTutorialActive}
        tutorialStepIndex={tutorialStepIndex}
        setTutorialStepIndex={setTutorialStepIndex}
      />

      {/* App Modals Coordinator */}
      <AppModals
        showResetConfirm={showResetConfirm}
        setShowResetConfirm={setShowResetConfirm}
        handleReset={handleReset}
        selectionStart={selectionStart}
        setSelectionStart={setSelectionStart}
        previewDates={previewDates}
        setPreviewDates={setPreviewDates}
        bookedDates={bookedDates}
        leaveNames={leaveNames}
        leaveColors={leaveColors}
        leaveConfigs={leaveConfigs}
        suggestedPlanName={suggestedPlanName}
        setSuggestedPlanName={setSuggestedPlanName}
        isAiPreview={isAiPreview}
        leaves={leaves}
        setLeaves={setLeaves}
        currentUser={currentUser}
        loadLeaves={loadLeaves}
        setActiveTab={setActiveTab}
        setLeavePlans={setLeavePlans}
        defaultTutorialPlanName={defaultTutorialPlanName}
        tutorialStartDate={tutorialStartDate}
        tutorialEndDate={tutorialEndDate}
        setTutorialCustomName={setTutorialCustomName}
        tutorialCustomName={tutorialCustomName}
        wfhModalOpen={wfhModalOpen}
        setWfhModalOpen={setWfhModalOpen}
        isTutorialActive={isTutorialActive}
        setIsTutorialActive={setIsTutorialActive}
        tutorialStepIndex={tutorialStepIndex}
        setTutorialStepIndex={setTutorialStepIndex}
        tutorialMonthIdx={tutorialMonthIdx}
        tutorialDateRange={tutorialDateRange}
        onboardingOpen={onboardingOpen}
        setOnboardingOpen={setOnboardingOpen}
        showSplash={showSplash}
        setShowSplash={setShowSplash}
        handleWfhStatusSelect={handleWfhStatusSelect}
        handleBatchWfhStatusSelect={handleBatchWfhStatusSelect}
        handleWfhMarkLeave={handleWfhMarkLeave}
        getTodayDate={getTodayDate}
        getTodayStr={getTodayStr}
        missingAttendanceDays={missingAttendanceDays}
        wfhPromptHour={wfhPromptHour}
        setHasPromptedWfh={setHasPromptedWfh}
        notifModalOpen={notifModalOpen}
        setNotifModalOpen={setNotifModalOpen}
        handleEnableNotif={handleEnableNotif}
        installModalOpen={installModalOpen}
        setInstallModalOpen={setInstallModalOpen}
        deferredInstallPrompt={deferredInstallPrompt}
        setIsStandaloneApp={setIsStandaloneApp}
        triggerInstallPromptAfterFlow={triggerInstallPromptAfterFlow}
        settingsModalOpen={settingsModalOpen}
        setSettingsModalOpen={setSettingsModalOpen}
        settingsInitialTab={settingsInitialTab}
        userName={userName}
        companyName={companyName}
        avatarUrl={avatarUrl}
        attendanceCatchupMode={attendanceCatchupMode}
        handleSaveSettings={handleSaveSettings}
        handleDeleteAccount={handleDeleteAccount}
        handleSignOut={handleSignOut}
        authModalOpen={authModalOpen}
        setAuthModalOpen={setAuthModalOpen}
        handleAuthSuccess={handleAuthSuccess}
        handleEnterDemoMode={handleEnterDemoMode}
        handleExitDemo={handleExitDemo}
        isDemoMode={isDemoMode}
        resetPasswordModalOpen={resetPasswordModalOpen}
        setResetPasswordModalOpen={setResetPasswordModalOpen}
        setHoveredSuggestion={setHoveredSuggestion}
        setMobileConfirmOpen={setMobileConfirmOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setMobileSubView={setMobileSubView}
        setCalendarViewMode={setCalendarViewMode}
        setCalendarFocusedMonth={setCalendarFocusedMonth}
        devModalOpen={devModalOpen}
        setDevModalOpen={setDevModalOpen}
        devDateStr={devDateStr}
        setDevDateStr={setDevDateStr}
        calendarStyle={calendarStyle}
        setCalendarStyle={setCalendarStyle}
        focusedCellHeight={focusedCellHeight}
        setFocusedCellHeight={setFocusedCellHeight}
      />
    </div>
  );
}
