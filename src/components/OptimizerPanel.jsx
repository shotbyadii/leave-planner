import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight, Settings2, Sparkles, Minus, Plus, Search, X, ChevronDown } from 'lucide-react';
import { findOptimalWindows } from '../utils/leaveOptimizer';
import { parseNaturalLanguage } from '../utils/nlpParser';

const OptimizerPanel = ({ onPreviewRange, onHoverSuggestion, bookedDates = [], viewMode, setFocusedMonth, inlineOnMobile = false }) => {
  const [targetLeaves, setTargetLeaves] = useState(2);
  const [targetDuration, setTargetDuration] = useState(null);
  const [targetMonth, setTargetMonth] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const [agenticText, setAgenticText] = useState('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  const monthOptions = [
    { value: 'all', label: 'Any Month' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

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
    <div className={`flex flex-col bg-card relative ${inlineOnMobile ? 'h-auto md:h-full' : 'h-full'}`}>
      
      {/* Agentic Input */}
      <form onSubmit={handleAgenticSubmit} className="p-3 md:p-4 border-b border-border bg-card">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-3 text-purple-400" size={16} />
          <input 
            type="text" 
            value={agenticText}
            onChange={(e) => setAgenticText(e.target.value)}
            placeholder="e.g. 4 day trip in October..."
            className="w-full pl-9 pr-16 py-2 bg-muted border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all placeholder:text-muted-foreground text-foreground font-medium"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            {agenticText && (
              <button type="button" onClick={handleAgenticClear} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            )}
            <button type="submit" className="p-1.5 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors shadow-apple-sm">
              <Search size={12} strokeWidth={3} />
            </button>
          </div>
        </div>
      </form>

      <div className="px-4 py-4 border-b border-border flex justify-between items-center bg-muted/50">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Leaves</span>
          <div className="flex items-center bg-card border border-border rounded-full p-1 shadow-apple-sm w-fit">
            <button onClick={() => { setTargetLeaves(Math.max(1, targetLeaves - 1)); setTargetDuration(null); }} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors active:bg-muted/80"><Minus size={20} strokeWidth={2.5} /></button>
            <span className="text-lg font-black text-foreground w-10 text-center">{targetLeaves}</span>
            <button onClick={() => { setTargetLeaves(Math.min(15, targetLeaves + 1)); setTargetDuration(null); }} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors active:bg-muted/80"><Plus size={20} strokeWidth={2.5} /></button>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 items-end relative">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pr-1">Target Month</span>
          <button 
            type="button"
            onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            className="flex items-center justify-between gap-2 text-sm font-bold bg-card border border-border rounded-full pl-4 pr-3 py-2.5 outline-none text-foreground shadow-apple-sm min-w-[130px] hover:bg-muted transition-colors"
          >
            <span>{monthOptions.find(m => m.value === targetMonth)?.label || 'Any Month'}</span>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMonthDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMonthDropdownOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-40 bg-card rounded-2xl shadow-apple border border-border z-50 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto hide-scrollbar">
                {monthOptions.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { setTargetMonth(m.value); setIsMonthDropdownOpen(false); }}
                    className={`px-4 py-2.5 text-sm font-bold text-left transition-colors ${targetMonth === m.value ? 'bg-purple-50 text-purple-700' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`p-4 flex flex-col gap-4 ${inlineOnMobile ? 'h-auto md:flex-1 md:overflow-y-auto' : 'flex-1 overflow-y-auto'}`}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-semibold flex items-center gap-2 text-foreground text-sm">
            <Lightbulb className="text-yellow-500" size={16} fill="currentColor" />
            {targetDuration ? `${targetDuration}-Day Trips` : `Max Trips for ${targetLeaves}L`}
          </h2>
          <span className="bg-muted text-foreground px-2 py-0.5 rounded-full text-xs font-bold">
            {suggestions.length}
          </span>
        </div>

        {suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            <Settings2 size={24} className="opacity-50" />
            No optimal bridges found.
          </div>
        )}
        
        {suggestions.slice(0, 8).map((s, idx) => {
          const isHero = idx === 0;
          return (
          <div 
            key={idx} 
            className={`group relative rounded-2xl p-4 transition-all cursor-pointer flex justify-between items-center ${
              isHero
                ? 'bg-foreground text-background shadow-apple border border-foreground/10 hover:opacity-90'
                : 'bg-card border border-border shadow-apple-sm hover:shadow-apple hover:border-foreground/20'
            }`}
            onClick={() => handlePreviewClick(s)}
            onMouseEnter={() => handleHover(s)}
            onMouseLeave={() => handleHover(null)}
          >
            {/* Left accent strip */}
            {!isHero && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r-full opacity-50"></div>}
            {isHero && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-background/40 rounded-r-full"></div>}
            
            <div className="flex flex-col gap-1 pl-2">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-bold ${
                  isHero ? 'bg-background/20 text-background/80' : 'bg-muted text-foreground'
                }`}>
                  {new Date(s.startDate).toLocaleString('default', { month: 'short' })}
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${
                  isHero ? 'text-orange-300' : 'text-orange-500'
                }`}>
                  {s.totalDaysOff} Days Off
                </span>
                {isHero && <span className="text-[8px] font-bold uppercase tracking-widest bg-background/10 text-background/60 px-1.5 py-0.5 rounded-sm">Top Pick</span>}
              </div>
              <h4 className={`font-bold text-sm leading-tight ${
                isHero ? 'text-background' : 'text-foreground'
              }`}>
                {s.holidayName ? s.holidayName : `${s.startDate.toLocaleString('default', { month: 'short', day: 'numeric' })} - ${s.endDate.toLocaleString('default', { month: 'short', day: 'numeric' })}`}
              </h4>
              {s.holidayName && (
                <p className={`text-[10px] font-medium uppercase tracking-widest ${
                  isHero ? 'text-background/50' : 'text-muted-foreground'
                }`}>
                  {s.startDate.toLocaleString('default', { month: 'short', day: 'numeric' })} – {s.endDate.toLocaleString('default', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className={`text-lg font-black leading-none font-mono ${
                  isHero ? 'text-background' : 'text-foreground'
                }`}>{s.leavesRequired}<span className={`text-[10px] ml-0.5 ${
                  isHero ? 'text-background/50' : 'text-muted-foreground'
                }`}>L</span></span>
                <span className={`text-[8px] uppercase font-bold tracking-widest mt-0.5 ${
                  isHero ? 'text-background/40' : 'text-muted-foreground'
                }`}>Cost</span>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isHero ? 'bg-background/20 text-background' : 'bg-muted group-hover:bg-purple-50 text-muted-foreground group-hover:text-purple-600'
              }`}>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
};

export default OptimizerPanel;
