import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PatientFollowUps from "./PatientFollowUps";
import { followUpsAPI } from "../services/api";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../services/api", () => ({
  followUpsAPI: {
    getFollowUps: jest.fn(),
  },
}));

const mockFollowUps = [
  {
    _id: "fu-001",
    doctorName: "Dr. Arvind Rao",
    doctorId: { _id: "doc-1", name: "Dr. Arvind Rao", specialization: "Cardiology" },
    reason: "Hypertension monitoring",
    doctorInstructions: "Record BP readings every morning before meals.",
    recommendedDate: "2026-11-15T00:00:00.000Z",
    priority: "urgent",
    status: "pending_booking",
    recommendedTests: ["Lipid Profile", "Serum Creatinine"],
  },
  {
    _id: "fu-002",
    doctorName: "Dr. Sunita Patel",
    doctorId: { _id: "doc-2", name: "Dr. Sunita Patel", specialization: "Endocrinology" },
    reason: "HbA1c quarterly review",
    doctorInstructions: "Repeat fasting glucose and HbA1c 1 week prior.",
    recommendedDate: "2026-12-01T00:00:00.000Z",
    priority: "routine",
    status: "appointment_booked",
    appointmentId: {
      _id: "appt-555",
      appointmentDate: "2026-12-01T00:00:00.000Z",
      timeSlot: "11:00 AM",
      consultationType: "In-Person",
    },
    recommendedTests: ["HbA1c"],
  },
  {
    _id: "fu-003",
    doctorName: "Dr. Rajesh Sharma",
    doctorId: { _id: "doc-3", name: "Dr. Rajesh Sharma", specialization: "General Medicine" },
    reason: "Post-viral recovery check",
    doctorInstructions: "Check temperature log and energy levels.",
    recommendedDate: "2026-10-10T00:00:00.000Z",
    priority: "soon",
    status: "completed",
    recommendedTests: [],
  },
  {
    _id: "fu-004",
    doctorName: "Dr. Suresh Menon",
    doctorId: { _id: "doc-4", name: "Dr. Suresh Menon", specialization: "Cardiology" },
    reason: "Missed cardiology review",
    doctorInstructions: "Please rebook consultation as soon as possible.",
    recommendedDate: "2026-10-12T00:00:00.000Z",
    priority: "urgent",
    status: "missed",
    recommendedTests: [],
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <PatientFollowUps />
    </BrowserRouter>
  );
};

describe("PatientFollowUps Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders follow-up plans list and counts correctly", async () => {
    followUpsAPI.getFollowUps.mockResolvedValue({
      data: {
        success: true,
        count: mockFollowUps.length,
        followUps: mockFollowUps,
      },
    });

    renderComponent();

    expect(screen.getByText(/Doctor Care Follow-Up Plans/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Hypertension monitoring")).toBeInTheDocument();
      expect(screen.getByText("HbA1c quarterly review")).toBeInTheDocument();
      expect(screen.getByText("Post-viral recovery check")).toBeInTheDocument();
      expect(screen.getByText("Missed cardiology review")).toBeInTheDocument();
    });

    // Check priority badges
    expect(screen.getAllByText(/Urgent/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Routine/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Soon/i).length).toBeGreaterThanOrEqual(1);

    // Check doctor instructions
    expect(screen.getByText(/Record BP readings every morning before meals/i)).toBeInTheDocument();

    // Check tests tags
    expect(screen.getByText("Lipid Profile")).toBeInTheDocument();
    expect(screen.getByText("Serum Creatinine")).toBeInTheDocument();
  });

  test("clicking 'Book Follow-Up Appointment' navigates to /appointment with query params", async () => {
    followUpsAPI.getFollowUps.mockResolvedValue({
      data: {
        success: true,
        count: mockFollowUps.length,
        followUps: mockFollowUps,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Hypertension monitoring")).toBeInTheDocument();
    });

    const bookBtns = screen.getAllByRole("button", { name: /^Book Follow-Up Appointment/i });
    fireEvent.click(bookBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/appointment?followUpId=fu-001")
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("doctorId=doc-1")
    );
  });

  test("filter tabs filter follow-ups by status", async () => {
    followUpsAPI.getFollowUps.mockResolvedValue({
      data: {
        success: true,
        count: mockFollowUps.length,
        followUps: mockFollowUps,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Hypertension monitoring")).toBeInTheDocument();
    });

    // Click 'Booked' tab
    const bookedTab = screen.getByRole("tab", { name: /Booked/i });
    fireEvent.click(bookedTab);

    expect(screen.getByText("HbA1c quarterly review")).toBeInTheDocument();
    expect(screen.queryByText("Hypertension monitoring")).not.toBeInTheDocument();

    // Click 'Completed' tab
    const completedTab = screen.getByRole("tab", { name: /Completed/i });
    fireEvent.click(completedTab);

    expect(screen.getByText("Post-viral recovery check")).toBeInTheDocument();
    expect(screen.queryByText("HbA1c quarterly review")).not.toBeInTheDocument();

    // Click 'Missed' tab
    const missedTab = screen.getByRole("tab", { name: /Missed/i });
    fireEvent.click(missedTab);

    expect(screen.getByText("Missed cardiology review")).toBeInTheDocument();
    expect(screen.queryByText("Post-viral recovery check")).not.toBeInTheDocument();
  });

  test("renders empty state when no follow-up plans exist", async () => {
    followUpsAPI.getFollowUps.mockResolvedValue({
      data: {
        success: true,
        count: 0,
        followUps: [],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No Follow-Up Plans in this View/i)).toBeInTheDocument();
      expect(screen.getByText(/When your consulting physician recommends a follow-up consultation/i)).toBeInTheDocument();
    });
  });
});
