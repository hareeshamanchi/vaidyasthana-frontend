import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MedicationReminders from "./MedicationReminders";
import { AuthContext } from "../context/AuthContext";
import { medicationsAPI } from "../services/api";

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
});
