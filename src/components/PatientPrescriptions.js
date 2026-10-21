import React, { useState, useEffect, useCallback } from "react";
import "./PatientPrescriptions.css";
import { prescriptionsAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  FiFileText,
  FiDownload,
  FiBell,
  FiEye,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";

const PatientPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [actionStatus, setActionStatus] = useState(null); // { id, type: 'download'|'reminders', loading, message, isSuccess }
  const navigate = useNavigate();

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await prescriptionsAPI.getPrescriptions();
      if (res.data && res.data.success) {
        setPrescriptions(res.data.prescriptions || []);
      }
    } catch (err) {
      console.error("Error fetching patient prescriptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleDownloadPDF = async (rx) => {
    try {
      setActionStatus({
        id: rx._id,
        type: "download",
        loading: true,
        message: "Generating official PDF...",
      });
      await prescriptionsAPI.downloadPDF(rx._id, `Prescription-${rx.prescriptionNumber}.pdf`);
      setActionStatus({
        id: rx._id,
        type: "download",
        loading: false,
        message: "Prescription PDF downloaded successfully!",
        isSuccess: true,
      });
      setTimeout(() => setActionStatus(null), 3500);
    } catch (err) {
      console.error("PDF download failed:", err);
      setActionStatus({
        id: rx._id,
        type: "download",
        loading: false,
        message: "Could not download PDF. Please try again.",
        isSuccess: false,
      });
      setTimeout(() => setActionStatus(null), 4000);
    }
  };

  const handleCreateReminders = async (rx) => {
    try {
      setActionStatus({
        id: rx._id,
        type: "reminders",
        loading: true,
        message: "Scheduling medication doses into your tracker...",
      });
      const res = await prescriptionsAPI.createReminders(rx._id);
      if (res.data && res.data.success) {
        setActionStatus({
          id: rx._id,
          type: "reminders",
          loading: false,
          message: `${res.data.message} • You can view them in Medication Reminders.`,
          isSuccess: true,
          count: res.data.count,
        });
      } else {
        setActionStatus({
          id: rx._id,
          type: "reminders",
          loading: false,
          message: res.data?.message || "Failed to schedule reminders.",
          isSuccess: false,
        });
      }
    } catch (err) {
      console.error("Failed to create reminders:", err);
      setActionStatus({
        id: rx._id,
        type: "reminders",
        loading: false,
        message:
          err.response?.data?.message || "Failed to configure medication reminders.",
        isSuccess: false,
      });
    }
  };

  return (
    <section className="patient-rx-section">
      <div className="patient-rx-header-row">
        <div>
          <div className="patient-rx-badge">
            <FiFileText size={15} /> Verified Electronic Prescriptions
          </div>
          <h3>Your Digital Prescriptions ({prescriptions.length})</h3>
          <p>Official medical prescriptions authored and clinically signed by your hospital doctors</p>
        </div>

        <button
          type="button"
          className="patient-rx-btn-refresh"
          onClick={fetchPrescriptions}
          disabled={loading}
          title="Refresh digital prescriptions"
        >
          <FiRefreshCw className={loading ? "spin" : ""} size={14} /> Refresh
        </button>
      </div>

      {loading && prescriptions.length === 0 ? (
        <div className="patient-rx-empty">
          <FiRefreshCw className="spin" size={24} />
          <p>Retrieving your electronic prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="patient-rx-empty">
          <FiFileText size={32} />
          <p>No digital prescriptions issued yet.</p>
          <span className="patient-rx-empty-sub">
            Prescriptions issued by your clinicians during consultations will appear here with downloadable PDFs and 1-click medication reminder setup.
          </span>
        </div>
      ) : (
        <div className="patient-rx-grid">
          {prescriptions.map((rx) => {
            const isThisAction = actionStatus && actionStatus.id === rx._id;
            const medCount = rx.medications?.length || 0;

            return (
              <div key={rx._id} className="patient-rx-card">
                <div className="patient-rx-card-header">
                  <div>
                    <span className="patient-rx-num">{rx.prescriptionNumber}</span>
                    <h4 className="patient-rx-diag">{rx.diagnosis}</h4>
                  </div>
                  <span className={`patient-rx-status ${rx.status}`}>
                    {rx.status}
                  </span>
                </div>

                <div className="patient-rx-meta-row">
                  <div className="patient-rx-dr-info">
                    <strong>{rx.doctorName}</strong>
                    <span>{rx.doctorSpecialization || "General Medicine"}</span>
                    {rx.hospitalName && (
                      <span className="patient-rx-facility-tag">{rx.hospitalName}</span>
                    )}
                  </div>
                  <div className="patient-rx-date-info">
                    <FiCalendar size={13} />
                    <span>
                      {new Date(rx.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Medications List Preview */}
                <div className="patient-rx-meds-box">
                  <span className="patient-rx-meds-title">
                    Prescribed Medicines ({medCount})
                  </span>
                  <div className="patient-rx-meds-pills">
                    {rx.medications?.map((m, idx) => (
                      <div key={idx} className="patient-rx-med-pill">
                        <strong>{m.name}</strong>
                        <span>
                          {m.dosage} {m.dosageUnit || "mg"} • {m.frequency?.replace(/_/g, " ")} • {m.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Follow up date if present */}
                {rx.followUpDate && (
                  <div className="patient-rx-followup-strip">
                    <span>Follow-Up Due:</span>
                    <strong>
                      {new Date(rx.followUpDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </strong>
                  </div>
                )}

                {/* Action status toast */}
                {isThisAction && (
                  <div
                    className={`patient-rx-status-msg ${
                      actionStatus.isSuccess
                        ? "success"
                        : actionStatus.loading
                        ? "loading"
                        : "error"
                    }`}
                  >
                    {actionStatus.isSuccess ? (
                      <FiCheckCircle size={15} />
                    ) : actionStatus.loading ? (
                      <FiRefreshCw className="spin" size={15} />
                    ) : (
                      <FiAlertCircle size={15} />
                    )}
                    <span>{actionStatus.message}</span>
                    {actionStatus.isSuccess && actionStatus.type === "reminders" && (
                      <button
                        type="button"
                        className="patient-rx-view-reminders-link"
                        onClick={() => navigate("/medications")}
                      >
                        Go to Reminders →
                      </button>
                    )}
                  </div>
                )}

                {/* Card Action Buttons */}
                <div className="patient-rx-actions">
                  <button
                    type="button"
                    className="patient-rx-btn patient-rx-btn-view"
                    onClick={() => setSelectedPrescription(rx)}
                  >
                    <FiEye size={14} /> View Rx
                  </button>

                  <button
                    type="button"
                    className="patient-rx-btn patient-rx-btn-download"
                    onClick={() => handleDownloadPDF(rx)}
                    disabled={isThisAction && actionStatus.loading}
                  >
                    <FiDownload size={14} /> Download PDF
                  </button>

                  <button
                    type="button"
                    className="patient-rx-btn patient-rx-btn-reminder"
                    onClick={() => handleCreateReminders(rx)}
                    disabled={isThisAction && actionStatus.loading}
                    title="Automatically sync these prescribed medications into your daily reminder alarms"
                  >
                    <FiBell size={14} /> Set Reminders
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prescription Details Modal */}
      {selectedPrescription && (
        <div className="patient-rx-modal-overlay" onClick={() => setSelectedPrescription(null)}>
          <div className="patient-rx-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="patient-rx-modal-header">
              <div>
                <span className="patient-rx-num">{selectedPrescription.prescriptionNumber}</span>
                <h4>Medical Prescription</h4>
              </div>
              <button
                type="button"
                className="patient-rx-modal-close"
                onClick={() => setSelectedPrescription(null)}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="patient-rx-modal-body">
              {/* Facility & Doctor Banner */}
              <div className="patient-rx-detail-banner">
                <div>
                  <h5>{selectedPrescription.hospitalName || "Clinical Healthcare Practice"}</h5>
                  {selectedPrescription.hospitalAddress && (
                    <p>{selectedPrescription.hospitalAddress}</p>
                  )}
                </div>
                <div className="patient-rx-detail-dr">
                  <strong>{selectedPrescription.doctorName}</strong>
                  <span>{selectedPrescription.doctorSpecialization} • {selectedPrescription.doctorQualifications}</span>
                  {selectedPrescription.doctorRegistrationNumber && (
                    <span>Medical Reg: {selectedPrescription.doctorRegistrationNumber}</span>
                  )}
                </div>
              </div>

              {/* Diagnosis & Date */}
              <div className="patient-rx-detail-section">
                <span className="patient-rx-label">Clinical Indication / Diagnosis</span>
                <p className="patient-rx-value-bold">{selectedPrescription.diagnosis}</p>
              </div>

              {/* Vitals */}
              {selectedPrescription.vitals && Object.values(selectedPrescription.vitals).some(Boolean) && (
                <div className="patient-rx-detail-section">
                  <span className="patient-rx-label">Recorded Vitals</span>
                  <div className="patient-rx-vitals-row">
                    {selectedPrescription.vitals.bloodPressure && (
                      <span className="patient-rx-vital-pill">BP: {selectedPrescription.vitals.bloodPressure}</span>
                    )}
                    {selectedPrescription.vitals.pulseRate && (
                      <span className="patient-rx-vital-pill">Pulse: {selectedPrescription.vitals.pulseRate} bpm</span>
                    )}
                    {selectedPrescription.vitals.temperature && (
                      <span className="patient-rx-vital-pill">Temp: {selectedPrescription.vitals.temperature}</span>
                    )}
                    {selectedPrescription.vitals.spo2 && (
                      <span className="patient-rx-vital-pill">SpO2: {selectedPrescription.vitals.spo2}%</span>
                    )}
                  </div>
                </div>
              )}

              {/* Prescribed Items Table */}
              <div className="patient-rx-detail-section">
                <span className="patient-rx-label">Rx Prescribed Medications</span>
                <div className="patient-rx-table-wrap">
                  <table className="patient-rx-table">
                    <thead>
                      <tr>
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
                          <td>
                            <strong>{m.name}</strong>
                            {m.instructions && (
                              <div className="patient-rx-table-sub">
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
              </div>

              {/* General Guidance */}
              {selectedPrescription.generalInstructions && (
                <div className="patient-rx-detail-section">
                  <span className="patient-rx-label">Doctor's Advice & Lifestyle Notes</span>
                  <p className="patient-rx-advice-text">{selectedPrescription.generalInstructions}</p>
                </div>
              )}

              {/* Digital Signature Seal */}
              <div className="patient-rx-seal-box">
                <FiCheckCircle size={20} color="#0d9488" />
                <div>
                  <strong>Digitally Signed & Clinically Verified</strong>
                  <p>
                    Verified and authorized electronically by {selectedPrescription.doctorName} on{" "}
                    {new Date(selectedPrescription.signedAt || selectedPrescription.createdAt).toLocaleString("en-US")}
                  </p>
                </div>
              </div>
            </div>

            <div className="patient-rx-modal-footer">
              <button
                type="button"
                className="patient-rx-btn patient-rx-btn-download"
                onClick={() => handleDownloadPDF(selectedPrescription)}
              >
                <FiDownload size={14} /> Download Official PDF
              </button>
              <button
                type="button"
                className="patient-rx-btn patient-rx-btn-reminder"
                onClick={() => handleCreateReminders(selectedPrescription)}
              >
                <FiBell size={14} /> Set Medication Reminders
              </button>
              <button
                type="button"
                className="patient-rx-modal-btn-close"
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

export default PatientPrescriptions;
