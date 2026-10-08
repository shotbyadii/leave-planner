import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, Minus, Plus } from 'lucide-react';

/**
 * Reusable Slate Design System control for consecutive leave day policy limits.
 * Shows a custom-styled "Limit consecutive days?" checkbox that reveals an animated
 * counter when active.
 */
export const ConsecutiveLimitControl = ({
  value = null,
  onChange,
  defaultLimit = 2,
  min = 1,
  max = 30,
  compact = false,
  className = '',
  testId = 'consecutive-limit-checkbox'
}) => {
  const isLimited = value !== null && value !== undefined && Number(value) > 0;
  const currentCount = isLimited ? Number(value) : defaultLimit;

  const handleToggle = () => {
    if (isLimited) {
      onChange(null);
    } else {
      onChange(currentCount || defaultLimit);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    const nextVal = Math.max(min, currentCount - 1);
    onChange(nextVal);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    const nextVal = Math.min(max, currentCount + 1);
    onChange(nextVal);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Checkbox Trigger Header */}
      <div 
        onClick={handleToggle}
        className="flex items-center justify-between gap-2 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={isLimited}
            data-testid={testId}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
              isLimited
                ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                : 'bg-card border-border hover:border-foreground/50 text-transparent'
            }`}
          >
            <Check 
              size={11} 
              strokeWidth={3.5} 
              className={`transition-transform ${isLimited ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} 
            />
          </button>
          
          <span className={`font-mono ${compact ? 'text-[10px]' : 'text-xs'} font-bold flex items-center gap-1.5 transition-colors ${
            isLimited ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
          }`}>
            <Shield size={compact ? 11 : 12} className={isLimited ? 'text-amber-500' : 'text-muted-foreground/60'} />
            <span>Limit consecutive days?</span>
          </span>
        </div>

        {isLimited && (
          <span className="text-[10px] font-mono font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
            Max {currentCount}d
          </span>
        )}
      </div>

      {/* Expandable Counter Drawer */}
      <AnimatePresence initial={false}>
        {isLimited && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={`flex items-center justify-between pt-1.5 pb-0.5 ${compact ? 'pl-6' : 'pl-6 pr-1'}`}>
              <span className="text-[10px] text-muted-foreground font-mono">
                Allowed in a row:
              </span>

              <div className="flex items-center gap-1 bg-muted/80 border border-border/80 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={currentCount <= min}
                  className="w-5 h-5 rounded-lg bg-card hover:bg-muted border border-border/60 text-foreground flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                  title="Decrease consecutive days limit"
                >
                  <Minus size={11} />
                </button>

                <input
                  type="number"
                  min={min}
                  max={max}
                  value={currentCount}
                  onChange={handleInputChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 text-center font-mono font-black text-xs bg-transparent text-foreground focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={currentCount >= max}
                  className="w-5 h-5 rounded-lg bg-card hover:bg-muted border border-border/60 text-foreground flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                  title="Increase consecutive days limit"
                >
                  <Plus size={11} />
                </button>

                <span className="text-[9px] font-mono text-muted-foreground pr-1">days</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConsecutiveLimitControl;
