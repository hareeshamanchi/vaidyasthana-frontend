import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import "./ResetPasswordPage.css";
import { authAPI } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiArrowRight,
  FiRefreshCw,
} from "react-icons/fi";

const ResetPasswordPage = () => {
  const { t } = useLanguage();
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token");

  const token = (routeToken || queryToken || "").trim();

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token with backend on component mount
  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      if (!token) {
        if (isMounted) {
          setCheckingToken(false);
          setTokenValid(false);
          setTokenError(t("resetPassword.noTokenError", "No password reset token was provided in the link."));
        }
        return;
      }

      setCheckingToken(true);
      try {
        const res = await authAPI.validateResetToken(token);
        if (isMounted) {
          if (res.data?.success) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
            setTokenError(t("resetPassword.invalidTokenDesc", "This password reset link is invalid or has expired."));
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Token validation error:", err);
          const errMsg =
            err.response?.data?.message ||
            t("resetPassword.invalidTokenDesc", "This password reset link is invalid, expired, or has already been used.");
          setTokenValid(false);
          setTokenError(errMsg);
        }
      } finally {
        if (isMounted) {
          setCheckingToken(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token, t]);

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (!password || password.length < 6) {
      setError(t("resetPassword.tooShortError", "Password must be at least 6 characters long."));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("resetPassword.matchError", "Passwords do not match."));
      return;
    }

    setSubmitting(true);

    try {
      const res = await authAPI.resetPassword(token, password);
      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || t("common.error", "Failed to reset password. Please try again."));
      }
    } catch (err) {
      console.error("Password reset error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        t("common.error", "An error occurred while resetting your password. The link may have expired.");
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Password Strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "None", color: "#e2e8f0" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Weak", color: "#ef4444" };
      case 2:
        return { score: 2, label: "Fair", color: "#f59e0b" };
      case 3:
        return { score: 3, label: "Good", color: "#3b82f6" };
      case 4:
        return { score: 4, label: "Strong", color: "#10b981" };
      default:
        return { score: 1, label: "Weak", color: "#ef4444" };
    }
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  return (
    <div className="reset-password-page-container">
      <div className="reset-password-card">
        {/* Token Validation Loading State */}
        {checkingToken && (
          <div className="token-checking-state">
            <FiRefreshCw className="token-spinner-icon" size={36} color="#0284c7" />
            <h3>{t("resetPassword.checkingToken", "Validating Security Token")}</h3>
            <p>Please wait while we validate your single-use security token with the server.</p>
          </div>
        )}

        {/* Token Validation Error / Expired */}
        {!checkingToken && !tokenValid && !success && (
          <div className="token-invalid-state">
            <div className="token-error-icon-wrap">
              <FiAlertCircle size={40} color="#dc2626" />
            </div>
            <h2>{t("resetPassword.invalidTokenTitle", "Invalid or Expired Link")}</h2>
            <p className="error-desc">
              {tokenError ||
                t("resetPassword.invalidTokenDesc", "This password reset link is invalid, expired, or has already been used.")}
            </p>
            <div className="security-note">
              <FiShield size={16} />
              <span>
                {t("resetPassword.securityNote", "For your account security, password reset tokens are strictly single-use and expire 15 minutes after issuance.")}
              </span>
            </div>
            <div className="token-error-actions">
              <Link to="/forgot-password" className="btn-request-new">
                {t("resetPassword.requestNewLinkBtn", "Request a New Reset Link")}
              </Link>
              <Link to="/" className="btn-return-home">
                {t("forgotPassword.backToSignIn", "Return to Homepage")}
              </Link>
            </div>
          </div>
        )}

        {/* Reset Success State */}
        {success && (
          <div className="reset-success-state">
            <div className="success-icon-wrap">
              <FiCheckCircle size={44} color="#16a34a" />
            </div>
            <h2>{t("resetPassword.successTitle", "Password Reset Complete")}</h2>
            <p className="success-desc">
              {t("resetPassword.successDesc", "Your Vaidyasthana account password has been updated securely. Your single-use reset token has been invalidated.")}
            </p>
            <div className="security-notice-box">
              <FiShield size={16} />
              <span>
                {t("auth.signInSubtitle", "You can now log in to access your encrypted medical reports, appointments, and AI clinical summaries with your new credentials.")}
              </span>
            </div>
            <Link to="/?auth=login" className="btn-proceed-login">
              {t("resetPassword.signInNowBtn", "Return to Homepage & Sign In")} <FiArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Reset Password Form */}
        {!checkingToken && tokenValid && !success && (
          <>
            <div className="reset-card-header">
              <div className="reset-icon-wrap">
                <FiLock size={26} color="#0284c7" />
              </div>
              <h2>{t("resetPassword.title", "Create New Password")}</h2>
              <p className="reset-subtitle">
                {t("resetPassword.subtitle", "Please enter a secure new password for your Vaidyasthana account.")}
              </p>
            </div>

            {error && (
              <div className="auth-alert error" role="alert">
                <FiAlertCircle className="alert-icon" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="reset-form">
              {/* New Password */}
              <div className="form-group">
                <label htmlFor="new-password">{t("resetPassword.newPasswordLabel", "New Password *")}</label>
                <div className="field-input-wrap">
                  <FiLock className="input-icon" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={t("resetPassword.newPasswordPlaceholder", "Minimum 6 characters")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>

                {password && (
                  <div className="password-strength-indicator">
                    <div className="strength-bars">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className="bar-step"
                          style={{
                            backgroundColor:
                              step <= strength.score ? strength.color : "#e2e8f0",
                          }}
                        />
                      ))}
                    </div>
                    <span className="strength-label" style={{ color: strength.color }}>
                      Strength: {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="form-group">
                <label htmlFor="confirm-password">{t("resetPassword.confirmPasswordLabel", "Confirm New Password *")}</label>
                <div className="field-input-wrap">
                  <FiLock className="input-icon" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder={t("resetPassword.confirmPasswordPlaceholder", "Re-type new password")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>

                {passwordsMatch && (
                  <div className="match-status valid">
                    <FiCheckCircle size={14} /> Passwords match
                  </div>
                )}

                {passwordsMismatch && (
                  <div className="match-status invalid">
                    <FiAlertCircle size={14} /> {t("resetPassword.matchError", "Passwords do not match")}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-submit-reset"
                disabled={submitting || !password || !confirmPassword || password.length < 6 || password !== confirmPassword}
              >
                {submitting ? (
                  <span className="spinner-text">{t("resetPassword.updating", "Updating Password...")}</span>
                ) : (
                  t("resetPassword.submitBtn", "Reset Password")
                )}
              </button>
            </form>

            <div className="reset-card-footer">
              <Link to="/forgot-password" className="btn-cancel-reset">
                {t("resetPassword.requestNewLinkBtn", "Cancel & Request New Link")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
