export const parseNaturalLanguage = (text) => {
  const lower = text.toLowerCase();
  
  let targetLeaves = null;
  let targetDuration = null;
  let targetMonth = null;

  const wordsToNumbers = {
    one: 1, two: 2, three: 3, four: 4, five: 5, 
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  // Convert words to numbers for easier regex
  let normalizedText = lower;
  for (const [word, num] of Object.entries(wordsToNumbers)) {
    normalizedText = normalizedText.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
  }

  // Look for target duration ("3 day trip", "4 days")
  const durationMatch = normalizedText.match(/(\d+)\s*(day|trip|break)/);
  if (durationMatch) {
    targetDuration = parseInt(durationMatch[1], 10);
  }

  // Look for target leaves ("3 leaves", "2 leave")
  const leavesMatch = normalizedText.match(/(\d+)\s*(leave)/);
  if (leavesMatch) {
    targetLeaves = parseInt(leavesMatch[1], 10);
  }

  // Extract Month
  const months = [
    { name: 'january', short: 'jan', val: '0' },
    { name: 'february', short: 'feb', val: '1' },
    { name: 'march', short: 'mar', val: '2' },
    { name: 'april', short: 'apr', val: '3' },
    { name: 'may', short: 'may', val: '4' },
    { name: 'june', short: 'jun', val: '5' },
    { name: 'july', short: 'jul', val: '6' },
    { name: 'august', short: 'aug', val: '7' },
    { name: 'september', short: 'sept', val: '8' },
    { name: 'october', short: 'oct', val: '9' },
    { name: 'november', short: 'nov', val: '10' },
    { name: 'december', short: 'dec', val: '11' }
  ];

  for (const m of months) {
    const regex = new RegExp(`\\b${m.name}\\b|\\b${m.short}\\b`, 'i');
    if (regex.test(normalizedText)) {
      targetMonth = m.val;
      break;
    }
  }

  return { targetLeaves, targetDuration, targetMonth };
};
