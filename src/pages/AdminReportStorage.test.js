import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import { AuthContext } from "../context/AuthContext";
import { adminAPI } from "../services/api";

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
}));

jest.mock("../services/socket", () => ({
  getSocket: () => ({
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

describe("Admin Dashboard — Report Storage & Medical Vault Administration", () => {
  const superAdminUser = {
    id: "superadmin123",
    name: "Platform SuperAdmin",
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

  const mockReportsData = {
    success: true,
    reports: [
      {
        _id: "rep6601a1b2c3d4e5f678901234",
        fileName: "lab_blood_test_complete.pdf",
        originalName: "Blood_Test_Panel_Oct2026.pdf",
        fileType: "application/pdf",
        fileSize: 1258291, // ~1.20 MB
        category: "Laboratory Report",
        analysisStatus: "Completed",
        processingStage: "Completed",
        errorMessage: null,
        uploadedAt: "2026-10-15T14:30:00.000Z",
        userId: {
          _id: "u1",
          name: "Amit Sharma",
          email: "amit.sharma@example.com",
        },
        uploadedBy: {
          _id: "doc1",
          name: "Dr. Priya Patel",
          role: "doctor",
        },
        uploadedByRole: "doctor",
        uploaderName: "Dr. Priya Patel",
      },
      {
        _id: "rep6602b2c3d4e5f6789012345a",
        fileName: "mri_brain_scan_full.png",
        originalName: "MRI_Brain_Scan_T2.png",
        fileType: "image/png",
        fileSize: 348160, // ~340 KB
        category: "Radiology & Imaging",
        analysisStatus: "Processing",
        processingStage: "OCR Analysis",
        errorMessage: null,
        uploadedAt: "2026-10-16T09:15:00.000Z",
        userId: {
          _id: "u2",
          name: "Sunita Roy",
          email: "sunita.roy@example.com",
        },
        uploadedBy: {
          _id: "u2",
          name: "Sunita Roy",
          role: "patient",
        },
        uploadedByRole: "patient",
        uploaderName: "Sunita Roy",
      },
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 10,
      pages: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminAPI.getOverview.mockResolvedValue({ data: { success: true, ...mockOverviewData } });
    adminAPI.getReports.mockResolvedValue({ data: mockReportsData });
    adminAPI.getDoctors.mockResolvedValue({ data: { success: true, doctors: [] } });
    adminAPI.getUsers.mockResolvedValue({ data: { success: true, users: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } } });
    adminAPI.getAppointments.mockResolvedValue({ data: { success: true, appointments: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } } });
    adminAPI.getAuditLogs.mockResolvedValue({ data: { success: true, logs: [], pagination: { total: 0, page: 1, limit: 15, pages: 1 } } });
    adminAPI.getSystemHealth.mockResolvedValue({ data: { success: true, services: {} } });
    adminAPI.getSupportQueries.mockResolvedValue({ data: { success: true, queries: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } } });
  });

  test("renders 4 summary metrics cards with accurate telemetry numbers", async () => {
    render(
      <AuthContext.Provider value={{ user: superAdminUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    // Click navigation tab for Medical Vault & Storage
    const reportsTabBtn = screen.getByText("Report Storage");
    fireEvent.click(reportsTabBtn);

    await waitFor(() => {
      expect(adminAPI.getReports).toHaveBeenCalled();
    });

    // Check summary cards
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Total Reports/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Analysis Completed/i)).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByText(/In Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("renders 7-column table with exact required headers", async () => {
    render(
      <AuthContext.Provider value={{ user: superAdminUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    const reportsTabBtn = screen.getByText("Report Storage");
    fireEvent.click(reportsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Blood_Test_Panel_Oct2026\.pdf/i)).toBeInTheDocument();
    });

    // Verify all 7 columns in the table header
    expect(screen.getByRole("columnheader", { name: /Report File/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Patient Owner/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Uploaded By/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Category & Size/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Pipeline Stage/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Status/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Uploaded At/i })).toBeInTheDocument();
  });

  test("renders report row details including extension badge, patient, uploader role, dark category badge, and formatted size", async () => {
    render(
      <AuthContext.Provider value={{ user: superAdminUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    const reportsTabBtn = screen.getByText("Report Storage");
    fireEvent.click(reportsTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Blood_Test_Panel_Oct2026.pdf")).toBeInTheDocument();
    });

    // File 1 details
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
    expect(screen.getByText("amit.sharma@example.com")).toBeInTheDocument();
    expect(screen.getByText("Dr. Priya Patel")).toBeInTheDocument();

    // Category badge with dark class and size
    const labBadge = screen.getAllByText("Laboratory Report").find((el) => el.tagName === "SPAN");
    expect(labBadge).toHaveClass("report-category-badge");
    expect(labBadge).toHaveClass("cat-lab");
    expect(screen.getByText("1.20 MB")).toBeInTheDocument();

    // File 2 details
    expect(screen.getByText("MRI_Brain_Scan_T2.png")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
    expect(screen.getAllByText("Sunita Roy").length).toBe(2);
    expect(screen.getByText("sunita.roy@example.com")).toBeInTheDocument();

    const radiologyBadge = screen.getAllByText("Radiology & Imaging").find((el) => el.tagName === "SPAN");
    expect(radiologyBadge).toHaveClass("report-category-badge");
    expect(radiologyBadge).toHaveClass("cat-radiology");
    expect(screen.getByText("340.0 KB")).toBeInTheDocument();
  });

  test("triggers search on category filter dropdown selection", async () => {
    render(
      <AuthContext.Provider value={{ user: superAdminUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    const reportsTabBtn = screen.getByText("Report Storage");
    fireEvent.click(reportsTabBtn);

    await waitFor(() => {
      expect(adminAPI.getReports).toHaveBeenCalled();
    });

    const categorySelect = screen.getByLabelText(/Filter by Report Category/i);
    fireEvent.change(categorySelect, { target: { value: "Radiology & Imaging" } });

    expect(adminAPI.getReports).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Radiology & Imaging",
      })
    );
  });

  test("resets filters and restores full search query on Reset click", async () => {
    render(
      <AuthContext.Provider value={{ user: superAdminUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    const reportsTabBtn = screen.getByText("Report Storage");
    fireEvent.click(reportsTabBtn);

    await waitFor(() => {
      expect(adminAPI.getReports).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(/Search reports by filename/i);
    fireEvent.change(searchInput, { target: { value: "blood" } });

    // Click search
    const searchBtn = screen.getByRole("button", { name: /Apply report search/i });
    fireEvent.click(searchBtn);

    expect(adminAPI.getReports).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "blood",
      })
    );

    // Reset button should now be visible
    const resetBtn = screen.getByRole("button", { name: /Reset all filters/i });
    fireEvent.click(resetBtn);

    expect(searchInput.value).toBe("");
    expect(adminAPI.getReports).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "",
        category: "all",
        analysisStatus: "all",
        page: 1,
      })
    );
  });

  test("displays clean empty state when no reports match current filters", async () => {
    adminAPI.getReports.mockResolvedValueOnce({
      data: {
        success: true,
        reports: [],
        pagination: { total: 0, page: 1, limit: 10, pages: 1 },
      },
    });

    render(
      <AuthContext.Provider value={{ user: superAdminUser, loading: false }}>
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    const reportsTabBtn = screen.getByText("Report Storage");
    fireEvent.click(reportsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/No Medical Reports Found/i)).toBeInTheDocument();
    });
  });
});
