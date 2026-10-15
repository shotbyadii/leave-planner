import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function MobileSelectionBar({
  selectionStart,
  previewDates = [],
  onCancel,
  onApplySingleDay,
  onConfirmRange
}) {
  return (
    <motion.div 
      key="selection"
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      style={{ transformOrigin: 'bottom center' }}
      className="flex items-center gap-3 px-4 h-[62px] origin-bottom"
    >
      <div className="flex-1">
        {selectionStart && previewDates.length === 0 ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-none">
                Selected {new Date(selectionStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[9px] text-slate-300 leading-none mt-0.5">
                Pick end date or apply 1 day
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-none">
              {previewDates.length} Days Selected
            </span>
            <span className="text-[9px] text-slate-300 leading-none mt-0.5">
              {new Date(previewDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(previewDates[previewDates.length-1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
      </div>
      <button 
        type="button"
        onClick={onCancel} 
        className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 cursor-pointer transition-colors"
      >
        Cancel
      </button>
      {selectionStart && previewDates.length === 0 && (
        <button 
          type="button"
          onClick={onApplySingleDay} 
          className="flex items-center gap-1.5 text-xs font-black text-black bg-white hover:bg-slate-100 px-3.5 py-2 rounded-full shadow-md whitespace-nowrap cursor-pointer active:scale-95 transition-all"
        >
          Apply 1 Day <Check size={13} strokeWidth={3}/>
        </button>
      )}
      {previewDates.length > 0 && (
        <button 
          type="button"
          id="tutorial-step-confirm-plan-btn-mobile"
          onClick={onConfirmRange} 
          className="flex items-center gap-1.5 text-xs font-black text-black bg-white hover:bg-slate-100 px-4 py-2 rounded-full shadow-md whitespace-nowrap cursor-pointer active:scale-95 transition-all"
        >
          Confirm <Check size={13} strokeWidth={3}/>
        </button>
      )}
    </motion.div>
  );
}
