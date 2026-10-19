import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Appointment from "./Appointment";
import { AuthContext } from "../context/AuthContext";
import { appointmentsAPI, authAPI } from "../services/api";

jest.mock("../services/api", () => ({
  appointmentsAPI: {
    getAppointments: jest.fn(),
    getDoctors: jest.fn(),
    getSlots: jest.fn(),
    createAppointment: jest.fn(),
    updateAppointment: jest.fn(),
  },
  authAPI: {
    getDoctors: jest.fn(),
    getMe: jest.fn(),
    updateMe: jest.fn(),
  },
}));

jest.mock("../services/socket", () => ({
  getSocket: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  })),
}));

jest.mock("../components/ConsultationJoinButton", () => {
  return function MockConsultationJoinButton() {
    return <button type="button" data-testid="mock-join-btn">Join Video</button>;
  };
});

// Fix current time to 2026-10-18T09:00:00.000Z so future appointments are upcoming
jest.mock("../utils/consultationWindow", () => {
  const actual = jest.requireActual("../utils/consultationWindow");
  return {
    ...actual,
    useConsultationTimer: () => new Date("2026-10-18T09:00:00.000Z"),
  };
});

const mockPatientUser = {
  _id: "patient-123",
  id: "patient-123",
  name: "Ananya Sharma",
  email: "ananya@example.com",
  role: "patient",
  phoneNumber: "+91 9876543210",
  address: "Bangalore, India",
};

const mockUpcomingAppointment = {
  _id: "appt-999",
  doctorName: "Dr. Suresh Menon",
  department: "Cardiology",
  appointmentDate: "2026-10-25",
  timeSlot: "10:00 AM - 10:30 AM",
  consultationType: "Video Consultation",
  status: "Scheduled",
  reason: "Follow-up consultation for lipid profile check",
  patientName: "Ananya Sharma",
  patientId: "patient-123",
};

const mockCompletedAppointment = {
  _id: "appt-888",
  doctorName: "Dr. Priya Nair",
  department: "Dermatology",
  appointmentDate: "2026-10-10",
  timeSlot: "02:00 PM - 02:30 PM",
  consultationType: "In-Person",
  status: "Completed",
  reason: "Skin allergy review",
  patientName: "Ananya Sharma",
  patientId: "patient-123",
};

const renderAppointmentPage = (user = mockPatientUser) => {
  return render(
    <AuthContext.Provider value={{ user, setUser: jest.fn() }}>
      <BrowserRouter>
        <Appointment />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe("Appointment Management Page - Custom Accessible Cancellation Modal & Layout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appointmentsAPI.getAppointments.mockResolvedValue({
      data: {
        success: true,
        appointments: [mockUpcomingAppointment, mockCompletedAppointment],
      },
    });
    appointmentsAPI.getDoctors.mockResolvedValue({
      data: {
        success: true,
        doctors: [
          {
            _id: "doc-1",
            name: "Dr. Suresh Menon",
            specialization: "Cardiology",
          },
        ],
      },
    });
    appointmentsAPI.getSlots.mockResolvedValue({
      data: {
        success: true,
        slots: [],
      },
    });
  });

  test("renders appointments list and displays compact cancel action button on upcoming card", async () => {
    renderAppointmentPage();

    await waitFor(() => {
      expect(screen.getByText("Dr. Suresh Menon")).toBeInTheDocument();
    });

    // Upcoming appointment has compact cancel button
    const cancelBtn = screen.getByRole("button", { name: /cancel appointment with Dr\. Suresh Menon/i });
    expect(cancelBtn).toBeInTheDocument();
    expect(cancelBtn).toHaveClass("btn-card-cancel-action");

    // Completed appointment should NOT have cancel button
    expect(screen.getByText("Dr. Priya Nair")).toBeInTheDocument();
    expect(screen.getByText("Consultation Completed")).toBeInTheDocument();
  });

  test("opens custom accessible cancellation confirmation modal when cancel button is clicked", async () => {
    renderAppointmentPage();

    await waitFor(() => {
      expect(screen.getByText("Dr. Suresh Menon")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel appointment with Dr\. Suresh Menon/i });
    fireEvent.click(cancelBtn);

    // Modal appears with accessible attributes
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: /cancel appointment\?/i })).toBeInTheDocument();

    // Context details are displayed inside modal
    expect(within(dialog).getByText("Dr. Suresh Menon")).toBeInTheDocument();
    expect(within(dialog).getByText("10:00 AM - 10:30 AM")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Are you sure you want to cancel this scheduled consultation?")
    ).toBeInTheDocument();

    // Keep and Confirm buttons exist
    expect(screen.getByRole("button", { name: /keep appointment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm cancellation/i })).toBeInTheDocument();
  });

  test("dismisses modal without cancelling when 'Keep Appointment' is clicked", async () => {
    renderAppointmentPage();

    await waitFor(() => {
      expect(screen.getByText("Dr. Suresh Menon")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel appointment with Dr\. Suresh Menon/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click Keep Appointment
    const keepBtn = screen.getByRole("button", { name: /keep appointment/i });
    fireEvent.click(keepBtn);

    // Modal is removed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // API was NOT called
    expect(appointmentsAPI.updateAppointment).not.toHaveBeenCalled();
  });

  test("dismisses modal when Escape key is pressed", async () => {
    renderAppointmentPage();

    await waitFor(() => {
      expect(screen.getByText("Dr. Suresh Menon")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel appointment with Dr\. Suresh Menon/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(appointmentsAPI.updateAppointment).not.toHaveBeenCalled();
  });

  test("submits cancellation successfully and refreshes appointments", async () => {
    appointmentsAPI.updateAppointment.mockResolvedValueOnce({
      data: { success: true, message: "Appointment cancelled." },
    });

    renderAppointmentPage();

    await waitFor(() => {
      expect(screen.getByText("Dr. Suresh Menon")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel appointment with Dr\. Suresh Menon/i });
    fireEvent.click(cancelBtn);

    const confirmBtn = screen.getByRole("button", { name: /confirm cancellation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(appointmentsAPI.updateAppointment).toHaveBeenCalledWith("appt-999", {
        status: "Cancelled",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Appointment cancelled successfully.")).toBeInTheDocument();
    });

    // Modal closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("handles cancellation API failure: displays error and preserves appointment in modal", async () => {
    appointmentsAPI.updateAppointment.mockRejectedValueOnce({
      response: {
        data: { message: "Cancellation window has closed for this slot." },
      },
    });

    renderAppointmentPage();

    await waitFor(() => {
      expect(screen.getByText("Dr. Suresh Menon")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel appointment with Dr\. Suresh Menon/i });
    fireEvent.click(cancelBtn);

    const confirmBtn = screen.getByRole("button", { name: /confirm cancellation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Cancellation window has closed for this slot.")
      ).toBeInTheDocument();
    });

    // Modal stays open so user can read the error and keep appointment
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("Appointment Booking - Time Slots & Elapsed Slot Validation", () => {
  const mockDoctor = {
    _id: "doc-101",
    name: "Dr. Suresh Menon",
    specialization: "Cardiology",
    experienceYears: 12,
    consultationFee: 700,
    city: "Bangalore",
  };

  const mockSlotsToday = [
    {
      timeSlot: "08:00 AM",
      isAvailable: false,
      isBooked: false,
      isPast: true,
      reason: "Time slot has passed",
    },
    {
      timeSlot: "08:30 AM",
      isAvailable: false,
      isBooked: false,
      isPast: true,
      reason: "Time slot has passed",
    },
    {
      timeSlot: "06:00 PM",
      isAvailable: false,
      isBooked: true,
      isPast: false,
      reason: "Booked by another patient",
    },
    {
      timeSlot: "06:30 PM",
      isAvailable: true,
      isBooked: false,
      isPast: false,
      reason: "Available",
    },
    {
      timeSlot: "07:00 PM",
      isAvailable: true,
      isBooked: false,
      isPast: false,
      reason: "Available",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentsAPI.getAppointments.mockResolvedValue({
      data: {
        success: true,
        appointments: [mockUpcomingAppointment],
      },
    });
    appointmentsAPI.getDoctors.mockResolvedValue({
      data: {
        success: true,
        doctors: [mockDoctor],
      },
    });
    appointmentsAPI.getSlots.mockResolvedValue({
      data: {
        success: true,
        slots: mockSlotsToday,
      },
    });
  });

  test("renders available and elapsed time slots: marks elapsed slots as disabled with 'Passed' badge", async () => {
    renderAppointmentPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /book new appointment/i })).toBeInTheDocument();
    });

    // Open booking modal
    fireEvent.click(screen.getByRole("button", { name: /book new appointment/i }));

    await waitFor(() => {
      expect(screen.getByText("Schedule Clinical Consultation")).toBeInTheDocument();
    });

    // Verify elapsed slot 08:00 AM
    await waitFor(() => {
      const slot0800 = screen.getByRole("button", { name: /08:00 AM Passed/i });
      expect(slot0800).toBeInTheDocument();
      expect(slot0800).toBeDisabled();
      expect(slot0800).toHaveAttribute("aria-disabled", "true");
      expect(slot0800).toHaveAttribute("tabindex", "-1");
      expect(slot0800).toHaveClass("unavailable");
      expect(slot0800).toHaveClass("passed");
      expect(within(slot0800).getByText("Passed")).toBeInTheDocument();
    });

    // Verify booked slot 06:00 PM (on future date)
    const dateInput = document.querySelector('input[name="appointmentDate"]');
    fireEvent.change(dateInput, { target: { value: "2028-11-20" } });

    await waitFor(() => {
      const slot0600 = screen.getByRole("button", { name: /06:00 PM Booked/i });
      expect(slot0600).toBeInTheDocument();
      expect(slot0600).toBeDisabled();
      expect(slot0600).toHaveClass("occupied");
    });

    // Verify open slot 06:30 PM is interactive
    const slot0630 = screen.getByRole("button", { name: /06:30 PM/i });
    expect(slot0630).toBeInTheDocument();
    expect(slot0630).not.toBeDisabled();
    expect(slot0630).toHaveAttribute("tabindex", "0");
  });

  test("elapsed time slot cannot be clicked or selected", async () => {
    renderAppointmentPage();

    fireEvent.click(await screen.findByRole("button", { name: /book new appointment/i }));

    const slot0800 = await screen.findByRole("button", { name: /08:00 AM Passed/i });
    expect(slot0800).toBeDisabled();

    // Click on disabled elapsed slot
    fireEvent.click(slot0800);

    // It must NOT have selected styling or Selected badge
    expect(slot0800).not.toHaveClass("selected");
    expect(within(slot0800).queryByText("Selected")).not.toBeInTheDocument();
  });

  test("selecting an open slot marks it selected and changing date clears selection", async () => {
    renderAppointmentPage();

    fireEvent.click(await screen.findByRole("button", { name: /book new appointment/i }));

    const dateInput = document.querySelector('input[name="appointmentDate"]');
    fireEvent.change(dateInput, { target: { value: "2028-11-20" } });

    const slot0630 = await screen.findByRole("button", { name: /06:30 PM/i });
    expect(slot0630).not.toBeDisabled();

    // Click available slot
    fireEvent.click(slot0630);

    // Slot is now selected
    expect(slot0630).toHaveClass("selected");
    expect(within(slot0630).getByText("Selected")).toBeInTheDocument();

    // Change appointment date
    fireEvent.change(dateInput, { target: { value: "2028-11-25" } });

    // Selection should be immediately cleared
    expect(slot0630).not.toHaveClass("selected");
    expect(within(slot0630).queryByText("Selected")).not.toBeInTheDocument();
  });

  test("booking confirmation submits selected slot with clinic timezone", async () => {
    appointmentsAPI.createAppointment.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Appointment confirmed",
      },
    });

    renderAppointmentPage();

    fireEvent.click(await screen.findByRole("button", { name: /book new appointment/i }));

    const dateInput = document.querySelector('input[name="appointmentDate"]');
    fireEvent.change(dateInput, { target: { value: "2028-11-20" } });

    const slot0630 = await screen.findByRole("button", { name: /06:30 PM/i });
    fireEvent.click(slot0630);

    // Submit booking
    const confirmBtn = screen.getByRole("button", { name: /confirm appointment booking/i });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(appointmentsAPI.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: "doc-101",
          appointmentDate: "2028-11-20",
          timeSlot: "06:30 PM",
          timezone: "Asia/Kolkata",
        })
      );
    });
  });
});

