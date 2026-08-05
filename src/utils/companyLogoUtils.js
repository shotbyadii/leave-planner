/**
 * Preset list of top companies with exact domains and logo URLs
 */
export const PRESET_COMPANIES = [
  { name: 'Siemens', domain: 'siemens.com' },
  { name: 'Siemens Energy', domain: 'siemens-energy.com' },
  { name: 'Siemens Healthineers', domain: 'siemens-healthineers.com' },
  { name: 'Reuters', domain: 'reuters.com' },
  { name: 'Thomson Reuters', domain: 'thomsonreuters.com' },
  { name: 'ABB', domain: 'abb.com' },
  { name: 'Google', domain: 'google.com' },
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'Apple', domain: 'apple.com' },
  { name: 'Amazon', domain: 'amazon.com' },
  { name: 'Meta', domain: 'meta.com' },
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Tesla', domain: 'tesla.com' },
  { name: 'IBM', domain: 'ibm.com' },
  { name: 'Oracle', domain: 'oracle.com' },
  { name: 'SAP', domain: 'sap.com' },
  { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'Adobe', domain: 'adobe.com' },
  { name: 'Intel', domain: 'intel.com' },
  { name: 'Nvidia', domain: 'nvidia.com' },
  { name: 'Cisco', domain: 'cisco.com' },
  { name: 'Qualcomm', domain: 'qualcomm.com' },
  { name: 'Samsung', domain: 'samsung.com' },
  { name: 'Sony', domain: 'sony.com' },
  { name: 'Uber', domain: 'uber.com' },
  { name: 'Airbnb', domain: 'airbnb.com' },
  { name: 'Spotify', domain: 'spotify.com' },
  { name: 'Stripe', domain: 'stripe.com' },
  { name: 'Twilio', domain: 'twilio.com' },
  { name: 'Atlassian', domain: 'atlassian.com' },
  { name: 'Accenture', domain: 'accenture.com' },
  { name: 'Deloitte', domain: 'deloitte.com' },
  { name: 'PwC', domain: 'pwc.com' },
  { name: 'EY', domain: 'ey.com' },
  { name: 'KPMG', domain: 'kpmg.com' },
  { name: 'McKinsey', domain: 'mckinsey.com' },
  { name: 'BCG', domain: 'bcg.com' },
  { name: 'Goldman Sachs', domain: 'goldmansachs.com' },
  { name: 'JPMorgan Chase', domain: 'jpmorganchase.com' },
  { name: 'Morgan Stanley', domain: 'morganstanley.com' },
  { name: 'Barclays', domain: 'barclays.com' },
  { name: 'HSBC', domain: 'hsbc.com' },
  { name: 'Shell', domain: 'shell.com' },
  { name: 'BP', domain: 'bp.com' },
  { name: 'Bosch', domain: 'bosch.com' },
  { name: 'BMW', domain: 'bmw.com' },
  { name: 'Mercedes-Benz', domain: 'mercedes-benz.com' },
  { name: 'Volkswagen', domain: 'volkswagen.com' },
  { name: 'Toyota', domain: 'toyota.com' },
  { name: 'Honda', domain: 'honda.com' },
  { name: 'Ford', domain: 'ford.com' },
  { name: 'General Electric', domain: 'ge.com' },
  { name: 'Honeywell', domain: 'honeywell.com' },
  { name: 'Schneider Electric', domain: 'se.com' },
  { name: 'Philips', domain: 'philips.com' },
  { name: 'Novartis', domain: 'novartis.com' },
  { name: 'Pfizer', domain: 'pfizer.com' },
  { name: 'AstraZeneca', domain: 'astrazeneca.com' },
  { name: 'Roche', domain: 'roche.com' },
  { name: 'Johnson & Johnson', domain: 'jnj.com' },
  { name: 'Bayer', domain: 'bayer.com' },
  { name: 'Unilever', domain: 'unilever.com' },
  { name: 'Procter & Gamble', domain: 'pg.com' },
  { name: 'Nestlé', domain: 'nestle.com' },
  { name: 'PepsiCo', domain: 'pepsico.com' },
  { name: 'Coca-Cola', domain: 'coca-cola.com' },
  { name: 'Bloomberg', domain: 'bloomberg.com' }
].map(item => ({
  ...item,
  logoUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.domain)}&sz=128`
}));

/**
 * Utility to compute company initials for fallback icons (e.g. Siemens Healthineers -> SH)
 */
export const getCompanyInitials = (name) => {
  if (!name || typeof name !== 'string') return 'LV';
  const clean = name.trim();
  if (!clean) return 'LV';

  const words = clean.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

/**
 * Utility to extract domain from company input and return automagical logo URLs.
 */
export const getCompanyLogoUrl = (companyInput) => {
  if (!companyInput || typeof companyInput !== 'string') return null;

  const trimmed = companyInput.trim();
  if (!trimmed) return null;

  // Check preset list first
  const presetMatch = PRESET_COMPANIES.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (presetMatch) {
    return presetMatch.logoUrl;
  }

  // If already a full http/https URL
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')) {
    return trimmed;
  }

  // Unrecognized company name: return null to display crisp company initials badge!
  return null;
};

/**
 * Search companies by query string
 * Keeps dropdown populated continuously!
 */
export const searchCompanies = (query) => {
  if (!query || typeof query !== 'string') return PRESET_COMPANIES.slice(0, 8);
  const q = query.trim().toLowerCase();
  if (!q) return PRESET_COMPANIES.slice(0, 8);

  // Exact matches first, then prefix matches, then substring matches
  const exact = PRESET_COMPANIES.filter(c => c.name.toLowerCase() === q);
  const prefix = PRESET_COMPANIES.filter(c => c.name.toLowerCase().startsWith(q) && c.name.toLowerCase() !== q);
  const substring = PRESET_COMPANIES.filter(c => c.name.toLowerCase().includes(q) && !c.name.toLowerCase().startsWith(q));

  const results = [...exact, ...prefix, ...substring].slice(0, 8);

  // If exact match is already present as sole result, return just exact match
  if (exact.length === 1 && results.length === 1) {
    return exact;
  }

  // If no exact match in preset list, append custom option so list NEVER collapses
  const hasExact = results.some(c => c.name.toLowerCase() === q);
  if (!hasExact && q.length > 0) {
    results.push({
      name: query.trim(),
      domain: 'custom organization',
      logoUrl: getCompanyLogoUrl(query.trim()),
      isCustom: true
    });
  }

  return results;
};
