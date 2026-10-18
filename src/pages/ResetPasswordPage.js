import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import "./ResetPasswordPage.css";
import { authAPI } from "../services/api";
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
          setTokenError("No password reset token was provided in the link.");
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
            setTokenError("This password reset link is invalid or has expired.");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Token validation error:", err);
          const errMsg =
            err.response?.data?.message ||
            "This password reset link is invalid, expired, or has already been used.";
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
  }, [token]);

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "None", color: "#94a3b8" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: "Weak", color: "#ef4444" };
    if (score <= 3) return { score: 2, label: "Medium", color: "#f59e0b" };
    if (score === 4) return { score: 3, label: "Strong", color: "#10b981" };
    return { score: 4, label: "Very Strong", color: "#059669" };
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter both password fields.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await authAPI.resetPassword(token, password);
      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to reset password. The link may have expired or was already used.";
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reset-password-page-container">
      <div className="reset-password-card">
        {/* Loading Token Validation */}
        {checkingToken && (
          <div className="token-loading-state">
            <FiRefreshCw className="spinning-icon" size={36} color="#0284c7" />
            <h3>Validating Security Token</h3>
            <p>Verifying single-use cryptographic token with MongoDB Atlas...</p>
          </div>
        )}

        {/* Invalid or Expired Token State */}
        {!checkingToken && !tokenValid && !success && (
          <div className="token-invalid-state">
            <div className="icon-wrap error">
              <FiAlertCircle size={32} />
            </div>
            <h2>Invalid or Expired Link</h2>
            <p className="invalid-desc">
              {tokenError ||
                "This password reset link is invalid, has expired, or has already been used to reset an account."}
            </p>
            <div className="security-note">
              <FiShield size={16} />
              <span>
                For your account security, password reset tokens are strictly single-use and expire 15 minutes after issuance.
              </span>
            </div>
            <Link to="/forgot-password" className="btn-request-new">
              Request a New Reset Link &rarr;
            </Link>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="reset-success-state">
            <div className="icon-wrap success">
              <FiCheckCircle size={36} />
            </div>
            <h2>Password Reset Complete</h2>
            <p className="success-desc">
              Your Vaidyasthana account password has been updated securely in MongoDB. Your single-use reset token has been invalidated.
            </p>
            <div className="security-notice-box">
              <FiShield size={16} />
              <span>
                You can now log in to access your encrypted medical reports, appointments, and AI clinical summaries with your new credentials.
              </span>
            </div>
            <Link to="/?auth=login" className="btn-proceed-login">
              Return to Homepage & Sign In <FiArrowRight size={16} />
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
              <h2>Create New Password</h2>
              <p className="reset-subtitle">
                Please enter a secure new password for your Vaidyasthana account.
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
                <label htmlFor="new-password">New Password *</label>
                <div className="field-input-wrap">
                  <FiLock className="input-icon" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Minimum 6 characters"
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
                <label htmlFor="confirm-password">Confirm New Password *</label>
                <div className="field-input-wrap">
                  <FiLock className="input-icon" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Re-type new password"
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
                    <FiAlertCircle size={14} /> Passwords do not match
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-submit-reset"
                disabled={submitting || !password || !confirmPassword || password.length < 6 || password !== confirmPassword}
              >
                {submitting ? (
                  <span className="spinner-text">Updating Password...</span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div className="reset-card-footer">
              <Link to="/forgot-password" className="btn-cancel-reset">
                Cancel & Request New Link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
