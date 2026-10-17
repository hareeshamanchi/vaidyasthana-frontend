import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { adminAPI } from "../services/api";
import { getSocket } from "../services/socket";
import {
  FiShield,
  FiCheckCircle,
  FiXCircle,
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
} from "react-icons/fi";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);

  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "all" | "verified" | "rejected"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Review Modal state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // "verified" | "rejected"
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // 1. Fetch Platform Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminAPI.getStats();
      if (res.data?.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.warn("Notice: Admin stats unavailable:", err.message);
    }
  }, []);

  // 2. Fetch Doctors
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      let res;
      if (activeTab === "pending") {
        res = await adminAPI.getPendingDoctors();
      } else if (activeTab === "all") {
        res = await adminAPI.getAllDoctors();
      } else {
        res = await adminAPI.getAllDoctors({ status: activeTab });
      }

      if (res.data?.success) {
        setDoctors(res.data.doctors || []);
      }
    } catch (err) {
      console.warn("Notice: Doctor directory unavailable:", err.message);
      setErrorMessage(
        err.response?.data?.message ||
          "Failed to load doctor directory. Ensure administrative authorization."
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Initial load
  useEffect(() => {
    if (user && user.role === "admin") {
      fetchDoctors();
      fetchStats();
    }
  }, [user, fetchDoctors, fetchStats]);

  // 3. Socket.IO Real-Time Listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleVerificationUpdate = (data) => {
      fetchDoctors();
      fetchStats();
      if (data?.doctorName) {
        setStatusMessage(
          `Real-Time Event: Dr. ${data.doctorName} credentials updated to "${data.verificationStatus}".`
        );
      }
    };

    socket.on("verification:update", handleVerificationUpdate);

    return () => {
      socket.off("verification:update", handleVerificationUpdate);
    };
  }, [fetchDoctors, fetchStats]);

  // Handle Document Secure Access (15-min SAS URL)
  const handleOpenDocument = async (doctor, docIndex) => {
    try {
      const res = await adminAPI.getDocumentUrl(doctor._id, docIndex);
      if (res.data?.success && res.data.document?.accessUrl) {
        // Open secure temporary SAS URL in a new window
        window.open(res.data.document.accessUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(
          res.data?.document?.storage === "database_fallback"
            ? `Document "${res.data.document.originalName}" metadata recorded. Azure storage is pending configuration.`
            : "Could not generate secure document preview URL."
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to retrieve secure document link.");
    }
  };

  // Submit Review Decision
  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !reviewAction) return;

    if (reviewAction === "rejected" && (!rejectionReason || rejectionReason.trim().length < 5)) {
      alert("Please specify a clear clinical or regulatory reason for rejection (minimum 5 characters).");
      return;
    }

    setSubmittingReview(true);
    try {
      const payload = {
        status: reviewAction,
        rejectionReason: reviewAction === "rejected" ? rejectionReason.trim() : undefined,
        notes: adminNotes.trim(),
      };

      const res = await adminAPI.verifyDoctor(selectedDoctor._id, payload);
      if (res.data?.success) {
        setStatusMessage(
          `Successfully updated Dr. ${selectedDoctor.name}'s status to ${reviewAction.toUpperCase()}.`
        );
        setSelectedDoctor(null);
        setReviewAction(null);
        setRejectionReason("");
        setAdminNotes("");
        fetchDoctors();
        fetchStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record verification decision.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtered doctors list by search
  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name?.toLowerCase().includes(q) ||
      doc.email?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q) ||
      doc.medicalRegistrationNumber?.toLowerCase().includes(q) ||
      doc.city?.toLowerCase().includes(q)
    );
  });

  // Access control guard
  if (!user || user.role !== "admin") {
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
    <div className="admin-dashboard-container">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <div className="admin-badge">
            <FiShield /> Hospital Medical Council Administration
          </div>
          <h1>Clinician Credentialing & Verification</h1>
          <p>
            Review and authenticate medical licenses, identity proofs, and clinical credentials
            before granting patient consultation directory access.
          </p>
        </div>
        <button
          className="btn-admin-refresh"
          onClick={() => {
            fetchDoctors();
            fetchStats();
          }}
          disabled={loading}
          type="button"
        >
          <FiRefreshCw className={loading ? "spin" : ""} /> Refresh Records
        </button>
      </header>

      {/* Live status alert banner */}
      {statusMessage && (
        <div className="admin-alert-banner success" role="status">
          <FiCheckCircle />
          <span>{statusMessage}</span>
          <button
            className="alert-close"
            onClick={() => setStatusMessage("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="admin-alert-banner error" role="alert">
          <FiAlertTriangle />
          <span>{errorMessage}</span>
          <button
            className="alert-close"
            onClick={() => setErrorMessage("")}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="stat-card pending">
          <div className="stat-icon-wrap">
            <FiClock />
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending Verification</span>
            <div className="stat-value">{stats?.pendingDoctors ?? "—"}</div>
            <span className="stat-sub">Awaiting license review</span>
          </div>
        </div>

        <div className="stat-card verified">
          <div className="stat-icon-wrap">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-label">Verified Clinicians</span>
            <div className="stat-value">{stats?.verifiedDoctors ?? "—"}</div>
            <span className="stat-sub">Active in booking directory</span>
          </div>
        </div>

        <div className="stat-card rejected">
          <div className="stat-icon-wrap">
            <FiXCircle />
          </div>
          <div className="stat-content">
            <span className="stat-label">Rejected / Incomplete</span>
            <div className="stat-value">{stats?.rejectedDoctors ?? "—"}</div>
            <span className="stat-sub">Action required by doctor</span>
          </div>
        </div>

        <div className="stat-card platform">
          <div className="stat-icon-wrap">
            <FiActivity />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Appointments</span>
            <div className="stat-value">{stats?.totalAppointments ?? "—"}</div>
            <span className="stat-sub">{stats?.totalPatients ?? "—"} registered patients</span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="admin-workspace-card">
        {/* Navigation Tabs & Search */}
        <div className="workspace-controls-row">
          <div className="admin-tabs" role="tablist">
            <button
              className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => setActiveTab("pending")}
              type="button"
            >
              <FiClock /> Pending Review ({stats?.pendingDoctors ?? 0})
            </button>
            <button
              className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
              type="button"
            >
              <FiUsers /> All Clinicians ({stats?.totalDoctors ?? 0})
            </button>
            <button
              className={`tab-btn ${activeTab === "verified" ? "active" : ""}`}
              onClick={() => setActiveTab("verified")}
              type="button"
            >
              <FiCheckCircle /> Verified ({stats?.verifiedDoctors ?? 0})
            </button>
            <button
              className={`tab-btn ${activeTab === "rejected" ? "active" : ""}`}
              onClick={() => setActiveTab("rejected")}
              type="button"
            >
              <FiXCircle /> Rejected ({stats?.rejectedDoctors ?? 0})
            </button>
          </div>

          <div className="admin-search-wrap">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by clinician, license ID, specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>
        </div>

        {/* Doctors Table / Cards */}
        {loading ? (
          <div className="admin-loading-state">
            <FiRefreshCw className="spin large" />
            <p>Loading clinician compliance records...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="admin-empty-state">
            <FiCheckCircle size={44} className="empty-icon" />
            <h3>No Records in "{activeTab.toUpperCase()}"</h3>
            <p>
              {activeTab === "pending"
                ? "All clinician verification submissions have been reviewed and adjudicated."
                : "No physician profiles match the specified filters."}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Clinician Name & Contact</th>
                  <th>Clinical Credentials</th>
                  <th>Verification Status</th>
                  <th>Submitted Documents</th>
                  <th>Actions & Adjudication</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc) => {
                  const docsList = doc.verificationDocuments || [];
                  const isPending = doc.verificationStatus === "pending";
                  const isVerified = doc.verificationStatus === "verified";
                  const isRejected = doc.verificationStatus === "rejected";

                  return (
                    <tr key={doc._id} className={`status-row-${doc.verificationStatus}`}>
                      {/* Name & Contact */}
                      <td className="doc-identity-cell">
                        <div className="doc-avatar">
                          {doc.name ? doc.name.charAt(0).toUpperCase() : "D"}
                        </div>
                        <div className="doc-identity-details">
                          <strong className="doc-name">{doc.name}</strong>
                          <span className="doc-email">{doc.email}</span>
                          <span className="doc-phone">
                            📱 {doc.phoneNumber || "No phone recorded"}
                          </span>
                          <span className="doc-city">
                            📍 {doc.city || doc.address ? `${doc.city || ""}, ${doc.address || ""}`.trim() : "Address not provided"}
                          </span>
                        </div>
                      </td>

                      {/* Credentials */}
                      <td className="doc-creds-cell">
                        <div className="specialty-badge">
                          {doc.specialization || "General Medicine"}
                        </div>
                        <div className="creds-meta">
                          <span className="creds-label">License No:</span>
                          <code className="creds-val">
                            {doc.medicalRegistrationNumber || "Not provided"}
                          </code>
                        </div>
                        <div className="creds-meta">
                          <span className="creds-label">Degree:</span>
                          <span className="creds-val">{doc.qualifications || "MBBS"}</span>
                        </div>
                        <div className="creds-meta">
                          <span className="creds-label">Experience:</span>
                          <span className="creds-val">{doc.experienceYears ?? 5} years</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="doc-status-cell">
                        <span className={`status-pill ${doc.verificationStatus}`}>
                          {isVerified && <FiCheckCircle />}
                          {isPending && <FiClock />}
                          {isRejected && <FiXCircle />}
                          {doc.verificationStatus === "not_submitted" && <FiAlertTriangle />}
                          {doc.verificationStatus === "not_submitted"
                            ? "Not Submitted"
                            : doc.verificationStatus.toUpperCase()}
                        </span>
                        {doc.verificationReview?.reviewedAt && (
                          <div className="review-timestamp">
                            Reviewed: {new Date(doc.verificationReview.reviewedAt).toLocaleDateString()}
                          </div>
                        )}
                        {isRejected && doc.verificationReview?.rejectionReason && (
                          <div className="rejection-note">
                            <strong>Reason:</strong> {doc.verificationReview.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Submitted Documents */}
                      <td className="doc-files-cell">
                        {docsList.length === 0 ? (
                          <span className="no-docs-tag">No files attached</span>
                        ) : (
                          <div className="docs-buttons-stack">
                            {docsList.map((fileObj, idx) => (
                              <button
                                key={idx}
                                className="btn-view-doc"
                                onClick={() => handleOpenDocument(doc, idx)}
                                title={`Open ${fileObj.documentType} securely`}
                                type="button"
                              >
                                <FiFileText />
                                <span className="doc-type-label">
                                  {fileObj.documentType === "identity_proof"
                                    ? "Govt ID Proof"
                                    : "Medical License"}
                                </span>
                                <FiExternalLink size={12} className="link-icon" />
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="doc-actions-cell">
                        <div className="actions-button-group">
                          <button
                            className="btn-action-approve"
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setReviewAction("verified");
                              setRejectionReason("");
                              setAdminNotes("");
                            }}
                            type="button"
                            title="Authenticate & Approve Clinician"
                          >
                            <FiCheck /> Approve
                          </button>

                          <button
                            className="btn-action-reject"
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setReviewAction("rejected");
                              setRejectionReason(
                                doc.verificationReview?.rejectionReason || ""
                              );
                              setAdminNotes("");
                            }}
                            type="button"
                            title="Reject / Require Resubmission"
                          >
                            <FiX /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal Dialog */}
      {selectedDoctor && reviewAction && (
        <div className="admin-modal-overlay" onClick={() => setSelectedDoctor(null)}>
          <div
            className="admin-review-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <FiShield className="modal-shield-icon" />
                <h3 id="modal-title">
                  {reviewAction === "verified"
                    ? "Approve Clinician Credentials"
                    : "Reject Verification Request"}
                </h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setSelectedDoctor(null)}
                type="button"
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="doctor-summary-box">
                <h4>{selectedDoctor.name}</h4>
                <p>
                  <strong>Specialization:</strong> {selectedDoctor.specialization} |{" "}
                  <strong>License No:</strong> {selectedDoctor.medicalRegistrationNumber}
                </p>
                <p>
                  <strong>Email:</strong> {selectedDoctor.email} |{" "}
                  <strong>Phone:</strong> {selectedDoctor.phoneNumber}
                </p>
              </div>

              {reviewAction === "verified" ? (
                <div className="approve-confirmation-box">
                  <FiCheckCircle className="confirm-icon text-success" />
                  <p>
                    By approving, this physician will be immediately activated across the
                    patient appointment booking directory and will begin receiving consultation schedules.
                  </p>
                </div>
              ) : (
                <div className="reject-reason-box">
                  <label htmlFor="rejection-reason-input">
                    Clinical / Compliance Rejection Reason *
                  </label>
                  <textarea
                    id="rejection-reason-input"
                    rows="3"
                    className="modal-textarea"
                    placeholder="E.g., Medical registration certificate has expired, name mismatch on government ID, blurry scan..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                  <small className="field-hint">
                    This explanation is displayed directly on the doctor's dashboard so they can resubmit valid credentials.
                  </small>
                </div>
              )}

              <div className="notes-box">
                <label htmlFor="admin-notes-input">Internal Audit Notes (Optional)</label>
                <input
                  id="admin-notes-input"
                  type="text"
                  className="modal-input"
                  placeholder="E.g., Verified against State Medical Council register on 2026-10-15"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setSelectedDoctor(null)}
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn-modal-submit ${reviewAction}`}
                onClick={handleConfirmDecision}
                disabled={submittingReview}
              >
                {submittingReview
                  ? "Recording Decision..."
                  : reviewAction === "verified"
                  ? "Confirm & Activate Doctor"
                  : "Submit Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
