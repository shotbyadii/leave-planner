import React from 'react';
import { User, Mail, ShieldCheck, Settings, LogOut, FileText, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { getLeaveColor } from '../utils/colorUtils';

const ProfileModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  userName = 'User',
  quotas = { pl: 15, el: 10, rh: 1, wfh: 10 },
  leaveNames = {},
  leaveColors = {},
  onOpenSettings,
  onOpenBackup,
  onSignOut
}) => {
  if (!isOpen) return null;

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'LV';

  const isGoogle = currentUser?.app_metadata?.provider === 'google' || currentUser?.email?.includes('google');

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg animate-in fade-in duration-200" onClick={onClose} />

      {/* Profile Card */}
      <div className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border relative">
          <button onClick={onClose} className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors">
            <X size={16} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-lg shadow-primary/20 border-2 border-background">
              {initials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h3 className="text-lg font-black text-foreground truncate">{userName}</h3>
              <p className="text-xs text-muted-foreground truncate font-medium">{currentUser?.email || 'Guest Account'}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={10} /> {isGoogle ? 'Google Auth' : currentUser?.email ? 'Cloud Synced' : 'Guest Mode'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Summary Badges */}
        <div className="p-6 flex flex-col gap-4">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
            Active Annual Quotas
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: 'pl', defaultLabel: 'Planned Leave', defaultColor: 'blue' },
              { key: 'el', defaultLabel: 'Emergency Leave', defaultColor: 'orange' },
              { key: 'rh', defaultLabel: 'Extra Leave', defaultColor: 'green' },
              { key: 'wfh', defaultLabel: 'Monthly WFH', defaultColor: 'cyan' }
            ].map(item => {
              const label = leaveNames[item.key] || item.defaultLabel;
              const colorId = leaveColors[item.key] || item.defaultColor;
              const colorTheme = getLeaveColor(colorId);
              const totalVal = quotas[item.key] || 0;

              return (
                <div key={item.key} className="p-3 bg-muted/30 border border-border/60 rounded-2xl flex flex-col justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded border w-fit ${colorTheme.badge}`}>
                    {item.key.toUpperCase()}
                  </span>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-xs font-bold text-foreground truncate max-w-[90px]" title={label}>{label}</span>
                    <span className={`text-base font-black font-mono ${colorTheme.text}`}>{totalVal}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Menu */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              type="button"
              onClick={() => { onClose(); if (onOpenSettings) onOpenSettings(); }}
              className="w-full py-3 px-4 bg-muted/60 hover:bg-muted border border-border text-foreground rounded-2xl text-xs font-bold transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Settings size={15} className="text-primary" />
                <span>Edit Settings & Quotas</span>
              </div>
              <span className="text-muted-foreground">→</span>
            </button>

            <button
              type="button"
              onClick={() => { onClose(); if (onOpenBackup) onOpenBackup(); }}
              className="w-full py-3 px-4 bg-muted/60 hover:bg-muted border border-border text-foreground rounded-2xl text-xs font-bold transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-blue-500" />
                <span>Backup & Export Data</span>
              </div>
              <span className="text-muted-foreground">→</span>
            </button>
          </div>
        </div>

        {/* Footer Logout Button */}
        <div className="p-4 border-t border-border bg-muted/30 flex gap-3">
          <button
            type="button"
            onClick={() => { onClose(); if (onSignOut) onSignOut(); }}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <LogOut size={15} /> Sign Out / Logout
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
