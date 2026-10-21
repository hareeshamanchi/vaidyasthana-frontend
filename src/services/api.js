import axios from "axios";

const DEPLOYED_BACKEND_URL = "https://vaidyasthana-node-backend.onrender.com";

const resolveApiBaseUrl = () => {
  const envUrl = (
    process.env.REACT_APP_API ||
    process.env.REACT_APP_API_URL ||
    ""
  ).trim();

  // If running in browser on deployed production domain (not localhost)
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || "";
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.");

    if (!isLocalhost) {
      if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
        return DEPLOYED_BACKEND_URL;
      }
    }
  }

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  return "http://localhost:5000";
};

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and has token, clear expired token
      if (localStorage.getItem("token")) {
        console.warn("Session expired or token invalid. Clearing credentials.");
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// Auth API
// ==========================================
export const authAPI = {
  login: (credentials) => api.post("/api/auth/login", credentials),
  register: (userData) => api.post("/api/auth/register", userData),
  getProfile: () => api.get("/api/auth/profile"),
  updateProfile: (data) => api.put("/api/auth/profile", data),
  forgotPassword: (email) => api.post("/api/auth/forgot-password", { email }),
  validateResetToken: (token) => api.get(`/api/auth/reset-password/${token}`),
  resetPassword: (token, password) =>
    api.post(`/api/auth/reset-password/${token}`, { password }),

  // Phone OTP Authentication
  sendOtp: (phoneNumber, purpose = "login") =>
    api.post("/api/auth/otp/send", { phoneNumber, purpose }),
  verifyOtp: (phoneNumber, otp, purpose = "login") =>
    api.post("/api/auth/otp/verify", { phoneNumber, otp, purpose }),

  // Session Management
  logout: () => api.post("/api/auth/logout"),
  logoutAll: () => api.post("/api/auth/logout-all"),

  // Two-Factor Authentication (2FA)
  setup2FA: () => api.post("/api/auth/2fa/setup"),
  enable2FA: (code) => api.post("/api/auth/2fa/enable", { code }),
  disable2FA: (data) => api.post("/api/auth/2fa/disable", data),
  verify2FA: (tempToken, code, recoveryCode) =>
    api.post("/api/auth/2fa/verify", { tempToken, code, recoveryCode }),

  // Doctor Profile Management
  updateDoctorProfile: (data) => api.put("/api/auth/doctor-profile", data),

  // Family Accounts Management
  getFamilyMembers: () => api.get("/api/auth/family"),
  createFamilyMember: (data) => api.post("/api/auth/family", data),
  updateFamilyMember: (id, data) => api.put(`/api/auth/family/${id}`, data),
  deleteFamilyMember: (id) => api.delete(`/api/auth/family/${id}`),

  // Hospital Staff Invitations
  validateInvitation: (token) => api.get(`/api/auth/invitation/${token}`),
  acceptInvitation: (data) => api.post("/api/auth/accept-invitation", data),
};

// ==========================================
// Reports API (supports both /upload and /api/reports)
// ==========================================
export const reportsAPI = {
  getReports: (params) => api.get("/upload/all", { params }),
  getReportById: (id) => api.get(`/upload/${id}`),
  getReportStatus: (id) => api.get(`/upload/${id}/status`),
  retryReport: (id) => api.post(`/upload/${id}/retry`),
  viewReport: (id) => api.get(`/upload/view/${id}`),
  uploadReports: (formData, onProgress) =>
    api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    }),
  deleteReport: (id) => api.delete(`/upload/${id}`),
  analyzeReport: (id) => api.post(`/upload/analyze/${id}`),
};

// ==========================================
// Appointments API
// ==========================================
export const appointmentsAPI = {
  getAppointments: (params) => api.get("/api/appointments", { params }),
  getDoctors: (params) => api.get("/api/appointments/doctors", { params }),
  getSlots: (doctorId, date, timezone) =>
    api.get("/api/appointments/slots", { params: { doctorId, date, timezone } }),
  createAppointment: (data) => api.post("/api/appointments", data),
  getAppointmentById: (id) => api.get(`/api/appointments/${id}`),
  updateAppointment: (id, data) => api.put(`/api/appointments/${id}`, data),
  deleteAppointment: (id) => api.delete(`/api/appointments/${id}`),
  getVideoAccess: (id) => api.get(`/api/appointments/${id}/video-access`),
};

// ==========================================
// Insurance API
// ==========================================
export const insuranceAPI = {
  getInsuranceList: () => api.get("/api/insurance"),
  createInsurance: (data) => api.post("/api/insurance", data),
  updateInsurance: (id, data) => api.put(`/api/insurance/${id}`, data),
  deleteInsurance: (id) => api.delete(`/api/insurance/${id}`),
};

// ==========================================
// Contact API
// ==========================================
export const contactAPI = {
  submitContact: (data) => api.post("/api/contact", data),
  getInquiries: () => api.get("/api/contact"),
};

// ==========================================
// Doctor API
// ==========================================
export const doctorAPI = {
  getPatientReports: (patientId) =>
    api.get(`/doctor/patient-reports/${patientId}`),
  getPatientDetails: (patientId) =>
    api.get(`/doctor/patient/${patientId}`),
  getPatients: () => api.get("/doctor/patients"),
  auditReports: () => api.get("/doctor/audit-reports"),
  reassignReport: (reportId, data) =>
    api.post(`/doctor/reassign-report/${reportId}`, data),
  getVerificationStatus: () => api.get("/api/doctor/verification-status"),
  uploadVerificationDocuments: (formData, onProgress) =>
    api.post("/api/doctor/verification-documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    }),
};

// ==========================================
// Admin & Super Admin API
// ==========================================
export const adminAPI = {
  getOverview: () => api.get("/api/admin/overview"),
  getStats: () => api.get("/api/admin/stats"),
  getUsers: (params) => api.get("/api/admin/users", { params }),
  getUserDetails: (id) => api.get(`/api/admin/users/${id}`),
  updateUserStatus: (id, data) => api.patch(`/api/admin/users/${id}/status`, data),
  getPendingDoctors: () => api.get("/api/admin/doctors/pending-verification"),
  getAllDoctors: (params) => api.get("/api/admin/doctors", { params }),
  verifyDoctor: (id, data) => api.post(`/api/admin/doctors/${id}/verify`, data),
  getDocumentUrl: (id, docIndex) =>
    api.get(`/api/admin/doctors/${id}/document/${docIndex}`),
  getAppointments: (params) => api.get("/api/admin/appointments", { params }),
  updateAppointment: (id, data) => api.patch(`/api/admin/appointments/${id}`, data),
  getReports: (params) => api.get("/api/admin/reports", { params }),
  getSecurityOverview: () => api.get("/api/admin/security/overview"),
  getAuditLogs: (params) => api.get("/api/admin/security/audit-logs", { params }),
  getSystemHealth: () => api.get("/api/admin/system-health"),
  getSupportQueries: (params) => api.get("/api/admin/support", { params }),
  updateSupportQuery: (id, data) => api.patch(`/api/admin/support/${id}`, data),
  getAdminNotifications: () => api.get("/api/admin/notifications"),
};

// ==========================================
// Nutrition & Ollama AI API
// ==========================================
export const nutritionAPI = {
  getStatus: () => api.get("/api/nutrition/status"),
  generatePlan: (data) => api.post("/api/nutrition/generate", data),
};

// ==========================================
// Health API
// ==========================================
export const healthAPI = {
  checkHealth: () => api.get("/api/health"),
};

// ==========================================
// Notifications API
// ==========================================
export const notificationsAPI = {
  getNotifications: (params) => api.get("/api/notifications", { params }),
  getUnreadCount: () => api.get("/api/notifications/unread-count"),
  markAsRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/api/notifications/read-all"),
  deleteNotification: (id) => api.delete(`/api/notifications/${id}`),
};

// ==========================================
// Unified Patient Health Timeline API
// ==========================================
export const timelineAPI = {
  getTimeline: (params) => api.get("/api/timeline", { params }),
  getPatientTimeline: (patientId, params) =>
    api.get(`/api/timeline/${patientId}`, { params }),
};

// ==========================================
// Medication Reminders & Dose Tracking API
// ==========================================
export const medicationsAPI = {
  getMedications: (params) => api.get("/api/medications", { params }),
  getMedicationById: (id) => api.get(`/api/medications/${id}`),
  createMedication: (data) => api.post("/api/medications", data),
  updateMedication: (id, data) => api.put(`/api/medications/${id}`, data),
  updateStatus: (id, status) => api.patch(`/api/medications/${id}/status`, { status }),
  deleteMedication: (id) => api.delete(`/api/medications/${id}`),
  getDoses: (params) => api.get("/api/medications/doses", { params }),
  updateDoseStatus: (id, data) => api.patch(`/api/medications/doses/${id}`, data),
  getAdherenceStats: (params) => api.get("/api/medications/adherence", { params }),
  getPrescriptions: () => api.get("/api/medications/prescriptions"),
};

// ==========================================
// Web Push Notifications API
// ==========================================
export const pushAPI = {
  getVapidKey: () => api.get("/api/push/vapid-key"),
  subscribe: (subscription) => api.post("/api/push/subscribe", { subscription }),
  unsubscribe: (endpoint) => api.post("/api/push/unsubscribe", { endpoint }),
  testPush: () => api.post("/api/push/test"),
};

// ==========================================
// Smart Follow-Up System API
// ==========================================
export const followUpsAPI = {
  getFollowUps: (params) => api.get("/api/follow-ups", { params }),
  getFollowUpById: (id) => api.get(`/api/follow-ups/${id}`),
  createFollowUp: (data) => api.post("/api/follow-ups", data),
  updateFollowUp: (id, data) => api.put(`/api/follow-ups/${id}`, data),
  cancelFollowUp: (id, data) => api.patch(`/api/follow-ups/${id}/cancel`, data),
  getDoctorStats: () => api.get("/api/follow-ups/doctor/stats"),
};

// ==========================================
// Multi-Hospital Platform Owner Tenant API
// ==========================================
export const hospitalTenantAPI = {
  getHospitals: (params) => api.get("/api/hospitals", { params }),
  getHospitalById: (id) => api.get(`/api/hospitals/${id}`),
  createHospital: (data) => api.post("/api/hospitals", data),
  updateHospital: (id, data) => api.put(`/api/hospitals/${id}`, data),
  updateHospitalStatus: (id, data) => api.patch(`/api/hospitals/${id}/status`, data),
  updateSubscription: (id, data) => api.put(`/api/hospitals/${id}/subscription`, data),
  getPlatformMetrics: () => api.get("/api/hospitals/metrics/platform"),
};

// ==========================================
// Hospital Admin Operations API
// ==========================================
export const hospitalAdminAPI = {
  getOverview: () => api.get("/api/hospital-admin/overview"),
  getStaff: (params) => api.get("/api/hospital-admin/staff", { params }),
  createStaff: (data) => api.post("/api/hospital-admin/staff", data),
  inviteStaff: (data) => api.post("/api/hospital-admin/invite", data),
  updateStaff: (id, data) => api.put(`/api/hospital-admin/staff/${id}`, data),
  updateStaffStatus: (id, data) => api.patch(`/api/hospital-admin/staff/${id}/status`, data),
  registerPatient: (data) => api.post("/api/hospital-admin/patients", data),
  getPatients: (params) => api.get("/api/hospital-admin/patients", { params }),
  updateSettings: (data) => api.put("/api/hospital-admin/settings", data),
  revokeInvitation: (id) => api.delete(`/api/hospital-admin/invitations/${id}`),
};

// ==========================================
// Digital Prescriptions API (Feature 3)
// ==========================================
export const prescriptionsAPI = {
  getPrescriptions: (params) => api.get("/api/prescriptions", { params }),
  getPrescriptionById: (id) => api.get(`/api/prescriptions/${id}`),
  createPrescription: (data) => api.post("/api/prescriptions", data),
  updateStatus: (id, status) => api.patch(`/api/prescriptions/${id}/status`, { status }),
  createReminders: (id) => api.post(`/api/prescriptions/${id}/create-reminders`),
  downloadPDF: async (id, filename = "Prescription.pdf") => {
    const response = await api.get(`/api/prescriptions/${id}/pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};

export default api;
