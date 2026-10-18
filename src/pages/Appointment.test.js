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
