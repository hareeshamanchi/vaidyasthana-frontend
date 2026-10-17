import React, { useState, useContext, useEffect } from "react";
import ReactDOM from "react-dom";
import "./AuthModal.css";
import { AuthContext } from "../context/AuthContext";
import { authAPI } from "../services/api";
import {
  FiX,
  FiMail,
  FiLock,
  FiUser,
  FiPhone,
  FiMapPin,
  FiEye,
  FiEyeOff,
  FiShield,
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

const AuthModal = ({ type = "login", onClose, onLoginSuccess }) => {
  const { login } = useContext(AuthContext);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const [currentType, setCurrentType] = useState(type);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phoneNumber: "",
    address: "",
    role: "patient",
    specialization: "General Medicine",
    medicalRegistrationNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  const logo = process.env.PUBLIC_URL + "/assets/logo.png";

  const getInitials = (name) => {
    if (!name || !name.trim()) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevResetUrl("");

    // Forgot Password Flow
    if (currentType === "forgot-password") {
      const cleanEmail = (formData.email || "").trim();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      setLoading(true);
      try {
        const res = await authAPI.forgotPassword(cleanEmail);
        const data = res.data;
        setMessage(
          data.message ||
            "If an account exists for this email, password reset instructions will be sent."
        );
        if (data.devResetUrl) {
          setDevResetUrl(data.devResetUrl);
        }
      } catch (err) {
        console.error("Forgot password error:", err);
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to process password reset request. Please try again later.";
        setError(errMsg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Client-side validation for registration
    if (currentType === "register") {
      const cleanPhone = (formData.phoneNumber || "").replace(/[\s-]/g, "");
      if (!cleanPhone || !/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        setError("Please enter a valid 10-15 digit mobile number (e.g. +91 9876543210).");
        return;
      }

      if (!formData.address || formData.address.trim().length < 5) {
        setError("Please enter a complete address / location (minimum 5 characters).");
        return;
      }

      if (formData.role === "doctor" && !formData.medicalRegistrationNumber?.trim()) {
        setError("Medical Council Registration / License Number is required for doctors.");
        return;
      }
    }

    setLoading(true);

    try {
      if (currentType === "login") {
        const res = await authAPI.login({
          email: formData.email,
          password: formData.password,
        });

        const data = res.data;
        setMessage("Login successful! Redirecting to your vault...");
        login(data.user, data.token);

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(data);
          }
          onClose();
        }, 700);
      } else {
        const res = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          role: formData.role || "patient",
          specialization: formData.specialization || "General Medicine",
          medicalRegistrationNumber: formData.medicalRegistrationNumber?.trim() || "",
        });

        const data = res.data;
        setMessage("Registration successful! Logging you in...");
        login(data.user, data.token);

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(data);
          }
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error("Auth error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to authenticate. Please verify your credentials or server status.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="auth-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="auth-close-btn"
          title="Close Dialog"
          aria-label="Close"
          type="button"
        >
          <FiX size={20} />
        </button>

        {/* Modal Brand Header */}
        <div className="auth-modal-header">
          <div className="auth-brand-logo-wrap">
            <img
              src={logo}
              alt="Vaidyasthana Logo"
              className="auth-brand-logo-img"
              onError={(e) => {
                e.target.style.display = "none";
                const fallback = e.target.nextElementSibling;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="auth-brand-logo-fallback" style={{ display: "none" }}>
              <FiActivity size={24} color="#0284c7" />
            </div>
          </div>
          <h2 id="auth-modal-title">
            {currentType === "login"
              ? "Welcome Back to Vaidyasthana"
              : currentType === "register"
              ? "Create Your Clinical Account"
              : "Reset Your Password"}
          </h2>
          <p className="auth-subtitle">
            {currentType === "login"
              ? "Access your encrypted medical records and AI analyses"
              : currentType === "register"
              ? "Register to manage health records, lab reports, and doctor visits"
              : "Enter your registered email address to receive secure reset instructions"}
          </p>
        </div>

        {/* Tab Navigation */}
        {currentType === "forgot-password" ? (
          <div className="auth-recovery-indicator">
            <span className="recovery-pill">
              <FiShield size={14} /> Password Recovery
            </span>
          </div>
        ) : (
          <div className="auth-tabs-toggle">
            <button
              className={`auth-tab-btn ${currentType === "login" ? "active" : ""}`}
              onClick={() => {
                setCurrentType("login");
                setError("");
                setMessage("");
                setDevResetUrl("");
              }}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${currentType === "register" ? "active" : ""}`}
              onClick={() => {
                setCurrentType("register");
                setError("");
                setMessage("");
                setDevResetUrl("");
              }}
              type="button"
            >
              New Patient / Doctor
            </button>
          </div>
        )}

        {/* Dedicated Profile/Avatar Preview Area */}
        <div className={`auth-profile-preview-card ${currentType}`}>
          <div className="preview-avatar-wrapper">
            {currentType === "register" ? (
              <div className={`preview-avatar-circle ${formData.role}`}>
                {getInitials(formData.name) || (
                  formData.role === "doctor" ? "DR" : <FiUser size={22} />
                )}
                <span className={`preview-role-badge ${formData.role}`} title={formData.role}>
                  {formData.role === "doctor" ? <FiShield size={11} /> : <FiUser size={11} />}
                </span>
              </div>
            ) : currentType === "login" ? (
              <div className="preview-avatar-circle login">
                <FiShield size={24} color="#0284c7" />
              </div>
            ) : (
              <div className="preview-avatar-circle recovery">
                <FiLock size={22} color="#d97706" />
              </div>
            )}
          </div>
          <div className="preview-info-col">
            <span className="preview-title">
              {currentType === "register"
                ? formData.name?.trim()
                  ? (formData.role === "doctor" ? `Dr. ${formData.name.trim()}` : formData.name.trim())
                  : (formData.role === "doctor" ? "Doctor Account Preview" : "Patient Account Preview")
                : currentType === "login"
                ? "Clinical Health Vault Access"
                : "Secure Account Recovery"}
            </span>
            <span className="preview-role-text">
              {currentType === "register"
                ? (formData.role === "doctor"
                    ? `Role: Licensed Physician • ${formData.specialization}`
                    : "Role: Patient • Personal Vault & Appointments")
                : currentType === "login"
                ? "Sign in with verified clinical credentials"
                : "Reset instructions will be delivered to your registered email"}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="auth-alert error">
            <FiAlertCircle className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="auth-alert success">
            <FiCheckCircle className="alert-icon" />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form-body">
          {currentType === "register" && (
            <>
              {/* Role Picker */}
              <div className="role-selector-wrap">
                <label className="field-label">Select Account Role:</label>
                <div className="role-cards-grid">
                  <label
                    className={`role-option-card patient ${
                      formData.role === "patient" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={formData.role === "patient"}
                      onChange={handleChange}
                    />
                    <div className="role-card-top">
                      <div className="role-title">
                        <FiUser /> Patient
                      </div>
                      {formData.role === "patient" && (
                        <FiCheckCircle className="role-check-indicator" />
                      )}
                    </div>
                    <div className="role-desc">Upload reports, track vitals & book appointments</div>
                  </label>

                  <label
                    className={`role-option-card doctor ${
                      formData.role === "doctor" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="doctor"
                      checked={formData.role === "doctor"}
                      onChange={handleChange}
                    />
                    <div className="role-card-top">
                      <div className="role-title">
                        <FiShield /> Physician / Doctor
                      </div>
                      {formData.role === "doctor" && (
                        <FiCheckCircle className="role-check-indicator" />
                      )}
                    </div>
                    <div className="role-desc">Access authorized patient vaults & manage schedule</div>
                  </label>
                </div>
              </div>

              <div className="auth-field-group">
                <label className="field-label">Full Name *</label>
                <div className="field-input-wrap">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          <div className="auth-field-group">
            <label className="field-label">Email Address *</label>
            <div className="field-input-wrap">
              <FiMail className="input-icon" />
              <input
                type="email"
                name="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {currentType !== "forgot-password" && (
            <div className="auth-field-group">
              <div className="field-label-row">
                <label className="field-label">Password *</label>
                {currentType === "login" && (
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => {
                      setCurrentType("forgot-password");
                      setError("");
                      setMessage("");
                      setDevResetUrl("");
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="field-input-wrap">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
          )}

          {currentType === "register" && (
            <>
              <div className="auth-field-group">
                <label className="field-label">
                  Mobile Number * <span className="field-hint">(10–15 digits)</span>
                </label>
                <div className="field-input-wrap">
                  <FiPhone className="input-icon" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="field-label">
                  Complete Address / City * <span className="field-hint">(Min 5 chars)</span>
                </label>
                <div className="field-input-wrap">
                  <FiMapPin className="input-icon" />
                  <input
                    type="text"
                    name="address"
                    required
                    placeholder="e.g. 42 MG Road, Bengaluru, Karnataka"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {formData.role === "doctor" && (
                <>
                  <div className="auth-field-group">
                    <label className="field-label">Clinical Specialization *</label>
                    <div className="field-input-wrap">
                      <FiActivity className="input-icon" />
                      <select
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="field-select-input"
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
                  </div>

                  <div className="auth-field-group">
                    <label className="field-label">
                      Medical Registration / License Number *
                    </label>
                    <div className="field-input-wrap">
                      <FiShield className="input-icon" />
                      <input
                        type="text"
                        name="medicalRegistrationNumber"
                        required
                        placeholder="e.g. MCI-2024-89712"
                        value={formData.medicalRegistrationNumber}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-text">Processing...</span>
            ) : currentType === "login" ? (
              "Sign In to Health Vault"
            ) : currentType === "register" ? (
              "Create Account"
            ) : (
              "Send Reset Link"
            )}
          </button>

          {devResetUrl && (
            <div className="dev-reset-notice">
              <strong>Local Development Notice:</strong> SMTP email service is not configured. You can open the generated reset page directly:
              <br />
              <a href={devResetUrl} onClick={() => onClose()}>
                Open Password Reset Page &rarr;
              </a>
            </div>
          )}
        </form>

        {/* Modal Footer Switch */}
        <div className="auth-modal-footer">
          {currentType === "forgot-password" ? (
            <p>
              Remembered your password?{" "}
              <button
                className="switch-link-btn"
                type="button"
                onClick={() => {
                  setCurrentType("login");
                  setError("");
                  setMessage("");
                  setDevResetUrl("");
                }}
              >
                Return to Sign In
              </button>
            </p>
          ) : currentType === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                className="switch-link-btn"
                type="button"
                onClick={() => {
                  setCurrentType("register");
                  setError("");
                  setMessage("");
                  setDevResetUrl("");
                }}
              >
                Create Account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button
                className="switch-link-btn"
                type="button"
                onClick={() => {
                  setCurrentType("login");
                  setError("");
                  setMessage("");
                  setDevResetUrl("");
                }}
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? ReactDOM.createPortal(modalContent, document.body)
    : modalContent;
};

export default AuthModal;