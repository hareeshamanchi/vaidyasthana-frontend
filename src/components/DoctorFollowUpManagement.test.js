import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DoctorFollowUpManagement from "./DoctorFollowUpManagement";
import { followUpsAPI } from "../services/api";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../services/api", () => ({
  followUpsAPI: {
    getFollowUps: jest.fn(),
    getDoctorStats: jest.fn(),
    createFollowUp: jest.fn(),
    updateFollowUp: jest.fn(),
    cancelFollowUp: jest.fn(),
  },
}));

const mockDoctorStats = {
  total: 4,
  pending_booking: 1,
  appointment_booked: 1,
  completed: 1,
  missed: 1,
  cancelled: 0,
};

const mockFollowUps = [
  {
    _id: "fu-101",
    patientName: "Vikram Malhotra",
    patientId: {
      _id: "p-001",
      name: "Vikram Malhotra",
      phoneNumber: "+91 9988776655",
      email: "vikram@example.com",
    },
    reason: "Post-angioplasty stent check",
    doctorInstructions: "Check for chest pain or shortness of breath. Maintain low sodium diet.",
    recommendedDate: "2026-11-20T00:00:00.000Z",
    priority: "urgent",
    status: "pending_booking",
    recommendedTests: ["2D Echocardiogram", "Lipid Profile"],
    notes: "High risk patient.",
  },
  {
    _id: "fu-102",
    patientName: "Meera Sen",
    patientId: {
      _id: "p-002",
      name: "Meera Sen",
      phoneNumber: "+91 9123456780",
      email: "meera@example.com",
    },
    reason: "Thyroid hormone titration",
    doctorInstructions: "Get TSH and Free T4 drawn in fasting state.",
    recommendedDate: "2026-12-05T00:00:00.000Z",
    priority: "routine",
    status: "appointment_booked",
    appointmentId: {
      _id: "app-202",
      appointmentDate: "2026-12-05T00:00:00.000Z",
      timeSlot: "09:30 AM",
      status: "Scheduled",
    },
    recommendedTests: ["TSH", "Free T4"],
  },
];

const mockPatients = [
  {
    _id: "p-001",
    name: "Vikram Malhotra",
    phoneNumber: "+91 9988776655",
    email: "vikram@example.com",
  },
  {
    _id: "p-002",
    name: "Meera Sen",
    phoneNumber: "+91 9123456780",
    email: "meera@example.com",
  },
];

const mockAppointments = [
  {
    _id: "app-101",
    patientId: "p-001",
    patientName: "Vikram Malhotra",
    appointmentDate: "2026-10-15T00:00:00.000Z",
    timeSlot: "10:00 AM",
    status: "Completed",
    reason: "Cardiology follow-up",
  },
];

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <DoctorFollowUpManagement
        associatedPatients={mockPatients}
        doctorAppointments={mockAppointments}
        {...props}
      />
    </BrowserRouter>
  );
};

describe("DoctorFollowUpManagement Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    followUpsAPI.getFollowUps.mockResolvedValue({
      data: {
        success: true,
        count: mockFollowUps.length,
        followUps: mockFollowUps,
      },
    });
    followUpsAPI.getDoctorStats.mockResolvedValue({
      data: {
        success: true,
        stats: mockDoctorStats,
      },
    });
  });

  test("renders doctor follow-up management and statistics overview", async () => {
    renderComponent();

    expect(screen.getByText(/Physician Follow-Up Management/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Post-angioplasty stent check")).toBeInTheDocument();
      expect(screen.getByText("Thyroid hormone titration")).toBeInTheDocument();
    });

    // Check stats display
    expect(screen.getByText("Total Follow-Ups")).toBeInTheDocument();
    expect(screen.getAllByText("Needs Booking").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Booked Visits")).toBeInTheDocument();
  });

  test("opens Create Follow-Up Modal and submits new plan", async () => {
    followUpsAPI.createFollowUp.mockResolvedValue({
      data: {
        success: true,
        message: "Follow-up care plan created successfully.",
        followUp: { _id: "fu-new", reason: "Diabetes follow-up" },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Post-angioplasty stent check")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /Create Follow-Up Plan/i });
    fireEvent.click(createBtn);

    expect(screen.getByText(/Author Clinical Follow-Up Plan/i)).toBeInTheDocument();

    // Fill in required fields
    const reasonInput = screen.getByPlaceholderText(/e\.g\. Post-operative evaluation/i);
    fireEvent.change(reasonInput, { target: { value: "Cardiology review" } });

    const instructionsInput = screen.getByPlaceholderText(/e\.g\. Monitor blood pressure daily/i);
    fireEvent.change(instructionsInput, { target: { value: "Check pulse daily." } });

    const submitBtn = screen.getByRole("button", { name: /Prescribe Follow-Up Plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(followUpsAPI.createFollowUp).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "Cardiology review",
          doctorInstructions: "Check pulse daily.",
          patientId: "p-001",
        })
      );
    });
  });

  test("opens Edit Follow-Up Modal and submits updates", async () => {
    followUpsAPI.updateFollowUp.mockResolvedValue({
      data: {
        success: true,
        message: "Follow-up care plan updated successfully.",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Post-angioplasty stent check")).toBeInTheDocument();
    });

    const editBtns = screen.getAllByRole("button", { name: /^Edit$/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText(/Edit Follow-Up Plan/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(followUpsAPI.updateFollowUp).toHaveBeenCalledWith(
        "fu-101",
        expect.objectContaining({
          reason: "Post-angioplasty stent check",
        })
      );
    });
  });

  test("opens Cancel Follow-Up Modal and cancels plan", async () => {
    followUpsAPI.cancelFollowUp.mockResolvedValue({
      data: {
        success: true,
        message: "Follow-up care plan has been cancelled.",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Post-angioplasty stent check")).toBeInTheDocument();
    });

    const cancelBtns = screen.getAllByRole("button", { name: /^Cancel$/i });
    fireEvent.click(cancelBtns[0]);

    expect(screen.getByText(/Confirm Cancellation/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Cancellation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(followUpsAPI.cancelFollowUp).toHaveBeenCalledWith(
        "fu-101",
        expect.objectContaining({
          cancellationReason: expect.any(String),
        })
      );
    });
  });

  test("auto-opens create modal when prefillRequest prop is supplied", async () => {
    const onClearPrefillRequest = jest.fn();
    renderComponent({
      prefillRequest: {
        patientId: "p-002",
        consultationId: "app-101",
        patientName: "Meera Sen",
        reason: "Review blood reports",
      },
      onClearPrefillRequest,
    });

    await waitFor(() => {
      expect(screen.getByText(/Author Clinical Follow-Up Plan/i)).toBeInTheDocument();
    });

    expect(onClearPrefillRequest).toHaveBeenCalled();
  });
});
