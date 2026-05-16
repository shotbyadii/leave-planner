import React from 'react';
import { Trash2, X, ArrowRight, CalendarX2 } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';

const ExistingLeaveModal = ({ leaveObj, onClose, onCancelLeave }) => {
  const { targetLeave, tripDates } = leaveObj;
  
  const isMultiple = tripDates.length > 1;
  const first = new Date(tripDates[0]);
  const last = new Date(tripDates[tripDates.length - 1]);
  const targetDateObj = new Date(targetLeave.date);

  let displayDate = '';
  if (isMultiple) {
    displayDate = (
      <div className="flex items-center gap-3 text-foreground">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">From</span>
          <span className="text-lg font-bold">{first.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
        </div>
        <ArrowRight className="text-muted-foreground/50 mt-3" size={20} />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">To</span>
          <span className="text-lg font-bold">{last.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
        </div>
      </div>
    );
  } else {
    displayDate = (
      <div className="text-lg font-bold text-foreground">
        {targetDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    );
  }

  const actualLeaves = tripDates.filter(d => !isHoliday(d) && !isWeekend(d));
  const leavesNeeded = actualLeaves.length;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end items-center pointer-events-none">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="relative bg-background w-[92%] max-w-md mx-auto mb-6 rounded-[32px] border border-border shadow-[0_8px_32px_-4px_hsl(var(--foreground)/0.18)] overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-8 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        
        <div className="p-4 sm:p-6 border-b border-border bg-muted/50 flex justify-between items-start">
          <div>{displayDate}</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-card p-1 rounded-md shadow-sm border border-border">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 bg-orange-50/50 border-b border-orange-100 flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <CalendarX2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">
              Selected Leave: <span className="text-orange-600">{targetDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
            </div>
            {isMultiple && (
              <div className="text-xs text-muted-foreground font-medium">Part of a {tripDates.length}-day trip.</div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Leave Type</span>
            <span className="px-2.5 py-1 bg-muted border border-border text-foreground rounded text-sm font-bold uppercase tracking-wider">{targetLeave.type}</span>
          </div>
          {targetLeave.note && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Note</span>
              <p className="text-sm text-muted-foreground font-medium">{targetLeave.note}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border bg-muted/30 flex flex-row gap-3">
          {isMultiple && (
            <button 
              onClick={() => onCancelLeave(tripDates)} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-zinc-800 border border-red-200 text-red-600 rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Trash2 size={15} /> Trip
            </button>
          )}
          
          <button 
            onClick={() => onCancelLeave(targetLeave.date)} 
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-zinc-800 border border-red-200 text-red-600 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Trash2 size={15} /> Single
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExistingLeaveModal;
