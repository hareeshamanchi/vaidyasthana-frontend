/**
 * Vaidyasthana Appointment Sorting Utility (Frontend)
 *
 * Provides safe, robust date and time slot parsing to sort appointments
 * strictly in descending order (latest appointment date and time first).
 */
import { getAppointmentStartAndDeadline, GRACE_PERIOD_MS } from "./consultationWindow";

/**
 * Parses a time slot string into minutes from midnight (0 - 1439).
 * Supports ranges (e.g. "04:30 PM - 05:00 PM", "11:30 AM - 12:00 PM")
 * as well as single times (e.g. "4:30 PM", "16:30").
 * Returns -1 if invalid or missing.
 *
 * @param {string} timeSlot
 * @returns {number} minutes from midnight
 */
export const parseTimeSlotToMinutes = (timeSlot) => {
  if (!timeSlot || typeof timeSlot !== "string") return -1;
  const startPart = timeSlot.split("-")[0].trim();

  // Match 12-hour format: "4:30 PM", "04:30 PM", "11:30 AM"
  const match12 = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const modifier = match12[3].toUpperCase();
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Match 24-hour format: "16:30", "09:00"
  const match24 = startPart.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return -1;
};

/**
 * Safely parses appointmentDate to a UTC midnight timestamp in milliseconds.
 * Prevents timezone-induced date shifts when comparing calendar dates.
 *
 * @param {Date|string|number} appointmentDate
 * @returns {number} UTC timestamp in ms, or 0 if missing/invalid
 */
export const parseAppointmentDateTimestamp = (appointmentDate) => {
  if (!appointmentDate) return 0;

  if (typeof appointmentDate === "string") {
    const match = appointmentDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return Date.UTC(year, month, day, 0, 0, 0, 0);
    }
  }

  const d = new Date(appointmentDate);
  if (isNaN(d.getTime())) return 0;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
};

/**
 * Calculates exact appointment timestamp in milliseconds combining date and start time slot.
 *
 * @param {Date|string|number} appointmentDate
 * @param {string} timeSlot
 * @returns {number} combined timestamp in ms
 */
export const getAppointmentDateTimeMs = (appointmentDate, timeSlot) => {
  const dateMs = parseAppointmentDateTimestamp(appointmentDate);
  const timeMins = parseTimeSlotToMinutes(timeSlot);
  return dateMs + (timeMins >= 0 ? timeMins * 60 * 1000 : 0);
};

/**
 * Comparator to sort appointments in descending order (most recent first):
 * 1. Later calendar date first.
 * 2. On the same date, later time slot first (e.g. 4:30 PM before 4:00 PM before 3:00 PM).
 * 3. Tie-breaker: later createdAt first.
 * 4. Fallback: string _id.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
export const compareAppointmentsDesc = (a, b) => {
  // 1. Calendar date descending
  const dateA = parseAppointmentDateTimestamp(a?.appointmentDate);
  const dateB = parseAppointmentDateTimestamp(b?.appointmentDate);
  if (dateB !== dateA) {
    return dateB - dateA;
  }

  // 2. Time slot descending
  const minsA = parseTimeSlotToMinutes(a?.timeSlot);
  const minsB = parseTimeSlotToMinutes(b?.timeSlot);
  if (minsB !== minsA) {
    return minsB - minsA;
  }

  // 3. CreatedAt descending
  const createdA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createdB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  const validCreatedA = isNaN(createdA) ? 0 : createdA;
  const validCreatedB = isNaN(createdB) ? 0 : createdB;
  if (validCreatedB !== validCreatedA) {
    return validCreatedB - validCreatedA;
  }

  // 4. Stable tie-breaker by _id
  const idA = String(a?._id || a?.id || "");
  const idB = String(b?._id || b?.id || "");
  return idB.localeCompare(idA);
};

/**
 * Sorts an array of appointments in place or returns a sorted copy (descending order).
 *
 * @param {Array} appointments
 * @returns {Array} sorted appointments descending
 */
export const sortAppointmentsDesc = (appointments) => {
  if (!Array.isArray(appointments)) return [];
  return [...appointments].sort(compareAppointmentsDesc);
};

/**
 * Comparator to sort appointments in ascending order (nearest upcoming first):
 * 1. Earlier calendar date first (e.g. Oct 18 before Oct 19).
 * 2. On the same date, earlier time slot first (e.g. 09:00 AM before 10:00 AM before 02:00 PM).
 * 3. Tie-breaker: earlier createdAt first.
 * 4. Fallback: string _id.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
export const compareAppointmentsAsc = (a, b) => {
  // 1. Calendar date ascending
  const dateA = parseAppointmentDateTimestamp(a?.appointmentDate || a?.date);
  const dateB = parseAppointmentDateTimestamp(b?.appointmentDate || b?.date);
  if (dateA !== dateB) {
    return dateA - dateB;
  }

  // 2. Time slot ascending
  const minsA = parseTimeSlotToMinutes(a?.timeSlot || a?.startTime);
  const minsB = parseTimeSlotToMinutes(b?.timeSlot || b?.startTime);
  if (minsA !== minsB) {
    return minsA - minsB;
  }

  // 3. CreatedAt ascending
  const createdA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createdB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  const validCreatedA = isNaN(createdA) ? 0 : createdA;
  const validCreatedB = isNaN(createdB) ? 0 : createdB;
  if (validCreatedA !== validCreatedB) {
    return validCreatedA - validCreatedB;
  }

  // 4. Stable tie-breaker by _id
  const idA = String(a?._id || a?.id || "");
  const idB = String(b?._id || b?.id || "");
  return idA.localeCompare(idB);
};

/**
 * Determines if an appointment is considered "Upcoming" or currently active:
 * - Cancelled, Rejected, Completed, or Expired are NEVER upcoming.
 * - In Progress is active / upcoming.
 * - Scheduled or Confirmed:
 *   - Video/Online: upcoming if now <= deadlineMs (where deadlineMs = start + 30m)
 *   - In-Person: upcoming if appointment date & slot has not passed
 *
 * @param {Object} appointment
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
export const isAppointmentUpcoming = (appointment, now = Date.now()) => {
  if (!appointment) return false;
  const status = String(appointment.status || "").trim().toUpperCase();

  if (["CANCELLED", "REJECTED", "COMPLETED", "EXPIRED"].includes(status)) {
    return false;
  }

  if (status === "IN PROGRESS" || status === "IN_PROGRESS") {
    return true;
  }

  const timing = getAppointmentStartAndDeadline(
    appointment.appointmentDate || appointment.date,
    appointment.timeSlot || appointment.startTime,
    appointment.timezone
  );

  if (timing) {
    return now <= timing.deadlineMs;
  }

  const apptDateMs = parseAppointmentDateTimestamp(appointment.appointmentDate || appointment.date);
  const slotMins = parseTimeSlotToMinutes(appointment.timeSlot || appointment.startTime);
  const startTimeMs = apptDateMs + (slotMins >= 0 ? slotMins * 60 * 1000 : 0);
  const deadlineMs = startTimeMs + (GRACE_PERIOD_MS || 30 * 60 * 1000);

  return now <= deadlineMs;
};

/**
 * Sorts upcoming appointments with nearest first (ascending order).
 *
 * @param {Array} appointments
 * @param {number} [now=Date.now()]
 * @returns {Array}
 */
export const sortUpcomingAppointments = (appointments, now = Date.now()) => {
  if (!Array.isArray(appointments)) return [];
  return appointments
    .filter((app) => isAppointmentUpcoming(app, now))
    .sort(compareAppointmentsAsc);
};

/**
 * Sorts past/inactive appointments with most recent first (descending order).
 *
 * @param {Array} appointments
 * @param {number} [now=Date.now()]
 * @returns {Array}
 */
export const sortPastAppointments = (appointments, now = Date.now()) => {
  if (!Array.isArray(appointments)) return [];
  return appointments
    .filter((app) => !isAppointmentUpcoming(app, now))
    .sort(compareAppointmentsDesc);
};

/**
 * Partitions appointments into upcoming (nearest first) and past (most recent first).
 *
 * @param {Array} appointments
 * @param {number} [now=Date.now()]
 * @returns {{ upcoming: Array, past: Array }}
 */
export const partitionAppointments = (appointments, now = Date.now()) => {
  return {
    upcoming: sortUpcomingAppointments(appointments, now),
    past: sortPastAppointments(appointments, now),
  };
};
