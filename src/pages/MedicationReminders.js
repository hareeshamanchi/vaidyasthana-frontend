import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { medicationsAPI } from "../services/api";
import "./MedicationReminders.css";
import {
  FiClock,
  FiArrowLeft,
  FiPlus,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiCalendar,
  FiBell,
  FiPause,
  FiPlay,
  FiTrash2,
  FiEdit3,
  FiActivity,
  FiFileText,
  FiRefreshCw,
  FiInfo,
} from "react-icons/fi";

const MedicationReminders = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Tab & Date State
  const [activeTab, setActiveTab] = useState("doses"); // 'doses' | 'schedules' | 'adherence'
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Daily Doses State
  const [doses, setDoses] = useState([]);
  const [dosesSummary, setDosesSummary] = useState({
    total: 0,
    taken: 0,
    skipped: 0,
    missed: 0,
    scheduled: 0,
  });
  const [loadingDoses, setLoadingDoses] = useState(false);

  // Medication Schedules State
  const [schedules, setSchedules] = useState([]);
  const [scheduleFilter, setScheduleFilter] = useState("active"); // 'active' | 'paused' | 'ended' | 'all'
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Adherence Analytics State
  const [adherenceDays, setAdherenceDays] = useState(30);
  const [adherenceStats, setAdherenceStats] = useState(null);
  const [loadingAdherence, setLoadingAdherence] = useState(false);

  // Prescriptions for Linking
  const [prescriptions, setPrescriptions] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedId, setEditingMedId] = useState(null);
  const [savingMedication, setSavingMedication] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    dosageUnit: "mg",
    frequency: "once_daily",
    reminderTimes: ["08:00"],
    foodTiming: "no_food_restriction",
    instructions: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    prescriptionRef: "",
  });

  // Feedback State
  const [feedback, setFeedback] = useState({ message: "", type: "" });
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  // Snooze Modal / Selector State
  const [snoozeDoseId, setSnoozeDoseId] = useState(null);
  const [snoozeMinutes, setSnoozeMinutes] = useState(15);

  const showFeedback = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: "", type: "" }), 5000);
  };

  // Request browser notification permission
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === "granted") {
          showFeedback("Browser notifications enabled successfully!");
        } else {
          showFeedback("Notification permission was not granted.", "error");
        }
      } catch (err) {
        console.error("Error requesting notification permission:", err);
      }
    }
  };

  // Fetch Daily Doses
  const fetchDoses = useCallback(async (dateStr) => {
    setLoadingDoses(true);
    try {
      const res = await medicationsAPI.getDoses({ date: dateStr });
      if (res.data?.success) {
        setDoses(res.data.doses || []);
        setDosesSummary(
          res.data.summary || {
            total: 0,
            taken: 0,
            skipped: 0,
            missed: 0,
            scheduled: 0,
          }
        );
      }
    } catch (err) {
      console.error("Failed to load daily doses:", err);
      showFeedback("Unable to load doses for the selected date.", "error");
    } finally {
      setLoadingDoses(false);
    }
  }, []);

  // Fetch Medication Schedules
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const res = await medicationsAPI.getMedications({ status: scheduleFilter });
      if (res.data?.success) {
        setSchedules(res.data.medications || []);
      }
    } catch (err) {
      console.error("Failed to load medication schedules:", err);
    } finally {
      setLoadingSchedules(false);
    }
  }, [scheduleFilter]);

  // Fetch Adherence Stats
  const fetchAdherence = useCallback(async (days) => {
    setLoadingAdherence(true);
    try {
      const res = await medicationsAPI.getAdherenceStats({ days });
      if (res.data?.success) {
        setAdherenceStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to load adherence statistics:", err);
    } finally {
      setLoadingAdherence(false);
    }
  }, []);

  // Fetch Prescriptions for linking
  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await medicationsAPI.getPrescriptions();
      if (res.data?.success) {
        setPrescriptions(res.data.prescriptions || []);
      }
    } catch (err) {
      console.error("Failed to load prescriptions:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDoses(selectedDate);
      fetchSchedules();
      fetchPrescriptions();
    }
  }, [user, selectedDate, fetchDoses, fetchSchedules, fetchPrescriptions]);

  useEffect(() => {
    if (activeTab === "adherence" && user) {
      fetchAdherence(adherenceDays);
    }
  }, [activeTab, adherenceDays, user, fetchAdherence]);

  // Dose Quick Action Handlers
  const handleUpdateDoseStatus = async (doseId, status, notes = "") => {
    try {
      const res = await medicationsAPI.updateDoseStatus(doseId, { status, notes });
      if (res.data?.success) {
        showFeedback(`Dose recorded as ${status}.`);
        fetchDoses(selectedDate);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Failed to update dose.", "error");
    }
  };

  const handleSnoozeDose = async (doseId) => {
    try {
      const res = await medicationsAPI.updateDoseStatus(doseId, {
        action: "snooze",
        snoozeMinutes,
      });
      if (res.data?.success) {
        showFeedback(`Dose snoozed for ${snoozeMinutes} minutes.`);
        setSnoozeDoseId(null);
        fetchDoses(selectedDate);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Failed to snooze dose.", "error");
    }
  };

  // Schedule Status Toggle Handlers
  const handleToggleScheduleStatus = async (medId, nextStatus) => {
    try {
      const res = await medicationsAPI.updateStatus(medId, nextStatus);
      if (res.data?.success) {
        showFeedback(`Medication schedule ${nextStatus === "active" ? "resumed" : nextStatus}.`);
        fetchSchedules();
        fetchDoses(selectedDate);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Failed to update schedule status.", "error");
    }
  };

  const handleDeleteSchedule = async (medId) => {
    if (!window.confirm("Are you sure you want to remove this medication schedule?")) return;
    try {
      const res = await medicationsAPI.deleteMedication(medId);
      if (res.data?.success) {
        showFeedback("Medication schedule removed.");
        fetchSchedules();
        fetchDoses(selectedDate);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Failed to delete schedule.", "error");
    }
  };

  // Modal Management
  const handleOpenAddModal = () => {
    setEditingMedId(null);
    setFormData({
      name: "",
      dosage: "",
      dosageUnit: "mg",
      frequency: "once_daily",
      reminderTimes: ["08:00"],
      foodTiming: "no_food_restriction",
      instructions: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      prescriptionRef: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (med) => {
    setEditingMedId(med._id);
    setFormData({
      name: med.name,
      dosage: med.dosage,
      dosageUnit: med.dosageUnit || "mg",
      frequency: med.frequency || "once_daily",
      reminderTimes: med.reminderTimes && med.reminderTimes.length > 0 ? med.reminderTimes : ["08:00"],
      foodTiming: med.foodTiming || "no_food_restriction",
      instructions: med.instructions || "",
      startDate: med.startDate ? med.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
      endDate: med.endDate ? med.endDate.split("T")[0] : "",
      prescriptionRef: med.prescriptionRef?._id || med.prescriptionRef || "",
    });
    setIsModalOpen(true);
  };

  const handleAddTimeSlot = () => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: [...prev.reminderTimes, "12:00"],
    }));
  };

  const handleRemoveTimeSlot = (index) => {
    setFormData((prev) => {
      if (prev.reminderTimes.length <= 1) return prev;
      const updated = prev.reminderTimes.filter((_, i) => i !== index);
      return { ...prev, reminderTimes: updated };
    });
  };

  const handleTimeSlotChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.reminderTimes];
      updated[index] = value;
      return { ...prev, reminderTimes: updated };
    });
  };

  const handleSaveMedication = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showFeedback("Medication name is required.", "error");
      return;
    }
    if (!formData.dosage.trim()) {
      showFeedback("Dosage amount is required.", "error");
      return;
    }

    setSavingMedication(true);
    try {
      const payload = {
        ...formData,
        prescriptionRef: formData.prescriptionRef || null,
        endDate: formData.endDate || null,
      };

      if (editingMedId) {
        await medicationsAPI.updateMedication(editingMedId, payload);
        showFeedback("Medication schedule updated successfully.");
      } else {
        await medicationsAPI.createMedication(payload);
        showFeedback("New medication schedule added.");
      }

      setIsModalOpen(false);
      fetchSchedules();
      fetchDoses(selectedDate);
    } catch (err) {
      showFeedback(err.response?.data?.message || "Failed to save medication.", "error");
    } finally {
      setSavingMedication(false);
    }
  };

  // Date Navigation Helpers
  const handleDateStep = (daysDelta) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  if (authLoading) {
    return (
      <div className="medication-reminders-page" style={{ padding: "4rem", textAlign: "center" }}>
        <p>Loading medical reminders...</p>
      </div>
    );
  }

  return (
    <div className="medication-reminders-page">
      {/* Header */}
      <header className="med-header-section">
        <div className="med-header-inner">
          <div className="med-header-left">
            <button
              className="btn-med-back"
              onClick={() => navigate(user?.role === "doctor" ? "/doctor-dashboard" : "/dashboard")}
            >
              <FiArrowLeft /> Back to Dashboard
            </button>
            <div className="med-header-title-wrap">
              <div className="med-header-icon">
                <FiClock />
              </div>
              <div>
                <h1>Medication Reminders & Dose Tracking</h1>
                <p className="med-header-desc">
                  Maintain treatment adherence, track timely daily doses, and preserve an accurate
                  medication history with your care team.
                </p>
              </div>
            </div>
          </div>

          <div className="med-header-actions">
            <button className="btn-med-secondary" onClick={() => fetchDoses(selectedDate)}>
              <FiRefreshCw /> Refresh
            </button>
            <button className="btn-med-primary" onClick={handleOpenAddModal}>
              <FiPlus /> Add Medication
            </button>
          </div>
        </div>
      </header>

      <main className="med-main-container">
        {/* Feedback Alert */}
        {feedback.message && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              background: feedback.type === "error" ? "#fee2e2" : "#d1fae5",
              color: feedback.type === "error" ? "#991b1b" : "#065f46",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Browser Notifications Permission Banner */}
        {notificationPermission !== "granted" && notificationPermission !== "unsupported" && (
          <div className="med-notification-banner">
            <div className="med-notification-banner-content">
              <FiBell className="med-notification-banner-icon" />
              <div>
                <strong>Enable Browser Medication Alerts:</strong> Get audio-visual popups when doses
                are due. <em>(Note: browser alerts require an open tab or window)</em>.
              </div>
            </div>
            <button className="btn-enable-notifications" onClick={handleRequestNotificationPermission}>
              Enable Alerts
            </button>
          </div>
        )}

        {/* View Tabs */}
        <div className="med-view-tabs" role="tablist">
          <button
            className={`med-tab-btn ${activeTab === "doses" ? "active" : ""}`}
            onClick={() => setActiveTab("doses")}
            role="tab"
            aria-selected={activeTab === "doses"}
          >
            <FiCalendar /> Daily Doses
            <span className="med-tab-badge">{doses.length}</span>
          </button>
          <button
            className={`med-tab-btn ${activeTab === "schedules" ? "active" : ""}`}
            onClick={() => setActiveTab("schedules")}
            role="tab"
            aria-selected={activeTab === "schedules"}
          >
            <FiClock /> All Schedules
            <span className="med-tab-badge">{schedules.length}</span>
          </button>
          <button
            className={`med-tab-btn ${activeTab === "adherence" ? "active" : ""}`}
            onClick={() => setActiveTab("adherence")}
            role="tab"
            aria-selected={activeTab === "adherence"}
          >
            <FiActivity /> Adherence Analytics
          </button>
        </div>

        {/* TAB 1: DAILY DOSES */}
        {activeTab === "doses" && (
          <section className="tab-pane-doses">
            {/* Date Navigator Card */}
            <div className="date-navigator-card">
              <div className="date-nav-controls">
                <button className="btn-date-step" onClick={() => handleDateStep(-1)}>
                  ◀ Yesterday
                </button>
                <button
                  className={`btn-date-step ${isToday ? "active" : ""}`}
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                >
                  Today
                </button>
                <button className="btn-date-step" onClick={() => handleDateStep(1)}>
                  Tomorrow ▶
                </button>
                <input
                  type="date"
                  className="date-picker-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Select date for dose schedule"
                />
              </div>

              {/* Daily Metrics Summary */}
              <div className="daily-metrics-summary">
                <div className="metric-pill">
                  <span className="metric-pill-label">Total Doses</span>
                  <span className="metric-pill-value">{dosesSummary.total}</span>
                </div>
                <div className="metric-pill">
                  <span className="metric-pill-label">Taken</span>
                  <span className="metric-pill-value taken">{dosesSummary.taken}</span>
                </div>
                <div className="metric-pill">
                  <span className="metric-pill-label">Pending</span>
                  <span className="metric-pill-value pending">{dosesSummary.scheduled}</span>
                </div>
                <div className="metric-pill">
                  <span className="metric-pill-label">Missed</span>
                  <span className="metric-pill-value missed">{dosesSummary.missed}</span>
                </div>
              </div>
            </div>

            {/* Doses List */}
            {loadingDoses ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <p>Loading scheduled doses...</p>
              </div>
            ) : doses.length === 0 ? (
              <div className="empty-doses-state">
                <FiClock className="empty-state-icon" />
                <h3>No Doses Scheduled for {selectedDate}</h3>
                <p>You have no active medications scheduled for this date.</p>
                <button className="btn-med-primary" onClick={handleOpenAddModal}>
                  <FiPlus /> Add Medication Schedule
                </button>
              </div>
            ) : (
              <div className="doses-list">
                {doses.map((dose) => {
                  const statusClass = `status-${(dose.status || "scheduled").toLowerCase()}`;
                  return (
                    <article key={dose._id} className={`dose-card ${statusClass}`}>
                      <div className="dose-card-main">
                        <div className="dose-time-box">
                          <div className="dose-time-slot">{dose.reminderTime}</div>
                          <div className="dose-time-label">Scheduled</div>
                        </div>

                        <div className="dose-details-col">
                          <div className="dose-title-row">
                            <span className="dose-med-name">{dose.medicationName}</span>
                            <span className="dose-amount-pill">
                              {dose.dosage} {dose.dosageUnit}
                            </span>
                            <span
                              className={`dose-source-pill ${
                                dose.source === "doctor_prescribed" ? "doctor" : "patient"
                              }`}
                              title={
                                dose.source === "doctor_prescribed"
                                  ? "Prescribed by physician"
                                  : "Self-entered for personal reference"
                              }
                            >
                              {dose.source === "doctor_prescribed"
                                ? "Doctor Prescribed"
                                : "Self-Entered"}
                            </span>
                          </div>

                          <div className="dose-instructions">
                            {dose.foodTiming && dose.foodTiming !== "no_food_restriction" && (
                              <span className="food-timing-tag">
                                • {dose.foodTiming.replace(/_/g, " ")}
                              </span>
                            )}
                            {dose.instructions && <span>• {dose.instructions}</span>}
                          </div>

                          <div className="dose-status-row">
                            <span className={`status-badge ${(dose.status || "scheduled").toLowerCase()}`}>
                              {dose.status === "Taken" && <FiCheck />}
                              {dose.status === "Missed" && <FiAlertTriangle />}
                              {dose.status}
                            </span>
                            {dose.actionTime && (
                              <span style={{ color: "#64748b" }}>
                                Recorded at {new Date(dose.actionTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            {dose.snoozeUntil && (
                              <span className="snooze-indicator">
                                <FiBell /> Snoozed until{" "}
                                {new Date(dose.snoozeUntil).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dose Action Buttons */}
                      <div className="dose-actions">
                        {dose.status === "Scheduled" && (
                          <>
                            <button
                              className="btn-action-take"
                              onClick={() => handleUpdateDoseStatus(dose._id, "Taken")}
                            >
                              <FiCheck /> Take Dose
                            </button>
                            <button
                              className="btn-action-snooze"
                              onClick={() => setSnoozeDoseId(dose._id)}
                            >
                              <FiBell /> Snooze
                            </button>
                            <button
                              className="btn-action-skip"
                              onClick={() => handleUpdateDoseStatus(dose._id, "Skipped")}
                            >
                              <FiX /> Skip
                            </button>
                          </>
                        )}

                        {dose.status === "Taken" && (
                          <button
                            className="btn-action-undo"
                            onClick={() => handleUpdateDoseStatus(dose._id, "Scheduled")}
                            title="Undo taken status"
                          >
                            Mark as Uncompleted
                          </button>
                        )}

                        {dose.status === "Skipped" && (
                          <button
                            className="btn-action-take"
                            onClick={() => handleUpdateDoseStatus(dose._id, "Taken")}
                          >
                            <FiCheck /> Take Now
                          </button>
                        )}

                        {dose.status === "Missed" && (
                          <button
                            className="btn-action-take"
                            onClick={() => handleUpdateDoseStatus(dose._id, "Taken")}
                          >
                            <FiCheck /> Record as Taken
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: ALL SCHEDULES */}
        {activeTab === "schedules" && (
          <section className="tab-pane-schedules">
            <div className="schedules-filter-bar">
              <div className="schedules-filter-buttons">
                {["all", "active", "paused", "ended"].map((status) => (
                  <button
                    key={status}
                    className={`btn-filter-status ${scheduleFilter === status ? "active" : ""}`}
                    onClick={() => setScheduleFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <button className="btn-med-primary" onClick={handleOpenAddModal}>
                <FiPlus /> Add New Schedule
              </button>
            </div>

            {loadingSchedules ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <p>Loading medication schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="empty-doses-state">
                <FiClock className="empty-state-icon" />
                <h3>No Medication Schedules Found</h3>
                <p>Create a schedule to automate reminders and daily tracking.</p>
                <button className="btn-med-primary" onClick={handleOpenAddModal}>
                  <FiPlus /> Add Medication Schedule
                </button>
              </div>
            ) : (
              <div className="schedules-grid">
                {schedules.map((med) => (
                  <div key={med._id} className="schedule-card">
                    <div>
                      <div className="schedule-card-header">
                        <div>
                          <h3 className="schedule-name">{med.name}</h3>
                          <div className="schedule-dosage-sub">
                            {med.dosage} {med.dosageUnit} • {med.frequency.replace(/_/g, " ")}
                          </div>
                        </div>
                        <span className={`schedule-status-badge ${med.status}`}>
                          {med.status}
                        </span>
                      </div>

                      <div className="schedule-info-list" style={{ marginTop: "1rem" }}>
                        <div className="schedule-info-item">
                          <FiClock className="schedule-info-item-icon" />
                          <div className="reminder-times-chips">
                            {med.reminderTimes?.map((t, idx) => (
                              <span key={idx} className="time-chip">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {med.foodTiming && med.foodTiming !== "no_food_restriction" && (
                          <div className="schedule-info-item">
                            <span style={{ fontSize: "0.8rem", color: "#0284c7" }}>
                              • Timing: {med.foodTiming.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}

                        {med.instructions && (
                          <div className="schedule-info-item">
                            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                              Note: {med.instructions}
                            </span>
                          </div>
                        )}

                        <div className="schedule-info-item" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          <FiCalendar className="schedule-info-item-icon" />
                          <span>
                            From {new Date(med.startDate).toLocaleDateString()}{" "}
                            {med.endDate ? `to ${new Date(med.endDate).toLocaleDateString()}` : "(Ongoing)"}
                          </span>
                        </div>

                        {med.prescriptionRef && (
                          <div className="schedule-info-item" style={{ fontSize: "0.8rem", color: "#4f46e5" }}>
                            <FiFileText className="schedule-info-item-icon" />
                            <span>Linked to {med.prescriptionRef.originalName || "Uploaded Prescription"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="schedule-card-footer">
                      <div className="schedule-actions-left">
                        <button
                          className="btn-card-action"
                          onClick={() => handleOpenEditModal(med)}
                        >
                          <FiEdit3 /> Edit
                        </button>
                        {med.status === "active" ? (
                          <button
                            className="btn-card-action"
                            onClick={() => handleToggleScheduleStatus(med._id, "paused")}
                          >
                            <FiPause /> Pause
                          </button>
                        ) : med.status === "paused" ? (
                          <button
                            className="btn-card-action"
                            onClick={() => handleToggleScheduleStatus(med._id, "active")}
                          >
                            <FiPlay /> Resume
                          </button>
                        ) : null}
                        {med.status !== "ended" && (
                          <button
                            className="btn-card-action"
                            onClick={() => handleToggleScheduleStatus(med._id, "ended")}
                          >
                            End
                          </button>
                        )}
                      </div>

                      <button
                        className="btn-card-action danger"
                        onClick={() => handleDeleteSchedule(med._id)}
                        title="Delete schedule"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: ADHERENCE ANALYTICS */}
        {activeTab === "adherence" && (
          <section className="tab-pane-adherence">
            <div className="adherence-analytics-wrap">
              <div className="adherence-window-selector">
                <span>Evaluation Window:</span>
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    className={`btn-window-option ${adherenceDays === days ? "active" : ""}`}
                    onClick={() => setAdherenceDays(days)}
                  >
                    Last {days} Days
                  </button>
                ))}
              </div>

              {loadingAdherence ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  <p>Calculating adherence analytics...</p>
                </div>
              ) : adherenceStats ? (
                <>
                  <div className="adherence-cards-grid">
                    {/* Score Card */}
                    <div className="adherence-score-card">
                      <div
                        className="adherence-gauge-wrap"
                        style={{
                          "--adherence-deg": `${(adherenceStats.adherenceRate / 100) * 360}deg`,
                        }}
                      >
                        <div className="adherence-gauge-inner">
                          <span className="adherence-percent-text">
                            {adherenceStats.adherenceRate}%
                          </span>
                          <span className="adherence-percent-label">Adherence</span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                        Based on {adherenceStats.totalEvaluated} past evaluated doses. Future doses
                        are not penalized.
                      </p>
                    </div>

                    {/* Breakdown Card */}
                    <div className="adherence-breakdown-card">
                      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
                        Dose Completion Summary ({adherenceDays} Days)
                      </h3>
                      <div className="breakdown-stats-row">
                        <div className="breakdown-stat-box taken">
                          <div className="breakdown-stat-num" style={{ color: "#059669" }}>
                            {adherenceStats.takenCount}
                          </div>
                          <div className="breakdown-stat-label">Taken Doses</div>
                        </div>
                        <div className="breakdown-stat-box missed">
                          <div className="breakdown-stat-num" style={{ color: "#dc2626" }}>
                            {adherenceStats.missedCount}
                          </div>
                          <div className="breakdown-stat-label">Missed Doses</div>
                        </div>
                        <div className="breakdown-stat-box">
                          <div className="breakdown-stat-num" style={{ color: "#475569" }}>
                            {adherenceStats.skippedCount}
                          </div>
                          <div className="breakdown-stat-label">Skipped Doses</div>
                        </div>
                        <div className="breakdown-stat-box">
                          <div className="breakdown-stat-num" style={{ color: "#0f172a" }}>
                            {adherenceStats.totalEvaluated}
                          </div>
                          <div className="breakdown-stat-label">Total Evaluated</div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "#64748b",
                          background: "#f8fafc",
                          padding: "0.65rem 0.85rem",
                          borderRadius: "6px",
                          marginTop: "0.5rem",
                        }}
                      >
                        <FiInfo style={{ marginRight: "0.35rem" }} />
                        High adherence (80%+) correlates with significantly improved chronic
                        disease outcomes. If you regularly miss doses, discuss schedule adjustments
                        with your physician.
                      </div>
                    </div>
                  </div>

                  {/* Per-Medication Breakdown Table */}
                  <div className="adherence-table-card">
                    <h3>Medication Adherence Breakdown</h3>
                    {adherenceStats.medicationBreakdown?.length === 0 ? (
                      <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                        No medication doses recorded in this timeframe.
                      </p>
                    ) : (
                      <table className="adherence-table">
                        <thead>
                          <tr>
                            <th>Medication</th>
                            <th>Dosage</th>
                            <th>Taken</th>
                            <th>Missed</th>
                            <th>Skipped</th>
                            <th>Total</th>
                            <th>Adherence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adherenceStats.medicationBreakdown.map((item) => (
                            <tr key={item.medicationId}>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td>
                                {item.dosage} {item.dosageUnit}
                              </td>
                              <td style={{ color: "#059669", fontWeight: 600 }}>{item.taken}</td>
                              <td style={{ color: "#dc2626", fontWeight: 600 }}>{item.missed}</td>
                              <td style={{ color: "#475569" }}>{item.skipped}</td>
                              <td>{item.total}</td>
                              <td>
                                <strong style={{ color: item.adherenceRate >= 80 ? "#059669" : "#d97706" }}>
                                  {item.adherenceRate}%
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}

        {/* Clinical Disclaimer Banner */}
        <div className="med-clinical-disclaimer-banner" role="complementary">
          <FiAlertTriangle className="disclaimer-icon" />
          <div>
            <strong>Important Clinical Safety Disclaimer:</strong> This medication reminder and dose
            tracking system is provided to assist personal adherence and routine tracking. It is not an
            automated prescribing system, medical diagnosis, or replacement for qualified clinical
            judgment. If you miss a dose or experience side effects, contact your doctor or
            pharmacist before making adjustments. Never double your medication dose without explicit
            instructions from your healthcare provider.
          </div>
        </div>
      </main>

      {/* MODAL: ADD / EDIT MEDICATION */}
      {isModalOpen && (
        <div className="med-modal-overlay" role="dialog" aria-modal="true">
          <div className="med-modal-container">
            <div className="med-modal-header">
              <h2>{editingMedId ? "Edit Medication Schedule" : "Add Medication Schedule"}</h2>
              <button
                className="btn-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSaveMedication}>
              <div className="med-modal-body">
                <div className="form-group">
                  <label htmlFor="medName">Medication Name *</label>
                  <input
                    id="medName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Metformin, Amlodipine, Paracetamol"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="medDosage">Dosage Amount *</label>
                    <input
                      id="medDosage"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 500, 10, 1"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="medUnit">Unit</label>
                    <select
                      id="medUnit"
                      className="form-select"
                      value={formData.dosageUnit}
                      onChange={(e) => setFormData({ ...formData, dosageUnit: e.target.value })}
                    >
                      <option value="mg">mg</option>
                      <option value="ml">ml</option>
                      <option value="tablet">tablet(s)</option>
                      <option value="capsule">capsule(s)</option>
                      <option value="drops">drops</option>
                      <option value="puffs">puffs</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="medFreq">Frequency</label>
                    <select
                      id="medFreq"
                      className="form-select"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    >
                      <option value="once_daily">Once Daily</option>
                      <option value="twice_daily">Twice Daily</option>
                      <option value="thrice_daily">Thrice Daily</option>
                      <option value="four_times_daily">Four Times Daily</option>
                      <option value="as_needed">As Needed</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="medFood">Food Instruction</label>
                    <select
                      id="medFood"
                      className="form-select"
                      value={formData.foodTiming}
                      onChange={(e) => setFormData({ ...formData, foodTiming: e.target.value })}
                    >
                      <option value="no_food_restriction">No food restriction</option>
                      <option value="before_food">Before food</option>
                      <option value="after_food">After food</option>
                      <option value="with_food">With food</option>
                      <option value="empty_stomach">Empty stomach</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Reminder Times (24h format)</label>
                  <div className="reminder-times-editor">
                    {formData.reminderTimes.map((time, index) => (
                      <div key={index} className="time-input-row">
                        <input
                          type="time"
                          className="form-input"
                          value={time}
                          onChange={(e) => handleTimeSlotChange(index, e.target.value)}
                          required
                        />
                        {formData.reminderTimes.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove-time"
                            onClick={() => handleRemoveTimeSlot(index)}
                            title="Remove time slot"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-add-time"
                      onClick={handleAddTimeSlot}
                    >
                      + Add Another Time
                    </button>
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="medStartDate">Start Date *</label>
                    <input
                      id="medStartDate"
                      type="date"
                      className="form-input"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="medEndDate">End Date (Optional)</label>
                    <input
                      id="medEndDate"
                      type="date"
                      className="form-input"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {prescriptions.length > 0 && (
                  <div className="form-group">
                    <label htmlFor="medPrescription">Link Uploaded Prescription (Optional)</label>
                    <select
                      id="medPrescription"
                      className="form-select"
                      value={formData.prescriptionRef}
                      onChange={(e) => setFormData({ ...formData, prescriptionRef: e.target.value })}
                    >
                      <option value="">-- No prescription linked --</option>
                      {prescriptions.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.originalName} ({new Date(p.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="medInstructions">Special Notes / Clinical Instructions</label>
                  <textarea
                    id="medInstructions"
                    className="form-textarea"
                    rows="2"
                    placeholder="e.g. Take with a full glass of water. Avoid taking before bedtime."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>

                <div
                  style={{
                    background: "#f1f5f9",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    color: "#475569",
                  }}
                >
                  <FiInfo style={{ marginRight: "0.35rem" }} />
                  Self-entered schedules are preserved for personal tracking and will be indicated as
                  such to your clinical care team.
                </div>
              </div>

              <div className="med-modal-footer">
                <button
                  type="button"
                  className="btn-med-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-med-primary"
                  disabled={savingMedication}
                >
                  {savingMedication ? "Saving..." : editingMedId ? "Update Schedule" : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SNOOZE SELECTION MODAL */}
      {snoozeDoseId && (
        <div className="med-modal-overlay" role="dialog" aria-modal="true">
          <div className="med-modal-container" style={{ maxWidth: "400px" }}>
            <div className="med-modal-header">
              <h2>Snooze Reminder</h2>
              <button
                className="btn-modal-close"
                onClick={() => setSnoozeDoseId(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="med-modal-body">
              <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "#475569" }}>
                Select how long to postpone this dose reminder. The dose will remain scheduled and not
                marked completed.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    className={`btn-date-step ${snoozeMinutes === mins ? "active" : ""}`}
                    onClick={() => setSnoozeMinutes(mins)}
                  >
                    {mins} Minutes
                  </button>
                ))}
              </div>
            </div>
            <div className="med-modal-footer">
              <button
                type="button"
                className="btn-med-secondary"
                onClick={() => setSnoozeDoseId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-med-primary"
                onClick={() => handleSnoozeDose(snoozeDoseId)}
              >
                Confirm Snooze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationReminders;
