import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, ShieldCheck, Settings, LogOut, FileText, X, Sparkles, CheckCircle2, RotateCw, Trash2, AlertTriangle } from 'lucide-react';
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
  onResetData,
  onDeleteAccount,
  onSignOut
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'LV';

  const isGoogle = currentUser?.app_metadata?.provider === 'google' || currentUser?.email?.includes('google');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.2 }} 
        className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
        onClick={onClose} 
      />

      {/* Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.96 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: 15, scale: 0.96 }} 
        transition={{ type: 'spring', damping: 26, stiffness: 340 }} 
        className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar"
      >
        
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

            {/* Reset All Data Button */}
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 px-4 bg-muted/60 hover:bg-muted border border-border text-foreground rounded-2xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <RotateCw size={15} className="text-amber-500" />
                  <span>Reset All Booked Leaves</span>
                </div>
                <span className="text-muted-foreground">→</span>
              </button>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-2 animate-in fade-in duration-200">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Reset all booked leave dates & plans?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetConfirm(false);
                      onClose();
                      if (onResetData) onResetData();
                    }}
                    className="flex-1 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Delete Account Button */}
            {showDeleteConfirm ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Trash2 size={14} /> Delete Account & Data
                  </span>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  This will permanently wipe your account and all booked leave dates. Type <strong className="text-foreground font-mono">DELETE</strong> below to confirm.
                </p>
                <input
                  type="text"
                  value={deleteInputText}
                  onChange={(e) => setDeleteInputText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
                <button
                  type="button"
                  disabled={deleteInputText.trim() !== 'DELETE'}
                  onClick={() => {
                    onClose();
                    if (onDeleteAccount) onDeleteAccount();
                  }}
                  className="w-full py-2.5 bg-red-600 text-white font-black text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  Permanently Delete Account
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 px-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={15} />
                  <span>Delete Account & Data</span>
                </div>
                <span>→</span>
              </button>
            )}

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

      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
