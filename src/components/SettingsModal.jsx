import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, X, Save, FileText, CheckCircle2, User, SlidersHorizontal, 
  LogIn, LogOut, Download, Upload, Table, AlertCircle, ShieldCheck, 
  RotateCw, Trash2, AlertTriangle, ChevronRight, Camera, Building2, 
  Globe, Image as ImageIcon, Clock, Sparkles, Key, ExternalLink, Eye, EyeOff, Loader2, Bell,
  Plus, ChevronDown, ChevronUp, Shield, Info, Check, Edit3, Heart, Moon, Umbrella, Baby, BookOpen, HandHeart, Activity
} from 'lucide-react';
import AppleWheelPicker from './AppleWheelPicker';
import CompanyInput from './CompanyInput';
import HolidayManager from './HolidayManager';
import { getStoredHolidays } from '../data/holidays';
import { getCompanyLogoUrl } from '../utils/companyLogoUtils';
import { COLOR_PALETTE } from '../utils/colorUtils';
import { getSpecialBenefitIcon, BENEFIT_ICON_PRESETS } from '../utils/specialBenefitUtils';
import { exportUserDataToJson, importUserDataFromJson, exportUserDataToCsv } from '../utils/dataMigration';
import { 
  subscribeUserToPush, 
  unsubscribeUserFromPush, 
  getExistingPushSubscription, 
  triggerTestWebPush 
} from '../utils/notificationService';
import { 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey, 
  hasGeminiApiKey, 
  queryGeminiAssistant,
  AVAILABLE_MODELS,
  getStoredGeminiModel,
  setStoredGeminiModel
} from '../services/aiAssistantService';
import { buildInitialLeaveConfigs, deriveShortCode, DEFAULT_LEAVE_CONFIGS } from '../services/leaveConfigService';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  userName = 'User', 
  companyName: propCompanyName = '',
  avatarUrl: propAvatarUrl = '',
  quotas = { pl: 15, el: 10, rh: 1, wfh: 10 },
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' },
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  leaveConfigs: propLeaveConfigs = null,
  wfhPromptHour: propWfhPromptHour = '12',
  onSaveSettings,
  currentUser = null,
  onOpenAuthModal,
  onResetData,
  onDeleteAccount,
  onImportSuccess,
  onReplayTutorial,
  leavesQuota,
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile' | 'ai' | 'holidays' | 'quotas' | 'backup'
  const [name, setName] = useState(userName);
  const [companyName, setCompanyName] = useState(propCompanyName);
  const [avatarUrl, setAvatarUrl] = useState(propAvatarUrl);
  const [wfhPromptHour, setWfhPromptHour] = useState(propWfhPromptHour || localStorage.getItem('wfh_prompt_hour') || '12');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [currentQuotas, setCurrentQuotas] = useState({ ...quotas });
  const [currentNames, setCurrentNames] = useState({ ...leaveNames });
  const [currentColors, setCurrentColors] = useState({ ...leaveColors });
  const [currentConfigs, setCurrentConfigs] = useState(() => {
    return buildInitialLeaveConfigs({
      storedConfigs: propLeaveConfigs,
      legacyQuotas: quotas,
      legacyNames: leaveNames,
      legacyColors: leaveColors,
    });
  });
  const [quotasTierTab, setQuotasTierTab] = useState('annual'); // 'annual' | 'remote' | 'special'
  const [expandedConfigId, setExpandedConfigId] = useState(null);
  const [newAnnualCategoryName, setNewAnnualCategoryName] = useState('');
  const [newSpecialCategoryName, setNewSpecialCategoryName] = useState('');
  const [newSpecialQuota, setNewSpecialQuota] = useState('1');
  const [newSpecialCadence, setNewSpecialCadence] = useState('month');
  const [newSpecialSubtitle, setNewSpecialSubtitle] = useState('');
  const [newSpecialIcon, setNewSpecialIcon] = useState('heart');
  const [newSpecialColor, setNewSpecialColor] = useState('pink');
  const [editingSpecialId, setEditingSpecialId] = useState(null);
  const [showAddAnnualForm, setShowAddAnnualForm] = useState(false);
  const [showAddSpecialForm, setShowAddSpecialForm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentConfigs(buildInitialLeaveConfigs({
        storedConfigs: propLeaveConfigs,
        legacyQuotas: quotas,
        legacyNames: leaveNames,
        legacyColors: leaveColors,
      }));
    }
  }, [isOpen, propLeaveConfigs, quotas, leaveNames, leaveColors]);

  // Mutator helpers for 3-tier configurations
  const updateConfig = (id, updates) => {
    setCurrentConfigs(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next = { ...c, ...updates };
      if (updates.constraints) {
        next.constraints = { ...c.constraints, ...updates.constraints };
      }
      return next;
    }));
  };

  const removeConfig = (id) => {
    setCurrentConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handleAddAnnualCategory = () => {
    if (!newAnnualCategoryName.trim()) return;
    const nameTrim = newAnnualCategoryName.trim();
    const id = 'annual_' + Date.now();
    const shortCode = deriveShortCode(nameTrim);
    const newConfig = {
      id,
      name: nameTrim,
      shortCode,
      tier: 'annual',
      color: 'indigo',
      quota: 5,
      cadence: 'year',
      deductsFromAnnual: true,
      enabled: true,
      isSystem: false,
      allowsHalfDay: true,
      constraints: {
        maxConsecutive: null,
        requiresNote: false,
        warningMessage: null,
      }
    };
    setCurrentConfigs(prev => [...prev, newConfig]);
    setNewAnnualCategoryName('');
    setShowAddAnnualForm(false);
  };

  const handleAddSpecialCategory = () => {
    if (!newSpecialCategoryName.trim()) return;
    const nameTrim = newSpecialCategoryName.trim();
    const id = 'special_' + Date.now();
    const shortCode = deriveShortCode(nameTrim);
    const newConfig = {
      id,
      name: nameTrim,
      shortCode,
      tier: 'special',
      color: newSpecialColor || 'pink',
      icon: newSpecialIcon || 'sparkles',
      quota: Math.max(1, parseInt(newSpecialQuota, 10) || 1),
      cadence: newSpecialCadence || 'month',
      subtitle: newSpecialSubtitle.trim() || 'Company benefit allowance',
      deductsFromAnnual: false,
      enabled: true,
      isSystem: false,
      allowsHalfDay: true,
      constraints: {
        maxConsecutive: null,
        requiresNote: false,
        warningMessage: null,
      }
    };
    setCurrentConfigs(prev => [...prev, newConfig]);
    setNewSpecialCategoryName('');
    setNewSpecialQuota('1');
    setNewSpecialSubtitle('');
    setNewSpecialIcon('heart');
    setShowAddSpecialForm(false);
  };

  // Gemini AI State
  const [geminiKey, setGeminiKey] = useState(() => getStoredGeminiApiKey());
  const [selectedModel, setSelectedModel] = useState(() => getStoredGeminiModel());
  const [showKeyPlain, setShowKeyPlain] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testGeminiResult, setTestGeminiResult] = useState(null);

  // Holidays Staging State (from HolidayManager)
  const [holidaysStagingState, setHolidaysStagingState] = useState({
    isStaging: false,
    stagedCount: 0,
    confirmStaging: null,
    discardStaging: null
  });

  // Web Push State
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushStatus, setTestPushStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      getExistingPushSubscription()
        .then(sub => setPushSubscribed(Boolean(sub)))
        .catch(() => {});
    }
  }, [isOpen]);

  const initialSerializedConfigs = JSON.stringify(
    propLeaveConfigs || buildInitialLeaveConfigs({ legacyQuotas: quotas, legacyNames: leaveNames, legacyColors: leaveColors })
  );

  const isDirty = (
    name.trim() !== (userName || '').trim() ||
    companyName.trim() !== (propCompanyName || '').trim() ||
    avatarUrl !== propAvatarUrl ||
    String(wfhPromptHour) !== String(propWfhPromptHour || '12') ||
    geminiKey.trim() !== getStoredGeminiApiKey() ||
    selectedModel !== getStoredGeminiModel() ||
    JSON.stringify(currentConfigs) !== initialSerializedConfigs
  );

  const handleDiscardChanges = () => {
    setName(userName || '');
    setCompanyName(propCompanyName || '');
    setAvatarUrl(propAvatarUrl || '');
    setWfhPromptHour(propWfhPromptHour || '12');
    setGeminiKey(getStoredGeminiApiKey());
    setSelectedModel(getStoredGeminiModel());
    setCurrentConfigs(buildInitialLeaveConfigs({
      storedConfigs: propLeaveConfigs,
      legacyQuotas: quotas,
      legacyNames: leaveNames,
      legacyColors: leaveColors,
    }));
  };

  const handleTestGeminiKey = async () => {
    if (!geminiKey.trim()) {
      setTestGeminiResult({ success: false, msg: 'Please enter a Gemini API Key first.' });
      return;
    }
    setTestingGemini(true);
    setTestGeminiResult(null);
    try {
      const res = await queryGeminiAssistant({
        message: 'Ping: check connectivity and quota.',
        customApiKey: geminiKey.trim()
      });
      setTestGeminiResult({ success: true, msg: `Connected successfully using ${res.modelUsed || 'Gemini 2.5 Flash'}!` });
    } catch (err) {
      setTestGeminiResult({ success: false, msg: `Test failed: ${err.message || 'Check your key.'}` });
    } finally {
      setTestingGemini(false);
    }
  };

  // Deletion & Reset Inline States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Backup Export/Import States
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = useState(null);

  const fileInputRef = useRef(null);

  // Google OAuth Avatar fallback
  const googleAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
  const effectiveAvatar = avatarUrl || googleAvatar || null;

  // Automagical Company Logo
  const companyLogoUrl = getCompanyLogoUrl(companyName);

  useEffect(() => {
    if (isOpen) {
      setName(userName);
      setCompanyName(propCompanyName);
      setAvatarUrl(propAvatarUrl);
      setWfhPromptHour(propWfhPromptHour || localStorage.getItem('wfh_prompt_hour') || '12');
      setCurrentQuotas({ ...quotas });
      setCurrentNames({ ...leaveNames });
      setCurrentColors({ ...leaveColors });
      setShowDeleteConfirm(false);
      setShowResetConfirm(false);
      setBackupStatusMsg(null);
    }
  }, [isOpen, userName, propCompanyName, propAvatarUrl, propWfhPromptHour, JSON.stringify(quotas), JSON.stringify(leaveNames), JSON.stringify(leaveColors)]);

  if (!isOpen) return null;

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'LV';

  const isGoogle = currentUser?.app_metadata?.provider === 'google' || currentUser?.email?.includes('google');

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setAvatarUrl(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setStoredGeminiApiKey(geminiKey.trim());
    setStoredGeminiModel(selectedModel);

    const updatedQuotas = {};
    const updatedNames = {};
    const updatedColors = {};
    currentConfigs.forEach(c => {
      updatedQuotas[c.id] = c.quota;
      updatedNames[c.id] = c.name;
      updatedColors[c.id] = c.color;
    });

    if (onSaveSettings) {
      onSaveSettings({
        name: name.trim() || 'User',
        companyName: companyName.trim(),
        companyLogoUrl: companyLogoUrl,
        avatarUrl: avatarUrl,
        quotas: updatedQuotas,
        names: updatedNames,
        colors: updatedColors,
        leaveConfigs: currentConfigs,
        wfhPromptHour: String(wfhPromptHour)
      });
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  // Backup Handlers
  const handleExportJson = async () => {
    setIsExporting(true);
    setBackupStatusMsg(null);
    const result = await exportUserDataToJson(leavesQuota || quotas, currentUser?.id);
    setIsExporting(false);
    if (result.success) {
      setBackupStatusMsg({ type: 'success', text: `Exported ${result.count} records to JSON backup!` });
    } else {
      setBackupStatusMsg({ type: 'error', text: `Export failed: ${result.error}` });
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    setBackupStatusMsg(null);
    const result = await exportUserDataToCsv(currentUser?.id);
    setIsExportingCsv(false);
    if (result.success) {
      setBackupStatusMsg({ type: 'success', text: `Exported ${result.count} records to CSV spreadsheet!` });
    } else {
      setBackupStatusMsg({ type: 'error', text: `CSV Export failed: ${result.error}` });
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupStatusMsg(null);
    const result = await importUserDataFromJson(file, currentUser?.id);
    setIsImporting(false);

    if (result.success) {
      setBackupStatusMsg({ type: 'success', text: `Imported ${result.leavesCount} leaves and ${result.plansCount} plans!` });
      if (onImportSuccess) {
        await onImportSuccess(result.quotaSettings);
      }
    } else {
      setBackupStatusMsg({ type: 'error', text: `Import failed: ${result.error}` });
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-6">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
            onClick={onClose} 
          />

          {/* iPadOS Split View Container */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.96 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 15, scale: 0.96 }} 
            transition={{ type: 'spring', damping: 26, stiffness: 340 }} 
            className="relative bg-card/95 w-full max-w-5xl h-[88vh] max-h-[780px] mx-auto rounded-[32px] border border-border shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col md:flex-row"
          >
        
        {/* LEFT SIDEBAR (Fixed ~280px iPadOS Column) */}
        {/* LEFT SIDEBAR (Fixed ~280px Column, Responsive on mobile) */}
        <div className="w-full md:w-[280px] bg-muted/40 border-b md:border-b-0 md:border-r border-border p-3.5 sm:p-5 flex flex-col justify-between flex-shrink-0">
          
          <div className="flex flex-col gap-3 sm:gap-6">
            
            {/* Top Header & Close Button (Mobile) */}
            <div className="flex md:hidden justify-between items-center pb-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">App Settings</span>
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground bg-card rounded-full shadow-sm">
                <X size={16} />
              </button>
            </div>

            {/* Profile & Company Badge Card */}
            <div className="flex flex-row md:flex-col items-center text-left md:text-center p-3 md:p-4 bg-card/80 border border-border/80 rounded-2xl md:rounded-3xl shadow-sm relative group gap-3 md:gap-0">
              
              {/* Profile Avatar */}
              <div className="relative mb-0 md:mb-3 flex-shrink-0">
                {effectiveAvatar ? (
                  <img 
                    src={effectiveAvatar} 
                    alt={userName} 
                    className="w-12 h-12 md:w-28 md:h-28 rounded-2xl md:rounded-3xl object-cover shadow-md md:shadow-xl border-2 md:border-4 border-primary/20" 
                  />
                ) : (
                  <div className="w-12 h-12 md:w-28 md:h-28 rounded-2xl md:rounded-3xl bg-primary text-primary-foreground font-black text-base md:text-3xl flex items-center justify-center shadow-md md:shadow-xl shadow-primary/20 border-2 md:border-4 border-primary/20">
                    {initials}
                  </div>
                )}

                {/* Upload Overlay Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change Profile Photo"
                  className="absolute -bottom-1 -right-1 md:bottom-0 md:right-0 p-1 md:p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-background cursor-pointer"
                >
                  <Camera size={11} className="md:w-3.5 md:h-3.5" />
                </button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                />
              </div>

              {/* User Name */}
              <div className="flex flex-col min-w-0 flex-1">
                <h4 className="text-sm md:text-base font-black text-foreground truncate leading-tight">{name || userName}</h4>
                <span className="text-[10px] md:text-xs text-muted-foreground font-medium truncate">{currentUser?.email || 'User Account'}</span>
              </div>

              {/* Company Badge with Automagical Logo */}
              {companyName && (
                <div className="hidden md:flex mt-3 px-3 py-1.5 bg-muted/60 border border-border/60 rounded-xl items-center gap-2 max-w-full">
                  {companyLogoUrl ? (
                    <img 
                      src={companyLogoUrl} 
                      alt={companyName} 
                      className="w-4 h-4 rounded object-contain" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <Building2 size={12} className="text-primary" />
                  )}
                  <span className="text-[11px] font-bold text-foreground truncate">{companyName}</span>
                </div>
              )}

            </div>

            {/* Sidebar Navigation Tabs (Horizontal scroll on mobile, Vertical list on desktop) */}
            <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              {[
                { id: 'profile', label: 'Account & Profile', icon: User, color: 'text-primary' },
                { id: 'ai', label: 'Calendar Assistant', icon: Sparkles, color: 'text-purple-500' },
                { id: 'holidays', label: 'Public Holidays', icon: Clock, color: 'text-amber-500' },
                { id: 'quotas', label: 'Quotas & Themes', icon: SlidersHorizontal, color: 'text-cyan-500' },
                { id: 'backup', label: 'Data & Backups', icon: FileText, color: 'text-blue-500' }
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 md:w-full py-2 md:py-3 px-3 md:px-3.5 rounded-xl md:rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]' 
                        : 'bg-card md:bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/60 border md:border-0 border-border/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComp size={14} className={isActive ? 'text-primary-foreground' : tab.color} />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </div>
                    <ChevronRight size={14} className={`hidden md:block ${isActive ? 'opacity-100' : 'opacity-30'}`} />
                  </button>
                );
              })}
            </nav>

          </div>

          {/* Left Footer Action: Sign Out & Close (Desktop only) */}
          <div className="hidden md:flex items-center gap-2 mt-4 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={() => { onClose(); if (onSignOut) onSignOut(); }}
              className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} /> Sign Out
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-muted-foreground hover:text-foreground bg-card hover:bg-muted rounded-xl transition-colors cursor-pointer"
              title="Close Settings"
            >
              <X size={16} />
            </button>
          </div>

        </div>

        {/* RIGHT DETAIL PANEL (Flex-1 Content Area) */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-card/60">
          
          {/* Header */}
          <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
            <div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight font-mono">
                {activeTab === 'profile' && 'Account & Profile Settings'}
                {activeTab === 'ai' && 'Calendar Assistant & API'}
                {activeTab === 'holidays' && 'Company Public Holidays'}
                {activeTab === 'quotas' && 'Leave Quotas & Theme Palette'}
                {activeTab === 'backup' && 'Data Restore & JSON Backups'}
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                {activeTab === 'profile' && 'Customize your display name, company logo, and profile photo'}
                {activeTab === 'ai' && 'Chat naturally to plan trips, log leaves, and auto-import holiday calendars'}
                {activeTab === 'holidays' && 'Manage approved company holidays and auto-extract from PDF/Images'}
                {activeTab === 'quotas' && 'Set annual leave balances, custom category titles & color themes'}
                {activeTab === 'backup' && 'Export JSON backups, CSV spreadsheets, or restore data'}
              </p>
            </div>

            <button onClick={onClose} className="hidden md:block p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className={`p-5 flex-1 flex flex-col min-h-0 no-scrollbar ${activeTab === 'holidays' ? 'overflow-hidden' : 'overflow-y-auto gap-5'}`}>
            
            {savedSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200 flex-shrink-0">
                <CheckCircle2 size={16} /> Settings Saved Successfully!
              </div>
            )}

            {/* TAB CONTENT SWITCHER WITH ANIMATEPRESENCE */}
            <AnimatePresence mode="wait">
              {activeTab === 'holidays' && (
                <motion.div
                  key="holidays"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="h-full min-h-0 flex-1 flex flex-col overflow-hidden"
                >
                  <HolidayManager 
                    showTitle={false} 
                    initialHolidays={getStoredHolidays()} 
                    onStagingChange={setHolidaysStagingState}
                  />
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex flex-col gap-5"
                >
                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Display Name Input */}
                    <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-2">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                        <User size={14} className="text-primary" /> Full Display Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                        placeholder="Your Name..."
                      />
                    </div>

                    {/* Company Name Autocomplete & Logo Input */}
                    <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-2">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                        <Building2 size={14} className="text-cyan-500" /> Company / Workspace
                      </label>
                      <CompanyInput
                        value={companyName}
                        onChange={(val) => setCompanyName(val)}
                        placeholder="e.g. Siemens, ABB, Google"
                      />
                    </div>

                  </div>

                  {/* Profile Photo Custom Upload Card */}
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {effectiveAvatar ? (
                        <img src={effectiveAvatar} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-primary/20" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-foreground leading-tight">Profile Photo</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isGoogle ? 'Pulled from Google Account. Upload custom photo below.' : 'Upload custom profile avatar picture.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Camera size={13} /> Upload Photo
                      </button>
                    </div>
                  </div>

                  {/* Replay Interactive Tutorial Button */}
                  <div className="bg-primary/5 border border-primary/20 rounded-3xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
                        <RotateCw size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground leading-tight">Interactive Walkthrough</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Replay the guided feature tour and trial sandbox anytime.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onReplayTutorial) onReplayTutorial();
                      }}
                      className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold shadow-sm transition-all flex-shrink-0 cursor-pointer"
                    >
                      Replay Tour
                    </button>
                  </div>

                  {/* Danger Zone: Reset & Delete */}
                  <div className="border-t border-border/60 pt-4 flex flex-col gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-500" /> Advanced Options
                    </span>

                    {/* Reset All Data */}
                    {showResetConfirm ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-2.5 animate-in fade-in duration-200">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle size={15} /> Confirm wipe of all booked dates & plans?
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowResetConfirm(false);
                              onClose();
                              if (onResetData) onResetData();
                            }}
                            className="flex-1 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md"
                          >
                            Confirm Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-2 bg-muted text-foreground text-xs font-bold rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full py-2.5 px-4 bg-muted/40 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground rounded-2xl text-xs font-bold transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <RotateCw size={14} />
                          <span>Reset All Booked Leaves & Plans</span>
                        </div>
                        <ChevronRight size={14} />
                      </button>
                    )}

                    {/* Delete Account */}
                    {showDeleteConfirm ? (
                      <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col gap-2.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Trash2 size={14} /> Delete Account & Data
                          </span>
                          <button type="button" onClick={() => setShowDeleteConfirm(false)} className="text-muted-foreground hover:text-foreground">
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-medium">
                          Permanently delete your profile, leave bookings, and account record from Supabase database.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            onClose();
                            if (onDeleteAccount) onDeleteAccount();
                          }}
                          className="w-full py-2.5 bg-red-600 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} /> Confirm Permanently Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-2.5 px-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Trash2 size={14} />
                          <span>Delete Account & Data</span>
                        </div>
                        <ChevronRight size={14} />
                      </button>
                    )}

                    {/* Sign Out Action */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onSignOut) onSignOut();
                      }}
                      className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut size={14} />
                        <span>Sign Out of Account</span>
                      </div>
                      <ChevronRight size={14} />
                    </button>

                  </div>
                </motion.div>
              )}

              {activeTab === 'quotas' && (() => {
                const annualConfigs = currentConfigs.filter(c => c.tier === 'annual');
                const wfhConfig = currentConfigs.find(c => c.id === 'wfh') || { 
                  id: 'wfh', name: 'Work From Home', shortCode: 'WFH', tier: 'monthly', color: 'cyan', quota: 10, cadence: 'month', deductsFromAnnual: false, enabled: true, constraints: { maxConsecutive: 3 } 
                };
                const specialConfigs = currentConfigs.filter(c => c.tier === 'special');

                return (
                  <motion.div 
                    key="quotas"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="flex flex-col gap-4"
                  >
                    {/* 3-Tier Segmented Sub-Tab Switcher */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setQuotasTierTab('annual')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          quotasTierTab === 'annual'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>🏖️ Annual Bank</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted rounded-full">
                          {annualConfigs.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuotasTierTab('remote')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          quotasTierTab === 'remote'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>🏠 Remote</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted rounded-full">
                          {wfhConfig.enabled ? `${wfhConfig.quota}/mo` : 'Off'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuotasTierTab('special')}
                        className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          quotasTierTab === 'special'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>🌸 Special</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted rounded-full">
                          {specialConfigs.filter(c => c.enabled).length}
                        </span>
                      </button>
                    </div>

                    {/* ─── TIER 1: ANNUAL LEAVE BANK ─── */}
                    {quotasTierTab === 'annual' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                            <SlidersHorizontal size={14} className="text-cyan-500" /> Tier 1: Annual Vacation Bank
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Deducts from yearly vacation allowance
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {annualConfigs.map((c) => (
                            <div key={c.id} className="flex flex-col gap-2">
                              <AppleWheelPicker
                                code={c.shortCode}
                                label={c.name}
                                value={c.quota}
                                onChange={(val) => updateConfig(c.id, { quota: val })}
                                min={0} 
                                max={45}
                                customName={c.name}
                                onCustomNameChange={(val) => updateConfig(c.id, { name: val, shortCode: deriveShortCode(val) })}
                                color={c.color}
                                onColorChange={(val) => updateConfig(c.id, { color: val })}
                                onRemove={annualConfigs.length > 1 ? () => removeConfig(c.id) : null}
                                maxConsecutive={c.constraints?.maxConsecutive}
                                onMaxConsecutiveChange={(val) => updateConfig(c.id, { constraints: { ...(c.constraints || {}), maxConsecutive: val } })}
                              />

                              {/* Policy Rules & Constraints Drawer */}
                              <div className="bg-card/70 border border-border/80 rounded-2xl p-2.5 flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedConfigId(expandedConfigId === c.id ? null : c.id)}
                                  className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5 font-mono">
                                    <Shield size={12} className="text-amber-500" /> Rules & Policy Constraints
                                  </span>
                                  {expandedConfigId === c.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>

                                {expandedConfigId === c.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col gap-2 pt-2 border-t border-border/50"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-medium text-muted-foreground font-mono">Max Consecutive Days</span>
                                      <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        placeholder="None"
                                        value={c.constraints?.maxConsecutive || ''}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                          updateConfig(c.id, { constraints: { maxConsecutive: val } });
                                        }}
                                        className="w-20 bg-muted border border-border rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-foreground text-right"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-medium text-muted-foreground font-mono">Require Note / Document</span>
                                      <button
                                        type="button"
                                        onClick={() => updateConfig(c.id, { constraints: { requiresNote: !c.constraints?.requiresNote } })}
                                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                                          c.constraints?.requiresNote ? 'bg-primary' : 'bg-muted border border-border'
                                        }`}
                                      >
                                        <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${
                                          c.constraints?.requiresNote ? 'left-4.5' : 'left-0.5'
                                        }`} />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Custom Annual Category */}
                        {showAddAnnualForm ? (
                          <div className="p-3 bg-muted/40 border border-border rounded-2xl flex flex-col gap-2.5">
                            <span className="text-xs font-bold text-foreground font-mono">New Annual Leave Category</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Sabbatical, Floating Holiday"
                                value={newAnnualCategoryName}
                                onChange={(e) => setNewAnnualCategoryName(e.target.value)}
                                className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleAddAnnualCategory}
                                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowAddAnnualForm(false)}
                                className="px-3 py-2 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowAddAnnualForm(true)}
                            className="w-full py-3 border border-dashed border-border/80 hover:border-foreground/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          >
                            <Plus size={14} /> Add Custom Annual Category
                          </button>
                        )}
                      </div>
                    )}

                    {/* ─── TIER 2: MONTHLY REMOTE (WFH) ─── */}
                    {quotasTierTab === 'remote' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between p-4 bg-muted/30 border border-border/60 rounded-3xl">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">Enable Remote / Work From Home</span>
                            <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                              Allow logging WFH in daily check-in and booking bar
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateConfig('wfh', { enabled: !wfhConfig.enabled })}
                            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                              wfhConfig.enabled ? 'bg-cyan-500' : 'bg-muted border border-border'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                              wfhConfig.enabled ? 'left-5' : 'left-1'
                            }`} />
                          </button>
                        </div>

                        {wfhConfig.enabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AppleWheelPicker
                              code="WFH"
                              label="Monthly WFH Allowance"
                              value={wfhConfig.quota}
                              onChange={(val) => updateConfig('wfh', { quota: val })}
                              min={0}
                              max={31}
                              customName={wfhConfig.name}
                              onCustomNameChange={(val) => updateConfig('wfh', { name: val, shortCode: deriveShortCode(val) })}
                              color={wfhConfig.color}
                              onColorChange={(val) => updateConfig('wfh', { color: val })}
                            />

                            <div className="p-4 bg-card border border-border/80 rounded-2xl flex flex-col justify-between gap-3">
                              <div>
                                <span className="text-xs font-black uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  <Shield size={14} className="text-cyan-500" /> Consecutive WFH Policy Limit
                                </span>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  Show an alert if user exceeds consecutive WFH days without coming into the office.
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground font-mono">Max Consecutive Days</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="15"
                                  value={wfhConfig.constraints?.maxConsecutive || ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                    updateConfig('wfh', { constraints: { maxConsecutive: val } });
                                  }}
                                  className="w-20 bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-foreground text-right"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── TIER 3: SPECIAL & BONUS BENEFITS ─── */}
                    {quotasTierTab === 'special' && (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-pink-600 dark:text-pink-400">
                          <Info size={16} className="flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Independent Balances:</strong> Special benefits do <strong>NOT</strong> deduct from your annual vacation bank and follow their own monthly or yearly allowance.
                          </span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          {specialConfigs.map((c) => {
                            const Icon = getSpecialBenefitIcon(c);
                            const isEditing = editingSpecialId === c.id;
                            const isAnotherEditing = editingSpecialId !== null && !isEditing;

                            return (
                              <div
                                key={c.id}
                                className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
                                  isEditing 
                                    ? 'bg-card border-primary/60 shadow-xl ring-2 ring-primary/20 scale-[1.01] z-10' 
                                    : isAnotherEditing
                                      ? 'opacity-25 pointer-events-none filter grayscale-[30%] scale-[0.99]'
                                      : c.enabled 
                                        ? 'bg-card border-border/80 shadow-xs' 
                                        : 'bg-muted/20 border-border/40 opacity-80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                      c.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      <Icon size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                                        {c.name}
                                        <span className="text-[10px] font-mono text-muted-foreground font-medium">
                                          ({c.cadence === 'month' ? `${c.quota}d / mo` : c.cadence === 'year' ? `${c.quota}d / yr` : `${c.quota} days`})
                                        </span>
                                      </span>
                                      <span className="text-[10px] text-muted-foreground truncate">
                                        {c.subtitle || (c.cadence === 'month' ? 'Monthly health and wellness allowance' : 'Company benefit allowance')}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 flex-shrink-0">
                                    {c.enabled && !isEditing && (
                                      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
                                        <button
                                          type="button"
                                          onClick={() => updateConfig(c.id, { quota: Math.max(1, (parseInt(c.quota, 10) || 1) - 1) })}
                                          className="w-5 h-5 rounded-lg bg-card hover:bg-muted text-foreground flex items-center justify-center text-xs font-bold font-mono transition-colors cursor-pointer"
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
                                            updateConfig(c.id, { quota: val });
                                          }}
                                          onBlur={() => {
                                            if (!c.quota || c.quota < 1) updateConfig(c.id, { quota: 1 });
                                          }}
                                          className="w-9 text-center text-xs font-bold font-mono bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => updateConfig(c.id, { quota: (parseInt(c.quota, 10) || 1) + 1 })}
                                          className="w-5 h-5 rounded-lg bg-card hover:bg-muted text-foreground flex items-center justify-center text-xs font-bold font-mono transition-colors cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}

                                    {/* High-Contrast Rounded Checkbox */}
                                    <button
                                      type="button"
                                      role="checkbox"
                                      aria-checked={c.enabled}
                                      onClick={() => updateConfig(c.id, { enabled: !c.enabled })}
                                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                        c.enabled
                                          ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30 scale-100'
                                          : 'bg-slate-900/90 dark:bg-slate-950 border-slate-400 dark:border-slate-500 hover:border-primary text-transparent'
                                      }`}
                                      title={c.enabled ? 'Active benefit (Click to disable)' : 'Inactive benefit (Click to enable)'}
                                    >
                                      <Check size={13} strokeWidth={3.5} className={c.enabled ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} />
                                    </button>

                                    {/* Save Button when Editing, Edit button when Idle */}
                                    {isEditing ? (
                                      <button
                                        type="button"
                                        onClick={() => setEditingSpecialId(null)}
                                        className="px-3 py-1 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-sm hover:bg-primary/90 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                        title="Save changes"
                                      >
                                        <Check size={12} strokeWidth={3} /> Save
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditingSpecialId(c.id)}
                                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/80 border border-border/60 transition-colors cursor-pointer"
                                        title="Edit details"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Inline Editor Drawer for Benefit */}
                                {isEditing && (
                                  <div className="pt-3 border-t border-border/50 flex flex-col gap-3 animate-in fade-in duration-150">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Benefit Title</label>
                                        <input
                                          type="text"
                                          value={c.name}
                                          onChange={(e) => updateConfig(c.id, { name: e.target.value, shortCode: deriveShortCode(e.target.value) })}
                                          className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Days Quota</label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={90}
                                          value={c.quota ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10));
                                            updateConfig(c.id, { quota: val });
                                          }}
                                          onBlur={() => {
                                            if (!c.quota || c.quota < 1) updateConfig(c.id, { quota: 1 });
                                          }}
                                          className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Cadence</label>
                                        <select
                                          value={c.cadence}
                                          onChange={(e) => updateConfig(c.id, { cadence: e.target.value })}
                                          className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                        >
                                          <option value="month">Per Calendar Month</option>
                                          <option value="year">Per Year</option>
                                          <option value="event">Per Occurrence / Total</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Subtitle / Description</label>
                                      <input
                                        type="text"
                                        value={c.subtitle || ''}
                                        onChange={(e) => updateConfig(c.id, { subtitle: e.target.value })}
                                        placeholder="Brief benefit description..."
                                        className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          removeConfig(c.id);
                                          setEditingSpecialId(null);
                                        }}
                                        className="px-2.5 py-1.5 text-red-500 hover:bg-red-500/10 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Delete benefit"
                                      >
                                        <Trash2 size={12} /> Remove Benefit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSpecialId(null)}
                                        className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-sm hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Check size={13} strokeWidth={3} /> Save Changes
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Custom Special Benefit */}
                        {showAddSpecialForm ? (
                          <div className="p-3.5 bg-muted/40 border border-border rounded-2xl flex flex-col gap-3">
                            <span className="text-xs font-bold text-foreground font-mono">New Special Benefit Category</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Benefit Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Wellness Break, Volunteer Day"
                                  value={newSpecialCategoryName}
                                  onChange={(e) => setNewSpecialCategoryName(e.target.value)}
                                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Days Allowance</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={90}
                                  value={newSpecialQuota}
                                  onChange={(e) => setNewSpecialQuota(e.target.value)}
                                  onBlur={() => {
                                    const val = parseInt(newSpecialQuota, 10);
                                    if (isNaN(val) || val < 1) setNewSpecialQuota('1');
                                    else if (val > 90) setNewSpecialQuota('90');
                                  }}
                                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Allowance Cadence</label>
                                <select
                                  value={newSpecialCadence}
                                  onChange={(e) => setNewSpecialCadence(e.target.value)}
                                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                >
                                  <option value="month">Per Calendar Month</option>
                                  <option value="year">Per Year</option>
                                  <option value="event">Per Occurrence / Total</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Subtitle / Description</label>
                              <input
                                type="text"
                                placeholder="e.g. Dedicated monthly self-care allowance"
                                value={newSpecialSubtitle}
                                onChange={(e) => setNewSpecialSubtitle(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>

                            {/* Preset Icon Picker */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-muted-foreground mr-1">Icon:</span>
                              {BENEFIT_ICON_PRESETS.map((p) => {
                                const PIcon = p.icon;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setNewSpecialIcon(p.id)}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                      newSpecialIcon === p.id
                                        ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                                    }`}
                                    title={p.label}
                                  >
                                    <PIcon size={13} />
                                  </button>
                                );
                              })}
                            </div>

                            {/* Preset Color Picker */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-muted-foreground mr-1">Color:</span>
                              {COLOR_PALETTE.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setNewSpecialColor(c.id)}
                                  className={`w-4 h-4 rounded-full ${c.bg} transition-transform cursor-pointer ${
                                    newSpecialColor === c.id ? 'ring-2 ring-foreground scale-110' : 'opacity-60 hover:opacity-100'
                                  }`}
                                  title={c.name}
                                />
                              ))}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                              <button
                                type="button"
                                onClick={() => setShowAddSpecialForm(false)}
                                className="px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={!newSpecialCategoryName.trim()}
                                onClick={handleAddSpecialCategory}
                                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 transition-all"
                              >
                                Add Benefit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowAddSpecialForm(true)}
                            className="w-full py-3 border border-dashed border-border/80 hover:border-foreground/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          >
                            <Plus size={14} /> Add Custom Special Benefit
                          </button>
                        )}
                      </div>
                    )}

                  {/* Daily Attendance Check-in Prompt Preference */}
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-500" /> Attendance Check-in Prompt Time
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Time of day to prompt for unbooked workdays (WFH vs In-Office)
                      </span>
                    </div>
                    <select
                      value={wfhPromptHour}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWfhPromptHour(val);
                        localStorage.setItem('wfh_prompt_hour', val);
                      }}
                      className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
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

                  {/* Web Push Background Notifications Card */}
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                        <Bell size={14} className="text-purple-500" /> Web Push Background Notifications
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Receive attendance reminders on iOS, Android & desktop even when Leave Planner is closed
                      </span>
                      {testPushStatus && (
                        <span className="text-[10px] font-mono text-purple-500 dark:text-purple-400 mt-1 font-semibold">
                          {testPushStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {pushSubscribed ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              setTestPushStatus('Sending test push...');
                              const res = await triggerTestWebPush();
                              if (res && res.success) {
                                setTestPushStatus('Test notification sent!');
                              } else {
                                setTestPushStatus(res?.message || 'Failed to dispatch test push');
                              }
                              setTimeout(() => setTestPushStatus(''), 4000);
                            }}
                            className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-xl text-xs font-bold transition-all"
                          >
                            Send Test
                          </button>
                          <button
                            type="button"
                            disabled={pushLoading}
                            onClick={async () => {
                              setPushLoading(true);
                              await unsubscribeUserFromPush();
                              setPushSubscribed(false);
                              setPushLoading(false);
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                          >
                            Disable
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={pushLoading}
                          onClick={async () => {
                            setPushLoading(true);
                            const res = await subscribeUserToPush();
                            if (res && res.success) {
                              setPushSubscribed(true);
                              setTestPushStatus('Web Push enabled!');
                            } else {
                              setTestPushStatus(res?.reason || res?.error || 'Failed to enable');
                            }
                            setPushLoading(false);
                            setTimeout(() => setTestPushStatus(''), 4000);
                          }}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
                        >
                          {pushLoading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                          Enable Web Push
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

              {/* Gemini AI Assistant Settings Tab */}
              {activeTab === 'ai' && (
                <motion.div 
                  key="ai"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex flex-col gap-4"
                >
                  {/* Engine Overview Card */}
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-2xl flex-shrink-0">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground leading-tight">Bring Your Own API Key</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Private • Zero data tracking • Stored locally on your device
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                      geminiKey.trim() 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      {geminiKey.trim() ? 'Connected ✓' : 'Not Connected'}
                    </span>
                  </div>

                  {/* API Key Input Card */}
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                        <Key size={14} className="text-primary" /> API Key
                      </label>
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        Get a free key (Google Gemini) <ExternalLink size={11} />
                      </a>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showKeyPlain ? 'text' : 'password'}
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="Paste your API key (starts with AIzaSy...)"
                        className="w-full bg-card border border-border rounded-2xl px-4 pr-20 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        {geminiKey && (
                          <button
                            type="button"
                            onClick={() => setGeminiKey('')}
                            title="Clear Key"
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowKeyPlain(!showKeyPlain)}
                          title={showKeyPlain ? "Hide Key" : "Show Key"}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showKeyPlain ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        Key stays strictly in your browser's local storage.
                      </span>
                      <button
                        type="button"
                        onClick={handleTestGeminiKey}
                        disabled={testingGemini || !geminiKey.trim()}
                        className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground disabled:opacity-40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        {testingGemini ? <Loader2 size={13} className="animate-spin text-primary" /> : <Sparkles size={13} className="text-primary" />}
                        {testingGemini ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>

                    {testGeminiResult && (
                      <div className={`p-3 rounded-2xl border text-xs flex gap-2 items-center ${
                        testGeminiResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                      }`}>
                        {testGeminiResult.success ? <CheckCircle2 size={15} className="flex-shrink-0" /> : <AlertCircle size={15} className="flex-shrink-0" />}
                        <span className="font-medium">{testGeminiResult.msg}</span>
                      </div>
                    )}
                  </div>

                  {/* Accessible Models Selection Section */}
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <label className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                          <SlidersHorizontal size={14} className="text-primary" /> Active AI Model Selection
                        </label>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          Select the Gemini model your API key connects to.
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Gemini 2.5 Flash'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {AVAILABLE_MODELS.map((m) => {
                        const isSelected = selectedModel === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedModel(m.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/20'
                                : 'bg-card hover:bg-muted/60 border-border/70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-foreground">
                                    {m.name}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/80">
                                    {m.badge}
                                  </span>
                                  <span className="text-[9px] font-mono text-muted-foreground">
                                    • {m.speed}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {m.description}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 font-medium hidden sm:inline">
                              {m.tier}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Important Note About API Rate Limits vs Google AI Pro */}
                  <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-3xl p-4 flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-blue-500" /> Google AI Pro vs Google AI Studio API Keys
                    </h4>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                      Your Google AI Pro / Gemini Advanced consumer subscription powers consumer web chat (<code className="px-1 rounded bg-blue-100 dark:bg-blue-900/40 font-mono text-[10px]">gemini.google.com</code>) and Antigravity OAuth. Developer API calls use <strong>Google AI Studio project quotas</strong>.
                    </p>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                      • <strong>Free Tier Keys</strong> have strict rate limits (~15–20 requests/minute).<br />
                      • To unlock <strong>1,000+ RPM</strong> and avoid quota throttling, switch to <strong>Gemini 2.5 Flash</strong> or enable Pay-as-you-go billing in <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-600 dark:hover:text-blue-200">Google AI Studio</a>.
                    </p>
                  </div>

                  {/* Capabilities List Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-1.5">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        🌴 Conversational Trip Staging
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Ask things like "Plan a 4-day trip in October" to automatically find dates, optimize leaves, and stage your vacation.
                      </p>
                    </div>

                    <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-1.5">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        📑 Instant Holiday Extraction
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Drop an image or PDF of your company's holiday list to automatically detect all dates and holiday names with zero manual entry.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'backup' && (
                <motion.div 
                  key="backup"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex flex-col gap-4"
                >
                  {backupStatusMsg && (
                    <div className={`p-3.5 rounded-2xl border text-xs flex gap-2.5 items-start ${
                      backupStatusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    }`}>
                      {backupStatusMsg.type === 'success' ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
                      <span>{backupStatusMsg.text}</span>
                    </div>
                  )}

                  {/* Export Section */}
                  <div className="bg-muted/40 border border-border/80 rounded-3xl p-4 flex flex-col gap-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-foreground block">Export Account Data</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Export your PL/EL/RH leaves, WFH logs, and trip plans into JSON backup or CSV spreadsheets.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleExportJson}
                        disabled={isExporting}
                        className="flex-1 py-3 bg-card border border-border text-foreground hover:bg-muted rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                      >
                        <Download size={14} /> {isExporting ? 'Exporting...' : 'JSON Backup'}
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={isExportingCsv}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                      >
                        <Table size={14} /> {isExportingCsv ? 'Generating...' : 'Spreadsheet (CSV)'}
                      </button>
                    </div>
                  </div>

                  {/* Import Section */}
                  <div className="bg-muted/40 border border-border/80 rounded-3xl p-4 flex flex-col gap-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-foreground block">Restore / Import File</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Upload a previously exported `.json` file to restore your leaves, WFH logs, and plans into this account.
                      </p>
                    </div>
                    <label className="w-full py-3 bg-card border border-border hover:bg-muted text-foreground rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                      <Upload size={15} /> {isImporting ? 'Importing into Supabase...' : 'Select Backup JSON File'}
                      <input type="file" accept=".json" onChange={handleFileImport} className="hidden" disabled={isImporting} />
                    </label>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Right Bottom Footer Actions */}
          <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
            {activeTab === 'holidays' && holidaysStagingState.isStaging ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (holidaysStagingState.discardStaging) {
                      holidaysStagingState.discardStaging();
                    }
                  }}
                  className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={14} /> Discard
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (holidaysStagingState.confirmStaging) {
                      holidaysStagingState.confirmStaging();
                    }
                    setSavedSuccess(true);
                    setTimeout(() => {
                      setSavedSuccess(false);
                    }, 1500);
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto cursor-pointer"
                >
                  <CheckCircle2 size={15} /> Confirm & Save Holidays ({holidaysStagingState.stagedCount})
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <AnimatePresence>
                    {isDirty && (
                      <motion.button
                        key="discard-btn"
                        initial={{ opacity: 0, scale: 0.94, x: -6 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.94, x: -6 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        type="button"
                        onClick={handleDiscardChanges}
                        className="px-4 py-2.5 bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white border border-border/80 dark:border-zinc-700 font-bold text-xs rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RotateCw size={13} className="text-muted-foreground" />
                        <span>Discard Changes</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto cursor-pointer"
                >
                  <Save size={14} /> Save Changes
                </button>
              </>
            )}
          </div>

        </div>

      </motion.div>
    </div>
  );
};

export default SettingsModal;
