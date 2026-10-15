import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCw, FlaskConical } from 'lucide-react';
import { isHoliday, isWeekend } from '../../data/holidays';
import { addLeave, createLeavePlan } from '../../services/leaveService';
import { markTutorialCompleted } from '../../services/tutorialService';
import LeaveSelectionBar from '../LeaveSelectionBar';
import WfhCheckinModal from '../WfhCheckinModal';
import NotificationPromptModal from '../NotificationPromptModal';
import InstallPromptModal from '../InstallPromptModal';
import SettingsModal from '../SettingsModal';
import AuthModal from '../AuthModal';
import ResetPasswordModal from '../ResetPasswordModal';
import SplashScreen from '../SplashScreen';
import OnboardingModal from '../OnboardingModal';
import TutorialOverlay from '../TutorialOverlay';
import DevToolsModal from '../DevToolsModal';

export default function AppModals({
  // Reset Confirmation
  showResetConfirm,
  setShowResetConfirm,
  handleReset,

  // Leave Selection Bar (Desktop)
  selectionStart,
  setSelectionStart,
  previewDates,
  setPreviewDates,
  bookedDates,
  leaveNames,
  leaveColors,
  leaveConfigs,
  suggestedPlanName,
  setSuggestedPlanName,
  isAiPreview,
  leaves,
  setLeaves,
  currentUser,
  loadLeaves,
  setActiveTab,
  setLeavePlans,
  defaultTutorialPlanName,
  tutorialStartDate,
  tutorialEndDate,
  setTutorialCustomName,
  tutorialCustomName,

  // Attendance Check-in
  wfhModalOpen,
  setWfhModalOpen,
  isTutorialActive,
  setIsTutorialActive,
  tutorialStepIndex,
  setTutorialStepIndex,
  tutorialMonthIdx,
  tutorialDateRange,
  onboardingOpen,
  setOnboardingOpen,
  showSplash,
  setShowSplash,
  handleWfhStatusSelect,
  handleBatchWfhStatusSelect,
  handleWfhMarkLeave,
  getTodayDate,
  getTodayStr,
  missingAttendanceDays,
  wfhPromptHour,
  setHasPromptedWfh,

  // Notifications & PWA
  notifModalOpen,
  setNotifModalOpen,
  handleEnableNotif,
  installModalOpen,
  setInstallModalOpen,
  deferredInstallPrompt,
  setIsStandaloneApp,
  triggerInstallPromptAfterFlow,

  // Settings
  settingsModalOpen,
  setSettingsModalOpen,
  settingsInitialTab,
  userName,
  companyName,
  avatarUrl,
  attendanceCatchupMode,
  handleSaveSettings,
  handleDeleteAccount,
  handleSignOut,

  // Auth & Splash
  authModalOpen,
  setAuthModalOpen,
  handleAuthSuccess,
  handleEnterDemoMode,
  handleExitDemo,
  isDemoMode,
  resetPasswordModalOpen,
  setResetPasswordModalOpen,

  // Tutorial / View Control helpers
  setHoveredSuggestion,
  setMobileConfirmOpen,
  setIsMobileMenuOpen,
  setMobileSubView,
  setCalendarViewMode,
  setCalendarFocusedMonth,

  // DevTools
  devModalOpen,
  setDevModalOpen,
  devDateStr,
  setDevDateStr,
  calendarStyle,
  setCalendarStyle,
  focusedCellHeight,
  setFocusedCellHeight
}) {
  const effectiveToday = getTodayDate ? getTodayDate() : new Date();
  const curMonthKey = `${effectiveToday.getFullYear()}-${String(effectiveToday.getMonth() + 1).padStart(2, '0')}`;
  const wfhUsedThisMonth = (bookedDates || []).filter(b => b.type === 'wfh' && b.date?.startsWith(curMonthKey)).length;
  const currentTodayStr = getTodayStr ? getTodayStr() : '';

  return (
    <>
      {/* Global Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-[100]"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }} 
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }} 
              exit={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-[calc(100%-48px)] max-w-sm bg-card border border-border rounded-[32px] p-8 shadow-2xl z-[101]"
            >
              <div className="bg-red-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-red-600 mb-4 mx-auto">
                <RotateCw size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Reset All Data?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">This will delete all your leave plans and records. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-muted text-foreground rounded-2xl text-xs font-bold cursor-pointer">Cancel</button>
                <button onClick={handleReset} className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-red-600/20 cursor-pointer">Confirm Reset</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Selection Bar */}
      <div className="block">
        {!isAiPreview && (
          <LeaveSelectionBar 
            selectionStart={selectionStart}
            previewDates={previewDates}
            bookedDates={bookedDates}
            leaveNames={leaveNames}
            leaveColors={leaveColors}
            leaveConfigs={leaveConfigs}
            suggestedPlanName={suggestedPlanName}
            onAdvanceTutorial={isTutorialActive ? () => setTutorialStepIndex(prev => prev + 1) : undefined}
            forceExpandModal={isTutorialActive && (tutorialStepIndex === 4 || tutorialStepIndex === 5)}
            tutorialStepIndex={tutorialStepIndex}
            onCancel={() => { 
              setSelectionStart(null); 
              setPreviewDates([]); 
              if (setSuggestedPlanName) setSuggestedPlanName(null); 
            }}
            onApply={async (dates, type, note, planName, duration) => {
              if (isTutorialActive) {
                const finalName = planName || defaultTutorialPlanName;
                if (setTutorialCustomName) setTutorialCustomName(finalName);
                if (setLeavePlans) {
                  setLeavePlans(prev => [
                    {
                      id: 'tutorial-demo-plan-temp',
                      name: finalName,
                      start_date: tutorialStartDate,
                      end_date: tutorialEndDate,
                      startDate: tutorialStartDate,
                      endDate: tutorialEndDate,
                      type: 'pl',
                      is_demo: true
                    },
                    ...prev.filter(p => p.id !== 'tutorial-demo-plan-temp')
                  ]);
                }
                setPreviewDates([]);
                setSelectionStart(null);
                if (setSuggestedPlanName) setSuggestedPlanName(null);
                if (setActiveTab) setActiveTab('tracker');
                return;
              }
              if (planName && setTutorialCustomName) setTutorialCustomName(planName);
              let planId = null;
              if (dates.length > 1) {
                const plan = await createLeavePlan(planName || 'Untitled Plan', dates[0], dates[dates.length - 1], currentUser?.id);
                planId = plan?.id || null;
              }
              for (const dateStr of dates) {
                if (!isHoliday(dateStr) && !isWeekend(dateStr)) {
                  await addLeave(dateStr, type, note, planId, duration, currentUser?.id);
                }
              }
              await loadLeaves();
              setPreviewDates([]);
              setSelectionStart(null);
              if (setSuggestedPlanName) setSuggestedPlanName(null);
            }}
            balances={{
              pl: leaves.pl.total - leaves.pl.used,
              el: leaves.el.total - leaves.el.used,
              rh: leaves.rh.total - leaves.rh.used
            }}
            leaves={leaves}
            maxWfh={10}
          />
        )}
      </div>

      {/* Daily Attendance Check-in Modal */}
      <WfhCheckinModal
        isOpen={wfhModalOpen && !isTutorialActive && !onboardingOpen && !showSplash}
        onClose={() => setWfhModalOpen(false)}
        onSelectStatus={handleWfhStatusSelect}
        onBatchSelectStatus={handleBatchWfhStatusSelect}
        onMarkLeave={handleWfhMarkLeave}
        wfhUsedThisMonth={wfhUsedThisMonth}
        maxWfh={10}
        todayStr={currentTodayStr}
        missingDays={missingAttendanceDays}
        bookedDates={bookedDates}
        leaveConfigs={leaveConfigs}
        leaveNames={leaveNames}
        leaveColors={leaveColors}
        wfhPromptHour={wfhPromptHour}
        leaves={leaves}
      />

      {/* Notification Permission Modal */}
      <NotificationPromptModal
        isOpen={notifModalOpen && !isTutorialActive && !onboardingOpen && !showSplash}
        onClose={() => setNotifModalOpen(false)}
        onEnable={handleEnableNotif}
      />

      {/* PWA / Web App Installation Prompt Modal */}
      <InstallPromptModal
        isOpen={installModalOpen && !isTutorialActive && !onboardingOpen && !showSplash}
        onClose={() => setInstallModalOpen(false)}
        deferredPrompt={deferredInstallPrompt}
        onInstalled={() => setIsStandaloneApp?.(true)}
      />

      {/* Settings & Account Hub Modal */}
      <AnimatePresence>
        {settingsModalOpen && (
          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            initialTab={settingsInitialTab}
            userName={userName}
            companyName={companyName}
            avatarUrl={avatarUrl}
            quotas={{
              pl: leaves.pl.total,
              el: leaves.el.total,
              rh: leaves.rh.total,
              wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
            }}
            leaveNames={leaveNames}
            leaveColors={leaveColors}
            leaveConfigs={leaveConfigs}
            wfhPromptHour={wfhPromptHour}
            attendanceCatchupMode={attendanceCatchupMode}
            onSaveSettings={handleSaveSettings}
            currentUser={currentUser}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onResetData={handleReset}
            onDeleteAccount={handleDeleteAccount}
            onSignOut={handleSignOut}
            onReplayTutorial={() => {
              setTutorialStepIndex(0);
              setIsTutorialActive(true);
            }}
            leavesQuota={leaves}
            onImportSuccess={async (importedQuotaSettings) => {
              await loadLeaves(currentUser);
              if (importedQuotaSettings && setLeaves) {
                setLeaves(prev => ({
                  pl: { ...prev.pl, total: importedQuotaSettings.pl || prev.pl.total },
                  el: { ...prev.el, total: importedQuotaSettings.el || prev.el.total },
                  rh: { ...prev.rh, total: importedQuotaSettings.rh || prev.rh.total }
                }));
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Supabase & OAuth Multi-User Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onEnterDemo={handleEnterDemoMode}
        onExitDemo={handleExitDemo}
        isDemoMode={isDemoMode}
        currentProfile={{
          name: userName,
          quotas: {
            pl: leaves.pl.total,
            el: leaves.el.total,
            rh: leaves.rh.total,
            wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
          },
          names: leaveNames,
          colors: leaveColors
        }}
      />

      {/* Password Reset Recovery Modal */}
      <ResetPasswordModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        onSuccess={() => {
          setResetPasswordModalOpen(false);
          setShowSplash(false);
          if (window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
      />

      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            isOpen={showSplash}
            onClose={() => {}}
            onAuthSuccess={handleAuthSuccess}
            onEnterDemo={handleEnterDemoMode}
            onExitDemo={handleExitDemo}
            isDemoMode={isDemoMode}
            currentProfile={{
              name: userName,
              quotas: {
                pl: leaves.pl.total,
                el: leaves.el.total,
                rh: leaves.rh.total,
                wfh: parseInt(localStorage.getItem('quota_wfh') || '10', 10)
              },
              names: leaveNames,
              colors: leaveColors
            }}
          />
        )}
      </AnimatePresence>

      {/* Onboarding Flow Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        initialName={userName}
        leaveConfigs={leaveConfigs}
        onClose={() => setOnboardingOpen(false)}
        onComplete={async (data) => {
          setWfhModalOpen(false);
          setHasPromptedWfh(true);
          setOnboardingOpen(false);
          setTutorialStepIndex(0);
          setIsTutorialActive(true);
          await handleSaveSettings(data);
          sessionStorage.setItem('demo_onboarding_completed', 'true');
          localStorage.setItem('onboarding_completed', 'true');
        }}
      />

      {/* Post-Onboarding Interactive Guided Tutorial Overlay */}
      {isTutorialActive && (
        <TutorialOverlay
          currentStepIndex={tutorialStepIndex}
          setCurrentStepIndex={setTutorialStepIndex}
          onExecuteStepAction={(action) => {
            switch (action) {
              case 'prompt-open-month':
                setActiveTab('calendar');
                setCalendarViewMode('yearly');
                setSelectionStart(null);
                setPreviewDates([]);
                break;
              case 'select-start-date':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(tutorialMonthIdx);
                setSelectionStart(null);
                setPreviewDates([]);
                break;
              case 'select-end-range':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(tutorialMonthIdx);
                setSelectionStart(tutorialStartDate);
                setPreviewDates([]);
                break;
              case 'prompt-confirm-plan':
                setActiveTab('calendar');
                setCalendarViewMode('monthly');
                setCalendarFocusedMonth(tutorialMonthIdx);
                setSelectionStart(tutorialStartDate);
                setPreviewDates(tutorialDateRange);
                break;
              case 'select-modal-category':
                setActiveTab('calendar');
                setSelectionStart(tutorialStartDate);
                setPreviewDates(tutorialDateRange);
                setMobileConfirmOpen(true);
                break;
              case 'apply-modal-leave':
                setActiveTab('calendar');
                setSelectionStart(tutorialStartDate);
                setPreviewDates(tutorialDateRange);
                setMobileConfirmOpen(true);
                break;
              case 'review-created-plan':
                setActiveTab('tracker');
                setSelectionStart(null);
                setPreviewDates([]);
                setMobileConfirmOpen(false);
                setIsMobileMenuOpen(false);
                setMobileSubView(null);
                setLeavePlans(prev => {
                  if (prev.some(p => p.id === 'tutorial-demo-plan-temp')) return prev;
                  return [
                    {
                      id: 'tutorial-demo-plan-temp',
                      name: tutorialCustomName || defaultTutorialPlanName,
                      start_date: tutorialStartDate,
                      end_date: tutorialEndDate,
                      startDate: tutorialStartDate,
                      endDate: tutorialEndDate,
                      type: 'pl',
                      is_demo: true
                    },
                    ...prev
                  ];
                });
                break;
              default:
                break;
            }
          }}
          onComplete={() => {
            markTutorialCompleted();
            setIsTutorialActive(false);
            setSelectionStart(null);
            setPreviewDates([]);
            if (setHoveredSuggestion) setHoveredSuggestion(null);
            setMobileConfirmOpen(false);
            setIsMobileMenuOpen(false);
            setMobileSubView(null);
            setActiveTab('calendar');
            setCalendarViewMode('yearly');
            setLeavePlans(prev => prev.filter(p => p.id !== 'tutorial-demo-plan-temp'));
            if (isDemoMode) {
              setHasPromptedWfh(false);
              setWfhModalOpen(true);
            } else {
              triggerInstallPromptAfterFlow?.();
            }
          }}
          onSkip={() => {
            markTutorialCompleted();
            setIsTutorialActive(false);
            setSelectionStart(null);
            setPreviewDates([]);
            if (setHoveredSuggestion) setHoveredSuggestion(null);
            setMobileConfirmOpen(false);
            setIsMobileMenuOpen(false);
            setMobileSubView(null);
            setActiveTab('calendar');
            setCalendarViewMode('yearly');
            setLeavePlans(prev => prev.filter(p => p.id !== 'tutorial-demo-plan-temp'));
            if (isDemoMode) {
              setHasPromptedWfh(false);
              setWfhModalOpen(true);
            } else {
              triggerInstallPromptAfterFlow?.();
            }
          }}
        />
      )}

      {/* Developer Control Suite (Local DEV Only) */}
      {import.meta.env.DEV && (
        <>
          <button
            type="button"
            onClick={() => setDevModalOpen(true)}
            className="fixed bottom-4 left-4 z-50 p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl shadow-2xl shadow-amber-500/40 border border-amber-300 font-mono text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Developer Control Suite"
          >
            <FlaskConical size={15} /> DEV
          </button>

          <DevToolsModal
            isOpen={devModalOpen}
            onClose={() => setDevModalOpen(false)}
            getTodayStr={getTodayStr}
            devDateStr={devDateStr}
            setDevDateStr={setDevDateStr}
            setHasPromptedWfh={setHasPromptedWfh}
            calendarStyle={calendarStyle}
            onSetCalendarStyle={(style) => {
              setCalendarStyle(style);
              localStorage.setItem('calendar_cell_style', style);
            }}
            focusedCellHeight={focusedCellHeight}
            onSetFocusedCellHeight={(h) => {
              setFocusedCellHeight(h);
              localStorage.setItem('dev_focused_cell_height', h);
            }}
            onStartNewUserFlow={() => {
              setShowSplash(false);
              setAuthModalOpen(false);
              setOnboardingOpen(true);
            }}
            onStartTutorial={() => {
              setShowSplash(false);
              setAuthModalOpen(false);
              setOnboardingOpen(false);
              setIsMobileMenuOpen(false);
              setMobileSubView(null);
              setTutorialStepIndex(0);
              setIsTutorialActive(true);
            }}
            onOpenWfhCheckin={() => setWfhModalOpen(true)}
          />
        </>
      )}
    </>
  );
}
