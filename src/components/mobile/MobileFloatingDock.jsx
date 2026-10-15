import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileLeaveDetailSheet from './MobileLeaveDetailSheet';
import MobileProfileSheet from './MobileProfileSheet';
import MobileSettingsSheet from './MobileSettingsSheet';
import MobileMenuSheet from './MobileMenuSheet';
import MobileLeaveBookingSheet from './MobileLeaveBookingSheet';
import MobileSelectionBar from './MobileSelectionBar';
import MobileBottomNav from './MobileBottomNav';
import { AiAssistantChatContent } from '../AiAssistantModal';

export default function MobileFloatingDock({
  // Open states
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  mobileConfirmOpen,
  setMobileConfirmOpen,
  viewingLeave,
  setViewingLeave,
  isMobileAiOpen,
  setIsMobileAiOpen,
  mobileAiMode = 'compact',
  setMobileAiMode,
  mobileSubView = null,
  setMobileSubView,
  mobileSettingsTab = 'quotas',
  setMobileSettingsTab,
  mobileMenuTierTab = 'annual',
  setMobileMenuTierTab,
  mobileModalTierTab = 'annual',
  setMobileModalTierTab,
  
  // Selection & Dates
  selectionStart,
  setSelectionStart,
  previewDates = [],
  setPreviewDates,
  isAiPreview = false,
  bookedDates = [],
  leaves = {},
  leavePlans = [],
  leaveConfigs = [],
  currentHolidays = [],
  holidays = [],
  
  // User & Brand
  userName = '',
  companyName = '',
  effectiveCompanyLogo = null,
  effectiveAvatar = null,
  userInitials = 'U',
  currentUser = null,
  isStandaloneApp = false,
  theme = 'system',
  setTheme,
  calendarStyle = 'default',
  
  // Booking confirmation
  mobileTickerData = null,
  onTickerComplete,
  mobilePlanName = '',
  setMobilePlanName,
  mobileLeavesNeeded = 0,
  isAnnualBankDepleted = false,
  totalAnnualBankRemaining = 0,
  lopUsedThisYear = 0,
  mobileLeaveType = 'pl',
  setMobileLeaveType,
  allowsHalfDayMobile = true,
  mobileDuration = 1,
  setMobileDuration,
  selectedMobileBal = 0,
  mobileNote = '',
  setMobileNote,
  onApplyBooking,
  
  // Leave actions
  onRemoveLeave,
  onDeleteLeavePlan,
  onAddLeave,
  onRefreshData,
  
  // Settings & Profile callbacks
  quotas = {},
  leaveNames = {},
  leaveColors = {},
  wfhPromptHour = '12',
  setWfhPromptHour,
  attendanceCatchupMode = 'multi_day',
  setAttendanceCatchupMode,
  onSaveSettings,
  onStartTutorial,
  onResetData,
  onOpenAuth,
  onOpenInstallModal,
  onSignOut,
  
  // Nav callbacks
  activeTab = 'calendar',
  setActiveTab,
  scrollToTop,
  annualTrackerEntries = [],
  specialTrackerEntries = [],
  remoteTrackerEntry = null,
  isLopActive = false,
  
  // AI Callbacks
  onExecuteAiAction,
  onPreviewAiRange,
  
  // Tutorial
  isTutorialActive = false,
  tutorialStepIndex = 0,
  setTutorialStepIndex
}) {
  const getTodayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const isExpandedDock = isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null || (isMobileAiOpen && mobileAiMode === 'expanded');
  const isCompactAi = isMobileAiOpen && mobileAiMode === 'compact';
  const isSelectionActive = (selectionStart !== null || previewDates.length > 0) && !isAiPreview;

  return (
    <>
      {/* Mobile Drawer Backdrop overlay */}
      <AnimatePresence>
        {(isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null || (isMobileAiOpen && mobileAiMode === 'expanded')) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-[40]"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setMobileConfirmOpen(false);
              setViewingLeave(null);
              if (isMobileAiOpen && setMobileAiMode) setMobileAiMode('compact');
            }}
          />
        )}
      </AnimatePresence>

      <div 
        style={{
          bottom: (isMobileMenuOpen || mobileConfirmOpen || viewingLeave !== null || isMobileAiOpen)
            ? 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
            : 'max(1.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)))'
        }}
        className="md:hidden fixed left-0 right-0 z-[50] flex justify-center px-3 sm:px-4 pointer-events-none"
      >
        <motion.div
          id="mobile-floating-dock"
          layout="size"
          style={{ transformOrigin: 'bottom center' }}
          transition={{ layout: { duration: 0.26, ease: [0.32, 0.72, 0, 1] } }}
          className={`pointer-events-auto overflow-hidden border border-border/80 backdrop-blur-2xl origin-bottom transition-[border-radius,background-color,box-shadow,width,max-width] duration-200 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] ${
            isExpandedDock
              ? 'w-full rounded-[28px] bg-card/95 dark:bg-card/95 flex flex-col'
              : isCompactAi
                ? 'w-full max-w-md rounded-[28px] bg-card/95 dark:bg-card/95 flex flex-col shadow-2xl'
                : isSelectionActive
                  ? 'w-full rounded-[28px] bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 shadow-2xl'
                  : 'w-full max-w-sm rounded-[28px] bg-card/95 dark:bg-card/95'
          }`}
        >
          <AnimatePresence mode="wait">
            {/* ── 1. EXISTING LEAVE DETAIL STATE ── */}
            {viewingLeave && !isMobileMenuOpen && (
              <MobileLeaveDetailSheet
                leaveObj={viewingLeave}
                onClose={() => setViewingLeave(null)}
                onCancelLeave={async (date) => {
                  if (onRemoveLeave) await onRemoveLeave(date);
                  setViewingLeave(null);
                }}
                onCancelPlan={async (planId) => {
                  if (onDeleteLeavePlan) await onDeleteLeavePlan(planId);
                  setViewingLeave(null);
                }}
                onConvertToOffice={async (date) => {
                  if (onRemoveLeave) await onRemoveLeave(date);
                  if (onAddLeave) await onAddLeave(date, 'office');
                  setViewingLeave(null);
                }}
                onConvertToWfh={async (date) => {
                  if (onRemoveLeave) await onRemoveLeave(date);
                  if (onAddLeave) await onAddLeave(date, 'wfh');
                  setViewingLeave(null);
                }}
                onConvertToLeave={async (date) => {
                  if (onRemoveLeave) await onRemoveLeave(date);
                  setViewingLeave(null);
                  setSelectionStart(date);
                  setPreviewDates([date]);
                  setMobileConfirmOpen(true);
                }}
                leaves={leaves}
                leaveColors={leaveColors}
                leaveNames={leaveNames}
                bookedDates={bookedDates}
                maxWfh={10}
                calendarStyle={calendarStyle}
              />
            )}

            {/* ── 2. MENU STATE (Profile / Settings / Balances) ── */}
            {isMobileMenuOpen && (
              <motion.div 
                key="menu"
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                style={{ transformOrigin: 'bottom center' }}
                className={`${mobileSubView ? 'h-[min(90dvh,calc(100dvh-1.5rem-env(safe-area-inset-bottom,0px)))]' : 'max-h-[min(88dvh,calc(100dvh-2.5rem-env(safe-area-inset-bottom,0px)))]'} flex flex-col overflow-hidden origin-bottom`}
              >
                {/* Pull Handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                <AnimatePresence mode="wait">
                  {mobileSubView === 'profile' ? (
                    <MobileProfileSheet
                      onClose={() => { setIsMobileMenuOpen(false); setMobileSubView(null); }}
                      onBack={() => setMobileSubView(null)}
                      userName={userName}
                      companyName={companyName}
                      avatarUrl={effectiveAvatar}
                      currentUser={currentUser}
                      userInitials={userInitials}
                      leaves={leaves}
                      leaveNames={leaveNames}
                      leaveColors={leaveColors}
                      onSaveProfile={({ name, companyName, avatarUrl }) => onSaveSettings({ name, companyName, avatarUrl })}
                      onStartTutorial={() => {
                        setMobileSubView(null);
                        setIsMobileMenuOpen(false);
                        if (onStartTutorial) onStartTutorial();
                      }}
                      onResetData={() => {
                        setMobileSubView(null);
                        setIsMobileMenuOpen(false);
                        if (onResetData) onResetData();
                      }}
                      onOpenAuth={() => {
                        setIsMobileMenuOpen(false);
                        if (onOpenAuth) onOpenAuth();
                      }}
                    />
                  ) : mobileSubView === 'settings' ? (
                    <MobileSettingsSheet
                      onClose={() => { setIsMobileMenuOpen(false); setMobileSubView(null); }}
                      onBack={() => setMobileSubView(null)}
                      initialTab={mobileSettingsTab}
                      leaveConfigs={leaveConfigs}
                      quotas={quotas}
                      leaveNames={leaveNames}
                      leaveColors={leaveColors}
                      wfhPromptHour={wfhPromptHour}
                      setWfhPromptHour={setWfhPromptHour}
                      attendanceCatchupMode={attendanceCatchupMode}
                      setAttendanceCatchupMode={setAttendanceCatchupMode}
                      currentHolidays={holidays}
                      currentUser={currentUser}
                      userName={userName}
                      companyName={companyName}
                      onSaveSettings={onSaveSettings}
                      onRefreshData={onRefreshData}
                    />
                  ) : (
                    <MobileMenuSheet
                      onClose={() => setIsMobileMenuOpen(false)}
                      userName={userName}
                      companyName={companyName}
                      effectiveCompanyLogo={effectiveCompanyLogo}
                      effectiveAvatar={effectiveAvatar}
                      userInitials={userInitials}
                      currentUser={currentUser}
                      isStandaloneApp={isStandaloneApp}
                      onOpenProfile={() => setMobileSubView('profile')}
                      onOpenSettings={() => { setMobileSubView('settings'); setMobileSettingsTab('quotas'); }}
                      onOpenInstallModal={() => { setIsMobileMenuOpen(false); if (onOpenInstallModal) onOpenInstallModal(); }}
                      mobileMenuTierTab={mobileMenuTierTab}
                      setMobileMenuTierTab={setMobileMenuTierTab}
                      annualTrackerEntries={annualTrackerEntries}
                      specialTrackerEntries={specialTrackerEntries}
                      remoteTrackerEntry={remoteTrackerEntry}
                      isLopActive={isLopActive}
                      lopUsedThisYear={lopUsedThisYear}
                      theme={theme}
                      setTheme={setTheme}
                      onSignOut={onSignOut}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── 3. CONFIRM LEAVE BOOKING STATE ── */}
            {mobileConfirmOpen && !isMobileMenuOpen && viewingLeave === null && (
              <MobileLeaveBookingSheet
                onClose={() => setMobileConfirmOpen(false)}
                mobileTickerData={mobileTickerData}
                onTickerComplete={onTickerComplete}
                mobilePlanName={mobilePlanName}
                setMobilePlanName={setMobilePlanName}
                mobileLeavesNeeded={mobileLeavesNeeded}
                previewDates={previewDates}
                leaveConfigs={leaveConfigs}
                isAnnualBankDepleted={isAnnualBankDepleted}
                totalAnnualBankRemaining={totalAnnualBankRemaining}
                lopUsedThisYear={lopUsedThisYear}
                bookedDates={bookedDates}
                leaves={leaves}
                mobileLeaveType={mobileLeaveType}
                setMobileLeaveType={setMobileLeaveType}
                mobileModalTierTab={mobileModalTierTab}
                setMobileModalTierTab={setMobileModalTierTab}
                isTutorialActive={isTutorialActive}
                tutorialStepIndex={tutorialStepIndex}
                setTutorialStepIndex={setTutorialStepIndex}
                allowsHalfDayMobile={allowsHalfDayMobile}
                mobileDuration={mobileDuration}
                setMobileDuration={setMobileDuration}
                selectedMobileBal={selectedMobileBal}
                mobileNote={mobileNote}
                setMobileNote={setMobileNote}
                onApply={onApplyBooking}
              />
            )}

            {/* ── 4. SELECTION BAR (dates highlighted on calendar) ── */}
            {!isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && isSelectionActive && (
              <MobileSelectionBar
                selectionStart={selectionStart}
                previewDates={previewDates}
                onCancel={() => {
                  setSelectionStart(null);
                  setPreviewDates([]);
                }}
                onApplySingleDay={() => {
                  setPreviewDates([selectionStart]);
                  setMobileConfirmOpen(true);
                }}
                onConfirmRange={() => {
                  setMobileConfirmOpen(true);
                  if (isTutorialActive && tutorialStepIndex === 3 && setTutorialStepIndex) {
                    setTutorialStepIndex(4);
                  }
                }}
              />
            )}

            {/* ── 5. AI AMBIENT CHATBAR DOCK STATE ── */}
            {isMobileAiOpen && !isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && (
              <motion.div
                key="mobile-ai-dock"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                style={{ transformOrigin: 'bottom center' }}
                className={`flex flex-col overflow-hidden rounded-[28px] transition-all duration-300 shadow-2xl border border-white/10 origin-bottom ${
                  mobileAiMode === 'compact' ? 'h-[50vh] max-h-[50vh]' : 'h-[85vh] max-h-[88vh]'
                }`}
              >
                <AiAssistantChatContent
                  onClose={() => {
                    setIsMobileAiOpen(false);
                    if (setMobileAiMode) setMobileAiMode('compact');
                  }}
                  context={{
                    leaves,
                    leaveNames,
                    leaveConfigs,
                    bookedDates,
                    leavePlans,
                    holidays: currentHolidays,
                    todayStr: getTodayStr()
                  }}
                  onExecuteAction={onExecuteAiAction}
                  onPreviewRange={onPreviewAiRange}
                  isMorphedDock={true}
                  isMobileChatbar={true}
                  mobileChatbarMode={mobileAiMode}
                  onToggleMobileExpand={() => {
                    if (setMobileAiMode) setMobileAiMode(m => m === 'compact' ? 'expanded' : 'compact');
                  }}
                  companyName={companyName}
                />
              </motion.div>
            )}

            {/* ── 6. DEFAULT MOBILE BOTTOM NAV ── */}
            {!isMobileMenuOpen && !mobileConfirmOpen && viewingLeave === null && !isMobileAiOpen && !isSelectionActive && (
              <MobileBottomNav
                leaves={leaves}
                bookedDates={bookedDates}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                scrollToTop={scrollToTop}
                onOpenAi={() => setIsMobileAiOpen(true)}
                onOpenMenu={() => setIsMobileMenuOpen(true)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
