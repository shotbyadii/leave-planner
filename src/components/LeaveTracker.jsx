import React, { useState } from 'react';
import { Trash2, CalendarDays } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import DeletePlanModal from './DeletePlanModal';

const LeaveTracker = ({ bookedDates, onDelete, onDeletePlan, leaves, leavePlans }) => {
  const plUsed = leaves.pl.used;
  const elUsed = leaves.el.used;
  const rhUsed = leaves.rh.used;
  
  const totalLeaves = leaves.pl.total + leaves.el.total + leaves.rh.total;
  const totalUsed = plUsed + elUsed + rhUsed;

  const [deletingPlan, setDeletingPlan] = useState(null);

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

    // Pad start to align with day-of-week
    const startDow = allDates[0]?.dayOfWeek || 0;
    const padBefore = [];
    for (let i = 0; i < startDow; i++) {
      padBefore.push(null);
    }

    const cells = [...padBefore, ...allDates];

    return (
      <div className="mt-4 bg-muted/20 rounded-xl p-3.5 border border-border/5 shadow-inner">
        <div className="grid grid-cols-7 gap-1.5 mb-2.5">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-[9px] font-black text-muted-foreground/30 text-center w-6 uppercase tracking-tighter">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="w-6 h-6"></div>;
            
            let classes = "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ";
            if (cell.isLeave) {
              classes += "bg-slate-900 text-white shadow-md z-10 ring-2 ring-white/10";
            } else if (cell.isHoliday) {
              classes += "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300";
            } else if (cell.isWeekend) {
              classes += "text-muted-foreground/20 bg-muted/10";
            } else {
              classes += "text-muted-foreground/20 hover:bg-muted/40 cursor-default";
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

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Dashboard (Sticky) */}
      <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-6 xl:sticky xl:top-0 h-fit">
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a6e] to-[#1d4ed8] rounded-2xl border border-blue-900/30 shadow-apple-sm p-6">
          <h3 className="font-semibold text-white/60 mb-4 text-xs uppercase tracking-widest font-mono">Leave Utilization</h3>
          
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              {/* Background track */}
              <path className="text-white/10" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              
              {/* PL Segment */}
              <path 
                className="text-blue-400 transition-all duration-1000 ease-out" 
                strokeDasharray={`${(plUsed/totalLeaves)*100}, 100`} 
                strokeWidth="3.5" stroke="currentColor" fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
              
              {/* EL Segment */}
              <path 
                className="text-orange-400 transition-all duration-1000 ease-out" 
                strokeDasharray={`${(elUsed/totalLeaves)*100}, 100`} 
                strokeDashoffset={`-${(plUsed/totalLeaves)*100}`}
                strokeWidth="3.5" stroke="currentColor" fill="none" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />

              {/* RH Segment */}
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

                // Breakdown
                const allDatesInRange = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const ds = `${2026}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  allDatesInRange.push(ds);
                }
                const weekendsCount = allDatesInRange.filter(d => isWeekend(d)).length;
                const holidaysCount = allDatesInRange.filter(d => isHoliday(d) && !isWeekend(d)).length;
                const leavesCount = planLeaves.reduce((sum, l) => sum + (l.duration || 1), 0);
                
                return (
                  <div key={plan.id} className="bg-card rounded-[32px] border border-border shadow-apple-sm p-6 sm:p-8 hover:border-foreground/10 hover:shadow-apple transition-all group flex flex-col xl:flex-row gap-8 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex-1 relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                          <h4 className="font-black text-foreground text-2xl tracking-tight leading-none mb-2">{plan.name}</h4>
                          <div className="inline-flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl text-xs font-black text-foreground uppercase tracking-widest border border-border/30">
                            <CalendarDays size={14} className="text-primary" />
                            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            <span className="text-muted-foreground/30">→</span>
                            {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <button 
                          onClick={() => setDeletingPlan(plan)}
                          className="p-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all xl:opacity-0 group-hover:opacity-100 bg-muted/30 border border-border/10"
                          title="Delete plan"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="flex flex-col bg-blue-50/50 dark:bg-blue-500/10 px-4 py-3 rounded-2xl border border-blue-100 dark:border-blue-500/20 shadow-sm transition-transform hover:scale-[1.02]">
                          <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest leading-none mb-2">Leaves</span>
                          <span className="text-2xl font-black text-blue-600 leading-none">{leavesCount}</span>
                        </div>
                        <div className="flex flex-col bg-slate-50/50 dark:bg-slate-400/10 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/30 shadow-sm transition-transform hover:scale-[1.02]">
                          <span className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest leading-none mb-2">Weekends</span>
                          <span className="text-2xl font-black text-slate-600 dark:text-slate-400 leading-none">{weekendsCount}</span>
                        </div>
                        <div className="flex flex-col bg-purple-50/50 dark:bg-purple-500/10 px-4 py-3 rounded-2xl border border-purple-100 dark:border-purple-500/20 shadow-sm transition-transform hover:scale-[1.02]">
                          <span className="text-[10px] font-black text-purple-600/60 uppercase tracking-widest leading-none mb-2">Holidays</span>
                          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 leading-none">{holidaysCount}</span>
                        </div>
                        <div className="flex flex-col bg-foreground text-background px-4 py-3 rounded-2xl shadow-xl shadow-foreground/10 transition-transform hover:scale-[1.02]">
                          <span className="text-[10px] font-black opacity-50 uppercase tracking-widest leading-none mb-2">Total Days</span>
                          <span className="text-2xl font-black leading-none">{allDatesInRange.length}d</span>
                        </div>
                      </div>
                    </div>

                    <div className="xl:w-48 flex-shrink-0 flex items-center justify-center bg-muted/20 dark:bg-muted/5 rounded-3xl p-3 border border-border/10 shadow-inner relative z-10">
                      {renderMiniCalendar(plan)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-[32px] border border-border shadow-apple-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground text-xl tracking-tight">All Records</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Individual leave log</p>
            </div>
            <div className="bg-muted px-3 py-1.5 rounded-xl text-xs font-black text-muted-foreground">{bookedDates.length} entries</div>
          </div>
          
          <div className="w-full">
            {bookedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 italic">
                <CalendarDays size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No leave records found.</p>
              </div>
            ) : (
              <>
                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-5">Date</th>
                        <th className="px-6 py-5">Type</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5">Associated Plan</th>
                        <th className="px-6 py-5">Note</th>
                        <th className="px-6 py-5 w-16 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {[...bookedDates].sort((a,b) => new Date(b.date) - new Date(a.date)).map((leave, idx) => {
                        const dateObj = new Date(leave.date);
                        const isHalfDay = leave.duration === 0.5;
                        const colors = leave.type === 'pl' ? { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-100 dark:border-blue-500/20' }
                                     : leave.type === 'el' ? (isHalfDay ? { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-100 dark:border-amber-500/20' } : { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-100 dark:border-orange-500/20' })
                                     : { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600', border: 'border-green-100 dark:border-green-500/20' };

                        return (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="font-black text-foreground text-sm tracking-tight">{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase">{dateObj.getFullYear()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-tight ${colors.bg} ${colors.text} ${colors.border}`}>
                                {leave.type}{isHalfDay && ' · ½'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isHalfDay ? 'bg-amber-400' : 'bg-primary'}`} />
                                <span className="text-xs font-bold text-foreground/70">{isHalfDay ? 'Half Day' : 'Full Day'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-xs font-black text-foreground/50 uppercase tracking-tighter truncate max-w-[140px] block">
                                {leave.plan_name || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-xs text-muted-foreground/60 font-medium italic line-clamp-1 max-w-[200px]">
                                {leave.note || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button
                                onClick={() => onDelete(leave.date)}
                                className="text-muted-foreground hover:text-red-500 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl opacity-0 group-hover:opacity-100"
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

                {/* Mobile View (Optimized Cards) */}
                <div className="md:hidden flex flex-col divide-y divide-border/50">
                  {[...bookedDates].sort((a,b) => new Date(b.date) - new Date(a.date)).map((leave, idx) => {
                    const dateObj = new Date(leave.date);
                    const isHalfDay = leave.duration === 0.5;
                    const color = leave.type === 'pl' ? 'text-blue-500' : leave.type === 'el' ? 'text-orange-500' : 'text-green-500';
                    const bgColor = leave.type === 'pl' ? 'bg-blue-500/10' : leave.type === 'el' ? 'bg-orange-500/10' : 'bg-green-500/10';

                    return (
                      <div key={idx} className="p-5 active:bg-muted/50 transition-colors space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl ${bgColor} flex flex-col items-center justify-center border border-current opacity-20 ${color}`} />
                            <div className="absolute w-12 h-12 flex flex-col items-center justify-center">
                              <span className={`text-xs font-black uppercase ${color}`}>{leave.type}</span>
                              {isHalfDay && <span className={`text-[8px] font-black uppercase ${color} -mt-1`}>½ Day</span>}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground text-base tracking-tight">{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{dateObj.getFullYear()}</span>
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
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Plan:</span>
                                <span className="text-xs font-bold text-foreground truncate">{leave.plan_name}</span>
                              </div>
                            )}
                            {leave.note && (
                              <div className="flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-1.5" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Note:</span>
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
