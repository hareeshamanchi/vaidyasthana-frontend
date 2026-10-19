import React, { useEffect, useState, useCallback, useMemo, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./Appointment.css";
import { appointmentsAPI, authAPI } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { getSocket } from "../services/socket";
import {
  sortAppointmentsDesc,
  sortUpcomingAppointments,
  partitionAppointments,
  getAppointmentDateTimeMs,
} from "../utils/appointmentSorting";
import ConsultationJoinButton from "../components/ConsultationJoinButton";
import { useConsultationTimer } from "../utils/consultationWindow";
import {
  FiCalendar,
  FiClock,
  FiPlus,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiRefreshCw,
  FiActivity,
  FiFileText,
  FiUser,
  FiShield,
  FiAlertCircle,
  FiPhone,
  FiMapPin,
  FiDollarSign,
  FiAward,
  FiMail,
} from "react-icons/fi";

export const CLINIC_TIMEZONE =
  process.env.REACT_APP_CLINIC_TIMEZONE ||
  process.env.REACT_APP_TIMEZONE ||
  "Asia/Kolkata";

export const getCurrentClinicTime = (tz = CLINIC_TIMEZONE) => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    for (const p of parts) map[p.type] = p.value;

    const year = map.year;
    const month = map.month;
    const day = map.day;
    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(map.minute, 10);

    const dateStr = `${year}-${month}-${day}`;
    const currentMinutes = hour * 60 + minute;

    return { dateStr, currentMinutes, hour, minute };
  } catch (err) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return {
      dateStr: `${year}-${month}-${day}`,
      currentMinutes: d.getHours() * 60 + d.getMinutes(),
      hour: d.getHours(),
      minute: d.getMinutes(),
    };
  }
};

export const parseSlotToMinutes = (timeSlotStr) => {
  if (!timeSlotStr || typeof timeSlotStr !== "string") return -1;
  const startPart = timeSlotStr.split("-")[0]?.trim();
  const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const Appointment = () => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const isDoctor = user?.role === "doctor";
  const currentTime = useConsultationTimer(15000);

  const [appointments, setAppointments] = useState([]);
  const [viewTab, setViewTab] = useState("all"); // 'all' | 'upcoming' | 'past'

  // Partition appointments into upcoming (nearest first) and past (most recent first)
  const { upcoming: upcomingAppointments, past: pastAppointments } = useMemo(() => {
    return partitionAppointments(appointments, currentTime);
  }, [appointments, currentTime]);

  const [timer, setTimer] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Cancellation Modal State
  const [cancelModalAppt, setCancelModalAppt] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const keepApptBtnRef = useRef(null);

  // Verified Doctors from Atlas
  const [doctorsList, setDoctorsList] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Available Time Slots
  const [slotsData, setSlotsData] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  // Profile Incomplete State
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [patientPhone, setPatientPhone] = useState(user?.phoneNumber || "");
  const [patientAddress, setPatientAddress] = useState(user?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const getTodayISO = useCallback(() => {
    return getCurrentClinicTime(CLINIC_TIMEZONE).dateStr;
  }, []);

  const [clinicNow, setClinicNow] = useState(() => getCurrentClinicTime(CLINIC_TIMEZONE));

  useEffect(() => {
    const timer = setInterval(() => {
      setClinicNow(getCurrentClinicTime(CLINIC_TIMEZONE));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Helper to determine if an appointment date/time is in the past in clinic timezone
  const checkIsPast = (appointmentDate, timeSlot) => {
    if (!appointmentDate) return false;
    let apptDateStr = "";
    if (typeof appointmentDate === "string") {
      const match = appointmentDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) apptDateStr = `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (!apptDateStr) {
      const d = new Date(appointmentDate);
      if (isNaN(d.getTime())) return false;
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      apptDateStr = `${y}-${m}-${day}`;
    }

    if (apptDateStr < clinicNow.dateStr) {
      return true;
    }

    if (apptDateStr === clinicNow.dateStr && timeSlot) {
      const slotMins = parseSlotToMinutes(timeSlot);
      if (slotMins !== -1 && slotMins <= clinicNow.currentMinutes) {
        return true;
      }
    }

    return false;
  };

  // Helper to determine if an appointment is eligible for patient cancellation
  const isAppointmentCancellable = (app) => {
    if (!app) return false;
    const status = String(app.status || "").trim().toUpperCase();
    if (status !== "SCHEDULED" && status !== "CONFIRMED") {
      return false;
    }
    if (checkIsPast(app.appointmentDate, app.timeSlot)) {
      return false;
    }
    return true;
  };

  // Booking Form State
  const [formData, setFormData] = useState({
    doctorId: "",
    doctorName: "",
    department: "",
    appointmentDate: getTodayISO(),
    timeSlot: "",
    consultationType: "In-Person",
    type: "Consultation",
    notes: "",
    reason: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Slots for selected Doctor and Date
  const fetchSlots = useCallback(async (docId, dateStr) => {
    if (!docId || !dateStr) {
      setSlotsData([]);
      return;
    }

    setLoadingSlots(true);
    setSlotsError("");
    try {
      const res = await appointmentsAPI.getSlots(docId, dateStr, CLINIC_TIMEZONE);
      const slots = res.data?.slots || [];
      setSlotsData(slots);
    } catch (err) {
      console.error("Error loading slots:", err);
      setSlotsError(err.response?.data?.message || "Could not calculate doctor's available slots.");
      setSlotsData([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Dynamically compute processed slots with real-time past check against clinic clock
  const processedSlots = useMemo(() => {
    if (!slotsData || slotsData.length === 0) return [];

    const selectedDate = formData.appointmentDate;
    const isPastDate = Boolean(selectedDate && selectedDate < clinicNow.dateStr);
    const isToday = Boolean(selectedDate && selectedDate === clinicNow.dateStr);

    return slotsData.map((slot) => {
      const slotMins = parseSlotToMinutes(slot.timeSlot);
      let isPast = Boolean(slot.isPast);

      if (isPastDate) {
        isPast = true;
      } else if (isToday) {
        if (slotMins !== -1 && slotMins <= clinicNow.currentMinutes) {
          isPast = true;
        }
      } else {
        isPast = false;
      }

      const isBooked = Boolean(slot.isBooked);
      const isAvailable = !isBooked && !isPast;

      let reason = slot.reason || "Available";
      if (isPast) {
        reason = isPastDate ? "Appointment date has passed" : "Time slot has passed";
      } else if (isBooked) {
        reason = "Booked by another patient";
      }

      return {
        ...slot,
        isPast,
        isBooked,
        isAvailable,
        reason,
      };
    });
  }, [slotsData, formData.appointmentDate, clinicNow]);

  // Automatically clear selected slot if it becomes invalid, booked, or elapsed
  useEffect(() => {
    if (!formData.timeSlot) return;

    if (processedSlots.length > 0) {
      const currentSelected = processedSlots.find(
        (s) => s.timeSlot === formData.timeSlot
      );
      if (
        !currentSelected ||
        !currentSelected.isAvailable ||
        currentSelected.isPast ||
        currentSelected.isBooked
      ) {
        setFormData((prev) => ({ ...prev, timeSlot: "" }));
      }
    }
  }, [processedSlots, formData.timeSlot]);

  // 2. Fetch Verified Doctors from Atlas (for patient booking)
  const fetchDoctors = useCallback(async () => {
    if (isDoctor) return;
    setLoadingDoctors(true);
    try {
      const res = await appointmentsAPI.getDoctors();
      const docs = res.data?.doctors || [];
      setDoctorsList(docs);

      if (docs.length > 0) {
        const found = docs.find((d) => d._id === formData.doctorId);
        const selectedDoc = found || docs[0];
        const formattedName = selectedDoc.name.startsWith("Dr.") ? selectedDoc.name : `Dr. ${selectedDoc.name}`;
        const initialDate = formData.appointmentDate || getTodayISO();
        setFormData((prev) => ({
          ...prev,
          doctorId: selectedDoc._id,
          doctorName: formattedName,
          department: selectedDoc.specialization || "General Medicine",
          appointmentDate: prev.appointmentDate || initialDate,
        }));
        // Pre-fetch slots for this doctor and the selected date
        fetchSlots(selectedDoc._id, initialDate);
      }
    } catch (err) {
      console.error("Failed to load doctors:", err);
      setErrorMessage("Could not load verified doctors directory.");
    } finally {
      setLoadingDoctors(false);
    }
  }, [formData.doctorId, formData.appointmentDate, fetchSlots, getTodayISO, isDoctor]);

  // 3. Fetch User's Appointments
  const fetchAppointments = useCallback(async () => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      const res = await appointmentsAPI.getAppointments();
      const list = res.data?.appointments || [];

      // Sort appointments descending (latest date and time first)
      const sortedDesc = sortAppointmentsDesc(list);
      setAppointments(sortedDesc);

      // Find the nearest upcoming future consultation for the countdown clock
      const now = new Date().getTime();
      const upcomingList = sortUpcomingAppointments(list, now);
      const nextAppt = upcomingList[0] || null;
      if (nextAppt) {
        setNextAppointment(nextAppt);
        const exactTimeMs = getAppointmentDateTimeMs(nextAppt.appointmentDate, nextAppt.timeSlot);
        const diff = exactTimeMs - now;
        setTimer(diff > 0 ? diff : 0);
      } else {
        setNextAppointment(null);
        setTimer(null);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load and account switch
  useEffect(() => {
    setAppointments([]);
    fetchAppointments();
    if (!isDoctor) {
      fetchDoctors();
    }
  }, [fetchAppointments, fetchDoctors, isDoctor, user]);

  // Sync user profile fields
  useEffect(() => {
    if (user) {
      setPatientPhone(user.phoneNumber || "");
      setPatientAddress(user.address || "");
      if (user.phoneNumber && user.address) {
        setProfileIncomplete(false);
      }
    }
  }, [user]);

  // 4. Socket.IO Real-time Synchronization
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRealtimeAppointment = (data) => {
      // Re-fetch user appointments
      fetchAppointments();

      // If viewing slots for this doctor and date, refresh slots
      if (
        formData.doctorId &&
        formData.appointmentDate &&
        data?.appointment?.doctorId === formData.doctorId
      ) {
        fetchSlots(formData.doctorId, formData.appointmentDate);
      }

      if (data?.type === "created") {
        setStatusMessage(`Real-time update: New appointment scheduled (${data.appointment?.timeSlot}).`);
      } else if (data?.type === "updated") {
        setStatusMessage(
          `Appointment update: Dr. ${data.appointment?.doctorName} marked consultation as "${data.appointment?.status}".`
        );
      }
    };

    socket.on("appointment:update", handleRealtimeAppointment);

    return () => {
      socket.off("appointment:update", handleRealtimeAppointment);
    };
  }, [fetchAppointments, fetchSlots, formData.doctorId, formData.appointmentDate]);

  // Periodic polling (30s) to keep appointments and statuses synchronized in real time
  useEffect(() => {
    if (!user) return;
    const pollTimer = setInterval(() => {
      fetchAppointments();
    }, 30000);
    return () => clearInterval(pollTimer);
  }, [user, fetchAppointments]);

  // Live countdown timer
  useEffect(() => {
    if (timer !== null && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => (prev - 1000 > 0 ? prev - 1000 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Modal scroll lock & Escape listener
  useEffect(() => {
    if (showBookModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setShowBookModal(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showBookModal]);

  const formatTimeParts = (timeInMillis) => {
    if (!timeInMillis || timeInMillis <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const days = Math.floor(timeInMillis / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeInMillis % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeInMillis % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeInMillis % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  };

  const handleOpenBookingModal = useCallback(() => {
    const todayStr = getCurrentClinicTime(CLINIC_TIMEZONE).dateStr;
    const candidateDate =
      formData.appointmentDate && formData.appointmentDate >= todayStr
        ? formData.appointmentDate
        : todayStr;

    setFormData((prev) => ({
      ...prev,
      appointmentDate: candidateDate,
      timeSlot: "",
    }));
    setSlotsError("");
    setShowBookModal(true);
    fetchDoctors();
    if (formData.doctorId) {
      fetchSlots(formData.doctorId, candidateDate);
    }
  }, [formData.appointmentDate, formData.doctorId, fetchDoctors, fetchSlots]);

  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    const found = doctorsList.find((d) => d._id === docId);
    if (found) {
      const formattedName = found.name.startsWith("Dr.") ? found.name : `Dr. ${found.name}`;
      setFormData((prev) => ({
        ...prev,
        doctorId: found._id,
        doctorName: formattedName,
        department: found.specialization || "General Medicine",
        timeSlot: "",
      }));
      if (formData.appointmentDate) {
        fetchSlots(found._id, formData.appointmentDate);
      }
    }
  };

  const handleDateChange = (e) => {
    const chosenDate = e.target.value;
    setFormData((prev) => ({
      ...prev,
      appointmentDate: chosenDate,
      timeSlot: "",
    }));
    setSlotsError("");
    if (!chosenDate) {
      setSlotsData([]);
      return;
    }
    if (formData.doctorId) {
      fetchSlots(formData.doctorId, chosenDate);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfileAndContinue = async (e) => {
    e.preventDefault();
    const cleanPhone = patientPhone.replace(/[\s-]/g, "");
    if (!cleanPhone || !/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      alert("Please enter a valid 10-15 digit phone number (e.g. +91 9876543210).");
      return;
    }
    if (!patientAddress || patientAddress.trim().length < 5) {
      alert("Please enter your complete address (minimum 5 characters).");
      return;
    }

    setSavingProfile(true);
    try {
      await authAPI.updateProfile({
        phoneNumber: cleanPhone,
        address: patientAddress.trim(),
      });
      setProfileIncomplete(false);
      setStatusMessage("Patient contact details updated successfully.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update profile details.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doctorId) {
      alert("Please select a doctor.");
      return;
    }
    if (!formData.appointmentDate) {
      alert("Please choose an appointment date.");
      return;
    }
    if (!formData.timeSlot) {
      alert("Please select an available time slot.");
      return;
    }

    // Check client profile completeness first
    if (!user?.phoneNumber && !patientPhone) {
      setProfileIncomplete(true);
      return;
    }

    // Validate date and slot against clinic timezone before submission
    const currentClinic = getCurrentClinicTime(CLINIC_TIMEZONE);
    if (formData.appointmentDate < currentClinic.dateStr) {
      alert("The selected appointment date has already passed. Please choose today or a future date.");
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      return;
    }

    if (formData.appointmentDate === currentClinic.dateStr) {
      const slotMins = parseSlotToMinutes(formData.timeSlot);
      if (slotMins !== -1 && slotMins <= currentClinic.currentMinutes) {
        alert(
          `The selected time slot (${formData.timeSlot}) has already passed for today. Please select an upcoming slot.`
        );
        setFormData((prev) => ({ ...prev, timeSlot: "" }));
        fetchSlots(formData.doctorId, formData.appointmentDate);
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const consultationReason = formData.reason || formData.notes || "";
      await appointmentsAPI.createAppointment({
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        department: formData.department,
        appointmentDate: formData.appointmentDate,
        timeSlot: formData.timeSlot,
        timezone: CLINIC_TIMEZONE,
        consultationType: formData.consultationType,
        type: formData.type,
        notes: consultationReason,
        reason: consultationReason,
        patientName: user?.name || "Patient",
      });

      setStatusMessage(
        `Consultation confirmed with ${formData.doctorName} for ${formData.appointmentDate} at ${formData.timeSlot}!`
      );
      setShowBookModal(false);
      setFormData((prev) => ({
        ...prev,
        appointmentDate: getTodayISO(),
        timeSlot: "",
        notes: "",
        reason: "",
      }));
      setSlotsData([]);
      fetchAppointments();
    } catch (err) {
      console.error("Booking failed:", err);
      if (err.response?.status === 409) {
        setFormData((prev) => ({ ...prev, timeSlot: "" }));
        alert(
          err.response?.data?.message ||
            "Slot Conflict: This time slot was just booked by another patient! Please select another available slot."
        );
        // Refresh slots immediately
        fetchSlots(formData.doctorId, formData.appointmentDate);
      } else if (err.response?.status === 400 && err.response?.data?.message?.includes("passed")) {
        setFormData((prev) => ({ ...prev, timeSlot: "" }));
        alert(err.response?.data?.message);
        fetchSlots(formData.doctorId, formData.appointmentDate);
      } else if (err.response?.data?.profileIncomplete) {
        setProfileIncomplete(true);
        setErrorMessage(
          err.response?.data?.message ||
            "Please provide your contact phone and address to confirm booking."
        );
      } else {
        alert(
          err.response?.data?.message ||
            "Failed to schedule appointment. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Cancellation Modal Handlers
  const handleOpenCancelModal = (appt) => {
    if (!appt) return;
    if (!isAppointmentCancellable(appt)) {
      setErrorMessage("This appointment cannot be cancelled because it is completed, cancelled, rejected, or in the past.");
      return;
    }
    setCancelError("");
    setCancelModalAppt(appt);
  };

  const handleDismissCancelModal = useCallback(() => {
    if (isCancelling) return;
    setCancelModalAppt(null);
    setCancelError("");
  }, [isCancelling]);

  const handleConfirmCancellation = async () => {
    if (!cancelModalAppt || isCancelling) return;

    setIsCancelling(true);
    setCancelError("");

    try {
      const res = await appointmentsAPI.updateAppointment(cancelModalAppt._id, { status: "Cancelled" });
      if (res.data?.success) {
        setStatusMessage("Appointment cancelled successfully.");
        setCancelModalAppt(null);
        await fetchAppointments();
        if (formData.doctorId && formData.appointmentDate) {
          fetchSlots(formData.doctorId, formData.appointmentDate);
        }
      } else {
        setCancelError(res.data?.message || "Could not cancel appointment.");
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      setCancelError(err.response?.data?.message || "Could not cancel appointment. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Focus trap / keyboard management for Cancellation Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && cancelModalAppt && !isCancelling) {
        handleDismissCancelModal();
      }
    };

    if (cancelModalAppt) {
      window.addEventListener("keydown", handleKeyDown);
      const timerId = setTimeout(() => {
        keepApptBtnRef.current?.focus();
      }, 50);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        clearTimeout(timerId);
      };
    }
  }, [cancelModalAppt, isCancelling, handleDismissCancelModal]);

  // Clinician authorized actions: Confirm, Start, Complete, Reject
  const handleUpdateAppointment = async (apptId, status, rejectionReason = "") => {
    try {
      await appointmentsAPI.updateAppointment(apptId, { status, rejectionReason });
      setStatusMessage(`Consultation status updated to "${status}".`);
      fetchAppointments();
      if (formData.doctorId && formData.appointmentDate) {
        fetchSlots(formData.doctorId, formData.appointmentDate);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update appointment status.");
    }
  };

  const handlePromptReject = (apptId) => {
    const reason = window.prompt("Reason for rejecting or rescheduling consultation (optional):");
    if (reason !== null && reason.trim()) {
      handleUpdateAppointment(apptId, "Rejected", reason.trim());
    } else if (reason !== null) {
      handleUpdateAppointment(apptId, "Rejected", "Clinician unavailable for selected time slot.");
    }
  };

  const renderDoctorCard = (app) => {
    const patObj =
      typeof app.patientId === "object" && app.patientId !== null ? app.patientId : null;
    const patientIdVal = patObj?._id || app.patientId;
    const patientName = app.patientName || patObj?.name || "Patient";
    const patientPhone = app.patientPhone || patObj?.phoneNumber || "";
    const patientEmail = app.patientEmail || patObj?.email || "";
    const statusClean = app.status || "Scheduled";
    const statusNorm = String(statusClean).trim().toUpperCase();

    return (
      <div
        key={app._id}
        className={`appointment-card doctor-view-card ${statusClean.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div className="app-card-top">
          <div className="patient-headline-wrap">
            <div className="patient-avatar-mini" title={patientName}>
              {patientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="app-dept-pill patient-pill">Patient</span>
              <h3 className="app-doctor-name">{patientName}</h3>
            </div>
          </div>
          <span
            className={`app-status-badge ${statusClean.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {statusClean}
          </span>
        </div>

        <div className="app-details-list">
          <div className="detail-item">
            <FiCalendar className="detail-icon" />
            <span>
              {new Date(app.appointmentDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="detail-item">
            <FiClock className="detail-icon" />
            <span>{app.timeSlot}</span>
          </div>
          <div className="detail-item">
            <FiActivity className="detail-icon" />
            <span>Mode: {app.consultationType || "In-Person"}</span>
          </div>

          {patientPhone && (
            <div className="detail-item">
              <FiPhone className="detail-icon" />
              <span>
                Phone:{" "}
                <a href={`tel:${patientPhone}`} className="contact-link">
                  {patientPhone}
                </a>
              </span>
            </div>
          )}

          {patientEmail && (
            <div className="detail-item">
              <FiMail className="detail-icon" />
              <span>
                Email:{" "}
                <a href={`mailto:${patientEmail}`} className="contact-link">
                  {patientEmail}
                </a>
              </span>
            </div>
          )}

          {(app.reason || app.notes) && (
            <div className="detail-item reason-item">
              <FiFileText className="detail-icon" />
              <span>
                <strong>Clinical Reason:</strong> {app.reason || app.notes}
              </span>
            </div>
          )}

          {app.rejectionReason && (
            <div className="detail-item rejection-alert">
              <FiAlertCircle className="detail-icon text-red" />
              <span>Note: {app.rejectionReason}</span>
            </div>
          )}
        </div>

        {/* Clinician Authorized Actions */}
        <div className="app-card-actions doctor-card-actions">
          <ConsultationJoinButton
            appointment={app}
            currentTime={currentTime}
            className="btn-action-join-video"
            customEnabledText="Join Video Consultation"
          />
          {statusNorm === "SCHEDULED" && (
            <>
              <button
                className="btn-action-confirm"
                onClick={() => handleUpdateAppointment(app._id, "Confirmed")}
                type="button"
                title="Confirm patient appointment"
              >
                <FiCheckCircle /> Confirm
              </button>
              <button
                className="btn-action-reject"
                onClick={() => handlePromptReject(app._id)}
                type="button"
                title="Reject or request reschedule"
              >
                <FiXCircle /> Reject
              </button>
            </>
          )}

          {statusNorm === "CONFIRMED" && (
            <>
              <button
                className="btn-action-start"
                onClick={() => handleUpdateAppointment(app._id, "In Progress")}
                type="button"
                title="Begin clinical consultation"
              >
                <FiActivity /> Start Visit
              </button>
              <button
                className="btn-action-reject"
                onClick={() => handlePromptReject(app._id)}
                type="button"
                title="Reschedule or cancel visit"
              >
                <FiXCircle /> Reschedule
              </button>
            </>
          )}

          {(statusNorm === "IN PROGRESS" || statusNorm === "IN-PROGRESS") && (
            <button
              className="btn-action-complete"
              onClick={() => handleUpdateAppointment(app._id, "Completed")}
              type="button"
              title="Mark consultation as completed"
            >
              <FiCheckCircle /> Complete Visit
            </button>
          )}

          {patientIdVal && (
            <Link
              to={`/doctor-dashboard?patientId=${patientIdVal}`}
              className="btn-action-vault"
              title="Open patient medical dossier and upload records"
            >
              <FiFileText /> Dossier & Vault
            </Link>
          )}
        </div>
      </div>
    );
  };

  const renderPatientCard = (app) => {
    const docObj =
      typeof app.doctorId === "object" && app.doctorId !== null ? app.doctorId : null;
    const docName = docObj?.name
      ? (docObj.name.startsWith("Dr.") ? docObj.name : `Dr. ${docObj.name}`)
      : (app.doctorName?.startsWith("Dr.") ? app.doctorName : `Dr. ${app.doctorName || "Doctor"}`);
    const docDept = docObj?.specialization || app.department || "General Medicine";
    const statusClean = app.status || "Scheduled";
    const statusNorm = String(statusClean).trim().toUpperCase();
    const isPast = checkIsPast(app.appointmentDate, app.timeSlot);
    const isCancellable = isAppointmentCancellable(app);

    return (
      <div
        key={app._id}
        className={`appointment-card ${statusClean.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div className="app-card-top">
          <div>
            <span className="app-dept-pill">{docDept}</span>
            <h3 className="app-doctor-name">{docName}</h3>
          </div>
          <span
            className={`app-status-badge ${statusClean.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {statusClean}
          </span>
        </div>

        <div className="app-details-list">
          <div className="detail-item">
            <FiCalendar className="detail-icon" />
            <span>
              {new Date(app.appointmentDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="detail-item">
            <FiClock className="detail-icon" />
            <span>{app.timeSlot}</span>
          </div>
          <div className="detail-item">
            <FiActivity className="detail-icon" />
            <span>Mode: {app.consultationType || "In-Person"}</span>
          </div>
          {(app.reason || app.notes) && (
            <div className="detail-item reason-item">
              <FiFileText className="detail-icon" />
              <span><strong>Reason:</strong> {app.reason || app.notes}</span>
            </div>
          )}
          {app.rejectionReason && (
            <div className="detail-item rejection-alert">
              <FiAlertCircle className="detail-icon text-red" />
              <span>Note: {app.rejectionReason}</span>
            </div>
          )}
        </div>

        <div className="app-card-actions patient-card-actions">
          <ConsultationJoinButton
            appointment={app}
            currentTime={currentTime}
            className="btn-join-video-action patient-video-btn"
            customEnabledText="Join Video Consultation"
          />
          {isCancellable ? (
            <button
              className="btn-card-cancel-action"
              onClick={() => handleOpenCancelModal(app)}
              type="button"
              title="Cancel scheduled consultation"
              aria-label={`Cancel appointment with ${docName}`}
            >
              <FiXCircle size={14} /> {t("appointment.cancelAppointment", "Cancel Appointment")}
            </button>
          ) : (
            <div className={`appt-terminal-badge ${statusClean.toLowerCase().replace(/\s+/g, "-")}`}>
              {statusNorm === "COMPLETED" && (
                <>
                  <FiCheckCircle size={13} />
                  <span>{t("appointment.appointmentCompleted", "Consultation Completed")}</span>
                </>
              )}
              {statusNorm === "CANCELLED" && (
                <>
                  <FiXCircle size={13} />
                  <span>{t("appointment.appointmentCancelled", "Consultation Cancelled")}</span>
                </>
              )}
              {statusNorm === "REJECTED" && (
                <>
                  <FiAlertCircle size={13} />
                  <span>{t("appointment.appointmentDeclined", "Consultation Declined")}</span>
                </>
              )}
              {statusNorm === "EXPIRED" && (
                <>
                  <FiAlertCircle size={13} />
                  <span>{t("appointment.appointmentExpired", "Consultation Expired")}</span>
                </>
              )}
              {isPast &&
                statusNorm !== "COMPLETED" &&
                statusNorm !== "CANCELLED" &&
                statusNorm !== "REJECTED" &&
                statusNorm !== "EXPIRED" && (
                  <>
                    <FiClock size={13} />
                    <span>Past Consultation • Non-cancellable</span>
                  </>
              )}
              {!isPast &&
                statusNorm !== "COMPLETED" &&
                statusNorm !== "CANCELLED" &&
                statusNorm !== "REJECTED" &&
                statusNorm !== "EXPIRED" && (
                  <>
                    <FiActivity size={13} />
                    <span>Status: {statusClean}</span>
                  </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedDoctorObj = doctorsList.find((d) => d._id === formData.doctorId);

  if (loading) {
    return (
      <div className="appointment-page-container">
        <div className="appointment-loading">
          <FiRefreshCw className="spinner-icon" />
          <p>Loading your clinical appointments from MongoDB Atlas...</p>
        </div>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = formatTimeParts(timer);

  return (
    <div className="appointment-page-container">
      {/* Header */}
      <header className="appointment-page-header">
        <div className="header-info">
          <div className="badge-row">
            <span className={`header-badge ${isDoctor ? "doctor-badge" : ""}`}>
              {isDoctor ? "Physician Schedule" : "Clinical Scheduling"}
            </span>
            <span className="live-sync-indicator">
              <span className="live-dot" /> Live Atlas & Socket Sync
            </span>
          </div>
          <h1>
            {isDoctor
              ? t("appointment.doctorPageTitle", "Assigned Consultations & Schedule")
              : t("appointment.pageTitle", "Doctor Consultations & Appointments")}
          </h1>
          <p>
            {isDoctor
              ? t("appointment.doctorPageSubtitle", "Review your patient consultation requests, manage appointment status in real time, and access patient medical records.")
              : t("appointment.pageSubtitle", "Connect directly with verified hospital physicians, choose verified slots in real time, and monitor upcoming visits.")}
          </p>
        </div>

        {isDoctor ? (
          <div className="header-actions">
            <Link to="/doctor-dashboard" className="btn-doctor-portal-link">
              <FiShield /> Doctor Portal & Vault
            </Link>
          </div>
        ) : (
          <button
            className="btn-book-new"
            onClick={handleOpenBookingModal}
            type="button"
          >
            <FiPlus /> {t("appointment.bookNewBtn", "Book New Appointment")}
          </button>
        )}
      </header>

      {/* Guest Notice */}
      {!user && (
        <div className="guest-role-banner">
          <FiAlertCircle />
          <span>
            You are currently browsing as a guest. Please sign in to book consultations with verified hospital doctors or view your appointments.
          </span>
        </div>
      )}

      {statusMessage && (
        <div className="appointment-status-banner">
          <FiCheckCircle />
          <span>{statusMessage}</span>
          <button
            className="dismiss-btn"
            onClick={() => setStatusMessage("")}
            aria-label="Dismiss banner"
          >
            <FiX />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="appointment-error-banner">
          <FiAlertCircle />
          <span>{errorMessage}</span>
          <button
            className="dismiss-btn"
            onClick={() => setErrorMessage("")}
            aria-label="Dismiss error"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Countdown Card for Nearest Upcoming Consultation */}
      {nextAppointment && timer !== null && timer > 0 && (
        <section className={`next-appointment-card ${isDoctor ? "doctor-next-card" : ""}`}>
          <div className="countdown-info">
            <span className="countdown-eyebrow">
              {isDoctor ? "Next Assigned Patient Consultation" : "Next Scheduled Consultation"}
            </span>
            {isDoctor ? (
              (() => {
                const patName =
                  nextAppointment.patientName ||
                  (typeof nextAppointment.patientId === "object" ? nextAppointment.patientId?.name : null) ||
                  "Patient";
                const patPhone =
                  nextAppointment.patientPhone ||
                  (typeof nextAppointment.patientId === "object" ? nextAppointment.patientId?.phoneNumber : null);
                const patEmail =
                  nextAppointment.patientEmail ||
                  (typeof nextAppointment.patientId === "object" ? nextAppointment.patientId?.email : null);

                return (
                  <>
                    <h3 className="doctor-headline">
                      Patient: {patName}
                    </h3>
                    {(patPhone || patEmail) && (
                      <div className="countdown-patient-contact">
                        {patPhone && (
                          <span className="contact-chip">
                            <FiPhone size={13} /> {patPhone}
                          </span>
                        )}
                        {patEmail && (
                          <span className="contact-chip">
                            <FiMail size={13} /> {patEmail}
                          </span>
                        )}
                      </div>
                    )}
                    {(nextAppointment.reason || nextAppointment.notes) && (
                      <p className="countdown-reason-text">
                        <strong>Reason:</strong> {nextAppointment.reason || nextAppointment.notes}
                      </p>
                    )}
                  </>
                );
              })()
            ) : (
              (() => {
                const nextDocObj =
                  typeof nextAppointment.doctorId === "object" && nextAppointment.doctorId !== null
                    ? nextAppointment.doctorId
                    : null;
                const nextDocName = nextDocObj?.name
                  ? (nextDocObj.name.startsWith("Dr.") ? nextDocObj.name : `Dr. ${nextDocObj.name}`)
                  : (nextAppointment.doctorName?.startsWith("Dr.")
                  ? nextAppointment.doctorName
                  : `Dr. ${nextAppointment.doctorName || "Doctor"}`);
                const nextDocDept = nextDocObj?.specialization || nextAppointment.department || "General Medicine";

                return (
                  <>
                    <h3 className="doctor-headline">
                      {nextDocName} • {nextDocDept}
                    </h3>
                    {(nextAppointment.reason || nextAppointment.notes) && (
                      <p className="countdown-reason-text">
                        <strong>Reason:</strong> {nextAppointment.reason || nextAppointment.notes}
                      </p>
                    )}
                  </>
                );
              })()
            )}
            <div className="appointment-meta-pills">
              <span>
                <FiCalendar />{" "}
                {new Date(nextAppointment.appointmentDate).toLocaleDateString(
                  "en-US",
                  { weekday: "short", month: "short", day: "numeric", year: "numeric" }
                )}
              </span>
              <span>
                <FiClock /> {nextAppointment.timeSlot}
              </span>
              <span>
                <FiActivity /> {nextAppointment.consultationType || "In-Person"}
              </span>
              <span className={`status-pill ${nextAppointment.status?.toLowerCase().replace(/\s+/g, "-")}`}>
                {nextAppointment.status}
              </span>
            </div>
          </div>

          <div className="live-countdown-clock">
            <div className="countdown-unit">
              <span className="unit-number">{days}</span>
              <span className="unit-label">{t("appointment.days", "Days")}</span>
            </div>
            <div className="clock-divider">:</div>
            <div className="countdown-unit">
              <span className="unit-number">{hours}</span>
              <span className="unit-label">{t("appointment.hours", "Hours")}</span>
            </div>
            <div className="clock-divider">:</div>
            <div className="countdown-unit">
              <span className="unit-number">{minutes}</span>
              <span className="unit-label">{t("appointment.mins", "Mins")}</span>
            </div>
            <div className="clock-divider">:</div>
            <div className="countdown-unit">
              <span className="unit-number">{seconds}</span>
              <span className="unit-label">{t("appointment.secs", "Secs")}</span>
            </div>
          </div>
        </section>
      )}

      {/* Appointment List Section */}
      <section className="appointments-list-section">
        <div className="list-section-header">
          <div>
            <h2>
              {isDoctor
                ? `Assigned Consultations (${appointments.length})`
                : `Your Clinical Records (${appointments.length})`}
            </h2>
            <span className="sub-tag">
              {isDoctor
                ? "All patient consultations scheduled with your physician account in MongoDB Atlas"
                : "All real-time appointments synchronized with hospital servers"}
            </span>
          </div>

          {/* View Tab Filter Controls */}
          {appointments.length > 0 && (
            <div className="appointment-view-tabs" role="tablist" aria-label="Appointment Filters">
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === "all"}
                className={`view-tab-btn ${viewTab === "all" ? "active" : ""}`}
                onClick={() => setViewTab("all")}
              >
                {t("common.all", "All")} <span className="tab-count-pill">{appointments.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === "upcoming"}
                className={`view-tab-btn ${viewTab === "upcoming" ? "active" : ""}`}
                onClick={() => setViewTab("upcoming")}
              >
                {t("appointment.upcomingTab", "Upcoming")} <span className="tab-count-pill">{upcomingAppointments.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === "past"}
                className={`view-tab-btn ${viewTab === "past" ? "active" : ""}`}
                onClick={() => setViewTab("past")}
              >
                {t("appointment.pastTab", "Past")} <span className="tab-count-pill">{pastAppointments.length}</span>
              </button>
            </div>
          )}
        </div>

        {appointments.length === 0 ? (
          <div className="empty-appointments-box">
            <FiCalendar size={48} className="empty-cal-icon" />
            <h3>{isDoctor ? "No Assigned Consultations" : "No Scheduled Appointments"}</h3>
            <p>
              {isDoctor
                ? "You currently do not have any patient appointments booked with your account. New patient bookings will appear here automatically via real-time sync."
                : "You currently do not have any doctor consultations booked."}
            </p>
            {isDoctor ? (
              <Link to="/doctor-dashboard" className="btn-book-first">
                <FiShield /> Open Doctor Portal & Vault
              </Link>
            ) : (
              <button
                className="btn-book-first"
                onClick={handleOpenBookingModal}
                type="button"
              >
                <FiPlus /> Book Consultation Now
              </button>
            )}
          </div>
        ) : (
          <div className="appointment-sections-container">
            {/* UPCOMING VIEW TAB */}
            {viewTab === "upcoming" && (
              upcomingAppointments.length === 0 ? (
                <div className="empty-appointments-box sub-empty">
                  <FiClock size={40} className="empty-cal-icon" />
                  <h3>No Upcoming Consultations</h3>
                  <p>You have no active or upcoming consultations scheduled. Any confirmed visits will appear here sorted nearest first.</p>
                </div>
              ) : (
                <div className={isDoctor ? "doctor-consultations-grid" : "appointments-grid"}>
                  {upcomingAppointments.map((app) => isDoctor ? renderDoctorCard(app) : renderPatientCard(app))}
                </div>
              )
            )}

            {/* PAST VIEW TAB */}
            {viewTab === "past" && (
              pastAppointments.length === 0 ? (
                <div className="empty-appointments-box sub-empty">
                  <FiCheckCircle size={40} className="empty-cal-icon" />
                  <h3>No Past Consultations</h3>
                  <p>You have no past or concluded consultations on record.</p>
                </div>
              ) : (
                <div className={isDoctor ? "doctor-consultations-grid" : "appointments-grid"}>
                  {pastAppointments.map((app) => isDoctor ? renderDoctorCard(app) : renderPatientCard(app))}
                </div>
              )
            )}

            {/* ALL VIEW TAB (SEPARATED INTO UPCOMING & PAST SUBGROUPS) */}
            {viewTab === "all" && (
              <>
                {upcomingAppointments.length > 0 && (
                  <div className="appointment-subgroup upcoming-subgroup">
                    <div className="subgroup-header">
                      <div className="subgroup-title-row">
                        <span className="subgroup-badge upcoming">Upcoming</span>
                        <h3>Upcoming Consultations ({upcomingAppointments.length})</h3>
                      </div>
                      <span className="subgroup-hint">Ordered chronologically • Nearest upcoming first</span>
                    </div>
                    <div className={isDoctor ? "doctor-consultations-grid" : "appointments-grid"}>
                      {upcomingAppointments.map((app) => isDoctor ? renderDoctorCard(app) : renderPatientCard(app))}
                    </div>
                  </div>
                )}

                {pastAppointments.length > 0 && (
                  <div className="appointment-subgroup past-subgroup">
                    <div className="subgroup-header">
                      <div className="subgroup-title-row">
                        <span className="subgroup-badge past">Past / Concluded</span>
                        <h3>Past & Historical Records ({pastAppointments.length})</h3>
                      </div>
                      <span className="subgroup-hint">Reverse chronological • Most recent first</span>
                    </div>
                    <div className={isDoctor ? "doctor-consultations-grid" : "appointments-grid"}>
                      {pastAppointments.map((app) => isDoctor ? renderDoctorCard(app) : renderPatientCard(app))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Booking Modal (Patients & Guests Only - Completely Hidden for Doctors) */}
      {!isDoctor && showBookModal && (
        <div className="modal-backdrop" onClick={() => setShowBookModal(false)}>
          <div
            className="booking-dialog-card enhanced-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="dialog-header">
              <div className="title-wrap">
                <FiCalendar className="header-icon" />
                <div>
                  <h3>{t("appointment.modalTitle", "Schedule Clinical Consultation")}</h3>
                  <p>{t("appointment.modalSubtitle", "Choose your verified specialist and reserve an atomic time slot")}</p>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowBookModal(false)}
                type="button"
                aria-label="Close modal"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Profile Completeness Inline Alert */}
            {profileIncomplete && (
              <div className="profile-completion-notice">
                <div className="notice-header">
                  <FiAlertCircle className="notice-icon" />
                  <div>
                    <h4>Mandatory Contact Information Required</h4>
                    <p>
                      To prevent missed visits, Vaidyasthana requires a verified phone number
                      and address before scheduling consultations.
                    </p>
                  </div>
                </div>
                <div className="profile-quick-form">
                  <div className="quick-field">
                    <label>Mobile Number * (10–15 digits)</label>
                    <div className="field-input-wrap">
                      <FiPhone />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="quick-field">
                    <label>Complete Address / City *</label>
                    <div className="field-input-wrap">
                      <FiMapPin />
                      <input
                        type="text"
                        placeholder="e.g. 42 MG Road, Bengaluru"
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-save-profile"
                    onClick={handleSaveProfileAndContinue}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving Profile..." : "Save Contact Info & Continue"}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="booking-form">
              {/* Doctor Selector */}
              <div className="form-group">
                <label>{t("appointment.selectDoctor", "Select Verified Healthcare Specialist *")}</label>
                {loadingDoctors ? (
                  <div className="loading-row">
                    <FiRefreshCw className="spinner-icon small" /> Loading verified doctors...
                  </div>
                ) : doctorsList.length === 0 ? (
                  <div className="empty-doctors-warning">
                    <FiShield /> No verified doctors currently available in directory.
                  </div>
                ) : (
                  <select
                    name="doctorId"
                    value={formData.doctorId}
                    onChange={handleDoctorChange}
                    className="form-select"
                    required
                  >
                    {doctorsList.map((doc) => {
                      const displayName = doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`;
                      const location = doc.city || doc.address || "Hospital";
                      return (
                        <option key={doc._id} value={doc._id}>
                          {displayName} — {doc.specialization} ({location})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Selected Doctor Summary Card */}
              {selectedDoctorObj && (
                <div className="doctor-summary-box">
                  <div className="doctor-box-main">
                    <div className="doctor-avatar-circle">
                      <FiUser size={22} />
                    </div>
                    <div>
                      <div className="doc-name-verified">
                        <h4>
                          {selectedDoctorObj.name.startsWith("Dr.")
                            ? selectedDoctorObj.name
                            : `Dr. ${selectedDoctorObj.name}`}
                        </h4>
                        <span className="verified-badge">
                          <FiCheckCircle /> Verified
                        </span>
                      </div>
                      <span className="doc-specialty-sub">
                        {selectedDoctorObj.specialization} • {selectedDoctorObj.city || selectedDoctorObj.address || "Hospital"}
                      </span>
                    </div>
                  </div>
                  <div className="doc-metrics-row">
                    <div className="metric-pill">
                      <FiAward /> {selectedDoctorObj.experienceYears || 5}+ yrs exp
                    </div>
                    <div className="metric-pill">
                      <FiDollarSign /> ₹{selectedDoctorObj.consultationFee || 500} fee
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Mode Selection */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>{t("appointment.selectDate", "Appointment Date *")}</label>
                  <input
                    type="date"
                    name="appointmentDate"
                    required
                    value={formData.appointmentDate}
                    onChange={handleDateChange}
                    className="form-input"
                    min={getTodayISO()}
                  />
                </div>

                <div className="form-group">
                  <label>{t("appointment.consultationType", "Consultation Mode")}</label>
                  <select
                    name="consultationType"
                    value={formData.consultationType}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="In-Person">In-Person Consultation</option>
                    <option value="Video / Online">Video / Online Consultation</option>
                    <option value="Phone">Phone Consultation</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Time Slot Picker */}
              <div className="form-group">
                <div className="slot-header-row">
                  <label>{t("appointment.selectSlot", "Select Available Time Slot *")}</label>
                  {loadingSlots && (
                    <span className="loading-slot-tag">
                      <FiRefreshCw className="spinner-icon small" /> Calculating open slots...
                    </span>
                  )}
                </div>

                {!formData.appointmentDate ? (
                  <p className="slot-hint-text">
                    Select an appointment date above to view available time slots.
                  </p>
                ) : slotsError ? (
                  <p className="slot-error-text">{slotsError}</p>
                ) : processedSlots.length === 0 && !loadingSlots ? (
                  <p className="slot-hint-text">No time slots found for this date.</p>
                ) : (
                  <div
                    className="slots-grid-container"
                    role="group"
                    aria-label="Available appointment time slots"
                  >
                    {processedSlots.map((slot, idx) => {
                      const isSelected = formData.timeSlot === slot.timeSlot;
                      const isBooked = slot.isBooked;
                      const isAvailable = slot.isAvailable;
                      const isPast = slot.isPast;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvailable}
                          aria-disabled={!isAvailable}
                          tabIndex={!isAvailable ? -1 : 0}
                          className={`slot-chip ${
                            isSelected
                              ? "selected"
                              : isPast
                              ? "unavailable passed"
                              : isBooked
                              ? "occupied"
                              : !isAvailable
                              ? "unavailable"
                              : "available"
                          }`}
                          onClick={() => {
                            if (isAvailable) {
                              setFormData((prev) => ({
                                ...prev,
                                timeSlot: slot.timeSlot,
                              }));
                            }
                          }}
                          title={slot.reason || (isAvailable ? "Available slot" : "Slot unavailable")}
                        >
                          <FiClock className="chip-icon" />
                          <span className="chip-time">{slot.timeSlot}</span>
                          {isPast ? (
                            <span className="chip-badge unavailable passed">Passed</span>
                          ) : isBooked ? (
                            <span className="chip-badge occupied">Booked</span>
                          ) : isSelected ? (
                            <span className="chip-badge selected">Selected</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>{t("appointment.reasonForVisit", "Reason for Consultation / Medical Concerns")}</label>
                <textarea
                  name="reason"
                  placeholder="e.g. Follow-up consultation for blood report findings, chest discomfort..."
                  rows={2}
                  value={formData.reason || formData.notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({ ...prev, reason: val, notes: val }));
                  }}
                  className="form-textarea"
                />
              </div>

              <div className="dialog-buttons-row">
                <button
                  type="button"
                  className="btn-dialog-cancel"
                  onClick={() => setShowBookModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-dialog-book"
                  disabled={
                    submitting ||
                    !formData.doctorId ||
                    !formData.appointmentDate ||
                    !formData.timeSlot ||
                    profileIncomplete
                  }
                >
                  {submitting ? t("common.submitting", "Reserving Slot...") : t("appointment.confirmBookingBtn", "Confirm Appointment Booking")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Accessible Cancellation Confirmation Modal */}
      {cancelModalAppt && (() => {
        const cancelDocObj =
          typeof cancelModalAppt.doctorId === "object" && cancelModalAppt.doctorId !== null
            ? cancelModalAppt.doctorId
            : null;
        const cancelDocName = cancelDocObj?.name
          ? (cancelDocObj.name.startsWith("Dr.") ? cancelDocObj.name : `Dr. ${cancelDocObj.name}`)
          : (cancelModalAppt.doctorName?.startsWith("Dr.")
          ? cancelModalAppt.doctorName
          : `Dr. ${cancelModalAppt.doctorName || "Doctor"}`);
        const cancelDocDept = cancelDocObj?.specialization || cancelModalAppt.department || "General Medicine";
        const cancelDateStr = cancelModalAppt.appointmentDate
          ? new Date(cancelModalAppt.appointmentDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Scheduled Date";
        const cancelTimeStr = cancelModalAppt.timeSlot || "Scheduled Time";

        return (
          <div
            className="modal-backdrop cancellation-modal-backdrop"
            onClick={handleDismissCancelModal}
            role="presentation"
          >
            <div
              className="cancellation-modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-dialog-title"
              aria-describedby="cancel-dialog-desc"
            >
              <div className="cancellation-modal-header">
                <div className="cancel-title-wrap">
                  <div className="cancel-icon-badge" aria-hidden="true">
                    <FiAlertCircle size={22} />
                  </div>
                  <div>
                    <h3 id="cancel-dialog-title">{t("appointment.cancelModalTitle", "Cancel Clinical Appointment")}</h3>
                    <p className="cancel-subtitle">Review consultation details prior to confirmation</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="cancel-modal-close-btn"
                  onClick={handleDismissCancelModal}
                  disabled={isCancelling}
                  aria-label="Close dialog without cancelling"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="cancellation-modal-body">
                <p id="cancel-dialog-desc" className="cancel-prompt-message">
                  {t("appointment.cancelModalPrompt", "Are you sure you want to cancel this scheduled consultation?")}
                </p>

                {/* Consultation Details Card */}
                <div className="cancel-appt-summary-card">
                  <div className="cancel-summary-row doc-row">
                    <FiUser className="summary-icon" />
                    <div className="summary-info">
                      <span className="summary-label">Physician</span>
                      <strong className="summary-val">{cancelDocName}</strong>
                      {cancelDocDept && <span className="summary-dept">({cancelDocDept})</span>}
                    </div>
                  </div>

                  <div className="cancel-summary-grid">
                    <div className="cancel-summary-row">
                      <FiCalendar className="summary-icon" />
                      <div className="summary-info">
                        <span className="summary-label">Scheduled Date</span>
                        <strong className="summary-val">{cancelDateStr}</strong>
                      </div>
                    </div>
                    <div className="cancel-summary-row">
                      <FiClock className="summary-icon" />
                      <div className="summary-info">
                        <span className="summary-label">Time Slot</span>
                        <strong className="summary-val">{cancelTimeStr}</strong>
                      </div>
                    </div>
                  </div>

                  {cancelModalAppt.consultationType && (
                    <div className="cancel-summary-row">
                      <FiActivity className="summary-icon" />
                      <div className="summary-info">
                        <span className="summary-label">Consultation Mode</span>
                        <strong className="summary-val">{cancelModalAppt.consultationType}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {cancelError && (
                  <div className="cancel-modal-error-alert" role="alert">
                    <FiAlertCircle className="error-icon" />
                    <span>{cancelError}</span>
                  </div>
                )}

                <p className="cancel-warning-note">
                  Once cancelled, this time slot will be released back to the hospital schedule for other patients.
                </p>
              </div>

              <div className="cancellation-modal-footer">
                <button
                  type="button"
                  ref={keepApptBtnRef}
                  className="btn-cancel-modal-keep"
                  onClick={handleDismissCancelModal}
                  disabled={isCancelling}
                >
                  {t("appointment.keepAppointmentBtn", "No, Keep Appointment")}
                </button>
                <button
                  type="button"
                  className="btn-cancel-modal-confirm"
                  onClick={handleConfirmCancellation}
                  disabled={isCancelling}
                  aria-busy={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <FiRefreshCw className="spin" size={15} />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <FiXCircle size={15} />
                      <span>{t("appointment.confirmCancelBtn", "Yes, Cancel Appointment")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Appointment;