import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { followUpsAPI } from "../services/api";
import "./DoctorFollowUpManagement.css";
import {
  FiCalendar,
  FiClock,
  FiActivity,
  FiPlus,
  FiEdit2,
  FiXCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiEye,
  FiX,
  FiTag,
  FiPhone,
  FiMail,
} from "react-icons/fi";

const CLINIC_TIMEZONE = "Asia/Kolkata";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
};

const getTodayISO = () => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: CLINIC_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    const now = new Date();
    return now.toISOString().substring(0, 10);
  }
};

const DoctorFollowUpManagement = ({
  associatedPatients = [],
  doctorAppointments = [],
  onOpenVault,
  prefillRequest, // { patientId, consultationId, patientName }
  onClearPrefillRequest,
}) => {
  const navigate = useNavigate();

  const [followUps, setFollowUps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending_booking' | 'appointment_booked' | 'completed' | 'missed' | 'cancelled'
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [activeFollowUp, setActiveFollowUp] = useState(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    patientId: "",
    consultationId: "",
    reason: "",
    doctorInstructions: "",
    recommendedDate: getTodayISO(),
    startDate: "",
    endDate: "",
    priority: "routine",
    recommendedTestsInput: "",
    notes: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Load Follow-Ups
  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        followUpsAPI.getFollowUps(),
        followUpsAPI.getDoctorStats(),
      ]);

      if (listRes.status === "fulfilled") {
        setFollowUps(listRes.value.data?.followUps || []);
      } else {
        throw new Error(listRes.reason?.response?.data?.message || "Could not load follow-up plans.");
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data?.stats || null);
      }
    } catch (err) {
      console.error("Error loading follow-ups:", err);
      setError(err.message || "Unable to retrieve follow-up care plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Handle external prefill request (e.g. from appointment row "+ Follow-Up" button)
  useEffect(() => {
    if (prefillRequest && prefillRequest.patientId) {
      setFormData({
        patientId: prefillRequest.patientId,
        consultationId: prefillRequest.consultationId || "",
        reason: prefillRequest.reason ? `Follow-up: ${prefillRequest.reason}` : "",
        doctorInstructions: "",
        recommendedDate: getTodayISO(),
        startDate: "",
        endDate: "",
        priority: "routine",
        recommendedTestsInput: "",
        notes: "",
      });
      setIsCreateModalOpen(true);
      if (onClearPrefillRequest) {
        onClearPrefillRequest();
      }
    }
  }, [prefillRequest, onClearPrefillRequest]);

  // Computed summary counts
  const computedStats = useMemo(() => {
    if (stats) return stats;
    return {
      total: followUps.length,
      pending_booking: followUps.filter((f) => f.status === "pending_booking").length,
      appointment_booked: followUps.filter((f) => f.status === "appointment_booked").length,
      completed: followUps.filter((f) => f.status === "completed").length,
      missed: followUps.filter((f) => f.status === "missed").length,
      cancelled: followUps.filter((f) => f.status === "cancelled").length,
    };
  }, [stats, followUps]);

  // Filtered List
  const filteredFollowUps = useMemo(() => {
    return followUps.filter((item) => {
      // Status Tab filter
      if (activeTab !== "all" && item.status !== activeTab) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== "all" && item.priority !== priorityFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const pName = (item.patientName || item.patientId?.name || "").toLowerCase();
        const pPhone = (item.patientPhone || item.patientId?.phoneNumber || "").toLowerCase();
        const pEmail = (item.patientEmail || item.patientId?.email || "").toLowerCase();
        const reason = (item.reason || "").toLowerCase();
        const instructions = (item.doctorInstructions || "").toLowerCase();
        const matches =
          pName.includes(term) ||
          pPhone.includes(term) ||
          pEmail.includes(term) ||
          reason.includes(term) ||
          instructions.includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [followUps, activeTab, priorityFilter, searchTerm]);

  // Patient Options for Create modal
  const patientOptions = useMemo(() => {
    const list = [...associatedPatients];
    // Also include any patients from appointments that might not be in associatedPatients
    doctorAppointments.forEach((app) => {
      const p = typeof app.patientId === "object" && app.patientId !== null ? app.patientId : null;
      if (p && p._id && !list.some((existing) => existing._id === p._id)) {
        list.push({
          _id: p._id,
          name: p.name || app.patientName,
          phoneNumber: p.phoneNumber || app.patientPhone,
          email: p.email || app.patientEmail,
        });
      }
    });
    return list;
  }, [associatedPatients, doctorAppointments]);

  // Consultations for selected patient
  const patientConsultations = useMemo(() => {
    if (!formData.patientId) return [];
    return doctorAppointments.filter((app) => {
      const pId = typeof app.patientId === "object" && app.patientId !== null ? app.patientId._id : app.patientId;
      return pId === formData.patientId;
    });
  }, [doctorAppointments, formData.patientId]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormError("");
    setFormData({
      patientId: patientOptions[0]?._id || "",
      consultationId: "",
      reason: "",
      doctorInstructions: "",
      recommendedDate: getTodayISO(),
      startDate: "",
      endDate: "",
      priority: "routine",
      recommendedTestsInput: "",
      notes: "",
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (fu) => {
    setFormError("");
    setActiveFollowUp(fu);
    const recDate = fu.recommendedDate ? fu.recommendedDate.substring(0, 10) : getTodayISO();
    const sDate = fu.recommendedDateRange?.startDate ? fu.recommendedDateRange.startDate.substring(0, 10) : "";
    const eDate = fu.recommendedDateRange?.endDate ? fu.recommendedDateRange.endDate.substring(0, 10) : "";
    setFormData({
      patientId: fu.patientId?._id || fu.patientId || "",
      consultationId: fu.consultationId?._id || fu.consultationId || "",
      reason: fu.reason || "",
      doctorInstructions: fu.doctorInstructions || "",
      recommendedDate: recDate,
      startDate: sDate,
      endDate: eDate,
      priority: fu.priority || "routine",
      recommendedTestsInput: (fu.recommendedTests || []).join(", "),
      notes: fu.notes || "",
    });
    setIsEditModalOpen(true);
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (fu) => {
    setActiveFollowUp(fu);
    setCancelReason("Follow-up plan cancelled by physician.");
    setFormError("");
    setIsCancelModalOpen(true);
  };

  // Submit Create Follow-Up
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.patientId) {
      setFormError("Please select a verified patient.");
      return;
    }
    if (!formData.reason.trim()) {
      setFormError("Please state the clinical reason for this follow-up.");
      return;
    }
    if (!formData.doctorInstructions.trim()) {
      setFormError("Please provide clear physician instructions for the patient.");
      return;
    }
    if (!formData.recommendedDate) {
      setFormError("Please provide a recommended follow-up date.");
      return;
    }

    const tests = formData.recommendedTestsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      patientId: formData.patientId,
      consultationId: formData.consultationId || undefined,
      reason: formData.reason.trim(),
      doctorInstructions: formData.doctorInstructions.trim(),
      recommendedDate: formData.recommendedDate,
      recommendedDateRange: {
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      },
      priority: formData.priority,
      recommendedTests: tests,
      notes: formData.notes.trim(),
    };

    setFormSubmitting(true);
    try {
      await followUpsAPI.createFollowUp(payload);
      setStatusMessage("Follow-up care plan successfully created for the patient.");
      setIsCreateModalOpen(false);
      fetchFollowUps();
    } catch (err) {
      console.error("Create follow-up failed:", err);
      setFormError(err.response?.data?.message || "Failed to create follow-up plan.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Follow-Up
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeFollowUp) return;
    setFormError("");

    if (!formData.reason.trim()) {
      setFormError("Please state the clinical reason for this follow-up.");
      return;
    }
    if (!formData.doctorInstructions.trim()) {
      setFormError("Please provide clear physician instructions for the patient.");
      return;
    }
    if (!formData.recommendedDate) {
      setFormError("Please provide a recommended follow-up date.");
      return;
    }

    const tests = formData.recommendedTestsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      reason: formData.reason.trim(),
      doctorInstructions: formData.doctorInstructions.trim(),
      recommendedDate: formData.recommendedDate,
      recommendedDateRange: {
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      },
      priority: formData.priority,
      recommendedTests: tests,
      notes: formData.notes.trim(),
    };

    setFormSubmitting(true);
    try {
      await followUpsAPI.updateFollowUp(activeFollowUp._id, payload);
      setStatusMessage("Follow-up care plan updated successfully.");
      setIsEditModalOpen(false);
      setActiveFollowUp(null);
      fetchFollowUps();
    } catch (err) {
      console.error("Update follow-up failed:", err);
      setFormError(err.response?.data?.message || "Failed to update follow-up plan.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Cancel Follow-Up
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!activeFollowUp) return;
    setFormError("");

    setFormSubmitting(true);
    try {
      await followUpsAPI.cancelFollowUp(activeFollowUp._id, {
        cancellationReason: cancelReason.trim() || "Cancelled by physician",
      });
      setStatusMessage("Follow-up care plan has been cancelled.");
      setIsCancelModalOpen(false);
      setActiveFollowUp(null);
      fetchFollowUps();
    } catch (err) {
      console.error("Cancel follow-up failed:", err);
      setFormError(err.response?.data?.message || "Failed to cancel follow-up plan.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "pending_booking":
        return <span className="doc-fu-badge pending">Awaiting Patient Booking</span>;
      case "appointment_booked":
        return <span className="doc-fu-badge booked">Appointment Scheduled</span>;
      case "completed":
        return <span className="doc-fu-badge completed">Consultation Completed</span>;
      case "missed":
        return <span className="doc-fu-badge missed">Missed Slot</span>;
      case "cancelled":
        return <span className="doc-fu-badge cancelled">Cancelled</span>;
      default:
        return <span className="doc-fu-badge">{status}</span>;
    }
  };

  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return <span className="doc-fu-priority urgent">Urgent Priority</span>;
      case "soon":
        return <span className="doc-fu-priority soon">Soon Priority</span>;
      case "routine":
      default:
        return <span className="doc-fu-priority routine">Routine Priority</span>;
    }
  };

  return (
    <section className="doctor-followups-section">
      {/* Header Row */}
      <div className="doc-fu-header-row">
        <div>
          <div className="doc-fu-title-badge">
            <FiActivity size={12} /> Clinical Continuity
          </div>
          <h3>Physician Follow-Up Management ({computedStats.total})</h3>
          <p>Author, track, and review post-consultation follow-up plans with scheduled patient reminders</p>
        </div>

        <div className="doc-fu-header-actions">
          <button
            className="btn-create-followup"
            onClick={handleOpenCreateModal}
            type="button"
          >
            <FiPlus size={16} /> Create Follow-Up Plan
          </button>
          <button
            className="btn-refresh-fu"
            onClick={fetchFollowUps}
            disabled={loading}
            title="Refresh follow-up plans"
            type="button"
          >
            <FiRefreshCw className={loading ? "spinning" : ""} size={14} />
          </button>
        </div>
      </div>

      {/* Status / Feedback Banner */}
      {statusMessage && (
        <div className="doc-fu-banner success">
          <FiCheckCircle size={16} />
          <span>{statusMessage}</span>
          <button
            className="btn-dismiss-fu-banner"
            onClick={() => setStatusMessage("")}
            type="button"
          >
            <FiX size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="doc-fu-banner error">
          <FiAlertCircle size={16} />
          <span>{error}</span>
          <button
            className="btn-dismiss-fu-banner"
            onClick={() => setError("")}
            type="button"
          >
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* KPI / Metric Cards */}
      <div className="doc-fu-stats-grid">
        <div
          className={`doc-fu-stat-card ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <div className="stat-label">Total Follow-Ups</div>
          <div className="stat-number">{computedStats.total}</div>
          <div className="stat-hint">All authored plans</div>
        </div>

        <div
          className={`doc-fu-stat-card amber ${activeTab === "pending_booking" ? "active" : ""}`}
          onClick={() => setActiveTab("pending_booking")}
        >
          <div className="stat-label">Needs Booking</div>
          <div className="stat-number">{computedStats.pending_booking}</div>
          <div className="stat-hint">Patient yet to reserve</div>
        </div>

        <div
          className={`doc-fu-stat-card blue ${activeTab === "appointment_booked" ? "active" : ""}`}
          onClick={() => setActiveTab("appointment_booked")}
        >
          <div className="stat-label">Booked Visits</div>
          <div className="stat-number">{computedStats.appointment_booked}</div>
          <div className="stat-hint">Appointment confirmed</div>
        </div>

        <div
          className={`doc-fu-stat-card green ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          <div className="stat-label">Completed</div>
          <div className="stat-number">{computedStats.completed}</div>
          <div className="stat-hint">Consultation concluded</div>
        </div>

        <div
          className={`doc-fu-stat-card red ${activeTab === "missed" ? "active" : ""}`}
          onClick={() => setActiveTab("missed")}
        >
          <div className="stat-label">Missed Slots</div>
          <div className="stat-number">{computedStats.missed}</div>
          <div className="stat-hint">Requires care outreach</div>
        </div>
      </div>

      {/* Toolbar: Search, Priority Filter, Tabs */}
      <div className="doc-fu-toolbar">
        <div className="doc-fu-tabs" role="tablist">
          <button
            type="button"
            className={`fu-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All <span className="tab-pill">{computedStats.total}</span>
          </button>
          <button
            type="button"
            className={`fu-tab-btn ${activeTab === "pending_booking" ? "active" : ""}`}
            onClick={() => setActiveTab("pending_booking")}
          >
            Needs Booking <span className="tab-pill">{computedStats.pending_booking}</span>
          </button>
          <button
            type="button"
            className={`fu-tab-btn ${activeTab === "appointment_booked" ? "active" : ""}`}
            onClick={() => setActiveTab("appointment_booked")}
          >
            Booked <span className="tab-pill">{computedStats.appointment_booked}</span>
          </button>
          <button
            type="button"
            className={`fu-tab-btn ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed <span className="tab-pill">{computedStats.completed}</span>
          </button>
          <button
            type="button"
            className={`fu-tab-btn ${activeTab === "missed" ? "active" : ""}`}
            onClick={() => setActiveTab("missed")}
          >
            Missed <span className="tab-pill">{computedStats.missed}</span>
          </button>
          <button
            type="button"
            className={`fu-tab-btn ${activeTab === "cancelled" ? "active" : ""}`}
            onClick={() => setActiveTab("cancelled")}
          >
            Cancelled <span className="tab-pill">{computedStats.cancelled}</span>
          </button>
        </div>

        <div className="doc-fu-search-filters">
          <div className="fu-search-box">
            <FiSearch size={14} />
            <input
              type="text"
              placeholder="Search patient, instructions, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchTerm("")}
                type="button"
              >
                <FiX size={12} />
              </button>
            )}
          </div>

          <div className="fu-priority-filter">
            <FiFilter size={14} />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="soon">Soon</option>
              <option value="routine">Routine</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="doc-fu-loading">
          <FiRefreshCw className="spinning" size={24} />
          <p>Loading follow-up plans and appointment linkages...</p>
        </div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="doc-fu-empty">
          <FiCalendar size={36} />
          <h4>No Follow-Up Care Plans Found</h4>
          <p>
            {searchTerm || activeTab !== "all" || priorityFilter !== "all"
              ? "No plans match your current filters. Try resetting search parameters."
              : "You have not authored any patient follow-up care plans yet. Use '+ Create Follow-Up Plan' to get started."}
          </p>
          <button
            className="btn-create-followup empty-cta"
            onClick={handleOpenCreateModal}
            type="button"
          >
            <FiPlus size={15} /> Create Follow-Up Plan
          </button>
        </div>
      ) : (
        <div className="doc-fu-table-wrapper">
          <table className="doc-fu-table">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Recommended Due Date</th>
                <th>Clinical Reason & Instructions</th>
                <th>Linked Appointment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFollowUps.map((fu) => {
                const pObj = typeof fu.patientId === "object" && fu.patientId !== null ? fu.patientId : null;
                const pName = pObj?.name || fu.patientName || "Patient";
                const pPhone = pObj?.phoneNumber || fu.patientPhone || "";
                const pEmail = pObj?.email || fu.patientEmail || "";
                const pId = pObj?._id || (typeof fu.patientId === "string" ? fu.patientId : null);

                const isEditable = fu.status !== "completed" && fu.status !== "cancelled";

                return (
                  <tr key={fu._id} className={`fu-row ${fu.status}`}>
                    {/* Patient Details */}
                    <td className="col-patient">
                      <div className="patient-main-info">
                        <strong>{pName}</strong>
                        {pPhone && (
                          <span className="sub-contact">
                            <FiPhone size={11} /> {pPhone}
                          </span>
                        )}
                        {pEmail && (
                          <span className="sub-contact">
                            <FiMail size={11} /> {pEmail}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="col-priority">
                      {renderPriorityBadge(fu.priority)}
                    </td>

                    {/* Status */}
                    <td className="col-status">
                      {renderStatusBadge(fu.status)}
                    </td>

                    {/* Recommended Date */}
                    <td className="col-date">
                      <div className="date-main">
                        <FiCalendar size={13} /> {formatDate(fu.recommendedDate)}
                      </div>
                      {fu.recommendedDateRange?.startDate && fu.recommendedDateRange?.endDate && (
                        <div className="date-sub-range">
                          Range: {formatDate(fu.recommendedDateRange.startDate)} – {formatDate(fu.recommendedDateRange.endDate)}
                        </div>
                      )}
                    </td>

                    {/* Reason & Instructions */}
                    <td className="col-clinical">
                      <div className="clinical-reason">
                        <strong>Reason:</strong> {fu.reason}
                      </div>
                      <div className="clinical-instructions">
                        <strong>Physician Instructions:</strong> {fu.doctorInstructions}
                      </div>
                      {fu.recommendedTests && fu.recommendedTests.length > 0 && (
                        <div className="tests-tags-row">
                          {fu.recommendedTests.map((test, idx) => (
                            <span key={idx} className="test-tag">
                              <FiTag size={10} /> {test}
                            </span>
                          ))}
                        </div>
                      )}
                      {fu.notes && (
                        <div className="clinical-notes">
                          <em>Notes: {fu.notes}</em>
                        </div>
                      )}
                      {fu.cancellationReason && (
                        <div className="cancellation-reason">
                          <em>Cancellation Note: {fu.cancellationReason}</em>
                        </div>
                      )}
                    </td>

                    {/* Linked Appointment */}
                    <td className="col-linked-appt">
                      {fu.appointmentId ? (
                        <div className="linked-appt-card">
                          <div className="appt-date">
                            <FiCalendar size={11} /> {formatDate(fu.appointmentId.appointmentDate)}
                          </div>
                          <div className="appt-slot">
                            <FiClock size={11} /> {fu.appointmentId.timeSlot}
                          </div>
                          <span className={`status-micro-pill ${fu.appointmentId.status?.toLowerCase().replace(/\s+/g, "-")}`}>
                            {fu.appointmentId.status || "Scheduled"}
                          </span>
                        </div>
                      ) : (
                        <span className="no-appt-hint">Not yet scheduled</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="col-actions">
                      <div className="fu-actions-group">
                        {isEditable && (
                          <button
                            className="btn-action edit"
                            onClick={() => handleOpenEditModal(fu)}
                            title="Edit follow-up plan instructions or dates"
                            type="button"
                          >
                            <FiEdit2 size={13} /> Edit
                          </button>
                        )}

                        {isEditable && (
                          <button
                            className="btn-action cancel"
                            onClick={() => handleOpenCancelModal(fu)}
                            title="Cancel follow-up plan"
                            type="button"
                          >
                            <FiXCircle size={13} /> Cancel
                          </button>
                        )}

                        {pId && onOpenVault && (
                          <button
                            className="btn-action vault"
                            onClick={() => onOpenVault(pId)}
                            title="Inspect patient medical records"
                            type="button"
                          >
                            <FiEye size={13} /> Vault
                          </button>
                        )}

                        {pId && (
                          <button
                            className="btn-action timeline"
                            onClick={() => navigate(`/timeline?patientId=${pId}`)}
                            title="View patient health timeline"
                            type="button"
                          >
                            <FiActivity size={13} /> Timeline
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fu-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="fu-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="fu-modal-header">
              <div className="header-icon-title">
                <FiPlus className="modal-title-icon" />
                <div>
                  <h4>Author Clinical Follow-Up Plan</h4>
                  <p>Prescribe physician-directed follow-up milestones and instructions</p>
                </div>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setIsCreateModalOpen(false)}
                type="button"
              >
                <FiX size={18} />
              </button>
            </div>

            {formError && (
              <div className="fu-modal-error">
                <FiAlertCircle size={15} /> <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="fu-modal-form">
              {/* Patient Selection */}
              <div className="fu-form-group">
                <label>Select Verified Patient *</label>
                <select
                  value={formData.patientId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      patientId: e.target.value,
                      consultationId: "", // reset consultation on patient change
                    }))
                  }
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patientOptions.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.phoneNumber ? `(${p.phoneNumber})` : ""} {p.email ? `• ${p.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Linkage (Optional) */}
              {patientConsultations.length > 0 && (
                <div className="fu-form-group">
                  <label>Linked Consultation Reference (Optional)</label>
                  <select
                    value={formData.consultationId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, consultationId: e.target.value }))
                    }
                  >
                    <option value="">-- No specific consultation link --</option>
                    {patientConsultations.map((app) => (
                      <option key={app._id} value={app._id}>
                        {formatDate(app.appointmentDate)} at {app.timeSlot} ({app.status}) — {app.reason || "General Visit"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clinical Reason */}
              <div className="fu-form-group">
                <label>Follow-Up Clinical Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Post-operative evaluation, hypertension monitoring, HbA1c review"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Doctor's Clinical Instructions */}
              <div className="fu-form-group">
                <label>Physician Instructions for Patient *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Monitor blood pressure daily before morning dose. Fast for 10 hours prior to scheduled lab work."
                  value={formData.doctorInstructions}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, doctorInstructions: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Recommended Date & Priority */}
              <div className="fu-form-row-2">
                <div className="fu-form-group">
                  <label>Recommended Follow-Up Date *</label>
                  <input
                    type="date"
                    min={getTodayISO()}
                    value={formData.recommendedDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, recommendedDate: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="fu-form-group">
                  <label>Clinical Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, priority: e.target.value }))
                    }
                  >
                    <option value="routine">Routine (Standard follow-up)</option>
                    <option value="soon">Soon (Needs timely attention)</option>
                    <option value="urgent">Urgent (Critical post-care review)</option>
                  </select>
                </div>
              </div>

              {/* Date Range (Optional) */}
              <div className="fu-form-row-2">
                <div className="fu-form-group">
                  <label>Acceptable Window Start (Optional)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="fu-form-group">
                  <label>Acceptable Window End (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Recommended Diagnostic Tests */}
              <div className="fu-form-group">
                <label>Recommended Diagnostic Tests (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Complete Blood Count (CBC), Serum Creatinine, ECG"
                  value={formData.recommendedTestsInput}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, recommendedTestsInput: e.target.value }))
                  }
                />
              </div>

              {/* Internal Notes */}
              <div className="fu-form-group">
                <label>Internal Physician Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Clinical notes visible in follow-up management..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>

              {/* Modal Buttons */}
              <div className="fu-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Creating Plan..." : "Prescribe Follow-Up Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && activeFollowUp && (
        <div className="fu-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="fu-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="fu-modal-header">
              <div className="header-icon-title">
                <FiEdit2 className="modal-title-icon" />
                <div>
                  <h4>Edit Follow-Up Plan</h4>
                  <p>Update instructions, dates, or tests for {activeFollowUp.patientName}</p>
                </div>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setIsEditModalOpen(false)}
                type="button"
              >
                <FiX size={18} />
              </button>
            </div>

            {formError && (
              <div className="fu-modal-error">
                <FiAlertCircle size={15} /> <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="fu-modal-form">
              {/* Clinical Reason */}
              <div className="fu-form-group">
                <label>Follow-Up Clinical Reason *</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Instructions */}
              <div className="fu-form-group">
                <label>Physician Instructions for Patient *</label>
                <textarea
                  rows={3}
                  value={formData.doctorInstructions}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, doctorInstructions: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Recommended Date & Priority */}
              <div className="fu-form-row-2">
                <div className="fu-form-group">
                  <label>Recommended Follow-Up Date *</label>
                  <input
                    type="date"
                    value={formData.recommendedDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, recommendedDate: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="fu-form-group">
                  <label>Clinical Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, priority: e.target.value }))
                    }
                  >
                    <option value="routine">Routine</option>
                    <option value="soon">Soon</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="fu-form-row-2">
                <div className="fu-form-group">
                  <label>Acceptable Window Start</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="fu-form-group">
                  <label>Acceptable Window End</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Recommended Tests */}
              <div className="fu-form-group">
                <label>Recommended Diagnostic Tests</label>
                <input
                  type="text"
                  value={formData.recommendedTestsInput}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, recommendedTestsInput: e.target.value }))
                  }
                />
              </div>

              {/* Notes */}
              <div className="fu-form-group">
                <label>Internal Physician Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>

              {/* Modal Buttons */}
              <div className="fu-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelModalOpen && activeFollowUp && (
        <div className="fu-modal-backdrop" onClick={() => setIsCancelModalOpen(false)}>
          <div
            className="fu-modal-card confirm-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="fu-modal-header danger">
              <div className="header-icon-title">
                <FiXCircle className="modal-title-icon danger" />
                <div>
                  <h4>Cancel Follow-Up Plan</h4>
                  <p>Discontinue follow-up requirements for {activeFollowUp.patientName}</p>
                </div>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setIsCancelModalOpen(false)}
                type="button"
              >
                <FiX size={18} />
              </button>
            </div>

            {formError && (
              <div className="fu-modal-error">
                <FiAlertCircle size={15} /> <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="fu-modal-form">
              <p className="cancel-confirm-text">
                Are you sure you want to cancel the follow-up plan for{" "}
                <strong>{activeFollowUp.patientName}</strong>? The patient will be notified
                that this follow-up is no longer required.
              </p>

              <div className="fu-form-group">
                <label>Reason for Cancellation *</label>
                <input
                  type="text"
                  placeholder="e.g. Clinical resolution, patient moved, alternative treatment"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>

              <div className="fu-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Keep Plan
                </button>
                <button
                  type="submit"
                  className="btn-modal-danger"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default DoctorFollowUpManagement;
