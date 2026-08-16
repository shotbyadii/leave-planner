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

      let el = document.querySelector(currentStep.targetSelector);
      if (el) {
        el.setAttribute('data-tutorial-target', 'true');
      }

      // Dual highlight for Step 5: Highlight Plan Name box simultaneously
      if (currentStep.id === 5) {
        const nameEl = document.querySelector('#tutorial-step-plan-name');
        if (nameEl) {
          nameEl.setAttribute('data-tutorial-target', 'true');
        }
      }
    };

    updateTargetDOM();
    const t1 = setTimeout(updateTargetDOM, 50);
    const t2 = setTimeout(updateTargetDOM, 150);
    const t3 = setTimeout(updateTargetDOM, 350);
    const t4 = setTimeout(updateTargetDOM, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
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

  return createPortal(
    <AnimatePresence>
      <div 
        id="tutorial-hint-card"
        className="fixed top-4 left-4 right-4 md:top-auto md:bottom-8 md:right-8 md:left-auto z-[99999] pointer-events-auto max-w-md w-[calc(100vw-32px)] md:w-96 mx-auto"
      >
        <motion.div
          key={`step-card-${currentStepIndex}`}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-3xl p-5 md:p-6 flex flex-col gap-3.5 relative overflow-hidden"
        >
          {/* Step Header & Badge */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1">
                <Play size={10} className="fill-primary" /> Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[9px] font-mono font-bold flex items-center gap-1">
                <ShieldAlert size={10} className="text-amber-500" /> Walkthrough Mode
              </span>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
            >
              Skip <X size={14} />
            </button>
          </div>

          {/* Step Title & Description */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base md:text-lg font-black text-foreground">
              {currentStep.title}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>
            {!isLastStep && (
              <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-primary">
                <MousePointerClick size={12} /> Click pulsing target element or Next Action below
              </div>
            )}
          </div>

          {/* Navigation Buttons Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 mt-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                isFirstStep
                  ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                  : 'bg-muted hover:bg-muted/80 text-foreground cursor-pointer'
              }`}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isLastStep ? 'Finish Tour' : 'Next Action'} <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default TutorialOverlay;
