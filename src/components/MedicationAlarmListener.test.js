import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import MedicationAlarmListener from "./MedicationAlarmListener";
import { AuthContext } from "../context/AuthContext";
import { medicationsAPI } from "../services/api";
import {
  getDuePendingDoses,
  speakMedicationReminder,
  stopSpokenMedicationAlarm,
  getSpokenAlarmSettings,
} from "../utils/medicationAudio";

jest.mock("../services/api", () => ({
  medicationsAPI: {
    getDoses: jest.fn(),
    updateDoseStatus: jest.fn(),
  },
}));

jest.mock("../services/socket", () => ({
  getSocket: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

jest.mock("../utils/medicationAudio", () => ({
  getDuePendingDoses: jest.fn(),
  getSpokenAlarmSettings: jest.fn(),
  speakMedicationReminder: jest.fn(),
  stopSpokenMedicationAlarm: jest.fn(),
  DEFAULT_REPEAT_INTERVAL_SEC: 90,
}));

const mockPatientUser = {
  _id: "p1",
  name: "Ramesh Patel",
  role: "patient",
};

describe("MedicationAlarmListener (Cross-Page Spoken Reminder) Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDuePendingDoses.mockImplementation((doses) => doses || []);
    getSpokenAlarmSettings.mockReturnValue({
      spokenAlarmEnabled: true,
      volume: 0.8,
      voiceURI: "",
      rate: 1.0,
      pitch: 1.0,
      repeatIntervalSec: 90,
    });
    speakMedicationReminder.mockResolvedValue(true);
    medicationsAPI.getDoses.mockResolvedValue({
      data: {
        success: true,
        doses: [
          {
            _id: "bg-dose-1",
            medicationName: "Metformin 500",
            dosage: "500",
            dosageUnit: "mg",
            status: "Scheduled",
          },
        ],
      },
    });
    medicationsAPI.updateDoseStatus.mockResolvedValue({
      data: { success: true },
    });
  });

  test("1. Renders nothing on /medications page to prevent duplicate alarms", async () => {
    const { container } = render(
      <AuthContext.Provider value={{ user: mockPatientUser }}>
        <MemoryRouter initialEntries={["/medications"]}>
          <MedicationAlarmListener />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(container.firstChild).toBeNull();
    expect(medicationsAPI.getDoses).not.toHaveBeenCalled();
  });

  test("2. Renders nothing when user is null or doctor", async () => {
    const doctorUser = { _id: "d1", name: "Dr. Sharma", role: "doctor" };
    const { container } = render(
      <AuthContext.Provider value={{ user: doctorUser }}>
        <MemoryRouter initialEntries={["/doctor-dashboard"]}>
          <MedicationAlarmListener />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(container.firstChild).toBeNull();
  });

  test("3. When on other pages (e.g. /dashboard), checks doses, speaks alarm, and shows floating toast", async () => {
    render(
      <AuthContext.Provider value={{ user: mockPatientUser }}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <MedicationAlarmListener />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole("alert", { name: /Pending Medication Alarm/i })).toBeInTheDocument();
      expect(screen.getByText("Medication Due Now")).toBeInTheDocument();
      expect(screen.getByText(/Metformin 500/i)).toBeInTheDocument();
      expect(speakMedicationReminder).toHaveBeenCalled();
    });
  });

  test("4. Marking dose as Taken stops speech and calls updateDoseStatus", async () => {
    render(
      <AuthContext.Provider value={{ user: mockPatientUser }}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <MedicationAlarmListener />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Take/i })).toBeInTheDocument();
    });

    const takeBtn = screen.getByRole("button", { name: /Take/i });
    fireEvent.click(takeBtn);

    await waitFor(() => {
      expect(stopSpokenMedicationAlarm).toHaveBeenCalled();
      expect(medicationsAPI.updateDoseStatus).toHaveBeenCalledWith("bg-dose-1", {
        status: "Taken",
        notes: "",
      });
    });
  });

  test("5. Snoozing dose stops speech and calls updateDoseStatus with snooze action", async () => {
    render(
      <AuthContext.Provider value={{ user: mockPatientUser }}>
        <MemoryRouter initialEntries={["/appointment"]}>
          <MedicationAlarmListener />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Snooze/i })).toBeInTheDocument();
    });

    const snoozeBtn = screen.getByRole("button", { name: /Snooze/i });
    fireEvent.click(snoozeBtn);

    await waitFor(() => {
      expect(stopSpokenMedicationAlarm).toHaveBeenCalled();
      expect(medicationsAPI.updateDoseStatus).toHaveBeenCalledWith("bg-dose-1", {
        action: "snooze",
        snoozeMinutes: 15,
      });
    });
  });

  test("6. Dismissing toast stops speech immediately and hides floating toast", async () => {
    render(
      <AuthContext.Provider value={{ user: mockPatientUser }}>
        <MemoryRouter initialEntries={["/timeline"]}>
          <MedicationAlarmListener />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Dismiss alert/i })).toBeInTheDocument();
    });

    const dismissBtn = screen.getByRole("button", { name: /Dismiss alert/i });
    fireEvent.click(dismissBtn);

    expect(stopSpokenMedicationAlarm).toHaveBeenCalled();
    expect(screen.queryByRole("alert", { name: /Pending Medication Alarm/i })).not.toBeInTheDocument();
  });
});
