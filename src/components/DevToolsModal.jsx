import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, X, RotateCcw, Calendar, Play, Sparkles, Check, Sliders, Palette } from 'lucide-react';

const DevToolsModal = ({ 
  isOpen, 
  onClose, 
  getTodayStr, 
  devDateStr, 
  setDevDateStr, 
  setHasPromptedWfh,
  onStartNewUserFlow,
  onOpenWfhCheckin,
  calendarStyle = 'capsule',
  onSetCalendarStyle,
  focusedCellHeight = 52,
  onSetFocusedCellHeight
}) => {
  const [tempDateStr, setTempDateStr] = useState(devDateStr || getTodayStr());
  const [appliedToast, setAppliedToast] = useState(false);

  useEffect(() => {
    setTempDateStr(devDateStr || getTodayStr());
  }, [devDateStr, isOpen]);

  const handleApplyDate = () => {
    if (!tempDateStr) return;
    setDevDateStr(tempDateStr);
    localStorage.setItem('dev_date_override', tempDateStr);
    setHasPromptedWfh(false);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 2000);
  };

  const handleResetDate = () => {
    setDevDateStr('');
    localStorage.removeItem('dev_date_override');
    setTempDateStr(getTodayStr());
    setHasPromptedWfh(false);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={onClose} 
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 15 }} 
            className="relative bg-card w-full max-w-sm mx-auto rounded-[28px] border border-amber-500/40 shadow-2xl p-5 flex flex-col gap-4 z-10"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <FlaskConical size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground font-mono uppercase tracking-wider">Dev Suite</h3>
                  <span className="text-[10px] text-amber-500 font-bold font-mono">Local Test Environment</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status Toast */}
            {appliedToast && (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-500 text-center animate-in fade-in duration-150 flex items-center justify-center gap-1.5 font-mono">
                <Check size={14} /> Settings Applied!
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
              
              {/* 1. Focused Cell Height Slider */}
              <div className="p-3.5 bg-muted/40 border border-border rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <Sliders size={13} className="text-amber-500" /> Focused Cell Height
                  </label>
                  <span className="text-[9px] text-amber-500 font-mono font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {focusedCellHeight}px
                  </span>
                </div>
                <input 
                  type="range" 
                  min="24" 
                  max="64" 
                  value={focusedCellHeight} 
                  onChange={(e) => {
                    if (onSetFocusedCellHeight) onSetFocusedCellHeight(Number(e.target.value));
                  }} 
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* 2. Date Override Selector */}
              <div className="p-3.5 bg-muted/40 border border-border rounded-2xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-500" /> Override System Date
                  </label>
                  {devDateStr && (
                    <span className="text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500">
                      Active Override
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={tempDateStr} 
                    onChange={(e) => setTempDateStr(e.target.value)} 
                    className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-foreground outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  {devDateStr && (
                    <button 
                      type="button"
                      onClick={handleResetDate}
                      className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl transition-colors font-mono cursor-pointer"
                      title="Reset to today's date"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleApplyDate}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
                >
                  <Check size={14} strokeWidth={3} /> Apply Override Date
                </button>
              </div>

              {/* 3. Calendar Cell Aesthetic Style Switcher */}
              <div className="p-3.5 bg-muted/40 border border-border rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <Palette size={13} className="text-purple-400" /> Calendar Aesthetics Style
                  </label>
                  <span className="text-[9px] text-purple-400 font-mono font-black uppercase px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                    {calendarStyle}
                  </span>
                </div>
                <div className="flex bg-card p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSetCalendarStyle) onSetCalendarStyle('classic');
                    }}
                    className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-mono ${
                      calendarStyle === 'classic' 
                        ? 'bg-primary text-primary-foreground font-black shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Classic (Circular)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSetCalendarStyle) onSetCalendarStyle('capsule');
                    }}
                    className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer font-mono ${
                      calendarStyle === 'capsule' 
                        ? 'bg-primary text-primary-foreground font-black shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Capsule (Check-in)
                  </button>
                </div>
              </div>

              {/* 4. Start New User Flow */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onStartNewUserFlow) onStartNewUserFlow();
                }}
                className="w-full p-3 bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer font-mono"
              >
                <Play size={15} /> Start New User Flow (Onboarding)
              </button>

              {/* 5. Trigger WFH Modal */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenWfhCheckin) onOpenWfhCheckin();
                }}
                className="w-full p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer font-mono"
              >
                <Sparkles size={15} /> Trigger Attendance Check-in Modal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DevToolsModal;
