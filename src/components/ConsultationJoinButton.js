import React from "react";
import { Link } from "react-router-dom";
import { FiVideo, FiClock, FiAlertCircle, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { getConsultationWindowState } from "../utils/consultationWindow";
import { useLanguage } from "../context/LanguageContext";

/**
 * Universal Video Consultation Action Button component.
 *
 * Implements strict consultation window rules:
 * - In-Person: Returns null (no button rendered).
 * - During 30-min window: Enabled clickable Link to /consultation/:id or /video-consultation/:id.
 * - Before start: Disabled button with "Starts at [time]".
 * - After grace period: Disabled button with "Consultation Time Exceeded".
 * - Cancelled: Disabled button with "Consultation Cancelled".
 * - Rejected: Disabled button with "Consultation Rejected".
 * - Completed: Disabled button with "Consultation Completed".
 */
const ConsultationJoinButton = ({
  appointment,
  currentTime,
  className = "",
  customEnabledText,
  iconSize = 15,
  useVideoPrefixRoute = false,
}) => {
  const { t } = useLanguage();
  if (!appointment) return null;

  const windowState = getConsultationWindowState(appointment, currentTime);

  // In-person appointments do not display a video-join button
  if (!windowState.isEligibleMode) {
    return null;
  }

  const appointmentId = appointment._id || appointment.id;
  const targetRoute = useVideoPrefixRoute
    ? `/video-consultation/${appointmentId}`
    : `/consultation/${appointmentId}`;

  // Helper icon based on status
  const getStatusIcon = () => {
    switch (windowState.status) {
      case "BEFORE_START":
        return <FiClock size={iconSize} className="btn-state-icon" />;
      case "EXPIRED":
        return <FiAlertCircle size={iconSize} className="btn-state-icon" />;
      case "CANCELLED":
      case "REJECTED":
        return <FiXCircle size={iconSize} className="btn-state-icon" />;
      case "COMPLETED":
        return <FiCheckCircle size={iconSize} className="btn-state-icon" />;
      default:
        return <FiVideo size={iconSize} className="btn-state-icon" />;
    }
  };

  const getLocalizedDisabledText = () => {
    switch (windowState.status) {
      case "BEFORE_START": {
        const timePart = windowState.buttonText.replace(/^Starts at\s*/i, "");
        return t("appointment.startsAt", { time: timePart }, windowState.buttonText);
      }
      case "EXPIRED":
        return t("appointment.timeExceeded", windowState.buttonText);
      case "CANCELLED":
        return t("appointment.appointmentCancelled", windowState.buttonText);
      case "REJECTED":
        return t("appointment.appointmentRejected", windowState.buttonText);
      case "COMPLETED":
        return t("appointment.appointmentCompleted", windowState.buttonText);
      default:
        return windowState.buttonText;
    }
  };

  if (windowState.canJoin) {
    const label = customEnabledText || t("appointment.joinVideoBtn", "Join Video Consultation");
    return (
      <Link
        to={targetRoute}
        className={`btn-video-join-active ${className}`}
        title={label}
        aria-label={label}
      >
        <FiVideo size={iconSize} className="btn-state-icon" />
        <span>{label}</span>
      </Link>
    );
  }

  const disabledText = getLocalizedDisabledText();

  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={`btn-video-join-disabled ${className}`}
      title={disabledText}
      aria-label={disabledText}
    >
      {getStatusIcon()}
      <span className="btn-status-label">{disabledText}</span>
    </button>
  );
};

export default ConsultationJoinButton;
