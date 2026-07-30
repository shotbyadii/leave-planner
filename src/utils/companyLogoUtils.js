/**
 * Utility to extract domain from company input and return automagical logo URLs.
 */
export const getCompanyLogoUrl = (companyInput) => {
  if (!companyInput || typeof companyInput !== 'string') return null;

  const trimmed = companyInput.trim().toLowerCase();
  if (!trimmed) return null;

  // If already a full http/https URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Extract domain pattern (e.g., google.com or google)
  let domain = trimmed;
  if (!domain.includes('.')) {
    // Standard company name without dot: append .com for logo lookup (e.g. microsoft -> microsoft.com)
    domain = `${domain.replace(/\s+/g, '')}.com`;
  }

  // Return Google Favicon / Clearbit high-res logo URL
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
};
