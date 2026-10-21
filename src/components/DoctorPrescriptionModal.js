import React, { useState, useEffect } from "react";
import "./DoctorPrescriptionModal.css";
import { prescriptionsAPI } from "../services/api";
import {
  FiX,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiShield,
  FiUser,
  FiActivity,
} from "react-icons/fi";

const ROUTE_OPTIONS = [
  "Oral",
  "Topical",
  "Inhalation",
  "Intravenous (IV)",
  "Intramuscular (IM)",
  "Sublingual",
  "Ophthalmic",
  "Otic",
  "Nasal",
  "Other",
];

const FREQUENCY_OPTIONS = [
  { value: "once_daily", label: "Once daily (1-0-0 or 0-0-1)" },
  { value: "twice_daily", label: "Twice daily (1-0-1)" },
  { value: "thrice_daily", label: "Thrice daily (1-1-1)" },
  { value: "four_times_daily", label: "Four times daily (1-1-1-1)" },
  { value: "as_needed", label: "As needed / SOS" },
  { value: "custom", label: "Custom regimen" },
];

const TIMING_OPTIONS = [
  { value: "after_food", label: "After meals (Post-prandial)" },
  { value: "before_food", label: "Before meals (Pre-prandial)" },
  { value: "with_food", label: "With meals" },
  { value: "empty_stomach", label: "On empty stomach" },
  { value: "no_food_restriction", label: "No food restrictions" },
];

const createEmptyMedication = () => ({
  name: "",
  dosage: "",
  dosageUnit: "mg",
  route: "Oral",
  frequency: "twice_daily",
  timing: "after_food",
  duration: "5 days",
  instructions: "",
});

const DoctorPrescriptionModal = ({
  isOpen,
  onClose,
  onPrescriptionCreated,
  prefillData = null,
  associatedPatients = [],
}) => {
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    pulseRate: "",
    temperature: "",
    weight: "",
    spo2: "",
  });
  const [medications, setMedications] = useState([createEmptyMedication()]);
  const [generalInstructions, setGeneralInstructions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (prefillData) {
        setPatientId(prefillData.patientId || "");
        setAppointmentId(prefillData.appointmentId || null);
        if (prefillData.reason) {
          setDiagnosis(prefillData.reason);
        }
      } else {
        setPatientId("");
        setAppointmentId(null);
        setDiagnosis("");
      }
      setVitals({
        bloodPressure: "",
        pulseRate: "",
        temperature: "",
        weight: "",
        spo2: "",
      });
      setMedications([createEmptyMedication()]);
      setGeneralInstructions("");
      setFollowUpDate("");
      setIsSigned(false);
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen, prefillData]);

  if (!isOpen) return null;

  const handleMedicationChange = (index, field, value) => {
    setMedications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddMedication = () => {
    setMedications((prev) => [...prev, createEmptyMedication()]);
  };

  const handleRemoveMedication = (index) => {
    if (medications.length <= 1) return;
    setMedications((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVitalsChange = (field, value) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!patientId) {
      setErrorMessage("Please select a patient for this prescription.");
      return;
    }

    if (!diagnosis.trim()) {
      setErrorMessage("Please enter a clinical diagnosis or medical indication.");
      return;
    }

    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      if (!med.name.trim()) {
        setErrorMessage(`Medication #${i + 1} is missing a name.`);
        return;
      }
      if (!med.dosage.trim()) {
        setErrorMessage(`Please enter dosage for '${med.name}'.`);
        return;
      }
      if (!med.duration.trim()) {
        setErrorMessage(`Please enter duration (e.g., '5 days') for '${med.name}'.`);
        return;
      }
    }

    if (!isSigned) {
      setErrorMessage(
        "Clinician digital sign-off is mandatory. Please review and confirm your authorization."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        patientId,
        appointmentId,
        diagnosis: diagnosis.trim(),
        vitals,
        medications,
        generalInstructions: generalInstructions.trim(),
        followUpDate: followUpDate || null,
        isSigned: true,
      };

      const res = await prescriptionsAPI.createPrescription(payload);
      if (res.data && res.data.success) {
        setSuccessMessage("Digital prescription issued and digitally signed successfully!");
        if (onPrescriptionCreated) {
          onPrescriptionCreated(res.data.prescription);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.data?.message || "Failed to create prescription.");
      }
    } catch (err) {
      console.error("Prescription creation error:", err);
      setErrorMessage(
        err.response?.data?.message ||
          "Failed to issue prescription. Please verify your inputs and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rx-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rx-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="rx-modal-header">
          <div className="rx-header-title">
            <div className="rx-badge-pill">
              <FiFileText size={16} /> Digital Rx
            </div>
            <h3>Author & Sign Medical Prescription</h3>
          </div>
          <button className="rx-modal-close" onClick={onClose} type="button" aria-label="Close">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rx-modal-form">
          {errorMessage && (
            <div className="rx-alert rx-alert-error">
              <FiAlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rx-alert rx-alert-success">
              <FiCheckCircle size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Patient Selector */}
          <div className="rx-form-section">
            <label className="rx-section-label">
              <FiUser /> Patient Information
            </label>
            {prefillData && prefillData.patientName ? (
              <div className="rx-prefilled-patient">
                <div>
                  <strong>{prefillData.patientName}</strong>
                  {prefillData.patientPhone && (
                    <span className="rx-patient-sub"> • {prefillData.patientPhone}</span>
                  )}
                </div>
                <span className="rx-verified-tag">Pre-selected from Consultation</span>
              </div>
            ) : (
              <select
                className="rx-input"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">Select Registered Patient...</option>
                {associatedPatients.map((pat) => (
                  <option key={pat._id || pat.id} value={pat._id || pat.id}>
                    {pat.name} {pat.phoneNumber ? `(${pat.phoneNumber})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Diagnosis & Vitals */}
          <div className="rx-form-grid-2">
            <div className="rx-form-group">
              <label className="rx-label">
                Clinical Diagnosis / Indication <span className="req">*</span>
              </label>
              <input
                type="text"
                className="rx-input"
                placeholder="e.g. Acute Bronchitis, Type 2 Diabetes Mellitus"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
              />
            </div>
            <div className="rx-form-group">
              <label className="rx-label">
                Recommended Follow-Up Date
              </label>
              <input
                type="date"
                className="rx-input"
                value={followUpDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
          </div>

          {/* Vitals Strip */}
          <div className="rx-vitals-strip">
            <span className="rx-vitals-title">
              <FiActivity size={13} /> Patient Vitals (Optional)
            </span>
            <div className="rx-vitals-grid">
              <input
                type="text"
                placeholder="BP (e.g. 120/80)"
                value={vitals.bloodPressure}
                onChange={(e) => handleVitalsChange("bloodPressure", e.target.value)}
                className="rx-vital-input"
              />
              <input
                type="text"
                placeholder="Pulse (bpm)"
                value={vitals.pulseRate}
                onChange={(e) => handleVitalsChange("pulseRate", e.target.value)}
                className="rx-vital-input"
              />
              <input
                type="text"
                placeholder="Temp (e.g. 98.6 F)"
                value={vitals.temperature}
                onChange={(e) => handleVitalsChange("temperature", e.target.value)}
                className="rx-vital-input"
              />
              <input
                type="text"
                placeholder="Weight (kg)"
                value={vitals.weight}
                onChange={(e) => handleVitalsChange("weight", e.target.value)}
                className="rx-vital-input"
              />
              <input
                type="text"
                placeholder="SpO2 (%)"
                value={vitals.spo2}
                onChange={(e) => handleVitalsChange("spo2", e.target.value)}
                className="rx-vital-input"
              />
            </div>
          </div>

          {/* Medications List */}
          <div className="rx-medications-section">
            <div className="rx-med-header-row">
              <label className="rx-section-label">
                <FiFileText /> Prescribed Medications ({medications.length})
              </label>
              <button
                type="button"
                className="rx-btn-add-med"
                onClick={handleAddMedication}
              >
                <FiPlus size={14} /> Add Medication
              </button>
            </div>

            {medications.map((med, index) => (
              <div key={index} className="rx-med-card">
                <div className="rx-med-card-header">
                  <span className="rx-med-number">#{index + 1}</span>
                  {medications.length > 1 && (
                    <button
                      type="button"
                      className="rx-btn-remove-med"
                      onClick={() => handleRemoveMedication(index)}
                      title="Remove Medication"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="rx-med-grid-top">
                  <div className="rx-form-group rx-flex-2">
                    <label className="rx-med-label">Medication Name *</label>
                    <input
                      type="text"
                      className="rx-input"
                      placeholder="e.g. Amoxicillin, Paracetamol"
                      value={med.name}
                      onChange={(e) => handleMedicationChange(index, "name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="rx-form-group rx-flex-1">
                    <label className="rx-med-label">Dosage *</label>
                    <input
                      type="text"
                      className="rx-input"
                      placeholder="e.g. 500, 625"
                      value={med.dosage}
                      onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)}
                      required
                    />
                  </div>
                  <div className="rx-form-group rx-flex-1">
                    <label className="rx-med-label">Unit</label>
                    <select
                      className="rx-input"
                      value={med.dosageUnit}
                      onChange={(e) => handleMedicationChange(index, "dosageUnit", e.target.value)}
                    >
                      <option value="mg">mg</option>
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="tablet">tablet(s)</option>
                      <option value="capsule">capsule(s)</option>
                      <option value="drops">drops</option>
                      <option value="puff">puff(s)</option>
                    </select>
                  </div>
                  <div className="rx-form-group rx-flex-1">
                    <label className="rx-med-label">Route</label>
                    <select
                      className="rx-input"
                      value={med.route}
                      onChange={(e) => handleMedicationChange(index, "route", e.target.value)}
                    >
                      {ROUTE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rx-med-grid-bottom">
                  <div className="rx-form-group rx-flex-2">
                    <label className="rx-med-label">Frequency *</label>
                    <select
                      className="rx-input"
                      value={med.frequency}
                      onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)}
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rx-form-group rx-flex-2">
                    <label className="rx-med-label">Timing Relation</label>
                    <select
                      className="rx-input"
                      value={med.timing}
                      onChange={(e) => handleMedicationChange(index, "timing", e.target.value)}
                    >
                      {TIMING_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rx-form-group rx-flex-1">
                    <label className="rx-med-label">Duration *</label>
                    <input
                      type="text"
                      className="rx-input"
                      placeholder="e.g. 5 days, 2 weeks"
                      value={med.duration}
                      onChange={(e) => handleMedicationChange(index, "duration", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="rx-form-group rx-med-instructions-row">
                  <label className="rx-med-label">Special Administration Note</label>
                  <input
                    type="text"
                    className="rx-input rx-input-sub"
                    placeholder="e.g. Take with plenty of water, do not crush tablet"
                    value={med.instructions}
                    onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* General Advice */}
          <div className="rx-form-group">
            <label className="rx-label">General Advice & Lifestyle / Dietary Guidance</label>
            <textarea
              className="rx-textarea"
              rows={2}
              placeholder="e.g. Low sodium diet, drink 2.5L water daily, avoid strenuous exercise, rest adequately."
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
            />
          </div>

          {/* Mandatory Clinician Sign-Off Banner (Requirement 8) */}
          <div className="rx-signoff-card">
            <div className="rx-signoff-header">
              <FiShield className="rx-shield-icon" />
              <div>
                <h4>Mandatory Clinician Sign-Off & Legal Authorization</h4>
                <p>
                  Vaidyasthana strictly prohibits automated or AI-invented prescriptions. All
                  medications, dosages, and instructions must be confirmed and authorized by a
                  licensed healthcare clinician.
                </p>
              </div>
            </div>
            <label className="rx-checkbox-label">
              <input
                type="checkbox"
                checked={isSigned}
                onChange={(e) => setIsSigned(e.target.checked)}
                required
              />
              <span className="rx-checkbox-text">
                I hereby confirm that I have personally evaluated this clinical case, formulated this
                therapeutic regimen, and digitally sign this prescription under my registered medical
                qualifications.
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="rx-modal-actions">
            <button
              type="button"
              className="rx-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rx-btn-submit"
              disabled={isSubmitting || !isSigned}
            >
              {isSubmitting ? "Digitally Signing & Issuing..." : "Issue & Digitally Sign Rx"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorPrescriptionModal;
