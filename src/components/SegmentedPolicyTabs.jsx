import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticSelectionTick } from '../utils/haptics';

/**
 * Common High-Contrast Segmented Tab Selector for Slate Design System
 * Features:
 * - High-contrast active state (WCAG AAA compliant in both Dark & Light modes)
 * - Butter-smooth layoutId spring pill sliding
 * - Integrated counts and status indicators
 * - Horizontal smooth scrolling with edge fade gradients for long names on mobile
 * - Auto-centering of active tab on selection
 */
export const SegmentedPolicyTabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  layoutId = 'segmented-policy-tab-pill',
  size = 'md'
}) => {
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sizeClasses = {
    xs: 'h-[22px] px-2 text-[10px] rounded-lg leading-none',
    sm: 'py-1.5 px-3 text-xs rounded-xl',
    md: 'py-2 px-3.5 text-xs rounded-xl'
  }[size] || 'py-2 px-3.5 text-xs rounded-xl';

  const pillRadius = size === 'xs' ? 'rounded-lg' : 'rounded-xl';
  const containerRadius = size === 'xs' ? 'rounded-xl' : 'rounded-2xl';

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(checkScroll, 80);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [checkScroll, tabs]);

  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const el = activeTabRef.current;
      const container = scrollContainerRef.current;
      const elLeft = el.offsetLeft;
      const elRight = elLeft + el.offsetWidth;
      const cScrollLeft = container.scrollLeft;
      const cWidth = container.clientWidth;

      // Only scroll the internal horizontal container if tab is outside visible area
      // Avoid calling native el.scrollIntoView() which scrolls ancestor page containers vertically
      if (elLeft < cScrollLeft + 12 || elRight > cScrollLeft + cWidth - 12) {
        container.scrollTo({
          left: Math.max(0, elLeft - (cWidth / 2) + (el.offsetWidth / 2)),
          behavior: 'smooth'
        });
      }
    }
    checkScroll();
  }, [activeTab, checkScroll]);

  // Dynamic alpha mask for edge fade
  const maskStyle = useMemo(() => {
    if (!canScrollLeft && !canScrollRight) return {};
    const leftStop = canScrollLeft ? 'transparent 0px, black 28px' : 'black 0px';
    const rightStop = canScrollRight ? 'black calc(100% - 28px), transparent 100%' : 'black 100%';
    const gradient = `linear-gradient(to right, ${leftStop}, ${rightStop})`;
    return {
      maskImage: gradient,
      WebkitMaskImage: gradient
    };
  }, [canScrollLeft, canScrollRight]);

  return (
    <div className={`relative max-w-full min-w-0 ${className || 'w-full'}`}>
      {/* Outer Pill Container */}
      <div 
        className={`${size === 'xs' ? 'h-7 p-0.5' : 'p-1'} flex items-center bg-muted/80 dark:bg-black/50 light:bg-slate-100/90 border border-border/80 ${containerRadius} relative select-none backdrop-blur-md overflow-hidden`}
      >
        {/* Scrollable Tab Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          role="tablist"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth w-full relative h-full"
          style={maskStyle}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                role="tab"
                aria-selected={isActive}
                type="button"
                data-testid={tab.testId || `policy-tab-${tab.id}`}
                onClick={() => {
                  if (!isActive) hapticSelectionTick();
                  onChange(tab.id);
                }}
                className={`flex-1 min-w-max ${sizeClasses} font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer relative z-10 whitespace-nowrap flex-shrink-0 ${
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

                {Icon && <Icon size={size === 'xs' ? 12 : 14} className="flex-shrink-0" />}
                <span className="whitespace-nowrap font-bold">
                  {tab.label}
                </span>

                {/* Optional Count Badge */}
                {tab.count !== undefined && tab.count !== null && (
                  <span
                    className={`${size === 'xs' ? 'text-[9px] px-1 py-0.2 leading-none' : 'text-[10px] px-1.5 py-0.5'} font-mono font-bold rounded-full transition-colors flex-shrink-0 ${
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

        {/* Left Scroll Fade Overlay Indicator */}
        <div 
          aria-hidden="true"
          className={`absolute left-0 top-0 bottom-0 w-6 pointer-events-none rounded-l-2xl bg-gradient-to-r from-muted/90 dark:from-black/70 via-muted/40 dark:via-black/30 to-transparent z-20 transition-opacity duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Right Scroll Fade Overlay Indicator */}
        <div 
          aria-hidden="true"
          className={`absolute right-0 top-0 bottom-0 w-6 pointer-events-none rounded-r-2xl bg-gradient-to-r from-transparent via-muted/40 dark:via-black/30 to-muted/90 dark:to-black/70 z-20 transition-opacity duration-200 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
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
      <div ref={containerRef} className="w-full py-1 px-1">
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
