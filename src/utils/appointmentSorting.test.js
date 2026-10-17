import {
  getAppointmentDateTimeMs,
  compareAppointmentsAsc,
  compareAppointmentsDesc,
  isAppointmentUpcoming,
  sortUpcomingAppointments,
  sortPastAppointments,
  partitionAppointments,
} from "./appointmentSorting";
import { getAppointmentStartAndDeadline } from "./consultationWindow";

describe("Appointment Sorting & Partitioning Suite", () => {
  const fakeNow = new Date("2026-10-20T12:00:00Z").getTime();

  describe("getAppointmentDateTimeMs", () => {
    test("calculates accurate timestamp from date and time slot", () => {
      const ms = getAppointmentDateTimeMs("2026-10-20", "03:00 PM");
      expect(typeof ms).toBe("number");
      expect(ms).toBeGreaterThan(0);
    });

    test("handles range format by using slot start", () => {
      const msRange = getAppointmentDateTimeMs("2026-10-20", "03:00 PM - 03:30 PM");
      const msSingle = getAppointmentDateTimeMs("2026-10-20", "03:00 PM");
      expect(msRange).toBe(msSingle);
    });
  });

  describe("compareAppointmentsAsc and compareAppointmentsDesc", () => {
    const early = { appointmentDate: "2026-10-20", timeSlot: "09:00 AM" };
    const mid = { appointmentDate: "2026-10-20", timeSlot: "01:00 PM" };
    const late = { appointmentDate: "2026-10-21", timeSlot: "10:00 AM" };

    test("compareAppointmentsAsc orders nearest date/time first", () => {
      const list = [late, early, mid];
      list.sort(compareAppointmentsAsc);
      expect(list[0]).toBe(early);
      expect(list[1]).toBe(mid);
      expect(list[2]).toBe(late);
    });

    test("compareAppointmentsDesc orders most recent first", () => {
      const list = [early, late, mid];
      list.sort(compareAppointmentsDesc);
      expect(list[0]).toBe(late);
      expect(list[1]).toBe(mid);
      expect(list[2]).toBe(early);
    });
  });

  describe("isAppointmentUpcoming and boundary behavior", () => {
    const timing = getAppointmentStartAndDeadline("2026-10-20", "03:00 PM");
    const { startTimeMs, deadlineMs } = timing;

    test("returns true for confirmed appointment before start time", () => {
      const appt = {
        appointmentDate: "2026-10-20",
        timeSlot: "03:00 PM",
        status: "Scheduled",
      };
      expect(isAppointmentUpcoming(appt, startTimeMs - 1000)).toBe(true);
    });

    test("returns true during permitted 30-minute window", () => {
      const appt = {
        appointmentDate: "2026-10-20",
        timeSlot: "03:00 PM",
        status: "Confirmed",
      };
      expect(isAppointmentUpcoming(appt, startTimeMs)).toBe(true);
      expect(isAppointmentUpcoming(appt, startTimeMs + 15 * 60 * 1000)).toBe(true);
      expect(isAppointmentUpcoming(appt, deadlineMs)).toBe(true);
    });

    test("returns false when 30-minute grace period has passed (expires)", () => {
      const appt = {
        appointmentDate: "2026-10-20",
        timeSlot: "03:00 PM",
        status: "Scheduled",
      };
      expect(isAppointmentUpcoming(appt, deadlineMs + 1)).toBe(false);
      expect(isAppointmentUpcoming(appt, deadlineMs + 60 * 60 * 1000)).toBe(false);
    });

    test("returns false for cancelled, rejected, completed, or expired regardless of time", () => {
      const upcomingTime = startTimeMs - 1000;
      expect(
        isAppointmentUpcoming(
          { appointmentDate: "2026-10-20", timeSlot: "03:00 PM", status: "Cancelled" },
          upcomingTime
        )
      ).toBe(false);

      expect(
        isAppointmentUpcoming(
          { appointmentDate: "2026-10-20", timeSlot: "03:00 PM", status: "Rejected" },
          upcomingTime
        )
      ).toBe(false);

      expect(
        isAppointmentUpcoming(
          { appointmentDate: "2026-10-20", timeSlot: "03:00 PM", status: "Completed" },
          upcomingTime
        )
      ).toBe(false);

      expect(
        isAppointmentUpcoming(
          { appointmentDate: "2026-10-20", timeSlot: "03:00 PM", status: "Expired" },
          upcomingTime
        )
      ).toBe(false);
    });

    test("In Progress appointment remains upcoming/active even past the grace period", () => {
      const inProgress = {
        appointmentDate: "2026-10-20",
        timeSlot: "03:00 PM",
        status: "In Progress",
      };
      expect(isAppointmentUpcoming(inProgress, deadlineMs + 30 * 60 * 1000)).toBe(true);
    });
  });

  describe("partitionAppointments", () => {
    const timing1 = getAppointmentStartAndDeadline("2026-10-20", "01:00 PM");
    const timing2 = getAppointmentStartAndDeadline("2026-10-20", "03:00 PM");
    const timing3 = getAppointmentStartAndDeadline("2026-10-20", "05:00 PM");

    const testNow = timing2.startTimeMs + 10 * 60 * 1000; // 03:10 PM

    const apptPastConcluded = {
      _id: "past-1",
      appointmentDate: "2026-10-20",
      timeSlot: "01:00 PM",
      status: "Scheduled", // elapsed grace period -> past/expired
    };

    const apptCurrent = {
      _id: "curr-1",
      appointmentDate: "2026-10-20",
      timeSlot: "03:00 PM",
      status: "Confirmed", // currently active (03:10 PM) -> upcoming
    };

    const apptFuture = {
      _id: "future-1",
      appointmentDate: "2026-10-20",
      timeSlot: "05:00 PM",
      status: "Scheduled", // future -> upcoming
    };

    const apptCancelled = {
      _id: "canc-1",
      appointmentDate: "2026-10-20",
      timeSlot: "05:00 PM",
      status: "Cancelled", // future date, but cancelled -> must be in past
    };

    const apptCompleted = {
      _id: "comp-1",
      appointmentDate: "2026-10-20",
      timeSlot: "05:00 PM",
      status: "Completed", // completed -> must be in past
    };

    test("strictly partitions appointments and never puts old/cancelled/expired in upcoming", () => {
      const rawList = [apptCancelled, apptFuture, apptPastConcluded, apptCompleted, apptCurrent];
      const { upcoming, past } = partitionAppointments(rawList, testNow);

      // Upcoming should only have apptCurrent (03:00 PM) and apptFuture (05:00 PM)
      expect(upcoming.length).toBe(2);
      expect(upcoming[0]._id).toBe("curr-1"); // Nearest first!
      expect(upcoming[1]._id).toBe("future-1");

      // Past must contain apptCancelled, apptCompleted, and apptPastConcluded
      expect(past.length).toBe(3);
      const pastIds = past.map((p) => p._id);
      expect(pastIds).toContain("canc-1");
      expect(pastIds).toContain("comp-1");
      expect(pastIds).toContain("past-1");

      // Past should be sorted descending (most recent first)
      expect(past[0]._id).not.toBe("past-1"); // 05:00 PM items should come before 01:00 PM item
    });
  });
});
