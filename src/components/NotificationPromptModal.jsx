import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

const NotificationPromptModal = ({ isOpen, onClose, onEnable }) => {
  const handleDismiss = () => {
    localStorage.setItem('notif_prompt_dismissed', 'true');
    onClose();
  };

  const handleEnableClick = async () => {
    await onEnable();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.96 }} transition={{ type: 'spring', damping: 26, stiffness: 340 }} className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-6 z-10 text-center flex flex-col items-center gap-4">
        
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner mt-1">
          <Bell size={28} />
        </div>

        <div>
          <h3 className="text-lg font-black text-foreground">Enable Daily Attendance Reminders</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium px-2">
            Get an automated browser notification toast every working day after 12:00 PM so you never forget to log whether today is Work From Home or In-Office.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full mt-2">
          <button
            onClick={handleEnableClick}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Bell size={16} /> Enable Notifications
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-3 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-2xl font-bold text-xs border border-border/60 transition-colors"
          >
            Not Needed
          </button>
        </div>

      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPromptModal;
