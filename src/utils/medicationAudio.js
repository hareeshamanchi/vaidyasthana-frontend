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
const STORAGE_KEY_SPOKEN_ALARM_ENABLED = "vaidyasthana_medication_spoken_alarm_enabled";
const STORAGE_KEY_VOICE_URI = "vaidyasthana_medication_voice_uri";
const STORAGE_KEY_SPEECH_RATE = "vaidyasthana_medication_speech_rate";
const STORAGE_KEY_SPEECH_PITCH = "vaidyasthana_medication_speech_pitch";
const STORAGE_KEY_REPEAT_INTERVAL_SEC = "vaidyasthana_medication_repeat_interval_sec";

export const DEFAULT_REPEAT_INTERVAL_SEC = 90;
export const ALERT_REPEAT_INTERVAL_MS = DEFAULT_REPEAT_INTERVAL_SEC * 1000; // 90 seconds repeating interval

let audioContextInstance = null;
let isAudioPlaying = false;
let isAlarmSpeaking = false;

/**
 * Checks whether speech synthesis alarm is currently active.
 *
 * @returns {boolean}
 */
export const isAlarmCurrentlySpeaking = () => isAlarmSpeaking;

/**
 * Checks if the Web Speech Synthesis API is supported in the current environment.
 *
 * @returns {boolean}
 */
export const isSpeechSynthesisSupported = () => {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
};

/**
 * Retrieves the list of available speech synthesis voices installed on the device.
 *
 * @returns {Array<SpeechSynthesisVoice>}
 */
export const getDeviceVoices = () => {
  if (!isSpeechSynthesisSupported()) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch (err) {
    return [];
  }
};

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
  const storedSpokenEnabled = window.localStorage.getItem(STORAGE_KEY_SPOKEN_ALARM_ENABLED);
  const storedVolume = window.localStorage.getItem(STORAGE_KEY_SOUND_VOLUME);

  const parsedVolume = storedVolume !== null ? parseFloat(storedVolume) : NaN;
  const volume = !isNaN(parsedVolume) ? Math.max(0, Math.min(1, parsedVolume)) : 0.8;

  const soundEnabled =
    storedSpokenEnabled !== null
      ? storedSpokenEnabled === "true"
      : storedEnabled === null
      ? true
      : storedEnabled === "true";

  return {
    soundEnabled,
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
    window.localStorage.setItem(STORAGE_KEY_SPOKEN_ALARM_ENABLED, String(Boolean(soundEnabled)));
  }
  if (volume !== undefined) {
    const parsed = parseFloat(volume);
    const clamped = !isNaN(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.8;
    window.localStorage.setItem(STORAGE_KEY_SOUND_VOLUME, String(clamped));
  }
};

/**
 * Retrieves comprehensive spoken alarm preferences including voice, pitch, rate, and repeat interval.
 *
 * @returns {{ spokenAlarmEnabled: boolean, volume: number, voiceURI: string, rate: number, pitch: number, repeatIntervalSec: number }}
 */
export const getSpokenAlarmSettings = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      spokenAlarmEnabled: true,
      volume: 0.8,
      voiceURI: "",
      rate: 1.0,
      pitch: 1.0,
      repeatIntervalSec: DEFAULT_REPEAT_INTERVAL_SEC,
    };
  }

  const storedSpoken = window.localStorage.getItem(STORAGE_KEY_SPOKEN_ALARM_ENABLED);
  const storedSound = window.localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
  const storedVolume = window.localStorage.getItem(STORAGE_KEY_SOUND_VOLUME);
  const storedVoice = window.localStorage.getItem(STORAGE_KEY_VOICE_URI);
  const storedRate = window.localStorage.getItem(STORAGE_KEY_SPEECH_RATE);
  const storedPitch = window.localStorage.getItem(STORAGE_KEY_SPEECH_PITCH);
  const storedInterval = window.localStorage.getItem(STORAGE_KEY_REPEAT_INTERVAL_SEC);

  const parsedVolume = storedVolume !== null ? parseFloat(storedVolume) : 0.8;
  const parsedRate = storedRate !== null ? parseFloat(storedRate) : 1.0;
  const parsedPitch = storedPitch !== null ? parseFloat(storedPitch) : 1.0;
  const parsedInterval = storedInterval !== null ? parseInt(storedInterval, 10) : DEFAULT_REPEAT_INTERVAL_SEC;

  const spokenAlarmEnabled =
    storedSpoken !== null
      ? storedSpoken === "true"
      : storedSound !== null
      ? storedSound === "true"
      : true;

  return {
    spokenAlarmEnabled,
    volume: !isNaN(parsedVolume) ? Math.max(0, Math.min(1, parsedVolume)) : 0.8,
    voiceURI: storedVoice || "",
    rate: !isNaN(parsedRate) ? Math.max(0.75, Math.min(1.5, parsedRate)) : 1.0,
    pitch: !isNaN(parsedPitch) ? Math.max(0.8, Math.min(1.2, parsedPitch)) : 1.0,
    repeatIntervalSec: !isNaN(parsedInterval) && parsedInterval > 0 ? parsedInterval : DEFAULT_REPEAT_INTERVAL_SEC,
  };
};

/**
 * Persists spoken alarm settings to localStorage.
 *
 * @param {object} settings
 */
export const saveSpokenAlarmSettings = (settings = {}) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (settings.spokenAlarmEnabled !== undefined) {
    window.localStorage.setItem(STORAGE_KEY_SPOKEN_ALARM_ENABLED, String(Boolean(settings.spokenAlarmEnabled)));
    window.localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, String(Boolean(settings.spokenAlarmEnabled)));
  }
  if (settings.volume !== undefined) {
    const parsed = parseFloat(settings.volume);
    const clamped = !isNaN(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.9;
    window.localStorage.setItem(STORAGE_KEY_SOUND_VOLUME, String(clamped));
  }
  if (settings.voiceURI !== undefined) {
    window.localStorage.setItem(STORAGE_KEY_VOICE_URI, String(settings.voiceURI || ""));
  }
  if (settings.rate !== undefined) {
    const parsed = parseFloat(settings.rate);
    const clamped = !isNaN(parsed) ? Math.max(0.75, Math.min(1.5, parsed)) : 1.0;
    window.localStorage.setItem(STORAGE_KEY_SPEECH_RATE, String(clamped));
  }
  if (settings.pitch !== undefined) {
    const parsed = parseFloat(settings.pitch);
    const clamped = !isNaN(parsed) ? Math.max(0.8, Math.min(1.2, parsed)) : 1.0;
    window.localStorage.setItem(STORAGE_KEY_SPEECH_PITCH, String(clamped));
  }
  if (settings.repeatIntervalSec !== undefined) {
    const parsed = parseInt(settings.repeatIntervalSec, 10);
    const clamped = !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_REPEAT_INTERVAL_SEC;
    window.localStorage.setItem(STORAGE_KEY_REPEAT_INTERVAL_SEC, String(clamped));
  }
};

/**
 * Plays an urgent medical equipment alarm sound (dual-frequency pulsing medical monitor alert).
 * Sounds distinctly like a clinical medication alarm, not a gentle decorative chime.
 *
 * @param {number} [customVolume]
 * @returns {Promise<boolean>}
 */
export const playMedicalAlarmSound = async (customVolume) => {
  if (!isAudioSupported()) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (e) {
      return false;
    }
  }

  if (ctx.state !== "running") return false;

  const volume = customVolume !== undefined ? customVolume : getSpokenAlarmSettings().volume;
  const masterVolume = Math.max(0, Math.min(1, volume));
  if (masterVolume <= 0) return false;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume * 0.9, now);
    masterGain.connect(ctx.destination);

    // Urgent Medical Alarm Beep generator
    const scheduleBeep = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "square"; // Medical monitor character
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2600, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.015);
      gain.gain.setValueAtTime(0.35, startTime + duration - 0.015);
      gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Burst 1: Beep-Beep (880 Hz -> 1046 Hz)
    scheduleBeep(880.0, now, 0.09);
    scheduleBeep(1046.5, now + 0.12, 0.1);

    // Burst 2: Beep-Beep (880 Hz -> 1046 Hz)
    scheduleBeep(880.0, now + 0.32, 0.09);
    scheduleBeep(1046.5, now + 0.44, 0.12);

    return true;
  } catch (err) {
    console.warn("[MEDICATION_AUDIO] Failed to synthesize medical alarm sound:", err.message);
    return false;
  }
};

/**
 * Stops any ongoing spoken alarm or speech synthesis immediately.
 */
export const stopSpokenMedicationAlarm = () => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // Ignore cancel errors
    }
  }
  isAlarmSpeaking = false;
  isAudioPlaying = false;
};

/**
 * Synthesizes a spoken medication reminder with urgent medical alarm beeps using SpeechSynthesis.
 * Messages include:
 * - "Please take your medicine now."
 * - "Medication reminder. It is time to take your scheduled dose."
 * - "Please take your medicine and mark the dose as taken."
 *
 * @param {object} options
 * @param {string} [options.text] - Custom text to speak
 * @param {object} [options.dose] - Target dose object
 * @param {Array<object>} [options.dueDoses] - All currently due doses
 * @param {object} [options.settings] - Custom spoken alarm settings
 * @returns {Promise<boolean>}
 */
export const speakMedicationReminder = async ({
  text,
  dose,
  dueDoses,
  settings,
} = {}) => {
  const currentSettings = settings || getSpokenAlarmSettings();
  if (!currentSettings.spokenAlarmEnabled) {
    return false;
  }

  // Prevent overlapping duplicate speech
  stopSpokenMedicationAlarm();

  // 1. Play urgent medical alarm beeps
  await playMedicalAlarmSound(currentSettings.volume);

  if (!isSpeechSynthesisSupported()) {
    return true;
  }

  return new Promise((resolve) => {
    let messageToSpeak = text;
    if (!messageToSpeak) {
      if (dose && dose.medicationName) {
        const doseInfo = dose.dosage ? ` of ${dose.dosage} ${dose.dosageUnit || "mg"}` : "";
        messageToSpeak = `Medication reminder. It is time to take your scheduled dose of ${dose.medicationName}${doseInfo}. Please take your medicine and mark the dose as taken.`;
      } else if (Array.isArray(dueDoses) && dueDoses.length > 0) {
        const names = Array.from(new Set(dueDoses.map((d) => d.medicationName).filter(Boolean))).join(", ");
        messageToSpeak = `Medication reminder. It is time to take your scheduled medicine for ${names || "today"}. Please take your medicine now and mark the dose as taken.`;
      } else {
        messageToSpeak = "Medication reminder. It is time to take your scheduled dose. Please take your medicine now and mark the dose as taken.";
      }
    }

    try {
      const utterance = new window.SpeechSynthesisUtterance(messageToSpeak);
      utterance.volume = Math.max(0, Math.min(1, currentSettings.volume));
      utterance.rate = Math.max(0.75, Math.min(1.5, currentSettings.rate || 1.0));
      utterance.pitch = Math.max(0.8, Math.min(1.2, currentSettings.pitch || 1.0));

      const voices = getDeviceVoices();
      if (voices.length > 0) {
        if (currentSettings.voiceURI) {
          const matched = voices.find(
            (v) => v.voiceURI === currentSettings.voiceURI || v.name === currentSettings.voiceURI
          );
          if (matched) utterance.voice = matched;
        }
        if (!utterance.voice) {
          const naturalEn = voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Natural") ||
                v.name.includes("Google") ||
                v.name.includes("Samantha") ||
                v.name.includes("Zira"))
          );
          if (naturalEn) utterance.voice = naturalEn;
        }
      }

      utterance.onend = () => {
        isAlarmSpeaking = false;
        resolve(true);
      };

      utterance.onerror = (err) => {
        console.warn("[MEDICATION_AUDIO] SpeechSynthesis utterance error:", err);
        isAlarmSpeaking = false;
        resolve(false);
      };

      isAlarmSpeaking = true;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[MEDICATION_AUDIO] Failed to initialize speech synthesis:", err);
      isAlarmSpeaking = false;
      resolve(false);
    }
  });
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
