import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import { AuthContext } from "../context/AuthContext";
import { adminAPI, hospitalTenantAPI } from "../services/api";

jest.mock("../services/api", () => ({
  adminAPI: {
    getOverview: jest.fn(),
    getDoctors: jest.fn(),
    getUsers: jest.fn(),
    getAppointments: jest.fn(),
    getReports: jest.fn(),
    getAuditLogs: jest.fn(),
    getSystemHealth: jest.fn(),
    getSupportQueries: jest.fn(),
  },
  hospitalTenantAPI: {
    getHospitals: jest.fn(),
    createHospital: jest.fn(),
    updateHospital: jest.fn(),
    updateHospitalStatus: jest.fn(),
  },
}));

jest.mock("../services/socket", () => ({
  getSocket: () => ({
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

describe("AdminDashboard — Platform Owner Hospital Management & Deactivation/Recovery", () => {
  const superAdminUser = {
    id: "superadmin123",
    name: "Platform Owner",
    email: "superadmin@vaidyasthana.com",
    role: "superadmin",
  };

  const mockOverviewData = {
    stats: {
      users: { total: 100, patients: 85, doctors: 15 },
      doctors: { verified: 12, pending: 2, rejected: 1 },
      appointments: { total: 50, upcoming: 10, completed: 35, expired: 5 },
      reports: { total: 42, completed: 35, pendingOrProcessing: 5, failed: 2 },
    },
    analytics: {
      appointmentDistribution: [{ status: "Scheduled", count: 10 }],
      registrationTrends: [{ label: "Oct", count: 25 }],
    },
    recentActivity: {
      users: [],
      appointments: [],
    },
  };

  const mockHospitalsList = [
    {
      _id: "hosp-1",
      name: "Apollo Multispecialty",
      hospitalCode: "APOLLO-01",
      contactEmail: "admin@apollo.test",
      contactPhone: "+91 9876543210",
      city: "Bengaluru",
      state: "Karnataka",
      status: "active",
      subscription: { plan: "professional", maxDoctors: 25, maxStaff: 75 },
      totalDoctors: 8,
      totalStaff: 22,
    },
    {
      _id: "hosp-2",
      name: "Fortis City Care",
      hospitalCode: "FORTIS-02",
      contactEmail: "admin@fortis.test",
      contactPhone: "+91 8765432109",
      city: "Mysuru",
      state: "Karnataka",
      status: "suspended",
      subscription: { plan: "starter", maxDoctors: 10, maxStaff: 30 },
      totalDoctors: 4,
      totalStaff: 12,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
    adminAPI.getOverview.mockResolvedValue({ data: mockOverviewData });
    hospitalTenantAPI.getHospitals.mockResolvedValue({
      data: {
        success: true,
        count: mockHospitalsList.length,
        hospitals: mockHospitalsList,
      },
    });
  });

  const renderDashboard = (initialUser = superAdminUser) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={{ user: initialUser }}>
          <AdminDashboard />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  test("Renders hospital tenants with both desktop table and mobile card layout", async () => {
    renderDashboard();

    // Navigate to Hospital Tenants section
    const navBtn = await screen.findByRole("button", { name: /Hospital Tenants/i });
    fireEvent.click(navBtn);

    expect(await screen.findByText(/Registered Hospital Tenants \(2\)/i)).toBeInTheDocument();
    expect(screen.getAllByText("Apollo Multispecialty").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Fortis City Care").length).toBeGreaterThanOrEqual(1);

    // Verify Active status has Deactivate button and Suspended has Reactivate button
    expect(screen.getAllByRole("button", { name: /Deactivate/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Reactivate/i }).length).toBeGreaterThan(0);
  });

  test("Invitation Modal: Done and X buttons reliably close modal and refresh tenant list", async () => {
    hospitalTenantAPI.createHospital.mockResolvedValueOnce({
      data: {
        success: true,
        hospital: { _id: "hosp-new", name: "Metro General", hospitalCode: "METRO-01" },
        invitation: {
          token: "mock-invite-token-12345",
          setupLink: "/accept-invitation?token=mock-invite-token-12345",
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      },
    });

    renderDashboard();

    // Navigate to Hospital Tenants
    const navBtn = await screen.findByRole("button", { name: /Hospital Tenants/i });
    fireEvent.click(navBtn);

    // Open Onboard Modal
    const onboardBtn = await screen.findByRole("button", { name: /Onboard New Hospital/i });
    fireEvent.click(onboardBtn);

    expect(await screen.findByText(/Onboard New Hospital Tenant/i)).toBeInTheDocument();

    // Fill minimum required fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Apollo City Multispecialty/i), {
      target: { value: "Metro General" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. APOLLO-01/i), {
      target: { value: "METRO-01" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contact@hospital\.com/i), {
      target: { value: "contact@metro.test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/admin@apollocity\.test/i), {
      target: { value: "admin@metro.test" },
    });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Confirm & Onboard Hospital/i });
    fireEvent.click(submitBtn);

    // Invitation Success Modal should appear
    expect(await screen.findByText(/Hospital Onboarded Successfully!/i)).toBeInTheDocument();
    expect(screen.getByText(/Metro General \(METRO-01\)/i)).toBeInTheDocument();

    // Copy URL
    const copyBtn = screen.getByRole("button", { name: /Copy URL/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByText(/Copied!/i)).toBeInTheDocument();

    // Click Done to close
    const doneBtn = screen.getByRole("button", { name: /Done/i });
    fireEvent.click(doneBtn);

    // Modal should disappear and hospitals refreshed
    await waitFor(() => {
      expect(screen.queryByText(/Hospital Onboarded Successfully!/i)).not.toBeInTheDocument();
    });
    expect(hospitalTenantAPI.getHospitals.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test("Invitation Modal: X button and backdrop click close modal reliably", async () => {
    hospitalTenantAPI.createHospital.mockResolvedValueOnce({
      data: {
        success: true,
        hospital: { _id: "hosp-3", name: "Green Valley Clinic", hospitalCode: "GREEN-01" },
        invitation: {
          token: "green-token-abc",
          setupLink: "/accept-invitation?token=green-token-abc",
        },
      },
    });

    renderDashboard();

    const navBtn = await screen.findByRole("button", { name: /Hospital Tenants/i });
    fireEvent.click(navBtn);

    const onboardBtn = await screen.findByRole("button", { name: /Onboard New Hospital/i });
    fireEvent.click(onboardBtn);

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Apollo City Multispecialty/i), {
      target: { value: "Green Valley Clinic" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. APOLLO-01/i), {
      target: { value: "GREEN-01" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contact@hospital\.com/i), {
      target: { value: "contact@green.test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/admin@apollocity\.test/i), {
      target: { value: "admin@green.test" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Confirm & Onboard Hospital/i }));

    expect(await screen.findByText(/Hospital Onboarded Successfully!/i)).toBeInTheDocument();

    // Test X close button
    const closeBtn = screen.getByLabelText(/Close invitation modal/i);
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Hospital Onboarded Successfully!/i)).not.toBeInTheDocument();
    });
  });

  test("Deactivation Modal: Confirms deactivation, requires reason, and calls API", async () => {
    hospitalTenantAPI.updateHospitalStatus.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Hospital 'Apollo Multispecialty' status updated to suspended.",
        hospital: { ...mockHospitalsList[0], status: "suspended" },
      },
    });

    renderDashboard();

    const navBtn = await screen.findByRole("button", { name: /Hospital Tenants/i });
    fireEvent.click(navBtn);

    // Click first Deactivate button (for Apollo Multispecialty)
    const deactivateBtns = await screen.findAllByRole("button", { name: /Deactivate/i });
    fireEvent.click(deactivateBtns[0]);

    // Deactivation modal should open
    expect(await screen.findByText(/Deactivate Hospital Tenant/i)).toBeInTheDocument();
    expect(screen.getByText(/You are preparing to deactivate/i)).toBeInTheDocument();

    // Confirm button is disabled without reason
    const confirmBtn = screen.getByRole("button", { name: /Confirm Deactivation/i });
    expect(confirmBtn).toBeDisabled();

    // Enter reason
    const reasonInput = screen.getByPlaceholderText(/Specify administrative or compliance reason/i);
    fireEvent.change(reasonInput, { target: { value: "Billing subscription lapse" } });

    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(hospitalTenantAPI.updateHospitalStatus).toHaveBeenCalledWith("hosp-1", {
        status: "suspended",
        reason: "Billing subscription lapse",
      });
    });

    // Modal should close and list refreshed
    await waitFor(() => {
      expect(screen.queryByText(/Deactivate Hospital Tenant/i)).not.toBeInTheDocument();
    });
    expect(hospitalTenantAPI.getHospitals.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test("Reactivation Modal: Restores active status cleanly", async () => {
    hospitalTenantAPI.updateHospitalStatus.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Hospital 'Fortis City Care' status updated to active.",
        hospital: { ...mockHospitalsList[1], status: "active" },
      },
    });

    renderDashboard();

    const navBtn = await screen.findByRole("button", { name: /Hospital Tenants/i });
    fireEvent.click(navBtn);

    // Click Reactivate button for Fortis City Care
    const reactivateBtns = await screen.findAllByRole("button", { name: /Reactivate/i });
    fireEvent.click(reactivateBtns[0]);

    // Reactivation modal should open
    expect(await screen.findByText(/Reactivate Hospital Tenant/i)).toBeInTheDocument();

    // Confirm reactivation
    const confirmBtn = screen.getByRole("button", { name: /Confirm Reactivation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(hospitalTenantAPI.updateHospitalStatus).toHaveBeenCalledWith("hosp-2", {
        status: "active",
        reason: "Reactivated by Platform Owner",
      });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Reactivate Hospital Tenant/i)).not.toBeInTheDocument();
    });
  });

  test("Escape key closes active modal", async () => {
    renderDashboard();

    const navBtn = await screen.findByRole("button", { name: /Hospital Tenants/i });
    fireEvent.click(navBtn);

    const deactivateBtns = await screen.findAllByRole("button", { name: /Deactivate/i });
    fireEvent.click(deactivateBtns[0]);

    expect(await screen.findByText(/Deactivate Hospital Tenant/i)).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText(/Deactivate Hospital Tenant/i)).not.toBeInTheDocument();
    });
  });
});
