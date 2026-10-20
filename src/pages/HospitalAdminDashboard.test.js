import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HospitalAdminDashboard from "./HospitalAdminDashboard";
import { AuthContext } from "../context/AuthContext";
import { hospitalAdminAPI } from "../services/api";

jest.mock("../services/api", () => ({
  hospitalAdminAPI: {
    getOverview: jest.fn(),
    getStaff: jest.fn(),
    createStaff: jest.fn(),
    inviteStaff: jest.fn(),
    updateStaff: jest.fn(),
    updateStaffStatus: jest.fn(),
    registerPatient: jest.fn(),
    getPatients: jest.fn(),
    updateSettings: jest.fn(),
    revokeInvitation: jest.fn(),
  },
}));

const mockHospitalOverview = {
  data: {
    success: true,
    hospital: {
      id: "hosp-123",
      name: "City Care Hospital",
      hospitalCode: "CITY-001",
      timezone: "Asia/Kolkata",
      status: "active",
      subscription: { plan: "professional", maxStaff: 50, maxDoctors: 20 },
      operationalHours: { start: "08:00 AM", end: "08:00 PM" },
    },
    metrics: {
      totalStaff: 12,
      activeStaff: 11,
      suspendedStaff: 1,
      doctors: 5,
      nurses: 4,
      receptionists: 2,
      labTechnicians: 1,
      pharmacists: 0,
      billingStaff: 0,
      totalPatients: 45,
      totalAppointments: 120,
      pendingInvitations: 1,
    },
  },
};

const mockStaffList = {
  data: {
    success: true,
    count: 2,
    staff: [
      {
        _id: "staff-1",
        name: "Dr. Arvind Rao",
        email: "arvind.rao@citycare.test",
        phoneNumber: "+91 9876543210",
        role: "doctor",
        specialization: "Cardiology",
        department: "Cardiology",
        status: "active",
      },
      {
        _id: "staff-2",
        name: "Nurse Priya",
        email: "priya@citycare.test",
        phoneNumber: "+91 9876543211",
        role: "nurse",
        department: "OPD",
        status: "active",
      },
    ],
    pendingInvitations: [
      {
        _id: "invite-1",
        email: "labtech@citycare.test",
        role: "lab_technician",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ],
  },
};

const mockPatients = {
  data: {
    success: true,
    total: 1,
    patients: [
      {
        _id: "pat-1",
        name: "Kavita Verma",
        email: "kavita@patient.test",
        phoneNumber: "9876543212",
        gender: "Female",
        bloodGroup: "B+",
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

const renderDashboard = (userRole = "hospital_admin") => {
  const mockUser = {
    _id: "admin-1",
    id: "admin-1",
    name: "Admin Suman",
    email: "suman@citycare.test",
    role: userRole,
    hospitalId: "hosp-123",
  };

  return render(
    <AuthContext.Provider value={{ user: mockUser }}>
      <BrowserRouter>
        <HospitalAdminDashboard />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe("HospitalAdminDashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hospitalAdminAPI.getOverview.mockResolvedValue(mockHospitalOverview);
    hospitalAdminAPI.getStaff.mockResolvedValue(mockStaffList);
    hospitalAdminAPI.getPatients.mockResolvedValue(mockPatients);
  });

  test("renders hospital header, code badge, and operational metric cards", async () => {
    renderDashboard();

    // Verify hospital title and code badge
    expect(await screen.findByText("City Care Hospital")).toBeInTheDocument();
    expect(screen.getByText("CITY-001")).toBeInTheDocument();
    expect(screen.getByText("PROFESSIONAL PLAN")).toBeInTheDocument();

    // Verify stat cards
    expect(screen.getByText("12")).toBeInTheDocument(); // Total staff
    expect(screen.getByText("Total Staff Members")).toBeInTheDocument();
    expect(screen.getByText("Active Doctors")).toBeInTheDocument();
    expect(screen.getByText("Hospital Patients")).toBeInTheDocument();
  });

  test("renders staff directory with role badges and pending invitations", async () => {
    renderDashboard();

    expect(await screen.findByText("Dr. Arvind Rao")).toBeInTheDocument();
    expect(screen.getByText("Nurse Priya")).toBeInTheDocument();

    // Verify role badges
    expect(screen.getByText("Doctor")).toBeInTheDocument();
    expect(screen.getByText("Nurse")).toBeInTheDocument();

    // Verify pending invitations section
    expect(screen.getByText(/Pending Staff Invitations/i)).toBeInTheDocument();
    expect(screen.getByText("labtech@citycare.test")).toBeInTheDocument();
  });

  test("opens Add Staff modal, fills form, and submits creation", async () => {
    hospitalAdminAPI.createStaff.mockResolvedValue({
      data: {
        success: true,
        message: "Doctor added to hospital staff successfully.",
      },
    });

    renderDashboard();

    const addBtn = await screen.findByRole("button", { name: /add staff/i });
    fireEvent.click(addBtn);

    // Modal opens
    expect(screen.getByText("Add Hospital Staff Member")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/e.g. Dr. Ramesh Sharma/i), {
      target: { value: "Dr. Sneha Roy" },
    });
    fireEvent.change(screen.getByPlaceholderText(/staff@hospital.com/i), {
      target: { value: "sneha.roy@citycare.test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min 6 characters/i), {
      target: { value: "DocPass123!" },
    });

    const submitBtn = screen.getByRole("button", { name: /create staff account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(hospitalAdminAPI.createStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Dr. Sneha Roy",
          email: "sneha.roy@citycare.test",
          password: "DocPass123!",
          role: "doctor",
        })
      );
    });
  });

  test("opens Invite Staff modal, generates link, and supports copy link", async () => {
    hospitalAdminAPI.inviteStaff.mockResolvedValue({
      data: {
        success: true,
        invitation: {
          setupLink: "/accept-invitation?token=mocktoken123",
        },
      },
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });

    renderDashboard();

    const inviteBtn = await screen.findByRole("button", { name: /invite staff/i });
    fireEvent.click(inviteBtn);

    expect(screen.getByText("Generate Staff Invitation")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/invitee@hospital.com/i), {
      target: { value: "newnurse@citycare.test" },
    });

    const generateBtn = screen.getByRole("button", { name: /generate invitation link/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(hospitalAdminAPI.inviteStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "newnurse@citycare.test",
        })
      );
    });

    expect(await screen.findByText(/Single-use secure invitation link generated/i)).toBeInTheDocument();
  });

  test("opens Deactivate modal with session revocation warning and submits", async () => {
    hospitalAdminAPI.updateStaffStatus.mockResolvedValue({
      data: {
        success: true,
        message: "Staff member has been deactivated and all active sessions revoked.",
      },
    });

    renderDashboard();

    const deactivateBtns = await screen.findAllByRole("button", { name: /deactivate/i });
    fireEvent.click(deactivateBtns[0]);

    // Deactivation warning dialog should show
    expect(screen.getByText(/Deactivate Staff & Revoke Sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Immediate Session Revocation/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /confirm deactivation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(hospitalAdminAPI.updateStaffStatus).toHaveBeenCalledWith(
        "staff-1",
        expect.objectContaining({
          status: "suspended",
        })
      );
    });
  });

  test("switches to Patient Registry tab and displays patients", async () => {
    renderDashboard();

    const patientTabBtn = await screen.findByRole("button", { name: /patient registry/i });
    fireEvent.click(patientTabBtn);

    expect(await screen.findByText("Kavita Verma")).toBeInTheDocument();
    expect(screen.getByText("kavita@patient.test")).toBeInTheDocument();
    expect(screen.getByText("B+")).toBeInTheDocument();
  });
});
