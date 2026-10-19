import React from "react";
import "./Footer.css";
import { Link } from "react-router-dom";
import {
  FiShield,
  FiFileText,
  FiActivity,
  FiPhoneCall,
  FiMail,
  FiMapPin,
} from "react-icons/fi";
import { FaWhatsapp, FaInstagram, FaTwitter } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="vaidya-footer" role="contentinfo">
      <div className="footer-top-container">
        {/* Column 1: Brand & Security */}
        <div className="footer-col brand-col">
          <div className="footer-brand-title">
            <FiActivity className="footer-brand-icon" />
            <span>Vaidyasthana</span>
          </div>
          <p className="footer-mission">
            A secure cloud-based medical document platform designed for patients and
            clinicians. Built on private Azure cloud infrastructure with automated AI
            document extraction and medical record intelligence.
          </p>
          <div className="security-badges-row">
            <span className="sec-badge">
              <FiShield className="sec-icon" /> Private Azure Vault
            </span>
            <span className="sec-badge">
              <FiFileText className="sec-icon" /> SAS-Signed Tokens
            </span>
          </div>
        </div>

        {/* Column 2: Platform Navigation */}
        <div className="footer-col">
          <h4 className="footer-heading">Platform</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/">Home Overview</Link>
            </li>
            <li>
              <Link to="/dashboard">Medical Records Vault</Link>
            </li>
            <li>
              <Link to="/ai-analysis">AI Clinical Insights</Link>
            </li>
            <li>
              <Link to="/appointment">Appointment Booking</Link>
            </li>
            <li>
              <Link to="/insurance">Health Insurance Plans</Link>
            </li>
            <li>
              <Link to="/diet">Nutrition & Diet Advisor</Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Capabilities */}
        <div className="footer-col">
          <h4 className="footer-heading">Clinical Tech</h4>
          <ul className="footer-links-list">
            <li>
              <span className="capability-item">Azure Document Intelligence</span>
            </li>
            <li>
              <span className="capability-item">Azure OpenAI Analysis</span>
            </li>
            <li>
              <span className="capability-item">Biomarker Extraction</span>
            </li>
            <li>
              <span className="capability-item">Physician Diagnostic Portal</span>
            </li>
            <li>
              <span className="capability-item">Encrypted Health Storage</span>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact & Emergency */}
        <div className="footer-col contact-col">
          <h4 className="footer-heading">Contact & Helpline</h4>
          <ul className="footer-contact-list">
            <li>
              <FiPhoneCall className="contact-icon" />
              <div>
                <strong>Support Desk:</strong>
                <div>+91 72070 97501</div>
              </div>
            </li>
            <li>
              <FiMail className="contact-icon" />
              <div>
                <strong>Clinical Inquiries:</strong>
                <div>support@vaidyasthana.org</div>
              </div>
            </li>
            <li>
              <FiMapPin className="contact-icon" />
              <div>
                <strong>Location:</strong>
                <div>MITS Campus, Madanapalle, AP, India</div>
              </div>
            </li>
          </ul>

          <div className="footer-social-links">
            <a
              href="https://wa.me/7207097501"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Support"
              className="social-btn whatsapp"
            >
              <FaWhatsapp size={16} />
            </a>
            <a
              href="https://www.instagram.com/vaidyasthana_30?igsh=cGpta3NzMzY2bGdq"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="social-btn instagram"
            >
              <FaInstagram size={16} />
            </a>
            <a
              href="https://twitter.com/vaidhyasthana"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="social-btn twitter"
            >
              <FaTwitter size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom / Clinical Disclaimer */}
      <div className="footer-bottom-container">
        <div className="disclaimer-strip">
          <p>
            <strong>Medical Notice:</strong> Vaidyasthana is an informational health
            records management platform. AI-generated summaries and biomarker
            interpretations are educational aids and do not constitute formal medical
            advice or diagnostic evaluations. Always consult licensed medical professionals.
          </p>
        </div>
        <div className="footer-copyright-row">
          <span>&copy; {new Date().getFullYear()} Vaidyasthana Healthcare Platform. All rights reserved.</span>
          <div className="footer-legal-links">
            <Link to="/contact">Support</Link>
            <span>•</span>
            <Link to="/">Terms of Service</Link>
            <span>•</span>
            <Link to="/">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
