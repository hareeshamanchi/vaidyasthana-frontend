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
});
