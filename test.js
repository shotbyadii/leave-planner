import { publicHolidays, isWeekend } from './src/data/holidays.js';
import { findOptimalWindows } from './src/utils/leaveOptimizer.js';
import { destinations, calculateDistance, categorizeDistance } from './src/data/destinationIntelligence.js';

const targetLeaves = 5;
const bookedDates = [];
let windows = findOptimalWindows({ targetLeaves, targetDuration: null, targetMonth: 'all', bookedDates }).slice(0, 15);
console.log(`Found ${windows.length} windows.`);

const currentOrigin = { lat: 12.9716, lon: 77.5946 };
const passport = 'IN';
const destType = 'all';
const destMap = new Map();

for (const w of windows) {
  const startMonth = w.startDate.getMonth();
  destinations
    .filter(d => destType === 'all' || d.type === destType)
    .forEach(d => {
      const distance = calculateDistance(currentOrigin.lat, currentOrigin.lon, d.coordinates.lat, d.coordinates.lon);
      const travelCategory = categorizeDistance(distance);
      
      let seasonMatch = 'Peak (Expensive)';
      let score = 0;
      if (d.offSeasonMonths.includes(startMonth)) { seasonMatch = 'Off-Season (Cheap)'; score += 10; }
      else if (d.shoulderMonths.includes(startMonth)) { seasonMatch = 'Shoulder Season (Good Value)'; score += 5; }

      const visa = d.visaRules[passport] || 'visa-required';
      if (visa === 'visa-free' || visa === 'domestic') score += 5;

      score += 5;

      if (travelCategory === 'Long Haul Flight' && w.totalDaysOff < 7) score -= 15;

      if (score > -10) {
         const windowData = { window: w, seasonMatch, score, travelCategory };
         if (!destMap.has(d.id)) {
           destMap.set(d.id, { ...d, distance, visa, allWindows: [windowData] });
         } else {
           destMap.get(d.id).allWindows.push(windowData);
         }
      }
    });
}

console.log(`destMap size: ${destMap.size}`);

let bestDests = Array.from(destMap.values()).map(d => {
   d.allWindows.sort((a, b) => b.score - a.score);
   return { ...d, bestScore: d.allWindows[0].score };
}).sort((a, b) => b.bestScore - a.bestScore);

console.log(`bestDests length: ${bestDests.length}`);
if (bestDests.length > 0) {
  console.log(`Top Dest: ${bestDests[0].name} with score ${bestDests[0].bestScore}`);
}
