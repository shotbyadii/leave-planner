import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, MapPin, ListTodo, RotateCw, Menu, X, Sparkles, Moon, Sun, Monitor, Check, AlertTriangle, Settings, User, ArrowLeft, ChevronLeft, Camera, Building2, SlidersHorizontal, ChevronRight, LogOut, ShieldCheck, Download, Upload, Save, CheckCircle2, FlaskConical, FileText, Table, Play, Clock, FileSpreadsheet, Plus, Trash2, Edit3, Info, Shield, Heart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicHolidays, isHoliday, isWeekend, getStoredHolidays, loadHolidaysFromSupabase } from './data/holidays';
import { checkSequentialELWarning } from './utils/leaveOptimizer';
import { fetchBookedLeaves, fetchLeavePlans, resetAllLeaves, removeLeave, deleteLeavePlan, updateLeavePlan, addLeave, createLeavePlan } from './services/leaveService';
import Calendar from './components/Calendar';
import { ExistingLeaveDetailContent } from './components/ExistingLeaveModal';
import OptimizerPanel from './components/OptimizerPanel';
import LeaveTracker from './components/LeaveTracker';
import LeaveSelectionBar from './components/LeaveSelectionBar';
import WfhCheckinModal from './components/WfhCheckinModal';
import NotificationPromptModal from './components/NotificationPromptModal';
import InstallPromptModal, { isRunningStandalone } from './components/InstallPromptModal';
import BackupModal from './components/BackupModal';
import OnboardingModal from './components/OnboardingModal';
import SettingsModal from './components/SettingsModal';
import HolidayManager from './components/HolidayManager';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import SplashScreen from './components/SplashScreen';
import ResetPasswordModal from './components/ResetPasswordModal';
import AppSkeleton from './components/AppSkeleton';
import CompanyInput from './components/CompanyInput';
import { APP_CONFIG } from './constants/brand';
import ThemeSelector from './components/ThemeSelector';
import DevToolsModal from './components/DevToolsModal';
import AppleWheelPicker from './components/AppleWheelPicker';
import AppleBalanceTicker from './components/AppleBalanceTicker';
import SegmentedPolicyTabs, { MorphingTabContent } from './components/SegmentedPolicyTabs';
import { getLeaveColor, getLeaveTheme, getShortform, COLOR_PALETTE, SELECTABLE_LEAVE_PALETTE } from './utils/colorUtils';
import { getSpecialBenefitIcon, BENEFIT_ICON_PRESETS } from './utils/specialBenefitUtils';
import { buildInitialLeaveConfigs, checkLeaveConstraints, deriveShortCode } from './services/leaveConfigService';
import { getCurrentUser, getCurrentSession, signOutUser, fetchUserProfile, upsertUserProfile, deleteUserAccount } from './services/authService';
import { supabase } from './lib/supabase';
import { exportUserDataToJson, exportUserDataToCsv, importUserDataFromJson } from './utils/dataMigration';
import { getCompanyLogoUrl, getCompanyInitials } from './utils/companyLogoUtils';
import TutorialOverlay from './components/TutorialOverlay';
import {
  isTutorialCompleted,
  markTutorialCompleted,
  resetTutorialStatus,
  getTutorialMonthIndex,
  SHORT_MONTH_NAMES
} from './services/tutorialService';
import DemoBanner from './components/DemoBanner';
import {
  getDemoUser,
  signOutDemoUser,
  fetchDemoProfile,
  upsertDemoProfile,
  clearDemoSession,
  enableDemoMode
} from './services/demoService';
import { isDemoModeActive } from './services/leaveService';
import { 
  showAppNotification, 
  requestNotificationPermission, 
  isNotificationSupported, 
  isNotificationGranted,
  subscribeUserToPush 
} from './utils/notificationService';
import { AiAssistantChatContent } from './components/AiAssistantModal';
import './index.css';

function App() {
  const [isDemoMode, setIsDemoMode] = useState(() => isDemoModeActive());

  useEffect(() => {
    const handleUrlChange = () => {
      setIsDemoMode(isDemoModeActive());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const isInitialAuthDone = useRef(false);
  const [showSplash, setShowSplash] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
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

  const [wfhModalOpen, setWfhModalOpen] = useState(false);
  const [hasPromptedWfh, setHasPromptedWfh] = useState(false);
  const [isMobileAiOpen, setIsMobileAiOpen] = useState(false);
  const [mobileAiMode, setMobileAiMode] = useState('compact'); // 'compact' | 'expanded'
  const [isAiPreview, setIsAiPreview] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('profile');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || 'User');
  const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(localStorage.getItem('company_logo_url') || '');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatar_url') || '');
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
    rh: { total: parseInt(localStorage.getItem('quota_rh') || '1', 10), used: 0, label: leaveNames.rh || 'Extra Leave', color: leaveColors.rh || 'green', bg: getLeaveColor(leaveColors.rh).bg, badge: getLeaveColor(leaveColors.rh).badge },
    wfh: { total: parseInt(localStorage.getItem('quota_wfh') || '10', 10), used: 0, label: leaveNames.wfh || 'Work From Home', color: leaveColors.wfh || 'cyan', bg: getLeaveColor(leaveColors.wfh).bg, badge: getLeaveColor(leaveColors.wfh).badge }
  });

  const [leaveConfigs, setLeaveConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem('leave_configs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return buildInitialLeaveConfigs({
      legacyQuotas: {
        pl: parseInt(localStorage.getItem('quota_pl') || '15', 10),
        el: parseInt(localStorage.getItem('quota_el') || '10', 10),
        rh: parseInt(localStorage.getItem('quota_rh') || '1', 10),
        wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10),
      },
      legacyNames: (function() {
        try {
          const s = localStorage.getItem('leave_names');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      })(),
      legacyColors: (function() {
        try {
          const s = localStorage.getItem('leave_colors');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      })()
    });
  });

  const mainScrollContainerRef = useRef(null);
  const [bookedDates, setBookedDates] = useState([]);
  const [leavePlans, setLeavePlans] = useState([]);
  const [previewDates, setPreviewDates] = useState([]);
  const [suggestedPlanName, setSuggestedPlanName] = useState(null);

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
  useEffect(() => {
    setCompanyLogoError(false);
  }, [companyName, companyLogoUrl]);
  const [mobileFormQuotas, setMobileFormQuotas] = useState({ pl: 15, el: 10, rh: 1, wfh: 10 });
  const [mobileFormNames, setMobileFormNames] = useState({});
  const [mobileFormColors, setMobileFormColors] = useState({});
  const [mobileLeaveConfigs, setMobileLeaveConfigs] = useState(() => leaveConfigs);
  const [mobileQuotasTierTab, setMobileQuotasTierTab] = useState('annual'); // 'annual' | 'remote' | 'special'
  const [editingMobileSpecialId, setEditingMobileSpecialId] = useState(null);
  const [showMobileAddAnnual, setShowMobileAddAnnual] = useState(false);
  const [mobileNewAnnualName, setMobileNewAnnualName] = useState('');
  const [showMobileAddSpecial, setShowMobileAddSpecial] = useState(false);
  const [mobileNewSpecialName, setMobileNewSpecialName] = useState('');
  const [mobileNewSpecialQuota, setMobileNewSpecialQuota] = useState('1');
  const [mobileNewSpecialCadence, setMobileNewSpecialCadence] = useState('month');
  const [mobileNewSpecialColor, setMobileNewSpecialColor] = useState('pink');
  const [mobileNewSpecialIcon, setMobileNewSpecialIcon] = useState('heart');
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

  const updateMobileConfig = (id, updates) => {
    setMobileLeaveConfigs(prev => (prev || []).map(c => {
      if (c.id !== id) return c;
      const next = { ...c, ...updates };
      if (updates.constraints) {
        next.constraints = { ...c.constraints, ...updates.constraints };
      }
      return next;
    }));

    if (['pl', 'el', 'rh', 'wfh'].includes(id)) {
      if (updates.quota !== undefined) {
        setMobileFormQuotas(prev => ({ ...prev, [id]: updates.quota }));
      }
      if (updates.name !== undefined) {
        setMobileFormNames(prev => ({ ...prev, [id]: updates.name }));
      }
      if (updates.color !== undefined) {
        setMobileFormColors(prev => ({ ...prev, [id]: updates.color }));
      }
    }
  };

  const removeMobileConfig = (id) => {
    setMobileLeaveConfigs(prev => (prev || []).filter(c => c.id !== id));
    if (editingMobileSpecialId === id) setEditingMobileSpecialId(null);
  };

  const handleMobileAddAnnual = () => {
    if (!mobileNewAnnualName.trim()) return;
    const nameTrim = mobileNewAnnualName.trim();
    const shortCode = deriveShortCode(nameTrim);
    const newId = `annual_${Date.now()}`;
    const newConf = {
      id: newId,
      name: nameTrim,
      shortCode,
      color: 'indigo',
      quota: 5,
      enabled: true,
      tier: 'annual',
      deductsFromAnnual: true,
      cadence: 'year',
      constraints: { maxConsecutive: 5, requiresNote: false }
    };
    setMobileLeaveConfigs(prev => [...(prev || []), newConf]);
    setMobileNewAnnualName('');
    setShowMobileAddAnnual(false);
  };

  const handleMobileAddSpecial = () => {
    if (!mobileNewSpecialName.trim()) return;
    const nameTrim = mobileNewSpecialName.trim();
    const shortCode = deriveShortCode(nameTrim);
    const quota = Math.max(1, parseInt(mobileNewSpecialQuota, 10) || 1);
    const newId = `special_${Date.now()}`;
    const newConf = {
      id: newId,
      name: nameTrim,
      shortCode,
      color: mobileNewSpecialColor || 'pink',
      quota,
      cadence: mobileNewSpecialCadence || 'month',
      icon: mobileNewSpecialIcon || 'heart',
      enabled: true,
      tier: 'special',
      deductsFromAnnual: false,
      constraints: { maxConsecutive: 3, requiresNote: false }
    };
    setMobileLeaveConfigs(prev => [...(prev || []), newConf]);
    setMobileNewSpecialName('');
    setMobileNewSpecialQuota('1');
    setMobileNewSpecialCadence('month');
    setMobileNewSpecialColor('pink');
    setMobileNewSpecialIcon('heart');
    setShowMobileAddSpecial(false);
  };

  const mobileAnnualConfigs = useMemo(() => {
    return (mobileLeaveConfigs || []).filter(c => c.tier === 'annual' || (!c.tier && c.id !== 'wfh'));
  }, [mobileLeaveConfigs]);

  const mobileWfhConfig = useMemo(() => {
    return (mobileLeaveConfigs || []).find(c => c.id === 'wfh') || {
      id: 'wfh',
      name: mobileFormNames.wfh || 'Work From Home',
      shortCode: 'WFH',
      quota: mobileFormQuotas.wfh ?? 10,
      color: mobileFormColors.wfh || 'cyan',
      enabled: true,
      tier: 'remote',
      cadence: 'month'
    };
  }, [mobileLeaveConfigs, mobileFormNames, mobileFormQuotas, mobileFormColors]);

  const mobileSpecialConfigs = useMemo(() => {
    return (mobileLeaveConfigs || []).filter(c => c.tier === 'special');
  }, [mobileLeaveConfigs]);
  const [selectionStart, setSelectionStart] = useState(null);
  const [mobileConfirmOpen, setMobileConfirmOpen] = useState(false);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  // Mobile confirmation form state
  const [mobileLeaveType, setMobileLeaveType] = useState('pl');
  const [mobilePlanName, setMobilePlanName] = useState('');
  const [mobileNote, setMobileNote] = useState('');
  const [mobileDuration, setMobileDuration] = useState(1);
  const [mobileFromHour, setMobileFromHour] = useState(9);
  const [mobileToHour, setMobileToHour] = useState(18);
  const [mobileTickerData, setMobileTickerData] = useState(null);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [calendarStyle, setCalendarStyle] = useState(localStorage.getItem('calendar_cell_style') || 'capsule');
  const [focusedCellHeight, setFocusedCellHeight] = useState(Number(localStorage.getItem('dev_focused_cell_height') || 56));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [topbarTierTab, setTopbarTierTab] = useState('annual'); // 'annual' | 'special' | 'remote'
  const [mobileMenuTierTab, setMobileMenuTierTab] = useState('annual'); // 'annual' | 'special' | 'remote'
  const [mobileModalTierTab, setMobileModalTierTab] = useState('annual'); // 'annual' | 'special' | 'remote'

  const annualTrackerEntries = useMemo(() => {
    if (Array.isArray(leaveConfigs) && leaveConfigs.length > 0) {
      return leaveConfigs.filter(c => c.tier === 'annual' && c.enabled).map(c => {
        const data = leaves[c.id] || { total: c.quota, used: 0, label: c.name };
        const total = data.total ?? c.quota ?? 0;
        const used = data.used ?? 0;
        const rem = Math.max(0, total - used);
        return {
          id: c.id,
          shortCode: c.shortCode || getShortform(c.name, c.id.toUpperCase()),
          name: c.name,
          color: c.color || 'blue',
          total,
          used,
          remaining: Number.isInteger(rem) ? rem : rem.toFixed(1)
        };
      });
    }
    return ['pl', 'el', 'rh'].map(k => {
      const data = leaves[k] || { total: 10, used: 0, label: k };
      const rem = Math.max(0, data.total - data.used);
      return {
        id: k,
        shortCode: k.toUpperCase(),
        name: leaveNames[k] || data.label,
        color: leaveColors[k] || 'blue',
        total: data.total,
        used: data.used,
        remaining: Number.isInteger(rem) ? rem : rem.toFixed(1)
      };
    });
  }, [leaveConfigs, leaves, leaveNames, leaveColors]);

  const specialTrackerEntries = useMemo(() => {
    if (Array.isArray(leaveConfigs) && leaveConfigs.length > 0) {
      return leaveConfigs.filter(c => c.tier === 'special' && c.enabled).map(c => {
        const data = leaves[c.id] || { total: c.quota, used: 0, label: c.name };
        const total = data.total ?? c.quota ?? 1;
        const used = data.used ?? 0;
        const rem = Math.max(0, total - used);
        return {
          id: c.id,
          shortCode: c.shortCode || getShortform(c.name, c.id.toUpperCase()),
          name: c.name,
          color: c.color || 'pink',
          cadence: c.cadence || 'month',
          total,
          used,
          remaining: Number.isInteger(rem) ? rem : rem.toFixed(1)
        };
      });
    }
    return [];
  }, [leaveConfigs, leaves]);

  const remoteTrackerEntry = useMemo(() => {
    const curMonthKey = new Date().toISOString().substring(0, 7);
    const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(curMonthKey)).length;
    const maxWfh = parseInt(localStorage.getItem('quota_wfh') || '10', 10);
    const rem = Math.max(0, maxWfh - wfhUsedThisMonth);
    return {
      id: 'wfh',
      shortCode: 'WFH',
      name: leaveNames.wfh || 'Work From Home',
      color: leaveColors.wfh || 'cyan',
      total: maxWfh,
      used: wfhUsedThisMonth,
      remaining: rem
    };
  }, [bookedDates, leaveNames.wfh, leaveColors.wfh]);

  // Calculate current mobile balance and needed leave units
  const selectedMobileBal = useMemo(() => {
    const item = Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === mobileLeaveType) : null;
    if (mobileLeaveType === 'wfh') {
      const targetMonthKey = (previewDates[0] || '').substring(0, 7) || getTodayStr().substring(0, 7);
      const wfhUsedThisMonth = Array.isArray(bookedDates)
        ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).reduce((s, b) => s + (b.duration || 1), 0)
        : 0;
      return Math.max(0, (item?.quota || 10) - wfhUsedThisMonth);
    }
    if (item?.cadence === 'month') {
      return Math.max(0, (item.quota || 1) - (leaves[item.id]?.used || 0));
    }
    const total = item?.quota || (leaves[mobileLeaveType]?.total ?? 15);
    const used = leaves[mobileLeaveType]?.used ?? 0;
    return Math.max(0, total - used);
  }, [leaveConfigs, mobileLeaveType, previewDates, bookedDates, leaves]);

  const actualLeavesMobile = useMemo(() => {
    return previewDates.filter(d => !isHoliday(d) && !isWeekend(d)).length;
  }, [previewDates]);

  const activeMobileConfig = useMemo(() => {
    return Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === mobileLeaveType) : null;
  }, [leaveConfigs, mobileLeaveType]);

  const allowsHalfDayMobile = activeMobileConfig ? activeMobileConfig.allowsHalfDay !== false : (mobileLeaveType === 'el' || mobileLeaveType === 'pl');
  const isMobileHalfDay = previewDates.length === 1 && allowsHalfDayMobile && mobileDuration === 0.5;
  const mobileLeavesNeeded = isMobileHalfDay ? 0.5 : actualLeavesMobile;

  // Auto-switch mobile duration to 0.5 when balance is exactly 0.5 or less than 1
  useEffect(() => {
    if (previewDates.length === 1 && mobileLeaveType) {
      if (allowsHalfDayMobile && selectedMobileBal < 1 && selectedMobileBal >= 0.5) {
        setMobileDuration(0.5);
      } else if (selectedMobileBal >= 1) {
        setMobileDuration(1);
      }
    }
  }, [mobileLeaveType, previewDates.length, selectedMobileBal, allowsHalfDayMobile]);

  // Keep mobile modal active tab in sync and pre-select available category if current has zero balance
  useEffect(() => {
    if (mobileConfirmOpen && mobileLeaveType) {
      const curCfg = Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === mobileLeaveType) : null;
      if (curCfg) {
        if (curCfg.tier === 'annual') setMobileModalTierTab('annual');
        else if (curCfg.tier === 'special') setMobileModalTierTab('special');
        else if (curCfg.tier === 'monthly' || curCfg.tier === 'remote' || curCfg.id === 'wfh') setMobileModalTierTab('remote');
      } else if (mobileLeaveType === 'wfh') {
        setMobileModalTierTab('remote');
      }

      if (previewDates.length === 1) {
        if (allowsHalfDayMobile && selectedMobileBal < 1 && selectedMobileBal >= 0.5) {
          setMobileDuration(0.5);
        } else {
          setMobileDuration(1);
        }
      }

      // If currently selected leave has zero balance, try to find an available category
      if (selectedMobileBal <= 0 && Array.isArray(leaveConfigs)) {
        const available = leaveConfigs.find(c => {
          if (!c.enabled) return false;
          if (c.id === 'wfh') {
            const targetMonthKey = (previewDates[0] || '').substring(0, 7) || getTodayStr().substring(0, 7);
            const wfhUsed = Array.isArray(bookedDates)
              ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).reduce((s, b) => s + (b.duration || 1), 0)
              : 0;
            return ((c.quota || 10) - wfhUsed) > 0;
          }
          const tot = c.quota || (leaves[c.id]?.total ?? 10);
          const u = leaves[c.id]?.used ?? 0;
          return (tot - u) > 0;
        });
        if (available) {
          setMobileLeaveType(available.id);
          if (available.tier) setMobileModalTierTab(available.tier === 'monthly' ? 'remote' : available.tier);
        }
      }
    }
  }, [mobileConfirmOpen, mobileLeaveType, leaveConfigs, selectedMobileBal, allowsHalfDayMobile, previewDates, bookedDates, leaves]);

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

  useEffect(() => {
    loadLeaves();
    checkAuthUser();

    // Listen to Supabase auth state changes (e.g. Google OAuth redirect return, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetPasswordModalOpen(true);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setShowSplash(true);
        return;
      }
      // Do not allow initial auth state changes to disrupt initial skeleton window
      if (!isInitialAuthDone.current) return;
      if (isDemoMode) return;
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) setCurrentUser(session.user);
        return;
      }
      if (session?.user && event === 'SIGNED_IN') {
        handleAuthSuccess(session.user);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Multi-device & multi-instance realtime synchronization
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
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id, isDemoMode]);

  // Cross-tab / cross-instance broadcast channel for instantaneous local sync
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

    return () => {
      try {
        bc?.close();
      } catch (e) {}
    };
  }, [currentUser]);

  // Handle password recovery link routing from email (#type=recovery or #reset-password)
  useEffect(() => {
    const checkRecoveryHash = () => {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') || hash.includes('reset-password')) {
        setResetPasswordModalOpen(true);
      }
    };
    checkRecoveryHash();
    window.addEventListener('hashchange', checkRecoveryHash);
    return () => window.removeEventListener('hashchange', checkRecoveryHash);
  }, []);

  // Handle notification click routing (?action=attendance)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('action') === 'attendance') {
        setWfhModalOpen(true);
        const cleanUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState(null, '', cleanUrl);
      }
    } catch (e) {
      console.warn('Error checking URL search parameters:', e);
    }
  }, []);

  // PWA Standalone Detection & Global Listeners
  useEffect(() => {
    const isStandalone = isRunningStandalone();
    setIsStandaloneApp(isStandalone);

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

  // Auto-prompt Install Modal for logged-in users on new session (only if onboarding & tutorial are completed)
  useEffect(() => {
    if (isAuthChecking || !currentUser || onboardingOpen || isTutorialActive) return;

    try {
      const isStandalone = isRunningStandalone();
      const dismissedPermanent = localStorage.getItem('pwa_prompt_dismissed_permanent') === 'true';
      const sessionPrompted = sessionStorage.getItem('pwa_session_prompted') === 'true';
      const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
      const tutorialDone = isTutorialCompleted();

      if (!isStandalone && !dismissedPermanent && !sessionPrompted && onboardingCompleted && tutorialDone) {
        sessionStorage.setItem('pwa_session_prompted', 'true');
        const timer = setTimeout(() => {
          setInstallModalOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, [isAuthChecking, currentUser, onboardingOpen, isTutorialActive]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setMobileSubView(null);
      setEditingMobileSpecialId(null);
      setShowMobileAddAnnual(false);
      setShowMobileAddSpecial(false);
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
      setMobileLeaveConfigs(leaveConfigs ? JSON.parse(JSON.stringify(leaveConfigs)) : []);
      setEditingMobileSpecialId(null);
      setShowMobileAddAnnual(false);
      setShowMobileAddSpecial(false);
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
      },
      wfh: { 
        ...prev.wfh, 
        total: wfhQuota, 
        label: namesToUse.wfh || prev.wfh?.label || 'Work From Home', 
        color: colorsToUse.wfh || prev.wfh?.color || 'cyan',
        bg: getLeaveColor(colorsToUse.wfh || prev.wfh?.color || 'cyan').bg,
        badge: getLeaveColor(colorsToUse.wfh || prev.wfh?.color || 'cyan').badge
      }
    }));

    if (profile.leave_configs) {
      setLeaveConfigs(profile.leave_configs);
      localStorage.setItem('leave_configs', JSON.stringify(profile.leave_configs));
    } else {
      let existingConfigs = null;
      try {
        const raw = localStorage.getItem('leave_configs');
        if (raw) existingConfigs = JSON.parse(raw);
      } catch (e) {}

      if (Array.isArray(existingConfigs) && existingConfigs.length > 0) {
        setLeaveConfigs(existingConfigs);
      } else {
        const built = buildInitialLeaveConfigs({
          legacyQuotas: { pl: plQuota, el: elQuota, rh: rhQuota, wfh: wfhQuota },
          legacyNames: namesToUse,
          legacyColors: colorsToUse,
        });
        setLeaveConfigs(built);
        localStorage.setItem('leave_configs', JSON.stringify(built));
      }
    }
  };

  const checkAuthUser = async () => {
    const startTime = Date.now();
    const waitRemaining = async (minMs = 1000) => {
      const elapsed = Date.now() - startTime;
      if (elapsed < minMs) {
        await new Promise(res => setTimeout(res, minMs - elapsed));
      }
    };

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
          await loadLeaves(demoUser);
          await waitRemaining(300);
          isInitialAuthDone.current = true;
          setIsAuthChecking(false);
          setShowSplash(false);
        } else {
          // Show the Demo Sign-Up screen so it follows the full onboarding flow!
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
    setIsLeavesLoaded(false);

    if (user) {
      const nameToUse = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || userName;
      setUserName(nameToUse);
      localStorage.setItem('user_name', nameToUse);

      if (isDemoMode) {
        const demoProfile = await fetchDemoProfile(user.id);
        if (demoProfile) syncProfileToState(demoProfile, user);
        const demoDone = sessionStorage.getItem('demo_onboarding_completed') === 'true' || isTutorialCompleted();
        if (!demoDone) {
          setOnboardingOpen(true);
        }
        await loadLeaves(user);
        setShowSplash(false);
        return;
      }

      const profilePromise = fetchUserProfile(user.id);
      const leavesPromise = loadLeaves(user);
      const [profile] = await Promise.all([profilePromise, leavesPromise]);

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

      setShowSplash(false);
    } else {
      setShowSplash(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (isDemoMode) {
      clearDemoSession();
      setCurrentUser(null);
      setBookedDates([]);
      setLeavePlans([]);
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
      setSettingsModalOpen(false);
      setAuthModalOpen(false);
      setIsAuthChecking(false);
      setBookedDates([]);
      setLeavePlans([]);
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
      await loadLeaves(null);
    }
  };

  const handleRestartDemo = async () => {
    clearDemoSession();
    enableDemoMode();
    setIsDemoMode(true);
    resetTutorialStatus();
    sessionStorage.removeItem('demo_onboarding_completed');
    localStorage.removeItem('onboarding_completed');
    setIsTutorialActive(false);
    setTutorialStepIndex(0);
    setSelectionStart(null);
    setPreviewDates([]);
    setHoveredSuggestion(null);
    setMobileConfirmOpen(false);
    setIsMobileMenuOpen(false);
    setMobileSubView(null);
    setActiveTab('calendar');
    setCalendarViewMode(window.innerWidth < 768 ? 'monthly' : 'yearly');
    setLeavePlans([]);
    setBookedDates([]);
    setCurrentUser(null);
    setUserName('Demo User');
    setCompanyName('Acme Corp');
    setWfhModalOpen(false);
    setSettingsModalOpen(false);
    setAuthModalOpen(false);
    setOnboardingOpen(false);
    setShowSplash(true);
    await loadLeaves(null);
  };

  const handleExitDemo = () => {
    clearDemoSession();
    setIsDemoMode(false);
    setCurrentUser(null);
    setBookedDates([]);
    setLeavePlans([]);
    if (window.location.hash.includes('demo') || window.location.pathname.startsWith('/demo')) {
      window.history.replaceState(null, '', '/');
    }
    window.location.href = '/';
  };

  const handleEnterDemoMode = async () => {
    enableDemoMode();
    setIsDemoMode(true);
    if (!window.location.pathname.startsWith('/demo') && !window.location.hash.includes('demo')) {
      window.history.replaceState(null, '', '#/demo');
    }
    const { user } = await signUpDemoUser({
      name: 'Demo User',
      email: 'demo@example.com'
    });
    await handleAuthSuccess(user);
    setShowSplash(false);
    setAuthModalOpen(false);
  };

  // Persistent Notification Permission Prompt (Until "Not Needed" is clicked)
  useEffect(() => {
    if (!isLeavesLoaded || onboardingOpen || isTutorialActive || installModalOpen || wfhModalOpen || showSplash) return;
    const isDismissed = localStorage.getItem('notif_prompt_dismissed') === 'true';
    if (isNotificationSupported()) {
      try {
        if (Notification.permission !== 'granted' && !isDismissed) {
          setNotifModalOpen(true);
        }
      } catch (e) {
        console.warn('Could not query Notification permission state:', e);
      }
    }
  }, [isLeavesLoaded, onboardingOpen, isTutorialActive, installModalOpen, wfhModalOpen, showSplash]);

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

  const [wfhPromptHour, setWfhPromptHour] = useState(localStorage.getItem('wfh_prompt_hour') || '12');

  // Auto-dismiss or suppress attendance modal whenever today's status is already recorded in bookedDates
  useEffect(() => {
    if (!isLeavesLoaded) return;
    const todayStr = getTodayStr();
    const hasStatusRecorded = bookedDates.some(b => b.date === todayStr);
    if (hasStatusRecorded) {
      setHasPromptedWfh(true);
      if (wfhModalOpen) {
        setWfhModalOpen(false);
      }
    }
  }, [isLeavesLoaded, bookedDates, wfhModalOpen, devDateStr]);

  // Daily Working Day Attendance Check-in Prompt
  useEffect(() => {
    if (!isLeavesLoaded) return;

    const checkAndTriggerAttendancePrompt = () => {
      const todayStr = getTodayStr();
      const isWorkday = !isWeekend(todayStr) && !isHoliday(todayStr);
      const hasStatusRecorded = bookedDates.some(b => b.date === todayStr);
      const now = getTodayDate();
      const promptHourNum = parseInt(wfhPromptHour || '12', 10);
      const isAfterPromptHour = devDateStr ? true : now.getHours() >= promptHourNum;

      if (hasStatusRecorded) {
        setHasPromptedWfh(true);
        if (wfhModalOpen) {
          setWfhModalOpen(false);
        }
        return;
      }

      // Only prompt attendance if onboarding, tutorial, splash, and install modal are not active
      if (isWorkday && !hasStatusRecorded && isAfterPromptHour && !hasPromptedWfh && !onboardingOpen && !isTutorialActive && !installModalOpen && !showSplash) {
        setWfhModalOpen(true);
        setHasPromptedWfh(true);

        const period = promptHourNum >= 12 ? 'PM' : 'AM';
        const displayH = promptHourNum > 12 ? promptHourNum - 12 : (promptHourNum === 0 ? 12 : promptHourNum);
        showAppNotification('Daily Attendance Check-in', {
          body: `It is past ${displayH} ${period}. Please confirm if today (${todayStr}) is WFH or In-Office.`,
          tag: `wfh-checkin-${todayStr}`
        });
      }
    };

    // Run check immediately
    checkAndTriggerAttendancePrompt();

    // Check periodically and sync fresh database leaves when app gains focus or becomes visible across multiple devices/instances
    const handleSyncAndCheck = async () => {
      if (currentUser?.id || isDemoMode) {
        await loadLeaves(currentUser);
      }
      checkAndTriggerAttendancePrompt();
    };

    const intervalId = setInterval(handleSyncAndCheck, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSyncAndCheck();
      }
    };

    window.addEventListener('focus', handleSyncAndCheck);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleSyncAndCheck);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLeavesLoaded, bookedDates, hasPromptedWfh, devDateStr, wfhPromptHour, onboardingOpen, isTutorialActive, installModalOpen, showSplash, wfhModalOpen, currentUser]);

  const handleWfhStatusSelect = async (statusType) => {
    const todayStr = getTodayStr();
    setHasPromptedWfh(true);
    setWfhModalOpen(false);
    await addLeave(todayStr, statusType, statusType === 'wfh' ? 'Work From Home' : 'In-Office', null, 1, currentUser?.id);
    await loadLeaves();
    try {
      const bc = new BroadcastChannel('leave-vault-sync');
      bc.postMessage({ type: 'LEAVES_UPDATED', todayStr, statusType });
      bc.close();
    } catch (e) {}
  };

  const handleWfhMarkLeave = () => {
    const todayStr = getTodayStr();
    setWfhModalOpen(false);
    setActiveTab('calendar');
    setSelectionStart(todayStr);
    setPreviewDates([todayStr]);
    setMobileConfirmOpen(true);
  };

  const handleExecuteAiAction = async (action, details) => {
    if (!details) return;

    if (action === 'stage_plan') {
      const planName = details.planName || 'Vacation Plan';
      const startDate = details.startDate;
      const endDate = details.endDate || startDate;
      const leaveType = (details.leaveType || 'pl').toLowerCase();

      // Determine which dates need to be booked (exclude weekends and public holidays)
      let workingDatesToBook = [];
      if (Array.isArray(details.dates) && details.dates.length > 0) {
        workingDatesToBook = details.dates.filter(d => !isHoliday(d) && !isWeekend(d));
      }
      if (workingDatesToBook.length === 0 && startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dStr = `${y}-${m}-${day}`;
          if (!isHoliday(dStr) && !isWeekend(dStr)) {
            workingDatesToBook.push(dStr);
          }
        }
      }
      if (workingDatesToBook.length === 0 && startDate) {
        workingDatesToBook = [startDate];
      }

      const curTotal = leaves && leaves[leaveType] ? leaves[leaveType].total : 15;
      const curUsed = leaves && leaves[leaveType] ? leaves[leaveType].used : 0;
      const curRemaining = Math.max(0, curTotal - curUsed);
      const requiredDays = workingDatesToBook.length;

      if (curRemaining < requiredDays) {
        alert(`Cannot book leave: Insufficient ${leaveNames[leaveType] || leaveType.toUpperCase()} quota (only ${curRemaining} remaining, but ${requiredDays} required).`);
        return;
      }

      let planId = null;
      const existingPlan = (leavePlans || []).find(p => 
        (p.name?.trim().toLowerCase() === planName.trim().toLowerCase()) &&
        (p.start_date === startDate || p.startDate === startDate) &&
        (p.end_date === endDate || p.endDate === endDate)
      );

      if (existingPlan) {
        planId = existingPlan.id;
      } else {
        try {
          const plan = await createLeavePlan(planName, startDate, endDate, currentUser?.id);
          planId = plan?.id || null;
        } catch (err) {
          console.error('Failed to create leave plan in database:', err);
        }
      }

      for (const d of workingDatesToBook) {
        await addLeave(d, leaveType, details.note || planName, planId, 1, currentUser?.id);
      }
      await loadLeaves();
    } else if (action === 'stage_leave') {
      const lType = (details.leaveType || 'pl').toLowerCase();
      const rawDates = Array.isArray(details.dates) && details.dates.length > 0
        ? details.dates
        : (details.startDate ? [details.startDate] : []);
      const datesToBook = rawDates.filter(d => !isHoliday(d) && !isWeekend(d));
      const finalDates = datesToBook.length > 0 ? datesToBook : rawDates;

      const curTotal = leaves && leaves[lType] ? leaves[lType].total : 15;
      const curUsed = leaves && leaves[lType] ? leaves[lType].used : 0;
      const curRemaining = Math.max(0, curTotal - curUsed);
      const requiredDays = finalDates.length;

      if (curRemaining < requiredDays) {
        alert(`Cannot book leave: Insufficient ${leaveNames[lType] || lType.toUpperCase()} quota (only ${curRemaining} remaining, but ${requiredDays} required).`);
        return;
      }

      for (const d of finalDates) {
        await addLeave(d, lType, details.note || 'Leave', null, 1, currentUser?.id);
      }
      await loadLeaves();
    } else if (action === 'log_wfh') {
      const datesToBook = Array.isArray(details.dates) && details.dates.length > 0
        ? details.dates
        : (details.startDate ? [details.startDate] : []);

      for (const d of datesToBook) {
        await addLeave(d, 'wfh', details.note || 'Work From Home', null, 1, currentUser?.id);
      }
      await loadLeaves();
    } else if (action === 'cancel_leave' || action === 'delete_leave') {
      const datesToCancel = details.dates || (details.startDate ? [details.startDate] : []);
      for (const d of datesToCancel) {
        await removeLeave(d, currentUser?.id);
      }
      if (details.planId) {
        await deleteLeavePlan(details.planId, currentUser?.id);
      } else if (details.planName) {
        const foundPlan = leavePlans.find(p => p.name?.toLowerCase() === details.planName?.toLowerCase());
        if (foundPlan) {
          await deleteLeavePlan(foundPlan.id, currentUser?.id);
        }
      }
      await loadLeaves();
    }

    // Clear AI preview & focused highlight from calendar so it returns to normal state
    setPreviewDates([]);
    setIsAiPreview(false);
    setSuggestedPlanName(null);
    setHoveredSuggestion(null);
    setSelectionStart(null);
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

    const targetMonthKey = getTodayStr().substring(0, 7);
    const wfhUsed = datesArray
      .filter(d => d.type === 'wfh' && typeof d.date === 'string' && d.date.startsWith(targetMonthKey))
      .reduce((sum, d) => sum + (d.duration || 1), 0);

    setLeaves(prev => {
      const next = {
        ...prev,
        pl: { ...prev.pl, used: plUsed },
        el: { ...prev.el, used: elUsed },
        rh: { ...prev.rh, used: rhUsed },
        wfh: { ...prev.wfh, used: wfhUsed, total: prev.wfh?.total || parseInt(localStorage.getItem('quota_wfh') || '10', 10) }
      };

      if (Array.isArray(leaveConfigs)) {
        leaveConfigs.forEach(c => {
          const usedForType = datesArray
            .filter(d => d.type === c.id && (c.cadence === 'month' ? typeof d.date === 'string' && d.date.startsWith(targetMonthKey) : true))
            .reduce((sum, d) => sum + (d.duration || 1), 0);
          const clr = c.color || 'blue';
          next[c.id] = {
            total: c.quota,
            used: usedForType,
            label: c.name,
            color: clr,
            bg: getLeaveColor(clr).bg,
            badge: getLeaveColor(clr).badge,
            tier: c.tier,
            deductsFromAnnual: c.deductsFromAnnual
          };
        });
      }

      return next;
    });
  };

  const handleSaveSettings = async ({ name, companyName, companyLogoUrl, avatarUrl, quotas, names, colors, leaveConfigs: newLeaveConfigs, wfhPromptHour: newPromptHour }) => {
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
      if (!isTutorialActive && !onboardingOpen) {
        setHasPromptedWfh(false);
      }
    }
    if (newLeaveConfigs) {
      setLeaveConfigs(newLeaveConfigs);
      localStorage.setItem('leave_configs', JSON.stringify(newLeaveConfigs));
    }
    if (quotas) {
      if (quotas.pl !== undefined) localStorage.setItem('quota_pl', quotas.pl);
      if (quotas.el !== undefined) localStorage.setItem('quota_el', quotas.el);
      if (quotas.rh !== undefined) localStorage.setItem('quota_rh', quotas.rh);
      if (quotas.wfh !== undefined) localStorage.setItem('quota_wfh', quotas.wfh);
    }
    if (names) {
      setLeaveNames(names);
      localStorage.setItem('leave_names', JSON.stringify(names));
    }
    if (colors) {
      setLeaveColors(colors);
      localStorage.setItem('leave_colors', JSON.stringify(colors));
    }

    if (names || colors || quotas || newLeaveConfigs) {
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

        if (Array.isArray(newLeaveConfigs)) {
          newLeaveConfigs.forEach(c => {
            const clr = c.color || 'blue';
            next[c.id] = {
              ...(next[c.id] || {}),
              total: c.quota,
              used: next[c.id]?.used || 0,
              label: c.name,
              color: clr,
              bg: getLeaveColor(clr).bg,
              badge: getLeaveColor(clr).badge,
              tier: c.tier,
              deductsFromAnnual: c.deductsFromAnnual
            };
          });
        }

        return { ...next };
      });
    }

    if (isDemoMode) {
      upsertDemoProfile(currentUser?.id || 'demo-user', {
        name: name || userName,
        company_name: companyName !== undefined ? companyName : companyName,
        company_logo_url: companyLogoUrl !== undefined ? companyLogoUrl : companyLogoUrl,
        avatar_url: avatarUrl !== undefined ? avatarUrl : avatarUrl,
        quota_pl: quotas ? quotas.pl : leaves.pl.total,
        quota_el: quotas ? quotas.el : leaves.el.total,
        quota_rh: quotas ? quotas.rh : leaves.rh.total,
        quota_wfh: quotas ? quotas.wfh : parseInt(localStorage.getItem('quota_wfh') || '10', 10),
        leave_names: names || leaveNames,
        leave_colors: colors || leaveColors,
        leave_configs: newLeaveConfigs || leaveConfigs,
        wfh_prompt_hour: newPromptHour !== undefined ? newPromptHour : (wfhPromptHour || '12')
      });
    } else {
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
          leave_configs: newLeaveConfigs || leaveConfigs,
          wfhPromptHour: newPromptHour !== undefined ? newPromptHour : (wfhPromptHour || '12')
        });
      }
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
      },
      wfh: { 
        ...prev.wfh, 
        total: quotas ? quotas.wfh : (prev.wfh?.total || 10), 
        label: updatedNames.wfh || prev.wfh?.label || 'Work From Home', 
        color: updatedColors.wfh || prev.wfh?.color || 'cyan',
        bg: getLeaveColor(updatedColors.wfh || prev.wfh?.color || 'cyan').bg,
        badge: getLeaveColor(updatedColors.wfh || prev.wfh?.color || 'cyan').badge
      }
    }));
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

  const handlePreviewRange = (datesArray, holidayName = null, options = {}) => {
    setActiveTab('calendar');
    setSuggestedPlanName(holidayName || null);
    setPreviewDates(datesArray || []);
    
    if (datesArray && datesArray.length > 0) {
      const firstDate = new Date(datesArray[0]);
      if (!isNaN(firstDate.getTime())) {
        setCalendarFocusedMonth(firstDate.getMonth());
        setCalendarViewMode('monthly');
      }
    }

    if (options && options.isAiChat) {
      setIsAiPreview(true);
    } else {
      setIsAiPreview(false);
    }
    scrollToTop();
  };

  const handleClearAiPreview = () => {
    setIsAiPreview(false);
    setPreviewDates([]);
    setSuggestedPlanName(null);
    setHoveredSuggestion(null);
  };

  // Remove AI preview focus if clicking anywhere outside the chatbox window
  useEffect(() => {
    if (!isAiPreview) return;

    const handleOutsideChatClick = (e) => {
      const isInsideChat = e.target.closest?.('.ai-chat-panel, .ai-assistant-modal, [data-ai-chat]');
      if (!isInsideChat) {
        handleClearAiPreview();
      }
    };

    document.addEventListener('pointerdown', handleOutsideChatClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideChatClick);
    };
  }, [isAiPreview]);

  useEffect(() => {
    if (previewDates.length > 0) {
      const holidayInWindow = previewDates.map(d => publicHolidays.find(h => h.date === d)).find(Boolean);
      const holidayTitle = suggestedPlanName || (holidayInWindow ? holidayInWindow.name : null);

      const first = new Date(previewDates[0]);
      const last = new Date(previewDates[previewDates.length - 1]);
      const name = holidayTitle
        ? holidayTitle
        : (previewDates.length > 1
            ? `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
      setMobilePlanName(name);
    }
  }, [previewDates.length, suggestedPlanName, previewDates[0]]);

  const handleMobileApply = async () => {
    if (isTutorialActive) {
      // Sandboxed demo plan for tutorial mode: do NOT write to real database
      const chosenName = mobilePlanName || defaultTutorialPlanName;
      setTutorialCustomName(chosenName);
      setLeavePlans(prev => [
        {
          id: 'tutorial-demo-plan-temp',
          name: chosenName,
          start_date: tutorialStartDate,
          end_date: tutorialEndDate,
          startDate: tutorialStartDate,
          endDate: tutorialEndDate,
          type: 'pl',
          is_demo: true
        },
        ...prev.filter(p => p.id !== 'tutorial-demo-plan-temp')
      ]);
      setPreviewDates([]);
      setSelectionStart(null);
      setMobileConfirmOpen(false);
      setMobileNote('');
      setMobileLeaveType('pl');
      setActiveTab('tracker');
      setTutorialStepIndex(6);
      return;
    }
    const dates = previewDates;
    const actualLeaves = dates.filter(d => !isHoliday(d) && !isWeekend(d)).length;
    const type = (mobileLeaveType || 'pl').toLowerCase();
    const activeConfig = Array.isArray(leaveConfigs) ? leaveConfigs.find(c => c.id === type) : null;
    const allowsHalf = activeConfig ? activeConfig.allowsHalfDay !== false : (type === 'el' || type === 'pl');
    const isHalfDay = allowsHalf && dates.length === 1 && mobileDuration === 0.5;
    const durationPerDay = isHalfDay ? 0.5 : 1;
    const leavesNeeded = isHalfDay ? 0.5 : actualLeaves;

    const maxWfh = activeConfig?.quota || 10;
    let curBalance = 0;
    let total = activeConfig?.quota || (leaves[type]?.total || 15);

    if (type === 'wfh') {
      const targetMonthKey = (dates[0] || '').substring(0, 7) || getTodayStr().substring(0, 7);
      const wfhUsedThisMonth = Array.isArray(bookedDates)
        ? bookedDates.filter(b => b && b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(targetMonthKey)).reduce((s, b) => s + (b.duration || 1), 0)
        : 0;
      total = maxWfh;
      curBalance = Math.max(0, maxWfh - wfhUsedThisMonth);
    } else {
      const used = leaves[type]?.used || 0;
      curBalance = Math.max(0, total - used);
    }

    if (!isTutorialActive && (curBalance < leavesNeeded || curBalance <= 0)) {
      return;
    }

    const targetBalance = Math.max(0, curBalance - leavesNeeded);
    const chosenColor = activeConfig?.color || (leaveColors && leaveColors[type]) || (type === 'el' ? 'orange' : type === 'rh' ? 'green' : type === 'wfh' ? 'cyan' : 'blue');

    setMobileTickerData({
      initialValue: curBalance,
      targetValue: targetBalance,
      totalQuota: total,
      leaveType: type,
      leaveLabel: activeConfig?.name || leaveNames[type] || type.toUpperCase(),
      leaveColor: chosenColor,
      deductedCount: leavesNeeded,
      dates: [...dates],
      note: mobileNote,
      planName: mobilePlanName,
      durationPerDay
    });
  };

  const handleMobileTickerComplete = async () => {
    if (!mobileTickerData) return;
    const { dates, note, planName, durationPerDay, leaveType } = mobileTickerData;
    let planId = null;
    if (dates.length > 1) {
      const plan = await createLeavePlan(planName || 'Untitled Plan', dates[0], dates[dates.length - 1], currentUser?.id);
      planId = plan?.id || null;
    }
    for (const dateStr of dates) {
      if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
        await addLeave(dateStr, leaveType, note, planId, durationPerDay, currentUser?.id);
      }
    }
    await loadLeaves();
    setPreviewDates([]);
    setSelectionStart(null);
    setMobileConfirmOpen(false);
    setMobileNote('');
    setMobileLeaveType('pl');
    setMobileTickerData(null);
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
    return (
      <>
        {isDemoMode && <DemoBanner onRestartDemo={handleRestartDemo} onExitDemo={handleExitDemo} />}
        <AppSkeleton />
      </>
    );
  }

  return (
    <div className={`h-screen bg-background flex flex-col font-sans text-foreground overflow-hidden ${isDemoMode ? 'pt-10' : ''}`}>
      {/* Interactive Sandbox Demo Banner (Fixed Top z-[300]) */}
      {isDemoMode && (
        <DemoBanner onRestartDemo={handleRestartDemo} onExitDemo={handleExitDemo} />
      )}

      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-[0_1px_0_0_hsl(var(--border)),0_4px_24px_-4px_hsl(var(--foreground)/0.06)] pt-safe">
        
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
            ) : companyName ? (
              <div className="bg-primary text-primary-foreground rounded-xl w-9 h-9 flex items-center justify-center font-black text-xs shadow-md shadow-primary/20 flex-shrink-0 font-mono">
                {getCompanyInitials(companyName)}
              </div>
            ) : (
              <img 
                src={APP_CONFIG.logo} 
                alt={APP_CONFIG.name} 
                className="w-9 h-9 rounded-xl object-contain border border-border bg-card p-1 shadow-sm flex-shrink-0" 
              />
            )}
            
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest truncate">
                  {companyName || APP_CONFIG.name}
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
            ) : companyName ? (
              <div className="bg-primary text-primary-foreground rounded-lg p-1.5 w-8 h-8 flex items-center justify-center font-black text-xs shadow-md font-mono">
                {getCompanyInitials(companyName)}
              </div>
            ) : (
              <img 
                src={APP_CONFIG.logo} 
                alt={APP_CONFIG.name} 
                className="w-8 h-8 rounded-lg object-contain border border-border bg-card p-1 shadow-sm flex-shrink-0" 
              />
            )}
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">
                  {companyName || APP_CONFIG.name}
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

          {/* Redesigned Compact Desktop Tracker (Stacked: Fixed Tab Selector on Top, Leave Bars Below) */}
          <div className="hidden lg:flex flex-col items-end gap-1.5 flex-1 min-w-0 justify-center">
            {/* Fixed Top Tab Selector (Linked Component) */}
            <SegmentedPolicyTabs
              tabs={[
                { 
                  id: 'annual', 
                  label: 'Annual', 
                  count: annualTrackerEntries.reduce((s, e) => s + (typeof e.remaining === 'number' ? e.remaining : parseFloat(e.remaining) || 0), 0) 
                },
                ...(specialTrackerEntries.length > 0 ? [{ 
                  id: 'special', 
                  label: 'Special', 
                  count: specialTrackerEntries.length 
                }] : []),
                { 
                  id: 'remote', 
                  label: 'Remote', 
                  count: remoteTrackerEntry.remaining 
                }
              ]}
              activeTab={topbarTierTab}
              onChange={setTopbarTierTab}
              layoutId="desktop-topbar-tier-pill"
              size="xs"
              className="w-auto p-0.5"
            />

            {/* Active Tier Leave Bars Row Below */}
            <div className="flex items-center gap-1.5 justify-end">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={topbarTierTab}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  className="flex items-center gap-1.5 flex-shrink-0"
                >
                  {(topbarTierTab === 'annual' 
                    ? annualTrackerEntries 
                    : topbarTierTab === 'special' 
                      ? specialTrackerEntries 
                      : [remoteTrackerEntry]
                  ).map(item => {
                    const colorObj = getLeaveColor(item.color || 'blue');
                    const pct = item.total > 0 ? (item.remaining / item.total) * 100 : 0;
                    return (
                      <div
                        key={item.id}
                        data-surface="topbar-tracker"
                        data-leave-id={item.id}
                        className="flex flex-col justify-center gap-1 bg-muted/40 hover:bg-muted/70 border border-border/80 px-2.5 py-1 rounded-xl transition-all shadow-2xs group flex-shrink-0 select-none cursor-default min-w-[76px]"
                        title={`${item.name}: ${item.used} used, ${item.remaining} left`}
                      >
                        <div className="flex items-center justify-between gap-2 leading-none">
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${colorObj.bg} flex-shrink-0`} />
                            <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover:text-foreground uppercase transition-colors">
                              {item.shortCode}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-0.5 font-mono leading-none">
                            <span className="text-xs font-black text-foreground">{item.remaining}</span>
                            <span className="text-[9px] text-muted-foreground font-semibold">/{item.total}</span>
                            {item.cadence && (
                              <span className="text-[8px] font-mono text-muted-foreground/60 uppercase ml-0.5">
                                {item.cadence === 'month' ? 'mo' : 'yr'}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Bar filling visual style */}
                        <div className="h-1 w-full bg-muted/90 dark:bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${colorObj.bg}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
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

            {/* User Controls placed neatly below the Leave Quotas section */}
            <div className="flex items-center gap-3 py-1 relative z-[60]">
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

              <button
                type="button"
                data-capability="sign-out"
                onClick={handleSignOut}
                title="Sign Out"
                className="flex p-2 rounded-full bg-muted/60 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground border border-border/80 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>

              <ThemeSelector theme={theme} setTheme={setTheme} />
            </div>
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
            {/* Bottom Gradient Fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card via-card/80 to-transparent z-20" />
          </div>
        )}

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



      {/* Dynamic Linear Blur & Multi-stop Gradient fade overlay behind floating mobile navbar */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 pointer-events-none z-40 overflow-hidden transition-all duration-200 ${
        (selectionStart !== null || previewDates.length > 0) && !mobileConfirmOpen && !isMobileMenuOpen && viewingLeave === null
          ? 'h-24'
          : 'h-40'
      }`}>
        <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,black_75%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_75%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 via-background/70 to-transparent" />
      </div>

      {/* Backdrop when mobile menu, confirmation modal, viewing leave, or AI assistant in expanded mode */}
      <AnimatePresence>
        {(isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null || (isMobileAiOpen && mobileAiMode === 'expanded')) && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[48]"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setMobileConfirmOpen(false);
              setViewingLeave(null);
              if (isMobileAiOpen) setMobileAiMode('compact');
            }}
          />
        )}
      </AnimatePresence>

      <div 
        style={{
          bottom: (isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null || isMobileAiOpen)
            ? 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
            : 'max(1.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)))'
        }}
        className="md:hidden fixed left-0 right-0 z-[50] flex justify-center px-3 sm:px-4 pointer-events-none"
      >
        <motion.div
          id="mobile-floating-dock"
          layout="size"
          transition={{ layout: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } }}
          className={`pointer-events-auto overflow-hidden border border-border/80 backdrop-blur-2xl transition-[border-radius,background-color,box-shadow,width,max-width] duration-200 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] ${
            isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null || (isMobileAiOpen && mobileAiMode === 'expanded')
              ? 'w-full rounded-[28px] bg-card/95 dark:bg-card/95 flex flex-col'
              : (isMobileAiOpen && mobileAiMode === 'compact')
                ? 'w-full max-w-md rounded-[28px] bg-card/95 dark:bg-card/95 flex flex-col shadow-2xl'
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
                className="max-h-[min(82dvh,calc(100dvh-4rem-env(safe-area-inset-bottom,0px)))] flex flex-col overflow-hidden bg-card"
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 bg-card flex-shrink-0">
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
                  leaveColors={leaveColors}
                  leaveNames={leaveNames}
                  bookedDates={bookedDates}
                  maxWfh={10}
                  calendarStyle={calendarStyle}
                />
              </motion.div>
            )}

            {/* ── MENU STATE ── */}
            {isMobileMenuOpen && (
              <motion.div key="menu"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="max-h-[min(88dvh,calc(100dvh-2.5rem-env(safe-area-inset-bottom,0px)))] flex flex-col overflow-hidden"
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
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
                      className="flex flex-col flex-1 min-h-0 overflow-hidden"
                    >
                      {/* Pinned Header */}
                      <div className="flex items-center justify-between px-4 pt-1 pb-2 border-b border-border flex-shrink-0">
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

                      {/* Scrollable Body */}
                      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-4 no-scrollbar overscroll-contain">
                        {/* Profile Card */}
                        <div className="flex flex-col items-center text-center p-5 bg-muted/30 border border-border/80 rounded-2xl relative">
                          <div className="relative mb-2">
                            {mobileFormAvatar || effectiveAvatar ? (
                              <img src={mobileFormAvatar || effectiveAvatar} alt={userName} className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-xl" />
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground font-black text-2xl flex items-center justify-center shadow-xl shadow-primary/20 border-4 border-primary/30">
                                {userInitials}
                              </div>
                            )}

                            {/* Camera Overlay Badge Button */}
                            <button 
                              type="button" 
                              onClick={() => mobileAvatarFileRef.current?.click()}
                              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-background cursor-pointer"
                              title="Upload photo from device"
                            >
                              <Camera size={14} />
                            </button>
                            <input 
                              type="file" 
                              ref={mobileAvatarFileRef} 
                              accept="image/*" 
                              onChange={handleMobileAvatarUpload} 
                              className="hidden" 
                            />
                          </div>

                          <h3 className="text-base font-black text-foreground mt-1">{userName}</h3>
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
                              placeholder="e.g. Nykaa, nykaa.com, Google..."
                            />
                            <p className="text-[10px] text-muted-foreground font-medium">
                              Type name or domain (e.g. Nykaa, nykaa.com) to fetch brand icon.
                            </p>
                          </div>
                        </div>

                        {/* Quotas Summary Grid */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Annual Quotas</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.pl || 'blue').text}`}>{getShortform(leaveNames.pl, 'PL')}</span>
                              <span className="text-sm font-black font-mono">{leaves.pl.total} d</span>
                            </div>
                            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.el || 'orange').text}`}>{getShortform(leaveNames.el, 'EL')}</span>
                              <span className="text-sm font-black font-mono">{leaves.el.total} d</span>
                            </div>
                            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.rh || 'green').text}`}>{getShortform(leaveNames.rh, 'RH')}</span>
                              <span className="text-sm font-black font-mono">{leaves.rh.total} d</span>
                            </div>
                            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
                              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.wfh || 'cyan').text}`}>{getShortform(leaveNames.wfh, 'WFH')}</span>
                              <span className="text-sm font-black font-mono">{parseInt(localStorage.getItem('quota_wfh')||'10', 10)} /mo</span>
                            </div>
                          </div>
                        </div>

                        {/* Secondary Actions */}
                        <div className="flex flex-col gap-2">
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

                        {/* Toast Message */}
                        {mobileToast && (
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-500 text-center animate-in fade-in duration-200">
                            {mobileToast}
                          </div>
                        )}
                      </div>

                      {/* Pinned Footer Action */}
                      <div className="px-4 pt-2 pb-3 border-t border-border bg-card/95 backdrop-blur-md flex-shrink-0">
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
                          className="w-full py-3 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                        >
                          <Save size={14} /> Save Profile Changes
                        </button>
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
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  {/* Pinned Header */}
                  <div className="flex items-center justify-between px-4 pt-1 pb-2 border-b border-border flex-shrink-0">
                    <button 
                      onClick={() => setMobileSubView(null)} 
                      className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                      title="Back to menu"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-black uppercase tracking-wider text-foreground font-mono text-center flex-1 truncate px-2">App Settings</span>
                    <button 
                      onClick={() => { setIsMobileMenuOpen(false); setMobileSubView(null); }} 
                      className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Pinned Tab Switcher */}
                  <div className="px-4 pt-2.5 pb-1 flex-shrink-0">
                    <SegmentedPolicyTabs
                      tabs={[
                        { id: 'quotas', label: 'Quotas', icon: SlidersHorizontal },
                        { id: 'holidays', label: 'Public Holidays', icon: Clock },
                        { id: 'backup', label: 'Backups', icon: FileText }
                      ]}
                      activeTab={mobileSettingsTab}
                      onChange={setMobileSettingsTab}
                      layoutId="mobile-settings-tab-pill"
                      size="sm"
                    />
                  </div>

                  {/* Scrollable Tab Content Body */}
                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2.5 pb-4 flex flex-col gap-3 no-scrollbar overscroll-contain">
                    <AnimatePresence mode="wait">
                      {mobileSettingsTab === 'quotas' && (
                        <motion.div
                          key="tab-quotas"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="flex flex-col gap-3"
                        >
                          {/* Policy Tier Selector */}
                          <SegmentedPolicyTabs
                            tabs={[
                              { 
                                id: 'annual', 
                                label: 'Annual Bank', 
                                shortLabel: 'Annual',
                                testId: 'mobile-quotas-tab-annual',
                                count: mobileAnnualConfigs.length 
                              },
                              { 
                                id: 'remote', 
                                label: 'Remote / WFH', 
                                shortLabel: 'Remote',
                                testId: 'mobile-quotas-tab-remote'
                              },
                              { 
                                id: 'special', 
                                label: 'Special Benefits', 
                                shortLabel: 'Special',
                                testId: 'mobile-quotas-tab-special',
                                count: mobileSpecialConfigs.filter(c => c.enabled !== false).length 
                              }
                            ]}
                            activeTab={mobileQuotasTierTab}
                            onChange={setMobileQuotasTierTab}
                            layoutId="mobile-quotas-tier-pill"
                            size="xs"
                          />

                          {/* Tier Viewport */}
                          <AnimatePresence mode="wait">
                            {/* TIER 1: ANNUAL LEAVE BANK */}
                            {mobileQuotasTierTab === 'annual' && (
                              <motion.div
                                key="tier-annual"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                data-capability="annual-policy-edit"
                                className="flex flex-col gap-3"
                              >
                                <div className="flex items-center justify-between px-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                                    <SlidersHorizontal size={13} className="text-cyan-500" /> Tier 1: Annual Leave Bank
                                  </span>
                                  <span className="text-[9px] font-mono text-muted-foreground">
                                    Deducts from vacation balance
                                  </span>
                                </div>

                                {/* Dynamic Annual Categories Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                  {mobileAnnualConfigs.map(c => (
                                    <AppleWheelPicker
                                      key={c.id}
                                      code={c.shortCode || getShortform(c.name, c.id)}
                                      label={c.name}
                                      value={c.quota}
                                      onChange={(val) => updateMobileConfig(c.id, { quota: val })}
                                      min={0}
                                      max={60}
                                      customName={c.name}
                                      onCustomNameChange={(val) => updateMobileConfig(c.id, { name: val, shortCode: deriveShortCode(val) })}
                                      color={c.color || 'blue'}
                                      onColorChange={(val) => updateMobileConfig(c.id, { color: val })}
                                      onRemove={mobileAnnualConfigs.length > 1 && !['pl', 'el', 'rh'].includes(c.id) ? () => removeMobileConfig(c.id) : null}
                                    />
                                  ))}
                                </div>

                                {/* Add Custom Annual Category */}
                                {showMobileAddAnnual ? (
                                  <div className="p-3 bg-muted/40 border border-border rounded-xl flex flex-col gap-2">
                                    <span className="text-[11px] font-bold text-foreground font-mono">New Annual Leave Category</span>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="e.g. Sabbatical, Floating"
                                        value={mobileNewAnnualName}
                                        onChange={(e) => setMobileNewAnnualName(e.target.value)}
                                        className="flex-1 bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={handleMobileAddAnnual}
                                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
                                      >
                                        Add
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setShowMobileAddAnnual(false)}
                                        className="px-2.5 py-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-lg cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    data-capability="add-annual-category"
                                    onClick={() => setShowMobileAddAnnual(true)}
                                    className="w-full py-2.5 border border-dashed border-border/80 hover:border-foreground/40 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-98"
                                  >
                                    <Plus size={14} /> Add Custom Annual Category
                                  </button>
                                )}
                              </motion.div>
                            )}

                            {/* TIER 2: REMOTE / WFH */}
                            {mobileQuotasTierTab === 'remote' && (
                              <motion.div
                                key="tier-remote"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                data-capability="remote-policy-edit"
                                className="flex flex-col gap-3"
                              >
                                {/* WFH Enable Toggle */}
                                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-2xl">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">Enable Remote / WFH</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      Track monthly Work From Home
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => updateMobileConfig('wfh', { enabled: !mobileWfhConfig.enabled })}
                                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                                      mobileWfhConfig.enabled !== false ? 'bg-cyan-500' : 'bg-muted border border-border'
                                    }`}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${
                                      mobileWfhConfig.enabled !== false ? 'left-4.5' : 'left-0.5'
                                    }`} />
                                  </button>
                                </div>

                                {mobileWfhConfig.enabled !== false && (
                                  <div className="grid grid-cols-1 gap-2">
                                    <AppleWheelPicker
                                      code="WFH"
                                      label="Monthly WFH"
                                      value={mobileWfhConfig.quota ?? (parseInt(localStorage.getItem('quota_wfh') || '10', 10))}
                                      onChange={(val) => updateMobileConfig('wfh', { quota: val })}
                                      min={0}
                                      max={31}
                                      customName={mobileWfhConfig.name || (leaveNames.wfh || 'Work From Home')}
                                      onCustomNameChange={(val) => updateMobileConfig('wfh', { name: val, shortCode: deriveShortCode(val) })}
                                      color={mobileWfhConfig.color || leaveColors.wfh || 'cyan'}
                                      onColorChange={(val) => updateMobileConfig('wfh', { color: val })}
                                    />
                                  </div>
                                )}

                                {/* Attendance Check-in Prompt Preference */}
                                <div className="p-2.5 bg-muted/40 border border-border/80 rounded-xl flex justify-between items-center">
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
                            )}

                            {/* TIER 3: SPECIAL BENEFITS */}
                            {mobileQuotasTierTab === 'special' && (
                              <motion.div
                                key="tier-special"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                data-capability="special-benefits-edit"
                                className="flex flex-col gap-3"
                              >
                                <div className="p-2.5 bg-pink-500/10 border border-pink-500/30 rounded-xl flex items-start gap-2 text-[11px] text-pink-600 dark:text-pink-400">
                                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                                  <span>
                                    <strong>Independent Balances:</strong> Special benefits do <strong>NOT</strong> deduct from your annual vacation bank.
                                  </span>
                                </div>

                                <div className="flex flex-col gap-2">
                                  {mobileSpecialConfigs.map((c) => {
                                    const Icon = getSpecialBenefitIcon(c);
                                    const isEditing = editingMobileSpecialId === c.id;
                                    const colorTheme = getLeaveColor(c.color || 'pink');

                                    return (
                                      <div
                                        key={c.id}
                                        className={`p-3 rounded-xl border transition-all flex flex-col gap-2.5 ${
                                          isEditing
                                            ? 'bg-card border-primary/60 shadow-lg ring-1 ring-primary/20'
                                            : c.enabled !== false
                                              ? 'bg-card border-border/80 shadow-xs'
                                              : 'bg-muted/20 border-border/40 opacity-70'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                                c.enabled !== false ? colorTheme.badge : 'bg-muted text-muted-foreground'
                                              }`}
                                              style={c.enabled !== false ? { color: colorTheme.hex } : undefined}
                                            >
                                              <Icon size={15} />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span
                                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                                  style={{ backgroundColor: colorTheme.hex }}
                                                />
                                                <span className="text-xs font-bold text-foreground truncate">
                                                  {c.name}
                                                </span>
                                                <span className="text-[10px] font-mono text-muted-foreground font-medium">
                                                  ({c.cadence === 'month' ? `${c.quota}d/mo` : c.cadence === 'year' ? `${c.quota}d/yr` : `${c.quota}d`})
                                                </span>
                                              </div>
                                              {c.subtitle && (
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                  {c.subtitle}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            {c.enabled !== false && !isEditing && (
                                              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                                                <button
                                                  type="button"
                                                  onClick={() => updateMobileConfig(c.id, { quota: Math.max(1, (parseInt(c.quota, 10) || 1) - 1) })}
                                                  className="w-5 h-5 rounded bg-card hover:bg-muted text-foreground flex items-center justify-center text-xs font-bold font-mono transition-colors cursor-pointer"
                                                >
                                                  -
                                                </button>
                                                <input
                                                  type="number"
                                                  min={1}
                                                  max={90}
                                                  value={c.quota ?? ''}
                                                  onChange={(e) => {
                                                    const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10));
                                                    updateMobileConfig(c.id, { quota: val });
                                                  }}
                                                  onBlur={() => {
                                                    if (!c.quota || c.quota < 1) updateMobileConfig(c.id, { quota: 1 });
                                                  }}
                                                  className="w-7 text-center text-xs font-bold font-mono bg-transparent text-foreground focus:outline-none"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => updateMobileConfig(c.id, { quota: (parseInt(c.quota, 10) || 1) + 1 })}
                                                  className="w-5 h-5 rounded bg-card hover:bg-muted text-foreground flex items-center justify-center text-xs font-bold font-mono transition-colors cursor-pointer"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            )}

                                            {/* Enable Toggle Checkbox */}
                                            <button
                                              type="button"
                                              role="checkbox"
                                              aria-checked={c.enabled !== false}
                                              onClick={() => updateMobileConfig(c.id, { enabled: c.enabled === false })}
                                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                                c.enabled !== false
                                                  ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                                                  : 'bg-muted border-slate-400 dark:border-slate-600 text-transparent'
                                              }`}
                                              title={c.enabled !== false ? 'Active benefit' : 'Inactive benefit'}
                                            >
                                              <Check size={12} strokeWidth={3.5} className={c.enabled !== false ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} />
                                            </button>

                                            {/* Edit / Done Button */}
                                            <button
                                              type="button"
                                              onClick={() => setEditingMobileSpecialId(isEditing ? null : c.id)}
                                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                                isEditing
                                                  ? 'bg-primary text-primary-foreground border-primary'
                                                  : 'text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted'
                                              }`}
                                              title={isEditing ? 'Close editor' : 'Edit details'}
                                            >
                                              {isEditing ? <Check size={12} strokeWidth={3} /> : <Edit3 size={12} />}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Inline Editor Drawer for Special Benefit */}
                                        {isEditing && (
                                          <div className="pt-2.5 border-t border-border/50 flex flex-col gap-2.5 animate-in fade-in duration-150">
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Benefit Title</label>
                                                <input
                                                  type="text"
                                                  value={c.name}
                                                  onChange={(e) => updateMobileConfig(c.id, { name: e.target.value, shortCode: deriveShortCode(e.target.value) })}
                                                  className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Cadence</label>
                                                <select
                                                  value={c.cadence || 'month'}
                                                  onChange={(e) => updateMobileConfig(c.id, { cadence: e.target.value })}
                                                  className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                                                >
                                                  <option value="month">Per Month</option>
                                                  <option value="year">Per Year</option>
                                                  <option value="event">Per Occurrence</option>
                                                </select>
                                              </div>
                                            </div>

                                            <div>
                                              <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Description / Note</label>
                                              <input
                                                type="text"
                                                value={c.subtitle || ''}
                                                onChange={(e) => updateMobileConfig(c.id, { subtitle: e.target.value })}
                                                placeholder="Benefit description..."
                                                className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                              />
                                            </div>

                                            {/* Color and Icon Row */}
                                            <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-muted-foreground">Color:</span>
                                                <div className="flex items-center gap-1.5">
                                                  {SELECTABLE_LEAVE_PALETTE.map((pal) => (
                                                    <button
                                                      key={pal.id}
                                                      type="button"
                                                      onClick={() => updateMobileConfig(c.id, { color: pal.id })}
                                                      className={`w-4 h-4 rounded-full ${pal.bg} transition-transform cursor-pointer ${
                                                        (c.color || 'pink') === pal.id ? 'ring-2 ring-foreground scale-110' : 'opacity-60 hover:opacity-100'
                                                      }`}
                                                      title={pal.name}
                                                    />
                                                  ))}
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-muted-foreground">Icon:</span>
                                                <div className="flex items-center gap-1">
                                                  {BENEFIT_ICON_PRESETS.map((p) => {
                                                    const PIcon = p.icon;
                                                    return (
                                                      <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => updateMobileConfig(c.id, { icon: p.id })}
                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                                          (c.icon || 'sparkles') === p.id
                                                            ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                                                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                                                        }`}
                                                        title={p.label}
                                                      >
                                                        <PIcon size={12} />
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                              <button
                                                type="button"
                                                onClick={() => removeMobileConfig(c.id)}
                                                className="px-2 py-1 text-red-500 hover:bg-red-500/10 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                              >
                                                <Trash2 size={12} /> Remove
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingMobileSpecialId(null)}
                                                className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
                                              >
                                                Done
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Add Custom Special Benefit */}
                                {showMobileAddSpecial ? (
                                  <div className="p-3 bg-muted/40 border border-border rounded-xl flex flex-col gap-2.5">
                                    <span className="text-[11px] font-bold text-foreground font-mono">New Special Benefit</span>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Benefit Name</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Wellness Break"
                                          value={mobileNewSpecialName}
                                          onChange={(e) => setMobileNewSpecialName(e.target.value)}
                                          className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                          autoFocus
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Days Allowance</label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={90}
                                          value={mobileNewSpecialQuota}
                                          onChange={(e) => setMobileNewSpecialQuota(e.target.value)}
                                          className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Cadence</label>
                                        <select
                                          value={mobileNewSpecialCadence}
                                          onChange={(e) => setMobileNewSpecialCadence(e.target.value)}
                                          className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                                        >
                                          <option value="month">Per Month</option>
                                          <option value="year">Per Year</option>
                                          <option value="event">Per Occurrence</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Color</label>
                                        <div className="flex items-center gap-1.5 h-8">
                                          {SELECTABLE_LEAVE_PALETTE.slice(0, 5).map((pal) => (
                                            <button
                                              key={pal.id}
                                              type="button"
                                              onClick={() => setMobileNewSpecialColor(pal.id)}
                                              className={`w-4 h-4 rounded-full ${pal.bg} transition-transform cursor-pointer ${
                                                mobileNewSpecialColor === pal.id ? 'ring-2 ring-foreground scale-110' : 'opacity-60 hover:opacity-100'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={handleMobileAddSpecial}
                                        className="flex-1 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
                                      >
                                        Add Benefit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setShowMobileAddSpecial(false)}
                                        className="px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-lg cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    data-capability="add-special-benefit"
                                    onClick={() => setShowMobileAddSpecial(true)}
                                    className="w-full py-2.5 border border-dashed border-border/80 hover:border-foreground/40 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-98"
                                  >
                                    <Plus size={14} /> Add Special Benefit
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}

                      {mobileSettingsTab === 'holidays' && (
                        <motion.div
                          key="tab-holidays"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="flex flex-col gap-2"
                        >
                          <HolidayManager 
                            showTitle={false} 
                            initialHolidays={currentHolidays}
                            onStagingChange={setMobileHolidaysStagingState} 
                          />
                        </motion.div>
                      )}

                      {mobileSettingsTab === 'backup' && (
                        <motion.div
                          key="tab-backup"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
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
                                data-capability="export-json"
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
                                data-capability="export-csv"
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
                  </div>

                  {/* Pinned Sticky Footer Action Buttons */}
                  <div className="px-4 pt-2.5 pb-3.5 border-t border-border bg-card/95 backdrop-blur-md flex-shrink-0">
                    {mobileSettingsTab === 'holidays' && mobileHolidaysStagingState.isStaging ? (
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            if (mobileHolidaysStagingState.discardStaging) {
                              mobileHolidaysStagingState.discardStaging();
                            }
                          }} 
                          className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
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
                          className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                        >
                          <Check size={14} strokeWidth={3} /> Save Holidays
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setMobileSubView(null)} 
                          className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl active:scale-98 transition-all cursor-pointer"
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
                              colors: mobileFormColors,
                              leaveConfigs: mobileLeaveConfigs,
                              wfhPromptHour: wfhPromptHour
                            });
                            setMobileToast('Settings Saved!');
                            setTimeout(() => {
                              setMobileToast('');
                              setMobileSubView(null);
                            }, 500);
                          }} 
                          className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
                        >
                          <Save size={14} /> Save Settings
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>

              /* ── MAIN MENU SUBVIEW ── */
              ) : (
                <motion.div 
                  key="mobile-main-menu"
                  initial={{ opacity: 0, y: 6 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -6 }} 
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  {/* Header row */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-muted/20 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      {effectiveCompanyLogo ? (
                        <img 
                          src={effectiveCompanyLogo} 
                          alt={companyName || 'Company Logo'} 
                          className="w-8 h-8 rounded-xl object-contain border border-border bg-card p-0.5 shadow-sm flex-shrink-0" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : companyName ? (
                        <div className="bg-primary text-primary-foreground rounded-xl w-8 h-8 flex items-center justify-center font-black text-xs shadow-md flex-shrink-0 font-mono">
                          {getCompanyInitials(companyName)}
                        </div>
                      ) : (
                        <img 
                          src={APP_CONFIG.logo} 
                          alt={APP_CONFIG.name} 
                          className="w-8 h-8 rounded-xl object-contain border border-border bg-card p-0.5 shadow-sm flex-shrink-0" 
                        />
                      )}
                      <div className="flex flex-col leading-none">
                        <span className="font-bold font-mono text-sm text-foreground">{userName}</span>
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{currentUser?.email || 'Guest Account'}</span>
                      </div>
                    </div>
                    <button 
                      data-testid="mobile-drawer-close"
                      aria-label="Close"
                      onClick={() => setIsMobileMenuOpen(false)} 
                      className="p-1.5 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain flex flex-col">
                    {/* Mobile Profile & Settings Quick Action Buttons + Install App CTA */}
                    <div className="p-3 bg-muted/10 border-b border-border/60 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
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
                          data-testid="mobile-settings-btn"
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

                      {/* Install Web App CTA in Mobile Menu */}
                      {!isStandaloneApp ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setInstallModalOpen(true);
                          }}
                          className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 rounded-2xl transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                              <Download size={15} />
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                              <span className="text-xs font-black text-foreground tracking-tight flex items-center gap-1.5">
                                Install Web App
                                <span className="text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary rounded-full font-mono font-bold">Native</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">Add to home screen for fullscreen mode</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mr-1" />
                        </button>
                      ) : (
                        <div className="flex items-center justify-between p-2 px-3 bg-card/60 border border-border/70 rounded-2xl text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                            <CheckCircle2 size={13} /> App Installed
                          </span>
                          <span className="text-[10px] text-muted-foreground">Running as Native App</span>
                        </div>
                      )}
                    </div>

                    {/* Balances Card with Segmented Tabs */}
                    <div className="px-4 py-3 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                          Balances & Quotas
                        </span>
                        
                        {/* Segmented Tier Tabs */}
                        <SegmentedPolicyTabs
                          tabs={[
                            { id: 'annual', label: 'Annual' },
                            ...(specialTrackerEntries.length > 0 ? [{ id: 'special', label: 'Special' }] : []),
                            { id: 'remote', label: 'Remote' }
                          ]}
                          activeTab={mobileMenuTierTab}
                          onChange={setMobileMenuTierTab}
                          layoutId="mobile-drawer-tier-pill"
                          className="w-auto p-0.5"
                        />
                      </div>

                      {/* Morphing Tab Viewport */}
                      <MorphingTabContent activeKey={mobileMenuTierTab}>
                        {/* Tier 1: Annual Leave Bank */}
                        {mobileMenuTierTab === 'annual' && (
                        <div className="flex flex-col gap-2">
                          <div className="p-2.5 bg-card border border-border/80 rounded-2xl flex items-center justify-between text-xs font-mono shadow-2xs">
                            <span className="text-muted-foreground font-medium">Total Vacation Bank</span>
                            <span className="font-black text-foreground">
                              {annualTrackerEntries.reduce((s, e) => s + (typeof e.remaining === 'number' ? e.remaining : parseFloat(e.remaining) || 0), 0)}
                              <span className="text-muted-foreground font-normal"> / {annualTrackerEntries.reduce((s, e) => s + e.total, 0)} days</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {annualTrackerEntries.map((item) => {
                              const colorObj = getLeaveColor(item.color || 'blue');
                              const pct = item.total > 0 ? (item.remaining / item.total) * 100 : 0;
                              return (
                                <div 
                                  key={item.id} 
                                  data-surface="mobile-drawer-balances"
                                  data-leave-id={item.id}
                                  className="p-2.5 bg-card/60 border border-border/70 rounded-2xl flex flex-col gap-1.5 shadow-2xs"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`w-2 h-2 rounded-full ${colorObj.bg} flex-shrink-0`} />
                                      <span className="text-xs font-bold font-mono text-foreground truncate">
                                        {item.name} <span className="text-muted-foreground">({item.shortCode})</span>
                                      </span>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-foreground flex-shrink-0">
                                      {item.remaining}<span className="text-muted-foreground font-normal text-[10px]"> / {item.total}</span>
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${colorObj.bg}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                                    <span>{item.used} used</span>
                                    <span>{item.remaining} left</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tier 2: Special Benefits */}
                      {mobileMenuTierTab === 'special' && (
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            Independent company benefits that do not deduct from your annual vacation bank.
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {specialTrackerEntries.map((item) => {
                              const Icon = getSpecialBenefitIcon(item);
                              const colorObj = getLeaveColor(item.color || 'pink');
                              const pct = item.total > 0 ? (item.remaining / item.total) * 100 : 0;
                              return (
                                <div 
                                  key={item.id} 
                                  data-surface="mobile-drawer-balances"
                                  data-leave-id={item.id}
                                  className="p-2.5 bg-card/60 border border-border/70 rounded-2xl flex flex-col gap-1.5 shadow-2xs"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-6 h-6 rounded-lg ${colorObj.bg}/15 ${colorObj.text} flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={13} />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-foreground truncate">{item.name}</span>
                                        <span className="text-[9px] font-mono text-muted-foreground">
                                          {item.cadence === 'month' ? 'Per Calendar Month' : item.cadence === 'year' ? 'Per Year' : 'Per Occurrence'}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-foreground flex-shrink-0">
                                      {item.remaining}<span className="text-muted-foreground font-normal text-[10px]"> / {item.total}</span>
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${colorObj.bg}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                                    <span>{item.used} used</span>
                                    <span>{item.remaining} remaining</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tier 3: Remote / WFH */}
                      {mobileMenuTierTab === 'remote' && (
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const isWfhOverQuota = remoteTrackerEntry.used >= remoteTrackerEntry.total;
                            const wfhOverAmount = remoteTrackerEntry.used - remoteTrackerEntry.total;
                            const pct = Math.min(100, (remoteTrackerEntry.remaining / remoteTrackerEntry.total) * 100);

                            return (
                              <div 
                                data-surface="mobile-drawer-balances"
                                data-leave-id={remoteTrackerEntry.id}
                                className="p-3 bg-card border border-border/80 rounded-2xl flex flex-col gap-2 shadow-2xs"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold font-mono text-foreground">
                                      {remoteTrackerEntry.name} <span className="text-muted-foreground">({remoteTrackerEntry.shortCode})</span>
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold font-mono text-foreground">
                                    {remoteTrackerEntry.remaining}<span className="text-muted-foreground font-normal text-[10px]"> / {remoteTrackerEntry.total}</span>
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isWfhOverQuota ? 'bg-red-500' : 'bg-cyan-400'}`} 
                                    style={{ width: `${pct}%` }} 
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono">
                                  <span className="text-muted-foreground">{remoteTrackerEntry.used} used this month</span>
                                  <span className={isWfhOverQuota ? 'text-red-400 font-bold' : 'text-muted-foreground'}>
                                    {isWfhOverQuota ? `+${wfhOverAmount}d over quota` : `${remoteTrackerEntry.remaining} days left`}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      </MorphingTabContent>
                    </div>
                  </div>

                  {/* Pinned Action Footer */}
                  <div className="px-4 pt-2.5 pb-3.5 border-t border-border bg-card/95 backdrop-blur-md flex gap-2.5 flex-shrink-0">
                    <ThemeSelector theme={theme} setTheme={setTheme} direction="up" variant="full" />
                    <button data-capability="sign-out" onClick={handleSignOut} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold hover:bg-red-500/20 active:scale-98 transition-all cursor-pointer">
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
              className="max-h-[min(85dvh,calc(100dvh-3rem-env(safe-area-inset-bottom,0px)))] flex flex-col overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex justify-between items-center flex-shrink-0">
                <h2 className="font-bold font-mono text-sm uppercase tracking-tight">Confirm Leave</h2>
                {!mobileTickerData && (
                  <button onClick={() => setMobileConfirmOpen(false)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <X size={18} />
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {mobileTickerData ? (
                  <motion.div
                    key="mobile-ticker"
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -10 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="p-6 flex flex-col items-center justify-center flex-1"
                  >
                    <AppleBalanceTicker
                      initialValue={mobileTickerData.initialValue}
                      targetValue={mobileTickerData.targetValue}
                      totalQuota={mobileTickerData.totalQuota}
                      leaveType={mobileTickerData.leaveType}
                      leaveLabel={mobileTickerData.leaveLabel}
                      leaveColor={mobileTickerData.leaveColor}
                      deductedCount={mobileTickerData.deductedCount}
                      actionType={mobileTickerData.leaveType === 'wfh' ? 'wfh' : 'leave'}
                      onComplete={handleMobileTickerComplete}
                      autoDismissMs={1600}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="mobile-form"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col flex-1 min-h-0 overflow-hidden"
                  >
                    {/* Scrollable Form Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4 no-scrollbar overscroll-contain">
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

                      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-xl border border-border/50">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Leaves needed</span>
                          <span className="text-sm font-bold text-foreground leading-none">{mobileLeavesNeeded}</span>
                        </div>
                        <div className="w-px h-6 bg-border/50" />
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total days</span>
                          <span className="text-sm font-bold text-foreground leading-none">{previewDates.length}</span>
                        </div>
                      </div>

                      {(() => {
                        const annualModalConfigs = Array.isArray(leaveConfigs)
                          ? leaveConfigs.filter(c => c.tier === 'annual' && c.enabled)
                          : [
                              { id: 'pl', name: 'Planned Leave', shortCode: 'PL', color: 'blue', tier: 'annual', allowsHalfDay: true },
                              { id: 'el', name: 'Emergency Leave', shortCode: 'EL', color: 'orange', tier: 'annual', allowsHalfDay: true, constraints: { maxConsecutive: 2 } },
                              { id: 'rh', name: 'Restricted Leave', shortCode: 'RH', color: 'green', tier: 'annual', allowsHalfDay: false, constraints: { maxConsecutive: 1 } }
                            ];
                        const specialModalConfigs = Array.isArray(leaveConfigs)
                          ? leaveConfigs.filter(c => c.tier === 'special' && c.enabled)
                          : [];
                        const remoteModalConfigs = Array.isArray(leaveConfigs)
                          ? leaveConfigs.filter(c => (c.tier === 'monthly' || c.tier === 'remote' || c.id === 'wfh') && c.enabled)
                          : [
                              { id: 'wfh', name: 'Work From Home', shortCode: 'WFH', color: 'cyan', tier: 'monthly', quota: 10, cadence: 'month' }
                            ];

                        const modalTabs = [
                          { id: 'annual', label: 'Annual Bank', count: annualModalConfigs.length },
                          ...(specialModalConfigs.length > 0 ? [{ id: 'special', label: 'Special', count: specialModalConfigs.length }] : []),
                          { id: 'remote', label: 'Remote / WFH' }
                        ];

                        const currentTabConfigs = mobileModalTierTab === 'annual'
                          ? annualModalConfigs
                          : (mobileModalTierTab === 'special' ? specialModalConfigs : remoteModalConfigs);

                        const workingLeaves = previewDates.filter(d => !isHoliday(d) && !isWeekend(d)).length;

                        return (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest block">Leave Type</label>
                              <span className="text-[9px] font-mono font-bold text-muted-foreground/80">3-Tier Policy</span>
                            </div>

                            <SegmentedPolicyTabs
                              tabs={modalTabs}
                              activeTab={mobileModalTierTab}
                              onChange={(newTab) => {
                                setMobileModalTierTab(newTab);
                                const targetList = newTab === 'annual' ? annualModalConfigs : (newTab === 'special' ? specialModalConfigs : remoteModalConfigs);
                                const isAlreadyInTab = targetList.some(c => c.id === mobileLeaveType);
                                if (!isAlreadyInTab && targetList.length > 0) {
                                  setMobileLeaveType(targetList[0].id);
                                }
                              }}
                              layoutId="mobile-confirm-modal-tier-pill"
                              size="xs"
                              className="w-full"
                            />

                            <MorphingTabContent activeKey={mobileModalTierTab}>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1.5 pb-2">
                                {currentTabConfigs.map(item => {
                                  const isActive = mobileLeaveType === item.id;
                                  const curBal = item.id === 'wfh'
                                    ? Math.max(0, (item.quota || 10) - bookedDates.filter(b => b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(getTodayStr().substring(0, 7))).reduce((s, b) => s + (b.duration || 1), 0))
                                    : item.cadence === 'month'
                                      ? Math.max(0, (item.quota || 1) - (leaves[item.id]?.used || 0))
                                      : Math.max(0, (item.quota || leaves[item.id]?.total || 10) - (leaves[item.id]?.used || 0));

                                  const displayRemaining = item.id === 'wfh'
                                    ? `${curBal}/mo`
                                    : item.cadence === 'month'
                                      ? `${curBal}/mo`
                                      : `${curBal} left`;

                                  const minReq = (previewDates.length === 1 && item.allowsHalfDay !== false) ? 0.5 : workingLeaves;
                                  const maxConsecutive = item.constraints?.maxConsecutive;
                                  const isInsufficient = curBal < minReq;
                                  const isConsecutiveExceeded = Boolean(maxConsecutive && workingLeaves > maxConsecutive);
                                  const isRhOverLimit = item.id === 'rh' && workingLeaves > 1;

                                  const isDisabled = !isTutorialActive && (
                                    (workingLeaves > 0 && isInsufficient) ||
                                    isConsecutiveExceeded ||
                                    isRhOverLimit
                                  );

                                  let disableReason = null;
                                  if (isDisabled) {
                                    if (workingLeaves > 0 && isInsufficient) disableReason = 'Low Balance';
                                    else if (isRhOverLimit) disableReason = 'Max 1 Day';
                                    else if (isConsecutiveExceeded) disableReason = `Max ${maxConsecutive}d`;
                                  }

                                  const theme = getLeaveTheme(item.color || 'blue');
                                  const colorObj = getLeaveColor(item.color || 'blue');

                                  return (
                                    <button
                                      key={item.id}
                                      id={item.id === 'pl' ? 'tutorial-step-category-pl-mobile' : undefined}
                                      data-surface="booking-category-item"
                                      data-leave-id={item.id}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => {
                                        if (!isDisabled) {
                                          setMobileLeaveType(item.id);
                                          if (isTutorialActive && tutorialStepIndex === 4) setTutorialStepIndex(5);
                                        }
                                      }}
                                      className={`py-2.5 px-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 relative ${
                                        isDisabled
                                          ? 'opacity-35 cursor-not-allowed pointer-events-none bg-muted/20 border-dashed border-border/50 text-muted-foreground'
                                          : isActive
                                            ? `${theme.border} bg-muted/70 dark:bg-slate-900/90 text-foreground shadow-md ring-2 ring-primary/20 scale-[1.01] cursor-pointer`
                                            : 'border-border/70 bg-card/60 text-muted-foreground opacity-80 hover:opacity-100 hover:text-foreground cursor-pointer'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 leading-none">
                                        <span className={`w-1.5 h-1.5 rounded-full ${colorObj.bg} flex-shrink-0`} />
                                        <span className="text-[11px] font-black uppercase tracking-wider font-mono">
                                          {item.id === 'wfh' ? 'WFH' : (item.shortCode || getShortform(item.name))}
                                        </span>
                                      </div>
                                      <span className="text-[8px] font-bold opacity-80 leading-none truncate font-mono">
                                        {displayRemaining}
                                      </span>
                                      {disableReason && (
                                        <span className="text-[8px] font-bold font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 leading-none mt-0.5">
                                          {disableReason}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </MorphingTabContent>
                          </div>
                        );
                      })()}

                      {/* Desktop-like Duration Selector for Single-Day Bookings */}
                      {allowsHalfDayMobile && previewDates.length === 1 && (
                        <div className="p-3 bg-muted/40 border border-border/80 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">Booking Duration</span>
                            <span className="text-[10px] font-mono text-muted-foreground">Select leave duration</span>
                          </div>
                          <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border/80">
                            <button
                              type="button"
                              onClick={() => setMobileDuration(1)}
                              disabled={selectedMobileBal < 1}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                                mobileDuration === 1 
                                  ? 'bg-primary text-primary-foreground shadow-xs' 
                                  : 'text-muted-foreground hover:text-foreground'
                              } ${selectedMobileBal < 1 ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                            >
                              Full Day (1.0)
                            </button>
                            <button
                              type="button"
                              onClick={() => setMobileDuration(0.5)}
                              disabled={selectedMobileBal < 0.5}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                                mobileDuration === 0.5 
                                  ? 'bg-primary text-primary-foreground shadow-xs' 
                                  : 'text-muted-foreground hover:text-foreground'
                              } ${selectedMobileBal < 0.5 ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                            >
                              Half Day (0.5)
                            </button>
                          </div>
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
                    </div>

                    {/* Pinned Action Footer */}
                    <div className="px-5 pt-2.5 pb-3.5 border-t border-border bg-card/95 backdrop-blur-md flex gap-3 flex-shrink-0">
                      <button onClick={() => setMobileConfirmOpen(false)} className="flex-1 py-3 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-xl text-xs font-bold shadow-sm cursor-pointer active:scale-98 transition-all">
                        Back
                      </button>
                      <button 
                        id="tutorial-step-modal-apply-btn-mobile"
                        onClick={handleMobileApply} 
                        disabled={!isTutorialActive && (selectedMobileBal < mobileLeavesNeeded || selectedMobileBal <= 0)}
                        className={`flex-[2] py-3 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all ${
                          !isTutorialActive && (selectedMobileBal < mobileLeavesNeeded || selectedMobileBal <= 0)
                            ? 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed pointer-events-none'
                            : 'bg-primary text-primary-foreground cursor-pointer active:scale-98'
                        }`}
                      >
                        Confirm & Apply <Check size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── SELECTION STATE (date selected, not yet confirmed) ── */}
          {!isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && !isAiPreview && (selectionStart !== null || previewDates.length > 0) && (
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

          {/* ── AI ASSISTANT MORPHING AMBIENT CHATBAR DOCK STATE ── */}
          {isMobileAiOpen && !isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && (
            <motion.div
              key="mobile-ai-dock"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className={`flex flex-col overflow-hidden rounded-[28px] transition-all duration-300 shadow-2xl border border-white/10 ${
                mobileAiMode === 'compact' ? 'h-[50vh] max-h-[50vh]' : 'h-[85vh] max-h-[88vh]'
              }`}
            >
              <AiAssistantChatContent
                onClose={() => {
                  setIsMobileAiOpen(false);
                  setMobileAiMode('compact');
                }}
                context={{
                  leaves,
                  leaveNames,
                  leaveConfigs,
                  bookedDates,
                  leavePlans,
                  holidays: currentHolidays,
                  todayStr: getTodayStr()
                }}
                onExecuteAction={handleExecuteAiAction}
                onPreviewRange={(start, end) => {
                  const sDate = new Date(start);
                  const eDate = new Date(end);
                  const range = [];
                  for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                    range.push(`${2026}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                  }
                  handlePreviewRange(range, `Vacation (${start} → ${end})`);
                }}
                isMorphedDock={true}
                isMobileChatbar={true}
                mobileChatbarMode={mobileAiMode}
                onToggleMobileExpand={() => setMobileAiMode(m => m === 'compact' ? 'expanded' : 'compact')}
                companyName={companyName}
              />
            </motion.div>
          )}

          {!isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && !isMobileAiOpen && selectionStart === null && previewDates.length === 0 && (
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
                  data-testid="mobile-nav-ai"
                  onClick={() => setIsMobileAiOpen(true)} 
                  className="flex flex-col items-center py-2 px-3 rounded-2xl text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer relative"
                  title="Gemini AI Vacation & Leave Assistant"
                >
                  <div className="relative">
                    <Sparkles size={20} className="mb-1 text-blue-500 animate-pulse"/>
                    <span className="absolute -top-1.5 -right-3 bg-blue-500 text-white text-[7px] font-mono font-bold px-1 rounded-full shadow-xs">
                      AI
                    </span>
                  </div>
                  <span className="text-[9px] font-bold tracking-wide text-blue-500">Assistant</span>
                </button>

                <button 
                  data-testid="mobile-nav-tracker"
                  onClick={() => setActiveTab('tracker')} 
                  className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-colors ${activeTab === 'tracker' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <div className="relative">
                    <ListTodo size={20} className="mb-1"/>
                    {bookedDates.length > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{bookedDates.length}</span>}
                  </div>
                  <span className="text-[9px] font-bold tracking-wide">Tracker</span>
                </button>

                <button data-testid="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center py-2 px-3 rounded-2xl text-muted-foreground hover:text-foreground">
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
        {!isAiPreview && (selectionStart || previewDates.length > 0) && (
          <LeaveSelectionBar 
            selectionStart={selectionStart}
            previewDates={previewDates}
            bookedDates={bookedDates}
            leaveNames={leaveNames}
            leaveColors={leaveColors}
            leaveConfigs={leaveConfigs}
            suggestedPlanName={suggestedPlanName}
            onAdvanceTutorial={isTutorialActive ? () => setTutorialStepIndex(prev => prev + 1) : undefined}
            forceExpandModal={isTutorialActive && (tutorialStepIndex === 4 || tutorialStepIndex === 5)}
            tutorialStepIndex={tutorialStepIndex}
            onCancel={() => { setSelectionStart(null); setPreviewDates([]); setSuggestedPlanName(null); }}
            onApply={async (dates, type, note, planName, duration) => {
              if (isTutorialActive) {
                const finalName = planName || defaultTutorialPlanName;
                setTutorialCustomName(finalName);
                setLeavePlans(prev => [
                  {
                    id: 'tutorial-demo-plan-temp',
                    name: finalName,
                    start_date: tutorialStartDate,
                    end_date: tutorialEndDate,
                    startDate: tutorialStartDate,
                    endDate: tutorialEndDate,
                    type: 'pl',
                    is_demo: true
                  },
                  ...prev.filter(p => p.id !== 'tutorial-demo-plan-temp')
                ]);
                setPreviewDates([]);
                setSelectionStart(null);
                setSuggestedPlanName(null);
                setActiveTab('tracker');
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
              setSuggestedPlanName(null);
            }}
            balances={{
              pl: leaves.pl.total - leaves.pl.used,
              el: leaves.el.total - leaves.el.used,
              rh: leaves.rh.total - leaves.rh.used
            }}
            leaves={leaves}
            maxWfh={10}
          />
        )}
      </div>

      {/* Daily Attendance Check-in Modal */}
      {(() => {
        const effectiveToday = getTodayDate();
        const curMonthKey = `${effectiveToday.getFullYear()}-${String(effectiveToday.getMonth() + 1).padStart(2, '0')}`;
        const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
        const todayStr = getTodayStr();
        return (
          <WfhCheckinModal
            isOpen={wfhModalOpen && !isTutorialActive && !onboardingOpen && !showSplash}
            onClose={() => setWfhModalOpen(false)}
            onSelectStatus={handleWfhStatusSelect}
            onMarkLeave={handleWfhMarkLeave}
            wfhUsedThisMonth={wfhUsedThisMonth}
            maxWfh={10}
            todayStr={todayStr}
            bookedDates={bookedDates}
            leaveConfigs={leaveConfigs}
            leaveNames={leaveNames}
            leaveColors={leaveColors}
            wfhPromptHour={wfhPromptHour}
          />
        );
      })()}

      {/* Notification Permission Modal */}
      <NotificationPromptModal
        isOpen={notifModalOpen && !isTutorialActive && !onboardingOpen && !showSplash}
        onClose={() => setNotifModalOpen(false)}
        onEnable={handleEnableNotif}
      />

      {/* PWA / Web App Installation Prompt Modal */}
      <InstallPromptModal
        isOpen={installModalOpen && !isTutorialActive && !onboardingOpen && !showSplash}
        onClose={() => setInstallModalOpen(false)}
        deferredPrompt={deferredInstallPrompt}
        onInstalled={() => setIsStandaloneApp(true)}
      />


      {/* Unified Settings & Account Hub Modal */}
      <AnimatePresence>
        {settingsModalOpen && (
          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            initialTab={settingsInitialTab}
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
            leaveConfigs={leaveConfigs}
            wfhPromptHour={wfhPromptHour}
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
        onEnterDemo={handleEnterDemoMode}
        onExitDemo={handleExitDemo}
        isDemoMode={isDemoMode}
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

      {/* Password Reset Recovery Modal */}
      <ResetPasswordModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        onSuccess={() => {
          setResetPasswordModalOpen(false);
          setShowSplash(false);
          if (window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
      />

      {/* Initial App Load & Auth Gateway Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            isOpen={showSplash}
            onClose={() => {}}
            onAuthSuccess={handleAuthSuccess}
            onEnterDemo={handleEnterDemoMode}
            onExitDemo={handleExitDemo}
            isDemoMode={isDemoMode}
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
        initialName={userName}
        leaveConfigs={leaveConfigs}
        onClose={() => setOnboardingOpen(false)}
        onComplete={async (data) => {
          setWfhModalOpen(false);
          setHasPromptedWfh(true);
          setOnboardingOpen(false);
          setTutorialStepIndex(0);
          setIsTutorialActive(true);
          await handleSaveSettings(data);
          sessionStorage.setItem('demo_onboarding_completed', 'true');
          localStorage.setItem('onboarding_completed', 'true');
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
                setCalendarFocusedMonth(tutorialMonthIdx);
                setSelectionStart(null);
                setPreviewDates([]);
                break;
              case 'select-end-range':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(tutorialMonthIdx);
                setSelectionStart(tutorialStartDate);
                setPreviewDates([]);
                break;
              case 'prompt-confirm-plan':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(tutorialMonthIdx);
                setSelectionStart(tutorialStartDate);
                setPreviewDates(tutorialDateRange);
                break;
              case 'select-modal-category':
                setActiveTab('calendar');
                setSelectionStart(tutorialStartDate);
                setPreviewDates(tutorialDateRange);
                setMobileConfirmOpen(true);
                break;
              case 'apply-modal-leave':
                setActiveTab('calendar');
                setSelectionStart(tutorialStartDate);
                setPreviewDates(tutorialDateRange);
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
                      name: tutorialCustomName || defaultTutorialPlanName,
                      start_date: tutorialStartDate,
                      end_date: tutorialEndDate,
                      startDate: tutorialStartDate,
                      endDate: tutorialEndDate,
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
            if (isDemoMode) {
              setHasPromptedWfh(false);
              setWfhModalOpen(true);
            } else {
              triggerInstallPromptAfterFlow();
            }
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
            if (isDemoMode) {
              setHasPromptedWfh(false);
              setWfhModalOpen(true);
            } else {
              triggerInstallPromptAfterFlow();
            }
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
