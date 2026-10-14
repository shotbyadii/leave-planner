import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CalendarDays, MapPin, Home, ArrowRight, Check, User, 
  SlidersHorizontal, Building2, Clock, Bell, ShieldCheck, Key, ExternalLink,
  Plus, Trash2, Heart, Moon, Umbrella, Baby, X, Shield, Edit3, BookOpen, HandHeart, Activity,
  Palmtree
} from 'lucide-react';
import AppleWheelPicker from './AppleWheelPicker';
import CompanyInput from './CompanyInput';
import HolidayManager from './HolidayManager';
import { getStoredHolidays, saveStoredHolidays } from '../data/holidays';
import { showAppNotification, requestNotificationPermission, isNotificationGranted } from '../utils/notificationService';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '../services/aiAssistantService';
import { DEFAULT_LEAVE_CONFIGS, deriveShortCode, buildInitialLeaveConfigs } from '../services/leaveConfigService';
import { APP_CONFIG } from '../constants/brand';
import { COLOR_PALETTE, SELECTABLE_LEAVE_PALETTE, getLeaveColor } from '../utils/colorUtils';
import { getSpecialBenefitIcon, BENEFIT_ICON_PRESETS } from '../utils/specialBenefitUtils';
import { SegmentedPolicyTabs, MorphingTabContent } from './SegmentedPolicyTabs';
import ConsecutiveLimitControl from './ConsecutiveLimitControl';

const OnboardingModal = ({ isOpen, onClose, onComplete, initialName = '', leaveConfigs: propLeaveConfigs = null }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialName && initialName !== 'User' ? initialName : (typeof window !== 'undefined' ? localStorage.getItem('user_name') || '' : ''));
  const [companyName, setCompanyName] = useState('');
  const [wfhPromptHour, setWfhPromptHour] = useState('12');
  const [geminiApiKey, setGeminiApiKey] = useState(() => getStoredGeminiApiKey());
  const [notifGranted, setNotifGranted] = useState(() => isNotificationGranted());
  const [holidays, setHolidays] = useState(() => getStoredHolidays());

  // 3-Tier Leave Configurations State
  const [leaveConfigs, setLeaveConfigs] = useState(() => {
    if (Array.isArray(propLeaveConfigs) && propLeaveConfigs.length > 0) {
      return propLeaveConfigs;
    }
    return buildInitialLeaveConfigs();
  });
  const [onboardingTierTab, setOnboardingTierTab] = useState('annual'); // 'annual' | 'wfh' | 'special'

  // Custom Annual Leave Creator State
  const [isAddingAnnual, setIsAddingAnnual] = useState(false);
  const [newAnnualName, setNewAnnualName] = useState('');
  const [newAnnualQuota, setNewAnnualQuota] = useState('10');
  const [newAnnualColor, setNewAnnualColor] = useState('purple');
  const [newAnnualMaxConsecutive, setNewAnnualMaxConsecutive] = useState('');

  // Special Benefits Creator & Editor State
  const [isAddingSpecial, setIsAddingSpecial] = useState(false);
  const [newSpecialName, setNewSpecialName] = useState('');
  const [newSpecialQuota, setNewSpecialQuota] = useState('1');
  const [newSpecialCadence, setNewSpecialCadence] = useState('month');
  const [newSpecialSubtitle, setNewSpecialSubtitle] = useState('');
  const [newSpecialColor, setNewSpecialColor] = useState('pink');
  const [newSpecialIcon, setNewSpecialIcon] = useState('sparkles');
  const [editingSpecialId, setEditingSpecialId] = useState(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (initialName && initialName !== 'User') {
        setName(initialName);
      } else {
        const saved = localStorage.getItem('user_name');
        if (saved && saved !== 'User') setName(saved);
      }
      if (Array.isArray(propLeaveConfigs) && propLeaveConfigs.length > 0) {
        setLeaveConfigs(propLeaveConfigs);
      }
    }
  }, [isOpen, initialName, propLeaveConfigs]);

  const [isCompanySearching, setIsCompanySearching] = useState(false);

  // Quotas, Names & Colors State
  const [quotas, setQuotas] = useState({
    pl: 15,
    el: 10,
    rh: 1,
    wfh: 10
  });

  const [names, setNames] = useState({
    pl: 'Planned Leave',
    el: 'Emergency Leave',
    rh: 'Extra Leave',
    wfh: 'Work From Home'
  });

  const [colors, setColors] = useState({
    pl: 'blue',
    el: 'orange',
    rh: 'green',
    wfh: 'cyan'
  });

  if (!isOpen) return null;

  const handleRequestNotif = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      setNotifGranted(true);
      showAppNotification('Leave Vault', {
        body: `Attendance Reminders Enabled! Daily check-in reminders set for ${wfhPromptHour}:00.`,
        tag: 'onboarding-welcome'
      });
    }
  };

  const handleFinish = () => {
    saveStoredHolidays(holidays);
    if (geminiApiKey.trim()) {
      setStoredGeminiApiKey(geminiApiKey.trim());
    }

    // Build backward-compatible dictionaries
    const derivedQuotas = {};
    const derivedNames = {};
    const derivedColors = {};
    for (const c of leaveConfigs) {
      derivedQuotas[c.id] = c.quota;
      derivedNames[c.id] = c.name;
      derivedColors[c.id] = c.color;
    }

    if (onComplete) {
      onComplete({
        name: name.trim() || 'User',
        companyName: companyName.trim(),
        wfhPromptHour,
        notifEnabled: notifGranted,
        geminiApiKey: geminiApiKey.trim(),
        leaveConfigs,
        quotas: derivedQuotas,
        names: derivedNames,
        colors: derivedColors,
        holidays
      });
    }
    onClose();
  };

  const totalSteps = 5;

  const slides = [
    {
      icon: Sparkles,
      title: 'Welcome to Leave Vault',
      subtitle: 'Your intelligent annual leave planner & attendance tracker.',
      highlights: [
        { icon: CalendarDays, title: 'Smart Leave Optimizer', desc: 'Auto-finds long weekend bridges to maximize time off with minimal leaves.' },
        { icon: MapPin, title: 'Vacation & Trip Planner', desc: 'Organize, label, and track multi-day vacations effortlessly.' },
        { icon: Home, title: 'WFH & Hybrid Attendance', desc: 'Track monthly remote quotas with automated daily check-in reminders.' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Dark Blur Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300" />

      {/* Modal Container */}
      <div className={`relative bg-card w-full ${step === 1 ? 'max-w-5xl' : 'max-w-4xl'} mx-auto rounded-[32px] border border-border shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col transition-all duration-300`}>
        
        {/* Step Progress Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center relative z-30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground font-mono">
              Onboarding • Step {step} of {totalSteps}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-6 bg-primary' : s < step ? 'w-2 bg-primary/60' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Soft Gradient Fade under Top Bar for graceful content transition */}
        <div className="absolute top-[57px] inset-x-0 h-6 bg-gradient-to-b from-card via-card/80 to-transparent pointer-events-none z-20" />

        {/* Scrollable Step Content */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 no-scrollbar flex flex-col justify-start min-h-0 sm:min-h-[460px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Feature Showcase (Left Info + Right Direct App Components) */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full md:my-auto py-0.5 sm:py-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 md:gap-8 lg:gap-10 items-start">
                  
                  {/* Left Column: Brand, Welcome & Value Pillars (Top-Aligned with Right Panel) */}
                  <div className="md:col-span-5 flex flex-col items-start text-left justify-start pt-0 md:pt-1">
                    {/* App Logo */}
                    <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl md:rounded-3xl bg-primary/10 border border-primary/20 p-2 sm:p-2.5 md:p-3 flex items-center justify-center mb-2 sm:mb-3.5 shadow-inner">
                      <img src={APP_CONFIG.logo} alt={APP_CONFIG.name} className="w-full h-full object-contain rounded-lg sm:rounded-xl" />
                    </div>

                    {/* Version / Quick Intro Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] sm:text-[10px] font-bold font-mono uppercase tracking-wider mb-1.5 sm:mb-2">
                      <Sparkles size={11} className="text-primary" /> Personalized Workspace
                    </div>

                    {/* Main Title */}
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
                      Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground to-primary">Leave Vault</span>
                    </h2>

                    {/* Subtitle */}
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 sm:mt-1.5 md:mt-3 leading-relaxed font-medium">
                      Your intelligent annual leave planner & attendance tracker. Maximize long weekends, track hybrid quotas, and streamline team time off.
                    </p>

                    {/* Desktop Pillars / Quick Value Chips */}
                    <div className="hidden md:flex flex-col gap-2.5 mt-6 pt-5 border-t border-border/60 w-full">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                        <span>Smart bridge day recommendations</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                        <span>Annual leave & remote allowance tracking</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
                        <span>Automated daily hybrid attendance</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sleek Abstracted Feature Showcases (Top 2 on Mobile, All 3 on Desktop) */}
                  <div className="md:col-span-7 flex flex-col gap-2.5 sm:gap-3 md:gap-3.5 w-full select-none pointer-events-none">
                    
                    {/* Feature 1: Holiday & Bridge Optimizer Showcase */}
                    <div className="bg-gradient-to-b from-card/90 to-card/50 dark:from-white/[0.04] dark:to-white/[0.01] border border-border/70 dark:border-white/[0.08] rounded-2xl p-3 sm:p-3.5 md:p-4 text-left flex flex-col gap-2.5 sm:gap-3 shadow-apple-sm relative overflow-hidden">
                      {/* Ambient Accent Glow */}
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-start gap-2.5 sm:gap-3 relative z-10">
                        <div className="p-1.5 sm:p-2 bg-blue-500/10 text-blue-400 rounded-xl mt-0.5 border border-blue-500/20 shrink-0 shadow-inner">
                          <CalendarDays size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Holiday & Bridge Optimizer</h4>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-0.5">
                            Detects public holidays and bridges weekends to unlock long breaks with minimal leave count.
                          </p>
                        </div>
                      </div>

                      {/* Abstracted Showcase: Bridge Arc & Date Timeline Graphic */}
                      <div className="relative bg-gradient-to-br from-slate-900/95 via-black/90 to-slate-950/95 border border-white/[0.08] rounded-xl p-2.5 sm:p-3 shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                              October 2026 • Bridge Span
                            </span>
                          </div>
                          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <Sparkles size={9} /> 4 Days Off • 1 PL
                          </span>
                        </div>

                        {/* Abstracted Timeline Nodes with Illuminated Bridge Track */}
                        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 relative z-10">
                          <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-1 sm:p-1.5 flex flex-col items-center">
                            <span className="text-[7px] sm:text-[8px] font-mono uppercase text-slate-400">Thu</span>
                            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300">15</span>
                            <span className="text-[7px] font-mono text-slate-400/80 mt-0.5">Work</span>
                          </div>

                          <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-1 sm:p-1.5 flex flex-col items-center shadow-xs">
                            <span className="text-[7px] sm:text-[8px] font-mono uppercase text-amber-400 font-bold">Fri</span>
                            <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300">16</span>
                            <span className="text-[7px] font-mono font-bold text-amber-300 mt-0.5">Holiday</span>
                          </div>

                          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 sm:p-1.5 flex flex-col items-center">
                            <span className="text-[7px] sm:text-[8px] font-mono uppercase text-slate-400">Sat</span>
                            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300">17</span>
                            <span className="text-[7px] font-mono text-slate-400/80 mt-0.5">Weekend</span>
                          </div>

                          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 sm:p-1.5 flex flex-col items-center">
                            <span className="text-[7px] sm:text-[8px] font-mono uppercase text-slate-400">Sun</span>
                            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300">18</span>
                            <span className="text-[7px] font-mono text-slate-400/80 mt-0.5">Weekend</span>
                          </div>

                          <div className="bg-gradient-to-b from-blue-500/25 to-blue-600/15 border border-blue-400/50 rounded-lg p-1 sm:p-1.5 flex flex-col items-center relative shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-black" />
                            <span className="text-[7px] sm:text-[8px] font-mono uppercase text-blue-300 font-bold">Mon</span>
                            <span className="text-[11px] sm:text-xs font-mono font-bold text-blue-200">19</span>
                            <span className="text-[7px] font-mono font-black text-blue-200 bg-blue-500/30 px-1 py-0.2 rounded mt-0.5">1 PL</span>
                          </div>
                        </div>

                        {/* Abstracted Bridge Connector Graphic */}
                        <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-0.5 bg-gradient-to-r from-amber-400 via-blue-400 to-emerald-400 rounded-full" />
                            <span>Continuous Break: Oct 16 → Oct 19</span>
                          </div>
                          <span className="text-slate-400 text-[8px] uppercase tracking-wider">Auto-Optimized</span>
                        </div>
                      </div>
                    </div>

                    {/* Feature 2: Leave & Remote Balances Showcase */}
                    <div className="bg-gradient-to-b from-card/90 to-card/50 dark:from-white/[0.04] dark:to-white/[0.01] border border-border/70 dark:border-white/[0.08] rounded-2xl p-3 sm:p-3.5 md:p-4 text-left flex flex-col gap-2.5 sm:gap-3 shadow-apple-sm relative overflow-hidden">
                      {/* Ambient Accent Glow */}
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-start gap-2.5 sm:gap-3 relative z-10">
                        <div className="p-1.5 sm:p-2 bg-cyan-500/10 text-cyan-400 rounded-xl mt-0.5 border border-cyan-500/20 shrink-0 shadow-inner">
                          <SlidersHorizontal size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Leave & Remote Allowances</h4>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-0.5">
                            Track annual leaves, monthly remote quotas, and custom benefits in real time.
                          </p>
                        </div>
                      </div>

                      {/* Abstracted Showcase: Multi-Tier Quota Gauges */}
                      <div className="relative bg-gradient-to-br from-slate-900/95 via-black/90 to-slate-950/95 border border-white/[0.08] rounded-xl p-2.5 sm:p-3 shadow-xl overflow-hidden flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 bg-white/[0.06] border border-white/[0.08] px-1.5 sm:px-2 py-0.5 rounded-md">
                              Annual Bank
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded-md">
                              Remote / WFH
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded-md">
                              Benefits
                            </span>
                          </div>
                          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                            20 / 25 Available
                          </span>
                        </div>

                        {/* Abstracted Dual Gradient Progress Gauges */}
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-1.5 sm:p-2 flex flex-col gap-1 sm:gap-1.5">
                            <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono">
                              <span className="text-slate-300 font-bold truncate">Planned (PL)</span>
                              <span className="text-blue-300 font-black">12 / 15</span>
                            </div>
                            <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden p-0.2">
                              <div className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full w-4/5 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            </div>
                          </div>

                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-1.5 sm:p-2 flex flex-col gap-1 sm:gap-1.5">
                            <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono">
                              <span className="text-slate-300 font-bold truncate">Remote (WFH)</span>
                              <span className="text-cyan-300 font-black">7 / 10</span>
                            </div>
                            <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden p-0.2">
                              <div className="bg-gradient-to-r from-cyan-400 to-teal-400 h-full rounded-full w-[70%] shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature 3: Vacation & Trip Itineraries Showcase (Hidden on Mobile for Zero-Scroll Compactness) */}
                    <div className="hidden sm:flex bg-gradient-to-b from-card/90 to-card/50 dark:from-white/[0.04] dark:to-white/[0.01] border border-border/70 dark:border-white/[0.08] rounded-2xl p-3.5 sm:p-4 text-left flex-col gap-3 shadow-apple-sm relative overflow-hidden">
                      {/* Ambient Accent Glow */}
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/10 dark:bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-start gap-2.5 sm:gap-3 relative z-10">
                        <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl mt-0.5 border border-pink-500/20 shrink-0 shadow-inner">
                          <Palmtree size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Vacation & Trip Itineraries</h4>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-0.5">
                            Group multi-day leaves into tagged trip projects with automatic duration and coverage breakdowns.
                          </p>
                        </div>
                      </div>

                      {/* Abstracted Showcase: Itinerary Capsule with Gradient Depth */}
                      <div className="relative bg-gradient-to-br from-slate-900/95 via-black/90 to-slate-950/95 border border-white/[0.08] rounded-xl p-3 shadow-xl overflow-hidden flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-sm shadow-inner shrink-0">
                            🌴
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-100 truncate">Goa Beach Retreat</span>
                              <span className="text-[8px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded shrink-0">
                                Confirmed
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>Nov 12</span>
                              <span className="text-slate-400">─✈─</span>
                              <span>Nov 16</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-300 font-semibold">5 Days</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <div className="text-xs font-mono font-black text-pink-300">3 Leaves</div>
                          <div className="text-[8px] font-mono text-slate-400 mt-0.5">+2 Weekend Saved</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Name & Company Information */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col max-w-md mx-auto w-full my-auto py-2"
              >
                {/* Top Icon & Title Header - Gracefully shifts up and fades under top bar when searching company */}
                <motion.div 
                  animate={{ 
                    y: isCompanySearching ? -95 : 0, 
                    opacity: isCompanySearching ? 0 : 1,
                    scale: isCompanySearching ? 0.85 : 1
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="text-left flex flex-col items-start w-full mb-6"
                >
                  <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                    <User size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">User & Company Profile</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Set your display name and company brand.</p>
                </motion.div>

                <div className="flex flex-col gap-5">
                  {/* Name Field - Dims and shifts well above company box when searching company */}
                  <motion.div
                    animate={{ 
                      y: isCompanySearching ? -105 : 0, 
                      opacity: isCompanySearching ? 0.15 : 1 
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  >
                    <label className="text-xs font-bold text-foreground mb-1.5 block text-left">Your Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aditya Sharma"
                      className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                      autoFocus
                    />
                  </motion.div>

                  {/* Company Field - Smoothly shifts up to center the dropdown with huge clearance */}
                  <motion.div
                    animate={{ 
                      y: isCompanySearching ? -115 : 0 
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  >
                    <label className="text-xs font-bold text-foreground mb-1.5 block text-left flex items-center gap-1.5">
                      <Building2 size={14} className="text-primary" /> Company Name / URL
                    </label>
                    <CompanyInput
                      value={companyName}
                      onChange={(val) => setCompanyName(val)}
                      onOpenChange={(isOpen) => setIsCompanySearching(isOpen)}
                      placeholder="e.g. Nykaa, nykaa.com, Google..."
                    />
                    <motion.p 
                      animate={{ 
                        opacity: isCompanySearching ? 0 : 1,
                        height: isCompanySearching ? 0 : 'auto'
                      }}
                      transition={{ duration: 0.2 }}
                      className="text-[11px] text-muted-foreground text-left mt-1 overflow-hidden"
                    >
                      Type a company name or website domain (e.g. Nykaa or nykaa.com) to automagically fetch its brand icon.
                    </motion.p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: 3-Tier Quotas, Colors & Category Names */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 max-w-2xl mx-auto w-full"
              >
                <div className="text-left flex flex-col items-start w-full mb-1">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 shadow-inner">
                    <SlidersHorizontal size={24} />
                  </div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Leave Quotas & Policy Tiers</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Customize your vacation categories, monthly remote allowance, and bonus benefits.</p>
                </div>

                {/* 3-Tier Segmented Header Tabs */}
                <SegmentedPolicyTabs
                  tabs={[
                    {
                      id: 'annual',
                      label: 'Annual Bank',
                      shortLabel: 'Annual',
                      count: leaveConfigs.filter(c => c.tier === 'annual').length
                    },
                    {
                      id: 'wfh',
                      label: 'Work From Home',
                      shortLabel: 'WFH',
                      dotColor: leaveConfigs.find(c => c.id === 'wfh')?.enabled !== false ? 'bg-cyan-500' : 'bg-muted-foreground/40'
                    },
                    {
                      id: 'special',
                      label: 'Special Benefits',
                      shortLabel: 'Special',
                      count: leaveConfigs.filter(c => c.tier === 'special' && c.enabled).length
                    }
                  ]}
                  activeTab={onboardingTierTab}
                  onChange={setOnboardingTierTab}
                  layoutId="onboarding-tier-pill"
                />

                {/* Morphing Tab Viewport */}
                <MorphingTabContent activeKey={onboardingTierTab}>
                  {/* TIER 1: Annual Leave Bank */}
                  {onboardingTierTab === 'annual' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground sm:text-muted-foreground truncate">
                            Annual Vacation Bank
                          </span>
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            Deducts from core yearly allowance
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingAnnual(!isAddingAnnual)}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer flex-shrink-0 transition-colors"
                        >
                          <Plus size={13} /> Add Category
                        </button>
                      </div>

                    {/* Inline Creator for Custom Annual Category */}
                    {isAddingAnnual && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-primary/30 rounded-2xl p-4 flex flex-col gap-3 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase font-mono tracking-wider text-foreground">
                            New Annual Leave Category
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setIsAddingAnnual(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Category Name</label>
                            <input
                              type="text"
                              value={newAnnualName}
                              onChange={(e) => setNewAnnualName(e.target.value)}
                              placeholder="e.g. Casual Leave, Comp Off..."
                              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Annual Days Quota</label>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={newAnnualQuota}
                              onChange={(e) => setNewAnnualQuota(e.target.value)}
                              onBlur={() => {
                                const val = parseInt(newAnnualQuota, 10);
                                if (isNaN(val) || val < 1) setNewAnnualQuota('1');
                                else if (val > 60) setNewAnnualQuota('60');
                              }}
                              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <ConsecutiveLimitControl
                              value={newAnnualMaxConsecutive ? parseInt(newAnnualMaxConsecutive, 10) : null}
                              onChange={(val) => setNewAnnualMaxConsecutive(val ? String(val) : '')}
                              compact={true}
                              defaultLimit={2}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground mr-1">Color:</span>
                            {SELECTABLE_LEAVE_PALETTE.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setNewAnnualColor(c.id)}
                                className={`w-4 h-4 rounded-full ${c.bg} transition-transform ${
                                  newAnnualColor === c.id ? 'ring-2 ring-foreground scale-110' : 'opacity-60 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={!newAnnualName.trim()}
                            onClick={() => {
                              const cleanName = newAnnualName.trim();
                              if (!cleanName) return;
                              const parsedQuota = Math.max(1, parseInt(newAnnualQuota, 10) || 10);
                              const parsedMaxConsecutive = newAnnualMaxConsecutive ? Math.max(1, parseInt(newAnnualMaxConsecutive, 10)) : null;
                              const newId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10) + '_' + Date.now().toString().slice(-4);
                              const newConf = {
                                id: newId,
                                name: cleanName,
                                shortCode: deriveShortCode(cleanName),
                                tier: 'annual',
                                color: newAnnualColor,
                                quota: parsedQuota,
                                cadence: 'year',
                                deductsFromAnnual: true,
                                enabled: true,
                                isSystem: false,
                                allowsHalfDay: true,
                                constraints: { maxConsecutive: parsedMaxConsecutive, requiresNote: false, warningMessage: null }
                              };
                              setLeaveConfigs(prev => [...prev, newConf]);
                              setNewAnnualName('');
                              setNewAnnualQuota('10');
                              setNewAnnualMaxConsecutive('');
                              setIsAddingAnnual(false);
                            }}
                            className="px-4 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs disabled:opacity-40 cursor-pointer"
                          >
                            Add to Bank
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Auto-Adapting Wheel Pickers Grid */}
                    {(() => {
                      const annuals = leaveConfigs.filter(c => c.tier === 'annual');
                      const gridColsClass = annuals.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 sm:grid-cols-2';
                      return (
                        <div className={`grid ${gridColsClass} gap-3.5`}>
                          {annuals.map((conf) => (
                            <AppleWheelPicker
                              key={conf.id}
                              code={conf.shortCode}
                              label={conf.name}
                              value={conf.quota}
                              onChange={(val) => {
                                setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, quota: val } : c));
                              }}
                              min={0}
                              max={45}
                              customName={conf.name}
                              onCustomNameChange={(val) => {
                                setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, name: val, shortCode: deriveShortCode(val) } : c));
                              }}
                              color={conf.color}
                              onColorChange={(val) => {
                                setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, color: val } : c));
                              }}
                              maxConsecutive={conf.constraints?.maxConsecutive}
                              onMaxConsecutiveChange={(val) => {
                                setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? {
                                  ...c,
                                  constraints: { ...(c.constraints || {}), maxConsecutive: val }
                                } : c));
                              }}
                              onRemove={annuals.length > 1 ? () => {
                                setLeaveConfigs(prev => prev.filter(c => c.id !== conf.id));
                              } : null}
                            />
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* TIER 2: Monthly Remote (WFH) */}
                {onboardingTierTab === 'wfh' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    {(() => {
                      const wfhConf = leaveConfigs.find(c => c.id === 'wfh') || { quota: 10, enabled: true, color: 'cyan', name: 'Work From Home' };
                      return (
                        <div className="flex flex-col gap-4">
                          <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                                <Home size={18} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-foreground">Enable Work From Home (WFH)</h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Enable monthly remote attendance tracking and daily check-in alerts.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={wfhConf.enabled !== false}
                              data-testid="wfh-toggle-checkbox"
                              onClick={() => {
                                const nextVal = wfhConf.enabled === false;
                                setLeaveConfigs(prev => prev.map(c => c.id === 'wfh' ? { ...c, enabled: nextVal } : c));
                              }}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                wfhConf.enabled !== false
                                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30 scale-100'
                                  : 'bg-card border-slate-400 dark:border-slate-500 hover:border-primary text-transparent'
                              }`}
                              title={wfhConf.enabled !== false ? 'WFH Enabled (Click to disable)' : 'WFH Disabled (Click to enable)'}
                            >
                              <Check size={13} strokeWidth={3.5} className={wfhConf.enabled !== false ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} />
                            </button>
                          </div>

                          {wfhConf.enabled !== false && (
                            <div className="max-w-xs mx-auto w-full">
                              <AppleWheelPicker
                                code="WFH"
                                label="Monthly WFH"
                                value={wfhConf.quota}
                                onChange={(val) => {
                                  setLeaveConfigs(prev => prev.map(c => c.id === 'wfh' ? { ...c, quota: val } : c));
                                }}
                                min={0}
                                max={30}
                                customName={wfhConf.name}
                                onCustomNameChange={(val) => {
                                  setLeaveConfigs(prev => prev.map(c => c.id === 'wfh' ? { ...c, name: val } : c));
                                }}
                                color={wfhConf.color || 'cyan'}
                                onColorChange={(val) => {
                                  setLeaveConfigs(prev => prev.map(c => c.id === 'wfh' ? { ...c, color: val } : c));
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* TIER 3: Special Benefits (Menstrual, Bereavement, Custom) */}
                {onboardingTierTab === 'special' && (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] text-muted-foreground">
                        Bonus policy benefits that do <strong>not</strong> deduct from your annual vacation bank:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSpecial(!isAddingSpecial);
                          setEditingSpecialId(null);
                        }}
                        className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
                      >
                        <Plus size={13} /> Add Benefit
                      </button>
                    </div>

                    {/* Inline Creator for Custom Special Benefit */}
                    {isAddingSpecial && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-primary/30 rounded-2xl p-4 flex flex-col gap-3 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase font-mono tracking-wider text-foreground">
                            New Special Benefit
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setIsAddingSpecial(false)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Benefit Name</label>
                            <input
                              type="text"
                              value={newSpecialName}
                              onChange={(e) => setNewSpecialName(e.target.value)}
                              placeholder="e.g. Mental Health Day, Study Leave..."
                              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Allowance Days Quota</label>
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
                              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Frequency Cadence</label>
                            <select
                              value={newSpecialCadence}
                              onChange={(e) => setNewSpecialCadence(e.target.value)}
                              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                              <option value="month">Per Calendar Month</option>
                              <option value="year">Per Year</option>
                              <option value="event">Per Occurrence / Total</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Subtitle / Description</label>
                          <input
                            type="text"
                            value={newSpecialSubtitle}
                            onChange={(e) => setNewSpecialSubtitle(e.target.value)}
                            placeholder="e.g. Personal rest and wellbeing allowance"
                            className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-1.5">
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

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground mr-1">Color:</span>
                            {SELECTABLE_LEAVE_PALETTE.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setNewSpecialColor(c.id)}
                                className={`w-4 h-4 rounded-full ${c.bg} transition-transform cursor-pointer ${
                                  newSpecialColor === c.id ? 'ring-2 ring-foreground scale-110' : 'opacity-60 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={!newSpecialName.trim()}
                            onClick={() => {
                              const cleanName = newSpecialName.trim();
                              if (!cleanName) return;
                              const parsedQuota = Math.max(1, parseInt(newSpecialQuota, 10) || 1);
                              const newId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10) + '_' + Date.now().toString().slice(-4);
                              const newConf = {
                                id: newId,
                                name: cleanName,
                                shortCode: deriveShortCode(cleanName),
                                tier: 'special',
                                color: newSpecialColor,
                                icon: newSpecialIcon,
                                quota: parsedQuota,
                                cadence: newSpecialCadence,
                                subtitle: newSpecialSubtitle.trim() || 'Company benefit allowance',
                                deductsFromAnnual: false,
                                enabled: true,
                                isSystem: false,
                                allowsHalfDay: true,
                                constraints: { maxConsecutive: null, requiresNote: false, warningMessage: null }
                              };
                              setLeaveConfigs(prev => [...prev, newConf]);
                              setNewSpecialName('');
                              setNewSpecialQuota('1');
                              setNewSpecialSubtitle('');
                              setIsAddingSpecial(false);
                            }}
                            className="px-4 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs disabled:opacity-40 cursor-pointer ml-auto"
                          >
                            Add Benefit
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      {leaveConfigs.filter(c => c.tier === 'special').map(conf => {
                        const Icon = getSpecialBenefitIcon(conf);
                        const isEditing = editingSpecialId === conf.id;
                        const isAnotherEditing = editingSpecialId !== null && !isEditing;
                        const colorTheme = getLeaveColor(conf.color || 'pink');

                        return (
                          <div
                            key={conf.id}
                            className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
                              isEditing 
                                ? 'bg-card border-primary/60 shadow-xl ring-2 ring-primary/20 z-10' 
                                : isAnotherEditing
                                  ? 'opacity-25 pointer-events-none filter grayscale-[30%]'
                                  : conf.enabled 
                                    ? 'bg-card border-border/80 shadow-xs' 
                                    : 'bg-muted/20 border-border/40 opacity-80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div 
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                    conf.enabled ? `${colorTheme.badge}` : 'bg-muted text-muted-foreground'
                                  }`}
                                  style={conf.enabled ? { color: colorTheme.hex } : undefined}
                                >
                                  <Icon size={16} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span 
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: colorTheme.hex }}
                                      title={colorTheme.name}
                                    />
                                    <span className="text-xs font-bold text-foreground">
                                      {conf.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground font-medium">
                                      ({conf.cadence === 'month' ? `${conf.quota}d / mo` : conf.cadence === 'year' ? `${conf.quota}d / yr` : `${conf.quota} days`})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed break-words mt-0.5 line-clamp-2 sm:line-clamp-none">
                                    {conf.subtitle || (conf.cadence === 'month' ? 'Monthly health and wellness allowance' : 'Company benefit allowance')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                {conf.enabled && !isEditing && (
                                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, quota: Math.max(1, (parseInt(c.quota, 10) || 1) - 1) } : c));
                                      }}
                                      className="w-5 h-5 rounded-lg bg-card hover:bg-muted text-foreground flex items-center justify-center text-xs font-bold font-mono transition-colors cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      max={90}
                                      value={conf.quota ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10));
                                        setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, quota: val } : c));
                                      }}
                                      onBlur={() => {
                                        if (!conf.quota || conf.quota < 1) {
                                          setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, quota: 1 } : c));
                                        }
                                      }}
                                      className="w-9 text-center text-xs font-bold font-mono bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, quota: (parseInt(c.quota, 10) || 1) + 1 } : c));
                                      }}
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
                                  aria-checked={conf.enabled}
                                  onClick={() => {
                                    setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, enabled: !c.enabled } : c));
                                  }}
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                    conf.enabled
                                      ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30 scale-100'
                                      : 'bg-slate-900/90 dark:bg-slate-950 border-slate-400 dark:border-slate-500 hover:border-primary text-transparent'
                                  }`}
                                  title={conf.enabled ? 'Active benefit (Click to disable)' : 'Inactive benefit (Click to enable)'}
                                >
                                  <Check size={13} strokeWidth={3.5} className={conf.enabled ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} />
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
                                    onClick={() => setEditingSpecialId(conf.id)}
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
                                      value={conf.name}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, name: val, shortCode: deriveShortCode(val) } : c));
                                      }}
                                      className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Days Quota</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={90}
                                      value={conf.quota ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10));
                                        setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, quota: val } : c));
                                      }}
                                      onBlur={() => {
                                        if (!conf.quota || conf.quota < 1) {
                                          setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, quota: 1 } : c));
                                        }
                                      }}
                                      className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Cadence</label>
                                    <select
                                      value={conf.cadence}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, cadence: val } : c));
                                      }}
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
                                    value={conf.subtitle || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, subtitle: val } : c));
                                    }}
                                    placeholder="Brief benefit description..."
                                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-bold text-muted-foreground mr-1">Icon:</span>
                                    {BENEFIT_ICON_PRESETS.map((p) => {
                                      const PIcon = p.icon;
                                      return (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, icon: p.id } : c));
                                          }}
                                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                            (conf.icon || 'sparkles') === p.id
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

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-muted-foreground mr-1">Color:</span>
                                    {SELECTABLE_LEAVE_PALETTE.map((pal) => (
                                      <button
                                        key={pal.id}
                                        type="button"
                                        onClick={() => {
                                          setLeaveConfigs(prev => prev.map(c => c.id === conf.id ? { ...c, color: pal.id } : c));
                                        }}
                                        className={`w-4 h-4 rounded-full ${pal.bg} transition-transform cursor-pointer ${
                                          (conf.color || 'pink') === pal.id ? 'ring-2 ring-foreground scale-110' : 'opacity-60 hover:opacity-100'
                                        }`}
                                        title={pal.name}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLeaveConfigs(prev => prev.filter(c => c.id !== conf.id));
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
                  </div>
                )}
                </MorphingTabContent>
              </motion.div>
            )}

            {/* STEP 4: Company Public Holidays */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <HolidayManager
                  initialHolidays={holidays}
                  onChange={(updated) => setHolidays(updated)}
                  showTitle={true}
                />
              </motion.div>
            )}

            {/* STEP 5: Prompt Time & Notifications */}
            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6 max-w-md mx-auto py-2 text-left"
              >
                <div className="flex flex-col items-start w-full">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                    <Bell size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Check-in Prompt & Notifications</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Set your preferred time for daily attendance prompts and enable browser notifications.</p>
                </div>

                {/* Prompt Hour Selector */}
                <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-left flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" /> Daily Attendance Prompt Time
                  </label>
                  <select
                    value={wfhPromptHour}
                    onChange={(e) => setWfhPromptHour(e.target.value)}
                    className="bg-card border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
                  >
                    <option value="9">9:00 AM (Morning Start)</option>
                    <option value="10">10:00 AM</option>
                    <option value="11">11:00 AM</option>
                    <option value="12">12:00 PM (Midday Check-in - Default)</option>
                    <option value="13">1:00 PM (After Lunch)</option>
                    <option value="17">5:00 PM (End of Workday)</option>
                    <option value="18">6:00 PM</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    On unbooked workdays, Leave Vault will prompt you at this hour to check-in as WFH or In-Office.
                  </p>
                </div>

                {/* Enable Notifications Card */}
                <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-left flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className={notifGranted ? "text-emerald-500" : "text-primary"} />
                      <span className="text-xs font-bold text-foreground">
                        {typeof window !== 'undefined' && (/iphone|ipad|ipod|android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
                          ? 'Daily Attendance Reminders'
                          : 'Desktop & Browser Reminders'}
                      </span>
                    </div>
                    {notifGranted && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                        Enabled ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {typeof window !== 'undefined' && (/iphone|ipad|ipod|android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
                      ? 'Receive mobile check-in reminders so you never miss logging your WFH workdays.'
                      : 'Receive desktop check-in reminders so you never miss logging your WFH workdays.'}
                  </p>
                  {!notifGranted ? (
                    <button
                      type="button"
                      onClick={handleRequestNotif}
                      className="py-2.5 px-4 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Bell size={14} /> {typeof window !== 'undefined' && (/iphone|ipad|ipod|android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
                        ? 'Enable Reminders'
                        : 'Enable Desktop Notifications'}
                    </button>
                  ) : (
                    <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                      <Check size={14} strokeWidth={3} /> Notifications active and configured!
                    </div>
                  )}
                </div>

                {/* Smart Assistant & Document Extractor Card (Optional) */}
                <div className="bg-gradient-to-r from-[#0f172a] via-[#1e3a6e] to-[#1d4ed8] text-white rounded-2xl p-4 text-left flex flex-col gap-2.5 border border-blue-500/30 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-300 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider font-mono">Assistant Key (Optional)</span>
                    </div>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-blue-200 hover:text-white flex items-center gap-1"
                    >
                      Get Free Key (Gemini) <ExternalLink size={10} />
                    </a>
                  </div>
                  <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                    Enables conversational trip planning, natural language leave booking, and automatic holiday sheet extraction.
                  </p>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Paste API key (or skip for later)"
                    className="w-full bg-card/20 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-white transition-colors shadow-inner"
                  />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation Controls */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-between items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-5 py-3 bg-muted border border-border text-foreground font-bold text-xs rounded-2xl hover:bg-muted/80 transition-all cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto cursor-pointer"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto cursor-pointer"
            >
              Complete Setup <Check size={14} strokeWidth={3} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;
