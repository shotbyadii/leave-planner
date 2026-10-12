/**
 * Feature Capability Registry & Dual-Surface Parity Contract
 * 
 * Every capability declared here MUST be accessible and operable on BOTH:
 * 1. Desktop surface (via SettingsModal / Topbar / Desktop UI)
 * 2. Mobile surface (via Mobile Drawer / Morphing Navbar / Mobile Settings)
 * 
 * Verified continuously in `tests/e2e-audit.spec.js`
 */

export const FEATURE_CAPABILITIES = {
  ANNUAL_POLICY_EDIT: {
    id: 'annual-policy-edit',
    name: 'Annual Leave Quota Configuration',
    description: 'Adjust allowances and custom names/colors for annual leave bank',
    desktopSelector: '[data-capability="annual-policy-edit"]',
    mobileSelector: '[data-capability="annual-policy-edit"]'
  },
  ADD_ANNUAL_CATEGORY: {
    id: 'add-annual-category',
    name: 'Add Custom Annual Category',
    description: 'Add dynamic custom annual vacation categories (e.g. Sabbatical, Floating)',
    desktopSelector: '[data-capability="add-annual-category"]',
    mobileSelector: '[data-capability="add-annual-category"]'
  },
  REMOTE_POLICY_EDIT: {
    id: 'remote-policy-edit',
    name: 'Remote / WFH Allowance & Schedule',
    description: 'Configure monthly WFH quotas and daily check-in prompt times',
    desktopSelector: '[data-capability="remote-policy-edit"]',
    mobileSelector: '[data-capability="remote-policy-edit"]'
  },
  SPECIAL_BENEFITS_EDIT: {
    id: 'special-benefits-edit',
    name: 'Special Benefit Leave Configuration',
    description: 'View and adjust non-deducting special benefit balances',
    desktopSelector: '[data-capability="special-benefits-edit"]',
    mobileSelector: '[data-capability="special-benefits-edit"]'
  },
  ADD_SPECIAL_BENEFIT: {
    id: 'add-special-benefit',
    name: 'Add Custom Special Benefit',
    description: 'Create custom independent benefit types (e.g. Wellness Break, Volunteer Day)',
    desktopSelector: '[data-capability="add-special-benefit"]',
    mobileSelector: '[data-capability="add-special-benefit"]'
  },
  DATA_EXPORT_JSON: {
    id: 'export-json',
    name: 'Export Account Data (JSON)',
    description: 'Download full JSON database backup of leaves and profiles',
    desktopSelector: '[data-capability="export-json"]',
    mobileSelector: '[data-capability="export-json"]'
  },
  DATA_EXPORT_CSV: {
    id: 'export-csv',
    name: 'Export Report (CSV)',
    description: 'Download CSV spreadsheet of leaves, trips, and WFH logs',
    desktopSelector: '[data-capability="export-csv"]',
    mobileSelector: '[data-capability="export-csv"]'
  },
  AUTH_SIGN_OUT: {
    id: 'sign-out',
    name: 'Sign Out / Session Clear',
    description: 'Sign out from current user account or exit demo mode',
    desktopSelector: '[data-capability="sign-out"]',
    mobileSelector: '[data-capability="sign-out"]'
  }
};
