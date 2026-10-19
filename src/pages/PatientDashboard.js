import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { translateCategory, translateStatus } from "../i18n";
import "./PatientDashboard.css";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { reportsAPI, appointmentsAPI, insuranceAPI, authAPI } from "../services/api";
import { getSocket } from "../services/socket";
import {
  sortAppointmentsDesc,
  partitionAppointments,
} from "../utils/appointmentSorting";
import ConsultationJoinButton from "../components/ConsultationJoinButton";
import { useConsultationTimer } from "../utils/consultationWindow";
import UploadProgressCard from "../components/UploadProgressCard";
import {
  FiFileText,
  FiUploadCloud,
  FiActivity,
  FiCalendar,
  FiShield,
  FiSearch,
  FiEye,
  FiTrash2,
  FiRefreshCw,
  FiCpu,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiArrowRight,
  FiPlus,
  FiUser,
  FiAlertTriangle,
  FiUserCheck,
  FiMapPin,
  FiPhone,
  FiClock,
} from "react-icons/fi";

const PatientDashboard = () => {
  const { user, loading, updateUserProfile } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("Medical Report");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("Preparing your report");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [completedReport, setCompletedReport] = useState(null);
  const pollTimerRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientApptTab, setPatientApptTab] = useState("all"); // 'all' | 'upcoming' | 'past'
  const currentTime = useConsultationTimer(15000);

  // Partition patient appointments into upcoming (nearest first) and past (most recent first)
  const { upcoming: upcomingAppointments, past: pastAppointments } = useMemo(() => {
    return partitionAppointments(patientAppointments, currentTime);
  }, [patientAppointments, currentTime]);

  const [insuranceCount, setInsuranceCount] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Profile completion state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (user) {
      setProfileFormData({
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        postalCode: user.postalCode || "",
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    const cleanPhone = (profileFormData.phoneNumber || "").trim().replace(/[\s-]/g, "");
    if (!cleanPhone || !/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      setProfileError("Please enter a valid 10-15 digit mobile phone number.");
      return;
    }
    if (!profileFormData.address || profileFormData.address.trim().length < 5) {
      setProfileError("Address must include street/locality details (minimum 5 characters).");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({
        phoneNumber: cleanPhone,
        address: profileFormData.address.trim(),
        city: (profileFormData.city || "").trim(),
        state: (profileFormData.state || "").trim(),
        postalCode: (profileFormData.postalCode || "").trim(),
      });
      if (res.data?.success && res.data.user) {
        if (updateUserProfile) {
          updateUserProfile(res.data.user);
        }
        setIsProfileModalOpen(false);
        setMessage("Contact details updated successfully.");
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Clear polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await reportsAPI.getReports({
        search: searchTerm || undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
      });
      setReports(res.data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setReports([]);
    }
  }, [searchTerm, selectedCategory]);

  const fetchOverviewCounts = useCallback(async () => {
    try {
      const [appRes, insRes] = await Promise.allSettled([
        appointmentsAPI.getAppointments(),
        insuranceAPI.getInsuranceList(),
      ]);

      if (appRes.status === "fulfilled") {
        const appts = appRes.value.data?.appointments || [];
        const sorted = sortAppointmentsDesc(appts);
        setAppointmentsCount(sorted.length);
        setPatientAppointments(sorted);
      }
      if (insRes.status === "fulfilled") {
        setInsuranceCount(insRes.value.data?.policies?.length || 0);
      }
    } catch (err) {
      console.error("Overview error:", err);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
      return;
    }

    if (user) {
      if (user.role === "doctor") {
        navigate("/doctor-dashboard", { replace: true });
        return;
      }
      fetchReports();
      fetchOverviewCounts();
    }
  }, [user, loading, navigate, fetchReports, fetchOverviewCounts]);

  // Real-time synchronization for appointments
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      fetchOverviewCounts();
    };

    socket.on("appointment:update", handleRealtimeUpdate);

    return () => {
      socket.off("appointment:update", handleRealtimeUpdate);
    };
  }, [fetchOverviewCounts]);

  // Periodic polling (30s) to keep appointments and statuses synchronized
  useEffect(() => {
    if (!user) return;
    const pollTimer = setInterval(() => {
      fetchOverviewCounts();
    }, 30000);
    return () => clearInterval(pollTimer);
  }, [user, fetchOverviewCounts]);

  useEffect(() => {
    if (isUploadModalOpen || deleteConfirmId) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setIsUploadModalOpen(false);
          setDeleteConfirmId(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isUploadModalOpen, deleteConfirmId]);

  const handleFileUpload = async (e) => {
    if (e) e.preventDefault();
    if (files.length === 0 || isUploading) {
      return;
    }

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });
    formData.append("category", category);
    formData.append("notes", notes);

    setIsUploading(true);
    setUploadStage("Preparing your report");
    setUploadProgress(0);
    setUploadError(null);
    setCompletedReport(null);
    setMessage("");

    // Stage 1 -> Stage 2: Uploading
    setTimeout(() => {
      setUploadStage("Uploading your medical report");
    }, 250);

    try {
      const res = await reportsAPI.uploadReports(formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.min(
            99,
            Math.round((progressEvent.loaded * 100) / progressEvent.total)
          );
          setUploadProgress(percent);
        }
      });

      const reportData = res.data?.reports?.[0];
      const jobId = res.data?.jobId || reportData?._id;
      setActiveJobId(jobId);

      // Check if backend already finished (e.g. sync mode)
      if (reportData?.analysisStatus === "Completed") {
        setUploadProgress(100);
        setUploadStage("Analysis complete");
        setCompletedReport(reportData);
        setIsUploading(false);
        fetchReports();
        return;
      }

      // Transition to Stage 3 or server reported stage
      setUploadStage(res.data?.stage || "Extracting text from your document");

      if (!jobId) {
        setIsUploading(false);
        setUploadStage("Analysis complete");
        fetchReports();
        return;
      }

      // Start status polling
      let pollCount = 0;
      const maxPolls = 80;

      pollTimerRef.current = setInterval(async () => {
        pollCount += 1;
        try {
          const statusRes = await reportsAPI.getReportStatus(jobId);
          const { analysisStatus, processingStage, errorMessage, report, aiAnalysis } =
            statusRes.data || {};

          if (processingStage) {
            setUploadStage(processingStage);
          }

          if (analysisStatus === "Completed") {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setUploadProgress(100);
            setUploadStage("Analysis complete");
            setCompletedReport(report || { _id: jobId, aiAnalysis });
            setIsUploading(false);
            fetchReports();
          } else if (analysisStatus === "Failed") {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setUploadError(
              errorMessage || "Document processing failed. Please retry."
            );
            setIsUploading(false);
          } else if (pollCount >= maxPolls) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setUploadStage("Analysis complete");
            setIsUploading(false);
            fetchReports();
          }
        } catch (pollErr) {
          console.warn("Status poll error:", pollErr.message);
          if (pollCount >= maxPolls) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setIsUploading(false);
          }
        }
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      const errMsg =
        error.response?.data?.message ||
        "Upload failed. Ensure the server and Azure storage are online.";
      setUploadError(errMsg);
      setIsUploading(false);
    }
  };

  const handleRetryUpload = () => {
    setUploadError(null);
    if (activeJobId) {
      setUploadStage("AI is analyzing your report");
      setIsUploading(true);
      reportsAPI
        .retryReport(activeJobId)
        .then(() => {
          let pollCount = 0;
          pollTimerRef.current = setInterval(async () => {
            pollCount += 1;
            try {
              const statusRes = await reportsAPI.getReportStatus(activeJobId);
              const { analysisStatus, processingStage, errorMessage, report, aiAnalysis } =
                statusRes.data || {};
              if (processingStage) setUploadStage(processingStage);
              if (analysisStatus === "Completed") {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
                setUploadProgress(100);
                setUploadStage("Analysis complete");
                setCompletedReport(report || { _id: activeJobId, aiAnalysis });
                setIsUploading(false);
                fetchReports();
              } else if (analysisStatus === "Failed") {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
                setUploadError(errorMessage || "Retry failed.");
                setIsUploading(false);
              }
            } catch (err) {
              if (pollCount > 60) clearInterval(pollTimerRef.current);
            }
          }, 1500);
        })
        .catch(() => {
          handleFileUpload();
        });
    } else {
      handleFileUpload();
    }
  };

  const handleDismissUploadModal = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsUploadModalOpen(false);
    setIsUploading(false);
    setUploadStage("Preparing your report");
    setUploadProgress(0);
    setUploadError(null);
    setActiveJobId(null);
    setCompletedReport(null);
    setFiles([]);
    setNotes("");
    fetchReports();
  };

  const handleViewReport = async (reportId) => {
    try {
      const res = await reportsAPI.viewReport(reportId);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        setMessage("Unable to generate secure report viewing URL.");
      }
    } catch (error) {
      console.error("View report error:", error);
      setMessage("Could not access report. Please try again.");
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      await reportsAPI.deleteReport(reportId);
      setDeleteConfirmId(null);
      setMessage("Report deleted successfully.");
      fetchReports();
    } catch (error) {
      console.error("Delete report error:", error);
      setMessage("Failed to delete report.");
    }
  };

  const getFileBadge = (name) => {
    if (!name) return <FiFileText className="file-type-icon generic" />;
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return <span className="file-pill pdf">PDF</span>;
    if (["jpg", "jpeg", "png"].includes(ext)) return <span className="file-pill img">IMG</span>;
    return <span className="file-pill doc">DOC</span>;
  };

  const categoriesList = [
    "All",
    "Blood Report",
    "Prescription",
    "Radiology Report",
    "MRI Report",
    "Discharge Summary",
    "Lab Report",
    "General Medical",
  ];

  if (loading) {
    return (
      <div className="patient-dashboard-container">
        <div className="loading-state-wrapper">
          <FiRefreshCw className="spinner-icon" />
          <p>Decrypting and loading health records vault...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const completedAiCount = reports.filter(
    (r) => r.analysisStatus === "Completed"
  ).length;

  const renderPatientApptCard = (app) => {
    const docObj = typeof app.doctorId === "object" && app.doctorId !== null ? app.doctorId : null;
    const docName = docObj?.name
      ? (docObj.name.startsWith("Dr.") ? docObj.name : `Dr. ${docObj.name}`)
      : (app.doctorName?.startsWith("Dr.") ? app.doctorName : `Dr. ${app.doctorName || "Doctor"}`);
    const docDept = docObj?.specialization || app.department || "General Medicine";

    return (
      <div
        key={app._id}
        className={`patient-appt-card ${app.status?.toLowerCase().replace(/\s+/g, "-") || "scheduled"}`}
      >
        <div className="appt-card-top">
          <span className="appt-dept">{docDept}</span>
          <span className={`status-pill ${app.status?.toLowerCase().replace(/\s+/g, "-") || "scheduled"}`}>
            {app.status || "Scheduled"}
          </span>
        </div>
        <h4 className="appt-doctor-name">{docName}</h4>
        <div className="appt-card-meta">
          <span>
            <FiCalendar size={13} />{" "}
            {new Date(app.appointmentDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span>
            <FiClock size={13} /> {app.timeSlot}
          </span>
        </div>
        <div className="appt-card-footer">
          <span className="appt-mode">{app.consultationType || "In-Person"}</span>
          <ConsultationJoinButton
            appointment={app}
            currentTime={currentTime}
            className="btn-patient-join-video"
            customEnabledText="Join Video Consultation"
            iconSize={13}
          />
          {(app.reason || app.notes) && (
            <span className="appt-reason" title={app.reason || app.notes}>
              <strong>Reason:</strong> {app.reason || app.notes}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="patient-dashboard-container">
      {/* Dashboard Executive Header */}
      <header className="dashboard-hero-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-user-greeting">
            <span className="welcome-tag">{t("aiAnalysis.privateAzureVault", "Encrypted Patient Vault")}</span>
            <h1>{t("dashboard.welcome", "Welcome back")}, {user.name}</h1>
            <p className="dashboard-header-desc">
              {t("dashboard.subtitle", "Manage your encrypted clinical documents, appointments, and AI biomarker summaries")}
            </p>
          </div>

          <div className="patient-meta-actions">
            <div className="patient-id-card">
              <span className="patient-id-label">Permanent Patient ID</span>
              <span className="patient-id-value">{user.id || user._id}</span>
            </div>
            <button
              className="btn-open-upload"
              onClick={() => setIsUploadModalOpen(true)}
              type="button"
            >
              <FiPlus /> {t("dashboard.uploadRecordBtn", "Upload Medical Record")}
            </button>
            <button
              className="btn-open-upload btn-timeline-nav"
              style={{
                background: "#0d9488",
                borderColor: "#0d9488",
                boxShadow: "0 2px 4px rgba(13, 148, 136, 0.2)",
              }}
              onClick={() => navigate("/timeline")}
              type="button"
            >
              <FiActivity /> {t("nav.healthTimeline", "Health Timeline")}
            </button>
            <button
              className="btn-open-upload btn-meds-nav"
              style={{
                background: "#4f46e5",
                borderColor: "#4f46e5",
                boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
              }}
              onClick={() => navigate("/medications")}
              type="button"
            >
              <FiClock /> {t("nav.medications", "Medication Reminders")}
            </button>
          </div>
        </div>
      </header>

      {/* Mandatory Profile Incomplete Alert Banner */}
      {(!user.phoneNumber || !user.address) && (
        <div className="profile-incomplete-banner" role="alert">
          <div className="banner-left">
            <FiAlertTriangle className="banner-icon" />
            <div className="banner-text">
              <h4>{t("dashboard.completeProfileTitle", "Complete Your Patient Profile")}</h4>
              <p>{t("dashboard.completeProfileDesc", "Add your contact phone number and residential address for accurate appointment scheduling and emergency medical records linking.")}</p>
            </div>
          </div>
          <button
            className="btn-complete-profile"
            onClick={() => setIsProfileModalOpen(true)}
            type="button"
          >
            <FiUserCheck /> {t("dashboard.completeProfileBtn", "Update Profile Details")}
          </button>
        </div>
      )}

      {/* Metrics & Overview Cards */}
      <section className="dashboard-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap blue">
            <FiFileText size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-number">{reports.length}</span>
            <span className="metric-title">{t("dashboard.totalRecords", "Medical Reports")}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap teal">
            <FiCpu size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-number">{completedAiCount}</span>
            <span className="metric-title">{t("dashboard.tableAIStatus", "AI Analyzed")}</span>
          </div>
        </div>

        <div
          className="metric-card clickable"
          onClick={() => navigate("/appointment")}
          title="View and schedule doctor consultations"
          style={{ cursor: "pointer" }}
        >
          <div className="metric-icon-wrap purple">
            <FiCalendar size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-number">{appointmentsCount}</span>
            <span className="metric-title">{t("dashboard.appointments", "Appointments")}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap green">
            <FiShield size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-number">{insuranceCount}</span>
            <span className="metric-title">{t("dashboard.insurancePolicies", "Insurance Plans")}</span>
          </div>
        </div>
      </section>

      {/* Feedback Banner */}
      {message && (
        <div className="dashboard-feedback-banner">
          <FiAlertCircle />
          <span>{message}</span>
          <button
            className="btn-dismiss-msg"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Main Records Section */}
      <section className="dashboard-records-section">
        {/* Controls Toolbar: Search & Category Chips */}
        <div className="records-toolbar">
          <div className="search-box-wrap">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder={t("dashboard.searchPlaceholder", "Search records by document name, category, or notes...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="records-search-input"
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm("")}
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          <div className="category-filter-chips">
            {categoriesList.map((cat) => (
              <button
                key={translateCategory(cat)}
                className={`filter-chip ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Table / Card Container */}
        <div className="reports-table-container">
          {reports.length === 0 ? (
            <div className="empty-vault-state">
              <div className="empty-icon-wrap">
                <FiUploadCloud size={40} />
              </div>
              <h3>No Medical Records Found</h3>
              <p>
                {searchTerm || selectedCategory !== "All"
                  ? "No documents match your current filter. Try resetting search parameters."
                  : "Upload your laboratory results, prescriptions, or imaging reports to get started."}
              </p>
              <button
                className="btn-empty-upload"
                onClick={() => setIsUploadModalOpen(true)}
                type="button"
              >
                <FiPlus /> Upload Your First Report
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="vault-table">
                <thead>
                  <tr>
                    <th>{t("timeline.filterType", "Type")}</th>
                    <th>{t("dashboard.tableName", "Document Name")}</th>
                    <th>{t("dashboard.tableCategory", "Category")}</th>
                    <th>{t("dashboard.tableDate", "Uploaded Date")}</th>
                    <th>{t("dashboard.tableAIStatus", "OCR / AI Status")}</th>
                    <th>{t("dashboard.tableActions", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep._id} className="vault-row">
                      <td className="type-col">
                        {getFileBadge(rep.originalName || rep.fileName)}
                      </td>
                      <td className="doc-name-col">
                        <div className="doc-primary-name">
                          {rep.originalName || rep.fileName}
                        </div>
                        {rep.uploadedByRole === "doctor" ? (
                          <div
                            className="uploader-badge clinician"
                            title={`Uploaded by Dr. ${rep.uploaderName || "Physician"}`}
                          >
                            <FiShield size={11} /> Uploaded by Dr. {rep.uploaderName ? rep.uploaderName.replace(/^Dr\.?\s*/i, "") : "Clinician"}
                          </div>
                        ) : (
                          <div className="uploader-badge patient">
                            <FiUser size={11} /> Patient Upload
                          </div>
                        )}
                        {rep.notes && (
                          <div className="doc-notes-preview">{rep.notes}</div>
                        )}
                      </td>
                      <td>
                        <span className="category-badge">{translateCategory(rep.category)}</span>
                      </td>
                      <td className="timestamp-col">
                        {new Date(
                          rep.uploadedAt || rep.createdAt
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            rep.analysisStatus?.toLowerCase() || "pending"
                          }`}
                        >
                          {rep.analysisStatus === "Completed" && (
                            <FiCheckCircle size={12} />
                          )}
                          {rep.analysisStatus || "Pending"}
                        </span>
                      </td>
                      <td className="actions-col">
                        <button
                          className="action-btn view"
                          onClick={() => handleViewReport(rep._id)}
                          title="Open Secure SAS Preview"
                          type="button"
                        >
                          <FiEye size={15} /> View
                        </button>
                        <Link
                          to="/ai-analysis"
                          className="action-btn ai"
                          title="Review AI Biomarkers & Insights"
                        >
                          <FiCpu size={15} /> Insights
                        </Link>
                        <button
                          className="action-btn delete"
                          onClick={() => setDeleteConfirmId(rep._id)}
                          title="Delete Document"
                          type="button"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Booked Appointments Section */}
      <section className="patient-appointments-section">
        <div className="section-header-row">
          <div>
            <h3>{t("dashboard.consultationsTitle", "Consultations & Doctor Visits")} ({patientAppointments.length})</h3>
            <p>Upcoming and completed clinical appointments with verified hospital specialists</p>
          </div>

          <div className="consultations-header-right">
            {patientAppointments.length > 0 && (
              <div className="appointment-view-tabs" role="tablist" aria-label="Appointment Filters">
                <button
                  type="button"
                  role="tab"
                  aria-selected={patientApptTab === "all"}
                  className={`view-tab-btn ${patientApptTab === "all" ? "active" : ""}`}
                  onClick={() => setPatientApptTab("all")}
                >
                  {t("common.all", "All")} <span className="tab-count-pill">{patientAppointments.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={patientApptTab === "upcoming"}
                  className={`view-tab-btn ${patientApptTab === "upcoming" ? "active" : ""}`}
                  onClick={() => setPatientApptTab("upcoming")}
                >
                  {t("dashboard.upcomingTab", "Upcoming")} <span className="tab-count-pill">{upcomingAppointments.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={patientApptTab === "past"}
                  className={`view-tab-btn ${patientApptTab === "past" ? "active" : ""}`}
                  onClick={() => setPatientApptTab("past")}
                >
                  {t("dashboard.pastTab", "Past")} <span className="tab-count-pill">{pastAppointments.length}</span>
                </button>
              </div>
            )}
            <Link to="/appointment" className="btn-manage-appts">
              <FiPlus size={14} /> Schedule / Manage
            </Link>
          </div>
        </div>

        {patientAppointments.length === 0 ? (
          <div className="empty-appts-card">
            <FiCalendar size={32} />
            <h4>No Appointments Scheduled</h4>
            <p>You have not booked any consultations yet. Need clinical advice from a specialist?</p>
            <Link to="/appointment" className="btn-book-first-appt">
              <FiPlus /> Book Consultation Now
            </Link>
          </div>
        ) : (
          <div className="patient-appts-content">
            {patientApptTab === "upcoming" && (
              upcomingAppointments.length === 0 ? (
                <div className="empty-appts-card sub-empty">
                  <FiClock size={28} />
                  <h4>No Upcoming Consultations</h4>
                  <p>You have no active upcoming consultations scheduled.</p>
                </div>
              ) : (
                <div className="patient-appts-grid">
                  {upcomingAppointments.map((app) => renderPatientApptCard(app))}
                </div>
              )
            )}

            {patientApptTab === "past" && (
              pastAppointments.length === 0 ? (
                <div className="empty-appts-card sub-empty">
                  <FiCheckCircle size={28} />
                  <h4>No Past Consultations</h4>
                  <p>You have no past or concluded consultations on record.</p>
                </div>
              ) : (
                <div className="patient-appts-grid">
                  {pastAppointments.map((app) => renderPatientApptCard(app))}
                </div>
              )
            )}

            {patientApptTab === "all" && (
              <>
                {upcomingAppointments.length > 0 && (
                  <div className="appointment-subgroup upcoming-subgroup">
                    <div className="subgroup-header">
                      <div className="subgroup-title-row">
                        <span className="subgroup-badge upcoming">Upcoming</span>
                        <h4>Upcoming Consultations ({upcomingAppointments.length})</h4>
                      </div>
                      <span className="subgroup-hint">Chronological order • Nearest first</span>
                    </div>
                    <div className="patient-appts-grid">
                      {upcomingAppointments.map((app) => renderPatientApptCard(app))}
                    </div>
                  </div>
                )}

                {pastAppointments.length > 0 && (
                  <div className="appointment-subgroup past-subgroup">
                    <div className="subgroup-header">
                      <div className="subgroup-title-row">
                        <span className="subgroup-badge past">Past / Concluded</span>
                        <h4>Past & Historical Consultations ({pastAppointments.length})</h4>
                      </div>
                      <span className="subgroup-hint">Reverse chronological • Most recent first</span>
                    </div>
                    <div className="patient-appts-grid">
                      {pastAppointments.map((app) => renderPatientApptCard(app))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Quick Navigation Cards */}
      <section className="dashboard-shortcuts-grid">
        <Link to="/ai-analysis" className="shortcut-card">
          <div className="shortcut-icon blue">
            <FiCpu size={24} />
          </div>
          <div className="shortcut-info">
            <h4>AI Clinical Insights</h4>
            <p>Biomarker trend analysis & physician questions</p>
          </div>
          <FiArrowRight className="shortcut-arrow" />
        </Link>

        <Link to="/appointment" className="shortcut-card">
          <div className="shortcut-icon purple">
            <FiCalendar size={24} />
          </div>
          <div className="shortcut-info">
            <h4>Doctor Appointments</h4>
            <p>Schedule & manage upcoming clinical visits</p>
          </div>
          <FiArrowRight className="shortcut-arrow" />
        </Link>

        <Link to="/insurance" className="shortcut-card">
          <div className="shortcut-icon green">
            <FiShield size={24} />
          </div>
          <div className="shortcut-info">
            <h4>Health Insurance Vault</h4>
            <p>Track coverage sums, validities & emergency TPA</p>
          </div>
          <FiArrowRight className="shortcut-arrow" />
        </Link>

        <Link to="/diet" className="shortcut-card">
          <div className="shortcut-icon orange">
            <FiActivity size={24} />
          </div>
          <div className="shortcut-info">
            <h4>Nutrition & Diet Advisor</h4>
            <p>Calculate TDEE & macro meal targets</p>
          </div>
          <FiArrowRight className="shortcut-arrow" />
        </Link>
      </section>

      {/* Upload Modal Dialog */}
      {isUploadModalOpen && (
        <div className="modal-backdrop" onClick={handleDismissUploadModal}>
          <div className="upload-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-title-wrap">
                <FiUploadCloud size={24} className="dialog-header-icon" />
                <div>
                  <h3>Upload Medical Documents</h3>
                  <p>Encrypted Azure Blob Storage with automated OCR & AI extraction</p>
                </div>
              </div>
              <button
                className="close-dialog-btn"
                onClick={handleDismissUploadModal}
                type="button"
                aria-label="Close dialog"
              >
                <FiX size={20} />
              </button>
            </div>

            {isUploading || uploadError || completedReport ? (
              <UploadProgressCard
                files={files}
                currentStage={uploadStage}
                uploadProgress={uploadProgress}
                error={uploadError}
                completedReport={completedReport}
                onRetry={handleRetryUpload}
                onDismiss={handleDismissUploadModal}
                onViewDocument={() =>
                  handleViewReport(completedReport?._id || activeJobId)
                }
              />
            ) : (
              <form onSubmit={handleFileUpload} className="dialog-form">
                {/* File Dropzone */}
                <div className="dropzone-area">
                  <FiUploadCloud size={36} className="dropzone-icon" />
                  <label className="dropzone-label">
                    <span>Click to select files</span> or drag and drop
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => setFiles([...e.target.files])}
                      className="dropzone-native-input"
                    />
                  </label>
                  <div className="dropzone-help">
                    Supported formats: PDF, JPEG, PNG, DOCX (Max 25MB)
                  </div>
                  {files.length > 0 && (
                    <div className="selected-files-list">
                      <strong>{files.length} file(s) selected:</strong>
                      <ul>
                        {files.map((f, i) => (
                          <li key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="form-row-group">
                  <div className="form-field">
                    <label>Document Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="select-field"
                    >
                      <option value="Blood Report">Blood Report / CBC</option>
                      <option value="Prescription">Doctor Prescription</option>
                      <option value="Radiology Report">Radiology / X-Ray</option>
                      <option value="MRI Report">MRI / CT Scan</option>
                      <option value="Discharge Summary">Discharge Summary</option>
                      <option value="Lab Report">Laboratory Diagnostics</option>
                      <option value="Urine Report">Urinalysis</option>
                      <option value="Medical Report">General Medical Report</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Clinical Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Annual health checkup at Apollo"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="dialog-actions">
                  <button
                    type="button"
                    className="btn-dialog-cancel"
                    onClick={handleDismissUploadModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-dialog-submit"
                    disabled={isUploading || files.length === 0}
                  >
                    Upload & Process
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon danger">
              <FiTrash2 size={24} />
            </div>
            <h3>{t("dashboard.confirmDeleteTitle", "Confirm Record Deletion")}</h3>
            <p>{t("dashboard.confirmDeleteDesc", "Are you sure you want to permanently delete this medical record? This action will remove the document and all associated AI biomarker extractions from your vault.")}</p>
            <div className="confirm-actions">
              <button
                className="btn-dialog-cancel"
                onClick={() => setDeleteConfirmId(null)}
                type="button"
              >
                {t("common.cancel", "Keep Record")}
              </button>
              <button
                className="btn-danger-confirm"
                onClick={() => handleDeleteReport(deleteConfirmId)}
                type="button"
              >
                {t("dashboard.deletePermanently", "Permanently Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Completion Modal */}
      {isProfileModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="patient-profile-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="profile-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <FiUserCheck className="modal-icon" />
                <h3 id="profile-modal-title">{t("dashboard.editProfileTitle", "Edit Patient Profile")}</h3>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setIsProfileModalOpen(false)}
                type="button"
                aria-label="Close dialog"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-edit-form">
              <div className="modal-body">
                {profileError && (
                  <div className="profile-error-alert" role="alert">
                    <FiAlertCircle />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="pat-phone">
                    <FiPhone /> {t("dashboard.phoneLabel", "Contact Phone Number")} *
                  </label>
                  <input
                    id="pat-phone"
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210 or 9876543210"
                    value={profileFormData.phoneNumber}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                  />
                  <small className="field-hint">
                    Used for doctor appointment reminders and clinical contact.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="pat-addr">
                    <FiMapPin /> {t("dashboard.addressLabel", "Residential Address")} *
                  </label>
                  <textarea
                    id="pat-addr"
                    rows="2"
                    required
                    placeholder="Street name, house/flat number, locality (min 5 characters)"
                    value={profileFormData.address}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label htmlFor="pat-city">{t("dashboard.cityLabel", "City / District")}</label>
                    <input
                      id="pat-city"
                      type="text"
                      placeholder="e.g. Hyderabad"
                      value={profileFormData.city}
                      onChange={(e) =>
                        setProfileFormData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pat-state">{t("dashboard.stateLabel", "State")}</label>
                    <input
                      id="pat-state"
                      type="text"
                      placeholder="e.g. Telangana"
                      value={profileFormData.state}
                      onChange={(e) =>
                        setProfileFormData((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pat-pin">{t("dashboard.postalCodeLabel", "Postal Code")}</label>
                    <input
                      id="pat-pin"
                      type="text"
                      placeholder="e.g. 500001"
                      value={profileFormData.postalCode}
                      onChange={(e) =>
                        setProfileFormData((prev) => ({
                          ...prev,
                          postalCode: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-dialog-cancel"
                  onClick={() => setIsProfileModalOpen(false)}
                  disabled={savingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={savingProfile}
                >
                  {savingProfile ? t("common.saving", "Saving Profile...") : t("dashboard.saveProfileBtn", "Save Profile Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;