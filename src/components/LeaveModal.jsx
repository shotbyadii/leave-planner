import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { isHoliday, isWeekend } from '../data/holidays';
import { TimePicker } from './TimePicker';

const LeaveModal = ({ dateObj, onClose, onApply, balances }) => {
  const [selectedType, setSelectedType] = useState('pl');
  const [note, setNote] = useState('');
  const [fromHour, setFromHour] = useState(9);
  const [toHour, setToHour] = useState(18);

  const dates = dateObj.dates || [dateObj.dateStr];
  const actualLeaves = dates.filter(d => !isHoliday(d) && !isWeekend(d));
  const baseLeavesNeeded = actualLeaves.length;
  const weekendsCount = dates.filter(d => isWeekend(d)).length;
  const holidaysCount = dates.filter(d => isHoliday(d) && !isWeekend(d)).length;

  const isMultiple = dates.length > 1;

  // Duration logic for EL single day
  const elDiffHours = toHour > fromHour ? toHour - fromHour : 0;
  const isHalfDay = selectedType === 'el' && !isMultiple && baseLeavesNeeded === 1 && elDiffHours > 0 && elDiffHours < 4.5;
  const durationPerDay = isHalfDay ? 0.5 : 1;
  const leavesNeeded = isHalfDay ? 0.5 : baseLeavesNeeded;

  const showElWarning = selectedType === 'el' && baseLeavesNeeded > 2;

  // Auto-generate a default plan name
  const first = new Date(dates[0]);
  const last = new Date(dates[dates.length - 1]);
  const defaultName = isMultiple
    ? `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : first.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const [planName, setPlanName] = useState(defaultName);

  let displayDate = '';
  if (isMultiple) {
    displayDate = (
      <div className="flex items-center gap-3 text-slate-800">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">From</span>
          <span className="text-lg font-bold">{first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        <ArrowRight className="text-slate-300 mt-3" size={20} />
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">To</span>
          <span className="text-lg font-bold">{last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    );
  } else {
    displayDate = (
      <div className="text-lg font-bold text-slate-800">
        {first.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    );
  }

  const handleApply = () => {
    onApply(dates, selectedType, note, planName, durationPerDay);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
          <div>{displayDate}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-md shadow-sm border border-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800">Plan Breakdown</span>
            <span className="font-bold text-slate-400">{dates.length} Days Total</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-blue-600 leading-none mb-1">{leavesNeeded}</span>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Leaves</span>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-slate-600 leading-none mb-1">{weekendsCount}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weekends</span>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-purple-600 leading-none mb-1">{holidaysCount}</span>
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Holidays</span>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Plan Name */}
          <div>
            <label className="text-sm font-semibold text-slate-800 mb-1.5 block">Plan Name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Summer Vacation, Medical Leave..."
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Leave Type */}
          <div>
            <label className="text-sm font-semibold text-slate-800 mb-3 block">Leave Type</label>
            <div className="flex flex-col gap-3">

              <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === 'pl' ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'} ${balances.pl < baseLeavesNeeded ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="leaveType" value="pl" checked={selectedType === 'pl'} onChange={() => {}} onClick={() => balances.pl >= baseLeavesNeeded && setSelectedType('pl')} disabled={balances.pl < baseLeavesNeeded} className="w-4 h-4 text-slate-900 focus:ring-slate-900" />
                  <span className="font-medium text-slate-800">PL — Privileged Leave</span>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">{balances.pl} left</span>
              </label>

              {/* EL with clock picker */}
              <div className="flex flex-col gap-2">
                <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === 'el' ? 'border-orange-400 bg-orange-50/40' : 'border-slate-200 hover:border-slate-300'} ${balances.el < baseLeavesNeeded ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="leaveType" value="el" checked={selectedType === 'el'} onChange={() => {}} onClick={() => balances.el >= baseLeavesNeeded && setSelectedType('el')} disabled={balances.el < baseLeavesNeeded} className="w-4 h-4 text-orange-500 focus:ring-orange-400" />
                    <span className="font-medium text-slate-800">EL — Emergency Leave</span>
                  </div>
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">{balances.el} left</span>
                </label>

                {selectedType === 'el' && !isMultiple && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <TimePicker
                      fromHour={fromHour}
                      toHour={toHour}
                      onChange={(f, t) => { setFromHour(f); setToHour(t); }}
                    />
                  </div>
                )}
              </div>

              <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedType === 'rh' ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'} ${(balances.rh < baseLeavesNeeded || baseLeavesNeeded > 1) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="leaveType" value="rh" checked={selectedType === 'rh'} onChange={() => {}} onClick={() => baseLeavesNeeded <= 1 && balances.rh >= baseLeavesNeeded && setSelectedType('rh')} disabled={balances.rh < baseLeavesNeeded || baseLeavesNeeded > 1} className="w-4 h-4 text-slate-900 focus:ring-slate-900" />
                  <span className="font-medium text-slate-800">RH — Restricted Holiday</span>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">{balances.rh} left</span>
              </label>

            </div>
          </div>

          {showElWarning && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3 items-start animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm text-red-800">
                <span className="font-semibold block mb-1">Medical Certificate Required</span>
                You are applying for more than 2 consecutive Emergency Leaves. Please ensure you have a valid medical certificate to provide to HR.
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-800 mb-1.5 block">Note <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Family vacation, Medical appointment..."
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={balances[selectedType] < leavesNeeded}
            className="px-6 py-2 bg-[#1a1a1a] text-white hover:bg-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Apply {selectedType.toUpperCase()}
          </button>
        </div>

      </div>
    </div>
  );
};

export default LeaveModal;
