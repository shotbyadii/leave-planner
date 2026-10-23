# 🤖 Multi-Agent System Directives & Codebase Index

> **Target Audience:** Autonomous Agents, Coding Assistants (Gemini, Claude Code, Cursor, Copilot)  
> **Source of Truth:** [`PROJECT.md`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/PROJECT.md)  
> **Changelog Tracker:** [`CHANGELOG.md`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/CHANGELOG.md)

---

## ⚡ Agent Quick Start (Do NOT Read All Files on Every Invocation)

Instead of scanning all project files or grepping through the 926-line `src/App.jsx`, immediately locate the appropriate module:

```
Task Intent                             Target File / Directory
──────────────────────────────────────  ──────────────────────────────────────────
User Auth, Profiles, Demo Mode          src/hooks/useAuthUser.js
                                        src/services/authService.js, demoService.js

WFH Check-in, Catch-up, Push Alerts     src/hooks/useAttendanceManager.js
                                        src/components/WfhCheckinModal.jsx
                                        src/utils/notificationService.js

Leave Balances, Quotas, LOP, Plans      src/hooks/useLeaveManagement.js
                                        src/services/leaveService.js, leaveConfigService.js

Mobile Gestures, Tickers, Touch sheets  src/hooks/useMobileBooking.js
                                        src/components/mobile/MobileFloatingDock.jsx
                                        src/components/mobile/MobileLeaveBookingSheet.jsx

Desktop Top Navigation & Balance Bar    src/components/layout/DesktopHeader.jsx

Mobile Top Header & Avatar              src/components/layout/MobileHeader.jsx

Dialogs & Modals Coordinator            src/components/modals/AppModals.jsx

12-Month Grid & Month Carousel          src/components/Calendar.jsx

Leave Utilization Tables & SVG Gauges   src/components/LeaveTracker.jsx

AI Suggestions & Bridge Day Optimizer   src/components/OptimizerPanel.jsx
                                        src/services/aiAssistantService.js

Database Schema, RLS, SQL Migrations    supabase_security_hardening.sql

Automated Verification & Audits         tests/e2e-audit.spec.js
                                        scripts/run-audit.js
```

---

## 🔒 Mandatory Agent Operating Rules

1. **Maintain Changelog Integrity**:
   - Every commit pushed to `main` must include a version bump or changelog entry in [`CHANGELOG.md`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/CHANGELOG.md).
   - Use `npm run publish:releases` to publish releases chronologically to GitHub.
2. **Bottom-Up Motion Physics**:
   - All mobile sheets inside `MobileFloatingDock` must maintain `origin-bottom`, `style={{ transformOrigin: 'bottom center' }}`, enter from `y: 12`, exit to `y: 12`, with `duration: 0.2, ease: [0.32, 0.72, 0, 1]`.
3. **No Native `scrollIntoView()` on Tabs**:
   - Tabs in `SegmentedPolicyTabs.jsx` must exclusively use `container.scrollTo({ left: ... })` to protect the parent viewport from jumping vertically.
4. **Desktop & Mobile Parity**:
   - Any new policy or setting must be implemented for both Desktop (`DesktopHeader` / `SettingsModal`) and Mobile (`MobileHeader` / `MobileFloatingDock` / `MobileSettingsSheet`).
5. **Pre-Push Automated Verification**:
   - Always run `npm run test:audit` and assert **20/20 tests passing (100%)** before pushing code.
