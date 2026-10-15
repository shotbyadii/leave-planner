import React from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Download, ChevronRight, CheckCircle2, LogOut } from 'lucide-react';
import SegmentedPolicyTabs, { MorphingTabContent } from '../SegmentedPolicyTabs';
import ThemeSelector from '../ThemeSelector';
import { getCompanyInitials } from '../../utils/companyLogoUtils';
import { getLeaveColor } from '../../utils/colorUtils';
import { getSpecialBenefitIcon } from '../../utils/specialBenefitUtils';
import { APP_CONFIG } from '../../constants/brand';

export default function MobileMenuSheet({
  onClose,
  userName = '',
  companyName = '',
  effectiveCompanyLogo = null,
  effectiveAvatar = null,
  userInitials = 'U',
  currentUser = null,
  isStandaloneApp = false,
  onOpenProfile,
  onOpenSettings,
  onOpenInstallModal,
  mobileMenuTierTab = 'annual',
  setMobileMenuTierTab,
  annualTrackerEntries = [],
  specialTrackerEntries = [],
  remoteTrackerEntry = null,
  isLopActive = false,
  lopUsedThisYear = 0,
  theme = 'system',
  setTheme,
  onSignOut
}) {
  return (
    <motion.div 
      key="mobile-main-menu"
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 12 }} 
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      style={{ transformOrigin: 'bottom center' }}
      className="flex flex-col flex-1 min-h-0 overflow-hidden origin-bottom"
    >
      {/* Header row */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          {effectiveCompanyLogo ? (
            <img 
              src={effectiveCompanyLogo} 
              alt={companyName || 'Company Logo'} 
              className="w-8 h-8 rounded-xl object-contain border border-border bg-card p-0.5 shadow-sm flex-shrink-0" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : companyName ? (
            <div className="bg-primary text-primary-foreground rounded-xl w-8 h-8 flex items-center justify-center font-black text-xs shadow-md flex-shrink-0 font-mono">
              {getCompanyInitials(companyName)}
            </div>
          ) : (
            <img 
              src={APP_CONFIG.logo} 
              alt={APP_CONFIG.name} 
              className="w-8 h-8 rounded-xl object-contain border border-border bg-card p-0.5 shadow-sm flex-shrink-0" 
            />
          )}
          <div className="flex flex-col leading-none">
            <span className="font-bold font-mono text-sm text-foreground">{userName}</span>
            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{currentUser?.email || 'Guest Account'}</span>
          </div>
        </div>
        <button 
          data-testid="mobile-drawer-close"
          aria-label="Close"
          onClick={onClose} 
          className="p-1.5 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain flex flex-col">
        {/* Mobile Profile & Settings Quick Action Buttons + Install App CTA */}
        <div className="p-3 bg-muted/10 border-b border-border/60 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 p-2.5 bg-card hover:bg-muted/60 border border-border rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              {effectiveAvatar ? (
                <img src={effectiveAvatar} alt={userName} className="w-8 h-8 rounded-xl object-cover border border-primary/20 flex-shrink-0 shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {userInitials}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">My Profile</span>
                <span className="text-[9px] text-muted-foreground truncate">{currentUser ? 'Account Sync' : 'View Profile'}</span>
              </div>
            </button>

            <button 
              data-testid="mobile-settings-btn"
              onClick={onOpenSettings}
              className="flex items-center gap-2.5 p-2.5 bg-card hover:bg-muted/60 border border-border rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                <Settings size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">Settings</span>
                <span className="text-[9px] text-muted-foreground truncate">Quotas & Colors</span>
              </div>
            </button>
          </div>

          {/* Install Web App CTA in Mobile Menu */}
          {!isStandaloneApp ? (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 rounded-2xl transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                  <Download size={15} />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-black text-foreground tracking-tight flex items-center gap-1.5">
                    Install Web App
                    <span className="text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary rounded-full font-mono font-bold">Native</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">Add to home screen for fullscreen mode</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mr-1" />
            </button>
          ) : (
            <div className="flex items-center justify-between p-2 px-3 bg-card/60 border border-border/70 rounded-2xl text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                <CheckCircle2 size={13} /> App Installed
              </span>
              <span className="text-[10px] text-muted-foreground">Running as Native App</span>
            </div>
          )}
        </div>

        {/* Balances Card with Segmented Tabs */}
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Balances & Quotas
            </span>
            
            {/* Segmented Tier Tabs */}
            <SegmentedPolicyTabs
              tabs={[
                { id: 'annual', label: 'Annual' },
                ...(specialTrackerEntries.length > 0 ? [{ id: 'special', label: 'Special' }] : []),
                { id: 'remote', label: 'Remote' }
              ]}
              activeTab={mobileMenuTierTab}
              onChange={setMobileMenuTierTab}
              layoutId="mobile-drawer-tier-pill"
              className="w-auto p-0.5"
            />
          </div>

          {/* Morphing Tab Viewport */}
          <MorphingTabContent activeKey={mobileMenuTierTab}>
            {/* Tier 1: Annual Leave Bank */}
            {mobileMenuTierTab === 'annual' && (
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-card border border-border/80 rounded-2xl flex items-center justify-between text-xs font-mono shadow-2xs">
                  <span className="text-muted-foreground font-medium">Total Vacation Bank</span>
                  <span className="font-black text-foreground">
                    {annualTrackerEntries.reduce((s, e) => s + (typeof e.remaining === 'number' ? e.remaining : parseFloat(e.remaining) || 0), 0)}
                    <span className="text-muted-foreground font-normal"> / {annualTrackerEntries.reduce((s, e) => s + e.total, 0)} days</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {annualTrackerEntries.map((item) => {
                    const colorObj = getLeaveColor(item.color || 'blue');
                    const pct = item.total > 0 ? (item.remaining / item.total) * 100 : 0;
                    return (
                      <div 
                        key={item.id} 
                        data-surface="mobile-drawer-balances"
                        data-leave-id={item.id}
                        className="p-2.5 bg-card/60 border border-border/70 rounded-2xl flex flex-col gap-1.5 shadow-2xs"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${colorObj.bg} flex-shrink-0`} />
                            <span className="text-xs font-bold font-mono text-foreground truncate">
                              {item.name} <span className="text-muted-foreground">({item.shortCode})</span>
                            </span>
                          </div>
                          <span className="text-xs font-bold font-mono text-foreground flex-shrink-0">
                            {item.remaining}<span className="text-muted-foreground font-normal text-[10px]"> / {item.total}</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colorObj.bg}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                          <span>{item.used} used</span>
                          <span>{item.remaining} left</span>
                        </div>
                      </div>
                    );
                  })}
                  {isLopActive && (
                    <div 
                      data-surface="mobile-drawer-balances"
                      data-leave-id="lop"
                      className="p-2.5 bg-zinc-500/10 border border-zinc-500/25 rounded-2xl flex flex-col gap-1.5 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-zinc-500 flex-shrink-0" />
                          <span className="text-xs font-bold font-mono text-foreground truncate">
                            Unpaid Leave <span className="text-muted-foreground">(LOP)</span>
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-foreground flex-shrink-0">
                          {lopUsedThisYear}<span className="text-muted-foreground font-normal text-[10px]"> taken</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-zinc-500 w-full" />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Loss of Pay</span>
                        <span>Annual bank fallback</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tier 2: Special Benefits */}
            {mobileMenuTierTab === 'special' && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Independent company benefits that do not deduct from your annual vacation bank.
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {specialTrackerEntries.map((item) => {
                    const Icon = getSpecialBenefitIcon(item);
                    const colorObj = getLeaveColor(item.color || 'pink');
                    const pct = item.total > 0 ? (item.remaining / item.total) * 100 : 0;
                    return (
                      <div 
                        key={item.id} 
                        data-surface="mobile-drawer-balances"
                        data-leave-id={item.id}
                        className="p-2.5 bg-card/60 border border-border/70 rounded-2xl flex flex-col gap-1.5 shadow-2xs"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-6 h-6 rounded-lg ${colorObj.bg}/15 ${colorObj.text} flex items-center justify-center flex-shrink-0`}>
                              <Icon size={13} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-foreground truncate">{item.name}</span>
                              <span className="text-[9px] font-mono text-muted-foreground">
                                {item.cadence === 'month' ? 'Per Calendar Month' : item.cadence === 'year' ? 'Per Year' : 'Per Occurrence'}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-bold font-mono text-foreground flex-shrink-0">
                            {item.remaining}<span className="text-muted-foreground font-normal text-[10px]"> / {item.total}</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colorObj.bg}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                          <span>{item.used} used</span>
                          <span>{item.remaining} remaining</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier 3: Remote / WFH */}
            {mobileMenuTierTab === 'remote' && remoteTrackerEntry && (
              <div className="flex flex-col gap-2">
                {(() => {
                  const isWfhOverQuota = remoteTrackerEntry.used >= remoteTrackerEntry.total;
                  const wfhOverAmount = remoteTrackerEntry.used - remoteTrackerEntry.total;
                  const pct = Math.min(100, (remoteTrackerEntry.remaining / remoteTrackerEntry.total) * 100);

                  return (
                    <div 
                      data-surface="mobile-drawer-balances"
                      data-leave-id={remoteTrackerEntry.id}
                      className="p-3 bg-card border border-border/80 rounded-2xl flex flex-col gap-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-foreground">
                            {remoteTrackerEntry.name} <span className="text-muted-foreground">({remoteTrackerEntry.shortCode})</span>
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-foreground">
                          {remoteTrackerEntry.remaining}<span className="text-muted-foreground font-normal text-[10px]"> / {remoteTrackerEntry.total}</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isWfhOverQuota ? 'bg-red-500' : 'bg-cyan-400'}`} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">{remoteTrackerEntry.used} used this month</span>
                        <span className={isWfhOverQuota ? 'text-red-400 font-bold' : 'text-muted-foreground'}>
                          {isWfhOverQuota ? `+${wfhOverAmount}d over quota` : `${remoteTrackerEntry.remaining} days left`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </MorphingTabContent>
        </div>
      </div>

      {/* Pinned Action Footer */}
      <div className="px-4 pt-2.5 pb-3.5 border-t border-border bg-card/95 backdrop-blur-md flex gap-2.5 flex-shrink-0">
        <ThemeSelector theme={theme} setTheme={setTheme} direction="up" variant="full" />
        <button 
          data-capability="sign-out" 
          onClick={onSignOut} 
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold hover:bg-red-500/20 active:scale-98 transition-all cursor-pointer"
        >
          <LogOut size={15}/> <span>Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}
