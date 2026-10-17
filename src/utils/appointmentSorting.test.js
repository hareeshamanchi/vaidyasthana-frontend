import {
  parseTimeSlotToMinutes,
  parseAppointmentDateTimestamp,
  getAppointmentDateTimeMs,
  compareAppointmentsDesc,
  sortAppointmentsDesc,
} from "./appointmentSorting";

describe("Appointment Sorting Utility", () => {
  describe("parseTimeSlotToMinutes", () => {
    it("correctly parses 12-hour AM/PM time ranges and single slots", () => {
      expect(parseTimeSlotToMinutes("09:00 AM - 09:30 AM")).toBe(540);
      expect(parseTimeSlotToMinutes("11:30 AM - 12:00 PM")).toBe(690);
      expect(parseTimeSlotToMinutes("12:00 PM - 12:30 PM")).toBe(720);
      expect(parseTimeSlotToMinutes("03:00 PM - 03:30 PM")).toBe(900);
      expect(parseTimeSlotToMinutes("4:00 PM - 4:30 PM")).toBe(960);
      expect(parseTimeSlotToMinutes("4:30 PM")).toBe(990);
      expect(parseTimeSlotToMinutes("12:00 AM")).toBe(0);
    });

    it("handles 24-hour time strings", () => {
      expect(parseTimeSlotToMinutes("16:30")).toBe(990);
      expect(parseTimeSlotToMinutes("09:00")).toBe(540);
    });

    it("safely returns -1 for missing or invalid time slots", () => {
      expect(parseTimeSlotToMinutes(null)).toBe(-1);
      expect(parseTimeSlotToMinutes("")).toBe(-1);
      expect(parseTimeSlotToMinutes("TBD")).toBe(-1);
    });
  });

  describe("parseAppointmentDateTimestamp", () => {
    it("safely extracts UTC midnight timestamp from YYYY-MM-DD strings and ISO dates", () => {
      const ts1 = parseAppointmentDateTimestamp("2026-10-16");
      const ts2 = parseAppointmentDateTimestamp("2026-10-16T00:00:00.000Z");
      expect(ts1).toBe(ts2);
      expect(ts1).toBe(Date.UTC(2026, 9, 16, 0, 0, 0, 0));
    });

    it("handles Date objects and invalid dates safely", () => {
      const d = new Date(Date.UTC(2026, 9, 16, 0, 0, 0, 0));
      expect(parseAppointmentDateTimestamp(d)).toBe(Date.UTC(2026, 9, 16, 0, 0, 0, 0));
      expect(parseAppointmentDateTimestamp(null)).toBe(0);
      expect(parseAppointmentDateTimestamp("invalid-date")).toBe(0);
    });
  });

  describe("Requirement 1 & 2: Same Date Time-Descending Sorting", () => {
    it("sorts appointments on October 16, 2026 by time descending (User Requirement Example)", () => {
      const appointments = [
        {
          _id: "3",
          appointmentDate: "2026-10-16",
          timeSlot: "3:00 PM - 3:30 PM",
          status: "Cancelled",
          reason: "Routine review",
        },
        {
          _id: "1",
          appointmentDate: "2026-10-16",
          timeSlot: "4:30 PM - 5:00 PM",
          status: "Scheduled",
          reason: "Back pain checkup",
        },
        {
          _id: "2",
          appointmentDate: "2026-10-16",
          timeSlot: "4:00 PM - 4:30 PM",
          status: "Cancelled",
          reason: "Doctor requested reschedule",
        },
      ];

      const sorted = sortAppointmentsDesc(appointments);

      expect(sorted.map((a) => `${a.timeSlot} — ${a.status}`)).toEqual([
        "4:30 PM - 5:00 PM — Scheduled",
        "4:00 PM - 4:30 PM — Cancelled",
        "3:00 PM - 3:30 PM — Cancelled",
      ]);

      // Verify records are preserved intact
      expect(sorted[0]._id).toBe("1");
      expect(sorted[0].status).toBe("Scheduled");
      expect(sorted[1]._id).toBe("2");
      expect(sorted[1].status).toBe("Cancelled");
      expect(sorted[2]._id).toBe("3");
      expect(sorted[2].status).toBe("Cancelled");
    });
  });

  describe("Requirement 3 & 4: Multi-Date Global Sorting", () => {
    it("sorts appointments across multiple dates descending, then times descending", () => {
      const appointments = [
        { _id: "oct15_1130", appointmentDate: "2026-10-15", timeSlot: "11:30 AM - 12:00 PM" },
        { _id: "oct17_0900", appointmentDate: "2026-10-17", timeSlot: "09:00 AM - 09:30 AM" },
        { _id: "oct16_1600", appointmentDate: "2026-10-16", timeSlot: "04:00 PM - 04:30 PM" },
        { _id: "oct18_1000", appointmentDate: "2026-10-18", timeSlot: "10:00 AM - 10:30 AM" },
        { _id: "oct17_1630", appointmentDate: "2026-10-17", timeSlot: "04:30 PM - 05:00 PM" },
        { _id: "oct16_1630", appointmentDate: "2026-10-16", timeSlot: "04:30 PM - 05:00 PM" },
        { _id: "oct16_1500", appointmentDate: "2026-10-16", timeSlot: "03:00 PM - 03:30 PM" },
      ];

      const sorted = sortAppointmentsDesc(appointments);

      expect(sorted.map((a) => a._id)).toEqual([
        "oct18_1000",
        "oct17_1630",
        "oct17_0900",
        "oct16_1630",
        "oct16_1600",
        "oct16_1500",
        "oct15_1130",
      ]);
    });

    it("handles edge cases gracefully (missing date or empty list)", () => {
      expect(sortAppointmentsDesc([])).toEqual([]);
      expect(sortAppointmentsDesc(null)).toEqual([]);

      const listWithBadDates = [
        { _id: "no_date", appointmentDate: null, timeSlot: "10:00 AM" },
        { _id: "valid_date", appointmentDate: "2026-10-16", timeSlot: "10:00 AM" },
      ];
      const sorted = sortAppointmentsDesc(listWithBadDates);
      expect(sorted[0]._id).toBe("valid_date");
      expect(sorted[1]._id).toBe("no_date");
    });
  });
});
