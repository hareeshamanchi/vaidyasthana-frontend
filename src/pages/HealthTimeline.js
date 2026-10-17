import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { timelineAPI, doctorAPI, reportsAPI } from "../services/api";
import "./HealthTimeline.css";
import {
  FiActivity,
  FiFileText,
  FiCalendar,
  FiVideo,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiShield,
  FiSearch,
  FiRefreshCw,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
  FiArrowLeft,
  FiX,
  FiLayers,
} from "react-icons/fi";

const HealthTimeline = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryPatientId = searchParams.get("patientId") || "";

  // Data states
  const [timeline, setTimeline] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [patient, setPatient] = useState(null);
  const [metrics, setMetrics] = useState({
    totalRecords: 0,
    totalReports: 0,
    totalAppointments: 0,
    abnormalBiomarkersCount: 0,
    upcomingAppointmentsCount: 0,
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);

  // Doctor associated patients for patient-selector
  const [associatedPatients, setAssociatedPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(queryPatientId);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBiomarkers, setExpandedBiomarkers] = useState(new Set());
  const [viewingDocId, setViewingDocId] = useState(null);
  const [docActionMessage, setDocActionMessage] = useState("");

  // Filters state
  const [recordType, setRecordType] = useState("all"); // 'all' | 'reports' | 'appointments' | 'biomarkers'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' | 'asc'

  const isDoctor = user?.role === "doctor";
  const isAdmin = user?.role === "admin";
  const isPatient = user?.role === "patient" || (!isDoctor && !isAdmin);

  // Sync selectedPatientId when URL query changes
  useEffect(() => {
    if (queryPatientId) {
      setSelectedPatientId(queryPatientId);
    }
  }, [queryPatientId]);

  // Load doctor's associated patients if caller is doctor
  useEffect(() => {
    if (isDoctor) {
      const loadPatients = async () => {
        try {
          const res = await doctorAPI.getPatients();
          const list = res.data?.patients || [];
          setAssociatedPatients(list);
          // If no patient selected yet and patients exist, default to the first one
          if (!selectedPatientId && list.length > 0) {
            const firstId = list[0]._id || list[0].id;
            setSelectedPatientId(firstId);
            setSearchParams({ patientId: firstId });
          }
        } catch (err) {
          console.warn("Could not load associated patients for doctor:", err.message);
        }
      };
      loadPatients();
    }
  }, [isDoctor, selectedPatientId, setSearchParams]);

  // Fetch timeline from backend
  const fetchTimelineData = useCallback(async () => {
    if (authLoading || !user) return;

    if (isDoctor && !selectedPatientId) {
      setLoading(false);
      setError("Please select an authorized patient to view their clinical health timeline.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = {
        type: recordType,
        order: sortOrder,
      };

      if (selectedPatientId && (isDoctor || isAdmin)) {
        params.patientId = selectedPatientId;
      }
      if (selectedCategory && selectedCategory !== "all") {
        params.category = selectedCategory;
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.status = selectedStatus;
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      const res = await timelineAPI.getTimeline(params);

      if (res.data?.success) {
        setTimeline(res.data.timeline || []);
        setMilestones(res.data.milestones || []);
        setPatient(res.data.patient || null);
        setMetrics(
          res.data.metrics || {
            totalRecords: 0,
            totalReports: 0,
            totalAppointments: 0,
            abnormalBiomarkersCount: 0,
            upcomingAppointmentsCount: 0,
          }
        );
        if (res.data.availableCategories) {
          setAvailableCategories(res.data.availableCategories);
        }
        if (res.data.availableStatuses) {
          setAvailableStatuses(res.data.availableStatuses);
        }
      } else {
        setError(res.data?.message || "Failed to load patient timeline.");
      }
    } catch (err) {
      console.error("Timeline retrieval error:", err);
      const errMsg =
        err.response?.data?.message ||
        "Unable to retrieve patient health timeline. Please verify network connectivity.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [
    authLoading,
    user,
    isDoctor,
    isAdmin,
    selectedPatientId,
    recordType,
    sortOrder,
    selectedCategory,
    selectedStatus,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  // Handle switching patient (Doctor mode)
  const handleSelectPatient = (patId) => {
    setSelectedPatientId(patId);
    setSearchParams({ patientId: patId });
  };

  // Toggle biomarker expansion
  const toggleBiomarkers = (reportId) => {
    setExpandedBiomarkers((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  // Securely view report document via short-lived SAS link
  const handleOpenReport = async (reportId) => {
    try {
      setViewingDocId(reportId);
      setDocActionMessage("");
      const res = await reportsAPI.viewReport(reportId);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        setDocActionMessage("Failed to generate secure document viewing link.");
      }
    } catch (err) {
      console.error("Open report error:", err);
      setDocActionMessage(
        err.response?.data?.message || "Access denied or document could not be retrieved."
      );
    } finally {
      setViewingDocId(null);
    }
  };

  // Client-side text filter on search query
  const filteredTimeline = useMemo(() => {
    if (!searchQuery.trim()) return timeline;
    const q = searchQuery.toLowerCase().trim();
    return timeline.filter((item) => {
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchDocName = (item.doctorName || "").toLowerCase().includes(q);
      const matchCategory = (item.category || "").toLowerCase().includes(q);
      const matchDept = (item.department || "").toLowerCase().includes(q);
      const matchNotes = (item.notes || "").toLowerCase().includes(q);
      const matchReason = (item.reason || "").toLowerCase().includes(q);
      const matchSummary = (item.aiAnalysis?.summary || "").toLowerCase().includes(q);
      return (
        matchTitle ||
        matchDocName ||
        matchCategory ||
        matchDept ||
        matchNotes ||
        matchReason ||
        matchSummary
      );
    });
  }, [timeline, searchQuery]);

  // Re-group filtered items by Month/Year if search query is applied
  const displayedMilestones = useMemo(() => {
    if (!searchQuery.trim()) return milestones;

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const map = new Map();
    for (const ev of filteredTimeline) {
      const d = new Date(ev.date);
      const valid = isNaN(d.getTime()) ? new Date() : d;
      const year = valid.getFullYear();
      const month = monthNames[valid.getMonth()];
      const key = `${month} ${year}`;
      if (!map.has(key)) {
        map.set(key, { period: key, year, month, count: 0, items: [] });
      }
      const g = map.get(key);
      g.count += 1;
      g.items.push(ev);
    }
    return Array.from(map.values());
  }, [filteredTimeline, milestones, searchQuery]);

  // Reset all filters
  const handleResetFilters = () => {
    setRecordType("all");
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
  };

  const hasActiveFilters =
    recordType !== "all" ||
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedStatus !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    sortOrder !== "desc";

  // Helper for file badge
  const getFileBadge = (name) => {
    if (!name) return <span className="timeline-badge-file generic">DOC</span>;
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return <span className="timeline-badge-file pdf">PDF</span>;
    if (["jpg", "jpeg", "png"].includes(ext))
      return <span className="timeline-badge-file img">IMG</span>;
    return <span className="timeline-badge-file doc">DOC</span>;
  };

  // Helper for appointment status color
  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "confirmed" || s === "completed") return "status-success";
    if (s === "scheduled" || s === "in progress") return "status-primary";
    if (s === "cancelled" || s === "rejected") return "status-danger";
    return "status-neutral";
  };

  // Helper for AI severity badge
  const getSeverityBadgeClass = (sev) => {
    const s = String(sev || "").toLowerCase();
    if (s === "critical" || s === "high") return "severity-high";
    if (s === "medium") return "severity-medium";
    if (s === "low") return "severity-low";
    return "severity-unknown";
  };

  return (
    <div className="health-timeline-page">
      {/* Top Header Navigation */}
      <header className="timeline-top-nav">
        <div className="timeline-nav-container">
          <div className="timeline-nav-left">
            <button
              className="btn-timeline-back"
              onClick={() => {
                if (isDoctor) navigate("/doctor-dashboard");
                else navigate("/dashboard");
              }}
              type="button"
              title="Return to dashboard"
            >
              <FiArrowLeft /> Back to {isDoctor ? "Doctor Dashboard" : "My Dashboard"}
            </button>
            <div className="timeline-header-titles">
              <div className="timeline-badge-pill">
                <FiActivity /> Unified Clinical Record
              </div>
              <h1>Patient Health Timeline</h1>
              <p>
                Comprehensive chronological health history integrating diagnostic reports, clinical
                consultations, and AI biomarker extractions.
              </p>
            </div>
          </div>

          {/* Clinician Patient Switcher Banner for Doctors */}
          {isDoctor && (
            <div className="doctor-patient-switcher-wrap">
              <span className="switcher-label">
                <FiUser /> Authorized Patient:
              </span>
              <select
                className="patient-select-dropdown"
                value={selectedPatientId}
                onChange={(e) => handleSelectPatient(e.target.value)}
              >
                {associatedPatients.length === 0 ? (
                  <option value="">No Assigned Patients</option>
                ) : (
                  associatedPatients.map((pat) => (
                    <option key={pat._id || pat.id} value={pat._id || pat.id}>
                      {pat.name} ({pat.email || pat.phoneNumber || pat._id || pat.id})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>
      </header>

      <main className="timeline-main-content">
        {/* Patient Identity Dossier Card */}
        {patient && (
          <section className="patient-dossier-card">
            <div className="dossier-avatar-col">
              <div className="dossier-avatar">
                {patient.name
                  ? patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "PT"}
              </div>
            </div>
            <div className="dossier-info-col">
              <div className="dossier-title-row">
                <h2>{patient.name}</h2>
                <span className="dossier-id-badge">ID: {patient._id || patient.id}</span>
                {isDoctor && (
                  <span className="dossier-auth-verified">
                    <FiCheckCircle size={13} /> Clinically Authorized
                  </span>
                )}
              </div>
              <div className="dossier-meta-chips">
                {patient.bloodGroup && (
                  <span className="meta-chip blood-group">
                    <strong>Blood:</strong> {patient.bloodGroup}
                  </span>
                )}
                {patient.gender && (
                  <span className="meta-chip">
                    <strong>Gender:</strong> {patient.gender}
                  </span>
                )}
                {patient.phoneNumber && (
                  <span className="meta-chip">
                    <strong>Phone:</strong> {patient.phoneNumber}
                  </span>
                )}
                {patient.email && (
                  <span className="meta-chip">
                    <strong>Email:</strong> {patient.email}
                  </span>
                )}
                {patient.address && (
                  <span className="meta-chip address-chip">
                    <strong>Address:</strong> {patient.address}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Executive Metrics Ribbon */}
        <section className="timeline-metrics-grid">
          <div
            className={`metric-tile ${recordType === "all" ? "active-filter" : ""}`}
            onClick={() => setRecordType("all")}
            role="button"
            tabIndex={0}
          >
            <div className="tile-icon-wrap blue">
              <FiLayers />
            </div>
            <div className="tile-details">
              <span className="tile-value">{metrics.totalRecords}</span>
              <span className="tile-label">Total Events</span>
            </div>
          </div>

          <div
            className={`metric-tile ${recordType === "reports" ? "active-filter" : ""}`}
            onClick={() => setRecordType("reports")}
            role="button"
            tabIndex={0}
          >
            <div className="tile-icon-wrap teal">
              <FiFileText />
            </div>
            <div className="tile-details">
              <span className="tile-value">{metrics.totalReports}</span>
              <span className="tile-label">Diagnostic Reports</span>
            </div>
          </div>

          <div
            className={`metric-tile ${recordType === "appointments" ? "active-filter" : ""}`}
            onClick={() => setRecordType("appointments")}
            role="button"
            tabIndex={0}
          >
            <div className="tile-icon-wrap purple">
              <FiCalendar />
            </div>
            <div className="tile-details">
              <span className="tile-value">{metrics.totalAppointments}</span>
              <span className="tile-label">
                Consultations {metrics.upcomingAppointmentsCount > 0 && `(${metrics.upcomingAppointmentsCount} upcoming)`}
              </span>
            </div>
          </div>

          <div
            className={`metric-tile ${recordType === "biomarkers" ? "active-filter" : ""}`}
            onClick={() => setRecordType("biomarkers")}
            role="button"
            tabIndex={0}
          >
            <div className="tile-icon-wrap amber">
              <FiActivity />
            </div>
            <div className="tile-details">
              <span className="tile-value">{metrics.abnormalBiomarkersCount}</span>
              <span className="tile-label">Biomarker Flags</span>
            </div>
          </div>
        </section>

        {/* Interactive Filtering Toolbar */}
        <section className="timeline-filter-toolbar">
          <div className="filter-row-primary">
            {/* Type selector tabs */}
            <div className="filter-tabs">
              <button
                className={`filter-tab ${recordType === "all" ? "active" : ""}`}
                onClick={() => setRecordType("all")}
                type="button"
              >
                All Activities
              </button>
              <button
                className={`filter-tab ${recordType === "reports" ? "active" : ""}`}
                onClick={() => setRecordType("reports")}
                type="button"
              >
                Reports ({metrics.totalReports})
              </button>
              <button
                className={`filter-tab ${recordType === "appointments" ? "active" : ""}`}
                onClick={() => setRecordType("appointments")}
                type="button"
              >
                Consultations ({metrics.totalAppointments})
              </button>
              <button
                className={`filter-tab ${recordType === "biomarkers" ? "active" : ""}`}
                onClick={() => setRecordType("biomarkers")}
                type="button"
              >
                Biomarkers ({metrics.abnormalBiomarkersCount})
              </button>
            </div>

            {/* Keyword Search */}
            <div className="search-box-wrap">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by diagnosis, doctor, parameter, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="timeline-search-input"
              />
              {searchQuery && (
                <button
                  className="btn-clear-search"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>

          <div className="filter-row-secondary">
            {/* Category Dropdown */}
            {(recordType === "all" || recordType === "reports") && availableCategories.length > 0 && (
              <div className="filter-select-group">
                <label htmlFor="cat-filter">Category:</label>
                <select
                  id="cat-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Appointment Status Dropdown */}
            {(recordType === "all" || recordType === "appointments") && availableStatuses.length > 0 && (
              <div className="filter-select-group">
                <label htmlFor="status-filter">Status:</label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Controls */}
            <div className="filter-select-group date-group">
              <label htmlFor="start-date">From:</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="filter-select-group date-group">
              <label htmlFor="end-date">To:</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Sort Order */}
            <div className="filter-select-group">
              <label htmlFor="sort-order">Order:</label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                className="btn-reset-filters"
                onClick={handleResetFilters}
                type="button"
                title="Clear all filters"
              >
                <FiRefreshCw size={13} /> Reset Filters
              </button>
            )}
          </div>
        </section>

        {docActionMessage && (
          <div className="timeline-alert-banner warning">
            <FiAlertTriangle />
            <span>{docActionMessage}</span>
            <button
              onClick={() => setDocActionMessage("")}
              className="btn-dismiss"
              type="button"
            >
              <FiX />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="timeline-state-card loading-state">
            <div className="spinner-orbit">
              <FiRefreshCw className="spinner-icon" />
            </div>
            <h3>Loading Chronological Health Timeline...</h3>
            <p>Decrypting verified records and compiling clinical milestones.</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="timeline-state-card error-state">
            <FiAlertCircle className="error-icon" />
            <h3>Unable to Load Health Timeline</h3>
            <p>{error}</p>
            <button className="btn-retry-timeline" onClick={fetchTimelineData} type="button">
              <FiRefreshCw /> Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTimeline.length === 0 && (
          <div className="timeline-state-card empty-state">
            <FiLayers className="empty-icon" />
            <h3>No Records Found for the Selected Criteria</h3>
            <p>
              {hasActiveFilters
                ? "Try adjusting your filters or date range to view patient history."
                : "No medical reports or consultations are recorded for this patient yet."}
            </p>
            {hasActiveFilters && (
              <button className="btn-reset-filters" onClick={handleResetFilters} type="button">
                Clear Filters
              </button>
            )}
            {isPatient && !hasActiveFilters && (
              <div className="empty-actions-row">
                <Link to="/appointment" className="btn-empty-action">
                  <FiCalendar /> Book Consultation
                </Link>
                <Link to="/dashboard" className="btn-empty-action secondary">
                  <FiFileText /> Upload Report
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Chronological Milestone Feed */}
        {!loading && !error && displayedMilestones.length > 0 && (
          <div className="timeline-feed-wrap">
            {displayedMilestones.map((milestone) => (
              <section key={milestone.period} className="milestone-group-section">
                {/* Milestone Period Header */}
                <div className="milestone-header-pill">
                  <span className="milestone-period-text">{milestone.period}</span>
                  <span className="milestone-count-badge">
                    {milestone.items.length} {milestone.items.length === 1 ? "Record" : "Records"}
                  </span>
                </div>

                {/* Timeline Stream for Milestone */}
                <div className="milestone-items-stream">
                  {milestone.items.map((event) => {
                    const isReport = event.recordType === "report";
                    const isAppointment = event.recordType === "appointment";
                    const isVideoConsultation =
                      isAppointment &&
                      (String(event.consultationType || "").toLowerCase().includes("video") ||
                        String(event.consultationType || "").toLowerCase().includes("online"));

                    const eventDate = new Date(event.date);
                    const formattedDate = !isNaN(eventDate.getTime())
                      ? eventDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Date Recorded";

                    const formattedTime = !isNaN(eventDate.getTime())
                      ? eventDate.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    return (
                      <div
                        key={`${event.recordType}-${event.id}`}
                        className={`timeline-entry-row ${
                          event.hasBiomarkers ? "has-biomarker-alert" : ""
                        }`}
                      >
                        {/* Vertical rail node */}
                        <div className="timeline-node-col">
                          <div
                            className={`timeline-node-circle ${
                              isReport
                                ? event.hasBiomarkers
                                  ? "node-amber"
                                  : "node-blue"
                                : isVideoConsultation
                                ? "node-cyan"
                                : "node-purple"
                            }`}
                          >
                            {isReport ? (
                              event.hasBiomarkers ? (
                                <FiActivity />
                              ) : (
                                <FiFileText />
                              )
                            ) : isVideoConsultation ? (
                              <FiVideo />
                            ) : (
                              <FiCalendar />
                            )}
                          </div>
                          <div className="timeline-stem-line" />
                        </div>

                        {/* Card Content */}
                        <div className="timeline-card-col">
                          {isReport ? (
                            /* ================= REPORT CARD ================= */
                            <article className="timeline-event-card report-card">
                              <div className="card-top-bar">
                                <div className="card-badges-left">
                                  {getFileBadge(event.fileName || event.title)}
                                  <span className="badge-category">{event.category}</span>
                                  {/* Attribution Tag */}
                                  <span
                                    className={`badge-attribution ${
                                      event.uploadedByRole === "doctor"
                                        ? "attr-doctor"
                                        : "attr-patient"
                                    }`}
                                  >
                                    {event.uploadedByRole === "doctor"
                                      ? `Uploaded by ${event.uploaderName}`
                                      : "Uploaded by Patient"}
                                  </span>
                                </div>
                                <div className="card-time-stamp">
                                  <FiClock size={12} />
                                  <span>{formattedDate}{formattedTime ? ` • ${formattedTime}` : ""}</span>
                                </div>
                              </div>

                              <div className="card-body-content">
                                <h3 className="card-title">{event.title}</h3>

                                {/* Notes if present */}
                                {event.notes && (
                                  <p className="card-notes-text">
                                    <strong>Clinical Notes:</strong> {event.notes}
                                  </p>
                                )}

                                {/* AI Interpretation Section */}
                                {event.aiAnalysis && (
                                  <div className="ai-interpretation-box">
                                    <div className="ai-box-header">
                                      <div className="ai-title-wrap">
                                        <FiActivity className="ai-sparkle-icon" />
                                        <span>Azure AI Clinical Interpretation</span>
                                      </div>
                                      {event.aiAnalysis.severity &&
                                        event.aiAnalysis.severity !== "Unknown" && (
                                          <span
                                            className={`badge-severity ${getSeverityBadgeClass(
                                              event.aiAnalysis.severity
                                            )}`}
                                          >
                                            Severity: {event.aiAnalysis.severity}
                                          </span>
                                        )}
                                    </div>

                                    {event.aiAnalysis.summary && (
                                      <p className="ai-summary-text">{event.aiAnalysis.summary}</p>
                                    )}

                                    {/* Suspected Conditions / Diseases */}
                                    {event.possibleDiseases &&
                                      event.possibleDiseases.length > 0 && (
                                        <div className="ai-tags-group">
                                          <span className="tag-group-label">
                                            Possible Indications:
                                          </span>
                                          <div className="tags-flex">
                                            {event.possibleDiseases.map((dis, idx) => (
                                              <span key={idx} className="indication-pill">
                                                {dis}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                    {/* Recommendations */}
                                    {event.recommendations &&
                                      event.recommendations.length > 0 && (
                                        <div className="ai-recommendations-list">
                                          <span className="tag-group-label">
                                            AI Care Recommendations:
                                          </span>
                                          <ul>
                                            {event.recommendations.map((rec, idx) => (
                                              <li key={idx}>{rec}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                    {/* Abnormal Biomarkers Table Toggle */}
                                    {event.abnormalParameters &&
                                      event.abnormalParameters.length > 0 && (
                                        <div className="biomarkers-accordion-wrap">
                                          <button
                                            className="btn-toggle-biomarkers"
                                            onClick={() => toggleBiomarkers(event.id)}
                                            type="button"
                                          >
                                            <FiAlertTriangle className="warn-icon" />
                                            <span>
                                              {event.abnormalParameters.length} Abnormal Biomarker
                                              {event.abnormalParameters.length > 1 ? "s" : ""}{" "}
                                              Flagged
                                            </span>
                                            {expandedBiomarkers.has(event.id) ? (
                                              <FiChevronUp />
                                            ) : (
                                              <FiChevronDown />
                                            )}
                                          </button>

                                          {expandedBiomarkers.has(event.id) && (
                                            <div className="biomarkers-table-scroll">
                                              <table className="biomarkers-data-table">
                                                <thead>
                                                  <tr>
                                                    <th>Parameter</th>
                                                    <th>Observed Value</th>
                                                    <th>Normal Range</th>
                                                    <th>Clinical Finding</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {event.abnormalParameters.map((bm, bIdx) => (
                                                    <tr key={bIdx}>
                                                      <td className="param-name">
                                                        <strong>{bm.parameter}</strong>
                                                      </td>
                                                      <td className="param-value">
                                                        <span className="value-badge">
                                                          {bm.value}
                                                        </span>
                                                      </td>
                                                      <td className="param-range">
                                                        {bm.normalRange || "—"}
                                                      </td>
                                                      <td className="param-reason">
                                                        <span className="status-flag">
                                                          {bm.status || "Abnormal"}
                                                        </span>
                                                        {bm.reason && ` ${bm.reason}`}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>

                              {/* Card Actions */}
                              <div className="card-actions-bar">
                                <button
                                  className="btn-view-document"
                                  onClick={() => handleOpenReport(event.id)}
                                  disabled={viewingDocId === event.id}
                                  type="button"
                                >
                                  {viewingDocId === event.id ? (
                                    <>
                                      <FiRefreshCw className="spinner-icon-sm" /> Generating Secure
                                      Link...
                                    </>
                                  ) : (
                                    <>
                                      <FiExternalLink /> Open Secure Document
                                    </>
                                  )}
                                </button>
                              </div>
                            </article>
                          ) : (
                            /* ================= APPOINTMENT CARD ================= */
                            <article className="timeline-event-card appointment-card">
                              <div className="card-top-bar">
                                <div className="card-badges-left">
                                  <span className="badge-department">
                                    {event.department || "General Consultation"}
                                  </span>
                                  <span
                                    className={`badge-status ${getStatusBadgeClass(
                                      event.status
                                    )}`}
                                  >
                                    {event.status}
                                  </span>
                                  <span className="badge-mode">
                                    {isVideoConsultation ? (
                                      <>
                                        <FiVideo size={12} /> Video / Online
                                      </>
                                    ) : (
                                      <>
                                        <FiCalendar size={12} /> {event.consultationType}
                                      </>
                                    )}
                                  </span>
                                </div>
                                <div className="card-time-stamp">
                                  <FiClock size={12} />
                                  <span>
                                    {formattedDate} {event.timeSlot && `• ${event.timeSlot}`}
                                  </span>
                                </div>
                              </div>

                              <div className="card-body-content">
                                <h3 className="card-title">{event.title}</h3>

                                <div className="appointment-participants-row">
                                  <div className="participant-chip doctor-chip">
                                    <FiShield size={13} />
                                    <span>
                                      <strong>Physician:</strong> {event.doctorName}
                                    </span>
                                  </div>
                                  {isDoctor && (
                                    <div className="participant-chip patient-chip">
                                      <FiUser size={13} />
                                      <span>
                                        <strong>Patient:</strong> {event.patientName}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Stored clinical reasons / notes if present in database */}
                                {event.reason && (
                                  <p className="card-notes-text">
                                    <strong>Consultation Purpose:</strong> {event.reason}
                                  </p>
                                )}

                                {event.notes && (
                                  <p className="card-notes-text clinical-note">
                                    <strong>Clinical Summary & Advice:</strong> {event.notes}
                                  </p>
                                )}

                                {event.cancellationReason && (
                                  <p className="card-notes-text reason-cancelled">
                                    <strong>Cancellation Reason:</strong>{" "}
                                    {event.cancellationReason}
                                  </p>
                                )}

                                {event.rejectionReason && (
                                  <p className="card-notes-text reason-rejected">
                                    <strong>Rejection Reason:</strong> {event.rejectionReason}
                                  </p>
                                )}
                              </div>

                              {/* Card Actions */}
                              <div className="card-actions-bar">
                                {isVideoConsultation &&
                                  (event.status === "Scheduled" ||
                                    event.status === "Confirmed" ||
                                    event.status === "In Progress") && (
                                    <Link
                                      to={`/video-consultation/${event.id}`}
                                      className="btn-join-video-call"
                                    >
                                      <FiVideo /> Join Video Consultation
                                    </Link>
                                  )}
                              </div>
                            </article>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HealthTimeline;
