import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const DeletePlanModal = ({ plan, leaveCount, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] shadow-black/90 border border-border w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-red-500" size={28} />
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">Delete Leave Plan?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently cancel <span className="font-bold text-red-600">{leaveCount}</span> leave{leaveCount > 1 ? 's' : ''} in 
              <span className="font-bold text-foreground"> "{plan.name}"</span>.
            </p>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-3 w-full text-left">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Date Range</div>
            <div className="text-sm font-semibold text-foreground">
              {new Date(plan.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(plan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/50 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 border border-border text-foreground bg-card hover:bg-muted rounded-lg text-sm font-medium transition-colors"
          >
            Keep Plan
          </button>
          <button 
            onClick={() => onConfirm(plan.id)}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            Delete Plan
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeletePlanModal;
