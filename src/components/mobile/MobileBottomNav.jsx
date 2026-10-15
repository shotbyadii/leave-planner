import React from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Sparkles, ListTodo, Menu } from 'lucide-react';

export default function MobileBottomNav({
  leaves,
  bookedDates = [],
  activeTab = 'calendar',
  setActiveTab,
  scrollToTop,
  onOpenAi,
  onOpenMenu
}) {
  const total = (leaves?.pl?.total || 15) + (leaves?.el?.total || 10) + (leaves?.rh?.total || 1);
  const usedPL = leaves?.pl?.used || 0;
  const usedEL = leaves?.el?.used || 0;
  const usedRH = leaves?.rh?.used || 0;
  const totalUsed = usedPL + usedEL + usedRH;
  const totalUsedFmt = Number.isInteger(totalUsed) ? totalUsed : totalUsed.toFixed(1);

  const pctPL = total > 0 ? (usedPL / total) * 100 : 0;
  const pctEL = total > 0 ? (usedEL / total) * 100 : 0;
  const pctRH = total > 0 ? (usedRH / total) * 100 : 0;

  const curMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const wfhUsedThisMonth = bookedDates.filter(b => b.type === 'wfh' && typeof b.date === 'string' && b.date.startsWith(curMonthKey)).length;
  const maxWfh = parseInt(localStorage.getItem('quota_wfh') || '10', 10);
  const pctWFH = Math.min(100, (wfhUsedThisMonth / maxWfh) * 100);

  return (
    <motion.div 
      key="nav"
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      style={{ transformOrigin: 'bottom center' }}
      className="origin-bottom"
    >
      {/* Mini usage bar */}
      <div className="border-b border-border/40">
        {/* Secondary WFH bar (thin 2px cyan line over leaves bar) */}
        <div data-testid="mobile-wfh-mini-meter" className="h-[2px] w-full bg-cyan-950/20 dark:bg-cyan-950/40 relative overflow-hidden">
          <div className="h-full bg-cyan-400 dark:bg-cyan-400 transition-all duration-300" style={{ width: `${pctWFH}%` }} />
        </div>
        {/* Main Leaves bar */}
        <div data-testid="mobile-annual-mini-meter" className="h-1 w-full bg-transparent flex">
          <div className="h-full bg-blue-500" style={{ width: `${pctPL}%` }} />
          <div className="h-full bg-orange-500" style={{ width: `${pctEL}%` }} />
          <div className="h-full bg-green-500" style={{ width: `${pctRH}%` }} />
        </div>
        <div className="flex justify-between items-center px-4 py-1.5">
          <span className="text-[9px] font-bold tracking-widest text-foreground uppercase">{totalUsedFmt} / {total} Used</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>PL</span>
            <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"/>EL</span>
            <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>RH</span>
            <span className="flex items-center gap-1 text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"/>WFH {wfhUsedThisMonth}/{maxWfh}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-around items-center px-2 py-1.5">
        <button 
          data-testid="mobile-nav-calendar"
          onClick={() => {
            setActiveTab('calendar');
            if (scrollToTop) scrollToTop();
          }} 
          className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-colors cursor-pointer ${activeTab === 'calendar' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CalendarIcon size={20} className="mb-1"/>
          <span className="text-[9px] font-bold tracking-wide">Calendar</span>
        </button>

        <button 
          data-testid="mobile-nav-ai"
          onClick={onOpenAi} 
          className="flex flex-col items-center py-2 px-3 rounded-2xl text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer relative"
          title="Gemini AI Vacation & Leave Assistant"
        >
          <div className="relative">
            <Sparkles size={20} className="mb-1 text-blue-500 animate-pulse"/>
            <span className="absolute -top-1.5 -right-3 bg-blue-500 text-white text-[7px] font-mono font-bold px-1 rounded-full shadow-xs">
              AI
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-wide text-blue-500">Assistant</span>
        </button>

        <button 
          data-testid="mobile-nav-tracker"
          onClick={() => {
            setActiveTab('tracker');
            if (scrollToTop) scrollToTop();
          }} 
          className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-colors cursor-pointer ${activeTab === 'tracker' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <div className="relative">
            <ListTodo size={20} className="mb-1"/>
            {bookedDates.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {bookedDates.length}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold tracking-wide">Tracker</span>
        </button>

        <button 
          data-testid="mobile-menu-btn" 
          onClick={onOpenMenu} 
          className="flex flex-col items-center py-2 px-3 rounded-2xl text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Menu size={20} className="mb-1"/>
          <span className="text-[9px] font-bold tracking-wide">Menu</span>
        </button>
      </div>
    </motion.div>
  );
}
