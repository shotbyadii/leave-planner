# Leave Planner & Vault

A professional web application designed to plan, track, and optimize employee leaves and Work-From-Home (WFH) logs. Built with a focus on ease of use, responsiveness, and clean interactive visualization.

---

## Key Features

### Visual Calendar & Selection
- **Multi-Day Selection**: Drag or click to select date ranges directly on the calendar to plan trips or consecutive leaves.
- **Dynamic Optimization Suggestions**: Highlight potential long weekends and holiday overlaps to maximize time off using minimal leave balance.
- **Dynamic Metrics**: Live calculations of remaining leave balances (PL, EL, RH) and warning messages when sequential Emergency Leaves require administrative verification.

### Account Sync & Settings
- **Custom Quota & Category Naming**: Rename leave categories and adjust quotas using interactive tumbler selectors.
- **Category Colors**: Map custom colors to leave categories to keep the calendar legend readable.
- **Cloud Sync**: Secure sign-in to sync leave plans and WFH logs across multiple devices.

### Leave Tracker & Logs
- **Collapsible Plan Summaries**: Clean, space-saving layouts on mobile that expand to show complete breakdowns of leaves, holidays, and weekends.
- **Sortable All-Records Table**: A single log table with sortable columns (Date, Type, Associated Plan) for desktop and mobile to audit your history.
- **Quick Deletion**: Cancel individual leave days or delete complete trip plans with instant balance updates.

### Backup & Restore
- **Flexible Exporters**: Save your complete records as JSON backups or CSV spreadsheets.
- **Direct Restore**: Upload a previously exported JSON backup file to hydrate your cloud database and local client state instantly.

---

## Tech Stack

- **Frontend**: React 19, Vite 8, JavaScript
- **Animations**: Framer Motion
- **Database / Auth**: Supabase
- **Icons**: Lucide React

---

## Getting Started

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

## Project Structure

- `src/App.jsx` — Core state management and application views.
- `src/components/Calendar.jsx` — Visual calendar grid rendering leaves, holidays, and weekends.
- `src/components/LeaveTracker.jsx` — Collapsible leave plans and sortable log table.
- `src/utils/dataMigration.js` — JSON/CSV parsers for imports, exports, and backup restorations.
