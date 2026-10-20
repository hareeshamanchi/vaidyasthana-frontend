import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import "./DoctorDashboard.css";
import { doctorAPI, reportsAPI, appointmentsAPI, authAPI } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getSocket } from "../services/socket";
import {
  sortAppointmentsDesc,
  partitionAppointments,
} from "../utils/appointmentSorting";
import ConsultationJoinButton from "../components/ConsultationJoinButton";
import { useConsultationTimer } from "../utils/consultationWindow";
import UploadProgressCard from "../components/UploadProgressCard";
import DoctorFollowUpManagement from "../components/DoctorFollowUpManagement";
import {
  FiShield,
  FiSearch,
  FiFileText,
  FiEye,
  FiRefreshCw,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiUploadCloud,
  FiPlus,
  FiX,
  FiFolder,
  FiCalendar,
  FiClock,
  FiPhone,
  FiMail,
  FiCheck,
  FiActivity,
  FiEdit2,
  FiLock,
  FiLogOut,
} from "react-icons/fi";

const CATEGORIES = [
  "Laboratory Report",
  "Radiology & Imaging",
  "Prescription",
  "Discharge Summary",
  "Cardiology",
  "Pathology",
  "Medical Report",
];

const DoctorDashboard = () => {
  const { user, loading, updateUserProfile, logoutAll } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [patientId, setPatientId] = useState("");
  const [reports, setReports] = useState([]);
  const [associatedPatients, setAssociatedPatients] = useState([]);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchedPatient, setSearchedPatient] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Doctor Assigned Appointments State
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentTab, setAppointmentTab] = useState("all"); // 'all' | 'upcoming' | 'past'
  const currentTime = useConsultationTimer(15000);

  // Partition doctor appointments into upcoming (nearest first) and past (most recent first)
  const { upcoming: upcomingAppointments, past: pastAppointments } = useMemo(() => {
    return partitionAppointments(doctorAppointments, currentTime);
  }, [doctorAppointments, currentTime]);

  // Quick Follow-Up Pre-fill State
  const [followUpPrefillRequest, setFollowUpPrefillRequest] = useState(null);

  // Doctor Verification State
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");
  const [verificationReview, setVerificationReview] = useState(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [idProofFile, setIdProofFile] = useState(null);
  const [medProofFile, setMedProofFile] = useState(null);
  const [medRegNumber, setMedRegNumber] = useState(user?.medicalRegistrationNumber || "");
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // Doctor Upload State
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("Laboratory Report");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("Preparing your report");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [completedReport, setCompletedReport] = useState(null);
  const pollTimerRef = useRef(null);

  // Audit & Reassignment State
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [reassigningId, setReassigningId] = useState(null);

  // Doctor Profile Editing State
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [doctorProfileData, setDoctorProfileData] = useState({
    profilePhoto: user?.profilePhoto || "",
    specialization: user?.specialization || "General Medicine",
    qualifications: user?.qualifications || "",
    medicalRegistrationNumber: user?.medicalRegistrationNumber || "",
    experienceYears: user?.experienceYears !== undefined ? user.experienceYears : 5,
    consultationFee: user?.consultationFee !== undefined ? user.consultationFee : 500,
    languagesSpoken: Array.isArray(user?.languagesSpoken)
      ? user.languagesSpoken.join(", ")
      : "English, Hindi",
  });
  const [savingDoctorProfile, setSavingDoctorProfile] = useState(false);
  const [doctorProfileMsg, setDoctorProfileMsg] = useState("");
  const [doctorProfileError, setDoctorProfileError] = useState("");

  useEffect(() => {
    if (user) {
      setDoctorProfileData({
        profilePhoto: user.profilePhoto || "",
        specialization: user.specialization || "General Medicine",
        qualifications: user.qualifications || "",
        medicalRegistrationNumber: user.medicalRegistrationNumber || "",
        experienceYears: user.experienceYears !== undefined ? user.experienceYears : 5,
        consultationFee: user.consultationFee !== undefined ? user.consultationFee : 500,
        languagesSpoken: Array.isArray(user.languagesSpoken)
          ? user.languagesSpoken.join(", ")
          : "English, Hindi",
      });
    }
  }, [user]);

  const handleSaveDoctorProfile = async (e) => {
    e.preventDefault();
    setSavingDoctorProfile(true);
    setDoctorProfileMsg("");
    setDoctorProfileError("");

    const payload = {
      profilePhoto: doctorProfileData.profilePhoto.trim(),
      specialization: doctorProfileData.specialization.trim(),
      qualifications: doctorProfileData.qualifications.trim(),
      medicalRegistrationNumber: doctorProfileData.medicalRegistrationNumber.trim(),
      experienceYears: Number(doctorProfileData.experienceYears) || 0,
      consultationFee: Number(doctorProfileData.consultationFee) || 0,
      languagesSpoken: doctorProfileData.languagesSpoken
        ? doctorProfileData.languagesSpoken
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };

    try {
      const res = await authAPI.updateDoctorProfile(payload);
      if (updateUserProfile && res.data?.doctor) {
        updateUserProfile(res.data.doctor);
      }
      setDoctorProfileMsg("Doctor credentials updated successfully.");
      setTimeout(() => {
        setIsProfileEditOpen(false);
        setDoctorProfileMsg("");
      }, 1200);
    } catch (err) {
      console.error("Save doctor profile error:", err);
      setDoctorProfileError(
        err.response?.data?.message || "Failed to update doctor profile."
      );
    } finally {
      setSavingDoctorProfile(false);
    }
  };

  // Security & 2FA State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState("");
  const [loading2FA, setLoading2FA] = useState(false);
  const [securityMsg, setSecurityMsg] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [disablePasswordInput, setDisablePasswordInput] = useState("");
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  const handleStart2FASetup = async () => {
    setLoading2FA(true);
    setSecurityError("");
    setSecurityMsg("");
    try {
      const res = await authAPI.setup2FA();
      setTwoFactorSetupData(res.data);
    } catch (err) {
      console.error("2FA setup error:", err);
      setSecurityError(
        err.response?.data?.message || "Failed to initiate 2FA setup."
      );
    } finally {
      setLoading2FA(false);
    }
  };

  const handleConfirm2FAEnable = async (e) => {
    e.preventDefault();
    if (!twoFactorVerifyCode || twoFactorVerifyCode.trim().length !== 6) {
      setSecurityError("Please enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading2FA(true);
    setSecurityError("");
    try {
      const res = await authAPI.enable2FA(twoFactorVerifyCode.trim());
      setSecurityMsg(res.data?.message || "Two-Factor Authentication is now active!");
      if (updateUserProfile) {
        updateUserProfile({ twoFactorEnabled: true });
      }
      setTwoFactorSetupData(null);
      setTwoFactorVerifyCode("");
    } catch (err) {
      console.error("Enable 2FA error:", err);
      setSecurityError(
        err.response?.data?.message ||
          "Invalid authenticator code. Please check your clock and code."
      );
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!disablePasswordInput) {
      setSecurityError("Account password is required to disable 2FA.");
      return;
    }
    setLoading2FA(true);
    setSecurityError("");
    try {
      const res = await authAPI.disable2FA({ password: disablePasswordInput });
      setSecurityMsg(res.data?.message || "Two-Factor Authentication disabled.");
      if (updateUserProfile) {
        updateUserProfile({ twoFactorEnabled: false });
      }
      setIsDisabling2FA(false);
      setDisablePasswordInput("");
    } catch (err) {
      console.error("Disable 2FA error:", err);
      setSecurityError(
        err.response?.data?.message || "Failed to disable 2FA. Verify password."
      );
    } finally {
      setLoading2FA(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (
      !window.confirm(
        "Are you sure you want to log out from all devices? All other active sessions will be terminated immediately."
      )
    ) {
      return;
    }
    try {
      if (logoutAll) {
        await logoutAll();
      } else {
        await authAPI.logoutAll();
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Logout all error:", err);
      alert("Failed to revoke all sessions.");
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await doctorAPI.getPatients();
      setAssociatedPatients(res.data?.patients || []);
    } catch (err) {
      console.warn("Could not load associated patients:", err.message);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
      return;
    }

    if (user && user.role !== "doctor" && user.role !== "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (user) {
      fetchPatients();
    }
  }, [user, loading, navigate, fetchPatients]);

  const fetchDoctorAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const res = await appointmentsAPI.getAppointments();
      const list = res.data?.appointments || [];
      const sorted = sortAppointmentsDesc(list);
      setDoctorAppointments(sorted);
    } catch (err) {
      console.warn("Could not load doctor appointments:", err.message);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const fetchVerificationStatus = useCallback(async () => {
    try {
      const res = await doctorAPI.getVerificationStatus();
      if (res.data?.doctor) {
        setVerificationStatus(res.data.doctor.verificationStatus || "not_submitted");
        setVerificationReview(res.data.doctor.verificationReview || null);
        if (res.data.doctor.medicalRegistrationNumber) {
          setMedRegNumber(res.data.doctor.medicalRegistrationNumber);
        }
      }
    } catch (err) {
      console.warn("Could not fetch verification status:", err.message);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDoctorAppointments();
      fetchVerificationStatus();
    }
  }, [user, fetchDoctorAppointments, fetchVerificationStatus]);

  // Real-time synchronization
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleApptUpdate = () => {
      fetchDoctorAppointments();
      fetchPatients();
    };

    const handleVerifUpdate = () => {
      fetchVerificationStatus();
    };

    socket.on("appointment:update", handleApptUpdate);
    socket.on("verification:update", handleVerifUpdate);

    return () => {
      socket.off("appointment:update", handleApptUpdate);
      socket.off("verification:update", handleVerifUpdate);
    };
  }, [fetchDoctorAppointments, fetchVerificationStatus, fetchPatients]);

  // Periodic polling (30s) to keep appointments and statuses synchronized
  useEffect(() => {
    if (!user) return;
    const pollTimer = setInterval(() => {
      fetchDoctorAppointments();
    }, 30000);
    return () => clearInterval(pollTimer);
  }, [user, fetchDoctorAppointments]);

  const handleUpdateAppointment = async (apptId, status, rejectionReason = "") => {
    try {
      await appointmentsAPI.updateAppointment(apptId, { status, rejectionReason });
      fetchDoctorAppointments();
      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update appointment status.");
    }
  };

  const handlePromptReject = (apptId) => {
    const reason = window.prompt("Reason for rejecting or rescheduling consultation (optional):");
    if (reason !== null) {
      handleUpdateAppointment(apptId, "Rejected", reason);
    }
  };

  const handleSubmitVerificationDocs = async (e) => {
    e.preventDefault();
    if (!idProofFile || !medProofFile) {
      alert("Please upload both your Government Identity Proof and Medical Registration Certificate.");
      return;
    }

    const formData = new FormData();
    formData.append("identityProof", idProofFile);
    formData.append("medicalRegistrationProof", medProofFile);
    if (medRegNumber) {
      formData.append("medicalRegistrationNumber", medRegNumber);
    }

    setIsSubmittingVerification(true);
    try {
      await doctorAPI.uploadVerificationDocuments(formData);
      alert("Verification documents uploaded successfully! Your credentials have been submitted for admin review.");
      setIsVerificationModalOpen(false);
      fetchVerificationStatus();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload verification documents.");
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleFetchReports = useCallback(async (searchId) => {
    const targetId = searchId || patientId;
    if (!targetId || targetId.trim() === "") {
      setMessage("Please enter or select a Patient ID.");
      return;
    }

    const cleanId = targetId.trim();
    setMessage("Fetching patient records from encrypted vault...");
    setIsSearching(true);

    try {
      // 1. Fetch Patient Reports (backend enforces doctor-patient assignment)
      const response = await doctorAPI.getPatientReports(cleanId);
      const data = response.data || [];
      setReports(data);

      // 2. Fetch Patient Profile Details if available
      try {
        const patientDetailRes = await doctorAPI.getPatientDetails(cleanId);
        if (patientDetailRes.data?.patient) {
          setSelectedPatient(patientDetailRes.data.patient);
        } else {
          setSelectedPatient({ _id: cleanId, name: `Patient ${cleanId.slice(0, 8)}` });
        }
      } catch (detailErr) {
        // Re-throw 403 Forbidden so unauthorized lookups are strictly blocked
        if (detailErr.response?.status === 403) {
          throw detailErr;
        }
        // Fallback patient representation for offline/mock environments
        setSelectedPatient({ _id: cleanId, name: `Patient ${cleanId.slice(0, 8)}` });
      }

      setSearchedPatient(cleanId);

      if (data.length === 0) {
        setMessage(`No prior medical records found for patient ${cleanId}. You can upload a new report below.`);
      } else {
        setMessage(`Found ${data.length} medical document(s) for patient ${cleanId}.`);
      }
    } catch (error) {
      console.error("Error fetching patient reports:", error);
      setReports([]);
      setSelectedPatient(null);
      setSearchedPatient("");
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to fetch reports. Verify the Patient ID and ensure backend is online."
      );
    } finally {
      setIsSearching(false);
    }
  }, [patientId]);

  // Deep-link auto-lookup when redirected from appointments or notifications
  useEffect(() => {
    if (user && location.search) {
      const queryParams = new URLSearchParams(location.search);
      const queryPatientId = queryParams.get("patientId");
      if (queryPatientId && queryPatientId.trim()) {
        const cleanId = queryPatientId.trim();
        setPatientId(cleanId);
        handleFetchReports(cleanId);
      }
    }
  }, [location.search, user, handleFetchReports]);

  const handleSelectAssociatedPatient = (pat) => {
    const id = pat._id || pat.id;
    setPatientId(id);
    setSelectedPatient(pat);
    handleFetchReports(id);
  };

  const handleFileUpload = async (e) => {
    if (e) e.preventDefault();
    const targetPatientId = selectedPatient?._id;
    if (!targetPatientId) {
      setMessage("Please look up or select an authorized patient before uploading documents.");
      return;
    }

    if (files.length === 0 || isUploading) {
      return;
    }

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });
    // Critical: Explicitly assign patientId so report belongs to patient
    formData.append("patientId", targetPatientId);
    formData.append("category", category);
    formData.append("notes", notes);

    setIsUploading(true);
    setUploadStage("Preparing your report");
    setUploadProgress(0);
    setUploadError(null);
    setCompletedReport(null);
    setMessage("");

    setTimeout(() => {
      setUploadStage("Uploading your medical report");
    }, 250);

    try {
      const res = await reportsAPI.uploadReports(formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.min(
            99,
            Math.round((progressEvent.loaded * 100) / progressEvent.total)
          );
          setUploadProgress(percent);
        }
      });

      const reportData = res.data?.reports?.[0];
      const jobId = res.data?.jobId || reportData?._id;
      setActiveJobId(jobId);

      if (reportData?.analysisStatus === "Completed") {
        setUploadProgress(100);
        setUploadStage("Analysis complete");
        setCompletedReport(reportData);
        setIsUploading(false);
        setFiles([]);
        setNotes("");
        handleFetchReports(targetPatientId);
        return;
      }

      setUploadStage(res.data?.stage || "Extracting text from your document");

      if (!jobId) {
        setIsUploading(false);
        setUploadStage("Analysis complete");
        setFiles([]);
        setNotes("");
        handleFetchReports(targetPatientId);
        return;
      }

      let pollCount = 0;
      const maxPolls = 80;

      pollTimerRef.current = setInterval(async () => {
        pollCount += 1;
        try {
          const statusRes = await reportsAPI.getReportStatus(jobId);
          const { analysisStatus, processingStage, errorMessage, report, aiAnalysis } =
            statusRes.data || {};

          if (processingStage) {
            setUploadStage(processingStage);
          }

          if (analysisStatus === "Completed") {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setUploadProgress(100);
            setUploadStage("Analysis complete");
            setCompletedReport(report || { _id: jobId, aiAnalysis });
            setIsUploading(false);
            setFiles([]);
            setNotes("");
            handleFetchReports(targetPatientId);
          } else if (analysisStatus === "Failed") {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setUploadError(
              errorMessage || "Document processing failed. Please retry."
            );
            setIsUploading(false);
          } else if (pollCount >= maxPolls) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setUploadStage("Analysis complete");
            setIsUploading(false);
            setFiles([]);
            setNotes("");
            handleFetchReports(targetPatientId);
          }
        } catch (pollErr) {
          console.warn("Status poll error:", pollErr.message);
          if (pollCount >= maxPolls) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setIsUploading(false);
          }
        }
      }, 1500);
    } catch (error) {
      console.error("Doctor report upload error:", error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Upload failed. Ensure patient ID is valid and backend is online.";
      setUploadError(errMsg);
      setIsUploading(false);
    }
  };

  const handleRetryUpload = () => {
    setUploadError(null);
    if (activeJobId) {
      setUploadStage("AI is analyzing your report");
      setIsUploading(true);
      reportsAPI
        .retryReport(activeJobId)
        .then(() => {
          handleFetchReports(selectedPatient?._id || searchedPatient);
        })
        .catch((err) => {
          setUploadError(err.response?.data?.message || "Retry failed.");
          setIsUploading(false);
        });
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const res = await reportsAPI.viewReport(reportId);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        alert("Unable to generate secure view link.");
      }
    } catch (err) {
      console.error("View report error:", err);
      alert("Error generating access token for this report.");
    }
  };

  const handleLoadAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await doctorAPI.auditReports();
      setAuditData(res.data);
      setIsAuditOpen(true);
    } catch (err) {
      console.error("Audit load error:", err);
      alert("Unable to fetch report audit at this time.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleReassignReport = async (reportId) => {
    const targetPatientId = selectedPatient?._id || searchedPatient;
    if (!targetPatientId) {
      alert("Please select or search for a target patient above before reassigning this report.");
      return;
    }
    setReassigningId(reportId);
    try {
      await doctorAPI.reassignReport(reportId, {
        targetPatientId,
        notes: `Reassigned to patient ${selectedPatient?.name || targetPatientId} by Dr. ${user?.name || "Clinician"}`,
      });
      alert(`Report successfully reassigned to patient ${selectedPatient?.name || targetPatientId}!`);
      handleLoadAudit();
      handleFetchReports(targetPatientId);
    } catch (err) {
      console.error("Reassign error:", err);
      alert(err.response?.data?.error || "Failed to reassign report.");
    } finally {
      setReassigningId(null);
    }
  };

  const getFileBadge = (name) => {
    if (!name) return <span className="file-pill doc">DOC</span>;
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return <span className="file-pill pdf">PDF</span>;
    if (["jpg", "jpeg", "png"].includes(ext)) return <span className="file-pill img">IMG</span>;
    return <span className="file-pill doc">DOC</span>;
  };

  const currentTargetId = selectedPatient?._id || "";

  const renderConsultationsTable = (list, emptyMessage) => {
    if (!list || list.length === 0) {
      return (
        <div className="empty-consultations-box sub-empty">
          <FiCalendar size={32} />
          <p>{emptyMessage || "No consultations in this category."}</p>
        </div>
      );
    }

    return (
      <div className="consultations-table-wrapper">
        <span className="table-scroll-hint mobile-only">
          ← Swipe horizontally to review patient details & actions →
        </span>
        <table className="consultations-table">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Contact Info</th>
              <th>Date & Time</th>
              <th>Mode / Type</th>
              <th>Clinical Notes / Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((app) => {
              const patientObj = typeof app.patientId === "object" && app.patientId !== null ? app.patientId : null;
              const patientDisplayName = patientObj?.name || app.patientName || "Patient";
              const patientPhone = patientObj?.phoneNumber || app.patientPhone || "";
              const patientEmail = patientObj?.email || app.patientEmail || "";
              const targetPatientRefId =
                patientObj?._id ||
                (typeof app.patientId === "string" ? app.patientId : null);

              return (
                <tr key={app._id}>
                  <td>
                    <strong>{patientDisplayName}</strong>
                  </td>
                  <td>
                    <div>
                      {patientPhone && (
                        <span className="patient-contact-sub">
                          <FiPhone size={11} /> {patientPhone}
                        </span>
                      )}
                    </div>
                    <div>
                      {patientEmail && (
                        <span className="patient-contact-sub">
                          <FiMail size={11} /> {patientEmail}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <FiCalendar size={12} />{" "}
                      {new Date(app.appointmentDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div>
                      <FiClock size={12} /> {app.timeSlot}
                    </div>
                  </td>
                  <td>
                    <span className="file-pill doc">
                      {app.consultationType || "In-Person"}
                    </span>
                  </td>
                  <td>
                    <span className="notes-text">
                      {app.reason || app.notes || "Standard Consultation"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${app.status?.toLowerCase().replace(/\s+/g, "-") || "scheduled"}`}
                    >
                      {app.status || "Scheduled"}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const statusNorm = String(app.status || "").trim().toUpperCase();
                      return (
                        <div className="action-buttons-group">
                          <ConsultationJoinButton
                            appointment={app}
                            currentTime={currentTime}
                            className="btn-join-video-table"
                            customEnabledText="Join Video Consultation"
                            iconSize={13}
                          />
                          {statusNorm === "SCHEDULED" && (
                            <>
                              <button
                                className="btn-confirm-appt"
                                onClick={() => handleUpdateAppointment(app._id, "Confirmed")}
                                type="button"
                                title="Confirm this appointment"
                              >
                                Confirm
                              </button>
                              <button
                                className="btn-reject-appt"
                                onClick={() => handlePromptReject(app._id)}
                                type="button"
                                title="Reject or reschedule"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {statusNorm === "CONFIRMED" && (
                            <>
                              <button
                                className="btn-progress-appt"
                                onClick={() => handleUpdateAppointment(app._id, "In Progress")}
                                type="button"
                                title="Start Consultation"
                              >
                                Start
                              </button>
                              <button
                                className="btn-reject-appt"
                                onClick={() => handlePromptReject(app._id)}
                                type="button"
                                title="Reschedule or cancel visit"
                              >
                                Reschedule
                              </button>
                            </>
                          )}

                          {(statusNorm === "IN PROGRESS" || statusNorm === "IN-PROGRESS") && (
                            <button
                              className="btn-complete-appt"
                              onClick={() => handleUpdateAppointment(app._id, "Completed")}
                              type="button"
                              title="Mark Completed"
                            >
                              Complete
                            </button>
                          )}

                          {targetPatientRefId && (
                            <>
                              <button
                                className="btn-vault-link"
                                onClick={() => {
                                  setPatientId(targetPatientRefId);
                                  handleFetchReports(targetPatientRefId);
                                }}
                                type="button"
                                title="Open Patient Vault"
                              >
                                <FiEye size={12} /> Vault
                              </button>
                              <button
                                className="btn-vault-link"
                                style={{ borderColor: "#0d9488", color: "#0f766e" }}
                                onClick={() => navigate(`/timeline?patientId=${targetPatientRefId}`)}
                                type="button"
                                title="Open Unified Health Timeline"
                              >
                                <FiActivity size={12} /> Timeline
                              </button>
                              <button
                                className="btn-vault-link"
                                style={{ borderColor: "#2563eb", color: "#1d4ed8" }}
                                onClick={() => {
                                  setFollowUpPrefillRequest({
                                    patientId: targetPatientRefId,
                                    consultationId: app._id,
                                    patientName: patientDisplayName,
                                    reason: app.reason || app.notes || "",
                                  });
                                }}
                                type="button"
                                title="Prescribe Follow-Up Plan for this consultation"
                              >
                                <FiPlus size={12} /> Follow-Up
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="doctor-dashboard-container">
      {/* Header */}
      <header className="doctor-header-card">
        <div className="doctor-header-content">
          <div className="doctor-badge">
            <FiShield /> Certified Physician Portal
          </div>
          <h1>Clinician & Doctor Workspace</h1>
          <p className="doctor-subtitle">
            Securely inspect laboratory diagnostic findings, upload medical records on behalf
            of verified patients, and review AI biomarker extractions with full clinical auditability.
          </p>
        </div>

        <div className="doctor-header-actions">
          <div className="doctor-profile-box">
            <div className="doc-avatar">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className="doc-avatar-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <FiUser size={22} />
              )}
            </div>
            <div className="doc-meta">
              <span className="doc-name">{user?.name || "Dr. Clinician"}</span>
              <span className="doc-role">
                {user?.specialization || "Physician"} • ₹{user?.consultationFee || 500}
              </span>
            </div>
          </div>

          <button
            className="btn-doctor-header-action"
            onClick={() => setIsProfileEditOpen(true)}
            type="button"
            title="Edit Physician Profile & Credentials"
          >
            <FiEdit2 size={13} /> Edit Profile
          </button>

          <button
            className="btn-doctor-header-action"
            onClick={() => setIsSecurityModalOpen(true)}
            type="button"
            title="Manage Two-Factor Authentication & Active Sessions"
          >
            <FiLock size={13} /> Security & 2FA
          </button>

          <button
            className="btn-audit-reports"
            onClick={handleLoadAudit}
            disabled={isAuditing}
            type="button"
            title="Inspect historical reports and manage patient assignments"
          >
            <FiFolder size={14} />
            {isAuditing ? "Auditing Vault..." : "Audit Records"}
          </button>
        </div>
      </header>

      {/* Verification Status Banner */}
      {verificationStatus === "verified" ? (
        <div className="doctor-verification-banner verified">
          <div className="verif-banner-left">
            <FiCheckCircle className="verif-banner-icon" />
            <div className="verif-banner-text">
              <h4>Medical Credentials Verified & Approved</h4>
              <p>Your license is actively registered. Patient appointments appear in your schedule below.</p>
            </div>
          </div>
          <span className="verified-pill-tag">
            <FiCheck /> Active in Directory
          </span>
        </div>
      ) : verificationStatus === "pending" ? (
        <div className="doctor-verification-banner pending">
          <div className="verif-banner-left">
            <FiClock className="verif-banner-icon" />
            <div className="verif-banner-text">
              <h4>Credentials Under Administrative Review</h4>
              <p>
                Your registration certificate and identity documents were received and are under review
                by hospital administrators.
              </p>
            </div>
          </div>
          <button
            className="btn-open-verif-modal"
            onClick={() => setIsVerificationModalOpen(true)}
            type="button"
          >
            <FiUploadCloud /> Re-upload / Update Docs
          </button>
        </div>
      ) : verificationStatus === "rejected" ? (
        <div className="doctor-verification-banner rejected">
          <div className="verif-banner-left">
            <FiAlertCircle className="verif-banner-icon" />
            <div className="verif-banner-text">
              <h4>Credential Verification Action Required</h4>
              <p>
                {verificationReview?.rejectionReason ||
                  "Uploaded documents were not approved by administration. Please provide updated medical credentials."}
              </p>
            </div>
          </div>
          <button
            className="btn-open-verif-modal"
            onClick={() => setIsVerificationModalOpen(true)}
            type="button"
          >
            <FiUploadCloud /> Re-submit Verification Documents
          </button>
        </div>
      ) : (
        <div className="doctor-verification-banner not_submitted">
          <div className="verif-banner-left">
            <FiShield className="verif-banner-icon" />
            <div className="verif-banner-text">
              <h4>Medical Credential Verification Required</h4>
              <p>
                To accept patient appointments and appear in the hospital booking directory, submit your
                government ID and medical council license certificate.
              </p>
            </div>
          </div>
          <button
            className="btn-open-verif-modal"
            onClick={() => setIsVerificationModalOpen(true)}
            type="button"
          >
            <FiUploadCloud /> Upload Verification Credentials
          </button>
        </div>
      )}

      {/* Assigned Clinical Consultations Section */}
      <section className="assigned-consultations-section">
        <div className="consultations-header-row">
          <div>
            <h3>Assigned Clinical Consultations ({doctorAppointments.length})</h3>
            <p>Patients scheduled specifically for your clinical review</p>
          </div>

          <div className="consultations-header-right">
            {doctorAppointments.length > 0 && (
              <div className="appointment-view-tabs" role="tablist" aria-label="Consultation Filters">
                <button
                  type="button"
                  role="tab"
                  aria-selected={appointmentTab === "all"}
                  className={`view-tab-btn ${appointmentTab === "all" ? "active" : ""}`}
                  onClick={() => setAppointmentTab("all")}
                >
                  All <span className="tab-count-pill">{doctorAppointments.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={appointmentTab === "upcoming"}
                  className={`view-tab-btn ${appointmentTab === "upcoming" ? "active" : ""}`}
                  onClick={() => setAppointmentTab("upcoming")}
                >
                  Upcoming <span className="tab-count-pill">{upcomingAppointments.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={appointmentTab === "past"}
                  className={`view-tab-btn ${appointmentTab === "past" ? "active" : ""}`}
                  onClick={() => setAppointmentTab("past")}
                >
                  Past <span className="tab-count-pill">{pastAppointments.length}</span>
                </button>
              </div>
            )}
            <span className="realtime-pulse-badge">
              <span className="live-dot" /> Live Appointments Sync
            </span>
          </div>
        </div>

        {loadingAppointments ? (
          <div className="empty-consultations-box">
            <FiRefreshCw className="spinning" />
            <p>Loading assigned consultations...</p>
          </div>
        ) : doctorAppointments.length === 0 ? (
          <div className="empty-consultations-box">
            <FiCalendar size={32} />
            <p>No consultations currently scheduled for your profile.</p>
          </div>
        ) : (
          <div className="consultations-content-area">
            {appointmentTab === "upcoming" &&
              renderConsultationsTable(upcomingAppointments, "No upcoming patient consultations scheduled.")}

            {appointmentTab === "past" &&
              renderConsultationsTable(pastAppointments, "No past or concluded patient consultations.")}

            {appointmentTab === "all" && (
              <>
                {upcomingAppointments.length > 0 && (
                  <div className="appointment-subgroup upcoming-subgroup">
                    <div className="subgroup-header">
                      <div className="subgroup-title-row">
                        <span className="subgroup-badge upcoming">Upcoming</span>
                        <h4>Upcoming Consultations ({upcomingAppointments.length})</h4>
                      </div>
                      <span className="subgroup-hint">Chronological order • Nearest first</span>
                    </div>
                    {renderConsultationsTable(upcomingAppointments)}
                  </div>
                )}

                {pastAppointments.length > 0 && (
                  <div className="appointment-subgroup past-subgroup">
                    <div className="subgroup-header">
                      <div className="subgroup-title-row">
                        <span className="subgroup-badge past">Past / Concluded</span>
                        <h4>Past & Historical Consultations ({pastAppointments.length})</h4>
                      </div>
                      <span className="subgroup-hint">Reverse chronological • Most recent first</span>
                    </div>
                    {renderConsultationsTable(pastAppointments)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Physician Follow-Up Management Section */}
      <DoctorFollowUpManagement
        associatedPatients={associatedPatients}
        doctorAppointments={doctorAppointments}
        onOpenVault={(pId) => {
          setPatientId(pId);
          handleFetchReports(pId);
        }}
        prefillRequest={followUpPrefillRequest}
        onClearPrefillRequest={() => setFollowUpPrefillRequest(null)}
      />

      {/* Patient Search Card */}
      <section className="patient-search-card">
        <div className="search-header-row">
          <FiSearch className="search-icon" />
          <div>
            <h3>Patient Record Lookup</h3>
            <p>Query encrypted records using the patient's permanent identifier, email, or phone</p>
          </div>
        </div>

        <div className="search-bar-row">
          <input
            type="text"
            placeholder="Enter Patient ID (e.g., 6619fc18a...)"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="patient-search-input"
          />
          <button
            onClick={() => handleFetchReports()}
            disabled={isSearching}
            className="btn-fetch-patient"
            type="button"
          >
            {isSearching ? (
              <span className="spinner-text">
                <FiRefreshCw className="spinning" /> Querying...
              </span>
            ) : (
              "Retrieve Health Vault"
            )}
          </button>
        </div>

        {/* Quick Selector for Associated Patients */}
        {associatedPatients.length > 0 ? (
          <div className="associated-patients-wrap">
            <span className="associated-label">Quick Patient Selector:</span>
            <div className="associated-pills">
              {associatedPatients.map((pat) => {
                const patIdVal = pat._id || pat.id;
                return (
                  <button
                    key={patIdVal}
                    className={`pat-pill ${
                      selectedPatient?._id === patIdVal || searchedPatient === patIdVal ? "active" : ""
                    }`}
                    onClick={() => handleSelectAssociatedPatient(pat)}
                    type="button"
                    title={`Select patient ${pat.name || pat.email}`}
                  >
                    <FiUser size={12} />
                    <span>{pat.name || pat.email}</span>
                    <span className="pat-id-mini">({patIdVal})</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="associated-patients-empty">
            <FiUser size={14} className="empty-user-icon" />
            <span className="empty-sub">
              No assigned patients found. Patient shortcuts will appear here once consultations are scheduled with your clinician account.
            </span>
          </div>
        )}

        {message && (
          <div className="search-feedback-banner">
            <FiAlertCircle />
            <span>{message}</span>
          </div>
        )}
      </section>

      {/* Clinical Upload Card for Selected Patient */}
      <section className="doctor-upload-card">
        <div className="doc-upload-header">
          <div className="doc-upload-title">
            <FiUploadCloud className="upload-header-icon" />
            <div>
              <h3>Upload Medical Report for Patient</h3>
              <p>Uploaded documents are encrypted and saved directly to the selected patient's vault</p>
            </div>
          </div>

          <div
            className={`target-patient-indicator ${
              currentTargetId ? "selected" : "none"
            }`}
          >
            {currentTargetId ? (
              <>
                <FiCheckCircle size={15} />
                <span>
                  Target: <strong>{selectedPatient?.name || "Patient"}</strong> (
                  <code>{currentTargetId}</code>)
                </span>
              </>
            ) : (
              <>
                <FiAlertCircle size={15} />
                <span>Select a patient above to enable report upload</span>
              </>
            )}
          </div>
        </div>

        {!currentTargetId ? (
          <div className="doc-upload-disabled-state">
            <FiUser size={32} />
            <p>
              Please enter a Patient ID in the lookup bar above or pick an assigned patient to
              upload diagnostic documents to their record.
            </p>
          </div>
        ) : (
          <form onSubmit={handleFileUpload} className="doc-upload-form">
            <div className="doc-form-grid">
              <div className="doc-form-group file-field">
                <label htmlFor="docFileInput">Medical Document (PDF, JPEG, PNG, DOC/DOCX)</label>
                <div className="file-drop-container">
                  <input
                    id="docFileInput"
                    type="file"
                    multiple={false}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files) {
                        setFiles(Array.from(e.target.files));
                      }
                    }}
                    disabled={isUploading}
                    className="file-input-hidden"
                  />
                  <label htmlFor="docFileInput" className="file-drop-label">
                    <FiUploadCloud size={24} />
                    <span>
                      {files.length > 0
                        ? `${files[0].name} (${(files[0].size / 1024).toFixed(0)} KB)`
                        : "Click to select or drag medical document here"}
                    </span>
                  </label>
                  {files.length > 0 && (
                    <button
                      type="button"
                      className="btn-clear-file"
                      onClick={() => setFiles([])}
                      disabled={isUploading}
                    >
                      <FiX size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="doc-form-group">
                <label htmlFor="docCategorySelect">Report Category</label>
                <select
                  id="docCategorySelect"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isUploading}
                  className="doc-select"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doc-form-group full-width">
                <label htmlFor="docNotesInput">Clinical Notes & Findings Context</label>
                <input
                  id="docNotesInput"
                  type="text"
                  placeholder="e.g. Prescribed after cardiology consultation, check LDL/HDL biomarkers"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isUploading}
                  className="doc-notes-input"
                />
              </div>
            </div>

            <div className="doc-upload-actions">
              <button
                type="submit"
                disabled={files.length === 0 || isUploading}
                className="btn-submit-doc-upload"
              >
                {isUploading ? (
                  <span className="spinner-text">
                    <FiRefreshCw className="spinning" /> Processing Upload...
                  </span>
                ) : (
                  <>
                    <FiPlus size={16} /> Upload to Patient's Vault
                  </>
                )}
              </button>
              {files.length === 0 && (
                <span className="helper-hint">Choose a document to upload</span>
              )}
            </div>
          </form>
        )}

        {/* Real-time Upload & AI Analysis Progress Card */}
        {isUploading && (
          <div className="doc-progress-wrap">
            <UploadProgressCard
              files={files}
              currentStage={uploadStage}
              uploadProgress={uploadProgress}
              error={uploadError}
              completedReport={completedReport}
              onRetry={handleRetryUpload}
              onDismiss={() => {
                setIsUploading(false);
                setUploadError(null);
              }}
              onViewDocument={(report) => {
                if (report?._id) handleViewReport(report._id);
              }}
            />
          </div>
        )}
      </section>

      {/* Patient Reports Dossier Table */}
      <section className="retrieved-records-section">
        <div className="records-header-bar">
          <h2>
            Diagnostic Document Vault{" "}
            {currentTargetId && (
              <span className="highlight-id">
                ({selectedPatient?.name || currentTargetId})
              </span>
            )}
          </h2>
          <div className="vault-header-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span className="records-count">{reports.length} Document(s) Loaded</span>
            {currentTargetId && (
              <button
                className="btn-vault-link"
                style={{
                  background: "#0d9488",
                  color: "#ffffff",
                  borderColor: "#0d9488",
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/timeline?patientId=${currentTargetId}`)}
                type="button"
                title="Open Complete Health Timeline for Patient"
              >
                <FiActivity size={13} /> Complete Health Timeline
              </button>
            )}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="empty-doctor-state">
            <FiFileText size={44} className="empty-icon" />
            <h3>No Records in Selected Vault</h3>
            <p>
              {currentTargetId
                ? `Patient ${currentTargetId} has no diagnostic documents recorded yet. Use the upload panel above to add their first medical report.`
                : "Enter a Patient ID above or choose from your assigned patients list to retrieve their uploaded diagnostics and AI biomarker reviews."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <span className="table-scroll-hint mobile-only">
              ← Swipe horizontally to review format, date, & AI extractions →
            </span>
            <table className="doctor-records-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Uploaded Date</th>
                  <th>Attribution</th>
                  <th>AI Extraction Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report._id} className="record-row">
                    <td>{getFileBadge(report.originalName || report.fileName)}</td>
                    <td className="doc-title-cell">
                      <strong>{report.originalName || report.fileName}</strong>
                      {report.notes && (
                        <div className="doc-note-text">{report.notes}</div>
                      )}
                    </td>
                    <td>
                      <span className="category-pill">{report.category}</span>
                    </td>
                    <td className="timestamp-cell">
                      {new Date(
                        report.uploadedAt || report.createdAt
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      {report.uploadedByRole === "doctor" ? (
                        <span className="uploader-pill doctor" title={`Uploaded by Dr. ${report.uploaderName || "Physician"}`}>
                          <FiShield size={12} /> Dr. {report.uploaderName ? report.uploaderName.replace(/^Dr\.?\s*/i, "") : "Clinician"}
                        </span>
                      ) : (
                        <span className="uploader-pill patient">
                          <FiUser size={12} /> Patient Self-Upload
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          report.analysisStatus?.toLowerCase() || "pending"
                        }`}
                      >
                        {report.analysisStatus === "Completed" && (
                          <FiCheckCircle size={12} />
                        )}
                        {report.analysisStatus || "Pending"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-doc-view"
                        onClick={() => handleViewReport(report._id)}
                        type="button"
                        title="Open Secure SAS Preview"
                      >
                        <FiEye size={14} /> Open Document
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit & Reassignment Drawer / Modal */}
      {isAuditOpen && auditData && (
        <div className="audit-modal-backdrop" onClick={() => setIsAuditOpen(false)}>
          <div
            className="audit-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="audit-modal-header">
              <div className="audit-title-wrap">
                <FiFolder className="audit-icon" />
                <div>
                  <h3>Clinical Records Audit & Reassignment</h3>
                  <p>
                    Review reports associated with your clinician ID and reassign unassigned
                    records to active patients safely.
                  </p>
                </div>
              </div>
              <button
                className="btn-close-audit"
                onClick={() => setIsAuditOpen(false)}
                type="button"
                aria-label="Close Audit"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="audit-modal-body">
              {/* Summary Stats */}
              <div className="audit-stats-grid">
                <div className="audit-stat-box green">
                  <span className="stat-num">
                    {auditData.summary?.patientAssignedCount || 0}
                  </span>
                  <span className="stat-label">Assigned to Patients</span>
                </div>
                <div className="audit-stat-box orange">
                  <span className="stat-num">
                    {auditData.summary?.potentialUnassignedCount || 0}
                  </span>
                  <span className="stat-label">Stored on Doctor ID</span>
                </div>
              </div>

              {/* Unassigned Doctor Reports (Need Reassignment) */}
              <div className="audit-section-block">
                <h4>
                  Stored Under Doctor ID (Candidate for Patient Reassignment)
                </h4>
                {auditData.potentialUnassignedReports?.length === 0 ? (
                  <p className="audit-empty-note">
                    ✔ No unassigned reports found. All doctor-uploaded reports belong to patient accounts!
                  </p>
                ) : (
                  <div className="audit-table-wrap">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Document</th>
                          <th>Category</th>
                          <th>Uploaded</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditData.potentialUnassignedReports.map((r) => (
                          <tr key={r._id}>
                            <td>
                              <strong>{r.originalName || r.fileName}</strong>
                              {r.notes && <div className="doc-note-text">{r.notes}</div>}
                            </td>
                            <td>{r.category}</td>
                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td>
                              {currentTargetId ? (
                                <button
                                  className="btn-reassign-action"
                                  onClick={() => handleReassignReport(r._id)}
                                  disabled={reassigningId === r._id}
                                  type="button"
                                >
                                  {reassigningId === r._id
                                    ? "Reassigning..."
                                    : `Assign to Patient (${currentTargetId.slice(0, 6)}...)`}
                                </button>
                              ) : (
                                <span className="reassign-disabled-hint">
                                  Select patient first
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Verified Patient Reports Uploaded by Doctor */}
              <div className="audit-section-block">
                <h4>Recently Uploaded for Patients</h4>
                {auditData.patientAssignedReports?.length === 0 ? (
                  <p className="audit-empty-note">No reports uploaded for patients yet.</p>
                ) : (
                  <div className="audit-table-wrap">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Document</th>
                          <th>Patient Owner</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditData.patientAssignedReports.slice(0, 8).map((r) => (
                          <tr key={r._id}>
                            <td>{r.originalName || r.fileName}</td>
                            <td>
                              <code>{r.userId}</code>
                            </td>
                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td>
                              <span className="status-pill completed">
                                {r.analysisStatus || "Completed"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Document Upload Modal */}
      {isVerificationModalOpen && (
        <div
          className="verif-modal-backdrop"
          onClick={() => setIsVerificationModalOpen(false)}
        >
          <div
            className="verif-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="verif-modal-header">
              <div>
                <h3>Upload Physician Credentials</h3>
                <p>Submit valid government and medical council documents for administrative review</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setIsVerificationModalOpen(false)}
                type="button"
                aria-label="Close dialog"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitVerificationDocs} className="verif-upload-form">
              <div className="doc-upload-slot">
                <label>1. Government Identity Proof * (Passport, DL, Aadhaar / National ID)</label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => setIdProofFile(e.target.files[0] || null)}
                  className="doc-file-input"
                  required
                />
                {idProofFile && (
                  <span className="file-selected-name">
                    Selected: {idProofFile.name} ({(idProofFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>

              <div className="doc-upload-slot">
                <label>2. Medical Registration / License Certificate * (State/National Council)</label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => setMedProofFile(e.target.files[0] || null)}
                  className="doc-file-input"
                  required
                />
                {medProofFile && (
                  <span className="file-selected-name">
                    Selected: {medProofFile.name} ({(medProofFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>

              <div className="doc-upload-slot">
                <label>Medical Registration Number (Optional / Update)</label>
                <input
                  type="text"
                  placeholder="e.g. MCI-2024-89712"
                  value={medRegNumber}
                  onChange={(e) => setMedRegNumber(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                className="verif-submit-btn"
                disabled={isSubmittingVerification || !idProofFile || !medProofFile}
              >
                {isSubmittingVerification ? "Uploading Documents..." : "Submit Credentials for Verification"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Doctor Profile Credentials Modal */}
      {isProfileEditOpen && (
        <div
          className="doctor-modal-backdrop"
          onClick={() => !savingDoctorProfile && setIsProfileEditOpen(false)}
        >
          <div
            className="doctor-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="doc-profile-modal-title"
          >
            <div className="doctor-modal-header">
              <div>
                <h3 id="doc-profile-modal-title">Edit Physician Credentials</h3>
                <p>
                  Update your public consultation directory profile, fees, and
                  specialization
                </p>
              </div>
              <button
                className="close-btn"
                onClick={() => setIsProfileEditOpen(false)}
                type="button"
                disabled={savingDoctorProfile}
                aria-label="Close dialog"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDoctorProfile} className="doctor-modal-body">
              {doctorProfileError && (
                <div className="profile-error-alert" role="alert">
                  <FiAlertCircle />
                  <span>{doctorProfileError}</span>
                </div>
              )}
              {doctorProfileMsg && (
                <div className="auth-alert success" role="alert">
                  <FiCheckCircle />
                  <span>{doctorProfileMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label>Profile Photo URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={doctorProfileData.profilePhoto}
                  onChange={(e) =>
                    setDoctorProfileData((prev) => ({
                      ...prev,
                      profilePhoto: e.target.value,
                    }))
                  }
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Clinical Specialization *</label>
                  <select
                    value={doctorProfileData.specialization}
                    onChange={(e) =>
                      setDoctorProfileData((prev) => ({
                        ...prev,
                        specialization: e.target.value,
                      }))
                    }
                    className="form-select"
                    required
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="ENT">ENT (Otolaryngology)</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Gynecology">Gynecology</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Registration / License # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MCI-2024-89712"
                    value={doctorProfileData.medicalRegistrationNumber}
                    onChange={(e) =>
                      setDoctorProfileData((prev) => ({
                        ...prev,
                        medicalRegistrationNumber: e.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Degrees & Qualifications</label>
                <input
                  type="text"
                  placeholder="e.g. MBBS, MD (General Medicine), DNB"
                  value={doctorProfileData.qualifications}
                  onChange={(e) =>
                    setDoctorProfileData((prev) => ({
                      ...prev,
                      qualifications: e.target.value,
                    }))
                  }
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Years of Clinical Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={doctorProfileData.experienceYears}
                    onChange={(e) =>
                      setDoctorProfileData((prev) => ({
                        ...prev,
                        experienceYears: e.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Consultation Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max="50000"
                    value={doctorProfileData.consultationFee}
                    onChange={(e) =>
                      setDoctorProfileData((prev) => ({
                        ...prev,
                        consultationFee: e.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Languages Spoken (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. English, Hindi, Kannada, Telugu"
                  value={doctorProfileData.languagesSpoken}
                  onChange={(e) =>
                    setDoctorProfileData((prev) => ({
                      ...prev,
                      languagesSpoken: e.target.value,
                    }))
                  }
                  className="form-input"
                />
              </div>

              <div className="modal-footer" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-dialog-cancel"
                  onClick={() => setIsProfileEditOpen(false)}
                  disabled={savingDoctorProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={savingDoctorProfile}
                >
                  {savingDoctorProfile ? "Saving Profile..." : "Save Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security & 2FA Modal */}
      {isSecurityModalOpen && (
        <div
          className="doctor-modal-backdrop"
          onClick={() => setIsSecurityModalOpen(false)}
        >
          <div
            className="doctor-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="security-modal-title"
          >
            <div className="doctor-modal-header">
              <div>
                <h3 id="security-modal-title">Account Security & Access</h3>
                <p>Manage Two-Factor Authentication (2FA) and device sessions</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setIsSecurityModalOpen(false)}
                type="button"
                aria-label="Close dialog"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="doctor-modal-body">
              {securityError && (
                <div className="profile-error-alert" role="alert">
                  <FiAlertCircle />
                  <span>{securityError}</span>
                </div>
              )}
              {securityMsg && (
                <div className="auth-alert success" role="alert">
                  <FiCheckCircle />
                  <span>{securityMsg}</span>
                </div>
              )}

              {/* 2FA Status Card */}
              <div
                className={`twofactor-status-card ${
                  user?.twoFactorEnabled ? "active" : "inactive"
                }`}
              >
                <div>
                  <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}>
                    Two-Factor Authentication (2FA)
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.825rem" }}>
                    {user?.twoFactorEnabled
                      ? "Active • Your physician account is protected with TOTP authenticator codes."
                      : "Not Enabled • Add an extra layer of security using an authenticator app."}
                  </p>
                </div>
                {user?.twoFactorEnabled ? (
                  <span className="verified-pill-tag">
                    <FiCheck /> Active
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-family-schedule"
                    onClick={handleStart2FASetup}
                    disabled={loading2FA}
                  >
                    {loading2FA ? "Loading..." : "Enable 2FA"}
                  </button>
                )}
              </div>

              {/* 2FA Setup Flow Panel */}
              {twoFactorSetupData && !user?.twoFactorEnabled && (
                <div className="twofactor-setup-panel">
                  <h4
                    style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a" }}
                  >
                    Step 1: Scan QR or Enter Secret in Authenticator App
                  </h4>
                  <p
                    style={{ margin: "0", fontSize: "0.825rem", color: "#475569" }}
                  >
                    Add this secret to Google Authenticator, Microsoft
                    Authenticator, or Authy:
                  </p>
                  <div className="twofactor-secret-key">
                    {twoFactorSetupData.secret}
                  </div>

                  {twoFactorSetupData.otpauthUrl && (
                    <a
                      href={twoFactorSetupData.otpauthUrl}
                      style={{
                        fontSize: "0.8rem",
                        color: "#0284c7",
                        fontWeight: 600,
                      }}
                    >
                      Open directly in supported authenticator app &rarr;
                    </a>
                  )}

                  {twoFactorSetupData.recoveryCodes && (
                    <div className="recovery-codes-section">
                      <h5>Step 2: Save Emergency Recovery Codes</h5>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.775rem",
                          color: "#713f12",
                        }}
                      >
                        Store these single-use codes safely. If you lose your
                        authenticator device, you can use these to sign in:
                      </p>
                      <div className="recovery-codes-grid">
                        {twoFactorSetupData.recoveryCodes.map((code, idx) => (
                          <div key={idx} className="recovery-code-pill">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={handleConfirm2FAEnable}
                    style={{ marginTop: "0.5rem" }}
                  >
                    <div className="form-group">
                      <label>Step 3: Enter 6-Digit Code to Activate *</label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="123456"
                        value={twoFactorVerifyCode}
                        onChange={(e) =>
                          setTwoFactorVerifyCode(
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        className="form-input"
                      />
                    </div>
                    <button
                      type="submit"
                      className="auth-submit-btn"
                      disabled={loading2FA || twoFactorVerifyCode.length !== 6}
                      style={{ marginTop: "0.5rem" }}
                    >
                      {loading2FA
                        ? "Activating 2FA..."
                        : "Confirm & Activate 2FA"}
                    </button>
                  </form>
                </div>
              )}

              {/* Disable 2FA Form (when enabled) */}
              {user?.twoFactorEnabled && (
                <div style={{ marginTop: "0.5rem" }}>
                  {!isDisabling2FA ? (
                    <button
                      type="button"
                      className="btn-card-cancel-action"
                      style={{ fontSize: "0.825rem" }}
                      onClick={() => setIsDisabling2FA(true)}
                    >
                      Disable Two-Factor Authentication
                    </button>
                  ) : (
                    <form
                      onSubmit={handleDisable2FA}
                      style={{
                        padding: "1rem",
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        borderRadius: "8px",
                      }}
                    >
                      <h5 style={{ margin: "0 0 0.5rem 0", color: "#9f1239" }}>
                        Confirm 2FA Disabling
                      </h5>
                      <div className="form-group">
                        <label style={{ fontSize: "0.8rem", color: "#9f1239" }}>
                          Account Password *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Enter your account password"
                          value={disablePasswordInput}
                          onChange={(e) =>
                            setDisablePasswordInput(e.target.value)
                          }
                          className="form-input"
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <button
                          type="submit"
                          className="btn-confirm-del"
                          disabled={loading2FA}
                        >
                          {loading2FA ? "Disabling..." : "Disable 2FA"}
                        </button>
                        <button
                          type="button"
                          className="btn-cancel-del"
                          style={{ color: "#475569", borderColor: "#cbd5e1" }}
                          onClick={() => {
                            setIsDisabling2FA(false);
                            setDisablePasswordInput("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Session Management */}
              <div className="session-management-box">
                <h4>Session Management</h4>
                <p>
                  Revoke all active device logins by invalidating your account's
                  authorization tokens. Any other active mobile or desktop
                  sessions will be required to log in again.
                </p>
                <button
                  type="button"
                  className="btn-revoke-sessions"
                  onClick={handleLogoutAllDevices}
                >
                  <FiLogOut size={14} /> Log Out from All Devices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;