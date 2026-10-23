# 🤖 GEMINI System Instructions & Project Context

> **Project:** Leave Planner (Leave Vault)  
> **Repository:** `shotbyadii/leave-planner`  
> **Architecture Reference:** [`PROJECT.md`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/PROJECT.md)  
> **Changelog Reference:** [`CHANGELOG.md`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/CHANGELOG.md)

---

## ⚡ Quick Architecture Summary (Do NOT Re-Scan All Files)

This project has been modularized into 4 domain hooks, isolated layout shells, and 8 mobile bottom-dock sheets. Avoid scanning `App.jsx` or re-reading all components from scratch. Use this index:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PROJECT TOPOLOGY                              │
├──────────────────────┬─────────────────────────────────────────────────┤
│ Domain State         │ src/hooks/                                      │
│                      │ ├── useAuthUser.js (Auth, Demo sandboxing, User)│
│                      │ ├── useAttendanceManager.js (WFH, Catchup, SW)  │
│                      │ ├── useLeaveManagement.js (Quotas, LOP, Plans)  │
│                      │ └── useMobileBooking.js (Touch gestures, Ticker)│
├──────────────────────┼─────────────────────────────────────────────────┤
│ Layout Shells        │ src/components/layout/                          │
│                      │ ├── DesktopHeader.jsx (Topbar, SVG meters, LOP) │
│                      │ └── MobileHeader.jsx (Top brand bar, initials)  │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Mobile Bottom Dock   │ src/components/mobile/                          │
│                      │ ├── MobileFloatingDock.jsx (Morphing container) │
│                      │ ├── MobileBottomNav.jsx (Default capsule)       │
│                      │ ├── MobileSelectionBar.jsx (Range action bar)   │
│                      │ ├── MobileLeaveBookingSheet.jsx (Booking form)  │
│                      │ ├── MobileLeaveDetailSheet.jsx (Inspector)      │
│                      │ ├── MobileMenuSheet.jsx (Drawer & Balances)     │
│                      │ ├── MobileProfileSheet.jsx (Profile editor)     │
│                      │ └── MobileSettingsSheet.jsx (Quotas & AI tabs)  │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Modal Coordinator    │ src/components/modals/AppModals.jsx             │
│                      │ Manages: WfhCheckinModal, SettingsModal,        │
│                      │ OnboardingModal, TutorialOverlay, AuthModal     │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Views & Features     │ src/components/                                 │
│                      │ ├── Calendar.jsx (12-mo grid & carousel)        │
│                      │ ├── LeaveTracker.jsx (Gauges, tables, LOP)      │
│                      │ ├── OptimizerPanel.jsx (Gemini AI Suggestions)  │
│                      │ └── SegmentedPolicyTabs.jsx (Pill strip)        │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Backend & Services   │ src/services/                                   │
│                      │ ├── leaveService.js (Supabase CRUD & Sandboxing)│
│                      │ ├── leaveConfigService.js (3-Tier & LOP config) │
│                      │ ├── aiAssistantService.js (Gemini 2.5 client)   │
│                      │ └── holidayExtractionService.js (PDF/Image OCR) │
└──────────────────────┴─────────────────────────────────────────────────┘
```

---

## 🎯 Standing Directives for Gemini

1. **Changelog & Releases with Every Push**:
   - Whenever pushing features or fixes, **always** update [`CHANGELOG.md`](file:///c:/Users/anush/.gemini/antigravity/scratch/leave-planner/CHANGELOG.md) with categorized sections (`Added`, `Changed`, `Fixed`).
   - Run `npm run publish:releases` to publish chronological releases on GitHub.
2. **Mobile Motion & Physics Integrity**:
   - Never use arbitrary `y` exit directions. All mobile dock sheets must anchor to `bottom center` (`origin-bottom`) and expand from/collapse to the bottom using `cubic-bezier(0.32, 0.72, 0, 1)` and `y: 12`.
3. **No Page-Level Auto-Scroll**:
   - Tab switchers inside `SegmentedPolicyTabs.jsx` must only use `container.scrollTo({ left: ... })`. **Never** call native `el.scrollIntoView()` as it pulls ancestor page scroll containers downward.
4. **Dual-Surface Parity**:
   - Any policy, quota, or data action added to Desktop must exist with 1:1 functional parity on Mobile (either in `MobileFloatingDock` sheets or `MobileMenuSheet`).
5. **Verification Before Push**:
   - Run `npm run test:audit` before pushing to ensure all 20 test scenarios pass (10 Desktop + 10 Mobile).
