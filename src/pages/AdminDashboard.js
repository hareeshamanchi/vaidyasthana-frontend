import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { adminAPI, hospitalTenantAPI } from "../services/api";
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
  FiRotateCcw,
  FiHome,
  FiPlus,
  FiMapPin,
  FiPhone,
  FiAlertCircle,
} from "react-icons/fi";
import "./AdminDashboard.css";

const REPORT_CATEGORIES = [
  "Laboratory Report",
  "Radiology & Imaging",
  "Prescription",
  "Discharge Summary",
  "Cardiology",
  "Pathology",
  "Medical Report",
];

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const getFileTypeMeta = (fileName, fileType) => {
  let ext = "";
  if (fileName && fileName.includes(".")) {
    ext = fileName.split(".").pop().toUpperCase();
  }
  if (!ext && fileType) {
    if (fileType.includes("pdf")) ext = "PDF";
    else if (fileType.includes("png")) ext = "PNG";
    else if (fileType.includes("jpeg") || fileType.includes("jpg")) ext = "JPG";
    else if (fileType.includes("dicom")) ext = "DICOM";
    else if (fileType.includes("word") || fileType.includes("docx")) ext = "DOCX";
    else ext = fileType.split("/").pop().toUpperCase();
  }
  return ext || "FILE";
};

const getCategoryBadgeClass = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("lab")) return "cat-lab";
  if (cat.includes("radio") || cat.includes("imag")) return "cat-radiology";
  if (cat.includes("prescrip")) return "cat-prescription";
  if (cat.includes("discharge")) return "cat-discharge";
  if (cat.includes("cardio")) return "cat-cardiology";
  if (cat.includes("patho")) return "cat-pathology";
  return "cat-general";
};

const getUploaderRoleBadgeClass = (role) => {
  const r = (role || "").toLowerCase();
  if (r === "superadmin") return "role-superadmin";
  if (r === "admin") return "role-admin";
  if (r === "doctor") return "role-doctor";
  return "role-patient";
};

const getReportStatusMeta = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "completed") return { label: "Completed", className: "status-completed" };
  if (s === "processing") return { label: "Processing", className: "status-processing" };
  if (s === "pending") return { label: "Pending", className: "status-pending" };
  if (s === "failed") return { label: "Failed", className: "status-failed" };
  return { label: status || "Completed", className: "status-default" };
};

const getPipelineStageMeta = (stage, status) => {
  const stg = stage || (status === "Completed" ? "Completed" : "Queued");
  const s = (status || "").toLowerCase();
  let dotClass = "dot-neutral";
  if (s === "completed") dotClass = "dot-success";
  else if (s === "processing") dotClass = "dot-pulse-blue";
  else if (s === "pending") dotClass = "dot-warning";
  else if (s === "failed") dotClass = "dot-danger";
  return { stage: stg, dotClass };
};

const formatReportDateTime = (dateStr) => {
  if (!dateStr) return { date: "—", time: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: String(dateStr), time: "" };
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
};

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "superadmin";

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
  // SECTION: HOSPITAL TENANTS (PLATFORM OWNER ONLY)
  // ==========================================
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState("all");
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    hospitalCode: "",
    contactEmail: "",
    contactPhone: "",
    emergencyContact: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    timezone: "Asia/Kolkata",
    plan: "trial",
    maxDoctors: 5,
    maxStaff: 15,
    adminName: "",
    adminEmail: "",
    adminCreationMode: "invite",
    adminPassword: "",
  });
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copiedSetupLink, setCopiedSetupLink] = useState(false);

  const [selectedHospitalForStatus, setSelectedHospitalForStatus] = useState(null);
  const [statusUpdateForm, setStatusUpdateForm] = useState({ status: "active", reason: "" });
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [selectedHospitalForSub, setSelectedHospitalForSub] = useState(null);
  const [subUpdateForm, setSubUpdateForm] = useState({ plan: "trial", maxDoctors: 5, maxStaff: 15 });
  const [subUpdating, setSubUpdating] = useState(false);

  const fetchHospitals = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setHospitalsLoading(true);
      const res = await hospitalTenantAPI.getHospitals({
        search: hospitalSearch || undefined,
        status: hospitalStatusFilter !== "all" ? hospitalStatusFilter : undefined,
      });
      if (res.data?.success) {
        setHospitalsList(res.data.hospitals || []);
      }
    } catch (err) {
      console.warn("Failed to fetch hospitals:", err.message);
      setErrorMessage(err.response?.data?.message || "Failed to load hospital tenants.");
    } finally {
      setHospitalsLoading(false);
    }
  }, [isSuperAdmin, hospitalSearch, hospitalStatusFilter]);

  const handlePlanChange = (newPlan) => {
    let maxDoc = 5;
    let maxStf = 15;
    if (newPlan === "starter") {
      maxDoc = 10;
      maxStf = 30;
    } else if (newPlan === "professional") {
      maxDoc = 25;
      maxStf = 75;
    } else if (newPlan === "enterprise") {
      maxDoc = 100;
      maxStf = 250;
    }
    setOnboardForm((prev) => ({
      ...prev,
      plan: newPlan,
      maxDoctors: maxDoc,
      maxStaff: maxStf,
    }));
  };

  const handleOnboardHospitalSubmit = async (e) => {
    e.preventDefault();
    setOnboardError("");

    if (!onboardForm.name.trim() || !onboardForm.hospitalCode.trim() || !onboardForm.contactEmail.trim()) {
      setOnboardError("Hospital Name, unique code, and contact email are required.");
      return;
    }

    if (onboardForm.adminEmail.trim()) {
      if (user?.email && onboardForm.adminEmail.trim().toLowerCase() === user.email.toLowerCase()) {
        setOnboardError("Platform Owner cannot designate their own account as hospital administrator. Please provide a separate administrator email.");
        return;
      }
    }

    setOnboardingSubmitting(true);
    try {
      const payload = {
        name: onboardForm.name.trim(),
        hospitalCode: onboardForm.hospitalCode.trim().toUpperCase(),
        contactEmail: onboardForm.contactEmail.trim().toLowerCase(),
        contactPhone: onboardForm.contactPhone.trim(),
        emergencyContact: onboardForm.emergencyContact.trim(),
        address: onboardForm.address.trim(),
        city: onboardForm.city.trim(),
        state: onboardForm.state.trim(),
        postalCode: onboardForm.postalCode.trim(),
        timezone: onboardForm.timezone || "Asia/Kolkata",
        subscription: {
          plan: onboardForm.plan,
          status: "active",
          maxDoctors: Number(onboardForm.maxDoctors) || 5,
          maxStaff: Number(onboardForm.maxStaff) || 15,
        },
      };

      if (onboardForm.adminEmail.trim()) {
        payload.initialAdmin = {
          name: onboardForm.adminName.trim() || `${onboardForm.name.trim()} Administrator`,
          email: onboardForm.adminEmail.trim().toLowerCase(),
        };
        if (onboardForm.adminCreationMode === "password" && onboardForm.adminPassword) {
          payload.initialAdmin.password = onboardForm.adminPassword;
        }
      }

      const res = await hospitalTenantAPI.createHospital(payload);
      if (res.data?.success) {
        setShowOnboardModal(false);
        setStatusMessage(res.data.message || `Hospital '${payload.name}' onboarded successfully!`);
        fetchHospitals();

        if (res.data.invitation && res.data.invitation.setupLink) {
          const origin = window.location.origin;
          const fullSetupLink = `${origin}${res.data.invitation.setupLink}`;
          setGeneratedInvite({
            hospitalName: payload.name,
            hospitalCode: payload.hospitalCode,
            adminEmail: payload.initialAdmin ? payload.initialAdmin.email : "",
            adminName: payload.initialAdmin ? payload.initialAdmin.name : "",
            setupLink: fullSetupLink,
            expiresAt: res.data.invitation.expiresAt,
          });
        }

        setOnboardForm({
          name: "",
          hospitalCode: "",
          contactEmail: "",
          contactPhone: "",
          emergencyContact: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
          timezone: "Asia/Kolkata",
          plan: "trial",
          maxDoctors: 5,
          maxStaff: 15,
          adminName: "",
          adminEmail: "",
          adminCreationMode: "invite",
          adminPassword: "",
        });
      }
    } catch (err) {
      console.error("Onboard hospital error:", err);
      setOnboardError(err.response?.data?.message || "Failed to onboard hospital tenant.");
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalForStatus) return;
    setStatusUpdating(true);
    try {
      const res = await hospitalTenantAPI.updateHospitalStatus(
        selectedHospitalForStatus._id,
        statusUpdateForm
      );
      if (res.data?.success) {
        setStatusMessage(res.data.message || "Hospital status updated successfully.");
        setSelectedHospitalForStatus(null);
        fetchHospitals();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update hospital status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpdateSubSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalForSub) return;
    setSubUpdating(true);
    try {
      const res = await hospitalTenantAPI.updateSubscription(
        selectedHospitalForSub._id,
        subUpdateForm
      );
      if (res.data?.success) {
        setStatusMessage(res.data.message || "Hospital subscription updated successfully.");
        setSelectedHospitalForSub(null);
        fetchHospitals();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update hospital subscription.");
    } finally {
      setSubUpdating(false);
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
  const [reportCategoryFilter, setReportCategoryFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");

  const fetchReports = useCallback(async (page = 1, searchOverride, categoryOverride, statusOverride) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const searchVal = searchOverride !== undefined ? searchOverride : reportSearch;
      const catVal = categoryOverride !== undefined ? categoryOverride : reportCategoryFilter;
      const statusVal = statusOverride !== undefined ? statusOverride : reportStatusFilter;
      const res = await adminAPI.getReports({
        search: searchVal,
        category: catVal,
        analysisStatus: statusVal,
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
  }, [reportSearch, reportCategoryFilter, reportStatusFilter]);

  const handleReportSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchReports(1);
  };

  const handleReportCategoryChange = (e) => {
    const newCat = e.target.value;
    setReportCategoryFilter(newCat);
    fetchReports(1, reportSearch, newCat, reportStatusFilter);
  };

  const handleReportStatusChange = (e) => {
    const newStatus = e.target.value;
    setReportStatusFilter(newStatus);
    fetchReports(1, reportSearch, reportCategoryFilter, newStatus);
  };

  const handleResetReportFilters = () => {
    setReportSearch("");
    setReportCategoryFilter("all");
    setReportStatusFilter("all");
    fetchReports(1, "", "all", "all");
  };

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
    else if (activeSection === "hospitals" && isSuperAdmin) fetchHospitals();
    else if (activeSection === "users") fetchUsers(1);
    else if (activeSection === "doctors") fetchDoctors();
    else if (activeSection === "appointments") fetchAppointments(1);
    else if (activeSection === "reports") {
      fetchReports(1);
      fetchOverview();
    }
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
        if (showOnboardModal) setShowOnboardModal(false);
        if (generatedInvite) setGeneratedInvite(null);
        if (selectedHospitalForStatus) setSelectedHospitalForStatus(null);
        if (selectedHospitalForSub) setSelectedHospitalForSub(null);
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
    else if (activeSection === "hospitals" && isSuperAdmin) fetchHospitals();
    else if (activeSection === "users") fetchUsers(userPagination.page);
    else if (activeSection === "doctors") fetchDoctors();
    else if (activeSection === "appointments") fetchAppointments(appointmentPagination.page);
    else if (activeSection === "reports") {
      fetchReports(reportPagination.page);
      fetchOverview();
    }
    else if (activeSection === "security") fetchAuditLogs(auditPagination.page);
    else if (activeSection === "health") fetchSystemHealth();
    else if (activeSection === "support") fetchSupportQueries(supportPagination.page);
  };

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
          {isSuperAdmin && (
            <button
              className={`nav-tab-btn ${activeSection === "hospitals" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("hospitals");
                setSidebarOpen(false);
              }}
            >
              <FiHome className="tab-icon" />
              <span>Hospital Tenants</span>
            </button>
          )}
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
                {activeSection === "hospitals" && "Hospital Tenants & Institutional SaaS Governance"}
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
        {/* SECTION 0: HOSPITAL TENANTS (PLATFORM OWNER ONLY)         */}
        {/* ======================================================== */}
        {activeSection === "hospitals" && isSuperAdmin && (
          <div className="admin-content-section">
            {/* Header / Actions Toolbar */}
            <div className="section-toolbar-card">
              <div className="toolbar-left">
                <div className="search-input-wrap">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by hospital name, code, or city..."
                    value={hospitalSearch}
                    onChange={(e) => setHospitalSearch(e.target.value)}
                    className="admin-search-input"
                  />
                  {hospitalSearch && (
                    <button
                      className="clear-search-btn"
                      onClick={() => setHospitalSearch("")}
                      type="button"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>

                <select
                  className="admin-select-filter"
                  value={hospitalStatusFilter}
                  onChange={(e) => setHospitalStatusFilter(e.target.value)}
                >
                  <option value="all">All Operational Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="deactivated">Deactivated Only</option>
                </select>
              </div>

              <div className="toolbar-right">
                <button
                  className="btn-primary-action"
                  onClick={() => {
                    setOnboardError("");
                    setShowOnboardModal(true);
                  }}
                >
                  <FiPlus size={16} /> Onboard New Hospital
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon-wrap user-kpi">
                  <FiHome size={22} />
                </div>
                <div className="kpi-metric-info">
                  <span className="kpi-label">Hospital Tenants</span>
                  <span className="kpi-number">{hospitalsList.length}</span>
                  <span className="kpi-subtext">Onboarded healthcare institutions</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap verified-kpi">
                  <FiCheckCircle size={22} />
                </div>
                <div className="kpi-metric-info">
                  <span className="kpi-label">Active Tenants</span>
                  <span className="kpi-number">
                    {hospitalsList.filter((h) => h.status === "active").length}
                  </span>
                  <span className="kpi-subtext">Operating normally</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap storage-kpi">
                  <FiAlertTriangle size={22} />
                </div>
                <div className="kpi-metric-info">
                  <span className="kpi-label">Suspended Tenants</span>
                  <span className="kpi-number">
                    {hospitalsList.filter((h) => h.status === "suspended").length}
                  </span>
                  <span className="kpi-subtext">Restricted / Under review</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap appointment-kpi">
                  <FiUsers size={22} />
                </div>
                <div className="kpi-metric-info">
                  <span className="kpi-label">Total Staff Across Tenants</span>
                  <span className="kpi-number">
                    {hospitalsList.reduce((acc, h) => acc + (h.totalStaff || 0), 0)}
                  </span>
                  <span className="kpi-subtext">
                    Doctors, nurses, allied healthcare staff
                  </span>
                </div>
              </div>
            </div>

            {/* Hospitals Table */}
            <div className="admin-data-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <FiHome className="panel-icon" /> Registered Hospital Tenants ({hospitalsList.length})
                </h3>
                <span className="panel-badge">Institutional SaaS Governance</span>
              </div>

              {hospitalsLoading ? (
                <div className="panel-loading-state">
                  <FiRefreshCw className="spin-icon" size={24} />
                  <span>Loading hospital tenants...</span>
                </div>
              ) : hospitalsList.length === 0 ? (
                <div className="panel-empty-state">
                  <FiHome size={40} className="empty-icon" />
                  <h4>No Hospital Tenants Found</h4>
                  <p>
                    {hospitalSearch
                      ? "No hospitals match your search criteria."
                      : "No hospitals onboarded yet. Click '+ Onboard New Hospital' to register the first healthcare institution."}
                  </p>
                  <button
                    className="btn-primary-action"
                    onClick={() => {
                      setOnboardError("");
                      setShowOnboardModal(true);
                    }}
                  >
                    <FiPlus size={16} /> Onboard First Hospital
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Hospital Name & Code</th>
                        <th>Location & Contact</th>
                        <th>Subscription Plan</th>
                        <th>Doctors / Staff Quota</th>
                        <th>Operational Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitalsList.map((hosp) => (
                        <tr key={hosp._id}>
                          <td>
                            <div className="hospital-name-col">
                              <span className="hosp-table-title">{hosp.name}</span>
                              <span className="hosp-table-code">{hosp.hospitalCode}</span>
                            </div>
                          </td>
                          <td>
                            <div className="hosp-contact-col">
                              <span><FiMail size={12} /> {hosp.contactEmail}</span>
                              {hosp.contactPhone && <span><FiPhone size={12} /> {hosp.contactPhone}</span>}
                              {hosp.city && <span><FiMapPin size={12} /> {hosp.city}, {hosp.state}</span>}
                            </div>
                          </td>
                          <td>
                            <span className={`plan-pill plan-${hosp.subscription?.plan || "trial"}`}>
                              {(hosp.subscription?.plan || "trial").toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="quota-col">
                              <span>Doctors: <strong>{hosp.totalDoctors || 0}</strong> / {hosp.subscription?.maxDoctors || 20}</span>
                              <span>Staff: <strong>{hosp.totalStaff || 0}</strong> / {hosp.subscription?.maxStaff || 50}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill status-${hosp.status || "active"}`}>
                              {(hosp.status || "active").toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-buttons">
                              <button
                                className="action-btn-secondary"
                                title="Edit Subscription Plan"
                                onClick={() => {
                                  setSelectedHospitalForSub(hosp);
                                  setSubUpdateForm({
                                    plan: hosp.subscription?.plan || "trial",
                                    maxDoctors: hosp.subscription?.maxDoctors || 20,
                                    maxStaff: hosp.subscription?.maxStaff || 50,
                                  });
                                }}
                              >
                                Edit Plan
                              </button>
                              <button
                                className="action-btn-secondary"
                                title="Change Status"
                                onClick={() => {
                                  setSelectedHospitalForStatus(hosp);
                                  setStatusUpdateForm({
                                    status: hosp.status || "active",
                                    reason: "",
                                  });
                                }}
                              >
                                Status
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
        {activeSection === "reports" && (() => {
          const totalReportsStat = overviewData?.stats?.reports?.total ?? reportPagination.total;
          const completedReportsStat = overviewData?.stats?.reports?.completed ?? reports.filter((r) => r.analysisStatus === "Completed").length;
          const pipelineReportsStat = overviewData?.stats?.reports?.pendingOrProcessing ?? reports.filter((r) => r.analysisStatus === "Processing" || r.analysisStatus === "Pending").length;
          const failedReportsStat = overviewData?.stats?.reports?.failed ?? reports.filter((r) => r.analysisStatus === "Failed").length;

          return (
            <div className="admin-content-section reports-storage-section">
              {/* Summary Metrics Cards */}
              <div className="report-metrics-grid">
                <div className="report-metric-card">
                  <div className="report-metric-icon-wrap metric-icon-total">
                    <FiDatabase size={22} />
                  </div>
                  <div className="report-metric-info">
                    <span className="report-metric-label">Total Reports</span>
                    <span className="report-metric-number">{totalReportsStat}</span>
                    <span className="report-metric-subtext">Managed in cloud storage</span>
                  </div>
                </div>

                <div className="report-metric-card">
                  <div className="report-metric-icon-wrap metric-icon-completed">
                    <FiCheckCircle size={22} />
                  </div>
                  <div className="report-metric-info">
                    <span className="report-metric-label">Analysis Completed</span>
                    <span className="report-metric-number">{completedReportsStat}</span>
                    <span className="report-metric-subtext">OCR & synthesized</span>
                  </div>
                </div>

                <div className="report-metric-card">
                  <div className="report-metric-icon-wrap metric-icon-pipeline">
                    <FiActivity size={22} />
                  </div>
                  <div className="report-metric-info">
                    <span className="report-metric-label">In Pipeline</span>
                    <span className="report-metric-number">{pipelineReportsStat}</span>
                    <span className="report-metric-subtext">Active processing & queued</span>
                  </div>
                </div>

                <div className="report-metric-card">
                  <div className="report-metric-icon-wrap metric-icon-failed">
                    <FiAlertTriangle size={22} />
                  </div>
                  <div className="report-metric-info">
                    <span className="report-metric-label">Action Required</span>
                    <span className="report-metric-number">{failedReportsStat}</span>
                    <span className="report-metric-subtext">Processing failures & retries</span>
                  </div>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="report-toolbar-card">
                <form className="report-search-form" onSubmit={handleReportSearchSubmit}>
                  <div className="report-search-input-wrap">
                    <FiSearch className="report-search-icon" size={17} />
                    <input
                      type="text"
                      placeholder="Search reports by filename, category, or uploader..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="report-search-input"
                      aria-label="Search reports"
                    />
                    {reportSearch && (
                      <button
                        type="button"
                        className="report-search-clear-btn"
                        onClick={() => {
                          setReportSearch("");
                          fetchReports(1, "", reportCategoryFilter, reportStatusFilter);
                        }}
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <FiX size={15} />
                      </button>
                    )}
                  </div>
                </form>

                <div className="report-filter-controls">
                  <div className="report-dropdown-wrap">
                    <select
                      value={reportCategoryFilter}
                      onChange={handleReportCategoryChange}
                      className="report-filter-select"
                      aria-label="Filter by Report Category"
                    >
                      <option value="all">All Categories</option>
                      {REPORT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="report-dropdown-wrap">
                    <select
                      value={reportStatusFilter}
                      onChange={handleReportStatusChange}
                      className="report-filter-select"
                      aria-label="Filter by Analysis Status"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Completed">Completed</option>
                      <option value="Processing">Processing</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="report-search-btn"
                    onClick={() => fetchReports(1)}
                    disabled={loading}
                    aria-label="Apply report search"
                  >
                    <FiSearch size={15} /> Search
                  </button>

                  {(reportSearch || reportCategoryFilter !== "all" || reportStatusFilter !== "all") && (
                    <button
                      type="button"
                      className="report-reset-btn"
                      onClick={handleResetReportFilters}
                      title="Reset all filters"
                      aria-label="Reset all filters"
                    >
                      <FiRotateCcw size={14} /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Table Card */}
              <div className="reports-table-card">
                <div className="reports-table-scroll">
                  <table className="admin-reports-table">
                    <thead>
                      <tr>
                        <th className="th-file">Report File</th>
                        <th className="th-patient">Patient Owner</th>
                        <th className="th-uploader">Uploaded By</th>
                        <th className="th-category">Category & Size</th>
                        <th className="th-stage">Pipeline Stage</th>
                        <th className="th-status">Status</th>
                        <th className="th-date">Uploaded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="report-loading-row">
                            <div className="report-loading-container">
                              <FiRefreshCw className="spin" size={24} />
                              <span>Loading report storage telemetry...</span>
                            </div>
                          </td>
                        </tr>
                      ) : reports.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="report-empty-row">
                            <div className="report-empty-container">
                              <FiFileText className="empty-report-icon" size={38} />
                              <h4 className="empty-report-title">No Medical Reports Found</h4>
                              <p className="empty-report-desc">
                                {reportSearch || reportCategoryFilter !== "all" || reportStatusFilter !== "all"
                                  ? "No reports match your active search or filter criteria. Try resetting your filters."
                                  : "No medical documents have been uploaded to storage yet."}
                              </p>
                              {(reportSearch || reportCategoryFilter !== "all" || reportStatusFilter !== "all") && (
                                <button
                                  type="button"
                                  className="empty-reset-filter-btn"
                                  onClick={handleResetReportFilters}
                                >
                                  <FiRotateCcw size={14} /> Reset Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        reports.map((r) => {
                          const fileExt = getFileTypeMeta(r.originalName || r.fileName, r.fileType);
                          const statusMeta = getReportStatusMeta(r.analysisStatus);
                          const stageMeta = getPipelineStageMeta(r.processingStage, r.analysisStatus);
                          const dateMeta = formatReportDateTime(r.uploadedAt || r.createdAt);
                          const patientName = r.userId?.name || "Patient";
                          const patientEmail = r.userId?.email || "Unknown";
                          const uploaderName =
                            r.uploaderName ||
                            r.uploadedBy?.name ||
                            (r.uploadedByRole === "doctor" ? "Doctor" : "Self");
                          const uploaderRole = r.uploadedByRole || r.uploadedBy?.role || "patient";

                          return (
                            <tr key={r._id} className="report-table-row">
                              <td>
                                <div className="report-file-meta">
                                  <div className="report-file-header">
                                    <FiFileText className="report-file-icon" size={16} />
                                    <span
                                      className="report-file-name"
                                      title={r.originalName || r.fileName}
                                    >
                                      {r.originalName || r.fileName || "Medical-Document"}
                                    </span>
                                  </div>
                                  <div className="report-file-sub">
                                    <span className="file-ext-badge">{fileExt}</span>
                                    {r._id && (
                                      <span className="file-id-sub" title={`Report ID: ${r._id}`}>
                                        ID: {r._id.slice(0, 6)}...{r._id.slice(-4)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="patient-owner-cell">
                                  <span className="patient-name-bold">{patientName}</span>
                                  <span className="patient-email-sub" title={patientEmail}>
                                    {patientEmail}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="uploader-cell">
                                  <span className="uploader-name-bold">{uploaderName}</span>
                                  <span className={`uploader-role-badge ${getUploaderRoleBadgeClass(uploaderRole)}`}>
                                    {uploaderRole}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="category-size-cell">
                                  <span className={`report-category-badge ${getCategoryBadgeClass(r.category)}`}>
                                    {r.category || "Medical Report"}
                                  </span>
                                  <span className="report-file-size">
                                    {formatFileSize(r.fileSize)}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="pipeline-stage-cell">
                                  <span className={`stage-status-dot ${stageMeta.dotClass}`}></span>
                                  <span className="stage-status-text">{stageMeta.stage}</span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`report-status-badge ${statusMeta.className}`}
                                  title={
                                    r.analysisStatus === "Failed" && r.errorMessage
                                      ? r.errorMessage
                                      : `Status: ${statusMeta.label}`
                                  }
                                >
                                  {statusMeta.label}
                                </span>
                              </td>
                              <td>
                                <div className="uploaded-date-cell">
                                  <span className="upload-date-primary">{dateMeta.date}</span>
                                  <span className="upload-time-secondary">{dateMeta.time}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="report-pagination-bar">
                  <span className="pagination-info">
                    Showing page <strong>{reportPagination.page}</strong> of <strong>{reportPagination.pages || 1}</strong> ({reportPagination.total} total reports)
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
                      disabled={reportPagination.page >= (reportPagination.pages || 1) || loading}
                      onClick={() => fetchReports(reportPagination.page + 1)}
                    >
                      Next <FiChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
      
        {/* ======================================================== */}
        {/* MODAL: ONBOARD NEW HOSPITAL                              */}
        {/* ======================================================== */}
        {showOnboardModal && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card onboard-hospital-modal">
              <div className="modal-header">
                <div>
                  <h3>Onboard New Hospital Tenant</h3>
                  <p className="modal-subheading">
                    Register institution details, configure subscription quotas, and provision/invite the Hospital Admin.
                  </p>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowOnboardModal(false)}
                  disabled={onboardingSubmitting}
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleOnboardHospitalSubmit} className="onboard-modal-form">
                <div className="modal-body-content">
                  {onboardError && (
                    <div className="modal-error-banner" role="alert">
                      <FiAlertCircle /> <span>{onboardError}</span>
                    </div>
                  )}

                  {/* Section 1: Institutional Details */}
                  <div className="form-section-title">1. Hospital Organization & Identity</div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Hospital Legal Name <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="e.g. Apollo City Multispecialty"
                        required
                        value={onboardForm.name}
                        onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Unique Hospital Code <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="modal-input code-input"
                        placeholder="e.g. APOLLO-01"
                        required
                        value={onboardForm.hospitalCode}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            hospitalCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                          })
                        }
                      />
                      <span className="field-hint">Alphanumeric, dashes or underscores (e.g. CITY-001)</span>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Primary Contact Email <span className="req-star">*</span>
                      </label>
                      <input
                        type="email"
                        className="modal-input"
                        placeholder="contact@hospital.com"
                        required
                        value={onboardForm.contactEmail}
                        onChange={(e) => setOnboardForm({ ...onboardForm, contactEmail: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact Phone</label>
                      <input
                        type="tel"
                        className="modal-input"
                        placeholder="+91 80 2345 6789"
                        value={onboardForm.contactPhone}
                        onChange={(e) => setOnboardForm({ ...onboardForm, contactPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="Bengaluru"
                        value={onboardForm.city}
                        onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="Karnataka"
                        value={onboardForm.state}
                        onChange={(e) => setOnboardForm({ ...onboardForm, state: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Timezone</label>
                      <input
                        type="text"
                        className="modal-input"
                        value={onboardForm.timezone}
                        onChange={(e) => setOnboardForm({ ...onboardForm, timezone: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Section 2: Subscription & Limits */}
                  <div className="form-section-title">2. Subscription Plan & Institutional Quotas</div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Subscription Plan</label>
                      <select
                        className="modal-select"
                        value={onboardForm.plan}
                        onChange={(e) => handlePlanChange(e.target.value)}
                      >
                        <option value="trial">Trial (Evaluation Pilot)</option>
                        <option value="starter">Starter (Polyclinic / Nursing Home)</option>
                        <option value="professional">Professional (Multispecialty Hospital)</option>
                        <option value="enterprise">Enterprise (Hospital Network)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Max Doctors</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        className="modal-input"
                        value={onboardForm.maxDoctors}
                        onChange={(e) => setOnboardForm({ ...onboardForm, maxDoctors: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Max Staff Members</label>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        className="modal-input"
                        value={onboardForm.maxStaff}
                        onChange={(e) => setOnboardForm({ ...onboardForm, maxStaff: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Section 3: Initial Hospital Admin */}
                  <div className="form-section-title">3. Primary Hospital Administrator</div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Administrator Full Name</label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="e.g. Dr. Rajeshwar Rao"
                        value={onboardForm.adminName}
                        onChange={(e) => setOnboardForm({ ...onboardForm, adminName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Administrator Email <span className="req-star">*</span>
                      </label>
                      <input
                        type="email"
                        className="modal-input"
                        placeholder="admin@apollocity.test"
                        required
                        value={onboardForm.adminEmail}
                        onChange={(e) => setOnboardForm({ ...onboardForm, adminEmail: e.target.value })}
                      />
                      <span className="field-hint">Must be distinct from the Platform Owner account.</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Provisioning Mode</label>
                    <div className="radio-options-row">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="adminCreationMode"
                          value="invite"
                          checked={onboardForm.adminCreationMode === "invite"}
                          onChange={() => setOnboardForm({ ...onboardForm, adminCreationMode: "invite" })}
                        />
                        <span>Generate Single-Use Invitation Link (Recommended)</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="adminCreationMode"
                          value="password"
                          checked={onboardForm.adminCreationMode === "password"}
                          onChange={() => setOnboardForm({ ...onboardForm, adminCreationMode: "password" })}
                        />
                        <span>Direct Password Provisioning</span>
                      </label>
                    </div>
                  </div>

                  {onboardForm.adminCreationMode === "password" && (
                    <div className="form-group">
                      <label className="form-label">
                        Initial Master Password <span className="req-star">*</span>
                      </label>
                      <input
                        type="password"
                        className="modal-input"
                        placeholder="Minimum 6 characters"
                        required
                        value={onboardForm.adminPassword}
                        onChange={(e) => setOnboardForm({ ...onboardForm, adminPassword: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowOnboardModal(false)}
                    disabled={onboardingSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-action-btn green-btn"
                    disabled={onboardingSubmitting}
                  >
                    {onboardingSubmitting ? "Onboarding Institution..." : "Confirm & Onboard Hospital"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: INVITATION LINK READY FOR COPYING                 */}
        {/* ======================================================== */}
        {generatedInvite && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card invite-result-modal">
              <div className="modal-header">
                <div className="invite-success-badge">
                  <FiCheckCircle size={28} color="#10b981" />
                  <div>
                    <h3>Hospital Onboarded Successfully!</h3>
                    <p className="modal-subheading">
                      {generatedInvite.hospitalName} ({generatedInvite.hospitalCode})
                    </p>
                  </div>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setGeneratedInvite(null)}
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="modal-body-content">
                <div className="invite-info-box">
                  <p>
                    A single-use administrator setup link has been created for:
                  </p>
                  <p className="invitee-email">
                    <strong>{generatedInvite.adminName}</strong> ({generatedInvite.adminEmail})
                  </p>
                </div>

                <div className="setup-link-box">
                  <label className="setup-link-label">Secure Activation URL:</label>
                  <div className="setup-link-input-wrap">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.setupLink}
                      className="setup-link-input"
                    />
                    <button
                      type="button"
                      className="btn-copy-setup"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInvite.setupLink);
                        setCopiedSetupLink(true);
                        setTimeout(() => setCopiedSetupLink(false), 3000);
                      }}
                    >
                      <FiCopy size={16} /> {copiedSetupLink ? "Copied!" : "Copy URL"}
                    </button>
                  </div>
                </div>

                <div className="invite-security-notice">
                  <FiShield size={16} color="#0d9488" />
                  <span>
                    Share this URL with the Hospital Administrator. They will use this link to establish their password and manage their hospital staff. Link expires in 7 days.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="primary-action-btn"
                  onClick={() => setGeneratedInvite(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: UPDATE HOSPITAL STATUS                            */}
        {/* ======================================================== */}
        {selectedHospitalForStatus && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card">
              <div className="modal-header">
                <h3>Manage Operational Status: {selectedHospitalForStatus.name}</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedHospitalForStatus(null)}
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateStatusSubmit}>
                <div className="modal-body-content">
                  <div className="form-group">
                    <label className="form-label">Hospital Tenant Status</label>
                    <select
                      className="modal-select"
                      value={statusUpdateForm.status}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })}
                    >
                      <option value="active">Active (Full Clinical Operations)</option>
                      <option value="suspended">Suspended (Access Temporarily Blocked)</option>
                      <option value="deactivated">Deactivated (Terminated / Inactive)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Administrative Reason</label>
                    <textarea
                      rows="3"
                      className="modal-textarea"
                      placeholder="Document reason for status change (logged to immutable audit trail)..."
                      value={statusUpdateForm.reason}
                      onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, reason: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setSelectedHospitalForStatus(null)}
                    disabled={statusUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-action-btn"
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? "Updating..." : "Save Status"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: UPDATE HOSPITAL SUBSCRIPTION                      */}
        {/* ======================================================== */}
        {selectedHospitalForSub && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal-card">
              <div className="modal-header">
                <h3>Edit Subscription: {selectedHospitalForSub.name}</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedHospitalForSub(null)}
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateSubSubmit}>
                <div className="modal-body-content">
                  <div className="form-group">
                    <label className="form-label">Subscription Tier</label>
                    <select
                      className="modal-select"
                      value={subUpdateForm.plan}
                      onChange={(e) => {
                        const newPlan = e.target.value;
                        let maxDoc = 5;
                        let maxStf = 15;
                        if (newPlan === "starter") { maxDoc = 10; maxStf = 30; }
                        else if (newPlan === "professional") { maxDoc = 25; maxStf = 75; }
                        else if (newPlan === "enterprise") { maxDoc = 100; maxStf = 250; }
                        setSubUpdateForm({
                          plan: newPlan,
                          maxDoctors: maxDoc,
                          maxStaff: maxStf,
                        });
                      }}
                    >
                      <option value="trial">Trial</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Max Doctors Quota</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        className="modal-input"
                        value={subUpdateForm.maxDoctors}
                        onChange={(e) => setSubUpdateForm({ ...subUpdateForm, maxDoctors: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Max Staff Quota</label>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        className="modal-input"
                        value={subUpdateForm.maxStaff}
                        onChange={(e) => setSubUpdateForm({ ...subUpdateForm, maxStaff: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setSelectedHospitalForSub(null)}
                    disabled={subUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-action-btn"
                    disabled={subUpdating}
                  >
                    {subUpdating ? "Updating..." : "Update Subscription"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
</main>
    </div>
  );
};

export default AdminDashboard;
