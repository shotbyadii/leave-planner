import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, X, Save, FileText, CheckCircle2, User, SlidersHorizontal, 
  LogIn, LogOut, Download, Upload, Table, AlertCircle, ShieldCheck, 
  RotateCw, Trash2, AlertTriangle, ChevronRight, Camera, Building2, 
  Globe, Image as ImageIcon, Clock
} from 'lucide-react';
import AppleWheelPicker from './AppleWheelPicker';
import CompanyInput from './CompanyInput';
import HolidayManager from './HolidayManager';
import { getStoredHolidays } from '../data/holidays';
import { getCompanyLogoUrl } from '../utils/companyLogoUtils';
import { exportUserDataToJson, importUserDataFromJson, exportUserDataToCsv } from '../utils/dataMigration';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  userName = 'User', 
  companyName: propCompanyName = '',
  avatarUrl: propAvatarUrl = '',
  quotas = { pl: 15, el: 10, rh: 1, wfh: 10 },
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' },
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  onSaveSettings,
  currentUser = null,
  onOpenAuthModal,
  onResetData,
  onDeleteAccount,
  onSignOut,
  onImportSuccess,
  onReplayTutorial,
  leavesQuota
}) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'quotas' | 'backup'
  const [name, setName] = useState(userName);
  const [companyName, setCompanyName] = useState(propCompanyName);
  const [avatarUrl, setAvatarUrl] = useState(propAvatarUrl);
  const [wfhPromptHour, setWfhPromptHour] = useState(localStorage.getItem('wfh_prompt_hour') || '12');

  const [currentQuotas, setCurrentQuotas] = useState({ ...quotas });
  const [currentNames, setCurrentNames] = useState({ ...leaveNames });
  const [currentColors, setCurrentColors] = useState({ ...leaveColors });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Holidays Staging State (from HolidayManager)
  const [holidaysStagingState, setHolidaysStagingState] = useState({
    isStaging: false,
    stagedCount: 0,
    confirmStaging: null,
    discardStaging: null
  });

  const isDirty = (
    name.trim() !== (userName || '').trim() ||
    companyName.trim() !== (propCompanyName || '').trim() ||
    avatarUrl !== propAvatarUrl ||
    JSON.stringify(currentQuotas) !== JSON.stringify(quotas) ||
    JSON.stringify(currentNames) !== JSON.stringify(leaveNames) ||
    JSON.stringify(currentColors) !== JSON.stringify(leaveColors)
  );

  const handleDiscardChanges = () => {
    setName(userName || '');
    setCompanyName(propCompanyName || '');
    setAvatarUrl(propAvatarUrl || '');
    setCurrentQuotas({ ...quotas });
    setCurrentNames({ ...leaveNames });
    setCurrentColors({ ...leaveColors });
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
      setCurrentQuotas({ ...quotas });
      setCurrentNames({ ...leaveNames });
      setCurrentColors({ ...leaveColors });
      setShowDeleteConfirm(false);
      setShowResetConfirm(false);
      setBackupStatusMsg(null);
    }
  }, [isOpen, userName, propCompanyName, propAvatarUrl, JSON.stringify(quotas), JSON.stringify(leaveNames), JSON.stringify(leaveColors)]);

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
    if (onSaveSettings) {
      onSaveSettings({
        name: name.trim() || 'User',
        companyName: companyName.trim(),
        companyLogoUrl: companyLogoUrl,
        avatarUrl: avatarUrl,
        quotas: currentQuotas,
        names: currentNames,
        colors: currentColors
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
            {currentUser && (
              <button
                type="button"
                onClick={() => { onClose(); if (onSignOut) onSignOut(); }}
                className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} /> Sign Out
              </button>
            )}
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
                {activeTab === 'holidays' && 'Company Public Holidays'}
                {activeTab === 'quotas' && 'Leave Quotas & Theme Palette'}
                {activeTab === 'backup' && 'Data Restore & JSON Backups'}
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                {activeTab === 'profile' && 'Customize your display name, company logo, and profile photo'}
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

                  </div>
                </motion.div>
              )}

              {activeTab === 'quotas' && (
                <motion.div 
                  key="quotas"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex flex-col gap-4"
                >
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5 px-1">
                    <SlidersHorizontal size={14} className="text-cyan-500" /> Leave Quotas, Colors & Category Names
                  </span>

                  {/* Quotas & Custom Names Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AppleWheelPicker
                      code="PL"
                      label="Planned Leave"
                      value={currentQuotas.pl}
                      onChange={(val) => setCurrentQuotas(prev => ({ ...prev, pl: val }))}
                      min={0} max={30}
                      customName={currentNames.pl}
                      onCustomNameChange={(val) => setCurrentNames(prev => ({ ...prev, pl: val }))}
                      color={currentColors.pl}
                      onColorChange={(val) => setCurrentColors(prev => ({ ...prev, pl: val }))}
                    />

                    <AppleWheelPicker
                      code="EL"
                      label="Emergency Leave"
                      value={currentQuotas.el}
                      onChange={(val) => setCurrentQuotas(prev => ({ ...prev, el: val }))}
                      min={0} max={20}
                      customName={currentNames.el}
                      onCustomNameChange={(val) => setCurrentNames(prev => ({ ...prev, el: val }))}
                      color={currentColors.el}
                      onColorChange={(val) => setCurrentColors(prev => ({ ...prev, el: val }))}
                    />

                    <AppleWheelPicker
                      code="RH"
                      label="Extra Leave"
                      value={currentQuotas.rh}
                      onChange={(val) => setCurrentQuotas(prev => ({ ...prev, rh: val }))}
                      min={0} max={10}
                      customName={currentNames.rh}
                      onCustomNameChange={(val) => setCurrentNames(prev => ({ ...prev, rh: val }))}
                      color={currentColors.rh}
                      onColorChange={(val) => setCurrentColors(prev => ({ ...prev, rh: val }))}
                    />

                    <AppleWheelPicker
                      code="WFH"
                      label="Monthly WFH"
                      value={currentQuotas.wfh}
                      onChange={(val) => setCurrentQuotas(prev => ({ ...prev, wfh: val }))}
                      min={0} max={20}
                      customName={currentNames.wfh}
                      onCustomNameChange={(val) => setCurrentNames(prev => ({ ...prev, wfh: val }))}
                      color={currentColors.wfh}
                      onColorChange={(val) => setCurrentColors(prev => ({ ...prev, wfh: val }))}
                    />
                  </div>

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
