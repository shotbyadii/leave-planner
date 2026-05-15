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
      <div className="flex items-center gap-3 text-slate-800">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">From</span>
          <span className="text-lg font-bold">{first.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
        </div>
        <ArrowRight className="text-slate-300 mt-3" size={20} />
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">To</span>
          <span className="text-lg font-bold">{last.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
        </div>
      </div>
    );
  } else {
    displayDate = (
      <div className="text-lg font-bold text-slate-800">
        {targetDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    );
  }

  const actualLeaves = tripDates.filter(d => !isHoliday(d) && !isWeekend(d));
  const leavesNeeded = actualLeaves.length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
          <div>{displayDate}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-md shadow-sm border border-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 bg-orange-50/50 border-b border-orange-100 flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <CalendarX2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              Selected Leave: <span className="text-orange-600">{targetDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
            </div>
            {isMultiple && (
              <div className="text-xs text-slate-500 font-medium">Part of a {tripDates.length}-day trip.</div>
            )}
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Leave Type</span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-sm font-bold uppercase tracking-wider">{targetLeave.type}</span>
          </div>
          {targetLeave.note && (
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Note</span>
              <p className="text-sm text-slate-600 font-medium">{targetLeave.note}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
          {isMultiple && (
            <button 
              onClick={() => onCancelLeave(tripDates)} 
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <Trash2 size={16} /> Cancel Entire Trip ({leavesNeeded} leaves)
            </button>
          )}
          
          <button 
            onClick={() => onCancelLeave(targetLeave.date)} 
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg text-sm font-bold transition-colors shadow-sm`}
          >
            <Trash2 size={16} /> Cancel Single Leave Only
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExistingLeaveModal;
