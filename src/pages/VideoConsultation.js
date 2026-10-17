import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiVideo,
  FiVideoOff,
  FiMic,
  FiMicOff,
  FiPhoneOff,
  FiMaximize,
  FiMinimize,
  FiArrowLeft,
  FiUser,
  FiCalendar,
  FiClock,
  FiShield,
  FiAlertTriangle,
  FiRefreshCw,
  FiCheckCircle,
  FiInfo,
  FiActivity,
  FiFileText,
} from "react-icons/fi";
import { appointmentsAPI } from "../services/api";
import "./VideoConsultation.css";

const VideoConsultation = () => {
  const { id: appointmentId } = useParams();
  const navigate = useNavigate();

  // Consultation Session State
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [meetingData, setMeetingData] = useState(null);
  const [connectionState, setConnectionState] = useState("authorizing"); // authorizing | ready | connecting | connected | ended | error
  const [serviceError, setServiceError] = useState("");

  // Media Permissions State
  const [permissionStatus, setPermissionStatus] = useState("idle"); // idle | requesting | granted | denied
  const [permissionMessage, setPermissionMessage] = useState("");

  // Controls & Call Stats
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteParticipantJoined, setRemoteParticipantJoined] = useState(false);

  // References
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const timerRef = useRef(null);
  const containerWrapperRef = useRef(null);

  // Format call duration helper
  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 1. Authorize Appointment & Retrieve Meeting Identifier
  const authorizeSession = useCallback(async () => {
    setLoading(true);
    setAuthError("");
    setServiceError("");
    setConnectionState("authorizing");

    try {
      const res = await appointmentsAPI.getVideoAccess(appointmentId);
      if (res.data?.success && res.data?.meeting) {
        setMeetingData(res.data.meeting);
        setConnectionState("ready");
      } else {
        setAuthError(res.data?.message || "Unable to authorize video consultation session.");
        setConnectionState("error");
      }
    } catch (err) {
      console.error("Video consultation authorization error:", err);
      const status = err.response?.status;
      const errMsg =
        err.response?.data?.message ||
        (status === 403
          ? "Access Denied: You are not an authorized participant for this consultation."
          : status === 404
          ? "Appointment not found or does not exist."
          : status === 400
          ? err.response?.data?.message || "Video consultation is not available for this appointment."
          : "Unable to authorize video consultation. Please verify server status.");
      setAuthError(errMsg);
      setConnectionState("error");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    authorizeSession();
  }, [authorizeSession]);

  // 2. Dynamically Load Jitsi Meet External API Script
  const loadJitsiScript = useCallback((domain) => {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        return resolve(window.JitsiMeetExternalAPI);
      }

      const existingScript = document.querySelector(`script[src*="${domain}/external_api.js"]`);
      if (existingScript) {
        existingScript.onload = () => resolve(window.JitsiMeetExternalAPI);
        existingScript.onerror = () => reject(new Error("Failed to load Jitsi Meet script."));
        return;
      }

      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;

      const timeout = setTimeout(() => {
        reject(new Error("Timeout loading Jitsi Meet WebRTC library from " + domain));
      }, 15000);

      script.onload = () => {
        clearTimeout(timeout);
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI);
        } else {
          reject(new Error("JitsiMeetExternalAPI not found on window after script load."));
        }
      };

      script.onerror = () => {
        clearTimeout(timeout);
        reject(
          new Error(
            `Could not reach Jitsi Meet service at https://${domain}/external_api.js. Please check your network, browser shields, or ad-blocker.`
          )
        );
      };

      document.head.appendChild(script);
    });
  }, []);

  // 3. Request Camera and Microphone Permissions on Demand (Only inside consultation)
  const requestMediaPermissions = async () => {
    setPermissionStatus("requesting");
    setPermissionMessage("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Browser does not support getUserMedia or is insecure origin
      setPermissionStatus("granted");
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Immediately release test tracks so Jitsi has full hardware control
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus("granted");
      return true;
    } catch (err) {
      console.warn("Media permissions check:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionStatus("denied");
        setPermissionMessage(
          "Camera or Microphone permission was blocked. Please enable camera and microphone permissions in your browser's site settings (lock icon in address bar) and click 'Retry Access'."
        );
        return false;
      } else {
        // Device not found or partial support - let Jitsi handle device discovery
        setPermissionStatus("granted");
        return true;
      }
    }
  };

  // 4. Initialize Jitsi Meet Call
  const startVideoCall = async () => {
    if (!meetingData) return;

    // Check media permissions appropriately before entering the room
    const permitted = await requestMediaPermissions();
    if (!permitted) return;

    setConnectionState("connecting");
    setServiceError("");

    try {
      const domain =
        process.env.REACT_APP_JITSI_DOMAIN ||
        meetingData.domain ||
        "meet.jit.si";

      await loadJitsiScript(domain);

      if (!jitsiContainerRef.current) {
        throw new Error("Video container element is not available.");
      }

      // Cleanup any previous instance
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {
          console.warn("Dispose error:", e);
        }
        jitsiApiRef.current = null;
      }

      // Empty the container
      jitsiContainerRef.current.innerHTML = "";

      const options = {
        roomName: meetingData.roomName,
        width: "100%",
        height: "100%",
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: meetingData.displayName || "Participant",
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          toolbarButtons: [
            "microphone",
            "camera",
            "closedcaptions",
            "desktop",
            "fullscreen",
            "fodeviceselection",
            "hangup",
            "chat",
            "settings",
            "raisehand",
            "videoquality",
            "filmstrip",
            "tileview",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DEFAULT_REMOTE_DISPLAY_NAME:
            meetingData.userRole === "doctor"
              ? meetingData.patientName || "Patient"
              : meetingData.doctorName || "Doctor",
          MOBILE_APP_PROMO: false,
        },
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;

      // Event Listeners
      api.addEventListener("videoConferenceJoined", (event) => {
        setConnectionState("connected");
        // Start duration counter
        setCallDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      });

      api.addEventListener("participantJoined", (event) => {
        setRemoteParticipantJoined(true);
      });

      api.addEventListener("participantLeft", (event) => {
        // Still in room, but remote peer left
      });

      api.addEventListener("audioMuteStatusChanged", (event) => {
        setIsAudioMuted(!!event.muted);
      });

      api.addEventListener("videoMuteStatusChanged", (event) => {
        setIsVideoMuted(!!event.muted);
      });

      api.addEventListener("videoConferenceLeft", () => {
        handleCallFinished();
      });

      api.addEventListener("readyToClose", () => {
        handleCallFinished();
      });
    } catch (err) {
      console.error("Jitsi initialization error:", err);
      setServiceError(
        err.message ||
          "Unable to establish video connection. Please check your internet connectivity or network firewall settings."
      );
      setConnectionState("error");
    }
  };

  const handleCallFinished = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setConnectionState("ended");
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.dispose();
      } catch (e) {
        // ignore dispose issues on close
      }
      jitsiApiRef.current = null;
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {
          // ignore
        }
        jitsiApiRef.current = null;
      }
    };
  }, []);

  // Custom Controls Delegation
  const toggleAudio = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("toggleAudio");
    }
  };

  const toggleVideo = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("toggleVideo");
    }
  };

  const toggleFullscreen = () => {
    if (!containerWrapperRef.current) return;
    if (!document.fullscreenElement) {
      containerWrapperRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.warn("Fullscreen request error:", err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.warn("Exit fullscreen error:", err));
    }
  };

  const handleHangup = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("hangup");
    } else {
      handleCallFinished();
    }
  };

  // ==========================================
  // Render: 1. Authorization & Loading State
  // ==========================================
  if (loading) {
    return (
      <div className="video-consultation-loading-wrap">
        <div className="consult-loading-card">
          <div className="consult-spinner-ring"></div>
          <h2>Securing Clinical Consultation Channel</h2>
          <p>Verifying appointment authorization, participant roles, and cryptographic room tokens...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: 2. Authorization or Service Error State
  // ==========================================
  if (authError || (connectionState === "error" && serviceError)) {
    return (
      <div className="video-consultation-error-wrap">
        <div className="consult-error-card">
          <div className="error-icon-circle">
            <FiAlertTriangle size={36} />
          </div>
          <h2>Consultation Access Restricted</h2>
          <p className="error-desc">{authError || serviceError}</p>

          <div className="error-guidance-box">
            <div className="guidance-title">
              <FiShield size={16} /> Clinical Security & Policy
            </div>
            <ul>
              <li>Video consultations are strictly reserved for the assigned patient and clinician.</li>
              <li>Cancelled, rejected, or already completed visits cannot initiate active calls.</li>
              <li>In-person consultations do not offer WebRTC telehealth rooms.</li>
            </ul>
          </div>

          <div className="error-actions-row">
            {serviceError && !authError ? (
              <button
                className="btn-retry-consult"
                onClick={startVideoCall}
                type="button"
              >
                <FiRefreshCw size={16} /> Retry Call Connection
              </button>
            ) : null}
            <button
              className="btn-back-appts"
              onClick={() => navigate("/appointment")}
              type="button"
            >
              <FiArrowLeft size={16} /> Return to Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: 3. Call Ended Summary State
  // ==========================================
  if (connectionState === "ended") {
    return (
      <div className="video-consultation-ended-wrap">
        <div className="consult-ended-card">
          <div className="ended-icon-circle">
            <FiCheckCircle size={40} />
          </div>
          <h2>Consultation Session Concluded</h2>
          <p className="ended-subtitle">
            You have left the video room for appointment with{" "}
            <strong>
              {meetingData?.userRole === "doctor" ? meetingData?.patientName : meetingData?.doctorName}
            </strong>
            .
          </p>

          <div className="ended-stats-grid">
            <div className="stat-box">
              <span className="stat-label">Call Duration</span>
              <span className="stat-val">{formatDuration(callDuration)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Consultation Mode</span>
              <span className="stat-val">{meetingData?.consultationType || "Video / Online"}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Department</span>
              <span className="stat-val">{meetingData?.department || "General Medicine"}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Scheduled Slot</span>
              <span className="stat-val">{meetingData?.timeSlot || "Scheduled"}</span>
            </div>
          </div>

          <div className="ended-actions-row">
            {meetingData?.userRole === "doctor" ? (
              <>
                <Link to="/doctor-dashboard" className="btn-primary-ended">
                  <FiActivity size={16} /> Doctor Dashboard & Complete Visit
                </Link>
                <Link to="/appointment" className="btn-secondary-ended">
                  <FiCalendar size={16} /> View Appointments
                </Link>
              </>
            ) : (
              <>
                <Link to="/appointment" className="btn-primary-ended">
                  <FiCalendar size={16} /> Back to My Appointments
                </Link>
                <Link to="/dashboard" className="btn-secondary-ended">
                  <FiFileText size={16} /> Return to Patient Vault
                </Link>
              </>
            )}
            <button
              className="btn-rejoin-call"
              onClick={startVideoCall}
              type="button"
              title="Re-enter meeting room if you left accidentally"
            >
              <FiRefreshCw size={15} /> Rejoin Consultation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: 4. Pre-Call Lobby / Permission Request State
  // ==========================================
  if (connectionState === "ready") {
    return (
      <div className="video-consultation-lobby-wrap">
        <div className="consult-lobby-card">
          <div className="lobby-top-badge">
            <span className="live-dot pulse"></span> Telehealth Consultation Ready
          </div>
          <h2>Ready to enter your Consultation Room</h2>
          <p className="lobby-subtitle">
            Welcome, <strong>{meetingData?.displayName}</strong>. You are authorized to join this clinical appointment.
          </p>

          <div className="lobby-details-box">
            <div className="lobby-detail-row">
              <div className="detail-col">
                <span className="col-label">Doctor</span>
                <span className="col-value doctor-name">{meetingData?.doctorName}</span>
                <span className="col-sub">{meetingData?.department}</span>
              </div>
              <div className="detail-col">
                <span className="col-label">Patient</span>
                <span className="col-value">{meetingData?.patientName}</span>
                <span className="col-sub">Assigned Patient</span>
              </div>
            </div>

            <div className="lobby-detail-row meta-row">
              <div className="meta-item">
                <FiCalendar className="meta-icon" />
                <span>
                  {meetingData?.appointmentDate
                    ? new Date(meetingData.appointmentDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Scheduled Date"}
                </span>
              </div>
              <div className="meta-item">
                <FiClock className="meta-icon" />
                <span>{meetingData?.timeSlot}</span>
              </div>
              <div className="meta-item">
                <FiShield className="meta-icon text-teal" />
                <span>Encrypted Room</span>
              </div>
            </div>
          </div>

          {permissionStatus === "denied" && (
            <div className="lobby-permission-alert">
              <FiAlertTriangle className="alert-icon" />
              <div>
                <strong>Camera or Microphone Permission Needed</strong>
                <p>{permissionMessage}</p>
              </div>
            </div>
          )}

          <div className="lobby-actions-group">
            <button
              className="btn-join-call-primary"
              onClick={startVideoCall}
              type="button"
              disabled={permissionStatus === "requesting"}
            >
              <FiVideo size={18} />
              {permissionStatus === "requesting" ? "Requesting Permissions..." : "Enter Video Consultation"}
            </button>
            <button
              className="btn-cancel-lobby"
              onClick={() => navigate(meetingData?.userRole === "doctor" ? "/doctor-dashboard" : "/appointment")}
              type="button"
            >
              <FiArrowLeft size={16} /> Return to Dashboard
            </button>
          </div>

          <div className="lobby-disclaimer">
            <FiInfo size={14} />
            <span>
              Audio and video streams are transmitted using WebRTC peer-to-peer protocols. Camera and microphone hardware access is only activated after clicking &quot;Enter Video Consultation&quot;.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: 5. Live In-Call Screen with Dedicated UI & Floating Controls
  // ==========================================
  return (
    <div className="video-consultation-fullscreen-container" ref={containerWrapperRef}>
      {/* Top Clinical Consultation Bar */}
      <header className="consultation-top-bar">
        <div className="top-bar-left">
          <button
            className="btn-top-back"
            onClick={handleHangup}
            type="button"
            title="Leave consultation and return to appointments"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="consultation-title-wrap">
            <div className="brand-pill">Vaidyasthana Telehealth</div>
            <h1 className="room-title">
              {meetingData?.userRole === "doctor"
                ? `Consultation with ${meetingData?.patientName}`
                : `Consultation with ${meetingData?.doctorName}`}
            </h1>
          </div>
        </div>

        <div className="top-bar-center">
          <div className="call-live-indicator">
            <span
              className={`status-circle ${
                connectionState === "connected" ? "connected" : "connecting"
              }`}
            ></span>
            <span className="status-text">
              {connectionState === "connected"
                ? `LIVE • ${formatDuration(callDuration)}${
                    remoteParticipantJoined ? " • In Call" : " • Waiting for Peer"
                  }`
                : "Connecting to Room..."}
            </span>
          </div>
        </div>

        <div className="top-bar-right">
          <div className="participant-chip">
            <FiUser size={14} />
            <span>{meetingData?.displayName} ({meetingData?.userRole})</span>
          </div>
          <button
            className="btn-icon-top"
            onClick={toggleFullscreen}
            type="button"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
          </button>
        </div>
      </header>

      {/* Main Video Viewport */}
      <main className="consultation-video-viewport">
        {connectionState === "connecting" && (
          <div className="viewport-connecting-overlay">
            <div className="connecting-spinner"></div>
            <h3>Establishing Secure WebRTC Media Gateway</h3>
            <p>Connecting to {meetingData?.doctorName} and {meetingData?.patientName}...</p>
          </div>
        )}

        {/* DOM node where Jitsi Meet IFrame renders */}
        <div className="jitsi-iframe-container" ref={jitsiContainerRef}></div>
      </main>

      {/* Bottom Floating Control Bar */}
      <footer className="consultation-control-bar">
        <div className="control-buttons-wrapper">
          <button
            className={`btn-control-toggle ${isAudioMuted ? "muted" : "active"}`}
            onClick={toggleAudio}
            type="button"
            title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
            aria-label={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isAudioMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
            <span className="control-label">{isAudioMuted ? "Unmute" : "Mute"}</span>
          </button>

          <button
            className={`btn-control-toggle ${isVideoMuted ? "muted" : "active"}`}
            onClick={toggleVideo}
            type="button"
            title={isVideoMuted ? "Turn On Camera" : "Turn Off Camera"}
            aria-label={isVideoMuted ? "Turn On Camera" : "Turn Off Camera"}
          >
            {isVideoMuted ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
            <span className="control-label">{isVideoMuted ? "Start Video" : "Stop Video"}</span>
          </button>

          <button
            className="btn-control-toggle"
            onClick={toggleFullscreen}
            type="button"
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
            <span className="control-label">{isFullscreen ? "Exit Full" : "Fullscreen"}</span>
          </button>

          <button
            className="btn-control-hangup"
            onClick={handleHangup}
            type="button"
            title="Leave Video Consultation"
            aria-label="Leave Consultation"
          >
            <FiPhoneOff size={22} />
            <span className="control-label">Leave Call</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default VideoConsultation;
