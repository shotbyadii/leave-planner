import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Sparkles, ShieldAlert, Play, MousePointerClick } from 'lucide-react';
import { TUTORIAL_STEPS } from '../services/tutorialService';

const TutorialOverlay = ({ 
  currentStepIndex, 
  setCurrentStepIndex, 
  onComplete, 
  onSkip,
  onExecuteStepAction
}) => {
  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  // Enable body data attribute for non-target dimming
  useEffect(() => {
    document.body.setAttribute('data-tutorial-active', 'true');
    return () => {
      document.body.removeAttribute('data-tutorial-active');
      document.querySelectorAll('[data-tutorial-target="true"]').forEach(el => {
        el.removeAttribute('data-tutorial-target');
      });
    };
  }, []);

  const lastExecutedRef = React.useRef(-1);

  // Execute step action & attach native DOM target highlight
  useEffect(() => {
    if (!currentStep) return;

    if (lastExecutedRef.current !== currentStepIndex) {
      lastExecutedRef.current = currentStepIndex;
      if (onExecuteStepAction) {
        onExecuteStepAction(currentStep.executeAction, currentStepIndex);
      }
    }

    // Attach data-tutorial-target attribute directly to DOM element
    const updateTargetDOM = () => {
      // Clear previous targets
      document.querySelectorAll('[data-tutorial-target="true"]').forEach(el => {
        el.removeAttribute('data-tutorial-target');
      });

      if (currentStep.targetSelector) {
        document.querySelectorAll(currentStep.targetSelector).forEach(el => {
          el.setAttribute('data-tutorial-target', 'true');
        });
      }

      // Dual highlight for Step 5: Highlight Plan Name box simultaneously
      if (currentStep.id === 5) {
        document.querySelectorAll('#tutorial-step-plan-name, #tutorial-step-plan-name-mobile').forEach(nameEl => {
          nameEl.setAttribute('data-tutorial-target', 'true');
        });
      }
    };

    updateTargetDOM();
    const t1 = setTimeout(updateTargetDOM, 50);
    const t2 = setTimeout(updateTargetDOM, 150);
    const t3 = setTimeout(updateTargetDOM, 300);
    const t4 = setTimeout(updateTargetDOM, 500);
    const t5 = setTimeout(updateTargetDOM, 800);
    const t6 = setTimeout(updateTargetDOM, 1200);

    // Auto-scroll target element into view
    const scrollToTarget = () => {
      const targetEl = document.querySelector(currentStep.targetSelector);
      if (targetEl && typeof targetEl.scrollIntoView === 'function') {
        try {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
          // ignore fallback
        }
      }
    };

    scrollToTarget();
    const s1 = setTimeout(scrollToTarget, 100);
    const s2 = setTimeout(scrollToTarget, 300);
    const s3 = setTimeout(scrollToTarget, 600);
    const s4 = setTimeout(scrollToTarget, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(s1);
      clearTimeout(s2);
      clearTimeout(s3);
      clearTimeout(s4);
    };
  }, [currentStepIndex, currentStep]);

  if (!currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const stepLockoutRef = React.useRef(false);

  const handleNext = () => {
    if (stepLockoutRef.current) return;
    stepLockoutRef.current = true;
    setTimeout(() => { stepLockoutRef.current = false; }, 300);

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Dynamic docking:
  // - Steps 5 & 6 (index 4 & 5): Dock directly above the mobile confirm modal
  const [mobileModalBottomOffset, setMobileModalBottomOffset] = React.useState(null);

  React.useEffect(() => {
    const updateModalDockPosition = () => {
      if (typeof window === 'undefined' || window.innerWidth >= 768) {
        setMobileModalBottomOffset(null);
        return;
      }
      if (currentStepIndex === 4 || currentStepIndex === 5) {
        const modalDock = document.querySelector('#mobile-floating-dock');
        if (modalDock) {
          const rect = modalDock.getBoundingClientRect();
          // Distance from bottom of viewport to top of modal + 8px gap
          const bottomFromViewport = Math.max(16, window.innerHeight - rect.top + 8);
          setMobileModalBottomOffset(bottomFromViewport);
          return;
        }
      }
      setMobileModalBottomOffset(null);
    };

    updateModalDockPosition();
    const interval = setInterval(updateModalDockPosition, 60);
    window.addEventListener('resize', updateModalDockPosition);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateModalDockPosition);
    };
  }, [currentStepIndex]);

  // Dynamic mobile positioning:
  // - Steps 1-4: Place at BOTTOM (bottom-24) above navbar & selection bar
  // - Steps 5-6: Placed dynamically right above the confirmation modal
  // - Step 7: Place at TOP (top-3) on Tracker page
  const isBottomStep = currentStepIndex <= 3;
  const isModalStep = currentStepIndex === 4 || currentStepIndex === 5;

  let mobilePositionClass = "top-3 left-3 right-3";
  if (isBottomStep) {
    mobilePositionClass = "bottom-24 left-3 right-3";
  } else if (isModalStep && mobileModalBottomOffset !== null) {
    mobilePositionClass = "left-3 right-3";
  }

  const dynamicStyle = (isModalStep && mobileModalBottomOffset !== null) 
    ? { bottom: `${mobileModalBottomOffset}px` } 
    : {};

  return createPortal(
    <AnimatePresence mode="wait">
      <div 
        id="tutorial-hint-card"
        key={`hint-pos-${isModalStep ? 'modal-dock' : isBottomStep ? 'bottom' : 'top'}`}
        style={dynamicStyle}
        className={`fixed ${mobilePositionClass} md:top-auto md:bottom-8 md:right-8 md:left-auto md:!bottom-8 z-[99999] pointer-events-auto max-w-md w-[calc(100vw-24px)] md:w-96 mx-auto transition-[bottom] duration-150`}
      >
        <motion.div
          key={`step-card-${currentStepIndex}`}
          initial={{ opacity: 0, y: isBottomStep || isModalStep ? 10 : -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isBottomStep || isModalStep ? 10 : -10, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-card/95 dark:bg-[#0e0e12]/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 flex flex-col gap-2.5 relative overflow-hidden"
        >
          {/* Step Header & Badge */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1">
                <Play size={9} className="fill-primary" /> Step {currentStepIndex + 1}/{TUTORIAL_STEPS.length}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[9px] font-mono font-bold flex items-center gap-1">
                <ShieldAlert size={9} className="text-amber-500" /> Walkthrough Mode
              </span>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-muted/50"
            >
              Skip <X size={13} />
            </button>
          </div>

          {/* Step Title & Description */}
          <div className="flex flex-col gap-1">
            <h3 className="text-sm sm:text-base font-black text-foreground leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>
            {!isLastStep && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                <MousePointerClick size={11} /> Tap highlighted target or Next Action below
              </div>
            )}
          </div>

          {/* Navigation Buttons Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                isFirstStep
                  ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                  : 'bg-muted hover:bg-muted/80 text-foreground cursor-pointer'
              }`}
            >
              <ChevronLeft size={13} /> Prev
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            >
              {isLastStep ? 'Finish Tour' : 'Next Action'} <ChevronRight size={13} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default TutorialOverlay;
