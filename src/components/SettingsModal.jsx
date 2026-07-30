import React, { useState } from 'react';
import { Settings, X, Save, FileText, CheckCircle2, User, SlidersHorizontal, LogIn, LogOut } from 'lucide-react';
import AppleWheelPicker from './AppleWheelPicker';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  userName = 'User', 
  quotas = { pl: 15, el: 10, rh: 1, wfh: 10 },
  leaveNames = { pl: 'Planned Leave', el: 'Emergency Leave', rh: 'Extra Leave', wfh: 'Work From Home' },
  leaveColors = { pl: 'blue', el: 'orange', rh: 'green', wfh: 'cyan' },
  onSaveSettings,
  onOpenBackupModal,
  currentUser = null,
  onOpenAuthModal,
  onSignOut
}) => {
  const [name, setName] = useState(userName);
  const [currentQuotas, setCurrentQuotas] = useState({ ...quotas });
  const [currentNames, setCurrentNames] = useState({ ...leaveNames });
  const [currentColors, setCurrentColors] = useState({ ...leaveColors });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSaveSettings) {
      onSaveSettings({
        name: name.trim() || 'User',
        quotas: currentQuotas,
        names: currentNames,
        colors: currentColors
      });
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-card w-full max-w-4xl mx-auto rounded-[32px] border border-border shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/40 flex justify-between items-center sticky top-0 bg-card/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-inner">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Settings & Quotas</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Configure annual leave limits, category names & theme colors</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 no-scrollbar">
          
          {/* Saved Toast */}
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 size={16} /> Settings Saved Successfully!
            </div>
          )}

          {/* User Name & Account Section */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex-1 flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                <User size={14} className="text-primary" /> Profile Display Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-card border border-border rounded-2xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                placeholder="Display Name..."
              />
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex-1 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-mono block mb-0.5">
                  Account Sync
                </span>
                <span className="text-xs font-bold text-foreground truncate max-w-[160px] block">
                  {currentUser?.email || (currentUser?.id ? userName : 'Offline Guest')}
                </span>
              </div>
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => { onClose(); if (onSignOut) onSignOut(); }}
                  className="px-3.5 py-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <LogOut size={13} /> Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { onClose(); if (onOpenAuthModal) onOpenAuthModal(); }}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                >
                  <LogIn size={13} /> Sign In
                </button>
              )}
            </div>
          </div>

          {/* Leave Quotas, Colors & Naming Section (4 Horizontal Columns) */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5 px-1">
              <SlidersHorizontal size={14} className="text-cyan-500" /> Leave Quotas, Colors & Category Names
            </span>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* PL Tumbler */}
              <AppleWheelPicker
                code="PL"
                label="Privileged Leave"
                value={currentQuotas.pl}
                onChange={(val) => setCurrentQuotas(q => ({ ...q, pl: val }))}
                min={0} max={30}
                customName={currentNames.pl}
                onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, pl: val }))}
                color={currentColors.pl}
                onColorChange={(val) => setCurrentColors(c => ({ ...c, pl: val }))}
              />

              {/* EL Tumbler */}
              <AppleWheelPicker
                code="EL"
                label="Emergency Leave"
                value={currentQuotas.el}
                onChange={(val) => setCurrentQuotas(q => ({ ...q, el: val }))}
                min={0} max={20}
                customName={currentNames.el}
                onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, el: val }))}
                color={currentColors.el}
                onColorChange={(val) => setCurrentColors(c => ({ ...c, el: val }))}
              />

              {/* RH Tumbler */}
              <AppleWheelPicker
                code="RH"
                label="Extra Leave"
                value={currentQuotas.rh}
                onChange={(val) => setCurrentQuotas(q => ({ ...q, rh: val }))}
                min={0} max={10}
                customName={currentNames.rh}
                onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, rh: val }))}
                color={currentColors.rh}
                onColorChange={(val) => setCurrentColors(c => ({ ...c, rh: val }))}
              />

              {/* WFH Tumbler */}
              <AppleWheelPicker
                code="WFH"
                label="Monthly WFH"
                value={currentQuotas.wfh}
                onChange={(val) => setCurrentQuotas(q => ({ ...q, wfh: val }))}
                min={0} max={20}
                customName={currentNames.wfh}
                onCustomNameChange={(val) => setCurrentNames(n => ({ ...n, wfh: val }))}
                color={currentColors.wfh}
                onColorChange={(val) => setCurrentColors(c => ({ ...c, wfh: val }))}
              />

            </div>
          </div>

          {/* Backup & Export Quick Action */}
          <div className="bg-muted/30 border border-border/60 rounded-3xl p-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Data Backup & Export</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Export JSON backups or CSV spreadsheets</p>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); if (onOpenBackupModal) onOpenBackupModal(); }}
              className="px-4 py-2.5 bg-card border border-border text-foreground hover:bg-muted rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <FileText size={14} /> Open Backup
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-muted border border-border text-muted-foreground hover:text-foreground font-bold text-xs rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto"
          >
            <Save size={14} /> Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
