import React from "react";
import { Link } from "react-router-dom";
import { FiVideo, FiClock, FiAlertCircle, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { getConsultationWindowState } from "../utils/consultationWindow";

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

  if (windowState.canJoin) {
    const label = customEnabledText || "Join Video Consultation";
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

  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={`btn-video-join-disabled ${className}`}
      title={windowState.buttonText}
      aria-label={windowState.buttonText}
    >
      {getStatusIcon()}
      <span className="btn-status-label">{windowState.buttonText}</span>
    </button>
  );
};

export default ConsultationJoinButton;
