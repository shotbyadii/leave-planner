import React from 'react';
import { APP_CONFIG } from '../../constants/brand';
import { getCompanyInitials } from '../../utils/companyLogoUtils';
import ThemeSelector from '../ThemeSelector';

export default function MobileHeader({
  effectiveCompanyLogo,
  companyLogoError,
  setCompanyLogoError,
  companyName,
  userName,
  getTodayDate,
  theme,
  setTheme,
  effectiveAvatar,
  userInitials,
  onOpenProfile
}) {
  const today = getTodayDate ? getTodayDate() : new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = userName ? userName.trim().split(' ')[0] : '';
  const greetingText = `${greeting}${firstName ? ', ' + firstName : ''}`;

  return (
    <header className="md:hidden flex px-4 py-3 justify-between items-center bg-background/95 backdrop-blur-md border-b border-border/80">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {effectiveCompanyLogo && !companyLogoError ? (
          <img 
            src={effectiveCompanyLogo} 
            alt={companyName || 'Company Logo'} 
            className="w-9 h-9 rounded-xl object-contain border border-border bg-card p-1 shadow-sm flex-shrink-0" 
            onError={() => setCompanyLogoError?.(true)}
          />
        ) : companyName ? (
          <div className="bg-primary text-primary-foreground rounded-xl w-9 h-9 flex items-center justify-center font-black text-xs shadow-md shadow-primary/20 flex-shrink-0 font-mono">
            {getCompanyInitials(companyName)}
          </div>
        ) : (
          <img 
            src={APP_CONFIG.logo} 
            alt={APP_CONFIG.name} 
            className="w-9 h-9 rounded-xl object-contain border border-border bg-card p-1 shadow-sm flex-shrink-0" 
          />
        )}
        
        <div className="flex flex-col leading-tight min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest truncate">
              {companyName || APP_CONFIG.name}
            </span>
            <span className="text-[10px] text-muted-foreground/60">•</span>
            <span className="text-[10px] font-bold font-mono text-muted-foreground/80 whitespace-nowrap">
              {today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-snug truncate">
            {greetingText}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <ThemeSelector theme={theme} setTheme={setTheme} />

        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 bg-card hover:bg-muted border border-border/80 rounded-2xl pl-1 pr-2.5 py-1 transition-all active:scale-95 shadow-sm flex-shrink-0 cursor-pointer"
          title="My Profile & Account"
        >
          {effectiveAvatar ? (
            <img src={effectiveAvatar} alt={userName} className="w-6 h-6 rounded-full object-cover border border-primary/30 flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center font-mono flex-shrink-0">
              {userInitials}
            </div>
          )}
          <span className="text-xs font-bold text-foreground truncate max-w-[64px]">
            {userName ? userName.trim().split(' ')[0] : 'User'}
          </span>
        </button>
      </div>
    </header>
  );
}
