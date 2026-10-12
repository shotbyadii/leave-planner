/**
 * Slate / Apple-grade Mobile Haptics Engine
 * Provides sharp, focused tactile feedback for touch interactions.
 */

const canVibrate = () => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

// Subtle mechanical acoustic tick for devices without vibration API (e.g. iOS Safari)
let audioCtx = null;
const playAudioTick = () => {
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
    // High-pitched, ultra-short mechanical transient (6ms decay)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.006);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.006);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.006);
  } catch {
    // Gracefully ignore audio restrictions
  }
};

/**
 * Sharp, focused notch tick (8ms)
 * Ideal for wheel tumblers, steppers, and dial notches.
 */
export const hapticSelectionTick = () => {
  if (canVibrate()) {
    try {
      navigator.vibrate(8);
    } catch {}
  }
  playAudioTick();
};

/**
 * Crisp light impact (12ms)
 * Ideal for button taps, checkbox toggles, color swatch selection.
 */
export const hapticLight = () => {
  if (canVibrate()) {
    try {
      navigator.vibrate(12);
    } catch {}
  }
};

/**
 * Medium tactile feedback (20ms)
 * Ideal for modal openings, major state switches.
 */
export const hapticMedium = () => {
  if (canVibrate()) {
    try {
      navigator.vibrate(20);
    } catch {}
  }
};

/**
 * Success pattern [10, 40, 15]
 */
export const hapticSuccess = () => {
  if (canVibrate()) {
    try {
      navigator.vibrate([10, 40, 15]);
    } catch {}
  }
};
