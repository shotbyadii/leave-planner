# Changelog

All notable changes to the **Leave Planner** project will be documented in this file using [Semantic Versioning](https://semver.org/).

## [v0.8.8] - 2026-10-29
### Fixed
- **Multi-Day Attendance Catch-Up Parameter & Calculation Fix**:
  - Fixed an invocation mismatch in [`useAttendanceManager.js`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/src/hooks/useAttendanceManager.js) where `getMissingAttendanceDays` was called with positional arguments `(bookedDates, todayStr, 14)` instead of the structured options object `{ todayDate, bookedDates, holidays, ... }`. Because `bookedDates` was destructured as an options object, `bookedDates` evaluated to `undefined` and defaulted to an empty array, treating all 18 working days of the month as unlogged.
  - Made [`getMissingAttendanceDays`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/src/utils/attendanceCatchupUtils.js) polymorphic and backwards-compatible to gracefully support both named options objects and positional argument calls.
  - Added strict date-normalization in `attendanceCatchupUtils` to handle string date prefixes and avoid timezone discrepancies.
  - Added an active synchronization effect in `useAttendanceManager` to keep `missingAttendanceDays` state reactive and immediately dismiss/update the modal as dates are logged.
  - Added defensive filtering in [`WfhCheckinModal.jsx`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/src/components/WfhCheckinModal.jsx) to ensure dates already present in `bookedDates` (whether WFH, Planned Leave, or other leave categories) are never surfaced in the catch-up stack, auto-closing the modal once all unlogged days are resolved.
  - Added `webServer` configuration to [`playwright.config.js`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/playwright.config.js) to automate dev server lifecycle during audit test execution.

---

## [v0.8.7] - 2026-10-16
### Added
- **Domain Hook & Layout Architecture Modularization**:
  - Dismantled the 5,072-line `App.jsx` "God Component" down to 926 lines (82% reduction).
  - Extracted 4 focused custom hooks: `useAuthUser.js`, `useAttendanceManager.js`, `useLeaveManagement.js`, and `useMobileBooking.js`.
  - Extracted 8 dedicated mobile bottom-dock sheets (`MobileBottomNav`, `MobileFloatingDock`, `MobileLeaveBookingSheet`, `MobileLeaveDetailSheet`, `MobileMenuSheet`, `MobileProfileSheet`, `MobileSelectionBar`, `MobileSettingsSheet`).
  - Extracted isolated layout shells: `DesktopHeader.jsx`, `MobileHeader.jsx`, and modal coordinator `AppModals.jsx`.
- **Database & Security Hardening**:
  - Added `supabase_security_hardening.sql` production migration with strict per-user Row Level Security (`auth.uid() = user_id`), unique compound index `leaves_user_date_idx (user_id, date)`, performance indexes, and automatic profile provisioning trigger.
  - Scoped data reset actions in `leaveService.js` to prevent unauthenticated wildcard deletion.

### Fixed
- **Bottom-Up Mobile Morphing & Physics**:
  - Anchored transform origin to `bottom center` with harmonized directional vectors (`y: 12` on entry and exit), ensuring all modal sheets expand from the navbar upwards and collapse back down into the navbar in the exact same direction.
  - Adopted Apple fluid spring-curve easing (`cubic-bezier(0.32, 0.72, 0, 1)`) with `layout="size"` on the dock capsule for stable, zero-jitter transitions.
- **Tracker Auto-Scroll Isolation**:
  - Replaced native `scrollIntoView()` on policy tabs with container-confined `scrollTo()`, eliminating rogue page-down auto-scrolling when opening the Tracker tab on mobile.
  - Added reliable scroll-to-top resets upon view switching in `App.jsx` and `LeaveTracker.jsx`.

---

## [v0.8.6] - 2026-10-16
### Added
- **Smart Notification Suite**:
  - Service worker background notifications for single-day attendance check-ins, multi-day catch-up reminders, evening-before leave departure reminders, and holiday announcements.
  - ColorOS 15/16 Fluid Cloud & Live Alert capsule styling tailored for Android/Oppo devices.
- **Unpaid Leave (Loss of Pay / LOP) Fallback**:
  - Dynamic automatic fallback to Unpaid Leave (LOP) with dedicated Zinc styling when the annual vacation bank is exhausted.
  - Real-time annual bank calculation and LOP tracking across Desktop Topbar, Mobile Drawer, and Leave Tracker dashboard.

### Fixed
- **Optimizer Zero-Leave Guard**: Prevented empty recommendation states and crashes when annual leave balance is zero.

---

## [v0.8.5] - 2026-10-14
### Added
- **Multi-Card Attendance Swipe Carousel**:
  - Side-peeking 3D tilted card stack with visual depth, drag elasticity, and interactive pagination indicators.
- **Focused Month Carousel**:
  - Seamless horizontal paging between consecutive calendar months with fluid Framer Motion slide transitions.
- **Tactile Web Haptics**:
  - Integrated `navigator.vibrate` feedback patterns across calendar date picks, swipe dismissals, and quick check-in actions.

### Fixed
- **Ultra-Compact Viewport Layout**: Resolved clipping and scroll paddings on small-screen mobile devices.

---

## [v0.8.4] - 2026-10-12
### Added
- **Multi-Day Attendance Catch-Up Cards**:
  - Month-scanning engine (`attendanceCatchupUtils.js`) to detect all unlogged working days in the current month.
  - Interactive 3D tilted card stack in `WfhCheckinModal` with horizontal swipe gestures (`dragElastic`, flick velocity, and distance thresholds).
  - Visual side-peeking preview cards on left and right flanks (scaled down, half-opacity with day and weekday badges) indicating horizontal swipe affordance.
  - Interactive pagination pill bar below the card stack for direct day jumping.
  - Configurable in Settings (`attendanceCatchupMode`): toggle between `Multi-Day Catch-up` and `Current Day Only`.
- **Mobile AI & API Key Management**:
  - Full desktop feature parity in mobile settings drawer with dedicated Calendar AI tab (custom key input, test connection, model selection).
- **Automated Zero-Click Error Diagnostics**:
  - Integrated `public.error_logs` table in Supabase with RLS policies.
  - Automatic background error logging on unhandled application failures without requiring any user action.
  - Privacy-preserving error boundary: raw stack trace hidden in production, visible only to developer (`krshnaditya2@gmail.com`, localhost, or `?dev=true`).
  - Pre-filled "Report to Dev" direct email action with diagnostic context.

### Changed
- **Decluttered Check-In Modal UX**:
  - Simplified header title to `Day X of Y` (removed verbose `Catch-up` and `remaining` text).
  - Removed duplicate navigation counter between chevrons.
  - Removed redundant `Skip` and batch action buttons for high CTA clarity.
  - Cleaned up bottom navigation hints, keeping only the minimal pagination dots.

### Fixed
- **API Key Scoping**: Removed accidental global development API key assignment across new accounts.
- **Missing Imports**: Fixed `ReferenceError: ExternalLink is not defined` in `HolidayManager.jsx`.

---

## [v0.8.3] - 2026-10-12
### Added
- **Desktop Header Redesign**: Compact topbar architecture with segmented policy tier switchers (`Annual`, `Special`, `Remote`), user profile dropdown, and streamlined actions.
- **Mobile Leave Duration Selector**: Desktop-parity duration selector on mobile with quick `Full Day (1.0)` and `Half Day (0.5)` pills.
- **Auto-Scroll for AI Suggestions**: Non-AI suggested leave picks panel on mobile automatically scrolls down smoothly upon search icon activation.
- **Robust Error Boundary**: Copy-friendly error screen with one-click full stack trace copying and user-selectable diagnostics text.

### Changed
- **Leave Tracker WFH Balance**: Updated monthly tracker card to display remaining days (`6/10 left`) instead of utilized counts, ensuring visual consistency across desktop and mobile headers.
- **Zero-Balance Lockout**: Prevented taking half-day leaves when quota balance is zero across mobile and desktop.
- **Policy Selection Polish**: Removed redundant policy warning banners for a cleaner UX.

### Fixed
- **Mobile Ring Clipping**: Eliminated highlight outline clipping on segmented policy pills and mobile selection bars.
- **Acronym Parsing**: Normalized Work From Home category short code to `WFH` (resolving `WF` fallback issue).
- **Initialization TDZ**: Fixed `ReferenceError: Cannot access 'getTodayStr' before initialization` in `App.jsx`.

---

## [v0.8.2] - 2026-09-15
### Added
- **Dynamic Vacation Policies & Tier Grouping**: Support for categorized tiers, custom annual leave types, and company leave quotas.
- **Push Notification & PWA Branding**: Custom application branding icon in push notifications and standalone mobile shells.

### Fixed
- **Mobile Settings Spacing**: Resolved cutoffs and excessive scroll paddings in mobile settings dialogs and quota sheets.

---

## [v0.8.1] - 2026-08-22
### Added
- **PWA & Standalone App Support**: Added web app manifest, custom service worker caching, and an ambient installation prompt modal (`InstallPromptModal.jsx`).
- **Interactive Sandbox & Demo Mode**: Added demo dataset generator (`demoService.js`) and sticky non-intrusive demo banner (`DemoBanner.jsx`) to explore all features safely.
- **Apple-Style Quota Balance Ticker**: Integrated a tactile, spring-animated numeric ticker (`AppleBalanceTicker.jsx`) for live quota counter updates.
- **Slate Design System Documentation & Skill**: Codified typography, color tokens, and motion guidelines in `DESIGN_SYSTEM.md` and project agent skill.

### Changed
- **Refined Modal & Surface Polish**: Upgraded `LeaveSelectionBar`, `ExistingLeaveModal`, `WfhCheckinModal`, `AuthModal`, `OnboardingModal`, and `SplashScreen` with seamless spring morphing, tactile touch scaling, and improved contrast.
- **Leave Service Resilience**: Hardened Supabase and local data synchronization in `leaveService.js` with fallback query handling and offline safety.

---

## [v0.8.0] - 2026-08-17
### Added
- **Skeleton Loader**: Full-screen skeleton preview for lightning-fast perceived loading times (`AppSkeleton.jsx`).
- **Seamless Calendar Switching**: Fluid transitions when navigating between month and annual views.
- **Unified Mobile Modal Morphing**: Refactored sheet and modal transitions using shared layout tags.

---

## [v0.7.1] - 2026-08-16
### Fixed
- **Mobile Tutorial Positioning**: Docked the guided hint card dynamically 8px above the mobile confirmation modal for Step 5 and Step 6.
- **Step 4 Alignment**: Repositioned the Step 4 hint card to the bottom (`bottom-24`), placing instructions directly adjacent to the floating "Confirm" action pill.
- **Desktop Plan Highlighting**: Added robust multi-staggered DOM target matching in `TutorialOverlay` and `LeaveTracker` so the demo plan card (`#tutorial-demo-plan-card`) immediately highlights with glowing pulse effects on desktop.
- **Database Sandboxing**: Intercepted `handleMobileApply` during walkthrough mode to ensure demo leaves exist purely in temporary memory (`tutorial-demo-plan-temp`) with zero database writes or pollution.

---

## [v0.7.0] - 2026-08-16
### Added
- **Interactive Guided Tour (7-Step Walkthrough)**: Complete self-executing walkthrough tour covering Month view focus, date range selection, PL category picking, leave plan application, and Leave Tracker review.
- **Dedicated Profile & Dev Tour Launchers**: Added "Launch Interactive Tour" quick actions inside the mobile Profile drawer and the local Developer Suite panel.
- **Memory Sandbox Engine**: In-memory demo plan generator that simulates full end-to-end plan creation without affecting live Supabase/LocalStorage records.

---

## [v0.6.0] - 2026-08-16
### Added
- **Multimodal AI Public Holidays Manager**: Upload and parse company holiday calendar PDFs and images using the Google Gemini 2.5 API.
- **Zero-Duplication Normalization**: Strict `YYYY-MM-DD` date parsing and deduplication across database queries and bulk document uploads.
- **Dual-Pane Desktop & Sliding-Pill Mobile Manager**: Full-length dual-pane layout on desktop with interactive month overview and swipe navigation on mobile.
- **Floating Add Holiday Action**: Floating bottom "+ Add Holiday" button with subtle upward fade backdrop.

---

## [v0.5.5] - 2026-08-05
### Changed
- **Calendar Transitions & Card Polish**: Smoothed spring layout transitions across focused calendar views, refined leave plan card typography, and styled profile avatar borders.

---

## [v0.5.4] - 2026-08-05
### Fixed
- **Safari Theme Overscroll & Morphing**: Resolved theme color overscroll clipping on iOS Safari, improved step morphing, and prevented form autofill interference.

---

## [v0.5.0] - 2026-08-03
### Added
- **Interactive 4-Step User Onboarding**: Guided setup modal for new users capturing name, company workspace, and custom leave quotas.
- **Dynamic Quota Shortforms**: Live customizable leave category names and shortcodes (PL, EL, RH) with synchronized theme colors.
- **52px Capsule Aesthetic**: Re-engineered month date cells with rounded capsule indicators and 52px cell height defaults.

---

## [v0.4.0] - 2026-08-01
### Added
- **iPadOS Dual-Pane Settings Layout**: Responsive multi-column settings modal for tablet and desktop viewports.
- **Smart Multi-Leave Search**: Search bar across booked dates, plan names, and holiday titles.
- **Automatic Brand & Logo Extraction**: Real-time company domain and brand icon scraping.

---

## [v0.3.0] - 2026-07-28
### Added
- **Authentication & Cloud Sync Gateway**: Google OAuth & Supabase authentication suite with password encryption and user session persistence.
- **Multi-User Schema Isolation**: Row-level database security ensuring strict data isolation per user account.
- **Persistent Splash Gateway**: Smooth brand splash introduction on first visit.

---

## [v0.2.0] - 2026-07-24
### Added
- **WFH Monthly Quota Tracker**: Monthly work-from-home allowance tracking with over-quota status alerts.
- **12 PM Attendance Check-in Modal**: Scheduled daily check-in prompt for logging in-office vs remote presence.
- **In-Office / WFH Status Separation**: Dedicated visual styling and database tagging for attendance logs.

---

## [v0.1.0] - 2026-05-15
### Added
- **Initial Leave Planner Core**: 12-month interactive yearly grid, date range drag/click selection, leave balance summary, and basic trip logging.
