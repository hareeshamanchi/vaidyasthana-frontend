import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { followUpsAPI } from "../services/api";
import "./PatientFollowUps.css";
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiUser,
  FiActivity,
  FiArrowRight,
  FiRefreshCw,
  FiInfo,
  FiCheck,
  FiXCircle,
} from "react-icons/fi";

const PatientFollowUps = () => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending_booking' | 'appointment_booked' | 'completed' | 'missed'
  const navigate = useNavigate();

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await followUpsAPI.getFollowUps();
      setFollowUps(res.data?.followUps || []);
    } catch (err) {
      console.error("Error fetching follow-up plans:", err);
      setError("Unable to load follow-up plans at this time.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: followUps.length,
      pending_booking: followUps.filter((f) => f.status === "pending_booking").length,
      appointment_booked: followUps.filter((f) => f.status === "appointment_booked").length,
      completed: followUps.filter((f) => f.status === "completed").length,
      missed: followUps.filter((f) => f.status === "missed").length,
    };
  }, [followUps]);

  // Filtered follow-ups
  const filteredFollowUps = useMemo(() => {
    if (activeTab === "all") return followUps;
    return followUps.filter((f) => f.status === activeTab);
  }, [followUps, activeTab]);

  const handleBookFollowUp = (fu) => {
    const docId = fu.doctorId?._id || fu.doctorId;
    const recDate = fu.recommendedDate ? new Date(fu.recommendedDate).toISOString().slice(0, 10) : "";
    const reasonEnc = encodeURIComponent(fu.reason || "Care Follow-Up");
    navigate(`/appointment?followUpId=${fu._id}&doctorId=${docId}&recommendedDate=${recDate}&reason=${reasonEnc}`);
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return <span className="followup-priority-badge urgent"><FiAlertTriangle size={12} /> Urgent</span>;
      case "soon":
        return <span className="followup-priority-badge soon"><FiClock size={12} /> Soon</span>;
      default:
        return <span className="followup-priority-badge routine"><FiCheck size={12} /> Routine</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "appointment_booked":
        return <span className="followup-status-badge booked"><FiCalendar size={12} /> Appointment Booked</span>;
      case "completed":
        return <span className="followup-status-badge completed"><FiCheckCircle size={12} /> Completed</span>;
      case "missed":
        return <span className="followup-status-badge missed"><FiAlertCircle size={12} /> Needs Attention (Missed)</span>;
      case "cancelled":
        return <span className="followup-status-badge cancelled"><FiXCircle size={12} /> Cancelled</span>;
      default:
        return <span className="followup-status-badge pending"><FiClock size={12} /> Needs Booking</span>;
    }
  };

  return (
    <div className="patient-followups-container" id="care-follow-ups">
      <div className="followups-header-row">
        <div>
          <h3>Doctor Care Follow-Up Plans</h3>
          <p className="followups-subtitle">
            Physician-authored follow-up schedules, diagnostic recommendations, and clinical review instructions.
          </p>
        </div>

        <button
          className="btn-refresh-followups"
          onClick={fetchFollowUps}
          disabled={loading}
          type="button"
          title="Refresh Follow-Up Plans"
        >
          <FiRefreshCw className={loading ? "spin" : ""} size={14} /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="followup-filter-tabs" role="tablist" aria-label="Follow-Up Status Filters">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "all"}
          className={`followup-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Plans <span className="followup-tab-count">{counts.all}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pending_booking"}
          className={`followup-tab-btn ${activeTab === "pending_booking" ? "active" : ""}`}
          onClick={() => setActiveTab("pending_booking")}
        >
          Needs Booking <span className="followup-tab-count highlight">{counts.pending_booking}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "appointment_booked"}
          className={`followup-tab-btn ${activeTab === "appointment_booked" ? "active" : ""}`}
          onClick={() => setActiveTab("appointment_booked")}
        >
          Booked <span className="followup-tab-count">{counts.appointment_booked}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "completed"}
          className={`followup-tab-btn ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Completed <span className="followup-tab-count">{counts.completed}</span>
        </button>
        {counts.missed > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "missed"}
            className={`followup-tab-btn alert ${activeTab === "missed" ? "active" : ""}`}
            onClick={() => setActiveTab("missed")}
          >
            Missed <span className="followup-tab-count missed">{counts.missed}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="followup-error-alert" role="alert">
          <FiAlertCircle /> {error}
        </div>
      )}

      {loading && followUps.length === 0 ? (
        <div className="followup-loading-card">
          <div className="spinner-inline" />
          <p>Retrieving your clinical care follow-up plans...</p>
        </div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="followup-empty-card">
          <div className="followup-empty-icon">
            <FiCheckCircle size={36} />
          </div>
          <h4>No Follow-Up Plans in this View</h4>
          <p>
            {activeTab === "pending_booking"
              ? "Great news! You have scheduled all your pending follow-up consultations."
              : activeTab === "missed"
              ? "You have no missed follow-up appointments."
              : activeTab === "completed"
              ? "Completed follow-up consultations with your physicians will appear here."
              : "When your consulting physician recommends a follow-up consultation or test, it will appear here."}
          </p>
        </div>
      ) : (
        <div className="followup-cards-grid">
          {filteredFollowUps.map((fu) => {
            const isPending = fu.status === "pending_booking";
            const isBooked = fu.status === "appointment_booked";
            const isMissed = fu.status === "missed";
            const isCompleted = fu.status === "completed";
            const isCancelled = fu.status === "cancelled";

            return (
              <div
                key={fu._id}
                className={`followup-card ${fu.priority} ${fu.status}`}
                data-testid={`followup-card-${fu._id}`}
              >
                {/* Top Bar: Badges */}
                <div className="followup-card-topbar">
                  <div className="followup-badges-left">
                    {getStatusBadge(fu.status)}
                    {getPriorityBadge(fu.priority)}
                  </div>

                  <div className="followup-rec-date">
                    <FiCalendar size={13} />
                    <span>Rec. Date: <strong>{formatDate(fu.recommendedDate)}</strong></span>
                  </div>
                </div>

                {/* Main Content: Doctor & Reason */}
                <div className="followup-card-body">
                  <div className="followup-doctor-info">
                    <div className="doctor-avatar-circle">
                      <FiUser size={18} />
                    </div>
                    <div>
                      <h4 className="followup-doctor-name">{fu.doctorName}</h4>
                      <span className="followup-doc-spec">
                        {fu.doctorId?.specialization || "Attending Physician"}
                      </span>
                    </div>
                  </div>

                  <div className="followup-reason-box">
                    <span className="followup-field-label">Care Objective / Reason:</span>
                    <p className="followup-reason-text">{fu.reason}</p>
                  </div>

                  {/* Doctor's Clinical Instructions */}
                  <div className="followup-instructions-box">
                    <div className="instructions-header">
                      <FiInfo size={14} />
                      <span>Physician Clinical Instructions:</span>
                    </div>
                    <p className="instructions-content">{fu.doctorInstructions}</p>
                  </div>

                  {/* Recommended Date Range if present */}
                  {fu.recommendedDateRange && (fu.recommendedDateRange.startDate || fu.recommendedDateRange.endDate) && (
                    <div className="followup-date-range">
                      <span>Suggested Window: </span>
                      <strong>
                        {formatDate(fu.recommendedDateRange.startDate)} – {formatDate(fu.recommendedDateRange.endDate)}
                      </strong>
                    </div>
                  )}

                  {/* Recommended Tests */}
                  {fu.recommendedTests && fu.recommendedTests.length > 0 && (
                    <div className="followup-tests-box">
                      <span className="followup-field-label">Recommended Diagnostic Workup / Tests:</span>
                      <div className="followup-tests-tags">
                        {fu.recommendedTests.map((t, idx) => (
                          <span key={idx} className="test-tag">
                            <FiActivity size={11} /> {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical Notes if present */}
                  {fu.notes && (
                    <div className="followup-notes-box">
                      <span className="followup-field-label">Doctor Notes:</span>
                      <p className="notes-text">{fu.notes}</p>
                    </div>
                  )}

                  {/* Booked Appointment Context */}
                  {isBooked && fu.appointmentId && (
                    <div className="followup-booked-banner">
                      <FiCheckCircle size={15} />
                      <div>
                        <strong>Appointment Scheduled</strong>
                        <p>
                          {formatDate(fu.appointmentId.appointmentDate)} at {fu.appointmentId.timeSlot} ({fu.appointmentId.consultationType || "In-Person"})
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Missed Appointment Notice */}
                  {isMissed && (
                    <div className="followup-missed-banner">
                      <FiAlertCircle size={16} />
                      <div>
                        <strong>Consultation Slot Elapsed</strong>
                        <p>
                          Your scheduled consultation has passed. Please schedule a new appointment slot or contact your clinic care team.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cancelled Notice */}
                  {isCancelled && (
                    <div className="followup-cancelled-banner">
                      <FiXCircle size={15} />
                      <div>
                        <strong>Plan Cancelled by Physician</strong>
                        {fu.cancellationReason && <p>Reason: {fu.cancellationReason}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="followup-card-footer">
                  {isPending && (
                    <button
                      className="btn-book-followup"
                      onClick={() => handleBookFollowUp(fu)}
                      type="button"
                    >
                      <FiCalendar size={14} /> Book Follow-Up Appointment <FiArrowRight size={14} />
                    </button>
                  )}

                  {isMissed && (
                    <button
                      className="btn-book-followup rebook"
                      onClick={() => handleBookFollowUp(fu)}
                      type="button"
                    >
                      <FiRefreshCw size={14} /> Rebook Follow-Up Appointment <FiArrowRight size={14} />
                    </button>
                  )}

                  {isBooked && (
                    <Link to="/appointment" className="btn-view-followup-appt">
                      <FiCalendar size={14} /> View Scheduled Appointment
                    </Link>
                  )}

                  {isCompleted && (
                    <div className="followup-completed-badge">
                      <FiCheckCircle size={14} /> Consultation Completed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientFollowUps;
