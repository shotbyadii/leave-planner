import React, { useState } from 'react';
import { Trash2, Pencil, Check, X, CalendarDays, ArrowUpDown, ChevronUp, ChevronDown, Home } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import DeletePlanModal from './DeletePlanModal';

const LeaveTracker = ({ bookedDates, onDelete, onDeletePlan, onUpdatePlan, leaves, leavePlans }) => {
  const plUsed = leaves.pl.used;
  const elUsed = leaves.el.used;
  const rhUsed = leaves.rh.used;
  
  const totalLeaves = leaves.pl.total + leaves.el.total + leaves.rh.total;
  const totalUsed = plUsed + elUsed + rhUsed;

  const [deletingPlan, setDeletingPlan] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingPlanName, setEditingPlanName] = useState('');

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
        isLeave: bookedDates.some(b => b.date === dateStr && b.plan_id === plan.id),
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
            if (!cell) return <div key={idx} className="w-full aspect-square"></div>;
            
            let classes = "w-full aspect-square rounded-lg flex items-center justify-center text-[11px] font-mono transition-all ";
            if (cell.isLeave) {
              classes += "text-blue-500 font-black scale-110";
            } else if (cell.isHoliday) {
              classes += "text-purple-400 font-black";
            } else if (cell.isWeekend) {
              classes += "text-muted-foreground/30 font-medium";
            } else {
              classes += "text-muted-foreground/50 font-medium";
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
                className="text-blue-400 transition-all duration-1000 ease-out" 
                strokeDasharray={`${(plUsed/totalLeaves)*100}, 100`} 
                strokeWidth="3.5" stroke="currentColor" fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
              
              <path 
                className="text-orange-400 transition-all duration-1000 ease-out" 
                strokeDasharray={`${(elUsed/totalLeaves)*100}, 100`} 
                strokeDashoffset={`-${(plUsed/totalLeaves)*100}`}
                strokeWidth="3.5" stroke="currentColor" fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />

              <path 
                className="text-green-400 transition-all duration-1000 ease-out" 
                strokeDasharray={`${(rhUsed/totalLeaves)*100}, 100`} 
                strokeDashoffset={`-${((plUsed + elUsed)/totalLeaves)*100}`}
                strokeWidth="3.5" stroke="currentColor" fill="none" 
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
                 <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                 <span className="text-white/60 font-medium">Privileged (PL)</span>
               </div>
               <span className="font-semibold font-mono text-white">{Number.isInteger(plUsed) ? plUsed : plUsed.toFixed(1)} <span className="text-white/40 font-normal">/ {leaves.pl.total}</span></span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                 <span className="text-white/60 font-medium">Emergency (EL)</span>
               </div>
               <span className="font-semibold font-mono text-white">{Number.isInteger(elUsed) ? elUsed : elUsed.toFixed(1)} <span className="text-white/40 font-normal">/ {leaves.el.total}</span></span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-400"></div>
                 <span className="text-white/60 font-medium">Restricted (RH)</span>
               </div>
               <span className="font-semibold font-mono text-white">{Number.isInteger(rhUsed) ? rhUsed : rhUsed.toFixed(1)} <span className="text-white/40 font-normal">/ {leaves.rh.total}</span></span>
             </div>
          </div>
        </div>

        {/* WFH Monthly Utilization Card */}
        {(() => {
          const curMonthKey = new Date().toISOString().substring(0, 7);
          const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
          const isWfhOverQuota = wfhUsedThisMonth >= 10;
          const wfhOverAmount = wfhUsedThisMonth - 10;
          const wfhRemaining = Math.max(0, 10 - wfhUsedThisMonth);
          const isWfhWarning = !isWfhOverQuota && wfhRemaining <= 2;

          const cardStyle = isWfhOverQuota
            ? 'bg-gradient-to-br from-red-950/80 to-red-900/40 border-red-500/30'
            : isWfhWarning 
            ? 'bg-gradient-to-br from-amber-950/80 to-amber-900/40 border-amber-500/30' 
            : 'bg-card border-border';

          const badgeStyle = isWfhOverQuota
            ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
            : isWfhWarning 
            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
            : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30';

          const badgeText = isWfhOverQuota ? 'Over Quota' : (isWfhWarning ? 'Low Balance' : 'Normal');

          const subtitleText = isWfhOverQuota
            ? `+${wfhOverAmount} day${wfhOverAmount === 1 ? '' : 's'} over monthly quota`
            : `${wfhRemaining} WFH day${wfhRemaining === 1 ? '' : 's'} remaining this month`;

          const strokeColor = isWfhOverQuota ? 'stroke-red-500' : (isWfhWarning ? 'stroke-amber-500' : 'stroke-cyan-400');

          return (
            <div className={`rounded-2xl border shadow-apple-sm p-5 transition-all ${cardStyle}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-xs uppercase tracking-widest text-cyan-500 font-mono flex items-center gap-1.5">
                  <Home size={14} /> WFH Monthly Quota
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                  {badgeText}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-black font-mono text-foreground">
                    {wfhUsedThisMonth}<span className="text-sm font-bold text-muted-foreground">/10</span>
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
                      strokeDashoffset={125.6 - Math.min(1, wfhUsedThisMonth / 10) * 125.6}
                      strokeLinecap="round"
                      fill="transparent" 
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black font-mono text-foreground">
                    {Math.round((wfhUsedThisMonth / 10) * 100)}%
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                return (
                  <div key={plan.id} className="bg-card rounded-[32px] border border-border shadow-apple-sm p-6 sm:p-7 hover:border-foreground/10 hover:shadow-apple transition-all group flex flex-col xl:flex-row gap-6 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex-1 relative z-10 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1.5 flex-1 pr-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
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
                              <h4 className="font-black text-foreground text-xl sm:text-2xl tracking-tight leading-snug">
                                {plan.name}
                              </h4>
                            )}
                            <div className="inline-flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl text-xs font-black text-foreground uppercase tracking-wider border border-border/30">
                              <CalendarDays size={14} className="text-primary" />
                              {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              <span className="text-muted-foreground/30">→</span>
                              {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>

                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => { setEditingPlanId(plan.id); setEditingPlanName(plan.name); }}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all xl:opacity-0 group-hover:opacity-100 bg-muted/30 border border-border/10"
                                title="Edit plan name"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => setDeletingPlan(plan)}
                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all xl:opacity-0 group-hover:opacity-100 bg-muted/30 border border-border/10"
                                title="Delete plan"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stat Cards - Clean typography without text bleeding */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                          <div className="flex flex-col bg-blue-50/50 dark:bg-blue-500/10 px-2.5 py-2 rounded-2xl border border-blue-100 dark:border-blue-500/20 shadow-sm overflow-hidden">
                            <span className="text-[9px] font-extrabold text-blue-600/70 dark:text-blue-400 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">Leaves</span>
                            <span className="text-lg font-black text-blue-600 leading-none">{leavesCount}</span>
                          </div>
                          <div className="flex flex-col bg-slate-50/50 dark:bg-slate-400/10 px-2.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700/30 shadow-sm overflow-hidden">
                            <span className="text-[9px] font-extrabold text-slate-500/70 dark:text-slate-400 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">Weekends</span>
                            <span className="text-lg font-black text-slate-600 dark:text-slate-400 leading-none">{weekendsCount}</span>
                          </div>
                          <div className="flex flex-col bg-purple-50/50 dark:bg-purple-500/10 px-2.5 py-2 rounded-2xl border border-purple-100 dark:border-purple-500/20 shadow-sm overflow-hidden">
                            <span className="text-[9px] font-extrabold text-purple-600/70 dark:text-purple-400 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">Holidays</span>
                            <span className="text-lg font-black text-purple-600 dark:text-purple-400 leading-none">{holidaysCount}</span>
                          </div>
                          <div className="flex flex-col bg-foreground text-background px-2.5 py-2 rounded-2xl shadow-md overflow-hidden">
                            <span className="text-[9px] font-extrabold opacity-60 uppercase tracking-tight leading-none mb-1.5 whitespace-nowrap">Total</span>
                            <span className="text-lg font-black leading-none">{allDatesInRange.length}d</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="xl:w-44 flex-shrink-0 flex items-center justify-center bg-muted/20 dark:bg-muted/5 rounded-3xl p-3 border border-border/10 shadow-inner relative z-10">
                      {renderMiniCalendar(plan)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Records Table */}
        <div className="bg-card rounded-[32px] border border-border shadow-apple-sm overflow-hidden">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-foreground text-xl tracking-tight">All Records</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Individual leave log</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile Sort Controls */}
              <div className="sm:hidden flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Sort:</span>
                <button onClick={() => handleSort('date')} className={`text-xs font-bold ${sortField === 'date' ? 'text-primary' : 'text-muted-foreground'}`}>Date</button>
                <button onClick={() => handleSort('type')} className={`text-xs font-bold ${sortField === 'type' ? 'text-primary' : 'text-muted-foreground'}`}>Type</button>
              </div>
              <div className="bg-muted px-3 py-1.5 rounded-xl text-xs font-black text-muted-foreground">{bookedDates.length} entries</div>
            </div>
          </div>
          
          <div className="w-full">
            {bookedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 italic">
                <CalendarDays size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No leave records found.</p>
              </div>
            ) : (
              <>
                {/* Desktop View (Table with sorting) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase text-muted-foreground font-black tracking-widest select-none">
                      <tr>
                        <th className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('date')}>
                          <div className="flex items-center">
                            <span>Date</span>
                            {renderSortIcon('date')}
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('type')}>
                          <div className="flex items-center">
                            <span>Type</span>
                            {renderSortIcon('type')}
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('duration')}>
                          <div className="flex items-center">
                            <span>Status</span>
                            {renderSortIcon('duration')}
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('plan')}>
                          <div className="flex items-center">
                            <span>Associated Plan</span>
                            {renderSortIcon('plan')}
                          </div>
                        </th>
                        <th className="px-6 py-4">Note</th>
                        <th className="px-6 py-4 w-16 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {sortedBookedDates.map((leave, idx) => {
                        const dateObj = new Date(leave.date);
                        const isHalfDay = leave.duration === 0.5;
                        const colors = leave.type === 'pl' ? { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20' }
                                     : leave.type === 'el' ? (isHalfDay ? { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' } : { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-500/20' })
                                     : { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-500/20' };

                        return (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors group select-none">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-black text-foreground text-sm tracking-tight">{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase">{dateObj.getFullYear()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const typeColors = {
                                  pl: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                                  el: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
                                  rh: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
                                  wfh: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
                                  office: 'bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                };
                                const cls = typeColors[leave.type] || 'bg-muted border-border text-foreground';
                                return (
                                  <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-tight ${cls}`}>
                                    {leave.type}{isHalfDay && ' · ½'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isHalfDay ? 'bg-amber-400' : 'bg-primary'}`} />
                                <span className="text-xs font-bold text-foreground/70">{isHalfDay ? 'Half Day' : 'Full Day'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-black text-foreground/60 uppercase tracking-tight truncate max-w-[160px] block">
                                {leave.plan_name || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-muted-foreground/70 font-medium italic line-clamp-1 max-w-[200px]">
                                {leave.note || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => onDelete(leave.date)}
                                className="text-muted-foreground hover:text-red-500 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl opacity-0 group-hover:opacity-100"
                                title="Delete record"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (Optimized Cards with Sorting) */}
                <div className="md:hidden flex flex-col divide-y divide-border/50">
                  {sortedBookedDates.map((leave, idx) => {
                    const dateObj = new Date(leave.date);
                    const isHalfDay = leave.duration === 0.5;
                    const color = leave.type === 'pl' ? 'text-blue-500' : leave.type === 'el' ? 'text-orange-500' : 'text-green-500';
                    const bgColor = leave.type === 'pl' ? 'bg-blue-500/10' : leave.type === 'el' ? 'bg-orange-500/10' : 'bg-green-500/10';

                    return (
                      <div key={idx} className="p-5 active:bg-muted/50 transition-colors space-y-4 select-none">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl ${bgColor} flex flex-col items-center justify-center border border-current opacity-20 ${color}`} />
                            <div className="absolute w-12 h-12 flex flex-col items-center justify-center">
                              <span className={`text-xs font-black uppercase ${color}`}>{leave.type}</span>
                              {isHalfDay && <span className={`text-[8px] font-black uppercase ${color} -mt-1`}>½ Day</span>}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground text-base tracking-tight">{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{dateObj.getFullYear()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => onDelete(leave.date)}
                            className="w-10 h-10 flex items-center justify-center text-muted-foreground bg-muted/50 border border-border/10 rounded-xl"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {(leave.plan_name || leave.note) && (
                          <div className="bg-muted/30 rounded-2xl p-3 space-y-2 border border-border/5">
                            {leave.plan_name && (
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Plan:</span>
                                <span className="text-xs font-bold text-foreground truncate">{leave.plan_name}</span>
                              </div>
                            )}
                            {leave.note && (
                              <div className="flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-1.5" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Note:</span>
                                  <span className="text-xs font-medium text-muted-foreground italic leading-snug">"{leave.note}"</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
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
