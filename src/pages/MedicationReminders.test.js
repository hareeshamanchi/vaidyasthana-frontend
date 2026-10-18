import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MedicationReminders from "./MedicationReminders";
import { AuthContext } from "../context/AuthContext";
import { medicationsAPI, pushAPI } from "../services/api";
import {
  playDoseReminderChime,
  resumeAudioContext,
} from "../utils/medicationAudio";
import {
  subscribeUserToPush,
  checkPushStatus,
} from "../utils/pushManager";

jest.mock("../utils/medicationAudio", () => {
  const actual = jest.requireActual("../utils/medicationAudio");
  return {
    ...actual,
    playDoseReminderChime: jest.fn().mockResolvedValue(true),
    resumeAudioContext: jest.fn().mockResolvedValue(true),
  };
});

jest.mock("../services/api", () => ({
  medicationsAPI: {
    getDoses: jest.fn(),
    getMedications: jest.fn(),
    getAdherenceStats: jest.fn(),
    getPrescriptions: jest.fn(),
    updateDoseStatus: jest.fn(),
    createMedication: jest.fn(),
    updateMedication: jest.fn(),
    updateStatus: jest.fn(),
    deleteMedication: jest.fn(),
  },
  pushAPI: {
    getVapidKey: jest.fn().mockResolvedValue({ data: { success: true, publicKey: "mock-key" } }),
    subscribe: jest.fn().mockResolvedValue({ data: { success: true } }),
    unsubscribe: jest.fn().mockResolvedValue({ data: { success: true } }),
    testPush: jest.fn().mockResolvedValue({ data: { success: true, message: "Dispatched" } }),
  },
}));

jest.mock("../utils/pushManager", () => ({
  isPushSupported: jest.fn().mockReturnValue(true),
  checkPushStatus: jest.fn().mockResolvedValue({
    isSupported: true,
    permission: "default",
    isSubscribed: false,
  }),
  subscribeUserToPush: jest.fn().mockResolvedValue({ endpoint: "mock-endpoint" }),
  unsubscribeUserFromPush: jest.fn().mockResolvedValue(true),
}));

const mockUser = {
  _id: "60c72b2f9b1d8b2bad0000a1",
  id: "60c72b2f9b1d8b2bad0000a1",
  name: "Ramesh Kumar",
  email: "ramesh@example.com",
  role: "patient",
};

const mockDoses = [
  {
    _id: "dose-1",
    medicationId: "med-1",
    medicationName: "Metformin 500",
    dosage: "500",
    dosageUnit: "mg",
    foodTiming: "after_food",
    instructions: "With breakfast",
    source: "patient_entered",
    reminderTime: "08:00",
    scheduledDate: "2026-10-18",
    status: "Scheduled",
  },
  {
    _id: "dose-2",
    medicationId: "med-1",
    medicationName: "Metformin 500",
    dosage: "500",
    dosageUnit: "mg",
    foodTiming: "after_food",
    instructions: "With dinner",
    source: "patient_entered",
    reminderTime: "20:00",
    scheduledDate: "2026-10-18",
    status: "Scheduled",
  },
];

const mockSchedules = [
  {
    _id: "med-1",
    name: "Metformin 500",
    dosage: "500",
    dosageUnit: "mg",
    frequency: "twice_daily",
    reminderTimes: ["08:00", "20:00"],
    foodTiming: "after_food",
    instructions: "Take with water",
    startDate: "2026-10-01T00:00:00.000Z",
    endDate: null,
    status: "active",
    source: "patient_entered",
  },
];

const mockAdherence = {
  totalEvaluated: 10,
  takenCount: 8,
  missedCount: 1,
  skippedCount: 1,
  adherenceRate: 80,
  medicationBreakdown: [
    {
      medicationId: "med-1",
      name: "Metformin 500",
      dosage: "500",
      dosageUnit: "mg",
      taken: 8,
      missed: 1,
      skipped: 1,
      total: 10,
      adherenceRate: 80,
    },
  ],
};

const renderComponent = (user = mockUser) => {
  return render(
    <AuthContext.Provider value={{ user, loading: false }}>
      <BrowserRouter>
        <MedicationReminders />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe("MedicationReminders Component Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    medicationsAPI.getDoses.mockResolvedValue({
      data: {
        success: true,
        summary: { total: 2, taken: 0, scheduled: 2, missed: 0, skipped: 0 },
        doses: mockDoses,
      },
    });
    medicationsAPI.getMedications.mockResolvedValue({
      data: { success: true, count: 1, medications: mockSchedules },
    });
    medicationsAPI.getAdherenceStats.mockResolvedValue({
      data: { success: true, windowDays: 30, stats: mockAdherence },
    });
    medicationsAPI.getPrescriptions.mockResolvedValue({
      data: { success: true, count: 0, prescriptions: [] },
    });
    medicationsAPI.updateDoseStatus.mockResolvedValue({
      data: { success: true },
    });
    medicationsAPI.createMedication.mockResolvedValue({
      data: { success: true },
    });
    checkPushStatus.mockResolvedValue({
      isSupported: true,
      permission: "default",
      isSubscribed: false,
    });
    subscribeUserToPush.mockResolvedValue({ endpoint: "mock-endpoint" });
  });

  test("1. Renders executive header, tabs, and clinical disclaimer", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Medication Reminders & Dose Tracking")
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: /Daily Doses/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All Schedules/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Adherence Analytics/i })).toBeInTheDocument();
    expect(screen.getByText(/Important Clinical Safety Disclaimer/i)).toBeInTheDocument();
  });

  test("2. Displays daily doses and executes Take Dose action", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("Metformin 500").length).toBeGreaterThan(0);
    });

    const takeButtons = screen.getAllByRole("button", { name: /Take Dose/i });
    expect(takeButtons.length).toBe(2);

    fireEvent.click(takeButtons[0]);

    await waitFor(() => {
      expect(medicationsAPI.updateDoseStatus).toHaveBeenCalledWith("dose-1", {
        status: "Taken",
        notes: "",
      });
    });
  });

  test("3. Snoozes a dose reminder without marking it completed", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Snooze/i }).length).toBe(2);
    });

    const snoozeButtons = screen.getAllByRole("button", { name: /Snooze/i });
    fireEvent.click(snoozeButtons[0]);

    // Snooze dialog appears
    expect(screen.getByText("Snooze Reminder")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: /Confirm Snooze/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(medicationsAPI.updateDoseStatus).toHaveBeenCalledWith("dose-1", {
        action: "snooze",
        snoozeMinutes: 15,
      });
    });
  });

  test("4. Switches to All Schedules tab and displays medication details", async () => {
    renderComponent();

    const schedulesTab = screen.getByRole("tab", { name: /All Schedules/i });
    fireEvent.click(schedulesTab);

    await waitFor(() => {
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText(/twice daily/i)).toBeInTheDocument();
    });
  });

  test("5. Opens Add Medication modal and submits new schedule", async () => {
    renderComponent();

    const addButtons = screen.getAllByRole("button", { name: /Add Medication/i });
    fireEvent.click(addButtons[0]);

    expect(screen.getByText("Add Medication Schedule")).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Medication Name \*/i);
    const dosageInput = screen.getByLabelText(/Dosage Amount \*/i);

    fireEvent.change(nameInput, { target: { value: "Amlodipine" } });
    fireEvent.change(dosageInput, { target: { value: "5" } });

    const submitBtn = screen.getByRole("button", { name: /Save Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(medicationsAPI.createMedication).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Amlodipine",
          dosage: "5",
          dosageUnit: "mg",
          frequency: "once_daily",
          reminderTimes: ["08:00"],
        })
      );
    });
  });

  test("6. Switches to Adherence Analytics and displays 80% gauge score", async () => {
    renderComponent();

    const adherenceTab = screen.getByRole("tab", { name: /Adherence Analytics/i });
    fireEvent.click(adherenceTab);

    await waitFor(() => {
      expect(screen.getAllByText("80%").length).toBeGreaterThan(0);
      expect(screen.getByText(/Dose Completion Summary/i)).toBeInTheDocument();
      expect(screen.getByText("Taken Doses")).toBeInTheDocument();
    });
  });

  test("7. Renders Sound-Based Dose Reminders control card with toggle and test button", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Sound-Based Dose Reminders")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Sound On")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Test Sound/i })).toBeInTheDocument();
    });

    // Test playing sample chime
    const testSoundBtn = screen.getByRole("button", { name: /Test Sound/i });
    fireEvent.click(testSoundBtn);

    await waitFor(() => {
      expect(playDoseReminderChime).toHaveBeenCalled();
    });

    // Toggle sound off
    const toggleCheckbox = screen.getByLabelText(/Sound On/i);
    fireEvent.click(toggleCheckbox);

    await waitFor(() => {
      expect(screen.getByText("Muted")).toBeInTheDocument();
      expect(screen.getByText("Sound Off")).toBeInTheDocument();
    });
  });

  test("8. Adjusts volume slider and reflects percentage", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/Reminder chime volume/i)).toBeInTheDocument();
    });

    const volumeSlider = screen.getByLabelText(/Reminder chime volume/i);
    fireEvent.change(volumeSlider, { target: { value: "0.6" } });

    await waitFor(() => {
      expect(screen.getByText("60%")).toBeInTheDocument();
    });
  });

  test("9. Detects active due dose, displays pulsing alert banner with 90s chime pill, and stops on acknowledge", async () => {
    const pastScheduledTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    medicationsAPI.getDoses.mockResolvedValueOnce({
      data: {
        success: true,
        summary: { total: 1, scheduled: 1, taken: 0, missed: 0, skipped: 0 },
        doses: [
          {
            _id: "urgent-dose-1",
            medicationName: "Atorvastatin 20",
            dosage: "20",
            dosageUnit: "mg",
            status: "Scheduled",
            scheduledTime: pastScheduledTime,
            reminderTime: "09:00",
            scheduledDate: new Date().toISOString().split("T")[0],
          },
        ],
      },
    });

    renderComponent();

    // The active due banner should render
    await waitFor(() => {
      const alertBanner = screen.getByRole("alert");
      expect(alertBanner).toBeInTheDocument();
      expect(within(alertBanner).getByText(/Medication Due Now \(1\)/i)).toBeInTheDocument();
      expect(within(alertBanner).getByText(/Repeating chime in/i)).toBeInTheDocument();
    });

    const alertBanner = screen.getByRole("alert");
    // Acknowledge by clicking "Taken" on the active due banner
    const takeButton = within(alertBanner).getByRole("button", { name: /Taken/i });
    fireEvent.click(takeButton);

    await waitFor(() => {
      expect(medicationsAPI.updateDoseStatus).toHaveBeenCalledWith("urgent-dose-1", {
        status: "Taken",
        notes: "",
      });
      // Banner should disappear immediately because local state is optimistically updated
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  test("10. Renders Mobile & Closed Browser Advisory Notice", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Browser & Mobile Audio Notice:/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Web Audio API playback require an open tab/i)
      ).toBeInTheDocument();
    });
  });

  test("11. Renders Background System Push Notifications card and handles enabling push", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Background System Push Notifications")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Enable Background Alerts/i })).toBeInTheDocument();
    });

    const enablePushBtn = screen.getByRole("button", { name: /Enable Background Alerts/i });
    fireEvent.click(enablePushBtn);

    await waitFor(() => {
      expect(subscribeUserToPush).toHaveBeenCalled();
    });
  });

  test("12. Dispatches test push notification when subscribed", async () => {
    checkPushStatus.mockResolvedValueOnce({
      isSupported: true,
      permission: "granted",
      isSubscribed: true,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Test Push/i })).toBeInTheDocument();
    });

    const testPushBtn = screen.getByRole("button", { name: /Test Push/i });
    fireEvent.click(testPushBtn);

    await waitFor(() => {
      expect(pushAPI.testPush).toHaveBeenCalled();
    });
  });
});

