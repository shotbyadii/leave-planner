# Changelog

All notable changes to the **Leave Planner** project will be documented in this file using [Semantic Versioning](https://semver.org/).

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
