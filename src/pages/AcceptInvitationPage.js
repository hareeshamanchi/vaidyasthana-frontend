import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authAPI } from "../services/api";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiLock,
  FiUser,
  FiPhone,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";
import "./AcceptInvitationPage.css";

const ROLE_LABELS = {
  hospital_admin: "Hospital Administrator",
  doctor: "Doctor / Clinician",
  nurse: "Nursing Staff",
  receptionist: "Receptionist / Front Desk",
  lab_technician: "Laboratory Technician",
  pharmacist: "Pharmacist",
  billing_staff: "Billing & Accounts Staff",
};

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in the link. Please check your invitation URL.");
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await authAPI.validateInvitation(token);
        if (res.data?.success) {
          setInvitation(res.data.invitation);
          setFormData((prev) => ({
            ...prev,
            name: res.data.invitation.name || "",
          }));
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "This invitation link is invalid, expired, or has already been used."
        );
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authAPI.acceptInvitation({
        token,
        name: formData.name,
        password: formData.password,
        phoneNumber: formData.phoneNumber,
      });

      if (res.data?.success) {
        if (res.data.token) {
          localStorage.setItem("token", res.data.token);
        }
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept invitation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="accept-invite-container">
        <div className="invite-card text-center">
          <FiRefreshCw className="spin-icon" />
          <p>Verifying invitation link...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="accept-invite-container">
        <div className="invite-card">
          <div className="invite-badge-icon badge-error">
            <FiAlertCircle />
          </div>
          <h2>Invalid or Expired Link</h2>
          <p className="invite-subtitle">{error}</p>
          <div className="invite-actions">
            <Link to="/" className="btn-primary">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="accept-invite-container">
        <div className="invite-card text-center">
          <div className="invite-badge-icon badge-success">
            <FiCheckCircle />
          </div>
          <h2>Welcome to Vaidyasthana!</h2>
          <p className="invite-subtitle">
            Your account has been activated successfully. Redirecting you to login...
          </p>
          <Link to="/login" className="btn-primary">
            Proceed to Login <FiArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invite-container">
      <div className="invite-card">
        <div className="invite-header">
          <div className="invite-badge-icon badge-primary">
            <FiShield />
          </div>
          <h2>Hospital Staff Invitation</h2>
          <p className="invite-subtitle">
            You have been invited to join{" "}
            <strong>{invitation?.hospital?.name || "the hospital"}</strong> as{" "}
            <span className="role-tag">
              {ROLE_LABELS[invitation?.role] || invitation?.role}
            </span>
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="accept-invite-form">
          <div className="form-group">
            <label>Affiliated Hospital</label>
            <input
              type="text"
              readOnly
              disabled
              value={`${invitation?.hospital?.name || "Hospital"} (${invitation?.hospital?.hospitalCode || ""})`}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" readOnly disabled value={invitation?.email || ""} />
          </div>

          <div className="form-group">
            <label>Your Full Name *</label>
            <div className="input-with-icon">
              <FiUser className="input-icon" />
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <div className="input-with-icon">
              <FiPhone className="input-icon" />
              <input
                type="text"
                placeholder="+91 9876543210"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Create Password *</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting ? "Activating Account..." : "Activate Account & Join Hospital"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
