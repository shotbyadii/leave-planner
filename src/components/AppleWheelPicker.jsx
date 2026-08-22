import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLOR_PALETTE } from '../utils/colorUtils';

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
  onColorChange
}) => {
  const scrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const itemHeight = 36;

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value with prop when not actively scrolling
  useEffect(() => {
    setInternalValue(value);
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
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColorChange(c.id)}
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
      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center select-none touch-pan-y">
        
        {/* Top & Bottom Fade Gradients */}
        <div className="absolute top-0 inset-x-0 h-7 bg-gradient-to-b from-card via-card/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-7 bg-gradient-to-t from-card via-card/80 to-transparent z-10 pointer-events-none" />
        
        {/* Central Selection Slot */}
        <div className={`absolute h-9 inset-x-1.5 ${currentColor.badge} rounded-lg pointer-events-none z-0 shadow-inner`} />

        {/* Scrollable Number Wheel */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
          className="h-full w-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory no-scrollbar relative z-10 py-[38px] overscroll-contain touch-pan-y"
        >
          {numbers.map((num) => {
            const isSelected = num === internalValue;
            return (
              <div
                key={num}
                onClick={() => selectNumber(num)}
                className={`h-[36px] w-full max-w-full snap-center flex items-center justify-center gap-1 transition-transform duration-100 cursor-pointer select-none ${
                  isSelected 
                    ? `text-xl font-black ${currentColor.text} font-mono scale-110` 
                    : 'text-xs font-bold text-muted-foreground/40 font-mono opacity-50 hover:opacity-80'
                }`}
              >
                <span>{num}</span>
                {isSelected && <span className="text-[9px] font-bold text-muted-foreground uppercase">{unit}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AppleWheelPicker;
