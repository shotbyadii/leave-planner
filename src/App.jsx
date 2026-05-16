import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, ListTodo, RotateCw, Menu, X, Sparkles, Moon, Sun, Check, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicHolidays, isHoliday, isWeekend } from './data/holidays';
import { fetchBookedLeaves, fetchLeavePlans, resetAllLeaves, removeLeave, deleteLeavePlan, addLeave, createLeavePlan } from './services/leaveService';
import Calendar from './components/Calendar';
import OptimizerPanel from './components/OptimizerPanel';
import LeaveTracker from './components/LeaveTracker';
import TripPlanner from './components/TripPlanner';
import { TimePicker } from './components/TimePicker';
import LeaveSelectionBar from './components/LeaveSelectionBar';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [leaves, setLeaves] = useState({
    pl: { total: 15, used: 0, label: 'Privileged', color: 'blue', bg: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600' },
    el: { total: 10, used: 0, label: 'Emergency', color: 'orange', bg: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600' },
    rh: { total: 1, used: 0, label: 'Restricted', color: 'green', bg: 'bg-green-400', badge: 'bg-green-50 text-green-600' }
  });
  const [bookedDates, setBookedDates] = useState([]);
  const [leavePlans, setLeavePlans] = useState([]);
  const [previewDates, setPreviewDates] = useState([]);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);
  const [calendarViewMode, setCalendarViewMode] = useState(window.innerWidth < 768 ? 'monthly' : 'yearly');
  const [calendarFocusedMonth, setCalendarFocusedMonth] = useState(new Date().getMonth());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [mobileConfirmOpen, setMobileConfirmOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  // Mobile confirmation form state
  const [mobileLeaveType, setMobileLeaveType] = useState('pl');
  const [mobilePlanName, setMobilePlanName] = useState('');
  const [mobileNote, setMobileNote] = useState('');
  const [mobileFromHour, setMobileFromHour] = useState(9);
  const [mobileToHour, setMobileToHour] = useState(18);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    loadLeaves();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadLeaves = async () => {
    const dbLeaves = await fetchBookedLeaves();
    const dbPlans = await fetchLeavePlans();
    setBookedDates(dbLeaves);
    setLeavePlans(dbPlans);
    updateLeaveCounts(dbLeaves);
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

  const handleReset = async () => {
    await resetAllLeaves();
    setBookedDates([]);
    setLeavePlans([]);
    updateLeaveCounts([]);
    setPreviewDates([]);
    setShowResetConfirm(false);
  };

  const handleDeleteLeave = async (dateStr) => {
    await removeLeave(dateStr);
    const newDates = bookedDates.filter(d => d.date !== dateStr);
    setBookedDates(newDates);
    updateLeaveCounts(newDates);
  };

  const handleDeletePlan = async (planId) => {
    await deleteLeavePlan(planId);
    await loadLeaves(); // Reload everything since CASCADE deletes leaves too
  };

  const handlePreviewRange = (datesArray) => {
    setActiveTab('calendar');
    setPreviewDates(datesArray);
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    const dates = previewDates;
    const elDiffHours = mobileToHour > mobileFromHour ? mobileToHour - mobileFromHour : 0;
    const isHalfDay = mobileLeaveType === 'el' && dates.length === 1 && elDiffHours > 0 && elDiffHours < 4.5;
    const durationPerDay = isHalfDay ? 0.5 : 1;
    let planId = null;
    if (dates.length > 1) {
      const plan = await createLeavePlan(mobilePlanName || 'Untitled Plan', dates[0], dates[dates.length - 1]);
      planId = plan?.id || null;
    }
    for (const dateStr of dates) {
      if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
        await addLeave(dateStr, mobileLeaveType, mobileNote, planId, durationPerDay);
      }
    }
    await loadLeaves();
    setPreviewDates([]);
    setSelectionStart(null);
    setMobileConfirmOpen(false);
    setMobileNote('');
    setMobileLeaveType('pl');
  };

  return (
    <div className="h-screen bg-background flex flex-col font-sans text-foreground overflow-hidden">
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-[0_1px_0_0_hsl(var(--border)),0_4px_24px_-4px_hsl(var(--foreground)/0.06)]">
        <header className="hidden md:flex px-6 py-2.5 justify-between items-center gap-6">
          {/* Desktop Top Bar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-primary text-primary-foreground rounded-md p-1.5 w-7 h-7 flex items-center justify-center font-bold text-sm">LV</div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest leading-none">Leave Vault</h1>
              <span className="text-sm font-semibold font-mono text-foreground tracking-tight leading-snug">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
                  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return `${greeting}, it's ${date}`;
                })()}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 overflow-x-auto hide-scrollbar shrink-0">
            {Object.entries(leaves).map(([key, data]) => {
              const percentage = ((data.total - data.used) / data.total) * 100;
              const remaining = data.total - data.used;
              const remainingFmt = Number.isInteger(remaining) ? remaining : remaining.toFixed(1);
              const usedFmt = Number.isInteger(data.used) ? data.used : data.used.toFixed(1);
              return (
                <div key={key} className="flex flex-col w-28">
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[10px] font-semibold font-mono text-muted-foreground uppercase">{key} <span className={`ml-1 text-[9px] font-sans lowercase px-1 rounded ${data.badge}`}>{data.label}</span></span>
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
            <div className="flex items-center gap-2 border-l border-border pl-6 ml-2">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle Theme" className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors">
                {theme === 'dark' ? <Sun size={16} className="text-muted-foreground" /> : <Moon size={16} className="text-muted-foreground" />}
              </button>
              <button onClick={() => setShowResetConfirm(true)} title="Reset all leaves" className="p-1.5 border border-border rounded-md hover:bg-red-50 hover:text-red-600 transition-colors">
                <RotateCw size={16} className="text-muted-foreground hover:text-red-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Tabs */}
        <div className="hidden md:block px-6">
          <div className="flex gap-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <button className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'calendar' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('calendar')}>
              <CalendarIcon size={15} /> Calendar
            </button>
            <button className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'trips' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('trips')}>
              <MapPin size={15} /> Trip Planner
            </button>
            <button className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'tracker' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('tracker')}>
              <ListTodo size={15} /> Leave Tracker
              <span className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs">{bookedDates.length}</span>
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
            />
          </div>
        )}

        <div className={`flex-1 flex flex-col bg-background md:bg-card md:rounded-2xl md:border border-border md:shadow-apple-sm overflow-hidden h-full relative ${activeTab === 'calendar' ? 'z-30' : 'z-10'}`}>
          {activeTab === 'calendar' && (
            <div className="hidden md:flex p-4 border-b border-border gap-6 items-center bg-muted/30 overflow-x-auto whitespace-nowrap hide-scrollbar">
              <span className="text-sm font-medium text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-muted border border-border"></div> Weekend</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-purple-200"></div> Holiday</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-blue-300"></div> PL</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-orange-300"></div> EL</div>
              <div className="flex items-center gap-2 text-sm text-foreground font-normal"><div className="w-3 h-3 rounded-full bg-green-300"></div> RH</div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-6 relative">
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
                    holidays={publicHolidays} 
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
                  />
                  <div className="md:hidden bg-card border border-border rounded-2xl shadow-apple-sm overflow-hidden flex-shrink-0">
                    <OptimizerPanel 
                      onPreviewRange={handlePreviewRange} 
                      onHoverSuggestion={setHoveredSuggestion}
                      bookedDates={bookedDates.map(d=>d.date)}
                      viewMode={calendarViewMode}
                      setFocusedMonth={setCalendarFocusedMonth}
                      inlineOnMobile={true}
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
                    leaves={leaves} 
                    leavePlans={leavePlans}
                  />
                </motion.div>
              )}
              {activeTab === 'trips' && (
                <motion.div 
                  key="trips"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TripPlanner 
                    leavePlans={leavePlans} 
                    bookedDates={bookedDates} 
                    leaves={leaves}
                    holidays={publicHolidays}
                    onPreviewRange={handlePreviewRange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>



      {/* ── UNIFIED MOBILE BOTTOM BAR ── */}
      {/* Gradient fade behind the bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-40" />

      {/* Backdrop when menu open */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[48]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="md:hidden fixed bottom-6 left-0 right-0 z-[50] flex justify-center px-4 pointer-events-none">
        <motion.div
          layout
          transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          className={`pointer-events-auto overflow-hidden border border-border shadow-[0_8px_32px_-4px_hsl(var(--foreground)/0.18)] ${
            isMobileMenuOpen || mobileConfirmOpen
              ? 'w-full rounded-[28px] bg-background'
              : (selectionStart !== null || previewDates.length > 0)
                ? 'w-full rounded-[28px] bg-foreground text-background'
                : 'w-full max-w-sm rounded-[28px] bg-background'
          }`}
        >
        <AnimatePresence mode="wait">

          {/* ── MENU STATE ── */}
          {isMobileMenuOpen && (
            <motion.div key="menu"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              {/* Header row */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground rounded-md w-7 h-7 flex items-center justify-center font-bold text-xs">LV</div>
                  <span className="font-bold font-mono text-sm text-foreground">Leave Vault</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-full">
                  <X size={16} />
                </button>
              </div>
              {/* Balances */}
              <div className="px-4 py-4 flex flex-col gap-3">
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
              </div>
              {/* Actions */}
              <div className="px-4 pb-6 pt-2 border-t border-border flex gap-3">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted border border-border text-foreground rounded-xl text-xs font-bold hover:bg-muted/80 transition-colors">
                  {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); setShowResetConfirm(true); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors">
                  <RotateCw size={15}/> <span>Reset</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── CONFIRMATION FORM STATE ── */}
          {mobileConfirmOpen && !isMobileMenuOpen && (
            <motion.div key="confirm-form"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
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
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(leaves).map(([key, data]) => {
                      const isActive = mobileLeaveType === key;
                      const colors = {
                        pl: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', shadow: 'shadow-blue-500/20' },
                        el: { border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', shadow: 'shadow-orange-500/20' },
                        rh: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', shadow: 'shadow-green-500/20' }
                      };
                      const colorStyle = colors[key] || { border: 'border-border', bg: 'bg-card', text: 'text-muted-foreground', shadow: '' };
                      return (
                        <button
                          key={key}
                          onClick={() => setMobileLeaveType(key)}
                          className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                            isActive ? `${colorStyle.border} ${colorStyle.bg} ${colorStyle.text} shadow-sm ${colorStyle.shadow} ring-1 ring-inset ring-black/5` : 'border-border bg-card text-muted-foreground opacity-60'
                          }`}
                        >
                          <span className="text-[11px] font-black uppercase tracking-widest leading-none">{key}</span>
                          <span className="text-[8px] font-bold opacity-80 leading-none">{data.total - data.used} left</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* EL Warning synced with desktop */}
                {mobileLeaveType === 'el' && previewDates.filter(d => !isHoliday(d) && !isWeekend(d)).length > 2 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-3 items-start shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-red-800">
                      <span className="font-black block mb-1 uppercase tracking-wider text-[10px]">Medical Certificate Required</span>
                      You are applying for more than 2 consecutive Emergency Leaves. Please ensure you have a valid medical certificate to provide to HR.
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
                  <button onClick={handleMobileApply} className="flex-[2] py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2">
                    Confirm & Apply <Check size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SELECTION STATE (date selected, not yet confirmed) ── */}
          {!isMobileMenuOpen && !mobileConfirmOpen && (selectionStart !== null || previewDates.length > 0) && (
            <motion.div key="selection"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 px-4 h-[62px]"
            >
              <div className="flex-1">
                {selectionStart && previewDates.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-sm font-semibold text-background">Select end date</span>
                  </div>
                                ) : (
                  <div className="flex items-center gap-2">
                    <div className="bg-background/20 text-background text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-background/20 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      {previewDates.filter(d => !isHoliday(d) && !isWeekend(d)).length} leaves • {previewDates.length} days
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => { setSelectionStart(null); setPreviewDates([]); }} className="text-xs font-bold text-background/70 hover:text-background px-3 py-2 rounded-full hover:bg-background/20">
                Cancel
              </button>
              {previewDates.length > 0 && (
                <button onClick={() => setMobileConfirmOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-background px-4 py-2 rounded-full shadow-md">
                  Confirm <Check size={13} strokeWidth={3}/>
                </button>
              )}
            </motion.div>
          )}

          {/* ── NAV STATE (default) ── */}
          {!isMobileMenuOpen && selectionStart === null && previewDates.length === 0 && (
            <motion.div key="nav"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Mini usage bar */}
              {(() => {
                const total = leaves.pl.total + leaves.el.total + leaves.rh.total;
                const pctPL = (leaves.pl.used / total) * 100;
                const pctEL = (leaves.el.used / total) * 100;
                const pctRH = (leaves.rh.used / total) * 100;
                const totalUsed = leaves.pl.used + leaves.el.used + leaves.rh.used;
                const totalUsedFmt = Number.isInteger(totalUsed) ? totalUsed : totalUsed.toFixed(1);
                return (
                  <div className="border-b border-border/40">
                    <div className="h-1 w-full bg-transparent flex">
                      <div className="h-full bg-blue-500" style={{ width: `${pctPL}%` }} />
                      <div className="h-full bg-orange-500" style={{ width: `${pctEL}%` }} />
                      <div className="h-full bg-green-500" style={{ width: `${pctRH}%` }} />
                    </div>
                    <div className="flex justify-between px-4 py-1">
                      <span className="text-[9px] font-bold tracking-widest text-foreground uppercase">{totalUsedFmt} / {total} Used</span>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>PL</span>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"/>EL</span>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>RH</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="flex justify-around items-center px-2 py-1.5">
                {[{tab:'calendar',Icon:CalendarIcon,label:'Calendar'},{tab:'trips',Icon:MapPin,label:'Trips'},{tab:'tracker',Icon:ListTodo,label:'Tracker',badge:bookedDates.length}].map(({tab,Icon,label,badge}) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-colors ${activeTab===tab?'text-primary':'text-muted-foreground hover:text-foreground'}`}>
                    <div className="relative">
                      <Icon size={20} className="mb-1"/>
                      {badge > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{badge}</span>}
                    </div>
                    <span className="text-[9px] font-bold tracking-wide">{label}</span>
                  </button>
                ))}
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

      {/* Desktop Selection Modal — Lifted for layering */}
      <div className="hidden md:block">
        {((selectionStart || previewDates.length > 0)) && (
          <LeaveSelectionBar 
            selectionStart={selectionStart}
            previewDates={previewDates}
            onCancel={() => { setSelectionStart(null); setPreviewDates([]); }}
            onApply={async (dates, type, note, planName, duration) => {
              // Reuse logic or call a common handler
              let planId = null;
              if (dates.length > 1) {
                const plan = await createLeavePlan(planName || 'Untitled Plan', dates[0], dates[dates.length - 1]);
                planId = plan?.id || null;
              }
              for (const dateStr of dates) {
                if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
                  await addLeave(dateStr, type, note, planId, duration);
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
    </div>
  );
}

export default App;
