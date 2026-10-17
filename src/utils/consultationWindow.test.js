import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  parseTimeSlotToMinutes,
  extractAppointmentCalendarDate,
  formatMinutesTo12Hour,
  getAppointmentStartAndDeadline,
  getConsultationWindowState,
  GRACE_PERIOD_MS,
} from "./consultationWindow";
import ConsultationJoinButton from "../components/ConsultationJoinButton";

describe("Consultation Window & 30-Minute Grace Period Suite", () => {
  describe("parseTimeSlotToMinutes", () => {
    test("correctly parses 12-hour AM/PM formats", () => {
      expect(parseTimeSlotToMinutes("08:00 AM")).toBe(480);
      expect(parseTimeSlotToMinutes("12:00 PM")).toBe(720);
      expect(parseTimeSlotToMinutes("12:00 AM")).toBe(0);
      expect(parseTimeSlotToMinutes("03:30 PM")).toBe(930);
      expect(parseTimeSlotToMinutes("08:00 PM")).toBe(1200);
    });

    test("handles range format by parsing start slot", () => {
      expect(parseTimeSlotToMinutes("10:00 AM - 10:30 AM")).toBe(600);
      expect(parseTimeSlotToMinutes("02:30 PM - 03:00 PM")).toBe(870);
    });

    test("handles 24-hour formats", () => {
      expect(parseTimeSlotToMinutes("14:30")).toBe(870);
      expect(parseTimeSlotToMinutes("09:00")).toBe(540);
    });

    test("returns -1 for invalid or empty inputs", () => {
      expect(parseTimeSlotToMinutes("")).toBe(-1);
      expect(parseTimeSlotToMinutes(null)).toBe(-1);
      expect(parseTimeSlotToMinutes(undefined)).toBe(-1);
      expect(parseTimeSlotToMinutes("invalid-time")).toBe(-1);
    });
  });

  describe("extractAppointmentCalendarDate and formatMinutesTo12Hour", () => {
    test("extracts year, month, and day from Date object", () => {
      const d = new Date(Date.UTC(2026, 9, 20));
      const extracted = extractAppointmentCalendarDate(d);
      expect(extracted).toEqual({ year: 2026, month: 9, day: 20 });
    });

    test("extracts year, month, and day from YYYY-MM-DD string", () => {
      const extracted = extractAppointmentCalendarDate("2026-10-20");
      expect(extracted).toEqual({ year: 2026, month: 9, day: 20 });
    });

    test("formats minutes to 12-hour AM/PM string", () => {
      expect(formatMinutesTo12Hour(480)).toBe("08:00 AM");
      expect(formatMinutesTo12Hour(720)).toBe("12:00 PM");
      expect(formatMinutesTo12Hour(900)).toBe("03:00 PM");
      expect(formatMinutesTo12Hour(0)).toBe("12:00 AM");
    });
  });

  describe("getAppointmentStartAndDeadline", () => {
    test("calculates exact start and 30-minute deadline", () => {
      const timing = getAppointmentStartAndDeadline("2026-10-20", "03:00 PM");
      expect(timing).not.toBeNull();
      expect(timing.deadlineMs - timing.startTimeMs).toBe(30 * 60 * 1000);
      expect(timing.deadlineMs - timing.startTimeMs).toBe(GRACE_PERIOD_MS);
      expect(timing.formattedTime).toBe("03:00 PM");
    });
  });

  describe("getConsultationWindowState - 7 Exact UI States", () => {
    const baseAppointment = {
      _id: "appt-12345",
      appointmentDate: "2026-10-20",
      timeSlot: "03:00 PM",
      consultationType: "Video / Online",
      status: "Scheduled",
    };

    const timing = getAppointmentStartAndDeadline("2026-10-20", "03:00 PM");
    const { startTimeMs, deadlineMs } = timing;

    test("1. In-Person appointment: isEligibleMode = false, not video", () => {
      const inPerson = { ...baseAppointment, consultationType: "In-Person" };
      const state = getConsultationWindowState(inPerson, startTimeMs + 1000);
      expect(state.isEligibleMode).toBe(false);
      expect(state.canJoin).toBe(false);
      expect(state.status).toBe("NOT_VIDEO");
    });

    test("2. Cancelled appointment: buttonText = 'Consultation Cancelled', disabled", () => {
      const cancelled = { ...baseAppointment, status: "Cancelled" };
      const state = getConsultationWindowState(cancelled, startTimeMs + 1000);
      expect(state.canJoin).toBe(false);
      expect(state.status).toBe("CANCELLED");
      expect(state.buttonText).toBe("Consultation Cancelled");
    });

    test("3. Rejected appointment: buttonText = 'Consultation Rejected', disabled", () => {
      const rejected = { ...baseAppointment, status: "Rejected" };
      const state = getConsultationWindowState(rejected, startTimeMs + 1000);
      expect(state.canJoin).toBe(false);
      expect(state.status).toBe("REJECTED");
      expect(state.buttonText).toBe("Consultation Rejected");
    });

    test("4. Completed appointment: buttonText = 'Consultation Completed', disabled", () => {
      const completed = { ...baseAppointment, status: "Completed" };
      const state = getConsultationWindowState(completed, startTimeMs + 1000);
      expect(state.canJoin).toBe(false);
      expect(state.status).toBe("COMPLETED");
      expect(state.buttonText).toBe("Consultation Completed");
    });

    test("5. Before start time: buttonText = 'Starts at [time]', disabled", () => {
      const beforeTime = startTimeMs - 10 * 60 * 1000; // 10 mins before
      const state = getConsultationWindowState(baseAppointment, beforeTime);
      expect(state.canJoin).toBe(false);
      expect(state.status).toBe("BEFORE_START");
      expect(state.buttonText).toBe("Starts at 03:00 PM");
    });

    test("6. During permitted window: buttonText = 'Join Video Consultation', enabled", () => {
      // Exactly at start time
      const atStart = getConsultationWindowState(baseAppointment, startTimeMs);
      expect(atStart.canJoin).toBe(true);
      expect(atStart.status).toBe("JOINABLE");
      expect(atStart.buttonText).toBe("Join Video Consultation");

      // 15 minutes into window
      const midWindow = getConsultationWindowState(baseAppointment, startTimeMs + 15 * 60 * 1000);
      expect(midWindow.canJoin).toBe(true);
      expect(midWindow.status).toBe("JOINABLE");

      // Exactly at 30-minute deadline
      const atDeadline = getConsultationWindowState(baseAppointment, deadlineMs);
      expect(atDeadline.canJoin).toBe(true);
      expect(atDeadline.status).toBe("JOINABLE");
    });

    test("7. After 30-minute grace period: buttonText = 'Consultation Time Exceeded', disabled", () => {
      // 1 millisecond past deadline
      const expiredImmediate = getConsultationWindowState(baseAppointment, deadlineMs + 1);
      expect(expiredImmediate.canJoin).toBe(false);
      expect(expiredImmediate.status).toBe("EXPIRED");
      expect(expiredImmediate.buttonText).toBe("Consultation Time Exceeded");

      // 1 hour after start
      const expiredLate = getConsultationWindowState(baseAppointment, startTimeMs + 60 * 60 * 1000);
      expect(expiredLate.canJoin).toBe(false);
      expect(expiredLate.status).toBe("EXPIRED");
      expect(expiredLate.buttonText).toBe("Consultation Time Exceeded");
    });
  });

  describe("ConsultationJoinButton Component", () => {
    const timing = getAppointmentStartAndDeadline("2026-10-20", "03:00 PM");
    const { startTimeMs, deadlineMs } = timing;

    const baseAppointment = {
      _id: "appt-999",
      appointmentDate: "2026-10-20",
      timeSlot: "03:00 PM",
      consultationType: "Video / Online",
      status: "Scheduled",
    };

    test("does not render any button for In-Person appointments", () => {
      const inPerson = { ...baseAppointment, consultationType: "In-Person" };
      const { container } = render(
        <BrowserRouter>
          <ConsultationJoinButton appointment={inPerson} currentTime={startTimeMs} />
        </BrowserRouter>
      );
      expect(container.firstChild).toBeNull();
    });

    test("renders disabled button with 'Starts at [time]' before start", () => {
      const beforeTime = startTimeMs - 5 * 60 * 1000;
      render(
        <BrowserRouter>
          <ConsultationJoinButton appointment={baseAppointment} currentTime={beforeTime} />
        </BrowserRouter>
      );

      const btn = screen.getByRole("button", { name: /Starts at 03:00 PM/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("btn-video-join-disabled");
    });

    test("renders enabled Link with 'Join Video Consultation' during window", () => {
      const activeTime = startTimeMs + 10 * 60 * 1000;
      render(
        <BrowserRouter>
          <ConsultationJoinButton appointment={baseAppointment} currentTime={activeTime} />
        </BrowserRouter>
      );

      const link = screen.getByRole("link", { name: /Join Video Consultation/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/consultation/appt-999");
    });

    test("renders disabled button with 'Consultation Time Exceeded' after grace period", () => {
      const expiredTime = deadlineMs + 5000;
      render(
        <BrowserRouter>
          <ConsultationJoinButton appointment={baseAppointment} currentTime={expiredTime} />
        </BrowserRouter>
      );

      const btn = screen.getByRole("button", { name: /Consultation Time Exceeded/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("btn-video-join-disabled");
    });

    test("renders disabled button for Cancelled appointments", () => {
      const cancelled = { ...baseAppointment, status: "Cancelled" };
      render(
        <BrowserRouter>
          <ConsultationJoinButton appointment={cancelled} currentTime={startTimeMs} />
        </BrowserRouter>
      );

      const btn = screen.getByRole("button", { name: /Consultation Cancelled/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("btn-video-join-disabled");
    });

    test("renders disabled button for Rejected appointments", () => {
      const rejected = { ...baseAppointment, status: "Rejected" };
      render(
        <BrowserRouter>
          <ConsultationJoinButton appointment={rejected} currentTime={startTimeMs} />
        </BrowserRouter>
      );

      const btn = screen.getByRole("button", { name: /Consultation Rejected/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("btn-video-join-disabled");
    });

    test("renders disabled button for Completed appointments", () => {
      const completed = { ...baseAppointment, status: "Completed" };
      render(
        <BrowserRouter>
          <ConsultationJoinButton appointment={completed} currentTime={startTimeMs} />
        </BrowserRouter>
      );

      const btn = screen.getByRole("button", { name: /Consultation Completed/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("btn-video-join-disabled");
    });
  });
});
