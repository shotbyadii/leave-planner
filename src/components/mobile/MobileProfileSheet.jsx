import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, X, Camera, CheckCircle2, Play, RotateCw, User, Save } from 'lucide-react';
import CompanyInput from '../CompanyInput';
import { getShortform, getLeaveColor } from '../../utils/colorUtils';

export default function MobileProfileSheet({
  onClose,
  onBack,
  userName = '',
  companyName = '',
  avatarUrl = null,
  currentUser = null,
  userInitials = 'U',
  leaves = {},
  leaveNames = {},
  leaveColors = {},
  onSaveProfile,
  onStartTutorial,
  onResetData,
  onOpenAuth
}) {
  const [mobileFormName, setMobileFormName] = useState(userName);
  const [mobileFormCompany, setMobileFormCompany] = useState(companyName);
  const [mobileFormAvatar, setMobileFormAvatar] = useState(avatarUrl);
  const [mobileToast, setMobileToast] = useState('');
  const mobileAvatarFileRef = useRef(null);

  const handleMobileAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setMobileFormAvatar(uploadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      key="mobile-profile" 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 12 }} 
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }} 
      style={{ transformOrigin: 'bottom center' }}
      className="flex flex-col flex-1 min-h-0 overflow-hidden origin-bottom"
    >
      {/* Pinned Header */}
      <div className="flex items-center justify-between px-4 pt-1 pb-2 border-b border-border flex-shrink-0">
        <button 
          onClick={onBack} 
          className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          title="Back to menu"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-xs font-black uppercase tracking-wider text-foreground font-mono text-center flex-1 truncate px-2">My Profile & Account</span>
        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-4 no-scrollbar overscroll-contain">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center p-5 bg-muted/30 border border-border/80 rounded-2xl relative">
          <div className="relative mb-2">
            {mobileFormAvatar ? (
              <img src={mobileFormAvatar} alt={userName} className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground font-black text-2xl flex items-center justify-center shadow-xl shadow-primary/20 border-4 border-primary/30">
                {userInitials}
              </div>
            )}

            {/* Camera Overlay Badge Button */}
            <button 
              type="button" 
              onClick={() => mobileAvatarFileRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-background cursor-pointer"
              title="Upload photo from device"
            >
              <Camera size={14} />
            </button>
            <input 
              type="file" 
              ref={mobileAvatarFileRef} 
              accept="image/*" 
              onChange={handleMobileAvatarUpload} 
              className="hidden" 
            />
          </div>

          <h3 className="text-base font-black text-foreground mt-1">{userName}</h3>
          <p className="text-xs text-muted-foreground font-medium">{currentUser?.email || 'Guest Profile'}</p>
          <span className="mt-2 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
            <CheckCircle2 size={10} /> {currentUser ? 'Cloud Synced' : 'Guest Account'}
          </span>
        </div>

        {/* Form Inputs */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Full Display Name</label>
            <input 
              type="text" 
              value={mobileFormName} 
              onChange={(e) => setMobileFormName(e.target.value)} 
              className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Company / Workspace</label>
            <CompanyInput 
              value={mobileFormCompany} 
              onChange={(val) => setMobileFormCompany(val)} 
              placeholder="e.g. Nykaa, nykaa.com, Google..."
            />
            <p className="text-[10px] text-muted-foreground font-medium">
              Type name or domain (e.g. Nykaa, nykaa.com) to fetch brand icon.
            </p>
          </div>
        </div>

        {/* Quotas Summary Grid */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Annual Quotas</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.pl || 'blue').text}`}>{getShortform(leaveNames.pl, 'PL')}</span>
              <span className="text-sm font-black font-mono">{leaves.pl?.total ?? 15} d</span>
            </div>
            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.el || 'orange').text}`}>{getShortform(leaveNames.el, 'EL')}</span>
              <span className="text-sm font-black font-mono">{leaves.el?.total ?? 10} d</span>
            </div>
            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.rh || 'green').text}`}>{getShortform(leaveNames.rh, 'RH')}</span>
              <span className="text-sm font-black font-mono">{leaves.rh?.total ?? 1} d</span>
            </div>
            <div className="p-2.5 bg-card border border-border rounded-xl flex justify-between items-center">
              <span className={`text-xs font-bold font-mono ${getLeaveColor(leaveColors.wfh || 'cyan').text}`}>{getShortform(leaveNames.wfh, 'WFH')}</span>
              <span className="text-sm font-black font-mono">{parseInt(localStorage.getItem('quota_wfh')||'10', 10)} /mo</span>
            </div>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-col gap-2">
          <button 
            type="button" 
            onClick={() => {
              if (onStartTutorial) onStartTutorial();
            }}
            className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play size={14} className="fill-amber-500/40" /> Launch Interactive Tour (Walkthrough)
          </button>

          <button 
            type="button" 
            onClick={() => {
              if (onResetData) onResetData();
            }}
            className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw size={14} /> Reset All Data
          </button>

          {!currentUser && (
            <button 
              type="button" 
              onClick={() => {
                if (onOpenAuth) onOpenAuth();
              }}
              className="w-full py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <User size={14} /> Sign In or Create Account
            </button>
          )}
        </div>

        {/* Toast Message */}
        {mobileToast && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-500 text-center animate-in fade-in duration-200">
            {mobileToast}
          </div>
        )}
      </div>

      {/* Pinned Footer Action */}
      <div className="px-4 pt-2 pb-3 border-t border-border bg-card/95 backdrop-blur-md flex-shrink-0">
        <button 
          type="button" 
          onClick={async () => {
            if (onSaveProfile) {
              await onSaveProfile({ 
                name: mobileFormName, 
                companyName: mobileFormCompany, 
                avatarUrl: mobileFormAvatar 
              });
            }
            setMobileToast('Profile Saved!');
            setTimeout(() => {
              setMobileToast('');
              onBack();
            }, 500);
          }}
          className="w-full py-3 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Save size={14} /> Save Profile Changes
        </button>
      </div>
    </motion.div>
  );
}
