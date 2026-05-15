import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight, Settings2, Sparkles, Minus, Plus, Search, X } from 'lucide-react';
import { findOptimalWindows } from '../utils/leaveOptimizer';
import { parseNaturalLanguage } from '../utils/nlpParser';

const OptimizerPanel = ({ onPreviewRange, onHoverSuggestion, bookedDates = [], viewMode, setFocusedMonth }) => {
  const [targetLeaves, setTargetLeaves] = useState(2);
  const [targetDuration, setTargetDuration] = useState(null);
  const [targetMonth, setTargetMonth] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const [agenticText, setAgenticText] = useState('');

  useEffect(() => {
    handleOptimize();
  }, [targetLeaves, targetMonth, targetDuration, bookedDates]);

  const handleOptimize = () => {
    const results = findOptimalWindows({ targetLeaves, targetDuration, targetMonth, bookedDates });
    setSuggestions(results);
  };

  const handleAgenticSubmit = (e) => {
    if (e) e.preventDefault();
    if (!agenticText.trim()) return;
    
    const parsed = parseNaturalLanguage(agenticText);
    
    if (parsed.targetLeaves !== null) setTargetLeaves(parsed.targetLeaves);
    if (parsed.targetDuration !== null) setTargetDuration(parsed.targetDuration);
    else setTargetDuration(null);
    
    if (parsed.targetMonth !== null) setTargetMonth(parsed.targetMonth);
    else setTargetMonth('all');
  };

  const handleAgenticClear = () => {
    setAgenticText('');
    setTargetDuration(null);
  };

  const handlePreviewClick = (s) => {
    const range = [];
    for (let d = new Date(s.startDate); d <= s.endDate; d.setDate(d.getDate() + 1)) {
      range.push(`${2026}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    
    if (viewMode === 'monthly' && setFocusedMonth) {
      setFocusedMonth(s.startDate.getMonth());
    } else if (viewMode === 'yearly') {
      const el = document.getElementById(`month-card-${s.startDate.getMonth()}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    onPreviewRange(range);
  };

  const handleHover = (s) => {
    if (viewMode === 'yearly' && onHoverSuggestion) {
      onHoverSuggestion(s);
      if (s) {
        const el = document.getElementById(`month-card-${s.startDate.getMonth()}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Agentic Input */}
      <form onSubmit={handleAgenticSubmit} className="p-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-3 text-purple-500" size={16} />
          <input 
            type="text" 
            value={agenticText}
            onChange={(e) => setAgenticText(e.target.value)}
            placeholder="e.g. 4 day trip in October..."
            className="w-full pl-9 pr-16 py-2.5 bg-white border border-purple-200/60 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-700 font-medium"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {agenticText && (
              <button type="button" onClick={handleAgenticClear} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={14} />
              </button>
            )}
            <button type="submit" className="p-1.5 bg-purple-100 text-purple-600 rounded-md hover:bg-purple-200 transition-colors">
              <Search size={14} />
            </button>
          </div>
        </div>
      </form>

      <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Leaves</span>
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md p-1">
            <button 
              onClick={() => { setTargetLeaves(Math.max(1, targetLeaves - 1)); setTargetDuration(null); }}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-bold text-slate-700 w-4 text-center">{targetLeaves}</span>
            <button 
              onClick={() => { setTargetLeaves(Math.min(15, targetLeaves + 1)); setTargetDuration(null); }}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</span>
          <select 
            className="text-sm font-medium bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none text-slate-700 focus:border-slate-400 transition-colors"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
          >
            <option value="all">Entire Year</option>
            <option value="0">January</option>
            <option value="1">February</option>
            <option value="2">March</option>
            <option value="3">April</option>
            <option value="4">May</option>
            <option value="5">June</option>
            <option value="6">July</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">October</option>
            <option value="10">November</option>
            <option value="11">December</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-semibold flex items-center gap-2 text-slate-800 text-sm">
            <Lightbulb className="text-yellow-500" size={16} fill="currentColor" />
            {targetDuration ? `${targetDuration}-Day Trips` : `Max Trips for ${targetLeaves}L`}
          </h2>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {suggestions.length}
          </span>
        </div>

        {suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
            <Settings2 size={24} className="opacity-50" />
            No optimal bridges found.
          </div>
        )}
        
        {suggestions.slice(0, 8).map((s, idx) => (
          <div 
            key={idx} 
            className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm hover:border-slate-300 hover:shadow transition-all cursor-default"
            onMouseEnter={() => handleHover(s)}
            onMouseLeave={() => handleHover(null)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                  {new Date(s.startDate).toLocaleString('default', { month: 'short' })}
                </span>
                <span className="bg-orange-50 text-orange-600 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border border-orange-100">
                  {s.totalDaysOff}d stretch
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-slate-800 leading-none">{s.leavesRequired}L</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold mt-0.5 tracking-wider">needed</span>
              </div>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold text-sm text-slate-800 mb-1 leading-tight">
                {s.holidayName ? s.holidayName : `${s.startDate.toLocaleString('default', { month: 'short' })} ${s.startDate.getDate()} - ${s.endDate.toLocaleString('default', { month: 'short' })} ${s.endDate.getDate()}`}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {s.startDate.toLocaleString('default', { month: 'short', day: 'numeric' })} – {s.endDate.toLocaleString('default', { month: 'short', day: 'numeric' })}
              </p>
            </div>

            <button 
              onClick={() => handlePreviewClick(s)}
              className="w-full flex items-center justify-center gap-1 bg-slate-900 text-white hover:bg-black text-xs font-semibold py-2 rounded transition-colors shadow-sm"
            >
              Preview Range <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OptimizerPanel;
