import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./ForgotPasswordPage.css";
import { authAPI } from "../services/api";
import {
  FiMail,
  FiArrowLeft,
  FiAlertCircle,
  FiCheckCircle,
  FiShield,
  FiKey,
} from "react-icons/fi";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevResetUrl("");

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
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
        "An error occurred while requesting password reset. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page-container">
      <div className="forgot-password-card">
        <div className="forgot-card-header">
          <div className="forgot-icon-wrap">
            <FiKey size={26} color="#0284c7" />
          </div>
          <h2>Reset Your Password</h2>
          <p className="forgot-subtitle">
            Enter your registered email address below and we'll send you single-use instructions to securely choose a new password.
          </p>
        </div>

        {error && (
          <div className="auth-alert error" role="alert">
            <FiAlertCircle className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="auth-alert success" role="status">
            <FiCheckCircle className="alert-icon" />
            <div>
              <strong>Request Received:</strong>
              <p style={{ margin: "4px 0 0" }}>{message}</p>
            </div>
          </div>
        )}

        {devResetUrl && (
          <div className="dev-mode-callout">
            <FiShield size={16} />
            <div>
              <strong>Local Development Mode:</strong> Live SMTP email transport is unconfigured in <code>.env</code>. You can open the generated password reset link directly:
              <br />
              <a href={devResetUrl} className="dev-link">
                Proceed to Reset Password &rarr;
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-form">
          <div className="form-group">
            <label htmlFor="forgot-email" className="field-label">
              Registered Email Address *
            </label>
            <div className="field-input-wrap">
              <FiMail className="input-icon" />
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-submit-forgot"
            disabled={loading || !email}
          >
            {loading ? (
              <span className="spinner-text">Sending Reset Link...</span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="forgot-card-footer">
          <Link to="/" className="btn-back-signin">
            <FiArrowLeft size={16} /> Return to Homepage & Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
