/**
 * Gemini AI Assistant Service
 * Provides natural language trip planning, leave booking, WFH logging, and schedule intelligence.
 */
import { publicHolidays, isWeekend, isHoliday } from '../data/holidays';
import { findOptimalWindows } from '../utils/leaveOptimizer';
import { parseNaturalLanguage } from '../utils/nlpParser';

export const extractDatesFromNaturalText = (text, todayStr = new Date().toISOString().split('T')[0]) => {
  if (!text || typeof text !== 'string') return null;
  const msg = text.toLowerCase();
  const today = new Date(todayStr);

  // Check relative days
  if (/\bday after tomorrow\b/i.test(msg)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    const dStr = d.toISOString().split('T')[0];
    return { startDate: dStr, endDate: dStr, dates: [dStr] };
  }
  if (/\btomorrow\b/i.test(msg)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    const dStr = d.toISOString().split('T')[0];
    return { startDate: dStr, endDate: dStr, dates: [dStr] };
  }
  if (/\btoday\b/i.test(msg)) {
    return { startDate: todayStr, endDate: todayStr, dates: [todayStr] };
  }

  const monthsMap = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  // Pattern 1: ISO dates like 2026-08-25
  const isoMatch = msg.match(/\b(202[5-7])-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const dStr = `2026-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
    return { startDate: dStr, endDate: dStr, dates: [dStr] };
  }

  // Pattern 2: "the 25th of august", "25th august", "25 aug", "25th of aug"
  const dayOfMonthMatch = msg.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i);
  if (dayOfMonthMatch) {
    const day = parseInt(dayOfMonthMatch[1], 10);
    const mNum = monthsMap[dayOfMonthMatch[2].toLowerCase()];
    if (day >= 1 && day <= 31 && mNum) {
      const dStr = `2026-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { startDate: dStr, endDate: dStr, dates: [dStr] };
    }
  }

  // Pattern 3: "august 25th", "aug 25", "august 25"
  const monthDayMatch = msg.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (monthDayMatch) {
    const mNum = monthsMap[monthDayMatch[1].toLowerCase()];
    const day = parseInt(monthDayMatch[2], 10);
    if (day >= 1 && day <= 31 && mNum) {
      const dStr = `2026-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { startDate: dStr, endDate: dStr, dates: [dStr] };
    }
  }

  return null;
};

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Recommended',
    description: 'Balanced, fast and intelligent. Default choice for leave and trip optimization.',
    speed: 'Ultra Fast',
    tier: 'Free / Pay-as-you-go'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Highest Intelligence',
    description: 'Deepest reasoning & multi-step trip planning for complex scheduling constraints.',
    speed: 'Standard',
    tier: 'Pay-as-you-go / Pro'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    badge: 'High RPM',
    description: 'Lightweight & instant responses with lowest quota consumption.',
    speed: 'Instant',
    tier: 'Free / Pay-as-you-go'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'Stable',
    description: 'Proven multimodal speed and reliability across large queries.',
    speed: 'Very Fast',
    tier: 'Free / Pay-as-you-go'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'Fallback',
    description: 'Reliable fallback model with high token limits and legacy support.',
    speed: 'Fast',
    tier: 'Free / Pay-as-you-go'
  }
];

export const getStoredGeminiModel = () => {
  if (typeof window === 'undefined') return 'gemini-2.5-flash';
  return localStorage.getItem('gemini_preferred_model') || 'gemini-2.5-flash';
};

export const setStoredGeminiModel = (modelId) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('gemini_preferred_model', modelId);
};

export const getStoredGeminiApiKey = () => {
  if (typeof window === 'undefined') return '';
  if (localStorage.getItem('gemini_api_key_cleared') === 'true') {
    return '';
  }
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  return '';
};

export const setStoredGeminiApiKey = (key) => {
  if (typeof window === 'undefined') return;
  const trimmed = (key || '').trim();
  if (!trimmed) {
    localStorage.removeItem('gemini_api_key');
    localStorage.setItem('gemini_api_key', '');
    localStorage.setItem('gemini_api_key_cleared', 'true');
  } else {
    localStorage.setItem('gemini_api_key', trimmed);
    localStorage.removeItem('gemini_api_key_cleared');
  }
  try {
    window.dispatchEvent(new CustomEvent('gemini-key-changed', { detail: { hasKey: Boolean(trimmed) } }));
  } catch (e) {}
};

export const hasGeminiApiKey = () => {
  return Boolean(getStoredGeminiApiKey());
};

/**
 * Builds the system prompt with live application context.
 */
const buildSystemPrompt = (context = {}) => {
  const {
    todayStr = new Date().toISOString().split('T')[0],
    leaves = {
      pl: { total: 15, used: 0 },
      el: { total: 10, used: 0 },
      rh: { total: 1, used: 0 },
      wfh: { total: 10, used: 0 }
    },
    leaveNames = {
      pl: 'Planned Leave',
      el: 'Emergency Leave',
      rh: 'Restricted Holiday',
      wfh: 'Work From Home'
    },
    bookedDates = [],
    leavePlans = []
  } = context;

  const holidaysListStr = publicHolidays
    .map(h => `- ${h.date}: ${h.name}`)
    .join('\n');

  const bookedLeavesStr = bookedDates.length > 0
    ? bookedDates.map(b => {
        const dStr = typeof b === 'string' ? b : b?.date;
        const typeStr = typeof b === 'object' ? (b?.type || 'PL') : 'PL';
        const reasonStr = typeof b === 'object' ? (b?.reason || 'Booked') : 'Booked';
        return `- ${dStr}: ${typeStr.toUpperCase()} (${reasonStr})`;
      }).join('\n')
    : 'None currently booked';

  const leavePlansStr = leavePlans.length > 0
    ? leavePlans.map(p => `- ${p.name || 'Plan'}: ${p.dates?.join(', ')} (${p.type?.toUpperCase()})`).join('\n')
    : 'None currently created';

  return `You are "Leave Assistant", an intelligent personal vacation and leave planner for 2026.
Your goal is to provide concise, actionable schedule intelligence with MINIMAL TEXT and MAXIMUM VISUAL CARDS.

### CURRENT CONTEXT (YEAR 2026):
- Today's Date: ${todayStr}
- Quotas & Balances:
  * ${leaveNames.pl || 'Planned Leave'} (PL): Total ${leaves.pl?.total || 15}, Used ${leaves.pl?.used || 0}, Remaining ${(leaves.pl?.total || 15) - (leaves.pl?.used || 0)}
  * ${leaveNames.el || 'Emergency Leave'} (EL): Total ${leaves.el?.total || 10}, Used ${leaves.el?.used || 0}, Remaining ${(leaves.el?.total || 10) - (leaves.el?.used || 0)}
  * ${leaveNames.rh || 'Restricted Holiday'} (RH): Total ${leaves.rh?.total || 1}, Used ${leaves.rh?.used || 0}, Remaining ${(leaves.rh?.total || 1) - (leaves.rh?.used || 0)}
  * ${leaveNames.wfh || 'Work From Home'} (WFH): Total ${leaves.wfh?.total || 10}/month, Used ${leaves.wfh?.used || 0}, Remaining ${(leaves.wfh?.total || 10) - (leaves.wfh?.used || 0)}

### 2026 PUBLIC HOLIDAYS:
${holidaysListStr}

### EXISTING BOOKINGS & PLANS:
Booked Dates:
${bookedLeavesStr}

Existing Plans:
${leavePlansStr}

### INSTRUCTIONS:
1. ULTRA-CONCISE RESPONSES: Keep your text reply to 1-2 short sentences maximum. Never write lengthy paragraphs.
2. RECOMMENDATIONS & TRIPS: When asked if a trip is possible in any month or with low leaves, find the most optimal long weekend/holiday window, explain it in 1 short sentence, and stage it as a "stage_plan" action so the user gets an actionable card and immediate calendar focus!
3. BOOKED LEAVES & MONTHLY INQUIRIES: You HAVE ACCESS to all of the user's booked dates in the "EXISTING BOOKINGS & PLANS" section. When asked "what leaves did I take/book in [Month]?", "leaves in July", etc. (even with typos like "th eleave si took injuly"), filter the booked dates for that month in 2026, answer in 1 short sentence, and return those matching dates in the "bookedLeaves" array so the UI renders interactive cards. If none are booked in that month, state "You have no leaves booked in [Month]." NEVER claim you cannot see their leaves!
4. HOLIDAY QUERIES: When asked about holidays (e.g. "When is Diwali?", "Holidays in Oct"), return matching holidays in the "holidays" array with name and date (YYYY-MM-DD in 2026).
5. SINGLE LEAVE BOOKINGS: When asked to mark or book a single date, stage a "stage_leave" action.
6. WORK FROM HOME: When asked to mark WFH, stage a "log_wfh" action.
7. CANCELLATIONS & DELETIONS: When asked to delete, cancel, or remove booked leaves or plans, stage a "cancel_leave" action with the dates array and planName.
8. LEAVE BALANCE QUERIES: Whenever the user asks about remaining leaves or quota, include the "balances" object in your response JSON so the UI renders interactive visual balance progress bars.
9. STRICT QUOTA ENFORCEMENT: Never propose or stage a "stage_leave" or "stage_plan" action if the user has 0 remaining balance for that leave type (or if required days exceed remaining balance). In that case, set "action": "none" and inform the user that their leave balance is exhausted/insufficient.
10. ALWAYS respond with valid JSON adhering to the schema below.

### RESPONSE JSON SCHEMA:
{
  "reply": "Short 1-2 sentence explanation",
  "action": "stage_plan" | "stage_leave" | "log_wfh" | "cancel_leave" | "none",
  "details": {
    "planName": "String (e.g. Diwali Long Weekend)",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "leaveType": "pl" | "el" | "rh" | "wfh",
    "dates": ["YYYY-MM-DD", ...],
    "leaveDaysCost": Number,
    "totalSpanDays": Number,
    "note": "String"
  },
  "holidays": [
    { "name": "String", "date": "YYYY-MM-DD" }
  ],
  "bookedLeaves": [
    { "date": "YYYY-MM-DD", "type": "pl" | "el" | "rh" | "wfh" }
  ],
  "balances": {
    "pl": { "remaining": Number, "total": Number },
    "el": { "remaining": Number, "total": Number },
    "rh": { "remaining": Number, "total": Number },
    "wfh": { "remaining": Number, "total": Number }
  }
}

If no action is needed, set "action": "none" and "details": null.
If holidays are not queried/relevant, set "holidays": null.
If booked leaves are not queried/relevant, set "bookedLeaves": null.
If balances are not queried/relevant, set "balances": null.`;
};

/**
 * Sends a chat message to Gemini API with conversational history and application context.
 */
export const queryGeminiAssistant = async ({ message, history = [], context = {}, customApiKey = '' }) => {
  const apiKey = (customApiKey || getStoredGeminiApiKey()).trim();

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const systemInstruction = buildSystemPrompt(context);

  // Convert chat history into Gemini contents format
  const formattedContents = [];

  // Add past conversation turns
  for (const turn of history) {
    if (turn.role === 'user') {
      formattedContents.push({
        role: 'user',
        parts: [{ text: turn.text }]
      });
    } else if (turn.role === 'model' || turn.role === 'assistant') {
      formattedContents.push({
        role: 'model',
        parts: [{ text: typeof turn.rawReply === 'string' ? turn.rawReply : turn.text }]
      });
    }
  }

  // Add the current user query
  formattedContents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  let lastError = null;

  const preferredModel = getStoredGeminiModel();
  const allModelIds = AVAILABLE_MODELS.map(m => m.id);
  const modelsToTry = [
    preferredModel,
    ...allModelIds.filter(m => m !== preferredModel)
  ];

  for (const modelName of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const payload = {
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMessage = errJson?.error?.message || response.statusText;

        if (response.status === 400 || response.status === 401 || response.status === 403) {
          throw new Error(`API_KEY_INVALID: ${errMessage}`);
        }
        throw new Error(`Model ${modelName} error (${response.status}): ${errMessage}`);
      }

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error('Received empty response from Gemini API.');
      }

      // Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        // Fallback: extract JSON from markdown code block
        const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          parsed = JSON.parse(match[1]);
        } else {
          parsed = {
            reply: responseText,
            action: 'none',
            details: null
          };
        }
      }

      // Sanitize / normalize action dates
      let sanitizedDetails = parsed.details || null;
      if (sanitizedDetails) {
        const normalizeIsoDate = (d) => {
          if (!d || typeof d !== 'string') return d;
          let s = d.trim();
          if (s.startsWith('2025-')) s = s.replace('2025-', '2026-');
          return s;
        };
        if (sanitizedDetails.startDate) sanitizedDetails.startDate = normalizeIsoDate(sanitizedDetails.startDate);
        if (sanitizedDetails.endDate) sanitizedDetails.endDate = normalizeIsoDate(sanitizedDetails.endDate);
        if (Array.isArray(sanitizedDetails.dates)) {
          sanitizedDetails.dates = sanitizedDetails.dates.map(normalizeIsoDate);
        }
      }

      // Holiday extraction fallback if user asked about holidays and LLM didn't return list
      let resolvedHolidays = parsed.holidays || null;
      const isHolidayQuery = /(holiday|holidays|diwali|christmas|eid|republic|independence|gandhi|holi|good friday|dussehra|long weekend|pongal|onam|raksha)/i.test(message);
      if (!resolvedHolidays && isHolidayQuery) {
        const holidaysSource = (context.holidays && context.holidays.length > 0) ? context.holidays : PUBLIC_HOLIDAYS_2026;
        const msgLower = message.toLowerCase();
        const matches = holidaysSource.filter(h => {
          const nameMatch = h.name && msgLower.includes(h.name.toLowerCase().split(' ')[0]);
          const monthMatches = [
            'january', 'february', 'march', 'april', 'may', 'june', 
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          const foundMonthIdx = monthMatches.findIndex(m => msgLower.includes(m));
          const monthMatch = foundMonthIdx !== -1 && h.date && h.date.startsWith(`2026-${String(foundMonthIdx + 1).padStart(2, '0')}`);
          return nameMatch || monthMatch;
        });
        if (matches.length > 0) {
          resolvedHolidays = matches.slice(0, 4).map(h => ({ name: h.name, date: h.date }));
        }
      }

      // Compute accurate balances directly from context and bookedDates
      const currentTodayStr = context.todayStr || new Date().toISOString().split('T')[0];
      const currentMonthPrefix = currentTodayStr.substring(0, 7);
      const calculatedWfhUsed = (context.bookedDates || []).filter(b => {
        const bType = typeof b === 'object' ? b.type : null;
        const bDate = typeof b === 'object' ? b.date : (typeof b === 'string' ? b : '');
        return bType === 'wfh' && bDate.startsWith(currentMonthPrefix);
      }).length;

      const wfhTotal = context.leaves?.wfh?.total ?? parseInt(localStorage.getItem('quota_wfh') || '10', 10);
      const wfhUsed = (context.leaves?.wfh?.used !== undefined && context.leaves.wfh.used !== 0)
        ? context.leaves.wfh.used
        : calculatedWfhUsed;
      const wfhRemaining = Math.max(0, wfhTotal - wfhUsed);

      let resolvedBalances = parsed.balances || null;
      const isLeaveQuery = /(balance|quota|leaves|leave|how many|my leaves|what do my|remaining|used|booked)/i.test(message) ||
                           /(balance|quota|leaves|remaining)/i.test(parsed.reply || '');
      
      if (isLeaveQuery && context.leaves) {
        resolvedBalances = {
          pl: { 
            total: context.leaves.pl?.total ?? 15, 
            remaining: Math.max(0, (context.leaves.pl?.total ?? 15) - (context.leaves.pl?.used ?? 0)) 
          },
          el: { 
            total: context.leaves.el?.total ?? 10, 
            remaining: Math.max(0, (context.leaves.el?.total ?? 10) - (context.leaves.el?.used ?? 0)) 
          },
          rh: { 
            total: context.leaves.rh?.total ?? 1, 
            remaining: Math.max(0, (context.leaves.rh?.total ?? 1) - (context.leaves.rh?.used ?? 0)) 
          },
          wfh: { 
            total: wfhTotal, 
            remaining: wfhRemaining 
          }
        };
      }

      // Check for month-specific booked leaves query (e.g. "leaves in July", "give a summary of my leaves in july")
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june', 
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const monthRegexes = [
        /\b(in\s*)?(january|jan)\b/i,
        /\b(in\s*)?(february|feb)\b/i,
        /\b(in\s*)?(march|mar)\b/i,
        /\b(in\s*)?(april|apr)\b/i,
        /\b(in\s*)?(may)\b/i,
        /\b(in\s*)?(june|jun)\b/i,
        /\b(in\s*)?(july|jul)\b/i,
        /\b(in\s*)?(august|aug)\b/i,
        /\b(in\s*)?(september|sep|sept)\b/i,
        /\b(in\s*)?(october|oct)\b/i,
        /\b(in\s*)?(november|nov)\b/i,
        /\b(in\s*)?(december|dec)\b/i,
      ];
      
      let queriedMonthIdx = -1;
      for (let i = 0; i < monthRegexes.length; i++) {
        if (monthRegexes[i].test(message)) {
          queriedMonthIdx = i;
          break;
        }
      }
      if (queriedMonthIdx === -1) {
        const normalizedMsg = message.toLowerCase().replace(/\s+/g, '');
        for (let i = 0; i < monthNames.length; i++) {
          if (normalizedMsg.includes(`in${monthNames[i]}`) || normalizedMsg.includes(`in${monthNames[i].substring(0, 3)}`)) {
            queriedMonthIdx = i;
            break;
          }
        }
      }

      let finalReply = parsed.reply || "Here's what I found for you.";
      let bookedLeavesList = (parsed.bookedLeaves && parsed.bookedLeaves.length > 0) ? parsed.bookedLeaves : null;

      const isMonthlyLeaveQuery = queriedMonthIdx !== -1;
      const isExplicitBookedQuery = /(which dates|what dates|list booked|show booked|booked dates|my booked dates|my schedule|my trips|what leaves have i booked|leaves i took|leaves took|eleave|summary of my leaves)/i.test(message);

      // Check for user-defined leave plans in this month
      let monthPlans = null;
      if (queriedMonthIdx !== -1 && context.leavePlans && context.leavePlans.length > 0) {
        const monthPrefix = `2026-${String(queriedMonthIdx + 1).padStart(2, '0')}`;
        const found = context.leavePlans.filter(p => {
          const s = p.startDate || p.start_date || '';
          const e = p.endDate || p.end_date || s;
          const hasDateInMonth = Array.isArray(p.dates) && p.dates.some(d => d && d.startsWith(monthPrefix));
          return (s && s.startsWith(monthPrefix)) || (e && e.startsWith(monthPrefix)) || hasDateInMonth;
        });
        if (found.length > 0) monthPlans = found;
      }

      if ((isMonthlyLeaveQuery || isExplicitBookedQuery) && context.bookedDates && context.bookedDates.length > 0) {
        if (queriedMonthIdx !== -1) {
          const monthPrefix = `2026-${String(queriedMonthIdx + 1).padStart(2, '0')}`;
          const monthMatches = (context.bookedDates || []).filter(b => {
            const d = typeof b === 'string' ? b : b?.date;
            const t = typeof b === 'object' ? b?.type : 'pl';
            return d && d.startsWith(monthPrefix) && t !== 'wfh' && t !== 'office';
          });
          const monthTitle = monthNames[queriedMonthIdx].charAt(0).toUpperCase() + monthNames[queriedMonthIdx].slice(1);

          // Exclude dates that belong to monthPlans
          const unplannedLeaves = monthMatches.filter(b => {
            const dStr = typeof b === 'string' ? b : b?.date;
            if (!monthPlans || monthPlans.length === 0) return true;
            const belongsToPlan = monthPlans.some(p => {
              if (Array.isArray(p.dates) && p.dates.includes(dStr)) return true;
              const s = p.startDate || p.start_date;
              const e = p.endDate || p.end_date || s;
              return s && e && dStr >= s && dStr <= e;
            });
            return !belongsToPlan;
          });

          if (monthPlans && monthPlans.length > 0) {
            bookedLeavesList = unplannedLeaves.length > 0 ? unplannedLeaves : null;
            if (unplannedLeaves.length > 0) {
              finalReply = `You have ${monthPlans.length} planned trip${monthPlans.length > 1 ? 's' : ''} and ${unplannedLeaves.length} other leave day${unplannedLeaves.length > 1 ? 's' : ''} in ${monthTitle} 2026.`;
            } else {
              finalReply = `You have ${monthPlans.length} planned trip${monthPlans.length > 1 ? 's' : ''} in ${monthTitle} 2026.`;
            }
          } else if (monthMatches.length > 0) {
            bookedLeavesList = monthMatches;
            finalReply = `You have ${monthMatches.length} leave day${monthMatches.length > 1 ? 's' : ''} booked in ${monthTitle} 2026.`;
          } else {
            bookedLeavesList = null;
            finalReply = `You have no leaves booked in ${monthTitle} 2026.`;
          }
        } else if (!bookedLeavesList) {
          // Filter out wfh from general leave listings
          bookedLeavesList = (context.bookedDates || []).filter(b => {
            const t = typeof b === 'object' ? b?.type : 'pl';
            return t !== 'wfh' && t !== 'office';
          });
        }
      }

      return {
        reply: finalReply,
        action: parsed.action || 'none',
        details: sanitizedDetails,
        holidays: resolvedHolidays,
        balances: resolvedBalances,
        bookedLeaves: bookedLeavesList,
        leavePlans: monthPlans,
        rawReply: responseText,
        modelUsed: modelName
      };

    } catch (err) {
      lastError = err;
      if (err.message?.startsWith('API_KEY_INVALID')) {
        throw err;
      }
      console.warn(`[AiAssistantService] Model ${modelName} failed, attempting fallback...`, err);
    }
  }

  // Graceful local fallback for actions, trips, leaves, schedule & balance queries
  if (context) {
    const currentTodayStr = context.todayStr || new Date().toISOString().split('T')[0];

    // 1. CANCELLATION / DELETION INTENT
    const isDeleteIntent = /\b(delete|cancel|remove|drop|unbook|clear|discard)\b/i.test(message);
    if (isDeleteIntent) {
      const lowerMsg = message.toLowerCase();
      // Check if user mentioned an existing plan name
      const matchingPlan = (context.leavePlans || []).find(p => {
        const pName = (p.name || '').toLowerCase();
        return pName && lowerMsg.includes(pName);
      });
      if (matchingPlan) {
        const s = matchingPlan.startDate || matchingPlan.start_date;
        const e = matchingPlan.endDate || matchingPlan.end_date || s;
        const planDates = matchingPlan.dates && matchingPlan.dates.length > 0 ? matchingPlan.dates : [s, e].filter(Boolean);
        return {
          reply: `I've staged the cancellation of your "${matchingPlan.name}" plan.`,
          action: 'cancel_leave',
          details: {
            planName: matchingPlan.name,
            dates: planDates,
            startDate: s,
            endDate: e
          },
          holidays: null,
          balances: null,
          bookedLeaves: null,
          leavePlans: null,
          rawReply: '',
          modelUsed: 'local-fallback'
        };
      }

      // Check if a specific date was mentioned to cancel
      const dateExtraction = extractDatesFromNaturalText(message, currentTodayStr);
      if (dateExtraction && dateExtraction.startDate) {
        const dObj = new Date(dateExtraction.startDate);
        const dFmt = !isNaN(dObj.getTime())
          ? dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : dateExtraction.startDate;
        return {
          reply: `I've staged the cancellation of your leave on ${dFmt}.`,
          action: 'cancel_leave',
          details: {
            dates: dateExtraction.dates || [dateExtraction.startDate],
            startDate: dateExtraction.startDate,
            endDate: dateExtraction.endDate || dateExtraction.startDate
          },
          holidays: null,
          balances: null,
          bookedLeaves: null,
          leavePlans: null,
          rawReply: '',
          modelUsed: 'local-fallback'
        };
      }
    }

    // 2. WFH LOGGING INTENT
    const isWfhIntent = /\b(wfh|work from home|working from home|work from my home|home tomorrow)\b/i.test(message);
    if (isWfhIntent) {
      const dateExtraction = extractDatesFromNaturalText(message, currentTodayStr) || { startDate: currentTodayStr, endDate: currentTodayStr, dates: [currentTodayStr] };
      const dStr = dateExtraction.startDate;
      const dObj = new Date(dStr);
      const dFmt = !isNaN(dObj.getTime())
        ? dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : dStr;
      return {
        reply: `I've staged Work From Home for you on ${dFmt}.`,
        action: 'log_wfh',
        details: {
          date: dStr,
          startDate: dStr,
          endDate: dStr,
          dates: [dStr],
          leaveType: 'wfh',
          reason: 'Work From Home',
          daysCount: 1
        },
        holidays: null,
        balances: null,
        bookedLeaves: null,
        leavePlans: null,
        rawReply: '',
        modelUsed: 'local-fallback'
      };
    }

    // 3. CREATE / BOOK SINGLE OR MULTI-DAY LEAVE INTENT
    const isCreateLeaveIntent = /\b(create|book|mark|take|apply|add|put|schedule|set)\b.*\b(leave|off|day off|vacation|time off|break|pl|el|rh)\b/i.test(message) ||
                                /\b(take|book|mark)\s+.*(off|leave)\b/i.test(message) ||
                                /\b(create|book|add|apply)\s+(a\s+)?(leave)\b/i.test(message) ||
                                /\bleave\s+(on|for)\b/i.test(message);
    if (isCreateLeaveIntent) {
      const dateExtraction = extractDatesFromNaturalText(message, currentTodayStr);
      if (dateExtraction && dateExtraction.startDate) {
        let lType = 'pl';
        if (/\b(emergency|el)\b/i.test(message)) lType = 'el';
        else if (/\b(restricted|rh)\b/i.test(message)) lType = 'rh';

        const typeLabel = (context.leaveNames && context.leaveNames[lType]) || (lType === 'pl' ? 'Planned Leave' : lType === 'el' ? 'Emergency Leave' : 'Restricted Holiday');
        const dStr = dateExtraction.startDate;
        const dObj = new Date(dStr);
        const dFmt = !isNaN(dObj.getTime())
        const availableQuota = context.leaves && context.leaves[lType] 
          ? Math.max(0, context.leaves[lType].total - context.leaves[lType].used)
          : 15;
        const neededDays = dateExtraction.dates ? dateExtraction.dates.length : 1;

        if (availableQuota < neededDays) {
          return {
            reply: `You don't have enough ${typeLabel} remaining (${availableQuota} left). You cannot book more leaves beyond your quota limit.`,
            action: 'none',
            details: null,
            holidays: null,
            balances: context.leaves || null,
            bookedLeaves: null,
            leavePlans: null,
            rawReply: '',
            modelUsed: 'local-fallback'
          };
        }

        return {
          reply: `I've staged a ${typeLabel} for you on ${dFmt}.`,
          action: 'stage_leave',
          details: {
            date: dStr,
            startDate: dStr,
            endDate: dateExtraction.endDate || dStr,
            dates: dateExtraction.dates || [dStr],
            leaveType: lType,
            reason: typeLabel,
            daysCount: neededDays,
            leaveDaysCost: neededDays
          },
          holidays: null,
          balances: null,
          bookedLeaves: null,
          leavePlans: null,
          rawReply: '',
          modelUsed: 'local-fallback'
        };
      }
    }

    // 4. TRIP PLANNING / VACATION STAGING INTENT
    const isTripPlanIntent = /\b(plan|suggest|find|best|optimal)\s+.*(trip|vacation|getaway|weekend|days?)/i.test(message);
    if (isTripPlanIntent) {
      const parsedNlp = parseNaturalLanguage(message);
      const targetMonth = parsedNlp.targetMonth !== null ? parseInt(parsedNlp.targetMonth, 10) : 'all';
      const targetDuration = parsedNlp.targetDuration || 4;

      const allHolidays = context.holidays || publicHolidays || [];
      const booked = (context.bookedDates || []).map(b => typeof b === 'string' ? b : b.date);
      const windows = findOptimalWindows({
        targetDuration,
        targetMonth,
        bookedDates: booked
      });

      if (windows && windows.length > 0) {
        const best = windows[0];
        const sObj = new Date(best.startDateStr);
        const eObj = new Date(best.endDateStr);
        const sFmt = sObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const eFmt = eObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const planTitle = best.holidayName || `${best.totalDays}-Day Vacation`;

        const plRemaining = context.leaves && context.leaves.pl 
          ? Math.max(0, context.leaves.pl.total - context.leaves.pl.used)
          : 15;
        if (best.leavesNeeded > plRemaining) {
          return {
            reply: `A ${best.totalDays}-day trip from ${sFmt} to ${eFmt} requires ${best.leavesNeeded} PL days, but you only have ${plRemaining} PL remaining.`,
            action: 'none',
            details: null,
            holidays: null,
            balances: context.leaves || null,
            bookedLeaves: null,
            leavePlans: null,
            rawReply: '',
            modelUsed: 'local-fallback'
          };
        }

        return {
          reply: `Here's an optimal ${best.totalDays}-day vacation from ${sFmt} to ${eFmt} using only ${best.leavesNeeded} leave day${best.leavesNeeded > 1 ? 's' : ''}!`,
          action: 'stage_plan',
          details: {
            planName: planTitle,
            startDate: best.startDateStr,
            endDate: best.endDateStr,
            dates: best.allDates,
            leaveType: 'pl',
            leaveDaysCost: best.leavesNeeded,
            totalTripDays: best.totalDays
          },
          holidays: null,
          balances: null,
          bookedLeaves: null,
          leavePlans: null,
          rawReply: '',
          modelUsed: 'local-fallback'
        };
      }
    }

    // 5. MONTH SPECIFIC INQUIRIES
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june', 
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthRegexes = [
      /\b(in\s*)?(january|jan)\b/i,
      /\b(in\s*)?(february|feb)\b/i,
      /\b(in\s*)?(march|mar)\b/i,
      /\b(in\s*)?(april|apr)\b/i,
      /\b(in\s*)?(may)\b/i,
      /\b(in\s*)?(june|jun)\b/i,
      /\b(in\s*)?(july|jul)\b/i,
      /\b(in\s*)?(august|aug)\b/i,
      /\b(in\s*)?(september|sep|sept)\b/i,
      /\b(in\s*)?(october|oct)\b/i,
      /\b(in\s*)?(november|nov)\b/i,
      /\b(in\s*)?(december|dec)\b/i,
    ];
    let queriedMonthIdx = -1;
    for (let i = 0; i < monthRegexes.length; i++) {
      if (monthRegexes[i].test(message)) {
        queriedMonthIdx = i;
        break;
      }
    }

    if (queriedMonthIdx !== -1 && (context.bookedDates || context.leavePlans)) {
      const monthPrefix = `2026-${String(queriedMonthIdx + 1).padStart(2, '0')}`;
      const monthMatches = (context.bookedDates || []).filter(b => {
        const d = typeof b === 'string' ? b : b?.date;
        const t = typeof b === 'object' ? b?.type : 'pl';
        return d && d.startsWith(monthPrefix) && t !== 'wfh' && t !== 'office';
      });
      const monthPlans = (context.leavePlans || []).filter(p => {
        const s = p.startDate || p.start_date || '';
        const e = p.endDate || p.end_date || s;
        const hasDateInMonth = Array.isArray(p.dates) && p.dates.some(d => d && d.startsWith(monthPrefix));
        return (s && s.startsWith(monthPrefix)) || (e && e.startsWith(monthPrefix)) || hasDateInMonth;
      });
      const monthTitle = monthNames[queriedMonthIdx].charAt(0).toUpperCase() + monthNames[queriedMonthIdx].slice(1);
      
      const unplannedLeaves = monthMatches.filter(b => {
        const dStr = typeof b === 'string' ? b : b?.date;
        if (!monthPlans || monthPlans.length === 0) return true;
        const belongsToPlan = monthPlans.some(p => {
          if (Array.isArray(p.dates) && p.dates.includes(dStr)) return true;
          const s = p.startDate || p.start_date;
          const e = p.endDate || p.end_date || s;
          return s && e && dStr >= s && dStr <= e;
        });
        return !belongsToPlan;
      });

      let replyText = '';
      if (monthPlans.length > 0 && unplannedLeaves.length > 0) {
        replyText = `You have ${monthPlans.length} planned trip${monthPlans.length > 1 ? 's' : ''} and ${unplannedLeaves.length} other leave day${unplannedLeaves.length > 1 ? 's' : ''} in ${monthTitle} 2026.`;
      } else if (monthPlans.length > 0) {
        replyText = `You have ${monthPlans.length} planned trip${monthPlans.length > 1 ? 's' : ''} in ${monthTitle} 2026.`;
      } else if (monthMatches.length > 0) {
        replyText = `You have ${monthMatches.length} leave day${monthMatches.length > 1 ? 's' : ''} booked in ${monthTitle} 2026.`;
      } else {
        replyText = `You have no leaves booked in ${monthTitle} 2026.`;
      }

      return {
        reply: replyText,
        action: 'none',
        details: null,
        holidays: null,
        balances: null,
        bookedLeaves: unplannedLeaves.length > 0 ? unplannedLeaves : null,
        leavePlans: monthPlans.length > 0 ? monthPlans : null,
        rawReply: '',
        modelUsed: 'local-fallback'
      };
    }

    // 6. BALANCE / QUOTA INQUIRIES
    const isLeaveQuery = /(balance|quota|leaves|leave|how many|my leaves|what do my|remaining|used|booked)/i.test(message);
    if (isLeaveQuery && context.leaves) {
      const currentMonthPrefix = currentTodayStr.substring(0, 7);
      const calculatedWfhUsed = (context.bookedDates || []).filter(b => {
        const bType = typeof b === 'object' ? b.type : null;
        const bDate = typeof b === 'object' ? b.date : (typeof b === 'string' ? b : '');
        return bType === 'wfh' && bDate.startsWith(currentMonthPrefix);
      }).length;

      const wfhTotal = context.leaves?.wfh?.total ?? parseInt(localStorage.getItem('quota_wfh') || '10', 10);
      const wfhUsed = (context.leaves?.wfh?.used !== undefined && context.leaves.wfh.used !== 0)
        ? context.leaves.wfh.used
        : calculatedWfhUsed;
      const wfhRemaining = Math.max(0, wfhTotal - wfhUsed);

      return {
        reply: 'Here are your current leave balances.',
        action: 'none',
        details: null,
        holidays: null,
        balances: {
          pl: { 
            total: context.leaves.pl?.total ?? 15, 
            remaining: Math.max(0, (context.leaves.pl?.total ?? 15) - (context.leaves.pl?.used ?? 0)) 
          },
          el: { 
            total: context.leaves.el?.total ?? 10, 
            remaining: Math.max(0, (context.leaves.el?.total ?? 10) - (context.leaves.el?.used ?? 0)) 
          },
          rh: { 
            total: context.leaves.rh?.total ?? 1, 
            remaining: Math.max(0, (context.leaves.rh?.total ?? 1) - (context.leaves.rh?.used ?? 0)) 
          },
          wfh: { 
            total: wfhTotal, 
            remaining: wfhRemaining 
          }
        },
        bookedLeaves: null,
        rawReply: '',
        modelUsed: 'local-fallback'
      };
    }
  }

  const cleanErrorMsg = formatAiErrorMessage(lastError);
  throw new Error(cleanErrorMsg);
};

export const formatAiErrorMessage = (err) => {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const msg = typeof err === 'string' ? err : (err.message || '');
  
  if (/429|quota|rate limit|resource_exhausted|too many requests/i.test(msg)) {
    return 'Rate limit reached. Please wait a few seconds before asking again.';
  }
  if (/API_KEY_INVALID|401|403|unauthenticated|permission_denied/i.test(msg)) {
    return 'Invalid Gemini API key. Please check your key in Settings.';
  }
  if (/network|fetch failed|failed to fetch|offline/i.test(msg)) {
    return 'Network connection issue. Please check your internet connection.';
  }
  if (/overloaded|503|service unavailable/i.test(msg)) {
    return 'Gemini is busy right now. Please try again in a moment.';
  }
  return msg.length > 80 ? 'Unable to process request right now. Please try again.' : msg;
};
