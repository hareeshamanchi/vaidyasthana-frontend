import React, { useState, useEffect, useCallback } from "react";
import "./DoctorPrescriptionManagement.css";
import { prescriptionsAPI } from "../services/api";
import DoctorPrescriptionModal from "./DoctorPrescriptionModal";
import {
  FiFileText,
  FiPlus,
  FiDownload,
  FiEye,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

const DoctorPrescriptionManagement = ({
  associatedPatients = [],
  prefillRequest = null,
  onClearPrefillRequest,
}) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalPrefill, setModalPrefill] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const res = await prescriptionsAPI.getPrescriptions(params);
      if (res.data && res.data.success) {
        setPrescriptions(res.data.prescriptions || []);
      }
    } catch (err) {
      console.error("Error fetching doctor prescriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // Handle external prefill request from consultation row
  useEffect(() => {
    if (prefillRequest) {
      setModalPrefill(prefillRequest);
      setIsModalOpen(true);
      if (onClearPrefillRequest) {
        onClearPrefillRequest();
      }
    }
  }, [prefillRequest, onClearPrefillRequest]);

  const handleDownloadPDF = async (rx) => {
    try {
      setActionMessage({ type: "info", text: `Generating PDF for ${rx.prescriptionNumber}...` });
      await prescriptionsAPI.downloadPDF(rx._id, `Prescription-${rx.prescriptionNumber}.pdf`);
      setActionMessage({ type: "success", text: `Prescription ${rx.prescriptionNumber} downloaded!` });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      setActionMessage({ type: "error", text: "Failed to download prescription PDF." });
    }
  };


  return (
    <section className="dr-rx-section">
      <div className="dr-rx-header-row">
        <div>
          <div className="dr-rx-title-badge">
            <FiFileText size={16} /> Clinical E-Prescriptions
          </div>
          <h3>Digital Prescriptions Issued ({prescriptions.length})</h3>
          <p>Electronically authored, clinically verified prescriptions under your practice</p>
        </div>

        <div className="dr-rx-header-actions">
          <button
            type="button"
            className="dr-rx-btn-refresh"
            onClick={fetchPrescriptions}
            disabled={loading}
            title="Refresh prescriptions"
          >
            <FiRefreshCw className={loading ? "spin" : ""} size={14} />
          </button>
          <button
            type="button"
            className="dr-rx-btn-create"
            onClick={() => {
              setModalPrefill(null);
              setIsModalOpen(true);
            }}
          >
            <FiPlus size={16} /> New Digital Rx
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`dr-rx-toast dr-rx-toast-${actionMessage.type}`}>
          {actionMessage.text}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="dr-rx-filters">
        <button
          className={`dr-rx-tab ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
          type="button"
        >
          All ({prescriptions.length})
        </button>
        <button
          className={`dr-rx-tab ${statusFilter === "active" ? "active" : ""}`}
          onClick={() => setStatusFilter("active")}
          type="button"
        >
          Active
        </button>
        <button
          className={`dr-rx-tab ${statusFilter === "completed" ? "active" : ""}`}
          onClick={() => setStatusFilter("completed")}
          type="button"
        >
          Completed
        </button>
        <button
          className={`dr-rx-tab ${statusFilter === "cancelled" ? "active" : ""}`}
          onClick={() => setStatusFilter("cancelled")}
          type="button"
        >
          Cancelled
        </button>
      </div>

      {/* Prescriptions List / Table */}
      {loading && prescriptions.length === 0 ? (
        <div className="dr-rx-empty">
          <FiRefreshCw className="spin" size={24} />
          <p>Loading digital prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="dr-rx-empty">
          <FiFileText size={32} />
          <p>No digital prescriptions found in this view.</p>
          <button
            type="button"
            className="dr-rx-btn-create-sub"
            onClick={() => {
              setModalPrefill(null);
              setIsModalOpen(true);
            }}
          >
            <FiPlus size={14} /> Author First Prescription
          </button>
        </div>
      ) : (
        <div className="dr-rx-table-container">
          <table className="dr-rx-table">
            <thead>
              <tr>
                <th>Rx Number</th>
                <th>Patient Details</th>
                <th>Diagnosis</th>
                <th>Medications</th>
                <th>Date of Issue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => {
                const patientObj = rx.patientId && typeof rx.patientId === "object" ? rx.patientId : null;
                const pName = patientObj?.name || rx.patientName || "Patient";
                const pPhone = patientObj?.phoneNumber || rx.patientPhone || "";
                const medCount = rx.medications?.length || 0;

                return (
                  <tr key={rx._id}>
                    <td>
                      <span className="dr-rx-num-pill">{rx.prescriptionNumber}</span>
                      {rx.hospitalName && (
                        <div className="dr-rx-hospital-tag">{rx.hospitalName}</div>
                      )}
                    </td>
                    <td>
                      <strong>{pName}</strong>
                      {pPhone && <div className="dr-rx-sub-text">{pPhone}</div>}
                    </td>
                    <td>
                      <span className="dr-rx-diag-text">{rx.diagnosis}</span>
                    </td>
                    <td>
                      <span className="dr-rx-med-count">
                        {medCount} {medCount === 1 ? "medicine" : "medicines"}
                      </span>
                      <div className="dr-rx-med-preview">
                        {rx.medications?.slice(0, 2).map((m, idx) => (
                          <span key={idx} className="dr-rx-med-name-tag">
                            {m.name} ({m.dosage}{m.dosageUnit || "mg"})
                          </span>
                        ))}
                        {medCount > 2 && <span className="dr-rx-more-tag">+{medCount - 2} more</span>}
                      </div>
                    </td>
                    <td>
                      <div className="dr-rx-sub-text">
                        <FiCalendar size={11} />{" "}
                        {new Date(rx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td>
                      <span className={`dr-rx-status-pill dr-rx-status-${rx.status}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td>
                      <div className="dr-rx-actions">
                        <button
                          type="button"
                          className="dr-rx-btn-action dr-rx-btn-view"
                          onClick={() => setSelectedPrescription(rx)}
                          title="View Full Prescription"
                        >
                          <FiEye size={13} /> View
                        </button>
                        <button
                          type="button"
                          className="dr-rx-btn-action dr-rx-btn-dl"
                          onClick={() => handleDownloadPDF(rx)}
                          title="Download PDF"
                        >
                          <FiDownload size={13} /> PDF
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

      {/* Prescription Creation Modal */}
      <DoctorPrescriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalPrefill(null);
        }}
        onPrescriptionCreated={() => {
          fetchPrescriptions();
        }}
        prefillData={modalPrefill}
        associatedPatients={associatedPatients}
      />

      {/* Prescription View Modal */}
      {selectedPrescription && (
        <div className="dr-rx-view-overlay" onClick={() => setSelectedPrescription(null)}>
          <div className="dr-rx-view-container" onClick={(e) => e.stopPropagation()}>
            <div className="dr-rx-view-header">
              <div className="dr-rx-header-title">
                <FiFileText size={18} color="#0d9488" />
                <div>
                  <h4>Prescription #{selectedPrescription.prescriptionNumber}</h4>
                  <span className="dr-rx-view-date">
                    Issued on {new Date(selectedPrescription.createdAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="dr-rx-view-close"
                onClick={() => setSelectedPrescription(null)}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="dr-rx-view-body">
              {/* Facility & Doctor Strip */}
              <div className="dr-rx-view-section dr-rx-facility-strip">
                <div>
                  <h5 className="dr-rx-facility-name">
                    {selectedPrescription.hospitalName || "Independent Clinical Practice"}
                  </h5>
                  {selectedPrescription.hospitalCode && (
                    <span className="dr-rx-facility-sub">
                      Code: {selectedPrescription.hospitalCode}
                    </span>
                  )}
                </div>
                <div className="dr-rx-doctor-meta">
                  <strong>{selectedPrescription.doctorName}</strong>
                  <span>{selectedPrescription.doctorSpecialization} • {selectedPrescription.doctorQualifications}</span>
                  {selectedPrescription.doctorRegistrationNumber && (
                    <span>Reg No: {selectedPrescription.doctorRegistrationNumber}</span>
                  )}
                </div>
              </div>

              {/* Patient & Diagnosis */}
              <div className="dr-rx-view-grid">
                <div>
                  <span className="dr-rx-view-label">Patient</span>
                  <strong>{selectedPrescription.patientName}</strong>
                  {selectedPrescription.patientPhone && <div>Ph: {selectedPrescription.patientPhone}</div>}
                </div>
                <div>
                  <span className="dr-rx-view-label">Clinical Indication / Diagnosis</span>
                  <p className="dr-rx-view-diag">{selectedPrescription.diagnosis}</p>
                </div>
              </div>

              {/* Vitals if present */}
              {selectedPrescription.vitals && Object.values(selectedPrescription.vitals).some(Boolean) && (
                <div className="dr-rx-view-vitals">
                  <span className="dr-rx-view-label">Recorded Vitals</span>
                  <div className="dr-rx-vitals-pills">
                    {selectedPrescription.vitals.bloodPressure && (
                      <span>BP: {selectedPrescription.vitals.bloodPressure}</span>
                    )}
                    {selectedPrescription.vitals.pulseRate && (
                      <span>Pulse: {selectedPrescription.vitals.pulseRate} bpm</span>
                    )}
                    {selectedPrescription.vitals.temperature && (
                      <span>Temp: {selectedPrescription.vitals.temperature}</span>
                    )}
                    {selectedPrescription.vitals.weight && (
                      <span>Weight: {selectedPrescription.vitals.weight}</span>
                    )}
                    {selectedPrescription.vitals.spo2 && (
                      <span>SpO2: {selectedPrescription.vitals.spo2}%</span>
                    )}
                  </div>
                </div>
              )}

              {/* Prescribed Medications */}
              <div className="dr-rx-view-meds-box">
                <span className="dr-rx-view-label">Rx Prescribed Medications</span>
                <table className="dr-rx-view-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Timing</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPrescription.medications?.map((m, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{m.name}</strong>
                          {m.instructions && (
                            <div className="dr-rx-view-instructions">
                              Note: {m.instructions}
                            </div>
                          )}
                        </td>
                        <td>{m.dosage} {m.dosageUnit || "mg"}</td>
                        <td>{m.frequency?.replace(/_/g, " ")}</td>
                        <td>{m.timing?.replace(/_/g, " ")}</td>
                        <td>{m.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* General Advice */}
              {selectedPrescription.generalInstructions && (
                <div className="dr-rx-view-advice">
                  <span className="dr-rx-view-label">General Advice</span>
                  <p>{selectedPrescription.generalInstructions}</p>
                </div>
              )}

              {/* Follow Up */}
              {selectedPrescription.followUpDate && (
                <div className="dr-rx-view-followup">
                  <span className="dr-rx-view-label">Recommended Follow-Up</span>
                  <p>
                    {new Date(selectedPrescription.followUpDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}

              {/* Digital Seal */}
              <div className="dr-rx-view-seal">
                <FiCheckCircle size={18} color="#0d9488" />
                <div>
                  <strong>Digitally Signed & Clinically Verified</strong>
                  <p>
                    Signed electronically by {selectedPrescription.doctorName} on{" "}
                    {new Date(selectedPrescription.signedAt || selectedPrescription.createdAt).toLocaleString("en-US")}
                  </p>
                </div>
              </div>
            </div>

            <div className="dr-rx-view-footer">
              <button
                type="button"
                className="dr-rx-view-dl-btn"
                onClick={() => handleDownloadPDF(selectedPrescription)}
              >
                <FiDownload size={14} /> Download PDF
              </button>
              <button
                type="button"
                className="dr-rx-view-close-btn"
                onClick={() => setSelectedPrescription(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DoctorPrescriptionManagement;
