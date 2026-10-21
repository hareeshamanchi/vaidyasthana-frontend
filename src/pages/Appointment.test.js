import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
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
    getFamilyMembers: jest.fn(() => Promise.resolve({ data: { familyMembers: [] } })),
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

  test("booking modal disables elapsed time slots with Passed badge and prevents their selection", async () => {
    appointmentsAPI.getSlots.mockResolvedValue({
      data: {
        success: true,
        slots: [
          { timeSlot: "08:00 AM", isAvailable: false, isPast: true, isBooked: false, reason: "Time slot has passed" },
          { timeSlot: "08:30 AM", isAvailable: false, isPast: true, isBooked: false, reason: "Time slot has passed" },
          { timeSlot: "11:00 AM", isAvailable: true, isPast: false, isBooked: false, reason: "Available" },
        ],
      },
    });

    renderAppointmentPage();

    const bookBtn = await screen.findByRole("button", { name: /book new appointment/i });
    fireEvent.click(bookBtn);

    const modal = await screen.findByRole("dialog");
    expect(modal).toBeInTheDocument();

    // Verify passed slot 08:00 AM is disabled and has Passed badge
    const passedSlotBtn = await within(modal).findByRole("button", { name: /08:00 AM/i });
    expect(passedSlotBtn).toBeDisabled();
    expect(passedSlotBtn).toHaveClass("unavailable", "passed");
    expect(within(passedSlotBtn).getByText("Passed")).toBeInTheDocument();

    // Clicking a passed slot should not select it
    fireEvent.click(passedSlotBtn);
    expect(passedSlotBtn).not.toHaveClass("selected");

    // Verify confirm button is disabled with message
    const confirmBtn = within(modal).getByRole("button", { name: /confirm & schedule appointment/i });
    expect(confirmBtn).toBeDisabled();
    expect(within(modal).getByText(/please select an available time slot/i)).toBeInTheDocument();
  });

  test("selecting a valid future slot enables the Confirm & Schedule Appointment button", async () => {
    appointmentsAPI.getSlots.mockResolvedValue({
      data: {
        success: true,
        slots: [
          { timeSlot: "08:00 AM", isAvailable: false, isPast: true, isBooked: false, reason: "Time slot has passed" },
          { timeSlot: "07:30 PM", isAvailable: true, isPast: false, isBooked: false, reason: "Available" },
        ],
      },
    });

    renderAppointmentPage();

    const bookBtn = await screen.findByRole("button", { name: /book new appointment/i });
    fireEvent.click(bookBtn);

    const modal = await screen.findByRole("dialog");

    // Select a future date to ensure the slot is never elapsed regardless of what time of day tests run
    const dateInput = within(modal).getByLabelText(/appointment date \*/i);
    fireEvent.change(dateInput, { target: { value: "2028-12-01" } });

    const validSlotBtn = await within(modal).findByRole("button", { name: /07:30 PM/i });
    expect(validSlotBtn).not.toBeDisabled();

    // Select the valid slot
    fireEvent.click(validSlotBtn);
    expect(validSlotBtn).toHaveClass("selected");

    // Button should now be enabled
    const confirmBtn = within(modal).getByRole("button", { name: /confirm & schedule appointment/i });
    expect(confirmBtn).not.toBeDisabled();
    expect(within(modal).queryByText(/please select an available time slot/i)).not.toBeInTheDocument();
  });

  test("changing appointment date clears the previously selected slot", async () => {
    appointmentsAPI.getSlots.mockImplementation((docId, date) => {
      if (date === "2028-12-02") {
        return Promise.resolve({
          data: {
            success: true,
            slots: [
              { timeSlot: "07:30 PM", isAvailable: false, isPast: false, isBooked: true, reason: "Booked by another patient" },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          slots: [
            { timeSlot: "07:30 PM", isAvailable: true, isPast: false, isBooked: false, reason: "Available" },
          ],
        },
      });
    });

    renderAppointmentPage();

    const bookBtn = await screen.findByRole("button", { name: /book new appointment/i });
    fireEvent.click(bookBtn);

    const modal = await screen.findByRole("dialog");

    // Set future date first
    const dateInput = within(modal).getByLabelText(/appointment date \*/i);
    fireEvent.change(dateInput, { target: { value: "2028-12-01" } });

    const validSlotBtn = await within(modal).findByRole("button", { name: /07:30 PM/i });
    fireEvent.click(validSlotBtn);
    expect(validSlotBtn).toHaveClass("selected");

    // Change the date to another date
    fireEvent.change(dateInput, { target: { value: "2028-12-02" } });

    // The slot should be cleared
    await waitFor(() => {
      const confirmBtn = within(modal).getByRole("button", { name: /confirm & schedule appointment/i });
      expect(confirmBtn).toBeDisabled();
    });
  });

  test("auto-opens booking modal with follow-up banner and links followUpId upon scheduling", async () => {
    appointmentsAPI.getDoctors.mockResolvedValue({
      data: {
        success: true,
        doctors: [
          {
            _id: "doc-999",
            name: "Dr. Suresh Menon",
            specialization: "Cardiology",
            city: "Bangalore",
          },
        ],
      },
    });

    appointmentsAPI.getSlots.mockResolvedValue({
      data: {
        success: true,
        slots: [
          { timeSlot: "11:00 AM", isAvailable: true, isPast: false, isBooked: false, reason: "Available" },
        ],
      },
    });

    appointmentsAPI.createAppointment.mockResolvedValue({
      data: {
        success: true,
        appointment: { _id: "appt-new", followUpId: "fu-deep-123" },
      },
    });

    render(
      <AuthContext.Provider value={{ user: mockPatientUser, setUser: jest.fn() }}>
        <MemoryRouter initialEntries={["/appointment?followUpId=fu-deep-123&doctorId=doc-999&reason=Post-Op%20Review&recommendedDate=2026-10-25"]}>
          <Appointment />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // Modal should be auto-opened
    const modal = await screen.findByRole("dialog");
    expect(modal).toBeInTheDocument();

    // Context banner should be displayed
    expect(within(modal).getByText(/Booking Recommended Follow-Up/i)).toBeInTheDocument();

    // Select slot and submit
    const slotBtn = await within(modal).findByRole("button", { name: /11:00 AM/i });
    fireEvent.click(slotBtn);

    const submitBtn = within(modal).getByRole("button", { name: /confirm & schedule appointment/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(appointmentsAPI.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          followUpId: "fu-deep-123",
          reason: "Post-Op Review",
        })
      );
    });
  });

  test("scopes doctor directory by hospitalId and renders hospital name in doctor select dropdown", async () => {
    appointmentsAPI.getDoctors.mockResolvedValue({
      data: {
        success: true,
        doctors: [
          {
            _id: "doc-mits-jeshu",
            name: "jeshu",
            specialization: "General Medicine",
            hospitalName: "mits college",
            hospitalId: "6ad849ded99e76a6c29f172b",
          },
        ],
      },
    });

    render(
      <AuthContext.Provider value={{ user: { ...mockPatientUser, hospitalId: "6ad849ded99e76a6c29f172b" }, setUser: jest.fn() }}>
        <MemoryRouter initialEntries={["/appointment"]}>
          <Appointment />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // Open booking modal
    const bookBtn = await screen.findByRole("button", { name: /book new appointment/i });
    fireEvent.click(bookBtn);

    const modal = await screen.findByRole("dialog");
    expect(modal).toBeInTheDocument();

    await waitFor(() => {
      expect(appointmentsAPI.getDoctors).toHaveBeenCalledWith({ hospitalId: "6ad849ded99e76a6c29f172b" });
    });

    // Check doctor option label contains hospital name
    const doctorOption = within(modal).getByRole("option", { name: /Dr\. jeshu — General Medicine \(mits college\)/i });
    expect(doctorOption).toBeInTheDocument();
  });
});


