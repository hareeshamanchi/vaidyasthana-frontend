import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import VideoConsultation from "./VideoConsultation";
import { appointmentsAPI } from "../services/api";

jest.mock("../services/api", () => ({
  appointmentsAPI: {
    getVideoAccess: jest.fn(),
  },
}));

describe("VideoConsultation Telehealth Component Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Renders loading indicator while authorizing session", () => {
    appointmentsAPI.getVideoAccess.mockReturnValue(new Promise(() => {})); // Never resolves during this check

    render(
      <MemoryRouter initialEntries={["/consultation/appt-123"]}>
        <Routes>
          <Route path="/consultation/:id" element={<VideoConsultation />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Securing Clinical Consultation Channel/i)).toBeInTheDocument();
  });

  test("Renders access denied error message when user is unauthorized", async () => {
    appointmentsAPI.getVideoAccess.mockRejectedValue({
      response: {
        status: 403,
        data: {
          success: false,
          message: "Access denied: You are not an authorized participant for this consultation.",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/consultation/appt-456"]}>
        <Routes>
          <Route path="/consultation/:id" element={<VideoConsultation />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Consultation Access Restricted/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You are not an authorized participant for this consultation/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Return to Appointments/i })).toBeInTheDocument();
  });

  test("Renders pre-call lobby card with doctor and patient details when authorized", async () => {
    appointmentsAPI.getVideoAccess.mockResolvedValue({
      data: {
        success: true,
        meeting: {
          roomName: "vaidyasthana-consult-test-room-123",
          domain: "meet.jit.si",
          appointmentId: "appt-789",
          appointmentDate: "2026-10-20T00:00:00.000Z",
          timeSlot: "10:30 AM",
          consultationType: "Video / Online",
          status: "Scheduled",
          doctorName: "Dr. Sunita Rao",
          patientName: "Amit Kumar",
          department: "Cardiology",
          userRole: "patient",
          displayName: "Amit Kumar",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/consultation/appt-789"]}>
        <Routes>
          <Route path="/consultation/:id" element={<VideoConsultation />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Ready to enter your Consultation Room/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Sunita Rao/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Amit Kumar/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/10:30 AM/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enter Video Consultation/i })).toBeInTheDocument();
  });

  test("Handles camera/microphone permission denial gracefully with clear instructions", async () => {
    appointmentsAPI.getVideoAccess.mockResolvedValue({
      data: {
        success: true,
        meeting: {
          roomName: "vaidyasthana-consult-test-room-123",
          domain: "meet.jit.si",
          appointmentId: "appt-789",
          appointmentDate: "2026-10-20T00:00:00.000Z",
          timeSlot: "10:30 AM",
          consultationType: "Video / Online",
          status: "Scheduled",
          doctorName: "Dr. Sunita Rao",
          patientName: "Amit Kumar",
          department: "Cardiology",
          userRole: "patient",
          displayName: "Amit Kumar",
        },
      },
    });

    // Mock navigator.mediaDevices.getUserMedia throwing NotAllowedError
    const originalMediaDevices = navigator.mediaDevices;
    navigator.mediaDevices = {
      getUserMedia: jest.fn().mockRejectedValue({
        name: "NotAllowedError",
        message: "Permission denied by user",
      }),
    };

    render(
      <MemoryRouter initialEntries={["/consultation/appt-789"]}>
        <Routes>
          <Route path="/consultation/:id" element={<VideoConsultation />} />
        </Routes>
      </MemoryRouter>
    );

    const joinBtn = await screen.findByRole("button", { name: /Enter Video Consultation/i });
    fireEvent.click(joinBtn);

    expect(
      await screen.findByText(/Camera or Microphone Permission Needed/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please enable camera and microphone permissions in your browser/i)
    ).toBeInTheDocument();

    navigator.mediaDevices = originalMediaDevices;
  });
});
