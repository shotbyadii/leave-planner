import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Pencil, Check, X, CalendarDays, ArrowUpDown, ChevronUp, ChevronDown, Home } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import DeletePlanModal from './DeletePlanModal';
import { getLeaveTheme, getLeaveColor, getShortform } from '../utils/colorUtils';

const LeaveTracker = ({ 
  bookedDates, 
  onDelete, 
  onDeletePlan, 
  onUpdatePlan, 
  leaves, 
  leavePlans, 
  calendarStyle = 'classic',
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Restricted Leave', wfh: 'Work From Home' },
  maxWfh = 10
}) => {
  const plUsed = leaves.pl.used;
  const elUsed = leaves.el.used;
  const rhUsed = leaves.rh.used;
  
  const totalLeaves = leaves.pl.total + leaves.el.total + leaves.rh.total;
  const totalUsed = plUsed + elUsed + rhUsed;

  const [deletingPlan, setDeletingPlan] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingPlanName, setEditingPlanName] = useState('');

  const [expandedPlans, setExpandedPlans] = useState({});
  const togglePlanExpand = (id) => setExpandedPlans(prev => ({ ...prev, [id]: !prev[id] }));

  // Table Sorting State
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const renderMiniCalendar = (plan) => {
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);
    const year = 2026;
    
    const allDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      allDates.push({
        dateStr,
        dayOfWeek: new Date(dateStr).getDay(),
        day: new Date(dateStr).getDate(),
        isLeave: bookedDates.some(b => b.date === dateStr && b.plan_id === plan.id) || (plan.id === 'tutorial-demo-plan-temp' && !isWeekend(dateStr) && !isHoliday(dateStr)),
        isWeekend: isWeekend(dateStr),
        isHoliday: !!isHoliday(dateStr)
      });
    }

    const startDow = allDates[0]?.dayOfWeek || 0;
    const padBefore = [];
    for (let i = 0; i < startDow; i++) {
      padBefore.push(null);
    }

    const cells = [...padBefore, ...allDates];

    return (
      <div className="w-full bg-muted/20 dark:bg-muted/10 rounded-2xl p-3 border border-border/10 shadow-inner">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-[9px] font-black text-muted-foreground/40 text-center uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="w-full h-6"></div>;
            
            let classes = calendarStyle === 'capsule' 
              ? "w-full h-6 rounded-md flex items-center justify-center text-[10px] font-mono transition-all border "
              : "w-full h-6 rounded-md flex items-center justify-center text-[10px] font-mono transition-all ";
            
            if (calendarStyle === 'capsule') {
              if (cell.isLeave) {
                classes += "bg-blue-500/15 border-blue-500/40 text-blue-400 font-black scale-105 shadow-sm";
              } else if (cell.isHoliday) {
                classes += "bg-purple-500/15 border-purple-500/40 text-purple-400 font-black";
              } else if (cell.isWeekend) {
                classes += "bg-muted/10 border-transparent text-muted-foreground/30 font-medium";
              } else {
                classes += "bg-card/40 border-border/30 text-muted-foreground/60 font-bold";
              }
            } else {
              if (cell.isLeave) {
                classes += "text-blue-500 font-black scale-110 bg-blue-500/10 rounded-full border border-blue-500/20";
              } else if (cell.isHoliday) {
                classes += "text-purple-400 font-black";
              } else if (cell.isWeekend) {
                classes += "text-muted-foreground/30 font-medium";
              } else {
                classes += "text-muted-foreground/50 font-medium";
              }
            }
            
            return (
              <div key={idx} className={classes} title={cell.dateStr}>
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getLeavesForPlan = (planId) => {
    if (planId === 'tutorial-demo-plan-temp') {
      return [
        { date: '2026-09-10', type: 'pl', duration: 1 },
        { date: '2026-09-11', type: 'pl', duration: 1 },
        { date: '2026-09-14', type: 'pl', duration: 1 },
        { date: '2026-09-15', type: 'pl', duration: 1 }
      ];
    }
    return bookedDates.filter(d => d.plan_id === planId);
  };

  const handleConfirmDelete = async (planId) => {
    await onDeletePlan(planId);
    setDeletingPlan(null);
  };

  const handleSavePlanName = async (planId) => {
    if (editingPlanName.trim() && onUpdatePlan) {
      await onUpdatePlan(planId, editingPlanName.trim());
    }
    setEditingPlanId(null);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedBookedDates = [...bookedDates].sort((a, b) => {
    let valA, valB;
    if (sortField === 'date') {
      valA = new Date(a.date).getTime();
      valB = new Date(b.date).getTime();
    } else if (sortField === 'type') {
      valA = a.type || '';
      valB = b.type || '';
    } else if (sortField === 'duration') {
      valA = a.duration || 1;
      valB = b.duration || 1;
    } else if (sortField === 'plan') {
      valA = (a.plan_name || '').toLowerCase();
      valB = (b.plan_name || '').toLowerCase();
    } else {
      valA = a.date;
      valB = b.date;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40 ml-1" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} className="ml-1 text-primary" /> : <ChevronDown size={14} className="ml-1 text-primary" />;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Dashboard (Sticky) */}
      <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-6 xl:sticky xl:top-0 h-fit">
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a6e] to-[#1d4ed8] rounded-2xl border border-blue-900/30 shadow-apple-sm p-6">
          <h3 className="font-semibold text-white/60 mb-4 text-xs uppercase tracking-widest font-mono">Leave Utilization</h3>
          
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path className="text-white/10" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              
              <path 
                className="transition-all duration-1000 ease-out" 
                strokeDasharray={`${(plUsed/totalLeaves)*100}, 100`} 
                strokeWidth="3.5" stroke={getLeaveTheme(leaveColors.pl || 'blue').hex} fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
              
              <path 
                className="transition-all duration-1000 ease-out" 
                strokeDasharray={`${(elUsed/totalLeaves)*100}, 100`} 
                strokeDashoffset={`-${(plUsed/totalLeaves)*100}`}
                strokeWidth="3.5" stroke={getLeaveTheme(leaveColors.el || 'orange').hex} fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />

              <path 
                className="transition-all duration-1000 ease-out" 
                strokeDasharray={`${(rhUsed/totalLeaves)*100}, 100`} 
                strokeDashoffset={`-${((plUsed + elUsed)/totalLeaves)*100}`}
                strokeWidth="3.5" stroke={getLeaveTheme(leaveColors.rh || 'green').hex} fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono text-white">{Number.isInteger(totalUsed) ? totalUsed : totalUsed.toFixed(1)}</span>
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest font-mono">/ {totalLeaves} Used</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${getLeaveColor(leaveColors.pl || 'blue').bg}`}></div>
                 <span className="text-white/80 font-medium">{leaveNames.pl || 'Planned Leave'} ({getShortform(leaveNames.pl, 'PL')})</span>
               </div>
               <span className="font-semibold font-mono text-white">{Number.isInteger(plUsed) ? plUsed : plUsed.toFixed(1)} <span className="text-white/40 font-normal">/ {leaves.pl.total}</span></span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${getLeaveColor(leaveColors.el || 'orange').bg}`}></div>
                 <span className="text-white/80 font-medium">{leaveNames.el || 'Emergency Leave'} ({getShortform(leaveNames.el, 'EL')})</span>
               </div>
               <span className="font-semibold font-mono text-white">{Number.isInteger(elUsed) ? elUsed : elUsed.toFixed(1)} <span className="text-white/40 font-normal">/ {leaves.el.total}</span></span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${getLeaveColor(leaveColors.rh || 'green').bg}`}></div>
                 <span className="text-white/80 font-medium">{leaveNames.rh || 'Restricted Leave'} ({getShortform(leaveNames.rh, 'RH')})</span>
               </div>
               <span className="font-semibold font-mono text-white">{Number.isInteger(rhUsed) ? rhUsed : rhUsed.toFixed(1)} <span className="text-white/40 font-normal">/ {leaves.rh.total}</span></span>
             </div>
          </div>
        </div>

        {/* WFH Monthly Utilization Card */}
        {(() => {
          const curMonthKey = new Date().toISOString().substring(0, 7);
          const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
          const quotaWfh = maxWfh || 10;
          const isWfhOverQuota = wfhUsedThisMonth >= quotaWfh;
          const wfhOverAmount = wfhUsedThisMonth - quotaWfh;
          const wfhRemaining = Math.max(0, quotaWfh - wfhUsedThisMonth);
          const isWfhWarning = !isWfhOverQuota && wfhRemaining <= 2;
          const wfhTheme = getLeaveTheme(leaveColors.wfh || 'cyan');

          const cardStyle = isWfhOverQuota
            ? 'bg-gradient-to-br from-red-950/80 to-red-900/40 border-red-500/30'
            : isWfhWarning 
            ? 'bg-gradient-to-br from-amber-950/80 to-amber-900/40 border-amber-500/30' 
            : 'bg-card border-border';

          const badgeStyle = isWfhOverQuota
            ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
            : isWfhWarning 
            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
            : `${wfhTheme.activeBadge}`;

          const badgeText = isWfhOverQuota ? 'Over Quota' : (isWfhWarning ? 'Low Balance' : 'Normal');

          const subtitleText = isWfhOverQuota
            ? `+${wfhOverAmount} day${wfhOverAmount === 1 ? '' : 's'} over monthly quota`
            : `${wfhRemaining} ${getShortform(leaveNames.wfh, 'WFH')} day${wfhRemaining === 1 ? '' : 's'} remaining this month`;

          const strokeColor = isWfhOverQuota ? 'stroke-red-500' : (isWfhWarning ? 'stroke-amber-500' : 'stroke-cyan-400');

          return (
            <div className={`rounded-2xl border shadow-apple-sm p-5 transition-all ${cardStyle}`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`font-semibold text-xs uppercase tracking-widest ${wfhTheme.activeText} font-mono flex items-center gap-1.5`}>
                  <Home size={14} /> {leaveNames.wfh || 'Work From Home'}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                  {badgeText}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-black font-mono text-foreground">
                    {wfhUsedThisMonth}<span className="text-sm font-bold text-muted-foreground">/{quotaWfh}</span>
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {subtitleText}
                  </span>
                </div>
                
                <div className="w-14 h-14 relative flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="20" className="stroke-muted" strokeWidth="4" fill="transparent" />
                    <circle 
                      cx="28" cy="28" r="20" 
                      className={`transition-all duration-1000 ease-out ${strokeColor}`}
                      strokeWidth="4" 
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 - Math.min(1, wfhUsedThisMonth / quotaWfh) * 125.6}
                      strokeLinecap="round"
                      fill="transparent" 
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black font-mono text-foreground">
                    {Math.round((wfhUsedThisMonth / quotaWfh) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Right Content */}
      <div className="flex-1 flex flex-col gap-8">
        
        {/* Leave Plan Cards */}
        <div>
          <h2 className="font-bold text-xl text-foreground mb-1">Leave Plans</h2>
          <p className="text-sm text-muted-foreground mb-4">Your planned leave ranges, grouped and named.</p>

          {leavePlans.length === 0 ? (
            <div className="bg-card rounded-2xl border-2 border-dashed border-border p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-3">
                <CalendarDays size={24} />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No leave plans yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Select date ranges on the calendar and apply leaves to create plans.</p>
            </div>
          ) : (
            <div id="tutorial-step-leave-plans" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {leavePlans.map((plan) => {
                const planLeaves = getLeavesForPlan(plan.id);
                const start = new Date(plan.start_date);
                const end = new Date(plan.end_date);

                const allDatesInRange = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const ds = `${2026}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  allDatesInRange.push(ds);
                }
                const weekendsCount = allDatesInRange.filter(d => isWeekend(d)).length;
                const holidaysCount = allDatesInRange.filter(d => isHoliday(d) && !isWeekend(d)).length;
                const leavesCount = planLeaves.reduce((sum, l) => sum + (l.duration || 1), 0);
                
                const isEditing = editingPlanId === plan.id;
                const isExpanded = expandedPlans[plan.id] || false;

                return (
                  <div 
                    key={plan.id} 
                    id={(plan.id === 'tutorial-demo-plan-temp' || plan.is_demo || (plan.start_date === '2026-09-10' && plan.end_date === '2026-09-15')) ? 'tutorial-demo-plan-card' : undefined}
                    className="bg-card rounded-[24px] sm:rounded-[32px] border border-border shadow-apple-sm p-4 sm:p-7 hover:border-foreground/10 hover:shadow-apple transition-all group flex flex-col xl:flex-row gap-4 sm:gap-6 relative overflow-hidden"
                  >
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex-1 relative z-10 flex flex-col justify-between">
                      <div>
                        {/* Card Header (Mobile Collapsible Bar) */}
                        <div 
                          className="flex justify-between items-start mb-2 sm:mb-4 cursor-pointer sm:cursor-default" 
                          onClick={() => togglePlanExpand(plan.id)}
                        >
                          <div className="space-y-1 flex-1 pr-2">
                            {isEditing ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="text" 
                                  value={editingPlanName}
                                  onChange={(e) => setEditingPlanName(e.target.value)}
                                  className="bg-muted border border-border rounded-xl px-3 py-1.5 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                                  autoFocus
                                />
                                <button 
                                  onClick={() => handleSavePlanName(plan.id)}
                                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                                  title="Save Name"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => setEditingPlanId(null)}
                                  className="p-2 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-colors"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-foreground text-lg sm:text-2xl tracking-tight leading-snug">
                                  {plan.name}
                                </h4>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 sm:hidden">
                                  {leavesCount} {leavesCount === 1 ? 'Leave' : 'Leaves'}
                                </span>
                              </div>
                            )}
                            <div className="inline-flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-black text-foreground uppercase tracking-wider border border-border/30">
                              <CalendarDays size={13} className="text-primary" />
                              {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              <span className="text-muted-foreground/30">→</span>
                              {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>

                          {!isEditing && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => { setEditingPlanId(plan.id); setEditingPlanName(plan.name); }}
                                className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all sm:opacity-0 group-hover:opacity-100 bg-muted/30 border border-border/10"
                                title="Edit plan name"
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                onClick={() => setDeletingPlan(plan)}
                                className="p-1.5 sm:p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100 bg-muted/30 border border-border/10"
                                title="Delete plan"
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                onClick={() => togglePlanExpand(plan.id)}
                                className="p-1.5 text-muted-foreground hover:text-foreground bg-muted/50 rounded-xl sm:hidden border border-border/20"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stat Cards & Mini Calendar - Always visible on desktop, morph animated on mobile */}
                        <div className="hidden sm:flex flex-row items-center gap-5 pt-2">
                          <div className="grid grid-cols-2 gap-2.5 w-56 sm:w-64 flex-shrink-0">
                            {(() => {
                              const planTheme = getLeaveTheme(leaveColors?.[plan.type || 'pl'] || 'blue');
                              return (
                                <div className={`flex flex-col ${planTheme.activeBoxBg} px-3 py-2.5 rounded-2xl border ${planTheme.activeBoxBorder} shadow-sm overflow-hidden`}>
                                  <span className={`text-[9px] font-extrabold ${planTheme.activeText} uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap`}>
                                    {leavesCount === 1 ? 'Leave' : 'Leaves'}
                                  </span>
                                  <span className={`text-xl font-black ${planTheme.activeText} leading-none`}>{leavesCount}</span>
                                </div>
                              );
                            })()}
                            <div className="flex flex-col bg-slate-50/50 dark:bg-slate-400/10 px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/30 shadow-sm overflow-hidden">
                              <span className="text-[9px] font-extrabold text-slate-500/70 dark:text-slate-400 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">
                                {weekendsCount === 1 ? 'Weekend' : 'Weekends'}
                              </span>
                              <span className="text-xl font-black text-slate-600 dark:text-slate-400 leading-none">{weekendsCount}</span>
                            </div>
                            <div className="flex flex-col bg-purple-50/50 dark:bg-purple-500/10 px-3 py-2.5 rounded-2xl border border-purple-100 dark:border-purple-500/20 shadow-sm overflow-hidden">
                              <span className="text-[9px] font-extrabold text-purple-600/70 dark:text-purple-400 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">
                                {holidaysCount === 1 ? 'Holiday' : 'Holidays'}
                              </span>
                              <span className="text-xl font-black text-purple-600 dark:text-purple-400 leading-none">{holidaysCount}</span>
                            </div>
                            <div className="flex flex-col bg-foreground text-background px-3 py-2.5 rounded-2xl shadow-md overflow-hidden">
                              <span className="text-[9px] font-extrabold opacity-60 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">Total</span>
                              <span className="text-xl font-black leading-none">{allDatesInRange.length}d</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-center">
                            {renderMiniCalendar(plan)}
                          </div>
                        </div>

                        {/* Mobile Morphing Expand/Collapse Container */}
                        <div className="sm:hidden">
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden flex flex-col gap-3 pt-3 border-t border-border/40 mt-1"
                              >
                                <div className="grid grid-cols-2 gap-2">
                                  {(() => {
                                    const planTheme = getLeaveTheme(leaveColors?.[plan.type || 'pl'] || 'blue');
                                    return (
                                      <div className={`flex flex-col ${planTheme.activeBoxBg} px-2.5 py-2 rounded-2xl border ${planTheme.activeBoxBorder} shadow-sm overflow-hidden`}>
                                        <span className={`text-[9px] font-extrabold ${planTheme.activeText} uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap`}>
                                          {leavesCount === 1 ? 'Leave' : 'Leaves'}
                                        </span>
                                        <span className={`text-lg font-black ${planTheme.activeText} leading-none`}>{leavesCount}</span>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex flex-col bg-slate-50/50 dark:bg-slate-400/10 px-2.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700/30 shadow-sm overflow-hidden">
                                    <span className="text-[9px] font-extrabold text-slate-500/70 dark:text-slate-400 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">
                                      {weekendsCount === 1 ? 'Weekend' : 'Weekends'}
                                    </span>
                                    <span className="text-lg font-black text-slate-600 dark:text-slate-400 leading-none">{weekendsCount}</span>
                                  </div>
                                  <div className="flex flex-col bg-purple-50/50 dark:bg-purple-500/10 px-2.5 py-2 rounded-2xl border border-purple-100 dark:border-purple-500/20 shadow-sm overflow-hidden">
                                    <span className="text-[9px] font-extrabold text-purple-600/70 dark:text-purple-400 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">
                                      {holidaysCount === 1 ? 'Holiday' : 'Holidays'}
                                    </span>
                                    <span className="text-lg font-black text-purple-600 dark:text-purple-400 leading-none">{holidaysCount}</span>
                                  </div>
                                  <div className="flex flex-col bg-foreground text-background px-2.5 py-2 rounded-2xl shadow-md overflow-hidden">
                                    <span className="text-[9px] font-extrabold opacity-60 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">Total</span>
                                    <span className="text-lg font-black leading-none">{allDatesInRange.length}d</span>
                                  </div>
                                </div>

                                <div className="w-full flex items-center justify-center bg-muted/20 dark:bg-muted/5 rounded-3xl p-3 border border-border/10 shadow-inner">
                                  {renderMiniCalendar(plan)}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Records Table (Fits page width on mobile without horizontal scroll) */}
        <div className="bg-card rounded-[24px] sm:rounded-[32px] border border-border shadow-apple-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-foreground text-lg sm:text-xl tracking-tight">All Records</h2>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Individual leave log</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-muted px-2.5 py-1 rounded-xl text-xs font-black text-muted-foreground font-mono">{bookedDates.length} entries</div>
            </div>
          </div>
          
          <div className="w-full overflow-hidden">
            {bookedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 italic">
                <CalendarDays size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No leave records found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/40 border-b border-border text-[9px] sm:text-[10px] uppercase text-muted-foreground font-black tracking-widest select-none">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('date')}>
                      <div className="flex items-center">
                        <span>DATE</span>
                        {renderSortIcon('date')}
                      </div>
                    </th>
                    <th className="px-2 sm:px-6 py-3 sm:py-4 cursor-pointer hover:text-foreground transition-colors text-center sm:text-left" onClick={() => handleSort('type')}>
                      <div className="flex items-center justify-center sm:justify-start">
                        <span>TYPE</span>
                        {renderSortIcon('type')}
                      </div>
                    </th>
                    <th className="hidden sm:table-cell px-6 py-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('duration')}>
                      <div className="flex items-center">
                        <span>STATUS</span>
                        {renderSortIcon('duration')}
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('plan')}>
                      <div className="flex items-center">
                        <span>ASSOCIATED PLAN</span>
                        {renderSortIcon('plan')}
                      </div>
                    </th>
                    <th className="px-2 sm:px-6 py-3 sm:py-4 w-10 sm:w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sortedBookedDates.map((leave, idx) => {
                    const dateObj = new Date(leave.date);
                    const isHalfDay = leave.duration === 0.5;
                    const isOffice = leave.type === 'office';
                    const theme = getLeaveTheme(leaveColors?.[leave.type] || (leave.type === 'pl' ? 'blue' : leave.type === 'el' ? 'orange' : leave.type === 'rh' ? 'green' : 'cyan'));
                    const cls = isOffice 
                      ? 'bg-muted text-foreground border-border' 
                      : theme.activeBadge;
                    const typeLabel = isOffice ? 'OFFICE' : getShortform(leaveNames?.[leave.type] || leave.type.toUpperCase(), leave.type.toUpperCase());

                    return (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors group select-none">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="font-black text-foreground text-xs sm:text-sm tracking-tight whitespace-nowrap">
                            {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 text-center sm:text-left">
                          <span className={`px-2 sm:px-2.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center ${cls}`}>
                            {typeLabel}{isHalfDay && ' ½'}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <div className={`w-1.5 h-1.5 rounded-full ${isHalfDay ? 'bg-amber-400' : 'bg-foreground'}`} />
                            <span className="text-xs font-bold text-foreground/80">{isHalfDay ? 'Half Day' : 'Full Day'}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="text-xs sm:text-sm font-black text-foreground/80 uppercase font-mono tracking-tight truncate max-w-[110px] sm:max-w-[200px] block">
                            {leave.plan_name || '—'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 text-right">
                          <button
                            onClick={() => onDelete(leave.date)}
                            className="text-muted-foreground hover:text-red-500 transition-all p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg active:scale-95 cursor-pointer"
                            title="Delete record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingPlan && (
        <DeletePlanModal 
          plan={deletingPlan}
          leaveCount={getLeavesForPlan(deletingPlan.id).length}
          onClose={() => setDeletingPlan(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default LeaveTracker;
