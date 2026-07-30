import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, X, Save, FileText, CheckCircle2, User, SlidersHorizontal, 
  LogIn, LogOut, Download, Upload, Table, AlertCircle, ShieldCheck, 
  RotateCw, Trash2, AlertTriangle, ChevronRight, Camera, Building2, 
  Globe, Image as ImageIcon
} from 'lucide-react';
import AppleWheelPicker from './AppleWheelPicker';
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
  leavesQuota
}) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'quotas' | 'backup'
  const [name, setName] = useState(userName);
  const [companyName, setCompanyName] = useState(propCompanyName);
  const [avatarUrl, setAvatarUrl] = useState(propAvatarUrl);

  const [currentQuotas, setCurrentQuotas] = useState({ ...quotas });
  const [currentNames, setCurrentNames] = useState({ ...leaveNames });
  const [currentColors, setCurrentColors] = useState({ ...leaveColors });
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg animate-in fade-in duration-200" onClick={onClose} />

      {/* iPadOS Split View Container */}
      <div className="relative bg-card/95 w-full max-w-5xl h-[88vh] max-h-[780px] mx-auto rounded-[32px] border border-border shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col md:flex-row">
        
        {/* LEFT SIDEBAR (Fixed ~280px iPadOS Column) */}
        <div className="w-full md:w-[280px] bg-muted/40 border-b md:border-b-0 md:border-r border-border p-5 flex flex-col justify-between flex-shrink-0">
          
          <div className="flex flex-col gap-6">
            
            {/* Top Close Button (Mobile) */}
            <div className="flex md:hidden justify-between items-center pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">Settings</span>
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground bg-card rounded-full">
                <X size={16} />
              </button>
            </div>

            {/* Profile & Company Badge Card */}
            <div className="flex flex-col items-center text-center p-4 bg-card/80 border border-border/80 rounded-3xl shadow-apple-sm relative group">
              
              {/* Profile Avatar */}
              <div className="relative mb-3">
                {effectiveAvatar ? (
                  <img 
                    src={effectiveAvatar} 
                    alt={userName} 
                    className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-primary/20" 
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    {initials}
                  </div>
                )}

                {/* Upload Overlay Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change Profile Photo"
                  className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-xl shadow-md hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera size={12} />
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
              <h4 className="text-sm font-black text-foreground truncate max-w-full leading-tight">{name || userName}</h4>
              <span className="text-[11px] text-muted-foreground font-medium truncate max-w-full">{currentUser?.email || 'User Account'}</span>

              {/* Company Badge with Automagical Logo */}
              {companyName && (
                <div className="mt-3 px-3 py-1.5 bg-muted/60 border border-border/60 rounded-xl flex items-center gap-2 max-w-full">
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

            {/* iPadOS Vertical Sidebar Navigation Tabs */}
            <nav className="flex flex-col gap-1.5">
              {[
                { id: 'profile', label: 'Account & Profile', icon: User, color: 'text-primary' },
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
                    className={`w-full py-3 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp size={15} className={isActive ? 'text-primary-foreground' : tab.color} />
                      <span>{tab.label}</span>
                    </div>
                    <ChevronRight size={14} className={isActive ? 'opacity-100' : 'opacity-30'} />
                  </button>
                );
              })}
            </nav>

          </div>

          {/* Left Footer Action: Sign Out & Close */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60">
            {currentUser && (
              <button
                type="button"
                onClick={() => { onClose(); if (onSignOut) onSignOut(); }}
                className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} /> Sign Out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex p-2.5 text-muted-foreground hover:text-foreground bg-card hover:bg-muted rounded-xl transition-colors"
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
                {activeTab === 'quotas' && 'Leave Quotas & Theme Palette'}
                {activeTab === 'backup' && 'Data Restore & JSON Backups'}
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                {activeTab === 'profile' && 'Customize your display name, company logo, and profile photo'}
                {activeTab === 'quotas' && 'Set annual leave balances, custom category titles & color themes'}
                {activeTab === 'backup' && 'Export JSON backups, CSV spreadsheets, or restore data'}
              </p>
            </div>

            <button onClick={onClose} className="hidden md:block p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 no-scrollbar">
            
            {savedSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 size={16} /> Settings Saved Successfully!
              </div>
            )}

            {/* TAB 1: PROFILE & ACCOUNT */}
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                
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

                  {/* Company Name & Automagical Domain Input */}
                  <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                        <Building2 size={14} className="text-cyan-500" /> Company / Workspace
                      </label>
                      {companyLogoUrl && (
                        <img 
                          src={companyLogoUrl} 
                          alt="Company Logo Preview" 
                          className="w-4 h-4 rounded object-contain" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-card border border-border rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
                      placeholder="e.g. Google, Microsoft, google.com"
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

                {/* Danger Zone: Reset & Delete */}
                <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex flex-col gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
                    Account Reset & Destruction
                  </span>

                  {/* Reset Data */}
                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-2.5 px-4 bg-card hover:bg-muted border border-border text-foreground rounded-2xl text-xs font-bold transition-all flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCw size={14} className="text-amber-500" />
                        <span>Reset All Booked Leaves & Trip Plans</span>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                  ) : (
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
                          className="px-4 py-2 bg-muted text-muted-foreground text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
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
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Type <strong className="text-foreground font-mono">DELETE</strong> below to confirm permanent deletion.
                      </p>
                      <input
                        type="text"
                        value={deleteInputText}
                        onChange={(e) => setDeleteInputText(e.target.value)}
                        placeholder="Type DELETE"
                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                      <button
                        type="button"
                        disabled={deleteInputText.trim() !== 'DELETE'}
                        onClick={() => {
                          onClose();
                          if (onDeleteAccount) onDeleteAccount();
                        }}
                        className="w-full py-2 bg-red-600 text-white font-black text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                      >
                        Permanently Delete Account
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

              </div>
            )}

            {/* TAB 2: QUOTAS & THEMES */}
            {activeTab === 'quotas' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5 px-1">
                  <SlidersHorizontal size={14} className="text-cyan-500" /> Leave Quotas, Colors & Category Names
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* PL Tumbler */}
                  <AppleWheelPicker
                    code="PL"
                    label="Privileged Leave"
                    value={currentQuotas.pl}
                    onChange={(val) => setCurrentQuotas(q => ({ ...q, pl: val }))}
                    min={0} max={30}
                    customName={currentNames.pl}
                    onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, pl: val }))}
                    color={currentColors.pl}
                    onColorChange={(val) => setCurrentColors(c => ({ ...c, pl: val }))}
                  />

                  {/* EL Tumbler */}
                  <AppleWheelPicker
                    code="EL"
                    label="Emergency Leave"
                    value={currentQuotas.el}
                    onChange={(val) => setCurrentQuotas(q => ({ ...q, el: val }))}
                    min={0} max={20}
                    customName={currentNames.el}
                    onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, el: val }))}
                    color={currentColors.el}
                    onColorChange={(val) => setCurrentColors(c => ({ ...c, el: val }))}
                  />

                  {/* RH Tumbler */}
                  <AppleWheelPicker
                    code="RH"
                    label="Extra Leave"
                    value={currentQuotas.rh}
                    onChange={(val) => setCurrentQuotas(q => ({ ...q, rh: val }))}
                    min={0} max={10}
                    customName={currentNames.rh}
                    onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, rh: val }))}
                    color={currentColors.rh}
                    onColorChange={(val) => setCurrentColors(c => ({ ...c, rh: val }))}
                  />

                  {/* WFH Tumbler */}
                  <AppleWheelPicker
                    code="WFH"
                    label="Monthly WFH"
                    value={currentQuotas.wfh}
                    onChange={(val) => setCurrentQuotas(q => ({ ...q, wfh: val }))}
                    min={0} max={20}
                    customName={currentNames.wfh}
                    onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, wfh: val }))}
                    color={currentColors.wfh}
                    onColorChange={(val) => setCurrentColors(c => ({ ...c, wfh: val }))}
                  />

                </div>
              </div>
            )}

            {/* TAB 3: DATA & BACKUPS */}
            {activeTab === 'backup' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                
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
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      disabled={isExporting}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Download size={14} /> {isExporting ? 'Exporting...' : 'JSON Backup'}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={isExportingCsv}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
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

              </div>
            )}

          </div>

          {/* Right Bottom Footer Actions */}
          <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-muted border border-border text-muted-foreground hover:text-foreground font-bold text-xs rounded-2xl transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto"
            >
              <Save size={14} /> Save Changes
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
