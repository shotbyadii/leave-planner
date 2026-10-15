import React from 'react';
import { motion } from 'framer-motion';
import { ExistingLeaveDetailContent } from '../ExistingLeaveModal';

export default function MobileLeaveDetailSheet({
  leaveObj,
  onClose,
  onCancelLeave,
  onCancelPlan,
  onConvertToOffice,
  onConvertToWfh,
  onConvertToLeave,
  leaves,
  leaveColors,
  leaveNames,
  bookedDates,
  maxWfh = 10,
  calendarStyle = 'default'
}) {
  return (
    <motion.div 
      key="viewing-leave"
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      style={{ transformOrigin: 'bottom center' }}
      className="max-h-[min(82dvh,calc(100dvh-4rem-env(safe-area-inset-bottom,0px)))] flex flex-col overflow-hidden bg-card origin-bottom"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 bg-card flex-shrink-0">
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
      </div>
      <ExistingLeaveDetailContent 
        leaveObj={leaveObj} 
        onClose={onClose} 
        onCancelLeave={onCancelLeave}
        onCancelPlan={onCancelPlan}
        onConvertToOffice={onConvertToOffice}
        onConvertToWfh={onConvertToWfh}
        onConvertToLeave={onConvertToLeave}
        leaves={leaves}
        leaveColors={leaveColors}
        leaveNames={leaveNames}
        bookedDates={bookedDates}
        maxWfh={maxWfh}
        calendarStyle={calendarStyle}
      />
    </motion.div>
  );
}
