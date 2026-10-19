import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { medicationsAPI } from "../services/api";
import { getSocket } from "../services/socket";
import {
  getDuePendingDoses,
  getSpokenAlarmSettings,
  speakMedicationReminder,
  stopSpokenMedicationAlarm,
  DEFAULT_REPEAT_INTERVAL_SEC,
} from "../utils/medicationAudio";
import { FiBell, FiCheck, FiClock, FiX } from "react-icons/fi";
import "./MedicationAlarmListener.css";

/**
 * MedicationAlarmListener
 *
 * Runs across all pages of the Vaidyasthana web application.
 * When the patient is viewing other sections (e.g., Dashboard, Appointments, Timeline, Diet),
 * it monitors scheduled medication doses and plays the spoken medication alarm
 * with repeating clinical beeps every 90 seconds (or configured interval) while a dose remains pending.
 */
const MedicationAlarmListener = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [activeDueDoses, setActiveDueDoses] = useState([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastAlertTimeRef = useRef(null);

  const isMedicationPage =
    location.pathname === "/medications" || location.pathname === "/medication-reminders";

  // Check today's doses from the backend
  const checkDueDoses = useCallback(async () => {
    if (!user || user.role === "doctor" || user.role === "admin" || isMedicationPage) {
      setActiveDueDoses([]);
      return;
    }

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await medicationsAPI.getDoses({ date: todayStr });
      if (res.data?.success && Array.isArray(res.data.doses)) {
        const due = getDuePendingDoses(res.data.doses, Date.now());
        const safe = Array.isArray(due) ? due : [];
        setActiveDueDoses(safe);
        if (safe.length === 0) {
          stopSpokenMedicationAlarm();
          lastAlertTimeRef.current = null;
          setIsDismissed(false);
        }
      }
    } catch (err) {
      // Silently ignore background polling errors
    }
  }, [user, isMedicationPage]);

  // Periodic polling every 30 seconds when on non-medication pages
  useEffect(() => {
    if (!user || isMedicationPage) {
      stopSpokenMedicationAlarm();
      return;
    }

    checkDueDoses();
    const interval = setInterval(checkDueDoses, 30000);
    return () => clearInterval(interval);
  }, [user, isMedicationPage, checkDueDoses]);

  // Real-time socket listener for background dose alerts
  useEffect(() => {
    if (!user || isMedicationPage) return;
    const socket = getSocket();
    if (!socket) return;

    const handleAlert = () => {
      checkDueDoses();
    };

    socket.on("medication:due_repeat", handleAlert);
    socket.on("notification:new", handleAlert);

    return () => {
      socket.off("medication:due_repeat", handleAlert);
      socket.off("notification:new", handleAlert);
    };
  }, [user, isMedicationPage, checkDueDoses]);

  // 90-second repeating spoken alarm engine
  useEffect(() => {
    if (!user || isMedicationPage || activeDueDoses.length === 0 || isDismissed) {
      return;
    }

    const settings = getSpokenAlarmSettings();
    if (!settings.spokenAlarmEnabled) {
      return;
    }

    const intervalSec = settings.repeatIntervalSec || DEFAULT_REPEAT_INTERVAL_SEC;
    const intervalMs = intervalSec * 1000;

    const runAlarmCheck = () => {
      const now = Date.now();
      if (lastAlertTimeRef.current === null) {
        lastAlertTimeRef.current = now;
        speakMedicationReminder({ dueDoses: activeDueDoses, settings });
      } else {
        const elapsed = now - lastAlertTimeRef.current;
        if (elapsed >= intervalMs) {
          lastAlertTimeRef.current = now;
          speakMedicationReminder({ dueDoses: activeDueDoses, settings });
        }
      }
    };

    runAlarmCheck();
    const timer = setInterval(runAlarmCheck, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [user, isMedicationPage, activeDueDoses, isDismissed]);

  // Clean up when navigating to /medications
  useEffect(() => {
    if (isMedicationPage) {
      stopSpokenMedicationAlarm();
      setActiveDueDoses([]);
      lastAlertTimeRef.current = null;
    }
  }, [isMedicationPage]);

  // Take dose action
  const handleTakeDose = async (doseId) => {
    stopSpokenMedicationAlarm();
    try {
      await medicationsAPI.updateDoseStatus(doseId, { status: "Taken", notes: "" });
      checkDueDoses();
    } catch (err) {
      console.warn("Failed to mark dose taken from background listener:", err);
    }
  };

  // Snooze dose action
  const handleSnoozeDose = async (doseId) => {
    stopSpokenMedicationAlarm();
    try {
      await medicationsAPI.updateDoseStatus(doseId, { action: "snooze", snoozeMinutes: 15 });
      checkDueDoses();
    } catch (err) {
      console.warn("Failed to snooze dose from background listener:", err);
    }
  };

  const handleDismiss = () => {
    stopSpokenMedicationAlarm();
    setIsDismissed(true);
  };

  const safeDueDoses = Array.isArray(activeDueDoses) ? activeDueDoses : [];

  if (isMedicationPage || safeDueDoses.length === 0 || isDismissed) {
    return null;
  }

  const primaryDose = safeDueDoses[0];
  const medicineNames = Array.from(
    new Set(safeDueDoses.map((d) => d.medicationName).filter(Boolean))
  ).join(", ");

  return (
    <aside
      className="med-alarm-floating-toast"
      role="alert"
      aria-label="Pending Medication Alarm"
    >
      <div className="med-floating-icon-wrap" aria-hidden="true">
        <FiBell />
      </div>

      <div className="med-floating-body">
        <div className="med-floating-title-row">
          <span className="med-floating-title">Medication Due Now</span>
          <span className="med-floating-count">({activeDueDoses.length})</span>
        </div>
        <p className="med-floating-text">
          <strong>{medicineNames || "Medication"}</strong> — Time to take your scheduled dose.
        </p>
      </div>

      <div className="med-floating-actions">
        <button
          type="button"
          className="btn-floating-take"
          onClick={() => handleTakeDose(primaryDose._id)}
          title="Take dose now"
        >
          <FiCheck /> Take
        </button>
        <button
          type="button"
          className="btn-floating-snooze"
          onClick={() => handleSnoozeDose(primaryDose._id)}
          title="Snooze 15 minutes"
        >
          <FiClock /> Snooze
        </button>
        <button
          type="button"
          className="btn-floating-view"
          onClick={() => {
            stopSpokenMedicationAlarm();
            navigate("/medications");
          }}
          title="Open Medication Reminders"
        >
          View All
        </button>
        <button
          type="button"
          className="btn-floating-dismiss"
          onClick={handleDismiss}
          title="Dismiss spoken alert"
          aria-label="Dismiss alert"
        >
          <FiX />
        </button>
      </div>
    </aside>
  );
};

export default MedicationAlarmListener;
