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

const API_BASE_URL = resolveApiBaseUrl();

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
  getSlots: (doctorId, date) =>
    api.get("/api/appointments/slots", { params: { doctorId, date } }),
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

export default api;
