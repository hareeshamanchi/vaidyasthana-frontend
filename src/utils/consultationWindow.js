/**
 * Vaidyasthana Video Consultation Window & 30-Minute Grace Period Utility (Frontend)
 *
 * Implements strict consultation time rules:
 * - Video/online consultations can be joined from the scheduled start time until the 30-minute grace-period deadline.
 * - Before the appointment: Show "Starts at [time]" and disable the Join button.
 * - During permitted window: Show enabled "Join Video Consultation" button.
 * - After grace period: Disable button and show "Consultation Time Exceeded".
 * - Cancelled: Show "Consultation Cancelled" (disabled).
 * - Rejected: Show "Consultation Rejected" (disabled).
 * - Completed: Show "Consultation Completed" (disabled).
 * - In-Person: Do not display a video-join button.
 */

import { useState, useEffect } from "react";

export const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Normalizes appointment status string to uppercase trimmed format.
 */
export const normalizeStatus = (status) => {
  return String(status || "").trim().toUpperCase();
};

/**
 * Checks whether an appointment's consultation mode is online/video.
 */
export const isVideoConsultationMode = (consultationType) => {
  const norm = String(consultationType || "").trim().toUpperCase();
  return norm.includes("VIDEO") || norm.includes("ONLINE");
};

/**
 * Parses timeSlot strings into minutes from midnight (0 - 1439).
 * Supports "10:00 AM", "03:30 PM", "10:00 AM - 10:30 AM", "14:00", "9:00".
 */
export const parseTimeSlotToMinutes = (timeSlotStr) => {
  if (!timeSlotStr || typeof timeSlotStr !== "string") return -1;
  const cleanSlot = timeSlotStr.trim();

  // Range format "10:00 AM - 10:30 AM" -> take the start slot
  const startPart = cleanSlot.includes("-") ? cleanSlot.split("-")[0].trim() : cleanSlot;

  // 12-hour format with AM/PM
  const match12 = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const modifier = match12[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes >= 60) return -1;
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // 24-hour format
  const match24 = startPart.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) return -1;
    return hours * 60 + minutes;
  }

  return -1;
};

/**
 * Extracts year, month (0-indexed), and day from an appointmentDate or ISO string.
 */
export const extractAppointmentCalendarDate = (appointmentDate) => {
  if (!appointmentDate) return null;

  if (typeof appointmentDate === "string") {
    const match = appointmentDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10) - 1,
        day: parseInt(match[3], 10),
      };
    }
  }

  const d = new Date(appointmentDate);
  if (isNaN(d.getTime())) return null;

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
};

/**
 * Formats minutes from midnight into 12-hour format (e.g. "03:00 PM").
 */
export const formatMinutesTo12Hour = (minutes) => {
  if (typeof minutes !== "number" || minutes < 0 || minutes >= 1440) return "";
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const modifier = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${modifier}`;
};

/**
 * Computes exact scheduled start and 30-minute grace period deadline timestamps.
 */
export const getAppointmentStartAndDeadline = (appointmentDate, timeSlot, timeZone) => {
  const cal = extractAppointmentCalendarDate(appointmentDate);
  if (!cal) return null;

  const slotMinutes = parseTimeSlotToMinutes(timeSlot);
  if (slotMinutes === -1) return null;

  const hours = Math.floor(slotMinutes / 60);
  const minutes = slotMinutes % 60;

  let startTimeMs;
  if (timeZone) {
    try {
      const pad = (n) => String(n).padStart(2, "0");
      const isoStr = `${cal.year}-${pad(cal.month + 1)}-${pad(cal.day)}T${pad(hours)}:${pad(minutes)}:00Z`;
      const tempDate = new Date(isoStr);
      const locStr = tempDate.toLocaleString("en-US", { timeZone });
      const locDate = new Date(locStr);
      const diff = tempDate.getTime() - locDate.getTime();
      startTimeMs = tempDate.getTime() + diff;
    } catch {
      startTimeMs = new Date(cal.year, cal.month, cal.day, hours, minutes, 0, 0).getTime();
    }
  } else {
    startTimeMs = new Date(cal.year, cal.month, cal.day, hours, minutes, 0, 0).getTime();
  }

  const deadlineMs = startTimeMs + GRACE_PERIOD_MS;
  const formattedTime = formatMinutesTo12Hour(slotMinutes);

  return {
    startTimeMs,
    deadlineMs,
    slotMinutes,
    formattedTime,
  };
};

/**
 * Evaluates the full consultation window state for a given appointment.
 *
 * @param {Object} appointment
 * @param {number} [now=Date.now()]
 * @returns {{
 *   isEligibleMode: boolean,
 *   status: string,
 *   canJoin: boolean,
 *   buttonText: string,
 *   badgeText: string,
 *   startTimeMs: number|null,
 *   deadlineMs: number|null,
 *   remainingMs: number,
 *   formattedTime: string
 * }}
 */
export const getConsultationWindowState = (appointment, now = Date.now()) => {
  if (!appointment) {
    return {
      isEligibleMode: false,
      status: "INVALID_APPOINTMENT",
      canJoin: false,
      buttonText: "",
      badgeText: "Unavailable",
      startTimeMs: null,
      deadlineMs: null,
      remainingMs: 0,
      formattedTime: "",
    };
  }

  // 1. Consultation mode check (In-person consultations do not show video button)
  const consultationMode = appointment.consultationType || appointment.type;
  const isEligibleMode = isVideoConsultationMode(consultationMode);
  if (!isEligibleMode) {
    return {
      isEligibleMode: false,
      status: "NOT_VIDEO",
      canJoin: false,
      buttonText: "",
      badgeText: "In-Person",
      startTimeMs: null,
      deadlineMs: null,
      remainingMs: 0,
      formattedTime: "",
    };
  }

  // 2. Lifecycle Status checks (Never joinable if Cancelled, Rejected, Completed, or Expired)
  const statusNorm = normalizeStatus(appointment.status);
  if (statusNorm === "CANCELLED") {
    return {
      isEligibleMode: true,
      status: "CANCELLED",
      canJoin: false,
      buttonText: "Consultation Cancelled",
      badgeText: "Cancelled",
      startTimeMs: null,
      deadlineMs: null,
      remainingMs: 0,
      formattedTime: "",
    };
  }

  if (statusNorm === "REJECTED") {
    return {
      isEligibleMode: true,
      status: "REJECTED",
      canJoin: false,
      buttonText: "Consultation Rejected",
      badgeText: "Rejected",
      startTimeMs: null,
      deadlineMs: null,
      remainingMs: 0,
      formattedTime: "",
    };
  }

  if (statusNorm === "COMPLETED") {
    return {
      isEligibleMode: true,
      status: "COMPLETED",
      canJoin: false,
      buttonText: "Consultation Completed",
      badgeText: "Completed",
      startTimeMs: null,
      deadlineMs: null,
      remainingMs: 0,
      formattedTime: "",
    };
  }

  if (statusNorm === "EXPIRED") {
    return {
      isEligibleMode: true,
      status: "EXPIRED",
      canJoin: false,
      buttonText: "Consultation Time Exceeded",
      badgeText: "Expired",
      startTimeMs: null,
      deadlineMs: null,
      remainingMs: 0,
      formattedTime: "",
    };
  }

  // Active call in progress (never disconnect solely because joining grace period passed)
  if (statusNorm === "IN PROGRESS" || statusNorm === "IN_PROGRESS") {
    const dateValue = appointment.appointmentDate || appointment.date;
    const timeSlotValue = appointment.timeSlot || appointment.startTime;
    const timing = getAppointmentStartAndDeadline(dateValue, timeSlotValue);
    return {
      isEligibleMode: true,
      status: "IN_PROGRESS",
      canJoin: true,
      buttonText: "Join Video Consultation",
      badgeText: "In Progress",
      startTimeMs: timing?.startTimeMs || null,
      deadlineMs: timing?.deadlineMs || null,
      remainingMs: timing?.deadlineMs ? Math.max(0, timing.deadlineMs - now) : 0,
      formattedTime: timing?.formattedTime || "",
    };
  }

  // 3. Time Window calculation
  const dateValue = appointment.appointmentDate || appointment.date;
  const timeSlotValue = appointment.timeSlot || appointment.startTime;
  const timing = getAppointmentStartAndDeadline(dateValue, timeSlotValue);

  if (!timing) {
    return {
      isEligibleMode: true,
      status: "INVALID_TIME",
      canJoin: false,
      buttonText: "Consultation Unavailable",
      badgeText: "Time Undefined",
      startTimeMs: null,
      deadlineMs: null,
      remainingMs: 0,
      formattedTime: "",
    };
  }

  const { startTimeMs, deadlineMs, formattedTime } = timing;

  // A. Before scheduled start time
  if (now < startTimeMs) {
    return {
      isEligibleMode: true,
      status: "BEFORE_START",
      canJoin: false,
      buttonText: `Consultation starts at ${formattedTime}`,
      badgeText: "Upcoming",
      startTimeMs,
      deadlineMs,
      remainingMs: startTimeMs - now,
      formattedTime,
    };
  }

  // B. During permitted 30-minute grace period window
  if (now >= startTimeMs && now <= deadlineMs) {
    return {
      isEligibleMode: true,
      status: "JOINABLE",
      canJoin: true,
      buttonText: "Join Video Consultation",
      badgeText: "Available to Join",
      startTimeMs,
      deadlineMs,
      remainingMs: deadlineMs - now,
      formattedTime,
    };
  }

  // C. After the 30-minute grace period deadline
  return {
    isEligibleMode: true,
    status: "EXPIRED",
    canJoin: false,
    buttonText: "Consultation Time Exceeded",
    badgeText: "Expired",
    startTimeMs,
    deadlineMs,
    remainingMs: 0,
    formattedTime,
  };
};

/**
 * Checks whether an appointment is expired based on its timing and status.
 */
export const isAppointmentExpired = (appointment, now = Date.now()) => {
  if (!appointment) return false;
  const mode = appointment.consultationType || appointment.type;
  if (!isVideoConsultationMode(mode)) return false;

  const statusNorm = normalizeStatus(appointment.status);
  if (statusNorm !== "SCHEDULED" && statusNorm !== "CONFIRMED") {
    return false;
  }

  const dateValue = appointment.appointmentDate || appointment.date;
  const timeSlotValue = appointment.timeSlot || appointment.startTime;
  const timing = getAppointmentStartAndDeadline(dateValue, timeSlotValue);
  if (!timing || !timing.deadlineMs) return false;

  return now > timing.deadlineMs;
};

/**
 * Custom React hook that ticks at the specified interval (default 15s)
 * to automatically trigger component re-renders when deadlines pass.
 * Unregisters cleanly on unmount.
 */
export const useConsultationTimer = (intervalMs = 15000) => {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);

  return currentTime;
};
