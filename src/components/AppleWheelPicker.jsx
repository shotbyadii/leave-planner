import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Shield, Plus, Minus } from 'lucide-react';
import { COLOR_PALETTE, SELECTABLE_LEAVE_PALETTE } from '../utils/colorUtils';
import { hapticSelectionTick, hapticLight } from '../utils/haptics';
import ConsecutiveLimitControl from './ConsecutiveLimitControl';

const AppleWheelPicker = ({ 
  value = 10, 
  onChange, 
  min = 0, 
  max = 30, 
  label = '', 
  code = '',
  unit = 'days',
  customName = '',
  onCustomNameChange,
  color = 'blue',
  onColorChange,
  onRemove = null,
  maxConsecutive = null,
  onMaxConsecutiveChange = null
}) => {
  const scrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const lastHapticValueRef = useRef(value);
  const itemHeight = 36;

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value with prop when not actively scrolling
  useEffect(() => {
    setInternalValue(value);
    lastHapticValueRef.current = value;
    if (scrollRef.current && !isScrollingRef.current) {
      const selectedIndex = numbers.indexOf(value);
      if (selectedIndex !== -1) {
        scrollRef.current.scrollTop = selectedIndex * itemHeight;
      }
    }
  }, [value, min, max]);

  // Initial position sync on mount
  useEffect(() => {
    if (scrollRef.current) {
      const selectedIndex = numbers.indexOf(value);
      if (selectedIndex !== -1) {
        scrollRef.current.scrollTop = selectedIndex * itemHeight;
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollLeft !== 0) {
      scrollRef.current.scrollLeft = 0;
    }
    isScrollingRef.current = true;

    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.min(Math.max(0, index), numbers.length - 1);
    const selectedNum = numbers[clampedIndex];

    if (selectedNum !== undefined && selectedNum !== internalValue) {
      setInternalValue(selectedNum);
      // Sharp, focused haptic on every gear notch
      if (selectedNum !== lastHapticValueRef.current) {
        lastHapticValueRef.current = selectedNum;
        hapticSelectionTick();
      }
    }

    // Debounce calling the parent onChange so scroll momentum is never blocked
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (selectedNum !== undefined && onChange) {
        onChange(selectedNum);
      }
    }, 80);
  }, [numbers, internalValue, onChange]);

  const selectNumber = (num) => {
    if (!scrollRef.current) return;
    const idx = numbers.indexOf(num);
    if (idx !== -1) {
      scrollRef.current.scrollTo({
        top: idx * itemHeight,
        behavior: 'smooth'
      });
      setInternalValue(num);
      lastHapticValueRef.current = num;
      hapticSelectionTick();
      if (onChange) onChange(num);
    }
  };

  const currentColor = COLOR_PALETTE.find(c => c.id === color) || COLOR_PALETTE[0];

  const getShortform = (name, fallbackCode) => {
    if (!name || typeof name !== 'string') return fallbackCode;
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return fallbackCode;
    if (words.length === 1) {
      return words[0].substring(0, 3).toUpperCase();
    }
    return words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
  };

  const displayShortform = getShortform(customName, code);

  return (
    <div className="flex flex-col gap-2 bg-card/80 border border-border/80 rounded-2xl p-3.5 shadow-apple-sm flex-1 min-w-[140px]">
      
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-md border ${currentColor.badge}`}>
          {displayShortform}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onRemove();
            }}
            className="w-5 h-5 rounded-full bg-muted/60 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer border border-border/40"
            title="Remove category"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Name Entry Field */}
      {onCustomNameChange && (
        <input
          type="text"
          value={customName}
          onChange={(e) => onCustomNameChange(e.target.value)}
          placeholder={`${code || label} Name...`}
          className="w-full bg-muted/40 border border-border/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      )}

      {/* Color Swatches */}
      {onColorChange && (
        <div className="flex items-center justify-between gap-1 py-0.5">
          {SELECTABLE_LEAVE_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                hapticLight();
                onColorChange(c.id);
              }}
              className={`w-4 h-4 rounded-full ${c.bg} transition-transform duration-150 cursor-pointer ${
                color === c.id 
                  ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110' 
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
              title={c.name}
            />
          ))}
        </div>
      )}

      {/* Compact Wheel Tumbler */}
      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center select-none touch-pan-y group">
        
        {/* Top & Bottom Fade Gradients with Apple depth */}
        <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-card via-card/75 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-card via-card/75 to-transparent z-10 pointer-events-none" />
        
        {/* Central Selection Slot Lens */}
        <div className={`absolute h-9 inset-x-1.5 ${currentColor.badge} rounded-lg pointer-events-none z-0 border-y border-foreground/15 dark:border-white/10 shadow-xs flex items-center justify-between px-2`} />

        {/* Quick Stepper Buttons inside Lens Slot */}
        <div className="absolute inset-x-2.5 h-9 flex items-center justify-between pointer-events-none z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (internalValue > min) {
                selectNumber(internalValue - 1);
              }
            }}
            disabled={internalValue <= min}
            className="w-6 h-6 rounded-md bg-card/85 dark:bg-card/90 hover:bg-card text-muted-foreground hover:text-foreground border border-border/60 shadow-2xs flex items-center justify-center transition-all pointer-events-auto active:scale-90 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
            title="Decrease by 1"
          >
            <Minus size={11} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (internalValue < max) {
                selectNumber(internalValue + 1);
              }
            }}
            disabled={internalValue >= max}
            className="w-6 h-6 rounded-md bg-card/85 dark:bg-card/90 hover:bg-card text-muted-foreground hover:text-foreground border border-border/60 shadow-2xs flex items-center justify-center transition-all pointer-events-auto active:scale-90 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
            title="Increase by 1"
          >
            <Plus size={11} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Number Wheel with 3D Tumbler Scale Curve */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
          className="h-full w-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar relative z-10 py-[38px] overscroll-contain touch-pan-y"
        >
          {numbers.map((num) => {
            const isSelected = num === internalValue;
            const distance = Math.abs(num - internalValue);

            const styleClasses = isSelected 
              ? `text-xl font-black ${currentColor.text} font-mono scale-110 opacity-100 z-10` 
              : distance === 1
                ? 'text-sm font-bold text-muted-foreground/60 font-mono scale-95 opacity-55'
                : 'text-xs font-semibold text-muted-foreground/30 font-mono scale-85 opacity-25';

            return (
              <div
                key={num}
                onClick={() => selectNumber(num)}
                className={`h-[36px] w-full max-w-full snap-center flex items-center justify-center gap-1 transition-all duration-100 cursor-pointer select-none ${styleClasses}`}
              >
                <span>{num}</span>
                {isSelected && <span className="text-[9px] font-bold text-muted-foreground uppercase">{unit}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Continuous Limit Policy Field */}
      {onMaxConsecutiveChange && (
        <div className="pt-2 border-t border-border/40">
          <ConsecutiveLimitControl
            value={maxConsecutive}
            onChange={onMaxConsecutiveChange}
            compact={true}
            defaultLimit={2}
          />
        </div>
      )}
    </div>
  );
};

export default AppleWheelPicker;
