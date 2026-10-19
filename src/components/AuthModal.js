import React, { useState, useContext, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./AuthModal.css";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();

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
  const isSubmittingRef = useRef(false);

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
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    setError("");
    setMessage("");
    setDevResetUrl("");

    // Forgot Password Flow
    if (currentType === "forgot-password") {
      const cleanEmail = (formData.email || "").trim();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError(t("auth.invalidEmail", "Please enter a valid email address."));
        isSubmittingRef.current = false;
        return;
      }

      setLoading(true);
      try {
        const res = await authAPI.forgotPassword(cleanEmail);
        const data = res.data;
        setMessage(
          data.message ||
            t("auth.resetEmailSent", "If an account exists for this email, password reset instructions will be sent.")
        );
        if (data.devResetUrl) {
          setDevResetUrl(data.devResetUrl);
        }
      } catch (err) {
        console.error("Forgot password error:", err);
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          t("common.error", "Unable to process password reset request. Please try again later.");
        setError(errMsg);
      } finally {
        setLoading(false);
        isSubmittingRef.current = false;
      }
      return;
    }

    // Client-side validation for registration
    if (currentType === "register") {
      if (!formData.name || !formData.name.trim()) {
        setError(t("auth.nameRequired", "Please enter your full name."));
        isSubmittingRef.current = false;
        return;
      }

      if (!formData.email || !formData.email.trim()) {
        setError(t("auth.invalidEmail", "Please enter your email address."));
        isSubmittingRef.current = false;
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        setError(t("auth.passwordTooShort", "Password must be at least 6 characters long."));
        isSubmittingRef.current = false;
        return;
      }

      const cleanPhone = (formData.phoneNumber || "").replace(/[\s-]/g, "");
      if (!cleanPhone || !/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        setError(t("auth.phoneRequired", "Please enter a valid mobile number with 10–15 digits."));
        isSubmittingRef.current = false;
        return;
      }

      if (!formData.address || formData.address.trim().length < 5) {
        setError(t("auth.addressPlaceholder", "Please enter a complete address (minimum 5 characters)."));
        isSubmittingRef.current = false;
        return;
      }

      if (formData.role === "doctor") {
        if (!formData.medicalRegistrationNumber || !formData.medicalRegistrationNumber.trim()) {
          setError(t("auth.medicalRegRequired", "Medical Registration / License Number is required for doctor accounts."));
          isSubmittingRef.current = false;
          return;
        }
      }
    }

    setLoading(true);
    try {
      if (currentType === "login") {
        const res = await authAPI.login({
          email: formData.email,
          password: formData.password,
        });

        if (res.data && res.data.token) {
          login(res.data.token, res.data.user);
          if (onLoginSuccess) {
            onLoginSuccess(res.data);
          } else {
            onClose();
          }
        } else {
          setError(t("auth.authFailed", "Invalid response from server."));
        }
      } else {
        // Registration Flow
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          role: formData.role,
        };

        if (formData.role === "doctor") {
          payload.specialization = formData.specialization;
          payload.medicalRegistrationNumber = formData.medicalRegistrationNumber.trim();
        }

        const res = await authAPI.register(payload);

        if (res.data && res.data.token) {
          login(res.data.token, res.data.user);
          if (onLoginSuccess) {
            onLoginSuccess(res.data);
          } else {
            onClose();
          }
        } else {
          setMessage(t("auth.registrationSuccess", "Registration successful! Please sign in."));
          setCurrentType("login");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      const backendMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (currentType === "login"
          ? t("auth.authFailed", "Invalid credentials. Please verify your email and password.")
          : t("common.error", "Registration could not be completed. Please verify your details."));
      setError(backendMsg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
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
          title={t("common.closeDialog", "Close Dialog")}
          aria-label={t("common.close", "Close")}
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
              ? t("auth.signInTitle", "Welcome Back to Vaidyasthana")
              : currentType === "register"
              ? t("auth.registerTitle", "Create Your Clinical Account")
              : t("auth.forgotTitle", "Reset Your Password")}
          </h2>
          <p className="auth-subtitle">
            {currentType === "login"
              ? t("auth.signInSubtitle", "Access your encrypted medical records and AI analyses")
              : currentType === "register"
              ? t("auth.registerSubtitle", "Register to manage health records, lab reports, and doctor visits")
              : t("auth.forgotSubtitle", "Enter your registered email address to receive secure reset instructions")}
          </p>
        </div>

        {/* Tab Navigation */}
        {currentType === "forgot-password" ? (
          <div className="auth-recovery-indicator">
            <span className="recovery-pill">
              <FiShield size={14} /> {t("auth.passwordRecoveryPill", "Password Recovery")}
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
              {t("nav.signIn", "Sign In")}
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
              {t("auth.registerTab", "New Patient / Doctor")}
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
                  : (formData.role === "doctor" ? t("auth.doctor", "Doctor Account") : t("auth.patient", "Patient Account"))
                : currentType === "login"
                ? t("footer.recordsVault", "Clinical Health Vault Access")
                : t("auth.secureRecoveryTitle", "Secure Account Recovery")}
            </span>
            <span className="preview-role-text">
              {currentType === "register"
                ? (formData.role === "doctor"
                    ? `${t("auth.roleLabel", "Role:")} ${t("auth.doctor", "Licensed Physician")} • ${formData.specialization}`
                    : `${t("auth.roleLabel", "Role:")} ${t("auth.patient", "Patient")} • ${t("dashboard.recordsVaultTitle", "Personal Vault & Appointments")}`)
                : currentType === "login"
                ? t("auth.signInSubtitle", "Sign in with verified clinical credentials")
                : t("auth.forgotSubtitle", "Reset instructions will be delivered to your registered email")}
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
                <label className="field-label">{t("auth.iAmA", "Select Account Role:")}</label>
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
                        <FiUser /> {t("auth.patient", "Patient")}
                      </div>
                      {formData.role === "patient" && (
                        <FiCheckCircle className="role-check-indicator" />
                      )}
                    </div>
                    <div className="role-desc">{t("dashboard.subtitle", "Upload reports, track vitals & book appointments")}</div>
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
                        <FiShield /> {t("auth.doctor", "Physician / Doctor")}
                      </div>
                      {formData.role === "doctor" && (
                        <FiCheckCircle className="role-check-indicator" />
                      )}
                    </div>
                    <div className="role-desc">{t("doctorDashboard.subtitle", "Access authorized patient vaults & manage schedule")}</div>
                  </label>
                </div>
              </div>

              <div className="auth-field-group">
                <label className="field-label">{t("auth.fullName", "Full Name")} *</label>
                <div className="field-input-wrap">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder={t("auth.fullNamePlaceholder", "e.g. John Doe")}
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          <div className="auth-field-group">
            <label className="field-label">{t("auth.email", "Email Address")} *</label>
            <div className="field-input-wrap">
              <FiMail className="input-icon" />
              <input
                type="email"
                name="email"
                required
                placeholder={t("auth.emailPlaceholder", "name@example.com")}
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {currentType !== "forgot-password" && (
            <div className="auth-field-group">
              <div className="field-label-row">
                <label className="field-label">{t("auth.password", "Password")} *</label>
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
                    {t("auth.forgotPasswordQuestion", "Forgot Password?")}
                  </button>
                )}
              </div>
              <div className="field-input-wrap">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder={t("auth.passwordPlaceholder", "Minimum 6 characters")}
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
                  {t("auth.phoneNumber", "Mobile Number")} * <span className="field-hint">(10–15 digits)</span>
                </label>
                <div className="field-input-wrap">
                  <FiPhone className="input-icon" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    placeholder={t("auth.phoneNumberPlaceholder", "+91 98765 43210")}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="field-label">
                  {t("auth.address", "Complete Address / City")} * <span className="field-hint">(Min 5 chars)</span>
                </label>
                <div className="field-input-wrap">
                  <FiMapPin className="input-icon" />
                  <input
                    type="text"
                    name="address"
                    required
                    placeholder={t("auth.addressPlaceholder", "e.g. 42 MG Road, Bengaluru, Karnataka")}
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {formData.role === "doctor" && (
                <>
                  <div className="auth-field-group">
                    <label className="field-label">{t("auth.specialization", "Clinical Specialization")} *</label>
                    <div className="field-input-wrap">
                      <FiActivity className="input-icon" />
                      <select
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="field-select-input"
                      >
                        <option value="General Medicine">{t("appointment.generalMedicine", "General Medicine")}</option>
                        <option value="Cardiology">{t("appointment.cardiology", "Cardiology")}</option>
                        <option value="Orthopedics">{t("appointment.orthopedics", "Orthopedics")}</option>
                        <option value="Pediatrics">{t("appointment.pediatrics", "Pediatrics")}</option>
                        <option value="Dermatology">{t("appointment.dermatology", "Dermatology")}</option>
                        <option value="Neurology">{t("appointment.neurology", "Neurology")}</option>
                        <option value="Gynecology">{t("appointment.gynecology", "Gynecology")}</option>
                        <option value="ENT">ENT (Otolaryngology)</option>
                        <option value="Oncology">Oncology</option>
                      </select>
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="field-label">
                      {t("auth.medicalRegistrationNumber", "Medical Registration / License Number")} *
                    </label>
                    <div className="field-input-wrap">
                      <FiShield className="input-icon" />
                      <input
                        type="text"
                        name="medicalRegistrationNumber"
                        required
                        placeholder={t("auth.medicalRegPlaceholder", "e.g. MCI-2024-89712")}
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
              <span className="spinner-text">{t("common.loading", "Processing...")}</span>
            ) : currentType === "login" ? (
              t("auth.signInButton", "Sign In to Health Vault")
            ) : currentType === "register" ? (
              t("auth.registerButton", "Create Account")
            ) : (
              t("auth.sendResetLinkButton", "Send Reset Link")
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
              {t("auth.rememberedPassword", "Remembered your password?")}{" "}
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
                {t("auth.backToSignIn", "Return to Sign In")}
              </button>
            </p>
          ) : currentType === "login" ? (
            <p>
              {t("auth.noAccount", "Don't have an account?")}{" "}
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
                {t("auth.registerButton", "Create Account")}
              </button>
            </p>
          ) : (
            <p>
              {t("auth.alreadyHaveAccount", "Already registered?")}{" "}
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
                {t("auth.signInButton", "Sign In")}
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