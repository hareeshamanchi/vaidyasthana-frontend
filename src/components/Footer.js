import React from "react";
import "./Footer.css";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();

  return (
    <footer className="vaidya-footer" role="contentinfo">
      <div className="footer-top-container">
        {/* Column 1: Brand & Security */}
        <div className="footer-col brand-col">
          <div className="footer-brand-title">
            <FiActivity className="footer-brand-icon" />
            <span>{t("common.appName", "Vaidyasthana")}</span>
          </div>
          <p className="footer-mission">
            {t("footer.mission", "A secure cloud-based medical document platform designed for patients and clinicians. Built on private Azure cloud infrastructure with automated AI document extraction and medical record intelligence.")}
          </p>
          <div className="security-badges-row">
            <span className="sec-badge">
              <FiShield className="sec-icon" /> {t("footer.privateAzureVault", "Private Azure Vault")}
            </span>
            <span className="sec-badge">
              <FiFileText className="sec-icon" /> {t("footer.sasTokens", "SAS-Signed Tokens")}
            </span>
          </div>
        </div>

        {/* Column 2: Platform Navigation */}
        <div className="footer-col">
          <h4 className="footer-heading">{t("footer.platform", "Platform")}</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/">{t("footer.homeOverview", "Home Overview")}</Link>
            </li>
            <li>
              <Link to="/dashboard">{t("footer.recordsVault", "Medical Records Vault")}</Link>
            </li>
            <li>
              <Link to="/ai-analysis">{t("footer.aiInsights", "AI Clinical Insights")}</Link>
            </li>
            <li>
              <Link to="/appointment">{t("footer.appointmentBooking", "Appointment Booking")}</Link>
            </li>
            <li>
              <Link to="/insurance">{t("footer.insurancePlans", "Health Insurance Plans")}</Link>
            </li>
            <li>
              <Link to="/diet">{t("footer.dietAdvisor", "Nutrition & Diet Advisor")}</Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Capabilities */}
        <div className="footer-col">
          <h4 className="footer-heading">{t("footer.clinicalTech", "Clinical Tech")}</h4>
          <ul className="footer-links-list">
            <li>
              <span className="capability-item">{t("footer.azureDocIntel", "Azure Document Intelligence")}</span>
            </li>
            <li>
              <span className="capability-item">{t("footer.azureOpenAI", "Azure OpenAI Analysis")}</span>
            </li>
            <li>
              <span className="capability-item">{t("footer.biomarkerExtraction", "Biomarker Extraction")}</span>
            </li>
            <li>
              <span className="capability-item">{t("footer.physicianPortal", "Physician Diagnostic Portal")}</span>
            </li>
            <li>
              <span className="capability-item">{t("footer.encryptedStorage", "Encrypted Health Storage")}</span>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact & Emergency */}
        <div className="footer-col contact-col">
          <h4 className="footer-heading">{t("footer.contactHelpline", "Contact & Helpline")}</h4>
          <ul className="footer-contact-list">
            <li>
              <FiPhoneCall className="contact-icon" />
              <div>
                <strong>{t("footer.supportDesk", "Support Desk:")}</strong>
                <div>+91 72070 97501</div>
              </div>
            </li>
            <li>
              <FiMail className="contact-icon" />
              <div>
                <strong>{t("footer.clinicalInquiries", "Clinical Inquiries:")}</strong>
                <div>support@vaidyasthana.org</div>
              </div>
            </li>
            <li>
              <FiMapPin className="contact-icon" />
              <div>
                <strong>{t("footer.location", "Location:")}</strong>
                <div>{t("footer.locationAddress", "MITS Campus, Madanapalle, AP, India")}</div>
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
            <strong>{t("footer.medicalNoticeTitle", "Medical Notice:")}</strong>{" "}
            {t("footer.medicalNoticeText", "Vaidyasthana is an informational health records management platform. AI-generated summaries and biomarker interpretations are educational aids and do not constitute formal medical advice or diagnostic evaluations. Always consult licensed medical professionals.")}
          </p>
        </div>
        <div className="footer-copyright-row">
          <span>&copy; {new Date().getFullYear()} {t("footer.allRightsReserved", "Vaidyasthana Healthcare Platform. All rights reserved.")}</span>
          <div className="footer-legal-links">
            <Link to="/contact">{t("footer.support", "Support")}</Link>
            <span>•</span>
            <Link to="/">{t("footer.termsOfService", "Terms of Service")}</Link>
            <span>•</span>
            <Link to="/">{t("footer.privacyPolicy", "Privacy Policy")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
