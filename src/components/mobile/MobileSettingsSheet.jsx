import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, X, SlidersHorizontal, Sparkles, Clock, FileText, 
  Check, Save, Plus, Trash2, Edit3, AlertTriangle, Key, ExternalLink, 
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Download, 
  FileSpreadsheet, Upload, Info, Heart
} from 'lucide-react';
import SegmentedPolicyTabs from '../SegmentedPolicyTabs';
import AppleWheelPicker from '../AppleWheelPicker';
import HolidayManager from '../HolidayManager';
import ConsecutiveLimitControl from '../ConsecutiveLimitControl';
import { getShortform, getLeaveColor, SELECTABLE_LEAVE_PALETTE } from '../../utils/colorUtils';
import { deriveShortCode } from '../../services/leaveConfigService';
import { getSpecialBenefitIcon, BENEFIT_ICON_PRESETS } from '../../utils/specialBenefitUtils';
import { 
  AVAILABLE_MODELS, 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey, 
  getStoredGeminiModel, 
  setStoredGeminiModel, 
  queryGeminiAssistant 
} from '../../services/aiAssistantService';
import { exportUserDataToJson, exportUserDataToCsv, importUserDataFromJson } from '../../utils/dataMigration';
import { fetchBookedLeaves, fetchLeavePlans } from '../../services/leaveService';

export default function MobileSettingsSheet({
  onClose,
  onBack,
  initialTab = 'quotas',
  leaveConfigs = [],
  quotas = {},
  leaveNames = {},
  leaveColors = {},
  wfhPromptHour = '12',
  setWfhPromptHour,
  attendanceCatchupMode = 'multi_day',
  setAttendanceCatchupMode,
  currentHolidays = [],
  currentUser = null,
  userName = '',
  companyName = '',
  onSaveSettings,
  onRefreshData
}) {
  const [mobileSettingsTab, setMobileSettingsTab] = useState(initialTab);
  const [mobileLeaveConfigs, setMobileLeaveConfigs] = useState(() => leaveConfigs);
  const [mobileFormQuotas, setMobileFormQuotas] = useState(() => ({ ...quotas }));
  const [mobileFormNames, setMobileFormNames] = useState(() => ({ ...leaveNames }));
  const [mobileFormColors, setMobileFormColors] = useState(() => ({ ...leaveColors }));
  const [mobileQuotasTierTab, setMobileQuotasTierTab] = useState('annual');
  const [editingMobileSpecialId, setEditingMobileSpecialId] = useState(null);
  
  // Custom category addition
  const [showMobileAddAnnual, setShowMobileAddAnnual] = useState(false);
  const [mobileNewAnnualName, setMobileNewAnnualName] = useState('');
  const [showMobileAddSpecial, setShowMobileAddSpecial] = useState(false);
  const [mobileNewSpecialName, setMobileNewSpecialName] = useState('');
  const [mobileNewSpecialQuota, setMobileNewSpecialQuota] = useState('1');
  const [mobileNewSpecialCadence, setMobileNewSpecialCadence] = useState('month');
  const [mobileNewSpecialColor, setMobileNewSpecialColor] = useState('pink');
  const [mobileNewSpecialIcon, setMobileNewSpecialIcon] = useState('heart');

  // AI & Backup state
  const [mobileToast, setMobileToast] = useState('');
  const [mobileGeminiKey, setMobileGeminiKey] = useState(() => getStoredGeminiApiKey());
  const [mobileSelectedModel, setMobileSelectedModel] = useState(() => getStoredGeminiModel());
  const [mobileShowKeyPlain, setMobileShowKeyPlain] = useState(false);
  const [mobileTestingGemini, setMobileTestingGemini] = useState(false);
  const [mobileTestGeminiResult, setMobileTestGeminiResult] = useState(null);
  const [isExportingMobile, setIsExportingMobile] = useState(false);
  const [isExportingCsvMobile, setIsExportingCsvMobile] = useState(false);
  const [isImportingMobile, setIsImportingMobile] = useState(false);
  const [mobileHolidaysStagingState, setMobileHolidaysStagingState] = useState({
    isStaging: false,
    stagedCount: 0,
    confirmStaging: null,
    discardStaging: null
  });

  const mobileAnnualConfigs = (mobileLeaveConfigs || []).filter(c => c.tier === 'annual');
  const mobileSpecialConfigs = (mobileLeaveConfigs || []).filter(c => c.tier === 'special');
  const mobileWfhConfig = (mobileLeaveConfigs || []).find(c => c.id === 'wfh') || {
    id: 'wfh',
    name: leaveNames.wfh || 'Work From Home',
    quota: quotas.wfh ?? 10,
    color: leaveColors.wfh || 'cyan',
    enabled: true
  };

  const handleMobileTestGeminiKey = async () => {
    if (!mobileGeminiKey.trim()) {
      setMobileTestGeminiResult({ success: false, msg: 'Please enter a Gemini API Key first.' });
      return;
    }
    setMobileTestingGemini(true);
    setMobileTestGeminiResult(null);
    try {
      const res = await queryGeminiAssistant({
        message: 'Ping: check connectivity and quota.',
        customApiKey: mobileGeminiKey.trim()
      });
      setMobileTestGeminiResult({ success: true, msg: `Connected successfully using ${res.modelUsed || 'Gemini 2.5 Flash'}!` });
    } catch (err) {
      setMobileTestGeminiResult({ success: false, msg: `Test failed: ${err.message || 'Check your key.'}` });
    } finally {
      setMobileTestingGemini(false);
    }
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
    setShowMobileAddSpecial(false);
  };

  return (
    <motion.div 
      key="mobile-settings" 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }} 
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }} 
      style={{ transformOrigin: 'bottom center' }}
      className="flex flex-col flex-1 min-h-0 overflow-hidden origin-bottom"
    >
      {/* Pinned Header */}
      <div className="flex items-center justify-between px-4 pt-1 pb-2 border-b border-border flex-shrink-0">
        <button 
          onClick={onBack} 
          className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          title="Back to menu"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-xs font-black uppercase tracking-wider text-foreground font-mono text-center flex-1 truncate px-2">App Settings</span>
        <button 
          onClick={onClose} 
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
            { id: 'ai', label: 'Calendar AI', icon: Sparkles },
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
      <div className={`flex-1 min-h-0 ${mobileSettingsTab === 'holidays' ? 'overflow-hidden py-1.5 pb-2.5' : 'overflow-y-auto py-2.5 pb-4'} px-4 flex flex-col gap-3 no-scrollbar overscroll-contain`}>
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

                    {/* Add Custom Annual Category — Pinned at bottom with gradient fade */}
                    <div className="sticky bottom-0 pt-3 pb-1 bg-gradient-to-t from-card via-card/95 to-transparent z-10">
                      {showMobileAddAnnual ? (
                        <div className="p-3 bg-card border border-border rounded-xl flex flex-col gap-2 shadow-lg">
                          <span className="text-[11px] font-bold text-foreground font-mono">New Annual Leave Category</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Sabbatical, Floating"
                              value={mobileNewAnnualName}
                              onChange={(e) => setMobileNewAnnualName(e.target.value)}
                              className="flex-1 bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
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
                          className="w-full py-2.5 bg-card/90 backdrop-blur-xs border border-dashed border-border/80 hover:border-foreground/40 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-98 shadow-xs"
                        >
                          <Plus size={14} /> Add Custom Annual Category
                        </button>
                      )}
                    </div>
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

                    {/* Attendance Catch-up Prompt Mode */}
                    <div className="p-2.5 bg-muted/40 border border-border/80 rounded-xl flex justify-between items-center">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-bold text-foreground truncate">Catch-up Card Mode</span>
                        <span className="text-[10px] text-muted-foreground truncate">Multi-day stack or Today only</span>
                      </div>
                      <select
                        value={attendanceCatchupMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAttendanceCatchupMode(val);
                          localStorage.setItem('attendance_catchup_mode', val);
                        }}
                        className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="multi_day">Multi-day Cards</option>
                        <option value="current_day">Today Only</option>
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
                                  onClick={() => updateMobileConfig(c.id, { enabled: c.enabled === false ? true : false })}
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                    c.enabled !== false
                                      ? 'bg-pink-500 border-pink-500 text-white shadow-xs'
                                      : 'border-border bg-muted/40 text-transparent'
                                  }`}
                                  title={c.enabled !== false ? 'Enabled' : 'Disabled'}
                                >
                                  <Check size={12} strokeWidth={3} />
                                </button>

                                {/* Edit / Done Button */}
                                <button
                                  type="button"
                                  onClick={() => setEditingMobileSpecialId(isEditing ? null : c.id)}
                                  className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    isEditing
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                                  }`}
                                  title={isEditing ? 'Done editing' : 'Edit details'}
                                >
                                  {isEditing ? <Check size={13} strokeWidth={3} /> : <Edit3 size={13} />}
                                </button>
                              </div>
                            </div>

                            {/* Inline Editor Drawer for Special Benefit */}
                            {isEditing && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-2 border-t border-border flex flex-col gap-2.5"
                              >
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono block mb-1">
                                    Display Name
                                  </label>
                                  <input
                                    type="text"
                                    value={c.name}
                                    onChange={(e) => updateMobileConfig(c.id, { name: e.target.value, shortCode: deriveShortCode(e.target.value) })}
                                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono block mb-1">
                                      Cadence
                                    </label>
                                    <select
                                      value={c.cadence || 'month'}
                                      onChange={(e) => updateMobileConfig(c.id, { cadence: e.target.value })}
                                      className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                                    >
                                      <option value="month">Monthly Reset</option>
                                      <option value="year">Annual Reset</option>
                                      <option value="event">Per Incident / Event</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono block mb-1">
                                      Max Consecutive
                                    </label>
                                    <ConsecutiveLimitControl
                                      value={c.constraints?.maxConsecutive}
                                      onChange={(val) => updateMobileConfig(c.id, { constraints: { maxConsecutive: val } })}
                                      size="sm"
                                    />
                                  </div>
                                </div>

                                {/* Color and Icon Row */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono block">
                                    Color & Icon
                                  </label>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                      {SELECTABLE_LEAVE_PALETTE.slice(0, 7).map((colorObj) => {
                                        const colorKey = colorObj.id;
                                        const theme = colorObj;
                                        const isSelected = (c.color || 'pink') === colorKey;
                                        return (
                                          <button
                                            key={colorKey}
                                            type="button"
                                            onClick={() => updateMobileConfig(c.id, { color: colorKey })}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: theme.hex }}
                                          >
                                            {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                      {BENEFIT_ICON_PRESETS.slice(0, 5).map(({ id: iconKey, icon: IconComponent }) => {
                                        const isSelected = (c.icon || 'heart') === iconKey;
                                        return (
                                          <button
                                            key={iconKey}
                                            type="button"
                                            onClick={() => updateMobileConfig(c.id, { icon: iconKey })}
                                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                              isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/60'
                                            }`}
                                          >
                                            <IconComponent size={12} />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Delete Custom Benefit */}
                                {!c.isSystem && (
                                  <button
                                    type="button"
                                    onClick={() => removeMobileConfig(c.id)}
                                    className="w-full py-1.5 mt-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={12} /> Remove {c.name}
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Special Benefit — Pinned at bottom with gradient fade */}
                    <div className="sticky bottom-0 pt-3 pb-1 bg-gradient-to-t from-card via-card/95 to-transparent z-10">
                      {showMobileAddSpecial ? (
                        <div className="p-3 bg-card border border-border rounded-xl flex flex-col gap-2.5 shadow-lg">
                          <span className="text-[11px] font-bold text-foreground font-mono">New Special Benefit Category</span>
                          
                          <input
                            type="text"
                            placeholder="e.g. Wellness Day, Pet Care, Study"
                            value={mobileNewSpecialName}
                            onChange={(e) => setMobileNewSpecialName(e.target.value)}
                            className="bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                            autoFocus
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono block mb-1">
                                Allowance
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={90}
                                  value={mobileNewSpecialQuota}
                                  onChange={(e) => setMobileNewSpecialQuota(e.target.value)}
                                  className="w-14 bg-muted/40 border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none text-center"
                                />
                                <span className="text-[11px] font-mono text-muted-foreground">days</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono block mb-1">
                                Cadence
                              </label>
                              <select
                                value={mobileNewSpecialCadence}
                                onChange={(e) => setMobileNewSpecialCadence(e.target.value)}
                                className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                              >
                                <option value="month">Monthly</option>
                                <option value="year">Annual</option>
                                <option value="event">Per Incident</option>
                              </select>
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
                          className="w-full py-2.5 bg-card/90 backdrop-blur-xs border border-dashed border-border/80 hover:border-foreground/40 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-98 shadow-xs"
                        >
                          <Plus size={14} /> Add Custom Special Benefit
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TAB: CALENDAR AI */}
          {mobileSettingsTab === 'ai' && (
            <motion.div
              key="tab-ai"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              data-capability="gemini-api-key-config"
              className="flex flex-col gap-3.5"
            >
              {/* Overview Banner */}
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground leading-tight truncate">Bring Your Own API Key</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      Private • Stored locally in browser
                    </p>
                  </div>
                </div>
                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  mobileGeminiKey.trim() 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {mobileGeminiKey.trim() ? 'Active ✓' : 'No Key'}
                </span>
              </div>

              {/* API Key Input */}
              <div className="bg-muted/40 border border-border/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <Key size={13} className="text-primary" /> API Key
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    Get free key <ExternalLink size={10} />
                  </a>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={mobileShowKeyPlain ? 'text' : 'password'}
                    value={mobileGeminiKey}
                    onChange={(e) => setMobileGeminiKey(e.target.value)}
                    placeholder="Paste Gemini API key..."
                    className="w-full bg-card border border-border rounded-xl px-3 pr-16 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-inner"
                  />
                  <div className="absolute right-1.5 flex items-center gap-0.5">
                    {mobileGeminiKey && (
                      <button
                        type="button"
                        onClick={() => setMobileGeminiKey('')}
                        title="Clear Key"
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMobileShowKeyPlain(!mobileShowKeyPlain)}
                      title={mobileShowKeyPlain ? "Hide Key" : "Show Key"}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {mobileShowKeyPlain ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={handleMobileTestGeminiKey}
                    disabled={mobileTestingGemini || !mobileGeminiKey.trim()}
                    className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-foreground disabled:opacity-40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    {mobileTestingGemini ? <Loader2 size={12} className="animate-spin text-primary" /> : <Sparkles size={12} className="text-primary" />}
                    {mobileTestingGemini ? 'Testing...' : 'Test Key'}
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    Never sent to our servers
                  </span>
                </div>

                {mobileTestGeminiResult && (
                  <div className={`p-2.5 rounded-xl border text-[11px] flex gap-2 items-center ${
                    mobileTestGeminiResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                  }`}>
                    {mobileTestGeminiResult.success ? <CheckCircle2 size={14} className="flex-shrink-0" /> : <AlertCircle size={14} className="flex-shrink-0" />}
                    <span className="font-medium truncate">{mobileTestGeminiResult.msg}</span>
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div className="bg-muted/40 border border-border/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-primary" /> Active Model
                  </label>
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {AVAILABLE_MODELS.find(m => m.id === mobileSelectedModel)?.name || 'Gemini 2.5 Flash'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {AVAILABLE_MODELS.map((m) => {
                    const isSelected = mobileSelectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setMobileSelectedModel(m.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/20'
                            : 'bg-card hover:bg-muted/60 border-border/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground truncate">
                                {m.name}
                              </span>
                              <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/80">
                                {m.badge}
                              </span>
                            </div>
                            <span className="text-[9px] text-muted-foreground truncate">
                              {m.desc}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">
                          {m.speed}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: PUBLIC HOLIDAYS */}
          {mobileSettingsTab === 'holidays' && (
            <motion.div
              key="tab-holidays"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="h-full min-h-0 flex-1 flex flex-col overflow-hidden"
            >
              <HolidayManager 
                showTitle={false} 
                initialHolidays={currentHolidays}
                onStagingChange={setMobileHolidaysStagingState} 
              />
            </motion.div>
          )}

          {/* TAB: BACKUPS */}
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
                        if (onRefreshData) await onRefreshData();
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
              onClick={onBack} 
              className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl active:scale-98 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => {
                setStoredGeminiApiKey(mobileGeminiKey.trim());
                setStoredGeminiModel(mobileSelectedModel);
                onSaveSettings({
                  name: userName,
                  companyName: companyName,
                  quotas: mobileFormQuotas,
                  names: mobileFormNames,
                  colors: mobileFormColors,
                  leaveConfigs: mobileLeaveConfigs,
                  wfhPromptHour: wfhPromptHour,
                  attendanceCatchupMode: attendanceCatchupMode
                });
                setMobileToast('Settings Saved!');
                setTimeout(() => {
                  setMobileToast('');
                  onBack();
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
  );
}
