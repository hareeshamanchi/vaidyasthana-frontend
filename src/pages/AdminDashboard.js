import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { adminAPI } from "../services/api";
import { getSocket } from "../services/socket";
import {
  FiShield,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiUsers,
  FiSearch,
  FiExternalLink,
  FiAlertTriangle,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiActivity,
  FiCalendar,
  FiLock,
  FiUnlock,
  FiMail,
  FiServer,
  FiDatabase,
  FiCpu,
  FiTrendingUp,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiMenu,
  FiCopy,
} from "react-icons/fi";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);

  // Active top-level section:
  // "overview" | "users" | "doctors" | "appointments" | "reports" | "security" | "health" | "support"
  const [activeSection, setActiveSection] = useState(() => {
    return user?.role === "admin" ? "doctors" : "overview";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.role === "admin" && activeSection === "overview") {
      setActiveSection("doctors");
    }
  }, [user?.role, activeSection]);

  // Global status / error toast messages
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ==========================================
  // SECTION 1: OVERVIEW STATE
  // ==========================================
  const [overviewData, setOverviewData] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getOverview();
      if (res.data?.success) {
        setOverviewData(res.data);
      }
    } catch (err) {
      console.warn("Failed to load overview data:", err.message);
      setErrorMessage("Unable to fetch overview analytics. Please ensure administrator access.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // SECTION 2: USER MANAGEMENT STATE
  // ==========================================
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [suspensionModalUser, setSuspensionModalUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  const handleOpenUserDetails = async (targetUser) => {
    if (!targetUser) return;
    // Set immediate loading state with target user data to avoid stale flashes
    setSelectedUserDetails({
      loading: true,
      error: null,
      user: targetUser,
      stats: null,
    });
    setCopiedUserId(false);

    try {
      const res = await adminAPI.getUserDetails(targetUser._id);
      if (res.data?.success) {
        setSelectedUserDetails({
          loading: false,
          error: null,
          user: res.data.user || targetUser,
          stats: res.data.stats || { appointments: { total: 0, upcoming: 0, completed: 0 }, reports: 0 },
        });
      } else {
        setSelectedUserDetails({
          loading: false,
          error: res.data?.message || "Failed to retrieve account details.",
          user: targetUser,
          stats: null,
        });
      }
    } catch (err) {
      setSelectedUserDetails({
        loading: false,
        error: err.response?.data?.message || "Could not retrieve user telemetry.",
        user: targetUser,
        stats: null,
      });
    }
  };

  const handleCopyUserId = (id) => {
    if (!id) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id).then(() => {
        setCopiedUserId(true);
        setTimeout(() => setCopiedUserId(false), 2000);
      }).catch(() => {});
    }
  };

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await adminAPI.getUsers({
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
        page,
        limit: 10,
      });
      if (res.data?.success) {
        setUsers(res.data.users || []);
        setUserPagination(res.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  const handleOpenSuspensionModal = (targetUser) => {
    setSuspensionModalUser(targetUser);
    setSuspensionReason("");
  };

  const handleConfirmSuspensionChange = async () => {
    if (!suspensionModalUser) return;
    if (!suspensionReason.trim()) {
      alert("Please provide a mandatory administrative reason for this action.");
      return;
    }

    const newStatus = suspensionModalUser.status === "suspended" ? "active" : "suspended";
    setActionLoading(true);
    try {
      const res = await adminAPI.updateUserStatus(suspensionModalUser._id, {
        status: newStatus,
        reason: suspensionReason.trim(),
      });
      if (res.data?.success) {
        setStatusMessage(res.data.message);
        setSuspensionModalUser(null);
        fetchUsers(userPagination.page);
        if (selectedUserDetails?._id === suspensionModalUser._id || selectedUserDetails?.user?._id === suspensionModalUser._id) {
          setSelectedUserDetails(null);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user account status.");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // SECTION 3: DOCTOR VERIFICATIONS STATE
  // ==========================================
  const [doctors, setDoctors] = useState([]);
  const [doctorFilter, setDoctorFilter] = useState("pending"); // "pending" | "all" | "verified" | "rejected"
  const [selectedDoctorForReview, setSelectedDoctorForReview] = useState(null);
  const [verificationDecision, setVerificationDecision] = useState("verified"); // "verified" | "rejected"
  const [rejectionReason, setRejectionReason] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      let res;
      if (doctorFilter === "pending") {
        res = await adminAPI.getPendingDoctors();
      } else if (doctorFilter === "all") {
        res = await adminAPI.getAllDoctors();
      } else {
        res = await adminAPI.getAllDoctors({ status: doctorFilter });
      }
      if (res.data?.success) {
        setDoctors(res.data.doctors || []);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to load doctor directory.");
    } finally {
      setLoading(false);
    }
  }, [doctorFilter]);

  const handleOpenDoctorReview = (doctor, decisionType) => {
    setSelectedDoctorForReview(doctor);
    setVerificationDecision(decisionType);
    setRejectionReason("");
    setVerificationNotes("");
  };

  const handleSubmitDoctorReview = async () => {
    if (!selectedDoctorForReview) return;
    if (verificationDecision === "rejected" && !rejectionReason.trim()) {
      alert("A specific reason is mandatory when declining doctor verification.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminAPI.verifyDoctor(selectedDoctorForReview._id, {
        decision: verificationDecision,
        rejectionReason: rejectionReason.trim(),
        notes: verificationNotes.trim(),
      });
      if (res.data?.success) {
        setStatusMessage(res.data.message);
        setSelectedDoctorForReview(null);
        fetchDoctors();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update doctor verification status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewCredential = async (doctorId, docIndex) => {
    try {
      const res = await adminAPI.getDocumentUrl(doctorId, docIndex);
      if (res.data?.success) {
        if (res.data.url) {
          window.open(res.data.url, "_blank", "noopener,noreferrer");
        } else {
          alert(`Document: ${res.data.document?.originalName}\nStatus: ${res.data.message}`);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Unable to generate private credential view link.");
    }
  };

  // ==========================================
  // SECTION 4: APPOINTMENTS STATE
  // ==========================================
  const [appointments, setAppointments] = useState([]);
  const [appointmentPagination, setAppointmentPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState("all");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [selectedApptForUpdate, setSelectedApptForUpdate] = useState(null);
  const [apptNewStatus, setApptNewStatus] = useState("Completed");
  const [apptCorrectionReason, setApptCorrectionReason] = useState("");

  const fetchAppointments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await adminAPI.getAppointments({
        search: appointmentSearch,
        status: appointmentStatusFilter,
        consultationType: appointmentTypeFilter,
        page,
        limit: 10,
      });
      if (res.data?.success) {
        setAppointments(res.data.appointments || []);
        setAppointmentPagination(res.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to load global appointments.");
    } finally {
      setLoading(false);
    }
  }, [appointmentSearch, appointmentStatusFilter, appointmentTypeFilter]);

  const handleUpdateAppointment = async () => {
    if (!selectedApptForUpdate) return;
    if (!apptCorrectionReason.trim()) {
      alert("Mandatory reason required for administrative appointment override.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminAPI.updateAppointment(selectedApptForUpdate._id, {
        status: apptNewStatus,
        reason: apptCorrectionReason.trim(),
      });
      if (res.data?.success) {
        setStatusMessage(res.data.message);
        setSelectedApptForUpdate(null);
        fetchAppointments(appointmentPagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update appointment record.");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // SECTION 5: REPORTS & STORAGE STATE
  // ==========================================
  const [reports, setReports] = useState([]);
  const [reportPagination, setReportPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");

  const fetchReports = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await adminAPI.getReports({
        search: reportSearch,
        analysisStatus: reportStatusFilter,
        page,
        limit: 10,
      });
      if (res.data?.success) {
        setReports(res.data.reports || []);
        setReportPagination(res.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to load report storage records.");
    } finally {
      setLoading(false);
    }
  }, [reportSearch, reportStatusFilter]);

  // ==========================================
  // SECTION 6: SECURITY & AUDIT LOGS STATE
  // ==========================================
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [securityOverview, setSecurityOverview] = useState(null);
  const [auditEventTypeFilter, setAuditEventTypeFilter] = useState("all");
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");

  const fetchAuditLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [logRes, overviewRes] = await Promise.all([
        adminAPI.getAuditLogs({
          eventType: auditEventTypeFilter,
          outcome: auditOutcomeFilter,
          search: auditSearch,
          page,
          limit: 15,
        }),
        adminAPI.getSecurityOverview(),
      ]);

      if (logRes.data?.success) {
        setAuditLogs(logRes.data.logs || []);
        setAuditPagination(logRes.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
      if (overviewRes.data?.success) {
        setSecurityOverview(overviewRes.data);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to load security audit logs.");
    } finally {
      setLoading(false);
    }
  }, [auditEventTypeFilter, auditOutcomeFilter, auditSearch]);

  // ==========================================
  // SECTION 7: SYSTEM HEALTH STATE
  // ==========================================
  const [systemHealth, setSystemHealth] = useState(null);

  const fetchSystemHealth = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await adminAPI.getSystemHealth();
      if (res.data?.success) {
        setSystemHealth(res.data);
      }
    } catch (err) {
      setErrorMessage("Unable to connect to system health probes.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // SECTION 8: SUPPORT & CONTACT INQUIRIES STATE
  // ==========================================
  const [supportQueries, setSupportQueries] = useState([]);
  const [supportPagination, setSupportPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [supportStatusFilter, setSupportStatusFilter] = useState("all");
  const [supportSearch, setSupportSearch] = useState("");
  const [selectedSupportQuery, setSelectedSupportQuery] = useState(null);
  const [supportResolutionNotes, setSupportResolutionNotes] = useState("");
  const [supportNewStatus, setSupportNewStatus] = useState("Resolved");

  const fetchSupportQueries = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await adminAPI.getSupportQueries({
        status: supportStatusFilter,
        search: supportSearch,
        page,
        limit: 10,
      });
      if (res.data?.success) {
        setSupportQueries(res.data.queries || []);
        setSupportPagination(res.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to load support inquiries.");
    } finally {
      setLoading(false);
    }
  }, [supportStatusFilter, supportSearch]);

  const handleUpdateSupportQuery = async () => {
    if (!selectedSupportQuery) return;
    setActionLoading(true);
    try {
      const res = await adminAPI.updateSupportQuery(selectedSupportQuery._id, {
        status: supportNewStatus,
        resolutionNotes: supportResolutionNotes.trim(),
      });
      if (res.data?.success) {
        setStatusMessage(res.data.message);
        setSelectedSupportQuery(null);
        fetchSupportQueries(supportPagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update support inquiry.");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // DISPATCHER: SECTION SWITCHING
  // ==========================================
  useEffect(() => {
    if (activeSection === "overview") fetchOverview();
    else if (activeSection === "users") fetchUsers(1);
    else if (activeSection === "doctors") fetchDoctors();
    else if (activeSection === "appointments") fetchAppointments(1);
    else if (activeSection === "reports") fetchReports(1);
    else if (activeSection === "security") fetchAuditLogs(1);
    else if (activeSection === "health") fetchSystemHealth();
    else if (activeSection === "support") fetchSupportQueries(1);
  }, [
    activeSection,
    fetchOverview,
    fetchUsers,
    fetchDoctors,
    fetchAppointments,
    fetchReports,
    fetchAuditLogs,
    fetchSystemHealth,
    fetchSupportQueries,
  ]);

  // Real-time Socket.IO listener for live updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleVerificationUpdate = (data) => {
      if (activeSection === "doctors") fetchDoctors();
      if (activeSection === "overview") fetchOverview();
      setStatusMessage(`Real-time update: Doctor verification changed to "${data.status}".`);
    };

    socket.on("doctor_verified", handleVerificationUpdate);
    socket.on("appointment_status_changed", () => {
      if (activeSection === "appointments") fetchAppointments(appointmentPagination.page);
      if (activeSection === "overview") fetchOverview();
    });

    return () => {
      socket.off("doctor_verified", handleVerificationUpdate);
      socket.off("appointment_status_changed");
    };
  }, [activeSection, fetchDoctors, fetchOverview, fetchAppointments, appointmentPagination.page]);

  // Dismiss open modals with ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedUserDetails) setSelectedUserDetails(null);
        if (suspensionModalUser) setSuspensionModalUser(null);
        if (selectedDoctorForReview) setSelectedDoctorForReview(null);
        if (selectedApptForUpdate) setSelectedApptForUpdate(null);
        if (selectedSupportQuery) setSelectedSupportQuery(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedUserDetails,
    suspensionModalUser,
    selectedDoctorForReview,
    selectedApptForUpdate,
    selectedSupportQuery,
  ]);

  const handleRefreshCurrentSection = () => {
    if (activeSection === "overview") fetchOverview();
    else if (activeSection === "users") fetchUsers(userPagination.page);
    else if (activeSection === "doctors") fetchDoctors();
    else if (activeSection === "appointments") fetchAppointments(appointmentPagination.page);
    else if (activeSection === "reports") fetchReports(reportPagination.page);
    else if (activeSection === "security") fetchAuditLogs(auditPagination.page);
    else if (activeSection === "health") fetchSystemHealth();
    else if (activeSection === "support") fetchSupportQueries(supportPagination.page);
  };

  const isSuperAdmin = user?.role === "superadmin";

  // Access control guard
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return (
      <div className="admin-access-denied-container">
        <div className="denied-card">
          <FiAlertTriangle className="denied-icon" />
          <h2>Restricted Administrative Portal</h2>
          <p>
            You are signed in as <strong>{user?.name || "Guest"}</strong> ({user?.role || "Unauthenticated"}).
            This section is strictly restricted to authorized hospital administrators and medical compliance officers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-wrapper">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="admin-backdrop visible"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Enterprise Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`} role="navigation">
        <div className="sidebar-brand">
          <div className="brand-badge-icon">
            <FiShield size={24} color="#38bdf8" />
          </div>
          <div className="brand-meta">
            <span className="brand-name">Vaidyasthana</span>
            <span className="brand-role-tag">
              Hospital Medical Council Administration
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-tab-btn ${activeSection === "overview" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("overview");
              setSidebarOpen(false);
            }}
          >
            <FiActivity className="tab-icon" />
            <span>Overview & Metrics</span>
          </button>

          <button
            className={`nav-tab-btn ${activeSection === "users" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("users");
              setSidebarOpen(false);
            }}
          >
            <FiUsers className="tab-icon" />
            <span>User Management</span>
          </button>

          <button
            className={`nav-tab-btn ${activeSection === "doctors" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("doctors");
              setSidebarOpen(false);
            }}
          >
            <FiCheckCircle className="tab-icon" />
            <span>Doctor Verifications</span>
          </button>

          <button
            className={`nav-tab-btn ${activeSection === "appointments" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("appointments");
              setSidebarOpen(false);
            }}
          >
            <FiCalendar className="tab-icon" />
            <span>Global Appointments</span>
          </button>

          <button
            className={`nav-tab-btn ${activeSection === "reports" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("reports");
              setSidebarOpen(false);
            }}
          >
            <FiFileText className="tab-icon" />
            <span>Report Storage</span>
          </button>

          <button
            className={`nav-tab-btn ${activeSection === "security" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("security");
              setSidebarOpen(false);
            }}
          >
            <FiLock className="tab-icon" />
            <span>Security & Audit Logs</span>
          </button>

          <button
            className={`nav-tab-btn ${activeSection === "health" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("health");
              setSidebarOpen(false);
            }}
          >
            <FiServer className="tab-icon" />
            <span>System Health</span>
          </button>

          <button
            className={`nav-tab-btn ${activeSection === "support" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("support");
              setSidebarOpen(false);
            }}
          >
            <FiMail className="tab-icon" />
            <span>Support Inbox</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile-pill">
            <div className="admin-avatar">{user?.name ? user.name[0].toUpperCase() : "A"}</div>
            <div className="admin-info-text">
              <span className="admin-name-text">{user?.name || "Administrator"}</span>
              <span className="admin-role-label">
                {isSuperAdmin ? "Role: Super Admin" : "Role: Admin"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Body */}
      <main className="admin-main-container" id="admin-main" role="main">
        {/* Header Bar */}
        <header className="admin-header-bar">
          <div className="header-left">
            <button
              className="mobile-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <FiMenu size={22} />
            </button>
            <div className="header-title-wrap">
              <h1 className="header-page-title">
                {activeSection === "overview" && "Platform Operations & Analytics"}
                {activeSection === "users" && "User Directory & Account Governance"}
                {activeSection === "doctors" && "Clinician Credentialing & Verification"}
                {activeSection === "appointments" && "Global Consultations & Scheduling"}
                {activeSection === "reports" && "Medical Vault & Blob Storage Pipeline"}
                {activeSection === "security" && "Security Center & Immutable Audit Trail"}
                {activeSection === "health" && "Infrastructure Probes & Operations"}
                {activeSection === "support" && "Patient & Doctor Inquiries"}
              </h1>
              <span className="header-page-subtitle">
                Authenticated administrative session with role-enforced access controls
              </span>
            </div>
          </div>

          <div className="header-right">
            <div className="live-status-pill">
              <span className="status-dot-pulse"></span>
              <span className="status-text">Live Sync</span>
            </div>

            <button
              className="refresh-btn"
              onClick={handleRefreshCurrentSection}
              title="Refresh Records"
              disabled={loading}
              aria-label="Refresh Records"
            >
              <FiRefreshCw className={loading ? "spin" : ""} size={16} />
              <span>Refresh Records</span>
            </button>
          </div>
        </header>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className="admin-banner success">
            <FiCheckCircle size={18} />
            <span>{statusMessage}</span>
            <button
              className="banner-close-btn"
              onClick={() => setStatusMessage("")}
              aria-label="Dismiss banner"
            >
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* Error Toast Banner */}
        {errorMessage && (
          <div className="admin-banner error">
            <FiAlertTriangle size={18} />
            <span>{errorMessage}</span>
            <button
              className="banner-close-btn"
              onClick={() => setErrorMessage("")}
              aria-label="Dismiss banner"
            >
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 1: OVERVIEW & METRICS                            */}
        {/* ======================================================== */}
        {activeSection === "overview" && (
          <div className="admin-content-section">
            {overviewData ? (
              <>
                {/* Primary KPI Grid */}
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-icon-wrap user-kpi">
                      <FiUsers size={22} />
                    </div>
                    <div className="kpi-metric-info">
                      <span className="kpi-label">Registered Users</span>
                      <span className="kpi-number">{overviewData.stats.users.total}</span>
                      <span className="kpi-subtext">
                        {overviewData.stats.users.patients} Patients • {overviewData.stats.users.doctors} Doctors
                      </span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrap verified-kpi">
                      <FiCheckCircle size={22} />
                    </div>
                    <div className="kpi-metric-info">
                      <span className="kpi-label">Doctor Verifications</span>
                      <span className="kpi-number">{overviewData.stats.doctors.verified}</span>
                      <span className="kpi-subtext">
                        {overviewData.stats.doctors.pending} Pending Review • {overviewData.stats.doctors.rejected} Declined
                      </span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrap appointment-kpi">
                      <FiCalendar size={22} />
                    </div>
                    <div className="kpi-metric-info">
                      <span className="kpi-label">Consultations</span>
                      <span className="kpi-number">{overviewData.stats.appointments.total}</span>
                      <span className="kpi-subtext">
                        {overviewData.stats.appointments.upcoming} Upcoming • {overviewData.stats.appointments.completed} Completed
                      </span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-wrap storage-kpi">
                      <FiFileText size={22} />
                    </div>
                    <div className="kpi-metric-info">
                      <span className="kpi-label">Medical Records</span>
                      <span className="kpi-number">{overviewData.stats.reports.total}</span>
                      <span className="kpi-subtext">
                        {overviewData.stats.reports.completed} Analyzed • {overviewData.stats.reports.pendingOrProcessing} In Pipeline
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Charts & Aggregations */}
                <div className="dashboard-charts-grid">
                  {/* Appointment Lifecycle Breakdown Chart */}
                  <div className="chart-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">
                        <FiCalendar className="panel-icon" /> Consultation Distribution
                      </h3>
                      <span className="panel-badge">MongoDB Live Aggregation</span>
                    </div>
                    <div className="chart-bars-wrap">
                      {overviewData.analytics.appointmentDistribution.map((item) => {
                        const total = overviewData.stats.appointments.total || 1;
                        const pct = Math.round((item.count / total) * 100);
                        return (
                          <div key={item.status} className="chart-bar-row">
                            <div className="bar-labels">
                              <span className="bar-title">{item.status}</span>
                              <span className="bar-val">
                                {item.count} ({pct}%)
                              </span>
                            </div>
                            <div className="bar-track">
                              <div
                                className={`bar-fill status-${item.status.toLowerCase().replace(/\s+/g, "-")}`}
                                style={{ width: `${Math.max(item.count > 0 ? 5 : 0, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monthly Registration Trends */}
                  <div className="chart-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">
                        <FiTrendingUp className="panel-icon" /> Registration Trends (6 Months)
                      </h3>
                      <span className="panel-badge">Platform Growth</span>
                    </div>
                    <div className="chart-trends-wrap">
                      {overviewData.analytics.registrationTrends.length === 0 ? (
                        <div className="empty-panel-text">No historical trend data yet.</div>
                      ) : (
                        <div className="trends-bar-chart">
                          {overviewData.analytics.registrationTrends.map((trend) => (
                            <div key={trend.label} className="trend-column">
                              <div className="trend-bar-outer">
                                <div
                                  className="trend-bar-inner"
                                  style={{
                                    height: `${Math.min(100, Math.max(15, trend.total * 15))}%`,
                                  }}
                                  title={`${trend.label}: ${trend.total} registrations`}
                                >
                                  <span className="trend-bar-val">{trend.total}</span>
                                </div>
                              </div>
                              <span className="trend-label">{trend.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Activities Section */}
                <div className="activity-tables-grid">
                  <div className="activity-card">
                    <h3 className="activity-title">
                      <FiUsers className="panel-icon" /> Recent Registrations
                    </h3>
                    <div className="table-responsive-wrap">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewData.recentActivity.users.map((u) => (
                            <tr key={u._id}>
                              <td>
                                <div className="user-cell-meta">
                                  <span className="user-name-bold">{u.name}</span>
                                  <span className="user-email-sub">{u.email}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`role-badge role-${u.role}`}>{u.role}</span>
                              </td>
                              <td>
                                <span className={`status-pill pill-${u.status || "active"}`}>
                                  {u.status || "active"}
                                </span>
                              </td>
                              <td className="date-cell">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="activity-card">
                    <h3 className="activity-title">
                      <FiCalendar className="panel-icon" /> Recent Consultations
                    </h3>
                    <div className="table-responsive-wrap">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Patient</th>
                            <th>Doctor</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewData.recentActivity.appointments.map((a) => (
                            <tr key={a._id}>
                              <td>{a.patientName}</td>
                              <td>{a.doctorName}</td>
                              <td className="date-cell">
                                {new Date(a.appointmentDate).toLocaleDateString()} • {a.timeSlot}
                              </td>
                              <td>
                                <span
                                  className={`status-pill pill-${a.status.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {a.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="loading-state-card">
                <FiRefreshCw className="spin" size={32} />
                <p>Loading platform operational metrics...</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 2: USER MANAGEMENT                               */}
        {/* ======================================================== */}
        {activeSection === "users" && (
          <div className="admin-content-section">
            {/* Filters Bar */}
            <div className="filter-controls-bar">
              <div className="search-input-wrap">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="filter-search-input"
                />
              </div>

              <div className="dropdown-filter-group">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by User Role"
                >
                  <option value="all">All Roles</option>
                  <option value="patient">Patients</option>
                  <option value="doctor">Doctors</option>
                  <option value="admin">Administrators</option>
                  <option value="superadmin">Super Admins</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by Account Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>

                <button
                  className="apply-filter-btn"
                  onClick={() => fetchUsers(1)}
                  aria-label="Search users"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="table-responsive-card">
              <table className="admin-data-table full-width">
                <thead>
                  <tr>
                    <th>User Identity</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Doctor Verification</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table-row">
                        No user accounts matched the search criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelf = user?.id === u._id;
                      const isSuspended = u.status === "suspended";
                      return (
                        <tr key={u._id} className={isSuspended ? "row-suspended" : ""}>
                          <td>
                            <div className="user-cell-meta">
                              <span className="user-name-bold">{u.name}</span>
                              <span className="user-email-sub">{u.email}</span>
                              {u.phoneNumber && (
                                <span className="user-phone-sub">📞 {u.phoneNumber}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge role-${u.role}`}>{u.role}</span>
                          </td>
                          <td>
                            <span className={`status-pill pill-${u.status || "active"}`}>
                              {isSuspended ? "Suspended" : "Active"}
                            </span>
                          </td>
                          <td>
                            {u.role === "doctor" ? (
                              <span
                                className={`verification-tag tag-${u.verificationStatus || "not_submitted"}`}
                              >
                                {u.verificationStatus || "Not Submitted"}
                              </span>
                            ) : (
                              <span className="muted-dash">—</span>
                            )}
                          </td>
                          <td className="date-cell">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                className="action-btn view-btn"
                                onClick={() => handleOpenUserDetails(u)}
                                title="View User Account Details"
                                type="button"
                              >
                                <FiEye size={14} /> Details
                              </button>

                              {!isSelf && (
                                <button
                                  className={`action-btn ${isSuspended ? "reactivate-btn" : "suspend-btn"}`}
                                  onClick={() => handleOpenSuspensionModal(u)}
                                  title={isSuspended ? "Reactivate Account" : "Suspend Account"}
                                >
                                  {isSuspended ? (
                                    <>
                                      <FiUnlock size={14} /> Reactivate
                                    </>
                                  ) : (
                                    <>
                                      <FiLock size={14} /> Suspend
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination controls */}
              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing page {userPagination.page} of {userPagination.pages} ({userPagination.total} accounts)
                </span>
                <div className="pagination-buttons">
                  <button
                    className="pager-btn"
                    disabled={userPagination.page <= 1 || loading}
                    onClick={() => fetchUsers(userPagination.page - 1)}
                  >
                    <FiChevronLeft size={16} /> Previous
                  </button>
                  <button
                    className="pager-btn"
                    disabled={userPagination.page >= userPagination.pages || loading}
                    onClick={() => fetchUsers(userPagination.page + 1)}
                  >
                    Next <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {selectedUserDetails && (() => {
          const u = selectedUserDetails.user || selectedUserDetails;
          const stats = selectedUserDetails.stats;
          const isLoading = !!selectedUserDetails.loading;
          const errorMsg = selectedUserDetails.error;

          const addressParts = [u.address, u.city, u.state, u.postalCode].filter(Boolean);
          const formattedAddress = addressParts.length > 0 ? addressParts.join(", ") : (u.address || "Not provided");

          const totalConsultations = typeof stats?.appointments?.total === "number"
            ? stats.appointments.total
            : (isLoading ? "…" : "—");
          const upcomingConsultations = typeof stats?.appointments?.upcoming === "number"
            ? stats.appointments.upcoming
            : (isLoading ? "…" : "—");
          const medicalReports = typeof stats?.reports === "number"
            ? stats.reports
            : (isLoading ? "…" : "—");

          const roleDisplay = u.role === "superadmin"
            ? "Super Admin"
            : u.role === "admin"
            ? "Admin"
            : u.role === "doctor"
            ? "Doctor"
            : "Patient";

          const isSuspended = u.status === "suspended";

          return (
            <div
              className="admin-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-details-title"
              onClick={() => setSelectedUserDetails(null)}
            >
              <div
                className="admin-modal-card user-details-modal"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="user-details-modal-header">
                  <div className="modal-title-group">
                    <div className="modal-icon-badge">
                      <FiUsers size={20} color="#38bdf8" />
                    </div>
                    <div>
                      <h3 id="user-details-title" className="modal-title-text">
                        User Details
                      </h3>
                      <p className="modal-subtitle-text">
                        Account profile and activity
                      </p>
                    </div>
                  </div>
                  <button
                    className="modal-close-icon-btn"
                    onClick={() => setSelectedUserDetails(null)}
                    aria-label="Close user details modal"
                    type="button"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                {/* Modal Body with internal scrolling */}
                <div className="user-details-modal-body">
                  {isLoading && (
                    <div className="modal-loading-bar" role="status" aria-live="polite">
                      <div className="modal-loading-spinner" />
                      <span>Loading real-time account telemetry...</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="modal-error-banner" role="alert">
                      <FiAlertTriangle size={18} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Profile Summary Card */}
                  <div className="user-profile-hero-card">
                    <div className="user-hero-left">
                      <div className="user-hero-avatar">
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="user-hero-info">
                        <h4 className="user-hero-name">{u.name || "Unnamed User"}</h4>
                        <div className="user-hero-badges">
                          <span className={`role-badge-tag role-${u.role || "patient"}`}>
                            {roleDisplay}
                          </span>
                          <span
                            className={`status-badge-tag status-${isSuspended ? "suspended" : "active"}`}
                          >
                            {isSuspended ? "Suspended" : "Active"}
                          </span>
                          {u.role === "doctor" && (
                            <span
                              className={`verification-badge-tag verif-${u.verificationStatus || "pending"}`}
                            >
                              {u.verificationStatus === "verified"
                                ? "Verified Clinician"
                                : u.verificationStatus === "rejected"
                                ? "Declined"
                                : "Pending Verification"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User ID in a readable, selectable field with copy button */}
                    <div className="user-id-box">
                      <span className="user-id-label">User ID</span>
                      <div className="user-id-interactive-pill">
                        <span className="user-id-code">{u._id || "—"}</span>
                        {u._id && (
                          <button
                            type="button"
                            className="user-id-copy-btn"
                            onClick={() => handleCopyUserId(u._id)}
                            title="Copy User ID to clipboard"
                            aria-label="Copy User ID"
                          >
                            {copiedUserId ? (
                              <span className="copied-tag">
                                <FiCheck size={12} /> Copied
                              </span>
                            ) : (
                              <FiCopy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Account Information */}
                  <div className="details-section-block">
                    <h5 className="details-section-heading">
                      <FiMail size={14} /> Account Information
                    </h5>
                    <div className="details-fields-grid">
                      <div className="field-card">
                        <span className="field-card-label">Email Address</span>
                        <span className="field-card-value selectable">
                          {u.email || "Not provided"}
                        </span>
                      </div>

                      <div className="field-card">
                        <span className="field-card-label">Mobile Number</span>
                        <span className="field-card-value selectable">
                          {u.phoneNumber || "Not provided"}
                        </span>
                      </div>

                      <div className="field-card field-card-full">
                        <span className="field-card-label">Address / Location</span>
                        <span className="field-card-value">{formattedAddress}</span>
                      </div>

                      <div className="field-card">
                        <span className="field-card-label">Registered On</span>
                        <span className="field-card-value">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Not recorded"}
                        </span>
                      </div>

                      <div className="field-card">
                        <span className="field-card-label">Last Modified</span>
                        <span className="field-card-value">
                          {u.updatedAt
                            ? new Date(u.updatedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Professional Information — Doctors Only */}
                  {u.role === "doctor" && (
                    <div className="details-section-block">
                      <h5 className="details-section-heading">
                        <FiShield size={14} /> Professional Credentials & Practice
                      </h5>
                      <div className="details-fields-grid">
                        <div className="field-card">
                          <span className="field-card-label">Specialization</span>
                          <span className="field-card-value">
                            {u.specialization || "Not provided"}
                          </span>
                        </div>

                        <div className="field-card">
                          <span className="field-card-label">Qualifications</span>
                          <span className="field-card-value">
                            {u.qualifications || "Not provided"}
                          </span>
                        </div>

                        <div className="field-card">
                          <span className="field-card-label">Medical Council Reg #</span>
                          <span className="field-card-value selectable">
                            {u.medicalRegistrationNumber || "Not registered"}
                          </span>
                        </div>

                        <div className="field-card">
                          <span className="field-card-label">Verification State</span>
                          <span className="field-card-value">
                            {u.verificationStatus
                              ? u.verificationStatus.toUpperCase()
                              : "PENDING"}
                          </span>
                        </div>

                        {u.verificationReview?.reviewedAt && (
                          <div className="field-card field-card-full">
                            <span className="field-card-label">Review Date & Notes</span>
                            <span className="field-card-value">
                              Reviewed on{" "}
                              {new Date(
                                u.verificationReview.reviewedAt
                              ).toLocaleDateString()}{" "}
                              {u.verificationReview.rejectionReason && (
                                <span className="review-rejection-inline">
                                  • Reason: {u.verificationReview.rejectionReason}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Consultation Statistics */}
                  <div className="details-section-block">
                    <h5 className="details-section-heading">
                      <FiCalendar size={14} /> Consultation Statistics
                    </h5>
                    <div className="stat-cards-cluster">
                      <div className="stat-cluster-card">
                        <div className="stat-card-icon-wrap teal">
                          <FiCalendar size={18} />
                        </div>
                        <div className="stat-card-data">
                          <span className="stat-card-number">{totalConsultations}</span>
                          <span className="stat-card-caption">Total Consultations</span>
                        </div>
                      </div>

                      <div className="stat-cluster-card">
                        <div className="stat-card-icon-wrap blue">
                          <FiClock size={18} />
                        </div>
                        <div className="stat-card-data">
                          <span className="stat-card-number">{upcomingConsultations}</span>
                          <span className="stat-card-caption">Upcoming Consultations</span>
                        </div>
                      </div>

                      {u.role === "patient" && (
                        <div className="stat-cluster-card">
                          <div className="stat-card-icon-wrap amber">
                            <FiFileText size={18} />
                          </div>
                          <div className="stat-card-data">
                            <span className="stat-card-number">{medicalReports}</span>
                            <span className="stat-card-caption">Medical Reports</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Account Activity & Governance History */}
                  <div className="details-section-block">
                    <h5 className="details-section-heading">
                      <FiLock size={14} /> Account Activity
                    </h5>

                    {u.suspensionHistory && u.suspensionHistory.length > 0 ? (
                      <div className="governance-timeline-stack">
                        {u.suspensionHistory.map((h, i) => {
                          const isSusp = (h.action || h.status || "").toLowerCase().startsWith("suspend");
                          const adminWho =
                            h.performedByEmail ||
                            h.changedBy?.email ||
                            h.changedBy?.name ||
                            h.performedBy ||
                            "Administrator";
                          const formattedTime = h.timestamp || h.changedAt
                            ? new Date(h.timestamp || h.changedAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Date not recorded";

                          return (
                            <div
                              key={i}
                              className={`timeline-event-card ${isSusp ? "ev-suspended" : "ev-active"}`}
                            >
                              <div className="event-card-header">
                                <span
                                  className={`event-action-tag ${isSusp ? "tag-danger" : "tag-success"}`}
                                >
                                  {isSusp ? "ACCOUNT SUSPENDED" : "ACCOUNT REACTIVATED"}
                                </span>
                                <span className="event-timestamp">{formattedTime}</span>
                              </div>

                              <div className="event-admin-meta">
                                <span>Action recorded by:</span>{" "}
                                <strong>{adminWho}</strong>
                              </div>

                              {h.reason && (
                                <div className="event-reason-box">
                                  <span className="reason-label">Reason:</span>
                                  <p className="reason-text">{h.reason}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="governance-empty-state">
                        <FiCheckCircle size={22} color="#10b981" />
                        <div>
                          <h6>Account in Good Standing</h6>
                          <p>
                            No suspension, restriction, or governance actions recorded for this account.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="user-details-modal-footer">
                  <button
                    type="button"
                    className="modal-footer-close-btn"
                    onClick={() => setSelectedUserDetails(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Account Suspension / Reactivation Modal */}
        {suspensionModalUser && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card">
              <div className="modal-header">
                <h3>
                  {suspensionModalUser.status === "suspended" ? "Reactivate Account" : "Suspend Account"}:{" "}
                  {suspensionModalUser.name}
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setSuspensionModalUser(null)}
                  aria-label="Cancel"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="modal-body-content">
                <p className="modal-instruction-text">
                  {suspensionModalUser.status === "suspended"
                    ? "Reactivating this account will restore access to login, appointments, and medical features."
                    : "Suspending this account immediately blocks access to authenticated endpoints. The action will be recorded in the security audit log."}
                </p>

                <div className="form-group">
                  <label htmlFor="suspension-reason" className="form-label">
                    Mandatory Administrative Reason <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="suspension-reason"
                    rows="3"
                    className="modal-textarea"
                    placeholder="Provide detailed clinical or administrative justification..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="secondary-btn"
                  onClick={() => setSuspensionModalUser(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  className={`primary-action-btn ${
                    suspensionModalUser.status === "suspended" ? "green-btn" : "red-btn"
                  }`}
                  onClick={handleConfirmSuspensionChange}
                  disabled={actionLoading || !suspensionReason.trim()}
                >
                  {actionLoading
                    ? "Processing..."
                    : suspensionModalUser.status === "suspended"
                    ? "Confirm Reactivation"
                    : "Confirm Suspension"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 3: DOCTOR VERIFICATIONS                          */}
        {/* ======================================================== */}
        {activeSection === "doctors" && (
          <div className="admin-content-section">
            <div className="doctor-filter-tabs">
              <button
                className={`tab-filter-pill ${doctorFilter === "pending" ? "active" : ""}`}
                onClick={() => setDoctorFilter("pending")}
              >
                Pending Verification
              </button>
              <button
                className={`tab-filter-pill ${doctorFilter === "all" ? "active" : ""}`}
                onClick={() => setDoctorFilter("all")}
              >
                All Clinicians
              </button>
              <button
                className={`tab-filter-pill ${doctorFilter === "verified" ? "active" : ""}`}
                onClick={() => setDoctorFilter("verified")}
              >
                Verified Clinicians
              </button>
              <button
                className={`tab-filter-pill ${doctorFilter === "rejected" ? "active" : ""}`}
                onClick={() => setDoctorFilter("rejected")}
              >
                Declined Applications
              </button>
            </div>

            <div className="doctors-card-grid">
              {doctors.length === 0 ? (
                <div className="empty-state-card">
                  <FiCheckCircle size={36} color="#38bdf8" />
                  <h4>No Doctor Applications Found</h4>
                  <p>There are no doctor accounts matching the "{doctorFilter}" status filter.</p>
                </div>
              ) : (
                doctors.map((doc) => (
                  <div key={doc._id} className="doctor-governance-card">
                    <div className="doc-card-header">
                      <div className="doc-card-identity">
                        <h4 className="doc-name">{doc.name}</h4>
                        <span className="doc-spec-sub">{doc.specialization || "General Medicine"}</span>
                      </div>
                      <span className={`verification-tag tag-${doc.verificationStatus || "pending"}`}>
                        {doc.verificationStatus || "Pending"}
                      </span>
                    </div>

                    <div className="doc-credentials-body">
                      <div className="cred-row">
                        <span className="cred-label">Qualifications:</span>
                        <span className="cred-val">{doc.qualifications || "MBBS"}</span>
                      </div>
                      <div className="cred-row">
                        <span className="cred-label">Medical Council Reg:</span>
                        <span className="cred-val code-text">
                          {doc.medicalRegistrationNumber || "Pending Submission"}
                        </span>
                      </div>
                      <div className="cred-row">
                        <span className="cred-label">Experience:</span>
                        <span className="cred-val">{doc.experienceYears || 5} Years</span>
                      </div>
                      <div className="cred-row">
                        <span className="cred-label">Contact:</span>
                        <span className="cred-val">{doc.email} • {doc.phoneNumber || "No phone"}</span>
                      </div>
                      <div className="cred-row">
                        <span className="cred-label">Clinic Location:</span>
                        <span className="cred-val">{doc.address || doc.city || "Not provided"}</span>
                      </div>

                      {/* Submitted Documents Section */}
                      <div className="doc-attachments-area">
                        <span className="attachments-title">Credentials & Verification Documents:</span>
                        {!doc.verificationDocuments || doc.verificationDocuments.length === 0 ? (
                          <span className="no-docs-text">No verification documents uploaded.</span>
                        ) : (
                          <div className="docs-chips-list">
                            {doc.verificationDocuments.map((d, idx) => (
                              <button
                                key={idx}
                                className="doc-chip-btn"
                                onClick={() => handleViewCredential(doc._id, idx)}
                                title={`Inspect ${d.originalName}`}
                              >
                                <FiFileText size={13} />
                                <span className="chip-name">{d.originalName}</span>
                                <FiExternalLink size={12} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Existing Review decision if rejected */}
                      {doc.verificationReview?.rejectionReason && (
                        <div className="rejection-note-callout">
                          <strong>Previous Decline Reason:</strong> {doc.verificationReview.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="doc-card-actions">
                      <button
                        className="doc-action-btn approve-btn"
                        onClick={() => handleOpenDoctorReview(doc, "verified")}
                        disabled={doc.verificationStatus === "verified"}
                      >
                        <FiCheck size={16} /> Approve & Verify
                      </button>
                      <button
                        className="doc-action-btn decline-btn"
                        onClick={() => handleOpenDoctorReview(doc, "rejected")}
                        disabled={doc.verificationStatus === "rejected"}
                      >
                        <FiX size={16} /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Doctor Verification Review Modal */}
        {selectedDoctorForReview && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card">
              <div className="modal-header">
                <h3>
                  {verificationDecision === "verified" ? "Approve Doctor Verification" : "Decline Doctor Application"}:{" "}
                  {selectedDoctorForReview.name}
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedDoctorForReview(null)}
                  aria-label="Cancel"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="modal-body-content">
                <p className="modal-instruction-text">
                  {verificationDecision === "verified"
                    ? "Approving this clinician grants full consultation and appointment scheduling privileges across the platform."
                    : "Declining will notify the doctor and prevent them from accepting patient appointments until valid credentials are provided."}
                </p>

                {verificationDecision === "rejected" ? (
                  <div className="form-group">
                    <label htmlFor="rejection-reason" className="form-label">
                      Rejection Reason (Mandatory) <span className="req-star">*</span>
                    </label>
                    <textarea
                      id="rejection-reason"
                      rows="3"
                      className="modal-textarea"
                      placeholder="Specify deficiency (e.g. Unclear medical council certificate, name mismatch)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="verification-notes" className="form-label">
                      Verification Notes (Optional)
                    </label>
                    <textarea
                      id="verification-notes"
                      rows="2"
                      className="modal-textarea"
                      placeholder="Add administrative verification notes or license registry verification reference..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="secondary-btn"
                  onClick={() => setSelectedDoctorForReview(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  className={`primary-action-btn ${verificationDecision === "verified" ? "green-btn" : "red-btn"}`}
                  onClick={handleSubmitDoctorReview}
                  disabled={
                    actionLoading || (verificationDecision === "rejected" && !rejectionReason.trim())
                  }
                >
                  {actionLoading
                    ? "Submitting..."
                    : verificationDecision === "verified"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 4: GLOBAL APPOINTMENT MANAGEMENT                 */}
        {/* ======================================================== */}
        {activeSection === "appointments" && (
          <div className="admin-content-section">
            <div className="filter-controls-bar">
              <div className="search-input-wrap">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by patient name, doctor, or phone..."
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  className="filter-search-input"
                />
              </div>

              <div className="dropdown-filter-group">
                <select
                  value={appointmentStatusFilter}
                  onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  value={appointmentTypeFilter}
                  onChange={(e) => setAppointmentTypeFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by Consultation Mode"
                >
                  <option value="all">All Modes</option>
                  <option value="Video / Online">Video / Online</option>
                  <option value="In-Person">In-Person</option>
                  <option value="Phone">Phone</option>
                </select>

                <button className="apply-filter-btn" onClick={() => fetchAppointments(1)}>
                  Search
                </button>
              </div>
            </div>

            <div className="table-responsive-card">
              <table className="admin-data-table full-width">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Assigned Doctor</th>
                    <th>Date & Time Slot</th>
                    <th>Mode</th>
                    <th>Lifecycle Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table-row">
                        No appointments found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((a) => (
                      <tr key={a._id}>
                        <td>
                          <div className="user-cell-meta">
                            <span className="user-name-bold">{a.patientName}</span>
                            <span className="user-phone-sub">📞 {a.patientPhone || "No phone"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-cell-meta">
                            <span className="user-name-bold">{a.doctorName}</span>
                            <span className="user-email-sub">{a.department || "General Medicine"}</span>
                          </div>
                        </td>
                        <td className="date-cell">
                          {new Date(a.appointmentDate).toLocaleDateString()} • {a.timeSlot}
                        </td>
                        <td>
                          <span className="mode-pill">{a.consultationType || "In-Person"}</span>
                        </td>
                        <td>
                          <span
                            className={`status-pill pill-${a.status.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn view-btn"
                            onClick={() => {
                              setSelectedApptForUpdate(a);
                              setApptNewStatus(a.status);
                              setApptCorrectionReason("");
                            }}
                            title="Administrative Override"
                          >
                            Correct / Override
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing page {appointmentPagination.page} of {appointmentPagination.pages} ({appointmentPagination.total} consultations)
                </span>
                <div className="pagination-buttons">
                  <button
                    className="pager-btn"
                    disabled={appointmentPagination.page <= 1 || loading}
                    onClick={() => fetchAppointments(appointmentPagination.page - 1)}
                  >
                    <FiChevronLeft size={16} /> Previous
                  </button>
                  <button
                    className="pager-btn"
                    disabled={appointmentPagination.page >= appointmentPagination.pages || loading}
                    onClick={() => fetchAppointments(appointmentPagination.page + 1)}
                  >
                    Next <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Status Override Modal */}
        {selectedApptForUpdate && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card">
              <div className="modal-header">
                <h3>Administrative Appointment Correction</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedApptForUpdate(null)}
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="modal-body-content">
                <p className="modal-instruction-text">
                  Correcting appointment for <strong>{selectedApptForUpdate.patientName}</strong> with{" "}
                  <strong>{selectedApptForUpdate.doctorName}</strong>. All changes are logged to the immutable security audit log.
                </p>

                <div className="form-group">
                  <label htmlFor="appt-new-status" className="form-label">
                    New Target Status
                  </label>
                  <select
                    id="appt-new-status"
                    className="modal-select"
                    value={apptNewStatus}
                    onChange={(e) => setApptNewStatus(e.target.value)}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Expired">Expired</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="appt-reason" className="form-label">
                    Mandatory Administrative Justification <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="appt-reason"
                    rows="3"
                    className="modal-textarea"
                    placeholder="State verified dispute or clinical reason for status alteration..."
                    value={apptCorrectionReason}
                    onChange={(e) => setApptCorrectionReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="secondary-btn"
                  onClick={() => setSelectedApptForUpdate(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  className="primary-action-btn green-btn"
                  onClick={handleUpdateAppointment}
                  disabled={actionLoading || !apptCorrectionReason.trim()}
                >
                  {actionLoading ? "Saving..." : "Apply Status Correction"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 5: REPORT STORAGE ADMINISTRATION                 */}
        {/* ======================================================== */}
        {activeSection === "reports" && (
          <div className="admin-content-section">
            <div className="filter-controls-bar">
              <div className="search-input-wrap">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search reports by filename or category..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="filter-search-input"
                />
              </div>

              <div className="dropdown-filter-group">
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by Analysis Status"
                >
                  <option value="all">All Analysis States</option>
                  <option value="Completed">Completed</option>
                  <option value="Processing">Processing</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>

                <button className="apply-filter-btn" onClick={() => fetchReports(1)}>
                  Search
                </button>
              </div>
            </div>

            <div className="table-responsive-card">
              <table className="admin-data-table full-width">
                <thead>
                  <tr>
                    <th>Report File</th>
                    <th>Patient Owner</th>
                    <th>Uploader</th>
                    <th>Category & Size</th>
                    <th>Pipeline Stage</th>
                    <th>Status</th>
                    <th>Uploaded At</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-table-row">
                        No medical reports found in current filter.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => {
                      const sizeKb = Math.round((r.fileSize || 0) / 1024);
                      return (
                        <tr key={r._id}>
                          <td>
                            <div className="file-cell-meta">
                              <span className="file-name-bold">{r.originalName || r.fileName}</span>
                              <span className="file-type-sub">{r.fileType}</span>
                            </div>
                          </td>
                          <td>
                            <div className="user-cell-meta">
                              <span className="user-name-bold">{r.userId?.name || "Patient"}</span>
                              <span className="user-email-sub">{r.userId?.email || "Unknown"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="user-cell-meta">
                              <span className="user-name-bold">
                                {r.uploaderName || r.uploadedBy?.name || "Self"}
                              </span>
                              <span className="role-badge role-patient">
                                {r.uploadedByRole || "patient"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="category-pill">{r.category}</span>
                            <span className="size-label">{sizeKb} KB</span>
                          </td>
                          <td>
                            <span className="stage-text">{r.processingStage || "Completed"}</span>
                          </td>
                          <td>
                            <span
                              className={`status-pill pill-${(r.analysisStatus || "completed").toLowerCase()}`}
                            >
                              {r.analysisStatus || "Completed"}
                            </span>
                          </td>
                          <td className="date-cell">
                            {new Date(r.uploadedAt || r.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing page {reportPagination.page} of {reportPagination.pages} ({reportPagination.total} reports)
                </span>
                <div className="pagination-buttons">
                  <button
                    className="pager-btn"
                    disabled={reportPagination.page <= 1 || loading}
                    onClick={() => fetchReports(reportPagination.page - 1)}
                  >
                    <FiChevronLeft size={16} /> Previous
                  </button>
                  <button
                    className="pager-btn"
                    disabled={reportPagination.page >= reportPagination.pages || loading}
                    onClick={() => fetchReports(reportPagination.page + 1)}
                  >
                    Next <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 6: SECURITY & AUDIT LOGS                         */}
        {/* ======================================================== */}
        {activeSection === "security" && (
          <div className="admin-content-section">
            {/* Security Summary Cards */}
            {securityOverview && (
              <div className="kpi-grid">
                <div className="kpi-card sec-kpi">
                  <div className="kpi-icon-wrap failed-login-icon">
                    <FiAlertTriangle size={22} />
                  </div>
                  <div className="kpi-metric-info">
                    <span className="kpi-label">Failed Logins (24h)</span>
                    <span className="kpi-number">{securityOverview.summary.failedLogins24h}</span>
                    <span className="kpi-subtext">Monitored for brute-force attacks</span>
                  </div>
                </div>

                <div className="kpi-card sec-kpi">
                  <div className="kpi-icon-wrap unauthorized-icon">
                    <FiLock size={22} />
                  </div>
                  <div className="kpi-metric-info">
                    <span className="kpi-label">Unauthorized Attempts (24h)</span>
                    <span className="kpi-number">{securityOverview.summary.unauthorizedAttempts24h}</span>
                    <span className="kpi-subtext">Role-based boundary violations</span>
                  </div>
                </div>

                <div className="kpi-card sec-kpi">
                  <div className="kpi-icon-wrap ratelimit-icon">
                    <FiClock size={22} />
                  </div>
                  <div className="kpi-metric-info">
                    <span className="kpi-label">Throttled Events (24h)</span>
                    <span className="kpi-number">{securityOverview.summary.rateLimitEvents24h}</span>
                    <span className="kpi-subtext">IP rate limiting triggers</span>
                  </div>
                </div>

                <div className="kpi-card sec-kpi">
                  <div className="kpi-icon-wrap suspension-icon">
                    <FiShield size={22} />
                  </div>
                  <div className="kpi-metric-info">
                    <span className="kpi-label">Account Suspensions (7d)</span>
                    <span className="kpi-number">{securityOverview.summary.suspensions7d}</span>
                    <span className="kpi-subtext">Administrative enforcement</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Filter Bar */}
            <div className="filter-controls-bar">
              <div className="search-input-wrap">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search logs by actor email, action, or reason..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="filter-search-input"
                />
              </div>

              <div className="dropdown-filter-group">
                <select
                  value={auditEventTypeFilter}
                  onChange={(e) => setAuditEventTypeFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by Event Type"
                >
                  <option value="all">All Event Types</option>
                  <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
                  <option value="AUTH_LOGIN_FAILURE">Login Failure</option>
                  <option value="UNAUTHORIZED_ADMIN_ATTEMPT">Unauthorized Admin Attempt</option>
                  <option value="USER_SUSPENDED">User Suspended</option>
                  <option value="USER_REACTIVATED">User Reactivated</option>
                  <option value="DOCTOR_VERIFIED">Doctor Verified</option>
                  <option value="DOCTOR_REJECTED">Doctor Rejected</option>
                  <option value="APPOINTMENT_ADMIN_UPDATE">Appointment Update</option>
                  <option value="RATE_LIMIT_TRIGGERED">Rate Limit Triggered</option>
                </select>

                <select
                  value={auditOutcomeFilter}
                  onChange={(e) => setAuditOutcomeFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by Outcome"
                >
                  <option value="all">All Outcomes</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="warning">Warning</option>
                </select>

                <button className="apply-filter-btn" onClick={() => fetchAuditLogs(1)}>
                  Search
                </button>
              </div>
            </div>

            {/* Immutable Audit Log Table */}
            <div className="table-responsive-card">
              <div className="table-banner-info">
                <FiShield size={16} /> Immutable append-only audit trail. Deletions and modifications are cryptographically and server-blocked.
              </div>
              <table className="admin-data-table full-width">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Actor Identity</th>
                    <th>Action Executed</th>
                    <th>Outcome</th>
                    <th>Reason / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table-row">
                        No security audit logs found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td className="date-cell">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span className="event-type-code">{log.eventType}</span>
                        </td>
                        <td>
                          <div className="user-cell-meta">
                            <span className="user-name-bold">{log.actorEmail || "Anonymous / Unauthenticated"}</span>
                            <span className="role-badge role-patient">{log.actorRole}</span>
                          </div>
                        </td>
                        <td>{log.action}</td>
                        <td>
                          <span className={`outcome-pill outcome-${log.outcome}`}>
                            {log.outcome}
                          </span>
                        </td>
                        <td>
                          <div className="reason-cell">
                            {log.reason || "Standard execution"}
                            {log.ipAddress && (
                              <span className="ip-text">IP: {log.ipAddress}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing page {auditPagination.page} of {auditPagination.pages} ({auditPagination.total} audit events)
                </span>
                <div className="pagination-buttons">
                  <button
                    className="pager-btn"
                    disabled={auditPagination.page <= 1 || loading}
                    onClick={() => fetchAuditLogs(auditPagination.page - 1)}
                  >
                    <FiChevronLeft size={16} /> Previous
                  </button>
                  <button
                    className="pager-btn"
                    disabled={auditPagination.page >= auditPagination.pages || loading}
                    onClick={() => fetchAuditLogs(auditPagination.page + 1)}
                  >
                    Next <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 7: SYSTEM HEALTH & OPERATIONS                    */}
        {/* ======================================================== */}
        {activeSection === "health" && (
          <div className="admin-content-section">
            {systemHealth ? (
              <div className="health-dashboard-grid">
                {/* Probe 1: Backend Node Server */}
                <div className="probe-card">
                  <div className="probe-header">
                    <FiServer className="probe-icon" />
                    <div>
                      <h4 className="probe-title">Backend API Core</h4>
                      <span className="probe-sub">Node.js / Express</span>
                    </div>
                    <span className="probe-status-badge healthy">
                      {systemHealth.services.backend.status}
                    </span>
                  </div>
                  <div className="probe-body">
                    <div className="probe-metric-row">
                      <span>Uptime:</span>
                      <strong>{Math.floor(systemHealth.services.backend.uptimeSeconds / 60)} minutes</strong>
                    </div>
                    <div className="probe-metric-row">
                      <span>Memory RSS:</span>
                      <strong>{systemHealth.services.backend.memoryRssMb} MB</strong>
                    </div>
                    <div className="probe-metric-row">
                      <span>Environment:</span>
                      <strong>{systemHealth.services.backend.environment}</strong>
                    </div>
                    <div className="probe-metric-row">
                      <span>Node Version:</span>
                      <strong>{systemHealth.services.backend.nodeVersion}</strong>
                    </div>
                  </div>
                </div>

                {/* Probe 2: MongoDB Atlas */}
                <div className="probe-card">
                  <div className="probe-header">
                    <FiDatabase className="probe-icon" />
                    <div>
                      <h4 className="probe-title">MongoDB Atlas</h4>
                      <span className="probe-sub">Clinical Database</span>
                    </div>
                    <span
                      className={`probe-status-badge ${
                        systemHealth.services.database.status === "Healthy" ? "healthy" : "degraded"
                      }`}
                    >
                      {systemHealth.services.database.status}
                    </span>
                  </div>
                  <div className="probe-body">
                    <div className="probe-metric-row">
                      <span>Connection State:</span>
                      <strong>{systemHealth.services.database.connectionState}</strong>
                    </div>
                    <div className="probe-metric-row">
                      <span>Ping Latency:</span>
                      <strong>
                        {systemHealth.services.database.latencyMs >= 0
                          ? `${systemHealth.services.database.latencyMs} ms`
                          : "Unavailable"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Probe 3: Azure Blob Storage */}
                <div className="probe-card">
                  <div className="probe-header">
                    <FiFileText className="probe-icon" />
                    <div>
                      <h4 className="probe-title">Azure Blob Storage</h4>
                      <span className="probe-sub">Encrypted Medical Vault</span>
                    </div>
                    <span
                      className={`probe-status-badge ${
                        systemHealth.services.azureBlobStorage.configured ? "healthy" : "neutral"
                      }`}
                    >
                      {systemHealth.services.azureBlobStorage.status}
                    </span>
                  </div>
                  <div className="probe-body">
                    <div className="probe-metric-row">
                      <span>Configured:</span>
                      <strong>{systemHealth.services.azureBlobStorage.configured ? "Yes" : "Pending Credentials"}</strong>
                    </div>
                    <div className="probe-metric-row">
                      <span>Container Name:</span>
                      <strong>{systemHealth.services.azureBlobStorage.container}</strong>
                    </div>
                  </div>
                </div>

                {/* Probe 4: Azure OpenAI */}
                <div className="probe-card">
                  <div className="probe-header">
                    <FiCpu className="probe-icon" />
                    <div>
                      <h4 className="probe-title">Azure OpenAI</h4>
                      <span className="probe-sub">Clinical Document Analysis</span>
                    </div>
                    <span
                      className={`probe-status-badge ${
                        systemHealth.services.azureOpenAI.configured ? "healthy" : "neutral"
                      }`}
                    >
                      {systemHealth.services.azureOpenAI.status}
                    </span>
                  </div>
                  <div className="probe-body">
                    <div className="probe-metric-row">
                      <span>Deployment:</span>
                      <strong>{systemHealth.services.azureOpenAI.deployment}</strong>
                    </div>
                  </div>
                </div>

                {/* Probe 5: Ollama AI */}
                <div className="probe-card">
                  <div className="probe-header">
                    <FiCpu className="probe-icon" />
                    <div>
                      <h4 className="probe-title">Ollama AI Daemon</h4>
                      <span className="probe-sub">Local Nutrition Model</span>
                    </div>
                    <span
                      className={`probe-status-badge ${
                        systemHealth.services.ollamaAI.available ? "healthy" : "degraded"
                      }`}
                    >
                      {systemHealth.services.ollamaAI.status}
                    </span>
                  </div>
                  <div className="probe-body">
                    <div className="probe-metric-row">
                      <span>Configured Model:</span>
                      <strong>{systemHealth.services.ollamaAI.model}</strong>
                    </div>
                    <div className="probe-metric-row">
                      <span>Model Installed:</span>
                      <strong>{systemHealth.services.ollamaAI.modelInstalled ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </div>

                {/* Probe 6: Email Service */}
                <div className="probe-card">
                  <div className="probe-header">
                    <FiMail className="probe-icon" />
                    <div>
                      <h4 className="probe-title">Email Dispatch Service</h4>
                      <span className="probe-sub">SMTP Relay Transport</span>
                    </div>
                    <span
                      className={`probe-status-badge ${
                        systemHealth.services.emailTransport.configured ? "healthy" : "neutral"
                      }`}
                    >
                      {systemHealth.services.emailTransport.status}
                    </span>
                  </div>
                  <div className="probe-body">
                    <div className="probe-metric-row">
                      <span>SMTP Host Configured:</span>
                      <strong>{systemHealth.services.emailTransport.smtpHostConfigured ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </div>

                {/* Probe 7: Background Expiry Cron */}
                <div className="probe-card">
                  <div className="probe-header">
                    <FiClock className="probe-icon" />
                    <div>
                      <h4 className="probe-title">Appointment Expiry Worker</h4>
                      <span className="probe-sub">Background Grace Period Sync</span>
                    </div>
                    <span className="probe-status-badge healthy">
                      {systemHealth.services.appointmentExpiryWorker.status}
                    </span>
                  </div>
                  <div className="probe-body">
                    <div className="probe-metric-row">
                      <span>Sweep Interval:</span>
                      <strong>{systemHealth.services.appointmentExpiryWorker.intervalSeconds} seconds</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="loading-state-card">
                <FiRefreshCw className="spin" size={32} />
                <p>Probing infrastructure services...</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 8: SUPPORT & INQUIRIES                           */}
        {/* ======================================================== */}
        {activeSection === "support" && (
          <div className="admin-content-section">
            <div className="filter-controls-bar">
              <div className="search-input-wrap">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search inquiries by name, email, or message..."
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  className="filter-search-input"
                />
              </div>

              <div className="dropdown-filter-group">
                <select
                  value={supportStatusFilter}
                  onChange={(e) => setSupportStatusFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Filter by Support Status"
                >
                  <option value="all">All Inquiries</option>
                  <option value="New">New Only</option>
                  <option value="In Review">In Review</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <button className="apply-filter-btn" onClick={() => fetchSupportQueries(1)}>
                  Search
                </button>
              </div>
            </div>

            <div className="table-responsive-card">
              <table className="admin-data-table full-width">
                <thead>
                  <tr>
                    <th>Inquirer</th>
                    <th>Message Query Preview</th>
                    <th>Status</th>
                    <th>Received At</th>
                    <th>Resolution</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supportQueries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table-row">
                        No support inquiries found in this category.
                      </td>
                    </tr>
                  ) : (
                    supportQueries.map((q) => (
                      <tr key={q._id}>
                        <td>
                          <div className="user-cell-meta">
                            <span className="user-name-bold">{q.name}</span>
                            <span className="user-email-sub">{q.email}</span>
                            {q.phoneNumber && <span className="user-phone-sub">📞 {q.phoneNumber}</span>}
                          </div>
                        </td>
                        <td className="query-preview-cell">
                          <p className="query-text-clamp">{q.query}</p>
                        </td>
                        <td>
                          <span className={`status-pill pill-${q.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="date-cell">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="res-notes-sub">
                            {q.resolutionNotes || "Pending resolution"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn view-btn"
                            onClick={() => {
                              setSelectedSupportQuery(q);
                              setSupportNewStatus(q.status === "New" ? "In Review" : q.status);
                              setSupportResolutionNotes(q.resolutionNotes || "");
                            }}
                          >
                            Review & Resolve
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing page {supportPagination.page} of {supportPagination.pages} ({supportPagination.total} inquiries)
                </span>
                <div className="pagination-buttons">
                  <button
                    className="pager-btn"
                    disabled={supportPagination.page <= 1 || loading}
                    onClick={() => fetchSupportQueries(supportPagination.page - 1)}
                  >
                    <FiChevronLeft size={16} /> Previous
                  </button>
                  <button
                    className="pager-btn"
                    disabled={supportPagination.page >= supportPagination.pages || loading}
                    onClick={() => fetchSupportQueries(supportPagination.page + 1)}
                  >
                    Next <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Support Resolution Modal */}
        {selectedSupportQuery && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card">
              <div className="modal-header">
                <h3>Support Inquiry: {selectedSupportQuery.name}</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedSupportQuery(null)}
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="modal-body-content">
                <div className="inquiry-full-message">
                  <span className="meta-lbl">Full Inquirer Query:</span>
                  <p className="inquiry-quote">{selectedSupportQuery.query}</p>
                  <div className="inquiry-contact-meta">
                    Email: <strong>{selectedSupportQuery.email}</strong> • Phone:{" "}
                    <strong>{selectedSupportQuery.phoneNumber || "None"}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="support-status-select" className="form-label">
                    Inquiry Status
                  </label>
                  <select
                    id="support-status-select"
                    className="modal-select"
                    value={supportNewStatus}
                    onChange={(e) => setSupportNewStatus(e.target.value)}
                  >
                    <option value="New">New</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="support-resolution-notes" className="form-label">
                    Administrative Resolution Notes
                  </label>
                  <textarea
                    id="support-resolution-notes"
                    rows="3"
                    className="modal-textarea"
                    placeholder="Document resolution steps, patient contact history, or action taken..."
                    value={supportResolutionNotes}
                    onChange={(e) => setSupportResolutionNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="secondary-btn"
                  onClick={() => setSelectedSupportQuery(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  className="primary-action-btn green-btn"
                  onClick={handleUpdateSupportQuery}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Save Resolution"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
