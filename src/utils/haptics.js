/**
 * Slate / Apple-grade System-Wide Haptics Engine
 * Provides differentiated tactile & subtle acoustic feedback for:
 * - Wheel picker & segmented tabs (sharp 6-8ms notch tick)
 * - Affirmative "Yes / Confirm / Save / Apply" actions (rising double-pulse)
 * - Negative "No / Cancel / Dismiss / Delete" actions (descending muted thud)
 * - Mechanical Balance Ticker steps (adaptive odometer ticks based on remaining quota)
 * - Multi-Day Date Range Cascade (N weak pulses matching the selected date span)
 * - Card stack swipes & system-wide button clicks
 */

let lastHapticTime = 0;
let rangeCascadeTimers = [];

const canVibrate = () => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
};

const markHapticFired = () => {
  lastHapticTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
};

const wasRecentlyFired = (windowMs = 35) => {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return now - lastHapticTime < windowMs;
};

// Subtle mechanical acoustic synthesizer for tactile reinforcement
let audioCtx = null;
const playTone = (startFreq = 1200, endFreq = 350, durationSec = 0.006, gainLevel = 0.03, type = 'triangle', delaySec = 0) => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const startTime = audioCtx.currentTime + delaySec;
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + durationSec);
    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + durationSec);
  } catch {
    // Gracefully ignore audio context restrictions
  }
};

/**
 * Sharp, focused notch tick (7ms)
 * Ideal for wheel tumblers, steppers, segmented tabs, and single date taps.
 */
export const hapticSelectionTick = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate(7);
    } catch {}
  }
  playTone(1200, 360, 0.006, 0.032, 'triangle');
};

/**
 * Crisp light impact (10ms)
 * Ideal for standard button taps, pill toggles, and color swatches.
 */
export const hapticLight = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate(10);
    } catch {}
  }
  playTone(920, 300, 0.007, 0.025, 'triangle');
};

/**
 * Medium tactile feedback (18ms)
 * Ideal for modal openings, drawer expansions, and view switches.
 */
export const hapticMedium = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate(18);
    } catch {}
  }
  playTone(720, 260, 0.009, 0.035, 'triangle');
};

/**
 * Affirmative "Yes / Confirm / Apply / Save" pattern
 * Crisp double-tap rising pulse [10, 30, 20] with a bright two-step mechanical lock-in.
 */
export const hapticYes = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate([10, 30, 20]);
    } catch {}
  }
  playTone(580, 760, 0.008, 0.03, 'triangle', 0);
  playTone(880, 1180, 0.01, 0.038, 'triangle', 0.038);
};

/**
 * Negative "No / Cancel / Dismiss / Delete" pattern
 * Muted descending double-pulse [16, 25, 8] with a low-frequency soft thud.
 */
export const hapticNo = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate([16, 25, 8]);
    } catch {}
  }
  playTone(420, 190, 0.01, 0.03, 'sine', 0);
  playTone(260, 130, 0.008, 0.022, 'sine', 0.035);
};

/**
 * Card Swipe / Stack Navigation pattern
 * Crisp tactile whoosh when flipping between multi-day attendance cards or calendar months.
 */
export const hapticSwipeCard = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate([7, 18, 11]);
    } catch {}
  }
  playTone(820, 460, 0.008, 0.028, 'triangle');
};

/**
 * Mechanical Balance Ticker Step Haptic
 * Fires on each individual number roll in AppleBalanceTicker, adapting feel as balance drops.
 */
export const hapticTickerStep = (currentValue = 5, totalQuota = 15) => {
  markHapticFired();
  if (currentValue <= 0) {
    // Depleted zero-balance bottom-out thud
    if (canVibrate()) {
      try {
        navigator.vibrate([15, 20, 15]);
      } catch {}
    }
    playTone(340, 150, 0.012, 0.045, 'triangle');
  } else if (currentValue <= 3) {
    // Low-balance cautionary notch
    if (canVibrate()) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    playTone(760, 310, 0.008, 0.038, 'triangle');
  } else {
    // Healthy crisp odometer gear tick
    if (canVibrate()) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
    const ratio = Math.min(1, Math.max(0, currentValue / Math.max(1, totalQuota)));
    const freq = Math.round(950 + ratio * 350);
    playTone(freq, 380, 0.006, 0.032, 'triangle');
  }
};

/**
 * Multi-Day Date Range Cascade Haptic
 * When the user selects a start date and an end date N days away (e.g. 4 days),
 * vibrates N times in a weak state matching the range sweep animation across the calendar!
 */
export const hapticDateRangeCascade = (daysCount = 1) => {
  markHapticFired();
  // Clear any in-flight cascade timers
  rangeCascadeTimers.forEach(t => clearTimeout(t));
  rangeCascadeTimers = [];

  const pulses = Math.max(1, Math.min(14, Math.round(daysCount)));
  if (pulses === 1) {
    hapticSelectionTick();
    return;
  }

  const pulseDurationMs = 6;
  const gapMs = 38;

  // Build Web Vibration API pattern: [6, 38, 6, 38, 6, ...]
  if (canVibrate()) {
    try {
      const pattern = [];
      for (let i = 0; i < pulses; i++) {
        pattern.push(pulseDurationMs);
        if (i < pulses - 1) pattern.push(gapMs);
      }
      navigator.vibrate(pattern);
    } catch {}
  }

  // Synchronized weak acoustic ripple ticks ascending slightly in pitch across the range
  for (let i = 0; i < pulses; i++) {
    const stepDelayMs = i * (pulseDurationMs + gapMs);
    const timer = setTimeout(() => {
      const stepFreq = 900 + i * 45;
      playTone(stepFreq, 340, 0.005, 0.024, 'triangle');
    }, stepDelayMs);
    rangeCascadeTimers.push(timer);
  }
};

/**
 * Success pattern [10, 40, 18]
 */
export const hapticSuccess = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate([10, 40, 18]);
    } catch {}
  }
  playTone(640, 960, 0.008, 0.032, 'triangle', 0);
  playTone(960, 1320, 0.011, 0.04, 'triangle', 0.045);
};

/**
 * Warning / Constraint Alert pattern [20, 35, 20]
 */
export const hapticWarning = () => {
  markHapticFired();
  if (canVibrate()) {
    try {
      navigator.vibrate([20, 35, 20]);
    } catch {}
  }
  playTone(440, 220, 0.012, 0.038, 'sawtooth');
};

/**
 * System-Wide Global Button & Control Haptics Initializer
 * Automatically provides differentiated tactile feedback on every button, tab, and toggle
 * across the entire app if a specialized haptic was not already fired for that interaction.
 */
let globalHapticsInitialized = false;
export const initGlobalHaptics = () => {
  if (globalHapticsInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  globalHapticsInitialized = true;

  document.addEventListener(
    'click',
    (e) => {
      // Skip if a component-specific haptic already fired within the last 35ms
      if (wasRecentlyFired(35)) return;

      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;

      const interactive = target.closest('button, [role="button"], [role="tab"], a[href], input[type="checkbox"], input[type="radio"], select');
      if (!interactive || interactive.disabled || interactive.getAttribute('aria-disabled') === 'true') {
        return;
      }

      const label = (
        (interactive.textContent || '') +
        ' ' +
        (interactive.getAttribute('title') || '') +
        ' ' +
        (interactive.getAttribute('aria-label') || '') +
        ' ' +
        (interactive.getAttribute('data-capability') || '')
      )
        .trim()
        .toLowerCase();

      // 1. Negative / Cancel / Close / Dismiss / Delete / Reset actions
      if (/\b(cancel|close|dismiss|discard|delete|remove|reset|not needed|no|disable|clear|exit)\b/.test(label)) {
        hapticNo();
        return;
      }

      // 2. Affirmative / Confirm / Save / Apply / Primary CTA actions
      if (/\b(confirm|save|apply|submit|enable|work from home|in-office|accept|done|complete|add|create|restore|export)\b/.test(label)) {
        hapticYes();
        return;
      }

      // 3. Segmented tabs, navigation arrows, and calendar day cells
      if (
        interactive.getAttribute('role') === 'tab' ||
        /\b(previous|next|today|jump to day|view|tab)\b/.test(label)
      ) {
        hapticSelectionTick();
        return;
      }

      // 4. Default crisp button click
      hapticLight();
    },
    { passive: true }
  );
};
