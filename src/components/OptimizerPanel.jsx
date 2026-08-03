import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight, Settings2, Sparkles, Minus, Plus, Search, X, ChevronDown, SlidersHorizontal, Compass } from 'lucide-react';
import { findOptimalWindows } from '../utils/leaveOptimizer';
import { parseNaturalLanguage } from '../utils/nlpParser';

const OptimizerPanel = ({ onPreviewRange, onHoverSuggestion, bookedDates = [], viewMode, setFocusedMonth, inlineOnMobile = false, leaves }) => {
  const plRem = leaves?.pl ? (leaves.pl.total - leaves.pl.used) : 15;
  const elRem = leaves?.el ? (leaves.el.total - leaves.el.used) : 10;
  const rhRem = leaves?.rh ? (leaves.rh.total - leaves.rh.used) : 1;
  const maxUsableLeaves = Math.max(1, Math.floor(plRem + Math.min(elRem, 2) + Math.min(rhRem, 1)));

  const [optimizerMode, setOptimizerMode] = useState('best'); // 'best' (default) or 'manual'
  const [leaveFilterTier, setLeaveFilterTier] = useState('all'); // 'all' | '1-2' | '3-4' | '5+'
  const [targetLeaves, setTargetLeaves] = useState(Math.min(2, maxUsableLeaves));
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
  }, [optimizerMode, leaveFilterTier, targetLeaves, targetMonth, targetDuration, bookedDates, maxUsableLeaves]);

  const handleOptimize = () => {
    const results = findOptimalWindows({
      targetLeaves: optimizerMode === 'best' ? maxUsableLeaves : targetLeaves,
      targetDuration,
      targetMonth,
      bookedDates,
      mode: optimizerMode,
      leaveFilterTier: optimizerMode === 'best' ? leaveFilterTier : 'all'
    });
    setSuggestions(results);
  };

  const handleAgenticSubmit = (e) => {
    if (e) e.preventDefault();
    if (!agenticText.trim()) return;
    
    const parsed = parseNaturalLanguage(agenticText);
    
    if (parsed.targetLeaves !== null) {
      setOptimizerMode('manual');
      setTargetLeaves(Math.min(parsed.targetLeaves, maxUsableLeaves));
    }
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
      
      {/* 1. Natural Language Search Input */}
      <form onSubmit={handleAgenticSubmit} className="p-3 md:p-3.5 border-b border-border bg-card">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-3.5 text-purple-400" size={16} />
          <input 
            type="text" 
            value={agenticText}
            onChange={(e) => setAgenticText(e.target.value)}
            placeholder="e.g. 4 day trip in October..."
            className="w-full pl-9 pr-16 py-2.5 bg-muted border border-border rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/40 transition-all placeholder:text-muted-foreground text-foreground select-text shadow-inner"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            {agenticText && (
              <button type="button" onClick={handleAgenticClear} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            )}
            <button type="submit" className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-md">
              <Search size={13} strokeWidth={3} />
            </button>
          </div>
        </div>
      </form>

      {/* 2. Controls Header Bar (✨ Auto vs 🎛️ Manual + Month Dropdown) */}
      <div className="p-3 border-b border-border bg-muted/30 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          
          {/* Mode Pill Toggle (✨ Auto vs 🎛️ Manual) */}
          <div className="flex bg-card p-1 rounded-2xl border border-border shadow-sm flex-1">
            <button 
              type="button"
              onClick={() => setOptimizerMode('best')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                optimizerMode === 'best' 
                  ? 'bg-primary text-primary-foreground font-black shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles size={13} className={optimizerMode === 'best' ? 'text-primary-foreground' : 'text-amber-500'} /> 
              <span>Auto</span>
            </button>
            <button 
              type="button"
              onClick={() => setOptimizerMode('manual')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                optimizerMode === 'manual' 
                  ? 'bg-primary text-primary-foreground font-black shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal size={13} /> 
              <span>Manual</span>
            </button>
          </div>

          {/* Month Selector Dropdown */}
          <div className="relative flex-shrink-0">
            <button 
              type="button"
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-bold bg-card border border-border rounded-2xl px-3 py-2 text-foreground shadow-sm hover:bg-muted transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[100px] font-mono">{monthOptions.find(m => m.value === targetMonth)?.label || 'Any Month'}</span>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMonthDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMonthDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 bg-card rounded-2xl shadow-2xl border border-border z-50 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto no-scrollbar">
                  {monthOptions.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { setTargetMonth(m.value); setIsMonthDropdownOpen(false); }}
                      className={`px-3.5 py-2 text-xs font-bold text-left transition-colors flex items-center justify-between ${
                        targetMonth === m.value 
                          ? 'bg-primary/10 text-primary font-black' 
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                      }`}
                    >
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mode Specific Sub-Controls */}
        {optimizerMode === 'best' ? (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {[
              { id: 'all', label: '🌟 All Tiers' },
              { id: '1-2', label: '⚡ 1-2 Leaves' },
              { id: '3-4', label: '✈️ 3-4 Leaves' },
              { id: '5+', label: '🏝️ 5+ Leaves' }
            ].map(tier => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setLeaveFilterTier(tier.id)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  leaveFilterTier === tier.id
                    ? 'bg-primary text-primary-foreground shadow-sm font-black'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-muted-foreground font-mono">Target Leaves:</span>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => { setTargetLeaves(Math.max(1, targetLeaves - 1)); setTargetDuration(null); }} 
                className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="text-sm font-black text-foreground w-6 text-center font-mono">{targetLeaves}</span>
              <button 
                type="button"
                onClick={() => { setTargetLeaves(Math.min(maxUsableLeaves, targetLeaves + 1)); setTargetDuration(null); }} 
                disabled={targetLeaves >= maxUsableLeaves}
                className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Suggestions List Header & Cards */}
      <div className={`p-4 flex flex-col gap-3 ${inlineOnMobile ? 'h-auto md:flex-1 md:overflow-y-auto' : 'flex-1 overflow-y-auto'}`}>
        <div className="flex justify-between items-center pb-1">
          <h2 className="font-bold flex items-center gap-2 text-foreground text-xs font-mono uppercase tracking-wider">
            <Lightbulb className="text-amber-500" size={15} fill="currentColor" />
            {targetDuration 
              ? `${targetDuration}-Day Trips` 
              : optimizerMode === 'best' 
              ? `Best Ratio Picks` 
              : `Bridges for ${targetLeaves} Leave${targetLeaves > 1 ? 's' : ''}`}
          </h2>

          <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Max {maxUsableLeaves} Usable
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 border border-dashed border-border rounded-3xl gap-2">
            <Compass size={32} className="text-muted-foreground/50 animate-bounce" />
            <p className="text-xs font-bold text-muted-foreground">No optimal leave windows found for selected month/tier.</p>
            <button 
              type="button" 
              onClick={() => { setTargetMonth('all'); setLeaveFilterTier('all'); }} 
              className="text-[11px] font-bold text-primary hover:underline mt-1"
            >
              Reset Month & Tier Filters
            </button>
          </div>
        ) : (
          suggestions.map((s, idx) => {
            const isHero = idx === 0 && optimizerMode === 'best';
            let badgeBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            if (s.leavesRequired >= 5) badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            else if (s.leavesRequired >= 3) badgeBg = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';

            const startMonthStr = new Date(s.startDate).toLocaleString('default', { month: 'short' });
            const startDay = new Date(s.startDate).getDate();
            const endMonthStr = new Date(s.endDate).toLocaleString('default', { month: 'short' });
            const endDay = new Date(s.endDate).getDate();
            const dateRangeStr = `${startDay} ${startMonthStr} – ${endDay} ${endMonthStr}`;
            const displayTitle = s.holidayName ? s.holidayName : `${startMonthStr} ${startDay} – ${endMonthStr} ${endDay}`;

            return (
              <div
                key={`${s.startDate.toISOString()}-${s.endDate.toISOString()}`}
                onClick={() => handlePreviewClick(s)}
                onMouseEnter={() => handleHover(s)}
                onMouseLeave={() => handleHover(null)}
                className={`group relative rounded-2xl p-4 transition-all cursor-pointer flex justify-between items-center select-none ${
                  isHero 
                    ? 'bg-foreground text-background shadow-apple border border-foreground/10 hover:opacity-90' 
                    : 'bg-card border border-border shadow-apple-sm hover:shadow-apple hover:border-foreground/20'
                }`}
              >
                {/* Left accent strip */}
                {!isHero && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${
                    s.leavesRequired >= 5 ? 'bg-emerald-500' : s.leavesRequired >= 3 ? 'bg-purple-500' : 'bg-blue-500'
                  }`} />
                )}
                {isHero && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-background/40 rounded-r-full" />}
                
                <div className="flex flex-col gap-1 pl-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-bold ${
                      isHero ? 'bg-background/20 text-background/80' : 'bg-muted text-foreground'
                    }`}>
                      {startMonthStr}
                    </span>

                    <span className={`text-[10px] uppercase tracking-wider font-bold ${
                      isHero ? 'text-orange-300' : 'text-orange-500'
                    }`}>
                      {s.totalDaysOff} Days Off
                    </span>

                    {!isHero && (
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${badgeBg}`}>
                        {s.leavesRequired <= 2 ? 'Quick' : s.leavesRequired <= 4 ? 'Vacation' : 'Mega Trip'}
                      </span>
                    )}

                    {isHero && (
                      <span className="text-[8px] font-bold uppercase tracking-wider bg-background/10 text-background/60 px-1.5 py-0.5 rounded-sm">
                        Top Pick
                      </span>
                    )}
                  </div>

                  <h4 className={`font-bold text-sm leading-tight ${isHero ? 'text-background' : 'text-foreground'}`}>
                    {displayTitle}
                  </h4>

                  <p className={`text-[10px] font-medium uppercase tracking-wider ${isHero ? 'text-background/50' : 'text-muted-foreground'}`}>
                    {dateRangeStr}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className={`text-lg font-black leading-none font-mono ${isHero ? 'text-background' : 'text-foreground'}`}>
                      {s.leavesRequired}<span className={`text-[10px] ml-0.5 ${isHero ? 'text-background/50' : 'text-muted-foreground'}`}>L</span>
                    </span>
                    <span className={`text-[8px] uppercase font-bold tracking-wider mt-0.5 ${isHero ? 'text-background/40' : 'text-muted-foreground'}`}>
                      Cost
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isHero ? 'bg-background/20 text-background' : 'bg-muted group-hover:bg-purple-50 text-muted-foreground group-hover:text-purple-600 dark:group-hover:bg-purple-900/40 dark:group-hover:text-purple-300'
                  }`}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default OptimizerPanel;
