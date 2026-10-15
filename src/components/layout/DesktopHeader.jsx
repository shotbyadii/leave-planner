import React from 'react';
import { Calendar as CalendarIcon, ListTodo, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_CONFIG } from '../../constants/brand';
import { getCompanyInitials } from '../../utils/companyLogoUtils';
import { getLeaveColor, getShortform } from '../../utils/colorUtils';
import SegmentedPolicyTabs from '../SegmentedPolicyTabs';
import ThemeSelector from '../ThemeSelector';

export default function DesktopHeader({
  companyName,
  effectiveCompanyLogo,
  companyLogoError,
  setCompanyLogoError,
  userName,
  effectiveAvatar,
  userInitials,
  getTodayDate,
  annualTrackerEntries = [],
  specialTrackerEntries = [],
  remoteTrackerEntry = { remaining: 0 },
  isLopActive = false,
  lopUsedThisYear = 0,
  topbarTierTab = 'annual',
  setTopbarTierTab,
  activeTab = 'calendar',
  setActiveTab,
  bookedDatesCount = 0,
  currentUser,
  onOpenSettings,
  onOpenAuth,
  onSignOut,
  theme,
  setTheme
}) {
  const today = getTodayDate ? getTodayDate() : new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = userName ? userName.trim().split(' ')[0] : '';
  const greetingText = `${greeting}${firstName ? ', ' + firstName : ''}`;

  return (
    <>
      {/* Desktop Top Bar */}
      <header className="hidden md:flex px-6 py-2.5 justify-between items-center gap-6">
        {/* Desktop Top Bar Left Branding */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          {effectiveCompanyLogo && !companyLogoError ? (
            <img 
              src={effectiveCompanyLogo} 
              alt={companyName || 'Company Logo'} 
              className="w-8 h-8 rounded-lg object-contain border border-border bg-card p-1 shadow-sm" 
              onError={() => setCompanyLogoError?.(true)}
            />
          ) : companyName ? (
            <div className="bg-primary text-primary-foreground rounded-lg p-1.5 w-8 h-8 flex items-center justify-center font-black text-xs shadow-md font-mono">
              {getCompanyInitials(companyName)}
            </div>
          ) : (
            <img 
              src={APP_CONFIG.logo} 
              alt={APP_CONFIG.name} 
              className="w-8 h-8 rounded-lg object-contain border border-border bg-card p-1 shadow-sm flex-shrink-0" 
            />
          )}
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">
                {companyName || APP_CONFIG.name}
              </span>
              <span className="text-[10px] text-muted-foreground/60">•</span>
              <span className="text-[10px] font-bold font-mono text-muted-foreground/80">
                {today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight leading-snug">
              {greetingText}
            </span>
          </div>
        </div>

        {/* Redesigned Compact Desktop Tracker (Stacked: Fixed Tab Selector on Top, Leave Bars Below) */}
        <div className="hidden lg:flex flex-col items-end gap-1.5 flex-1 min-w-0 justify-center">
          <SegmentedPolicyTabs
            tabs={[
              { 
                id: 'annual', 
                label: 'Annual', 
                count: annualTrackerEntries.reduce((s, e) => s + (typeof e.remaining === 'number' ? e.remaining : parseFloat(e.remaining) || 0), 0) 
              },
              ...(specialTrackerEntries.length > 0 ? [{ 
                id: 'special', 
                label: 'Special', 
                count: specialTrackerEntries.length 
              }] : []),
              { 
                id: 'remote', 
                label: 'Remote', 
                count: remoteTrackerEntry.remaining 
              }
            ]}
            activeTab={topbarTierTab}
            onChange={setTopbarTierTab}
            layoutId="desktop-topbar-tier-pill"
            size="xs"
            className="w-auto p-0.5"
          />

          {/* Active Tier Leave Bars Row Below */}
          <div className="flex items-center gap-1.5 justify-end">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={topbarTierTab}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="flex items-center gap-1.5 flex-shrink-0"
              >
                {(topbarTierTab === 'annual' 
                  ? annualTrackerEntries 
                  : topbarTierTab === 'special' 
                    ? specialTrackerEntries 
                    : [remoteTrackerEntry]
                ).map(item => {
                  const colorObj = getLeaveColor(item.color || 'blue');
                  const pct = item.total > 0 ? (item.remaining / item.total) * 100 : 0;
                  return (
                    <div
                      key={item.id}
                      data-surface="topbar-tracker"
                      data-leave-id={item.id}
                      className="flex flex-col justify-center gap-1 bg-muted/40 hover:bg-muted/70 border border-border/80 px-2.5 py-1 rounded-xl transition-all shadow-2xs group flex-shrink-0 select-none cursor-default min-w-[76px]"
                      title={`${item.name}: ${item.used} used, ${item.remaining} left`}
                    >
                      <div className="flex items-center justify-between gap-2 leading-none">
                        <div className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${colorObj.bg} flex-shrink-0`} />
                          <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover:text-foreground uppercase transition-colors">
                            {item.shortCode}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-0.5 font-mono leading-none">
                          <span className="text-xs font-black text-foreground">{item.remaining}</span>
                          <span className="text-[9px] text-muted-foreground font-semibold">/{item.total}</span>
                          {item.cadence && (
                            <span className="text-[8px] font-mono text-muted-foreground/60 uppercase ml-0.5">
                              {item.cadence === 'month' ? 'mo' : 'yr'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-1 w-full bg-muted/90 dark:bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${colorObj.bg}`}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {topbarTierTab === 'annual' && isLopActive && (
                  <div
                    data-surface="topbar-tracker"
                    data-leave-id="lop"
                    className="flex flex-col justify-center gap-1 bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-500/30 px-2.5 py-1 rounded-xl transition-all shadow-2xs group flex-shrink-0 select-none cursor-default min-w-[76px]"
                    title={`Unpaid Leave (LOP): ${lopUsedThisYear} days taken this year (Loss of Pay)`}
                  >
                    <div className="flex items-center justify-between gap-2 leading-none">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 flex-shrink-0" />
                        <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 group-hover:text-foreground uppercase transition-colors">
                          LOP
                        </span>
                      </div>
                      <div className="flex items-baseline gap-0.5 font-mono leading-none">
                        <span className="text-xs font-black text-foreground">{lopUsedThisYear}</span>
                        <span className="text-[9px] text-muted-foreground font-semibold">taken</span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-muted/90 dark:bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-zinc-500 w-full" />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Desktop Tabs */}
      <div className="hidden md:block px-6">
        <div className="flex justify-between items-center whitespace-nowrap hide-scrollbar border-b border-border/40">
          <div className="flex gap-6 items-center">
            <button 
              className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'calendar' ? 'border-foreground text-foreground font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`} 
              onClick={() => setActiveTab('calendar')}
            >
              <CalendarIcon size={15} /> Calendar
            </button>
            <button 
              className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'tracker' ? 'border-foreground text-foreground font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`} 
              onClick={() => setActiveTab('tracker')}
            >
              <ListTodo size={15} /> Leave Tracker
              <span className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono font-bold">{bookedDatesCount}</span>
            </button>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3 py-1 relative z-[60]">
            <button 
              type="button"
              onClick={() => currentUser ? onOpenSettings?.() : onOpenAuth?.()} 
              title="Settings & Profile Hub"
              className="flex items-center gap-2 bg-muted/60 hover:bg-muted border border-border/80 rounded-full p-1 pr-3 text-xs font-bold text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            >
              {effectiveAvatar ? (
                <img src={effectiveAvatar} alt={userName} className="w-6 h-6 rounded-full object-cover border border-primary/20 flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm font-mono">
                  {userInitials}
                </div>
              )}
              <span className="font-bold text-xs">{userName}</span>
            </button>

            <button
              type="button"
              data-capability="sign-out"
              onClick={onSignOut}
              title="Sign Out"
              className="flex p-2 rounded-full bg-muted/60 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground border border-border/80 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
            </button>

            <ThemeSelector theme={theme} setTheme={setTheme} />
          </div>
        </div>
      </div>
    </>
  );
}
