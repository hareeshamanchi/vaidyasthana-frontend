import axios from "axios";

const RAW_API_URL =
  process.env.REACT_APP_API ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "");

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
  updateAppointment: (id, data) => api.put(`/api/appointments/${id}`, data),
  deleteAppointment: (id) => api.delete(`/api/appointments/${id}`),
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
// Admin API (Doctor Verification & Platform Metrics)
// ==========================================
export const adminAPI = {
  getPendingDoctors: () => api.get("/api/admin/doctors/pending-verification"),
  getAllDoctors: (params) => api.get("/api/admin/doctors", { params }),
  verifyDoctor: (id, data) => api.post(`/api/admin/doctors/${id}/verify`, data),
  getDocumentUrl: (id, docIndex) =>
    api.get(`/api/admin/doctors/${id}/document/${docIndex}`),
  getStats: () => api.get("/api/admin/stats"),
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

export default api;
