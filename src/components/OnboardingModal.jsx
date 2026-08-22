import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CalendarDays, MapPin, Home, ArrowRight, Check, User, 
  SlidersHorizontal, Building2, Clock, Bell, ShieldCheck 
} from 'lucide-react';
import AppleWheelPicker from './AppleWheelPicker';
import CompanyInput from './CompanyInput';
import HolidayManager from './HolidayManager';
import { getStoredHolidays, saveStoredHolidays } from '../data/holidays';

const OnboardingModal = ({ isOpen, onClose, onComplete, initialName = '' }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialName && initialName !== 'User' ? initialName : (typeof window !== 'undefined' ? localStorage.getItem('user_name') || '' : ''));
  const [companyName, setCompanyName] = useState('');
  const [wfhPromptHour, setWfhPromptHour] = useState('12');
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [holidays, setHolidays] = useState(() => getStoredHolidays());

  React.useEffect(() => {
    if (isOpen) {
      if (initialName && initialName !== 'User') {
        setName(initialName);
      } else {
        const saved = localStorage.getItem('user_name');
        if (saved && saved !== 'User') setName(saved);
      }
    }
  }, [isOpen, initialName]);

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
    if (typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification)) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotifGranted(true);
          try {
            new Notification('Attendance Reminders Enabled', {
              body: `Daily check-in reminders set for ${wfhPromptHour}:00.`,
              icon: '/favicon.ico'
            });
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  };

  const handleFinish = () => {
    saveStoredHolidays(holidays);
    if (onComplete) {
      onComplete({
        name: name.trim() || 'User',
        companyName: companyName.trim(),
        wfhPromptHour,
        notifEnabled: notifGranted,
        quotas,
        names,
        colors,
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
      <div className="relative bg-card w-full max-w-4xl mx-auto rounded-[32px] border border-border shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        
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
        <div className="p-6 overflow-y-auto flex-1 no-scrollbar flex flex-col justify-center min-h-[440px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Feature Showcase */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6 max-w-xl mx-auto w-full my-auto"
              >
                <div className="text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3 shadow-inner">
                    <Sparkles size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">{slides[0].title}</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{slides[0].subtitle}</p>
                </div>

                <div className="flex flex-col gap-3">
                  {slides[0].highlights.map((h, i) => {
                    const IconComp = h.icon;
                    return (
                      <div key={i} className="flex items-start gap-3.5 bg-muted/40 border border-border/60 p-4 rounded-2xl">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl mt-0.5">
                          <IconComp size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{h.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{h.desc}</p>
                        </div>
                      </div>
                    );
                  })}
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
                  className="text-center flex flex-col items-center mb-6"
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
                      <Building2 size={14} className="text-primary" /> Company Name & Logo
                    </label>
                    <CompanyInput
                      value={companyName}
                      onChange={(val) => setCompanyName(val)}
                      onOpenChange={(isOpen) => setIsCompanySearching(isOpen)}
                      placeholder="Search company (e.g. Google, Microsoft...)"
                    />
                    <motion.p 
                      animate={{ 
                        opacity: isCompanySearching ? 0 : 1,
                        height: isCompanySearching ? 0 : 'auto'
                      }}
                      transition={{ duration: 0.2 }}
                      className="text-[11px] text-muted-foreground text-left mt-1 overflow-hidden"
                    >
                      Auto-detects and displays your official company logo in the header.
                    </motion.p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Quotas, Colors & Names */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <SlidersHorizontal size={24} />
                  </div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Quotas, Colors & Category Names</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure your annual leave limits, category names, and UI theme colors.</p>
                </div>

                {/* 4 Horizontally Stacked Columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* PL Tumbler */}
                  <AppleWheelPicker
                    code="PL"
                    label="Privileged Leave"
                    value={quotas.pl}
                    onChange={(val) => setQuotas(q => ({ ...q, pl: val }))}
                    min={0} max={30}
                    customName={names.pl}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, pl: val }))}
                    color={colors.pl}
                    onColorChange={(val) => setColors(c => ({ ...c, pl: val }))}
                  />

                  {/* EL Tumbler */}
                  <AppleWheelPicker
                    code="EL"
                    label="Emergency Leave"
                    value={quotas.el}
                    onChange={(val) => setQuotas(q => ({ ...q, el: val }))}
                    min={0} max={20}
                    customName={names.el}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, el: val }))}
                    color={colors.el}
                    onColorChange={(val) => setColors(c => ({ ...c, el: val }))}
                  />

                  {/* RH Tumbler */}
                  <AppleWheelPicker
                    code="RH"
                    label="Extra Leave"
                    value={quotas.rh}
                    onChange={(val) => setQuotas(q => ({ ...q, rh: val }))}
                    min={0} max={10}
                    customName={names.rh}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, rh: val }))}
                    color={colors.rh}
                    onColorChange={(val) => setColors(c => ({ ...c, rh:val }))}
                  />

                  {/* WFH Tumbler */}
                  <AppleWheelPicker
                    code="WFH"
                    label="Monthly WFH"
                    value={quotas.wfh}
                    onChange={(val) => setQuotas(q => ({ ...q, wfh: val }))}
                    min={0} max={20}
                    customName={names.wfh}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, wfh: val }))}
                    color={colors.wfh}
                    onColorChange={(val) => setColors(c => ({ ...c, wfh: val }))}
                  />

                </div>
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
                className="flex flex-col gap-6 max-w-md mx-auto py-2 text-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Bell size={32} />
                </div>
                <div>
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
