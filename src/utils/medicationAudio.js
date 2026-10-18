/**
 * Vaidyasthana Medication Audio & Reminder Utilities
 * Enterprise Healthcare Clinical Management System
 *
 * Implements Web Audio API synthesis for professional medication chimes
 * with zero external dependencies, autoplay restriction resumption,
 * volume control, local preference persistence, and dose-due calculations.
 */

const STORAGE_KEY_SOUND_ENABLED = "vaidyasthana_medication_sound_enabled";
const STORAGE_KEY_SOUND_VOLUME = "vaidyasthana_medication_sound_volume";

export const ALERT_REPEAT_INTERVAL_MS = 90 * 1000; // 90 seconds repeating interval

let audioContextInstance = null;
let isAudioPlaying = false;

/**
 * Checks if the Web Audio API is supported in the current environment.
 *
 * @returns {boolean}
 */
export const isAudioSupported = () => {
  if (typeof window === "undefined") return false;
  return Boolean(window.AudioContext || window.webkitAudioContext);
};

/**
 * Lazily gets or initializes the global AudioContext instance.
 *
 * @returns {AudioContext|null}
 */
export const getAudioContext = () => {
  if (!isAudioSupported()) return null;
  if (!audioContextInstance) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      audioContextInstance = new AudioContextClass();
    } catch (err) {
      console.warn("[MEDICATION_AUDIO] Unable to initialize AudioContext:", err.message);
      return null;
    }
  }
  return audioContextInstance;
};

/**
 * Resumes the AudioContext after a user gesture to satisfy browser autoplay restrictions.
 *
 * @returns {Promise<boolean>}
 */
export const resumeAudioContext = async () => {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
      return ctx.state === "running";
    } catch (err) {
      console.warn("[MEDICATION_AUDIO] Error resuming AudioContext:", err.message);
      return false;
    }
  }
  return ctx.state === "running";
};

/**
 * Checks whether the AudioContext is currently active and allowed to emit sound.
 *
 * @returns {boolean}
 */
export const isAudioContextReady = () => {
  const ctx = getAudioContext();
  return Boolean(ctx && ctx.state === "running");
};

/**
 * Retrieves the user's stored sound reminder preferences.
 *
 * @returns {{ soundEnabled: boolean, volume: number }}
 */
export const getSoundSettings = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { soundEnabled: true, volume: 0.8 };
  }
  const storedEnabled = window.localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
  const storedVolume = window.localStorage.getItem(STORAGE_KEY_SOUND_VOLUME);

  const parsedVolume = storedVolume !== null ? parseFloat(storedVolume) : NaN;
  const volume = !isNaN(parsedVolume) ? Math.max(0, Math.min(1, parsedVolume)) : 0.8;

  return {
    soundEnabled: storedEnabled === null ? true : storedEnabled === "true",
    volume,
  };
};

/**
 * Persists the user's sound reminder preferences to localStorage.
 *
 * @param {{ soundEnabled?: boolean, volume?: number }} settings
 */
export const saveSoundSettings = ({ soundEnabled, volume }) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (soundEnabled !== undefined) {
    window.localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, String(Boolean(soundEnabled)));
  }
  if (volume !== undefined) {
    const parsed = parseFloat(volume);
    const clamped = !isNaN(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.8;
    window.localStorage.setItem(STORAGE_KEY_SOUND_VOLUME, String(clamped));
  }
};

/**
 * Synthesizes a premium, attention-catching 3-tone healthcare melodic chime using Web Audio API.
 * - Motif: Ascending A-Major Triad (E5 -> A5 -> C#6)
 * - Tone 1: E5 (659.25 Hz) with warm 2nd harmonic (1318.5 Hz)
 * - Tone 2: A5 (880.00 Hz) with warm 2nd harmonic (1760.0 Hz)
 * - Tone 3: C#6 (1108.73 Hz) resolving chime with resonant tail
 * Uses subtle overtone reinforcement for audibility on laptop/phone speakers,
 * exponential gain envelopes for zero-click smooth decay, and dynamics compression
 * to protect against clipping distortion at higher volume.
 *
 * @param {number} [customVolume] - Optional volume override (0.0 to 1.0)
 * @returns {Promise<boolean>} True if sound was synthesized, false if blocked/unsupported
 */
export const playDoseReminderChime = async (customVolume) => {
  if (!isAudioSupported()) return false;
  if (isAudioPlaying) return false; // Concurrency lock to avoid overlapping spikes

  const ctx = getAudioContext();
  if (!ctx) return false;

  // Attempt to resume if suspended by browser autoplay policy
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (e) {
      return false;
    }
  }

  if (ctx.state !== "running") {
    return false;
  }

  const volume = customVolume !== undefined ? customVolume : getSoundSettings().volume;
  const masterVolume = Math.max(0, Math.min(1, volume));

  if (masterVolume <= 0) return false;

  isAudioPlaying = true;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume * 0.8, now);

    // Route through DynamicsCompressor if supported to prevent clipping and enhance loudness
    let outputTarget = ctx.destination;
    if (typeof ctx.createDynamicsCompressor === "function") {
      try {
        const compressor = ctx.createDynamicsCompressor();
        if (compressor.threshold && compressor.threshold.setValueAtTime) {
          compressor.threshold.setValueAtTime(-12, now);
          compressor.knee.setValueAtTime(20, now);
          compressor.ratio.setValueAtTime(4, now);
          compressor.attack.setValueAtTime(0.003, now);
          compressor.release.setValueAtTime(0.15, now);
          compressor.connect(ctx.destination);
          outputTarget = compressor;
        }
      } catch (compErr) {
        outputTarget = ctx.destination;
      }
    }
    masterGain.connect(outputTarget);

    // Helper to synthesize a melodic tone with warm fundamental + soft overtone
    const scheduleChimeTone = (freq, startTime, peakGain, decayDuration) => {
      // 1. Fundamental sine wave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + decayDuration + 0.02);

      // 2. Gentle 2nd harmonic (octave overtone at 15% level for small speaker clarity)
      try {
        const overtoneOsc = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtoneOsc.type = "sine";
        overtoneOsc.frequency.setValueAtTime(freq * 2, startTime);

        overtoneGain.gain.setValueAtTime(0.0001, startTime);
        overtoneGain.gain.exponentialRampToValueAtTime(peakGain * 0.15, startTime + 0.015);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration * 0.7);

        overtoneOsc.connect(overtoneGain);
        overtoneGain.connect(masterGain);

        overtoneOsc.start(startTime);
        overtoneOsc.stop(startTime + decayDuration * 0.75);
      } catch (e) {
        // Safe fallback if oscillator creation fails
      }
    };

    // Tone 1: E5 (659.25 Hz) - bright, warm intro
    scheduleChimeTone(659.25, now, 0.75, 0.28);

    // Tone 2: A5 (880.00 Hz) - rising melodic lift
    scheduleChimeTone(880.0, now + 0.13, 0.85, 0.32);

    // Tone 3: C#6 (1108.73 Hz) - resolving major 3rd with rich ringing sustain
    scheduleChimeTone(1108.73, now + 0.26, 0.95, 0.58);

    // Release playback lock after chime sequence finishes
    setTimeout(() => {
      isAudioPlaying = false;
    }, 880);

    return true;
  } catch (err) {
    console.warn("[MEDICATION_AUDIO] Failed to play premium chime:", err.message);
    isAudioPlaying = false;
    return false;
  }
};

/**
 * Determines whether a scheduled medication dose is currently DUE (pending action).
 * Criteria:
 * 1. Status must be "Scheduled" (not "Taken", "Skipped", or "Missed").
 * 2. If snoozed, the snoozeUntil time must be reached or passed.
 * 3. The scheduledTime (or reminderTime on scheduledDate) must be reached or passed.
 *
 * @param {object} dose - The dose object from the API
 * @param {Date|number} [nowInput] - Reference timestamp (default: current time)
 * @returns {boolean}
 */
export const isDoseDue = (dose, nowInput = new Date()) => {
  if (!dose || dose.status !== "Scheduled") return false;

  const now = nowInput instanceof Date ? nowInput.getTime() : new Date(nowInput).getTime();

  // If dose is currently snoozed into the future, it is NOT due yet
  if (dose.snoozeUntil) {
    const snoozeTime = new Date(dose.snoozeUntil).getTime();
    if (!isNaN(snoozeTime) && snoozeTime > now) {
      return false;
    }
  }

  // Check scheduledTime timestamp if provided
  if (dose.scheduledTime) {
    const scheduledTime = new Date(dose.scheduledTime).getTime();
    if (!isNaN(scheduledTime)) {
      return scheduledTime <= now;
    }
  }

  // Fallback: evaluate scheduledDate ("YYYY-MM-DD") and reminderTime ("HH:mm")
  if (dose.scheduledDate && dose.reminderTime) {
    const [hours, minutes] = dose.reminderTime.split(":").map(Number);
    const doseDate = new Date(`${dose.scheduledDate}T${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`);
    if (!isNaN(doseDate.getTime())) {
      return doseDate.getTime() <= now;
    }
  }

  return false;
};

/**
 * Filters an array of dose objects for doses that are currently due and pending.
 *
 * @param {Array<object>} doses - Array of dose items
 * @param {Date|number} [nowInput] - Reference timestamp
 * @returns {Array<object>}
 */
export const getDuePendingDoses = (doses, nowInput = new Date()) => {
  if (!Array.isArray(doses)) return [];
  return doses.filter((dose) => isDoseDue(dose, nowInput));
};

/**
 * Returns a stable unique key for a dose occurrence.
 *
 * @param {object} dose
 * @returns {string}
 */
export const getDoseOccurrenceKey = (dose) => {
  if (!dose) return "unknown_dose";
  if (dose._id) return String(dose._id);
  return `${dose.medicationId || "med"}_${dose.scheduledDate || "date"}_${dose.reminderTime || "time"}`;
};
