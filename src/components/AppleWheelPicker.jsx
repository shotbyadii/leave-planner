import React, { useRef, useEffect } from 'react';
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
  const itemHeight = 36;

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  useEffect(() => {
    if (scrollRef.current) {
      const selectedIndex = numbers.indexOf(value);
      if (selectedIndex !== -1) {
        scrollRef.current.scrollTop = selectedIndex * itemHeight;
      }
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const selectedNum = numbers[Math.min(Math.max(0, index), numbers.length - 1)];
    if (selectedNum !== undefined && selectedNum !== value && onChange) {
      onChange(selectedNum);
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
          className="w-full bg-muted/40 border border-border/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
              className={`w-4 h-4 rounded-full ${c.bg} transition-all duration-200 ${
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
      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center select-none">
        
        {/* Top & Bottom Fade Gradients */}
        <div className="absolute top-0 inset-x-0 h-7 bg-gradient-to-b from-card via-card/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-7 bg-gradient-to-t from-card via-card/80 to-transparent z-10 pointer-events-none" />
        
        {/* Central Selection Slot */}
        <div className={`absolute h-9 inset-x-1.5 ${currentColor.badge} rounded-lg pointer-events-none z-0 shadow-inner`} />

        {/* Scrollable Number Wheel */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative z-10 py-[38px]"
          style={{ scrollBehavior: 'smooth' }}
        >
          {numbers.map((num) => {
            const isSelected = num === value;
            return (
              <div
                key={num}
                onClick={() => {
                  if (scrollRef.current) {
                    const idx = numbers.indexOf(num);
                    scrollRef.current.scrollTop = idx * itemHeight;
                  }
                }}
                className={`h-[36px] snap-center flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
