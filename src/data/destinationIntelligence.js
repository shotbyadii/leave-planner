export const destinations = [
  // Domestic (India)
  {
    id: 'goa-india',
    name: 'Goa',
    country: 'India',
    type: 'domestic',
    coordinates: { lat: 15.2993, lon: 74.1240 },
    peakMonths: [10, 11, 0, 1],
    shoulderMonths: [2, 9],
    offSeasonMonths: [3, 4, 5, 6, 7, 8], // Monsoon / Hot
    budgetTier: '$$',
    tags: ['Beach', 'Party', 'Relaxation'],
    visaRules: { 'IN': 'domestic', 'US': 'e-visa', 'EU': 'e-visa' }
  },
  {
    id: 'manali-india',
    name: 'Manali',
    country: 'India',
    type: 'domestic',
    coordinates: { lat: 32.2396, lon: 77.1887 },
    peakMonths: [4, 5, 11, 0],
    shoulderMonths: [2, 3, 9, 10],
    offSeasonMonths: [6, 7, 8], // Monsoon
    budgetTier: '$',
    tags: ['Mountains', 'Adventure', 'Snow'],
    visaRules: { 'IN': 'domestic', 'US': 'e-visa', 'EU': 'e-visa' }
  },
  {
    id: 'jaipur-india',
    name: 'Jaipur',
    country: 'India',
    type: 'domestic',
    coordinates: { lat: 26.9124, lon: 75.7873 },
    peakMonths: [9, 10, 11, 0, 1],
    shoulderMonths: [2, 8],
    offSeasonMonths: [3, 4, 5, 6, 7], // Very hot Summer
    budgetTier: '$',
    tags: ['Culture', 'History', 'City'],
    visaRules: { 'IN': 'domestic', 'US': 'e-visa', 'EU': 'e-visa' }
  },
  {
    id: 'munnar-india',
    name: 'Munnar',
    country: 'India',
    type: 'domestic',
    coordinates: { lat: 10.0889, lon: 77.0595 },
    peakMonths: [8, 9, 10, 11, 0, 1],
    shoulderMonths: [2, 7],
    offSeasonMonths: [3, 4, 5, 6], // Monsoon/Summer
    budgetTier: '$$',
    tags: ['Nature', 'Relaxation', 'Tea Gardens'],
    visaRules: { 'IN': 'domestic', 'US': 'e-visa', 'EU': 'e-visa' }
  },
  {
    id: 'kerala-backwaters',
    name: 'Alappuzha',
    country: 'India',
    type: 'domestic',
    coordinates: { lat: 9.4981, lon: 76.3388 },
    peakMonths: [10, 11, 0, 1, 2],
    shoulderMonths: [9, 3],
    offSeasonMonths: [4, 5, 6, 7, 8],
    budgetTier: '$$',
    tags: ['Nature', 'Relaxation', 'Water'],
    visaRules: { 'IN': 'domestic', 'US': 'e-visa', 'EU': 'e-visa' }
  },
  {
    id: 'andaman-islands',
    name: 'Andaman Islands',
    country: 'India',
    type: 'domestic',
    coordinates: { lat: 11.7401, lon: 92.6586 },
    peakMonths: [10, 11, 0, 1, 2, 3],
    shoulderMonths: [4, 9],
    offSeasonMonths: [5, 6, 7, 8], // Heavy monsoon
    budgetTier: '$$$',
    tags: ['Beach', 'Scuba', 'Nature'],
    visaRules: { 'IN': 'domestic', 'US': 'e-visa', 'EU': 'e-visa' }
  },

  // International - Short Haul (from India)
  {
    id: 'bali-indonesia',
    name: 'Bali',
    country: 'Indonesia',
    type: 'international',
    coordinates: { lat: -8.4095, lon: 115.1889 },
    peakMonths: [6, 7, 11],
    shoulderMonths: [3, 4, 8, 9],
    offSeasonMonths: [0, 1, 2, 10], // Rainy season
    budgetTier: '$$',
    tags: ['Beach', 'Culture', 'Nature'],
    visaRules: { 'IN': 'visa-on-arrival', 'US': 'visa-on-arrival', 'EU': 'visa-on-arrival' }
  },
  {
    id: 'dubai-uae',
    name: 'Dubai',
    country: 'United Arab Emirates',
    type: 'international',
    coordinates: { lat: 25.2048, lon: 55.2708 },
    peakMonths: [10, 11, 0, 1, 2],
    shoulderMonths: [9, 3],
    offSeasonMonths: [4, 5, 6, 7, 8], // Extreme heat
    budgetTier: '$$$',
    tags: ['City', 'Shopping', 'Luxury'],
    visaRules: { 'IN': 'e-visa', 'US': 'visa-free', 'EU': 'visa-free' }
  },
  {
    id: 'bangkok-thailand',
    name: 'Bangkok',
    country: 'Thailand',
    type: 'international',
    coordinates: { lat: 13.7563, lon: 100.5018 },
    peakMonths: [10, 11, 0, 1],
    shoulderMonths: [2, 3, 9],
    offSeasonMonths: [4, 5, 6, 7, 8], // Rainy season
    budgetTier: '$',
    tags: ['City', 'Food', 'Culture'],
    visaRules: { 'IN': 'visa-free', 'US': 'visa-free', 'EU': 'visa-free' }
  },
  {
    id: 'colombo-srilanka',
    name: 'Colombo',
    country: 'Sri Lanka',
    type: 'international',
    coordinates: { lat: 6.9271, lon: 79.8612 },
    peakMonths: [11, 0, 1, 2],
    shoulderMonths: [3, 8, 9, 10],
    offSeasonMonths: [4, 5, 6, 7], // Monsoon
    budgetTier: '$',
    tags: ['Beach', 'Nature', 'Culture'],
    visaRules: { 'IN': 'e-visa', 'US': 'e-visa', 'EU': 'e-visa' }
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    type: 'international',
    coordinates: { lat: 1.3521, lon: 103.8198 },
    peakMonths: [11, 0, 1, 5, 6],
    shoulderMonths: [2, 3, 4, 7, 8, 9, 10],
    offSeasonMonths: [], // Year-round destination
    budgetTier: '$$$',
    tags: ['City', 'Shopping', 'Food'],
    visaRules: { 'IN': 'e-visa', 'US': 'visa-free', 'EU': 'visa-free' }
  },
  {
    id: 'maldives',
    name: 'Malé',
    country: 'Maldives',
    type: 'international',
    coordinates: { lat: 4.1755, lon: 73.5093 },
    peakMonths: [11, 0, 1, 2, 3],
    shoulderMonths: [4, 10],
    offSeasonMonths: [5, 6, 7, 8, 9], // Monsoon
    budgetTier: '$$$',
    tags: ['Beach', 'Luxury', 'Relaxation'],
    visaRules: { 'IN': 'visa-on-arrival', 'US': 'visa-on-arrival', 'EU': 'visa-on-arrival' }
  },

  // International - Medium/Long Haul
  {
    id: 'paris-france',
    name: 'Paris',
    country: 'France',
    type: 'international',
    coordinates: { lat: 48.8566, lon: 2.3522 },
    peakMonths: [5, 6, 7, 8],
    shoulderMonths: [3, 4, 9],
    offSeasonMonths: [10, 11, 0, 1, 2], // Cold winter
    budgetTier: '$$$',
    tags: ['City', 'Romance', 'Culture'],
    visaRules: { 'IN': 'visa-required', 'US': 'visa-free', 'EU': 'domestic' }
  },
  {
    id: 'tokyo-japan',
    name: 'Tokyo',
    country: 'Japan',
    type: 'international',
    coordinates: { lat: 35.6762, lon: 139.6503 },
    peakMonths: [2, 3, 9, 10], // Cherry blossom & autumn
    shoulderMonths: [4, 8, 11],
    offSeasonMonths: [0, 1, 5, 6, 7], // Cold winter / Humid summer
    budgetTier: '$$$',
    tags: ['City', 'Food', 'Technology'],
    visaRules: { 'IN': 'e-visa', 'US': 'visa-free', 'EU': 'visa-free' }
  },
  {
    id: 'london-uk',
    name: 'London',
    country: 'United Kingdom',
    type: 'international',
    coordinates: { lat: 51.5074, lon: -0.1278 },
    peakMonths: [5, 6, 7, 8, 11],
    shoulderMonths: [3, 4, 9, 10],
    offSeasonMonths: [0, 1, 2], // Cold winter
    budgetTier: '$$$',
    tags: ['City', 'History', 'Culture'],
    visaRules: { 'IN': 'visa-required', 'US': 'visa-free', 'EU': 'visa-free' }
  },
  {
    id: 'newyork-usa',
    name: 'New York City',
    country: 'USA',
    type: 'international',
    coordinates: { lat: 40.7128, lon: -74.0060 },
    peakMonths: [5, 6, 8, 9, 11],
    shoulderMonths: [3, 4, 7, 10],
    offSeasonMonths: [0, 1, 2], // Freezing winter
    budgetTier: '$$$',
    tags: ['City', 'Entertainment', 'Shopping'],
    visaRules: { 'IN': 'visa-required', 'US': 'domestic', 'EU': 'e-visa' }
  },
  {
    id: 'zurich-switzerland',
    name: 'Zurich',
    country: 'Switzerland',
    type: 'international',
    coordinates: { lat: 47.3769, lon: 8.5417 },
    peakMonths: [5, 6, 7, 8, 11, 0], // Summer & Ski Winter
    shoulderMonths: [4, 9, 10],
    offSeasonMonths: [1, 2, 3], // Mud season
    budgetTier: '$$$',
    tags: ['Mountains', 'Nature', 'Luxury'],
    visaRules: { 'IN': 'visa-required', 'US': 'visa-free', 'EU': 'visa-free' }
  }
];

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const categorizeDistance = (distanceKm) => {
  if (distanceKm < 800) return 'Drive / Transit';
  if (distanceKm < 3500) return 'Short Haul Flight';
  return 'Long Haul Flight';
};
