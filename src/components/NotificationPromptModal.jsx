import React from 'react';
import { Bell, X } from 'lucide-react';

const NotificationPromptModal = ({ isOpen, onClose, onEnable }) => {
  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem('notif_prompt_dismissed', 'true');
    onClose();
  };

  const handleEnableClick = async () => {
    await onEnable();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-6 z-10 animate-in zoom-in-95 duration-200 text-center flex flex-col items-center gap-4">
        
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

      </div>
    </div>
  );
};

export default NotificationPromptModal;
