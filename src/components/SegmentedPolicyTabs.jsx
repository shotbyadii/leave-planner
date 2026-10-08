import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Common High-Contrast Segmented Tab Selector for Slate Design System
 * Features:
 * - High-contrast active state (WCAG AAA compliant in both Dark & Light modes)
 * - Butter-smooth layoutId spring pill sliding
 * - Integrated counts and status indicators
 */
export const SegmentedPolicyTabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  layoutId = 'segmented-policy-tab-pill',
  size = 'md'
}) => {
  const sizeClasses = {
    xs: 'py-1 px-2 text-[10px] rounded-lg',
    sm: 'py-1.5 px-2.5 text-xs rounded-xl',
    md: 'py-2 px-3 text-xs rounded-xl'
  }[size] || 'py-2 px-3 text-xs rounded-xl';

  const pillRadius = size === 'xs' ? 'rounded-lg' : 'rounded-xl';
  const containerRadius = size === 'xs' ? 'rounded-xl' : 'rounded-2xl';

  return (
    <div 
      role="tablist"
      className={`flex p-1 bg-muted/80 dark:bg-black/50 light:bg-slate-100/90 border border-border/80 ${containerRadius} gap-1 relative select-none backdrop-blur-md ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            data-testid={tab.testId || `policy-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`flex-1 ${sizeClasses} font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer relative z-10 ${
              isActive
                ? 'text-background font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {/* Sliding High-Contrast Active Pill */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 35,
                  mass: 0.8
                }}
                className={`absolute inset-0 ${pillRadius} bg-foreground text-background shadow-md shadow-foreground/10 border border-foreground/15 -z-10`}
              />
            )}

            {Icon && <Icon size={14} className="flex-shrink-0" />}
            <span className="truncate">{tab.label}</span>

            {/* Optional Count Badge */}
            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-background/25 text-background font-black'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}

            {/* Optional Status Dot */}
            {tab.dotColor && (
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform ${tab.dotColor} ${
                  isActive ? 'scale-110 ring-1 ring-background/30' : ''
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Animated Container that smoothly morphs in height when tabs change.
 * Prevents abrupt height cuts and applies fluid crossfade transitions.
 */
export const MorphingTabContent = ({
  activeKey,
  children,
  className = '',
  minHeight = 'auto'
}) => {
  const containerRef = React.useRef(null);
  const [height, setHeight] = React.useState('auto');

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      // Set initial height immediately if measured
      if (containerRef.current.offsetHeight) {
        setHeight(containerRef.current.offsetHeight);
      }
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target && entry.target.offsetHeight > 0) {
            setHeight(entry.target.offsetHeight);
          }
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [activeKey]);

  return (
    <motion.div
      data-testid="morphing-tab-content"
      animate={{ height }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      className={`w-full overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <div ref={containerRef} className="w-full">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SegmentedPolicyTabs;
