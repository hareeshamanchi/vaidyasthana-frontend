import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import VideoConsultation from "./VideoConsultation";
import { appointmentsAPI } from "../services/api";

jest.mock("../services/api", () => ({
  appointmentsAPI: {
    getVideoAccess: jest.fn(),
    updateAppointment: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe("VideoConsultation Telehealth Component Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appointmentsAPI.updateAppointment.mockResolvedValue({ data: { success: true } });
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

  test("Initializes Jitsi with non-blocking banner and transitions across waiting and connected states", async () => {
    // Mock JitsiMeetExternalAPI on window
    const listeners = {};
    class MockJitsiAPI {
      constructor(domain, options) {
        this.domain = domain;
        this.options = options;
        MockJitsiAPI.lastInstance = this;
        if (options.parentNode) {
          const iframe = document.createElement("iframe");
          iframe.setAttribute("data-testid", "jitsi-iframe");
          options.parentNode.appendChild(iframe);
        }
      }
      addEventListener(event, cb) {
        listeners[event] = cb;
      }
      executeCommand(cmd) {}
      dispose() {}
    }
    window.JitsiMeetExternalAPI = MockJitsiAPI;

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

    const originalMediaDevices = navigator.mediaDevices;
    navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    };

    render(
      <MemoryRouter initialEntries={["/consultation/appt-789"]}>
        <Routes>
          <Route path="/consultation/:id" element={<VideoConsultation />} />
        </Routes>
      </MemoryRouter>
    );

    const enterBtn = await screen.findByRole("button", { name: /Enter Video Consultation/i });
    fireEvent.click(enterBtn);

    // 1. Should show "Connecting to meeting server..." non-blocking banner & header status
    const connectingElements = await screen.findAllByText(/Connecting to meeting server.../i);
    expect(connectingElements.length).toBeGreaterThanOrEqual(1);

    // 2. Simulate local user joining the conference (videoConferenceJoined)
    // Wait for JitsiMeetExternalAPI to instantiate and register event listeners
    await waitFor(() => {
      expect(listeners["videoConferenceJoined"]).toBeDefined();
    });
    act(() => {
      listeners["videoConferenceJoined"]({});
    });

    const waitingElements = await screen.findAllByText(/Waiting for the other participant/i);
    expect(waitingElements.length).toBeGreaterThanOrEqual(1);

    // 3. Simulate remote peer joining (participantJoined)
    // Should transition to "Connected to meeting"
    expect(listeners["participantJoined"]).toBeDefined();
    act(() => {
      listeners["participantJoined"]({ id: "peer-1" });
    });

    const connectedElements = await screen.findAllByText(/Connected to meeting/i);
    expect(connectedElements.length).toBeGreaterThanOrEqual(1);

    // 4. Simulate hanging up (readyToClose)
    // Should transition to "Consultation Session Concluded"
    expect(listeners["readyToClose"]).toBeDefined();
    act(() => {
      listeners["readyToClose"]({});
    });

    expect(await screen.findByRole("heading", { name: /Consultation Session Concluded/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rejoin Consultation/i })).toBeInTheDocument();

    navigator.mediaDevices = originalMediaDevices;
    delete window.JitsiMeetExternalAPI;
  });

  test("Handles WebRTC connection failure with diagnostic instructions and retry action", async () => {
    const listeners = {};
    class MockJitsiAPI {
      constructor(domain, options) {
        MockJitsiAPI.lastInstance = this;
      }
      addEventListener(event, cb) {
        listeners[event] = cb;
      }
      executeCommand(cmd) {}
      dispose() {}
    }
    window.JitsiMeetExternalAPI = MockJitsiAPI;

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

    const originalMediaDevices = navigator.mediaDevices;
    navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    };

    render(
      <MemoryRouter initialEntries={["/consultation/appt-789"]}>
        <Routes>
          <Route path="/consultation/:id" element={<VideoConsultation />} />
        </Routes>
      </MemoryRouter>
    );

    const enterBtn = await screen.findByRole("button", { name: /Enter Video Consultation/i });
    fireEvent.click(enterBtn);

    const connectingElements = await screen.findAllByText(/Connecting to meeting server.../i);
    expect(connectingElements.length).toBeGreaterThanOrEqual(1);

    // Wait for connectionFailed listener and trigger it
    await waitFor(() => {
      expect(listeners["connectionFailed"]).toBeDefined();
    });
    act(() => {
      listeners["connectionFailed"]({ error: "CONNECTION_DROPPED" });
    });

    expect(await screen.findByRole("heading", { name: /^Connection Failed$/i })).toBeInTheDocument();
    expect(screen.getByText(/WebRTC media connection failed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry Call Connection/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open in Dedicated Window/i })).toBeInTheDocument();

    navigator.mediaDevices = originalMediaDevices;
    delete window.JitsiMeetExternalAPI;
  });
});
