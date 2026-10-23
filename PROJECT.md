# 🏛️ Leave Planner — System Architecture & Codebase Map

> **Version:** `v0.8.7`  
> **Tech Stack:** React 19, Vite 8, Tailwind CSS, Framer Motion 12, Supabase (PostgreSQL + Auth + Realtime), Playwright  
> **Aesthetic System:** Slate Design System (Framer Motion spring physics `stiffness: 350, damping: 32`, Apple fluid bezier curves `cubic-bezier(0.32, 0.72, 0, 1)`, tactile haptics)

---

## 🧭 Executive Overview

**Leave Planner** (Leave Vault) is an enterprise-grade Progressive Web App (PWA) designed for modern hybrid workers. It manages vacation planning, multi-tier leave banks, daily and catch-up WFH/in-office attendance logging, AI-driven vacation scheduling (via Google Gemini), and automated push notifications.

In `v0.8.7`, the codebase was structurally refactored from a monolithic 5,072-line component down to a modular, domain-hook-driven architecture with zero desktop/mobile feature divergence.

```
                    ┌────────────────────────┐
                    │      src/main.jsx      │
                    │   (ErrorBoundary, SW)  │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      src/App.jsx       │
                    │   (App Orchestrator)   │
                    └───────────┬────────────┘
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  src/hooks/      │  │ src/components/  │  │ src/components/  │
│  - useAuthUser   │  │   layout/        │  │   modals/        │
│  - useAttendance │  │  - DesktopHeader │  │  - AppModals     │
│  - useLeaveMgmt  │  │  - MobileHeader  │  │  - WfhCheckin    │
│  - useMobileBook │  │ src/components/  │  │  - SettingsModal │
└──────────────────┘  │   mobile/        │  │  - OnboardingTour│
                      │  - FloatingDock  │  └──────────────────┘
                      │  - 8 TouchSheets │
                      └──────────────────┘
```

---

## 📁 Directory Structure & Responsibilities

```
leave-planner/
├── .agents/
│   └── skills/slate-design-system/SKILL.md  # Design system tokens & animation guidelines
├── docs/                                    # Design specs and branding documentation
├── public/
│   ├── sw.js                                # Background notification service worker
│   ├── manifest.json                        # PWA manifest
│   └── app-icon-*.png                       # App icons & badges
├── scripts/
│   ├── run-audit.js                         # Automated 20-scenario verification suite
│   ├── publish-all-releases.js              # Chronological GitHub release publisher
│   ├── send-attendance-reminders.js         # Scheduled attendance push triggers
│   └── sync-email-templates.js              # Supabase auth email sync
├── src/
│   ├── App.jsx                              # Root view switcher & layout orchestrator
│   ├── index.css                            # Tailwind base, dark theme variables, fonts
│   ├── main.jsx                             # React DOM bootstrap
│   ├── components/                          # Core UI components
│   │   ├── layout/                          # Isolated navigation and header shells
│   │   ├── mobile/                          # 8 bottom-dock mobile touch sheets
│   │   ├── modals/                          # Central modal coordinator (AppModals.jsx)
│   │   ├── Calendar.jsx                     # 12-month grid & focused month carousel
│   │   ├── LeaveTracker.jsx                 # Annual bank gauge, utilization tables, LOP
│   │   ├── OptimizerPanel.jsx               # AI vacation planner & bridge day finder
│   │   └── SegmentedPolicyTabs.jsx          # Morphing horizontal policy tab selector
│   ├── constants/                           # Brand assets & feature capability matrix
│   ├── data/                                # Default public holidays & destination intel
│   ├── hooks/                               # 4 extracted domain state hooks
│   ├── lib/                                 # Supabase client singleton
│   ├── services/                            # Backend APIs, AI, and sandboxed demo engine
│   └── utils/                               # Haptics, notifications, colors, catch-up math
├── supabase_security_hardening.sql          # Production SQL migration for RLS & indexes
├── tests/
│   └── e2e-audit.spec.js                    # 20 Playwright audit tests (Desktop & Mobile)
├── AGENTS.md                                # Multi-agent instructions entrypoint
├── CHANGELOG.md                             # Exhaustive versioned release notes
├── GEMINI.md                                # Gemini Code Assist instructions entrypoint
└── PROJECT.md                               # This document
```

---

## 🔗 File Dependency & Communication Graph

### 1. Root Orchestrator: `src/App.jsx`
- **Role**: Coordinates the 4 domain hooks, handles view switching (`calendar` vs `tracker`), catches URL action parameters (`/?action=attendance`, `/?action=leave`, `/?action=tracker`), and renders layout shells.
- **Imports from**:
  - `src/hooks/*`: Consumes state and actions from the 4 domain hooks.
  - `src/components/layout/DesktopHeader.jsx`: Desktop top navigation & balance capsules.
  - `src/components/layout/MobileHeader.jsx`: Mobile top brand bar.
  - `src/components/mobile/MobileFloatingDock.jsx`: Central mobile bottom-dock sheet.
  - `src/components/modals/AppModals.jsx`: Central modal dialog manager.
  - `src/components/Calendar.jsx`: Calendar rendering.
  - `src/components/LeaveTracker.jsx`: Tracker table & statistics.
  - `src/components/OptimizerPanel.jsx`: AI suggestions sidebar (Desktop) or inline card (Mobile).

---

### 2. Domain Hooks (`src/hooks/`)

#### A. `useAuthUser.js`
- **Purpose**: Authentication, session persistence, sandboxed demo mode, profile sync, account termination.
- **State Provided**: `currentUser`, `session`, `authChecked`, `userName`, `companyName`, `companyLogo`, `avatarUrl`, `isDemoMode`.
- **Key Methods**: `handleSignIn()`, `handleSignUp()`, `handleSignOut()`, `saveProfile()`, `deleteAccount()`, `switchDemoMode()`.
- **Communicates with**:
  - `src/services/authService.js` (Supabase auth client)
  - `src/services/demoService.js` (In-memory mock user `demo_user`)
  - `src/lib/supabase.js` (`profiles` table reads/updates)

#### B. `useAttendanceManager.js`
- **Purpose**: Daily 12 PM check-in prompt, past unrecorded working days detection (month catch-up), Tinder-style swipe actions, push notifications.
- **State Provided**: `wfhModalOpen`, `unloggedDates`, `activeCatchupIndex`, `attendanceCatchupMode` (`multi_day` vs `single_day`), `wfhPromptHour`.
- **Key Methods**: `triggerDailyCheckin()`, `scanMissingDays()`, `logAttendance(date, status)`, `batchLogOffice(dates)`.
- **Communicates with**:
  - `src/utils/attendanceCatchupUtils.js` (Scans working days vs logged leaves/holidays)
  - `src/utils/notificationService.js` (Triggers browser and service worker notifications)
  - `src/services/leaveService.js` (Logs `office` and `wfh` records)

#### C. `useLeaveManagement.js`
- **Purpose**: Leave configurations, 3-tier policy hierarchy, real-time Supabase sync, Loss of Pay (LOP) bank depletion fallback, and leave plan CRUD.
- **State Provided**: `leaves` (map of used/total), `bookedDates` (array of all booked leaves), `leavePlans`, `leaveConfigs`, `isAnnualBankDepleted`, `totalAnnualBankRemaining`, `lopUsedThisYear`.
- **Key Methods**: `addLeave()`, `removeLeave()`, `createPlan()`, `updatePlan()`, `deletePlan()`, `resetAllLeaves()`.
- **Communicates with**:
  - `src/services/leaveService.js` (Database queries to `leaves` and `leave_plans`)
  - `src/services/leaveConfigService.js` (3-tier policy configurations, consecutive limits, `LOP_CONFIG`)
  - `src/utils/colorUtils.js` (Category badge themes and color tokens)

#### D. `useMobileBooking.js`
- **Purpose**: Mobile touch interaction, gesture selection, duration switching (Full Day 1.0 vs Half Day 0.5), Apple numeric ticker triggers.
- **State Provided**: `mobileLeaveType`, `mobileDuration`, `mobilePlanName`, `mobileNote`, `mobileTickerData`.
- **Key Methods**: `setMobileLeaveType()`, `setMobileDuration()`, `triggerMobileTicker()`, `resetMobileBookingState()`.
- **Communicates with**:
  - `src/services/leaveConfigService.js` (Checks if category allows half-day)
  - `src/utils/haptics.js` (Triggers `vibrate` patterns on tap)

---

### 3. Layout Shells (`src/components/layout/`)

#### `DesktopHeader.jsx`
- **Consumers**: Renders on desktop viewports (`hidden md:flex`).
- **Features**:
  - Left branding with company logo or company initials badge fallback.
  - Center topbar tracker: segmented tabs (`Annual`, `Special`, `Remote`) with SVG gauges.
  - Dynamically displays **Unpaid Leave (LOP)** capsule when annual bank is depleted or LOP days are taken.
  - User profile pill opening `SettingsModal` (`profile` tab) or `AuthModal`.
  - Theme selector (`ThemeSelector.jsx`).

#### `MobileHeader.jsx`
- **Consumers**: Renders on mobile viewports (`flex md:hidden`).
- **Features**:
  - Company avatar, current date, greeting ("Good Morning, [Name]").
  - User profile pill opening the mobile menu drawer.

---

### 4. Mobile Bottom-Dock Sheets (`src/components/mobile/`)

All mobile navigation and modal forms are contained inside `MobileFloatingDock.jsx`. The dock is pinned to the bottom of the viewport with `origin-bottom` and smoothly morphs upwards using `layout="size"` with Apple cubic-bezier easing (`cubic-bezier(0.32, 0.72, 0, 1)`):

| Component | Responsibility | Trigger / State |
| :--- | :--- | :--- |
| `MobileBottomNav.jsx` | Default floating dock with mini balance meters and 4 buttons (Calendar, AI Assistant, Tracker, Menu) | Idle state (`!isExpandedDock`) |
| `MobileSelectionBar.jsx` | Dark action pill showing count of selected calendar dates with Cancel, Apply 1 Day, and Confirm Range buttons | `selectionStart !== null \|\| previewDates.length > 0` |
| `MobileLeaveBookingSheet.jsx` | Multi-tier booking form with category tabs, duration pills (1.0 vs 0.5), AppleBalanceTicker, and Apply button | `mobileConfirmOpen === true` |
| `MobileLeaveDetailSheet.jsx` | Slide-over inspector for existing leaves with convert actions (Office / WFH / Leave / Delete) | `viewingLeave !== null` |
| `MobileMenuSheet.jsx` | Quick profile card, settings launcher, PWA install button, full policy balance breakdown, theme switcher, sign-out | `isMobileMenuOpen === true` |
| `MobileProfileSheet.jsx` | Subview to edit name, company name, and avatar upload | `mobileSubView === 'profile'` |
| `MobileSettingsSheet.jsx` | Subview with tabs for Quotas, AI Assistant settings, Public Holidays, and Data Backups | `mobileSubView === 'settings'` |

---

### 5. Central Modal Coordinator (`src/components/modals/AppModals.jsx`)

Instead of rendering dozens of dialogs inside `App.jsx`, all desktop modals and system overlays are managed by `AppModals.jsx`:
- **`WfhCheckinModal`**: Daily prompt and multi-day catch-up with horizontal Tinder swipe cards.
- **`SettingsModal`**: Desktop iPadOS-style dual-pane settings with Quotas, Holidays, AI Assistant, and Backup tabs.
- **`OnboardingModal`**: 4-step wizard for first-time account setup.
- **`TutorialOverlay`**: 7-step interactive guided walkthrough tour.
- **`AuthModal`**: Google OAuth and email/password authentication.
- **`ResetPasswordModal`**: Supabase recovery link receiver.
- **`DevToolsModal`**: Local developer sandbox panel (`?dev=true` or localhost).
- **`InstallPromptModal`**: Ambient PWA installation modal.

---

## 🗄️ Database Architecture & Security

The application is backed by PostgreSQL via **Supabase**. Security is enforced at the database engine level via [`supabase_security_hardening.sql`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/supabase_security_hardening.sql):

### Schema Tables
1. **`public.leaves`**:
   - Columns: `id`, `user_id` (UUID references `auth.users`), `date` (TEXT `YYYY-MM-DD`), `type` (TEXT `pl`, `el`, `rh`, `wfh`, `office`, `lop`, or custom ID), `duration` (NUMERIC `1.0` or `0.5`), `note` (TEXT), `plan_id` (UUID references `leave_plans`), `created_at`.
   - Unique Index: `CREATE UNIQUE INDEX leaves_user_date_idx ON leaves (user_id, date);`
   - Row Level Security (RLS): Strict `auth.uid() = user_id` for all `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
2. **`public.leave_plans`**:
   - Columns: `id`, `user_id`, `name`, `start_date`, `end_date`, `leave_type`, `status`, `created_at`.
   - RLS: Strict `auth.uid() = user_id`.
3. **`public.profiles`**:
   - Columns: `id` (references `auth.users`), `full_name`, `company_name`, `company_logo_url`, `avatar_url`, `theme_color`, `created_at`.
   - Auto-Provisioning: Postgres trigger `handle_new_user()` creates profile on `auth.users` insert.
4. **`public.error_logs`**:
   - Columns: `id`, `user_id`, `error_message`, `stack_trace`, `url`, `user_agent`, `created_at`.
   - Security: Write-only for users (`INSERT`), read-only for admin (`krshnaditya2@gmail.com`).

---

## 🧪 Testing & Verification Loop

The test suite tests **both Desktop Chrome (1440×900) and Mobile Pixel (393×852)** with zero mocks on live UI rendering:

- **Command**: `npm run test:audit` (or `npx playwright test tests/e2e-audit.spec.js`)
- **Report Location**: [`test-results/audit-report.md`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/test-results/audit-report.md)
- **10 Verified Scenarios (20 Test Runs)**:
  1. *App Clean Boot*: Zero console exceptions or uncaught runtime crashes.
  2. *Guided Walkthrough & Onboarding Tour Stability*: Steps 1–7 complete cleanly.
  3. *State-to-View Reflection Matrix*: Custom special benefit reflects across topbar, mobile drawer, modal pills, and tracker dashboard.
  4. *Balance Deduction & Cadence Isolation*: Special leaves do not deduct from annual vacation bank.
  5. *Responsive Layout & Horizontal Overflow*: No horizontal scrollbar on Desktop or Mobile.
  6. *Onboarding Quotas Height-Morphing Animation*: Smooth morphing when expanding special/annual quotas.
  7. *Design System Checkbox & Toggle Token Consistency*: Token styling conforms to Slate design system.
  8. *Dual-Surface Feature Parity Contract*: Desktop actions match Mobile capabilities 1:1.
  9. *Modular Architecture Shell Integrity*: Layout shells mount without state drift.
  10. *Hook Architecture & Loss of Pay (LOP) Fallback*: Automatic engagement of LOP when annual bank is exhausted.

---

## 🛠️ Developer Commands Quick Reference

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite local development server on `http://localhost:5173/` |
| `npm run build` | Compiles production assets into `dist/` |
| `npm run test:audit` | Executes the 20-scenario automated verification suite and writes report |
| `npm run publish:releases` | Publishes chronological releases to GitHub via API with changelog notes |
| `npm run push:attendance` | Triggers test attendance push notifications |
| `npm run sync:emails` | Updates Supabase email authentication templates |
