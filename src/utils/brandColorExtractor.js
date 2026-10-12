/**
 * Brand Color Extractor & Gradient Generator
 * Derives primary and accent brand colors from company names, domains, or images.
 * Defaults gracefully to Leave Vault's signature ocean blue gradient.
 */

// Preset dominant colors for popular tech & enterprise companies
const BRAND_PRESET_COLORS = {
  // Global Tech & Big Tech
  'google': { primary: '#4285F4', secondary: '#1a73e8', accent: '#EA4335', dark: '#0f172a' },
  'microsoft': { primary: '#00A4EF', secondary: '#0078D4', accent: '#F25022', dark: '#0f172a' },
  'apple': { primary: '#64748B', secondary: '#334155', accent: '#0EA5E9', dark: '#0f172a' },
  'amazon': { primary: '#FF9900', secondary: '#146EB4', accent: '#FF9900', dark: '#131921' },
  'meta': { primary: '#0668E1', secondary: '#0081FB', accent: '#0668E1', dark: '#0a192f' },
  'facebook': { primary: '#0668E1', secondary: '#0081FB', accent: '#0668E1', dark: '#0a192f' },
  'netflix': { primary: '#E50914', secondary: '#B81D24', accent: '#E50914', dark: '#141414' },
  'tesla': { primary: '#E82127', secondary: '#CC0000', accent: '#E82127', dark: '#111111' },
  'nvidia': { primary: '#76B900', secondary: '#4C7800', accent: '#76B900', dark: '#0c1700' },
  'spotify': { primary: '#1DB954', secondary: '#169C46', accent: '#1DB954', dark: '#121212' },
  'uber': { primary: '#000000', secondary: '#276EF1', accent: '#276EF1', dark: '#0f172a' },
  'airbnb': { primary: '#FF5A5F', secondary: '#FF385C', accent: '#FF5A5F', dark: '#1f1315' },
  'stripe': { primary: '#635BFF', secondary: '#00D4FF', accent: '#635BFF', dark: '#0a102f' },
  'slack': { primary: '#4A154B', secondary: '#611f69', accent: '#36C5F0', dark: '#1a051d' },
  'github': { primary: '#238636', secondary: '#1f6feb', accent: '#58A6FF', dark: '#0d1117' },
  'gitlab': { primary: '#FC6D26', secondary: '#E24329', accent: '#FCA326', dark: '#1b1219' },
  'figma': { primary: '#F24E1E', secondary: '#A259FF', accent: '#0ACF83', dark: '#1e1022' },
  'notion': { primary: '#2F3437', secondary: '#0F0F0F', accent: '#3B82F6', dark: '#191919' },
  'linear': { primary: '#5E6AD2', secondary: '#8B5CF6', accent: '#5E6AD2', dark: '#0f1026' },
  'supabase': { primary: '#3ECF8E', secondary: '#24B47E', accent: '#3ECF8E', dark: '#0c1c14' },
  'vercel': { primary: '#000000', secondary: '#333333', accent: '#0070F3', dark: '#0a0a0a' },
  'cloudflare': { primary: '#F38020', secondary: '#FAAE40', accent: '#F38020', dark: '#241407' },
  'intel': { primary: '#0068B5', secondary: '#004A82', accent: '#0068B5', dark: '#001933' },
  'amd': { primary: '#ED1C24', secondary: '#990000', accent: '#ED1C24', dark: '#1c0506' },
  'cisco': { primary: '#049FD9', secondary: '#015B80', accent: '#049FD9', dark: '#021824' },
  'ibm': { primary: '#0F62FE', secondary: '#0043CE', accent: '#0F62FE', dark: '#091738' },
  'oracle': { primary: '#C74634', secondary: '#F80000', accent: '#C74634', dark: '#220805' },
  'salesforce': { primary: '#00A1E0', secondary: '#032D60', accent: '#00A1E0', dark: '#051937' },
  'adobe': { primary: '#FA0F00', secondary: '#CC0C00', accent: '#FA0F00', dark: '#240402' },
  'zoom': { primary: '#2D8CFF', secondary: '#0B5CFF', accent: '#2D8CFF', dark: '#091e3e' },
  'atlassian': { primary: '#0052CC', secondary: '#172B4D', accent: '#0052CC', dark: '#091e42' },
  'openai': { primary: '#10A37F', secondary: '#0D8A6A', accent: '#10A37F', dark: '#0b1f18' },
  'anthropic': { primary: '#D97706', secondary: '#B45309', accent: '#F59E0B', dark: '#1c1307' },
  'siemens': { primary: '#00646E', secondary: '#009999', accent: '#00A3A6', dark: '#001a1c' },
  'samsung': { primary: '#1428A0', secondary: '#0c1a6b', accent: '#1428A0', dark: '#08103d' },

  // Indian Tech, FinTech & Enterprises
  'swiggy': { primary: '#FC8019', secondary: '#E23744', accent: '#FC8019', dark: '#211204' },
  'zomato': { primary: '#E23744', secondary: '#CB202D', accent: '#E23744', dark: '#230709' },
  'blinkit': { primary: '#F8CB46', secondary: '#0C831F', accent: '#0C831F', dark: '#241a02' },
  'zepto': { primary: '#8B00FF', secondary: '#E50914', accent: '#FF2E93', dark: '#1f0338' },
  'flipkart': { primary: '#2874F0', secondary: '#1A52B8', accent: '#FFE11B', dark: '#0b1d3a' },
  'paytm': { primary: '#002E6E', secondary: '#00BAF2', accent: '#00BAF2', dark: '#00193b' },
  'phonepe': { primary: '#5F259F', secondary: '#48197c', accent: '#5F259F', dark: '#160527' },
  'tcs': { primary: '#004B87', secondary: '#0072CE', accent: '#004B87', dark: '#001b33' },
  'infosys': { primary: '#007CC3', secondary: '#00558C', accent: '#007CC3', dark: '#002138' },
  'wipro': { primary: '#3B44AC', secondary: '#272d73', accent: '#009999', dark: '#101338' },
  'hcl': { primary: '#0072CE', secondary: '#004B87', accent: '#0072CE', dark: '#001b33' },
  'nykaa': { primary: '#FC2779', secondary: '#E80071', accent: '#FC2779', dark: '#2c0414' },
  'razorpay': { primary: '#0C2340', secondary: '#3395FF', accent: '#3395FF', dark: '#081424' },
  'zerodha': { primary: '#387ED1', secondary: '#245999', accent: '#FF5722', dark: '#0c1a2e' },
  'cred': { primary: '#1C1C1E', secondary: '#2C2C2E', accent: '#E5E5EA', dark: '#0F0F10' },
  'jio': { primary: '#0A2885', secondary: '#E01D22', accent: '#0A2885', dark: '#051442' },
  'tata': { primary: '#004B87', secondary: '#0072CE', accent: '#004B87', dark: '#001b33' },

  // Banking, Automotive & Global Brands
  'hdfc': { primary: '#004C8F', secondary: '#003360', accent: '#ED232A', dark: '#001a36' },
  'icici': { primary: '#F58220', secondary: '#A81C2B', accent: '#F58220', dark: '#2a1103' },
  'goldmansachs': { primary: '#7399C6', secondary: '#1B365D', accent: '#7399C6', dark: '#0c1626' },
  'goldman': { primary: '#7399C6', secondary: '#1B365D', accent: '#7399C6', dark: '#0c1626' },
  'jpmorgan': { primary: '#117ACA', secondary: '#003366', accent: '#117ACA', dark: '#05172b' },
  'nike': { primary: '#E50914', secondary: '#111111', accent: '#FA5400', dark: '#111111' },
  'starbucks': { primary: '#00704A', secondary: '#1E3932', accent: '#00704A', dark: '#061711' },
  'bmw': { primary: '#0066B1', secondary: '#1C69D4', accent: '#0066B1', dark: '#001a30' }
};

// Default signature deep ocean blue gradient
export const DEFAULT_BRAND_GRADIENT = {
  css: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #1d4ed8 100%)',
  primary: '#2563EB',
  secondary: '#1E40AF',
  accent: '#3B82F6',
  dark: '#0f172a',
  border: 'rgba(59, 130, 246, 0.3)',
  glow: 'rgba(37, 99, 235, 0.25)',
  buttonBg: 'bg-blue-600 hover:bg-blue-700',
  buttonStyle: { backgroundColor: '#2563EB' },
  textAccent: 'text-blue-400',
  isCustom: false
};

/**
 * Derives a full theme palette for a given company name or URL
 * Rule 1: If no valid logo/preset pulled from company input, fallback to blue default theme.
 */
export const getBrandTheme = (companyName = '', companyLogoUrl = null) => {
  if (!companyName || typeof companyName !== 'string') {
    return DEFAULT_BRAND_GRADIENT;
  }

  const clean = companyName.toLowerCase().trim();
  if (!clean) {
    return DEFAULT_BRAND_GRADIENT;
  }

  // Strip common domain suffixes
  const slug = clean.replace(/\.(com|org|io|net|co|in|ai|app|dev|xyz|tech|us|me)$/i, '').replace(/[^a-z0-9]/g, '');

  // 1. Direct or partial preset match
  for (const [key, colors] of Object.entries(BRAND_PRESET_COLORS)) {
    if (slug === key || slug.includes(key) || key.includes(slug)) {
      return {
        css: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 60%, ${colors.primary} 100%)`,
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        dark: colors.dark,
        border: `${colors.primary}4D`,
        glow: `${colors.primary}40`,
        buttonBg: 'hover:opacity-95 text-white',
        buttonStyle: { backgroundColor: colors.primary },
        textAccent: colors.primary,
        isCustom: true
      };
    }
  }

  // 2. Check if companyLogoUrl points to a recognizable domain
  if (companyLogoUrl && typeof companyLogoUrl === 'string') {
    const domainMatch = companyLogoUrl.match(/domain=([^&]+)/i);
    if (domainMatch) {
      const domainSlug = domainMatch[1].toLowerCase().replace(/\.(com|org|io|net|co|in|ai|app|dev|xyz|tech|us|me)$/i, '').replace(/[^a-z0-9]/g, '');
      if (domainSlug && BRAND_PRESET_COLORS[domainSlug]) {
        const colors = BRAND_PRESET_COLORS[domainSlug];
        return {
          css: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 60%, ${colors.primary} 100%)`,
          primary: colors.primary,
          secondary: colors.secondary,
          accent: colors.accent,
          dark: colors.dark,
          border: `${colors.primary}4D`,
          glow: `${colors.primary}40`,
          buttonBg: 'hover:opacity-95 text-white',
          buttonStyle: { backgroundColor: colors.primary },
          textAccent: colors.primary,
          isCustom: true
        };
      }
    }
  }

  // Fallback: If no valid logo pulled from company name input, stick to blue default theme.
  return DEFAULT_BRAND_GRADIENT;
};
