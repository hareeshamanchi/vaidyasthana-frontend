import React, { useState } from "react";
import "./Contact.css";
import { contactAPI } from "../services/api";
import {
  FiPhoneCall,
  FiMail,
  FiMapPin,
  FiClock,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
} from "react-icons/fi";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    query: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await contactAPI.submitContact(formData);
      setStatus({
        type: "success",
        message:
          res.data?.message ||
          "Your inquiry has been submitted. Our healthcare coordination team will contact you shortly.",
      });
      setFormData({ name: "", email: "", phoneNumber: "", query: "" });
    } catch (err) {
      console.error("Contact submission error:", err);
      setStatus({
        type: "error",
        message:
          err.response?.data?.message ||
          "Unable to send message right now. Please verify backend connection or call our helpline.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-wrapper">
      <div className="contact-header-section">
        <span className="contact-badge">Patient & Clinician Assistance</span>
        <h1>Contact Vaidyasthana Healthcare Support</h1>
        <p className="contact-subtitle">
          Have questions regarding document uploads, AI interpretation, or clinical
          records integration? Reach our team anytime.
        </p>
      </div>

      <div className="contact-layout-grid">
        {/* Contact Form Card */}
        <div className="contact-form-card">
          <div className="card-top-title">
            <h2>Send Us an Inquiry</h2>
            <p>Fill out the form below and a clinical coordinator will respond</p>
          </div>

          {status.message && (
            <div className={`contact-status-box ${status.type}`}>
              {status.type === "success" ? (
                <FiCheckCircle className="status-icon" />
              ) : (
                <FiAlertCircle className="status-icon" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label>Your Full Name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="+91 98765 43210"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Message / Medical Record Query *</label>
              <textarea
                name="query"
                required
                placeholder="Describe your inquiry, document upload issue, or provider integration request..."
                rows={4}
                value={formData.query}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="btn-submit-contact"
              disabled={loading}
            >
              {loading ? (
                "Submitting Inquiry..."
              ) : (
                <>
                  <FiSend /> Send Message
                </>
              )}
            </button>
          </form>
        </div>

        {/* Contact Support Information Sidebar */}
        <div className="contact-info-column">
          <div className="info-card">
            <h3>Healthcare Support Desk</h3>
            <p>Our coordination team is available to assist patients and providers.</p>

            <div className="contact-points-list">
              <div className="point-item">
                <FiPhoneCall className="point-icon blue" />
                <div>
                  <strong>Phone Support</strong>
                  <div>+91 72070 97501</div>
                  <span className="point-subtext">Mon–Sat: 8:00 AM – 8:00 PM IST</span>
                </div>
              </div>

              <div className="point-item">
                <FiMail className="point-icon teal" />
                <div>
                  <strong>Email Inquiries</strong>
                  <div>support@vaidyasthana.org</div>
                  <span className="point-subtext">Typical response within 4 hours</span>
                </div>
              </div>

              <div className="point-item">
                <FiMapPin className="point-icon purple" />
                <div>
                  <strong>Campus Clinic Location</strong>
                  <div>Madanapalle Institute of Technology & Science (MITS)</div>
                  <span className="point-subtext">Post Box No. 14, Kadiri Road, Madanapalle, AP 517325</span>
                </div>
              </div>

              <div className="point-item">
                <FiClock className="point-icon green" />
                <div>
                  <strong>Emergency Support</strong>
                  <div>24/7 National Emergency: 112</div>
                  <span className="point-subtext">Immediate trauma and hospital assistance</span>
                </div>
              </div>
            </div>
          </div>

          <div className="privacy-assurance-card">
            <FiShield size={24} className="shield-icon" />
            <div>
              <h4>Medical Data Privacy</h4>
              <p>
                Inquiries are encrypted and protected in accordance with clinical
                health confidentiality guidelines. Your message will never be shared
                with commercial advertisers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;