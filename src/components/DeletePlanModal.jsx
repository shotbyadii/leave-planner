import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

const DeletePlanModal = ({ plan, leaveCount, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.96 }} transition={{ type: 'spring', damping: 26, stiffness: 340 }} className="relative bg-card rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border border-border w-full max-w-sm overflow-hidden z-10">
            
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={28} />
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Delete Leave Plan?</h3>
                <p className="text-sm text-muted-foreground">
                  This will permanently cancel <span className="font-bold text-red-600">{leaveCount}</span> {leaveCount === 1 ? 'leaf' : 'leaves'} in 
                  <span className="font-bold text-foreground"> "{plan.name}"</span>.
                </p>
              </div>

              <div className="bg-muted/50 border border-border rounded-xl p-3 w-full text-left">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-mono">Date Range</div>
                <div className="text-xs font-bold text-foreground font-mono">
                  {new Date(plan.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(plan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/50 flex gap-3">
              <button 
                onClick={onClose} 
                className="flex-1 px-4 py-2.5 border border-border text-foreground bg-card hover:bg-muted rounded-xl text-xs font-bold transition-colors"
              >
                Keep Plan
              </button>
              <button 
                onClick={() => onConfirm(plan.id)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors shadow-md"
              >
                Delete Plan
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeletePlanModal;
