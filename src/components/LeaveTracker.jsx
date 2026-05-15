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
      <div className="mt-3">
        <div className="grid grid-cols-7 gap-px mb-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-[8px] font-bold text-slate-400 text-center w-5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="w-5 h-5"></div>;
            
            let classes = "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ";
            if (cell.isLeave) {
              classes += "bg-slate-800 text-white";
            } else if (cell.isHoliday) {
              classes += "bg-purple-200 text-purple-800";
            } else if (cell.isWeekend) {
              classes += "bg-slate-100 text-slate-400";
            } else {
              classes += "text-slate-300";
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
    <div className="flex gap-6 h-full">
      {/* Left Dashboard */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6 sticky top-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Leave Utilization</h3>
          
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-slate-800 transition-all duration-1000 ease-out" strokeDasharray={`${(totalUsed/totalLeaves)*100}, 100`} strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-800">{Number.isInteger(totalUsed) ? totalUsed : totalUsed.toFixed(1)}</span>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">/ {totalLeaves} Used</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                 <span className="text-slate-600 font-medium">Privileged (PL)</span>
               </div>
               <span className="font-semibold text-slate-800">{Number.isInteger(plUsed) ? plUsed : plUsed.toFixed(1)} <span className="text-slate-400 font-normal">/ {leaves.pl.total}</span></span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                 <span className="text-slate-600 font-medium">Emergency (EL)</span>
               </div>
               <span className="font-semibold text-slate-800">{Number.isInteger(elUsed) ? elUsed : elUsed.toFixed(1)} <span className="text-slate-400 font-normal">/ {leaves.el.total}</span></span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-green-400"></div>
                 <span className="text-slate-600 font-medium">Restricted (RH)</span>
               </div>
               <span className="font-semibold text-slate-800">{Number.isInteger(rhUsed) ? rhUsed : rhUsed.toFixed(1)} <span className="text-slate-400 font-normal">/ {leaves.rh.total}</span></span>
             </div>
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-8">
        
        {/* Leave Plan Cards */}
        <div>
          <h2 className="font-bold text-xl text-slate-800 mb-1">Leave Plans</h2>
          <p className="text-sm text-slate-500 mb-4">Your planned leave ranges, grouped and named.</p>

          {leavePlans.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                <CalendarDays size={24} />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No leave plans yet</h3>
              <p className="text-sm text-slate-500 max-w-xs">Select date ranges on the calendar and apply leaves to create plans.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                
                return (
                  <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 hover:shadow transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{plan.name}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <button 
                        onClick={() => setDeletingPlan(plan)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Delete plan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-1">
                      <span className="bg-blue-50 text-blue-600 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">{planLeaves.reduce((sum, l) => sum + (l.duration || 1), 0)}L</span>
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">{weekendsCount}W</span>
                      <span className="bg-purple-50 text-purple-600 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">{holidaysCount}H</span>
                      <span className="bg-slate-50 text-slate-400 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-auto">{allDatesInRange.length}D</span>
                    </div>

                    {renderMiniCalendar(plan)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Individual Leaves Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-lg">All Leaves</h2>
            <p className="text-sm text-slate-500">Individual leave records across all plans.</p>
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            {bookedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                <p>No leaves applied yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Plan</th>
                    <th className="px-6 py-3">Note</th>
                    <th className="px-6 py-3 w-16 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...bookedDates].sort((a,b) => new Date(a.date) - new Date(b.date)).map((leave, idx) => {
                    const dateObj = new Date(leave.date);
                    const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    
                    let badgeClass = '';
                    let label = '';
                    const isHalfDay = leave.duration === 0.5;
                    if (leave.type === 'pl') { badgeClass = 'bg-blue-100 text-blue-700'; label = 'PL'; }
                    else if (leave.type === 'el') {
                      badgeClass = isHalfDay ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700';
                      label = isHalfDay ? 'EL · ½' : 'EL';
                    }
                    else if (leave.type === 'rh') { badgeClass = 'bg-green-100 text-green-700'; label = 'RH'; }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700 text-sm">{displayDate}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badgeClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-semibold tabular-nums ${isHalfDay ? 'text-amber-600' : 'text-slate-500'}`}>
                            {isHalfDay ? '0.5 day' : '1 day'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500 font-medium">
                          {leave.plan_name || <span className="italic text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-sm">
                          {leave.note || <span className="italic text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => onDelete(leave.date)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Delete leave"
                          >
                            <Trash2 size={14} />
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
