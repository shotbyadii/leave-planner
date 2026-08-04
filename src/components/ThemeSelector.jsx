import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

const ThemeSelector = ({ theme = 'light', setTheme, className = '', direction = 'down', variant = 'icon' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { id: 'light', label: 'Light Theme', icon: Sun },
    { id: 'dark', label: 'Dark Theme', icon: Moon },
    { id: 'system', label: 'Device Theme', icon: Monitor }
  ];

  const currentOption = options.find(o => o.id === theme) || options[0];
  const CurrentIcon = currentOption.icon;

  const menuPosClass = direction === 'up' 
    ? 'bottom-full mb-1.5 origin-bottom-left left-0' 
    : 'top-full mt-1.5 origin-top-right right-0';

  return (
    <div ref={dropdownRef} className={`relative ${variant === 'full' ? 'flex-1' : 'inline-block'} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          variant === 'full'
            ? "w-full flex items-center justify-center gap-2 py-2.5 bg-muted/60 border border-border text-foreground rounded-2xl text-xs font-bold hover:bg-muted transition-colors cursor-pointer"
            : "p-2 border border-border/80 rounded-xl bg-card hover:bg-muted transition-all active:scale-95 shadow-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
        }
        title="Change Theme"
      >
        <CurrentIcon size={variant === 'full' ? 15 : 16} className="text-foreground" />
        {variant === 'full' && <span>{currentOption.label}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: direction === 'up' ? -6 : 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'up' ? -6 : 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[250] w-40 bg-card border border-border rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 ${menuPosClass}`}
          >
            <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground font-mono border-b border-border/60 mb-0.5">
              Theme Mode
            </div>

            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={(e) => {
                    if (e && typeof document !== 'undefined') {
                      document.documentElement.style.setProperty('--ripple-x', `${e.clientX}px`);
                      document.documentElement.style.setProperty('--ripple-y', `${e.clientY}px`);
                    }
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;
