import {
  isAudioSupported,
  getAudioContext,
  resumeAudioContext,
  isAudioContextReady,
  getSoundSettings,
  saveSoundSettings,
  playDoseReminderChime,
  isDoseDue,
  getDuePendingDoses,
  getDoseOccurrenceKey,
  ALERT_REPEAT_INTERVAL_MS,
  isSpeechSynthesisSupported,
  getDeviceVoices,
  getSpokenAlarmSettings,
  saveSpokenAlarmSettings,
  playMedicalAlarmSound,
  stopSpokenMedicationAlarm,
  speakMedicationReminder,
  DEFAULT_REPEAT_INTERVAL_SEC,
} from "./medicationAudio";

describe("medicationAudio utility test suite", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("Constants & Basic Checks", () => {
    test("ALERT_REPEAT_INTERVAL_MS is configured to 90 seconds", () => {
      expect(ALERT_REPEAT_INTERVAL_MS).toBe(90 * 1000);
    });

    test("isAudioSupported returns a boolean based on window.AudioContext", () => {
      expect(typeof isAudioSupported()).toBe("boolean");
    });
  });

  describe("Sound Settings Persistence", () => {
    test("returns default settings when localStorage is empty", () => {
      const settings = getSoundSettings();
      expect(settings).toEqual({ soundEnabled: true, volume: 0.8 });
    });

    test("saves and retrieves enabled flag and volume properly", () => {
      saveSoundSettings({ soundEnabled: false, volume: 0.45 });
      const settings = getSoundSettings();
      expect(settings.soundEnabled).toBe(false);
      expect(settings.volume).toBe(0.45);
    });

    test("clamps volume between 0.0 and 1.0", () => {
      saveSoundSettings({ volume: 1.8 });
      expect(getSoundSettings().volume).toBe(1.0);

      saveSoundSettings({ volume: -0.5 });
      expect(getSoundSettings().volume).toBe(0.0);
    });
  });

  describe("isDoseDue Evaluation", () => {
    const fixedNow = new Date("2026-10-18T10:00:00.000Z");

    test("returns false if dose is not Scheduled (Taken, Skipped, Missed)", () => {
      expect(
        isDoseDue(
          { status: "Taken", scheduledTime: "2026-10-18T09:00:00.000Z" },
          fixedNow
        )
      ).toBe(false);
      expect(
        isDoseDue(
          { status: "Skipped", scheduledTime: "2026-10-18T09:00:00.000Z" },
          fixedNow
        )
      ).toBe(false);
      expect(
        isDoseDue(
          { status: "Missed", scheduledTime: "2026-10-18T09:00:00.000Z" },
          fixedNow
        )
      ).toBe(false);
      expect(isDoseDue(null, fixedNow)).toBe(false);
    });

    test("returns false if dose is snoozed until a future time", () => {
      const snoozedDose = {
        status: "Scheduled",
        scheduledTime: "2026-10-18T09:00:00.000Z",
        snoozeUntil: "2026-10-18T10:30:00.000Z", // 30 mins after fixedNow
      };
      expect(isDoseDue(snoozedDose, fixedNow)).toBe(false);
    });

    test("returns true if dose was snoozed but the snooze duration has passed", () => {
      const expiredSnooze = {
        status: "Scheduled",
        scheduledTime: "2026-10-18T08:00:00.000Z",
        snoozeUntil: "2026-10-18T09:45:00.000Z", // 15 mins before fixedNow
      };
      expect(isDoseDue(expiredSnooze, fixedNow)).toBe(true);
    });

    test("evaluates scheduledTime timestamp correctly", () => {
      const pastDose = {
        status: "Scheduled",
        scheduledTime: "2026-10-18T09:30:00.000Z",
      };
      const futureDose = {
        status: "Scheduled",
        scheduledTime: "2026-10-18T11:00:00.000Z",
      };
      expect(isDoseDue(pastDose, fixedNow)).toBe(true);
      expect(isDoseDue(futureDose, fixedNow)).toBe(false);
    });

    test("evaluates scheduledDate + reminderTime fallback format", () => {
      const pastDose = {
        status: "Scheduled",
        scheduledDate: "2026-10-18",
        reminderTime: "08:00",
      };
      const futureDose = {
        status: "Scheduled",
        scheduledDate: "2026-10-18",
        reminderTime: "23:00",
      };
      // Evaluate with a known reference date in local time
      const refDate = new Date("2026-10-18T15:00:00");
      expect(isDoseDue(pastDose, refDate)).toBe(true);
      expect(isDoseDue(futureDose, refDate)).toBe(false);
    });
  });

  describe("getDuePendingDoses Batch Filtering", () => {
    test("filters out non-due doses and retains only due ones", () => {
      const now = new Date("2026-10-18T12:00:00.000Z");
      const list = [
        { _id: "d1", status: "Scheduled", scheduledTime: "2026-10-18T08:00:00.000Z" },
        { _id: "d2", status: "Taken", scheduledTime: "2026-10-18T08:00:00.000Z" },
        { _id: "d3", status: "Scheduled", scheduledTime: "2026-10-18T14:00:00.000Z" },
        {
          _id: "d4",
          status: "Scheduled",
          scheduledTime: "2026-10-18T09:00:00.000Z",
          snoozeUntil: "2026-10-18T13:00:00.000Z",
        },
      ];

      const due = getDuePendingDoses(list, now);
      expect(due).toHaveLength(1);
      expect(due[0]._id).toBe("d1");
    });

    test("handles empty or invalid list gracefully", () => {
      expect(getDuePendingDoses([])).toEqual([]);
      expect(getDuePendingDoses(null)).toEqual([]);
    });
  });

  describe("getDoseOccurrenceKey", () => {
    test("returns _id if present", () => {
      expect(getDoseOccurrenceKey({ _id: "dose-123" })).toBe("dose-123");
    });

    test("constructs composite fallback key if _id is missing", () => {
      expect(
        getDoseOccurrenceKey({
          medicationId: "m1",
          scheduledDate: "2026-10-18",
          reminderTime: "08:00",
        })
      ).toBe("m1_2026-10-18_08:00");
    });

    test("handles null dose safely", () => {
      expect(getDoseOccurrenceKey(null)).toBe("unknown_dose");
    });
  });

  describe("Web Audio Synthesis Mocking", () => {
    let originalAudioContext;

    beforeAll(() => {
      originalAudioContext = window.AudioContext;
    });

    afterAll(() => {
      window.AudioContext = originalAudioContext;
    });

    test("playDoseReminderChime creates oscillator and gain nodes when AudioContext is running", async () => {
      const mockSetValueAtTime = jest.fn();
      const mockExponentialRampToValueAtTime = jest.fn();
      const mockStart = jest.fn();
      const mockStop = jest.fn();
      const mockConnect = jest.fn();

      const mockGainNode = {
        gain: {
          setValueAtTime: mockSetValueAtTime,
          exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
        },
        connect: mockConnect,
      };

      const mockOscillatorNode = {
        type: "sine",
        frequency: {
          setValueAtTime: mockSetValueAtTime,
        },
        connect: mockConnect,
        start: mockStart,
        stop: mockStop,
      };

      const MockAudioContext = jest.fn().mockImplementation(() => ({
        state: "running",
        currentTime: 0,
        destination: {},
        createGain: jest.fn().mockReturnValue(mockGainNode),
        createOscillator: jest.fn().mockReturnValue(mockOscillatorNode),
        resume: jest.fn().mockResolvedValue(),
      }));

      window.AudioContext = MockAudioContext;

      const success = await playDoseReminderChime(0.7);
      expect(success).toBe(true);
      expect(mockStart).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalled();
    });

    test("playDoseReminderChime returns false when volume is 0", async () => {
      const success = await playDoseReminderChime(0);
      expect(success).toBe(false);
    });
  });

  describe("Spoken Alarm Settings Persistence", () => {
    test("returns default spoken settings including 90s interval, pitch 1.0, rate 1.0", () => {
      const settings = getSpokenAlarmSettings();
      expect(settings).toEqual({
        spokenAlarmEnabled: true,
        volume: 0.8,
        voiceURI: "",
        rate: 1.0,
        pitch: 1.0,
        repeatIntervalSec: DEFAULT_REPEAT_INTERVAL_SEC,
      });
    });

    test("persists custom rate, pitch, voiceURI, and repeat interval", () => {
      saveSpokenAlarmSettings({
        spokenAlarmEnabled: true,
        volume: 0.6,
        voiceURI: "Google UK English Female",
        rate: 1.25,
        pitch: 0.95,
        repeatIntervalSec: 120,
      });

      const updated = getSpokenAlarmSettings();
      expect(updated.spokenAlarmEnabled).toBe(true);
      expect(updated.volume).toBe(0.6);
      expect(updated.voiceURI).toBe("Google UK English Female");
      expect(updated.rate).toBe(1.25);
      expect(updated.pitch).toBe(0.95);
      expect(updated.repeatIntervalSec).toBe(120);
    });

    test("clamps rate between 0.75 and 1.5, and pitch between 0.8 and 1.2", () => {
      saveSpokenAlarmSettings({
        rate: 3.0,
        pitch: 0.2,
      });
      const settings = getSpokenAlarmSettings();
      expect(settings.rate).toBe(1.5);
      expect(settings.pitch).toBe(0.8);
    });
  });

  describe("SpeechSynthesis and Spoken Reminder Workflow", () => {
    let originalSpeechSynthesis;
    let originalUtterance;
    let mockSpeak;
    let mockCancel;
    let mockGetVoices;

    beforeEach(() => {
      mockSpeak = jest.fn((utterance) => {
        // Simulate immediate speech completion
        if (utterance && utterance.onend) {
          setTimeout(() => utterance.onend(), 10);
        }
      });
      mockCancel = jest.fn();
      mockGetVoices = jest.fn().mockReturnValue([
        { voiceURI: "NaturalEn", name: "NaturalEn", lang: "en-US" },
      ]);

      originalSpeechSynthesis = window.speechSynthesis;
      originalUtterance = window.SpeechSynthesisUtterance;

      window.speechSynthesis = {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: mockGetVoices,
      };

      window.SpeechSynthesisUtterance = function (text) {
        this.text = text;
        this.volume = 1;
        this.rate = 1;
        this.pitch = 1;
        this.voice = null;
        this.onend = null;
        this.onerror = null;
      };
    });

    afterEach(() => {
      window.speechSynthesis = originalSpeechSynthesis;
      window.SpeechSynthesisUtterance = originalUtterance;
    });

    test("isSpeechSynthesisSupported returns true when window has API", () => {
      expect(isSpeechSynthesisSupported()).toBe(true);
    });

    test("getDeviceVoices returns available speech synthesis voices", () => {
      const voices = getDeviceVoices();
      expect(voices.length).toBe(1);
      expect(voices[0].name).toBe("NaturalEn");
    });

    test("stopSpokenMedicationAlarm cancels ongoing speech immediately", () => {
      stopSpokenMedicationAlarm();
      expect(mockCancel).toHaveBeenCalled();
    });

    test("speakMedicationReminder synthesizes alarm and speaks reminder message", async () => {
      const result = await speakMedicationReminder({
        text: "Please take your medicine now.",
      });
      expect(result).toBe(true);
      expect(mockSpeak).toHaveBeenCalled();
      const calledUtterance = mockSpeak.mock.calls[0][0];
      expect(calledUtterance.text).toBe("Please take your medicine now.");
    });

    test("speakMedicationReminder constructs clinical dose prompt if text is omitted", async () => {
      const sampleDose = {
        medicationName: "Metformin 500",
        dosage: "500",
        dosageUnit: "mg",
      };

      await speakMedicationReminder({ dose: sampleDose });
      expect(mockSpeak).toHaveBeenCalled();
      const calledUtterance = mockSpeak.mock.calls[0][0];
      expect(calledUtterance.text).toContain("Metformin 500");
      expect(calledUtterance.text).toContain("Please take your medicine and mark the dose as taken.");
    });

    test("speakMedicationReminder returns false when spoken alarm is disabled", async () => {
      const result = await speakMedicationReminder({
        text: "Please take your medicine now.",
        settings: { spokenAlarmEnabled: false },
      });
      expect(result).toBe(false);
      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });
});
