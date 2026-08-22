import React from 'react';
import { Sparkles, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const DemoBanner = ({ onRestartDemo, onExitDemo }) => {
  return (
    <div 
      id="sandbox-demo-banner" 
      className="fixed top-0 left-0 right-0 h-10 bg-background/95 backdrop-blur-xl border-b border-amber-500/30 z-[100000] px-3 sm:px-4 flex items-center justify-between shadow-lg shadow-black/10 select-none pointer-events-auto"
    >
      <div className="flex items-center gap-2 overflow-hidden flex-shrink-0">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0 font-mono text-xs">
          🎮
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black font-mono tracking-tight text-foreground whitespace-nowrap">
            Sandbox Demo
          </span>
          <span className="hidden sm:inline-flex text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
            Session-Only
          </span>
          <span className="text-[11px] text-muted-foreground hidden lg:inline font-medium ml-1">
            Data disappears when tab is closed.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onRestartDemo}
          className="px-2 sm:px-2.5 py-1 text-xs font-bold font-mono bg-muted/80 hover:bg-muted border border-border text-foreground rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer hover:border-amber-500/40"
          title="Restart demo walkthrough"
        >
          <RotateCcw size={12} />
          <span className="hidden sm:inline">Restart Demo</span>
        </button>

        <button
          type="button"
          onClick={onExitDemo}
          className="px-2.5 py-1 text-xs font-bold font-mono bg-primary text-primary-foreground rounded-lg transition-all flex items-center gap-1 shadow-sm hover:opacity-90 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span>Exit</span>
          <span className="hidden sm:inline">Demo</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default DemoBanner;
