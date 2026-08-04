# 📅 Leave Planner & Vault

A beautiful, premium web application designed to plan, track, and optimize your employee leaves (PL, EL, RH) and Work-From-Home (WFH) logs. Built with a focus on rich aesthetics, smooth animations, and dual-mode responsive layout for desktop and mobile devices.

---

## ✨ Features

### 🗓️ Smart Calendar & Selection
- **Interactive Multi-Day Selection**: Drag or click to select date ranges directly on the calendar.
- **Dynamic Suggestions & Warnings**: Instant visual optimizer highlights potential long weekends and flags sequential EL bookings requiring medical certificates.
- **Custom Legends**: Real-time shortform badges (e.g. Planned Leave -> CL -> **CL**) updated dynamically across metrics and calendar legends.

### ⚙️ Customizable Quotas & Themes
- **Apple-Style Wheel Tumbler Selection**: Interactive tumbler selector (`AppleWheelPicker`) for adjusting quotas.
- **Custom Swatch Colors & Names**: Redesign category names and associate them with vibrant, tailored HSL color palettes.
- **Double-Mode Theme Selector**: Clean toggle between light, dark, and system theme preferences.

### 📊 Leave Tracker & All Records Log
- **Collapsible Leave Plans**: Expandable mobile cards that morph smoothly using Framer Motion spring curves, saving vertical space.
- **Unified Sortable Log Table**: Sleek tabular list with click-to-sort headers (`DATE`, `TYPE`, `ASSOCIATED PLAN`) that adapts to mobile viewports.
- **Delete Tracking**: Instantly cancel individual leave entries or delete plan records with real-time balance updates.

### ☁️ Sync, Backup & Restore
- **Supabase Integration**: Account sync with secure user authentication, automatic profile pictures, and cloud backup.
- **Device-Native Uploads**: Upload profile pictures directly from your mobile or desktop device as base64 images.
- **Flexible Data Migrations**: Export data to JSON backups or CSV spreadsheets. Import and hydrate database records instantly via a JSON restore mechanism.

---

## 🛠️ Tech Stack

- **Core**: React 19, Vite 8, Javascript (ES6+)
- **Animations**: Framer Motion (Morphing spring-physics transitions)
- **Database / Auth**: Supabase JS SDK (PostgreSQL storage, authentication)
- **Icons**: Lucide React
- **Styles**: Custom Utility-based CSS for smooth glassmorphism, responsive grids, and adaptive dark mode palettes.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/shotbyadii/leave-planner.git
   cd leave-planner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

- `src/App.jsx` — Core application router, state management, and main mobile/desktop views.
- `src/components/Calendar.jsx` — Rich visual calendar grid rendering leaves, holidays, and weekends.
- `src/components/LeaveTracker.jsx` — Stat cards, collapsible leave plan grids, and sortable all-records table.
- `src/components/AppleWheelPicker.jsx` — Smooth tumbler selection wheel component for quota adjustments.
- `src/utils/dataMigration.js` — JSON/CSV parser, data download exporter, and Supabase database sync triggers.
- `src/utils/colorUtils.js` — Dynamic color palette helpers and shortform calculators.
