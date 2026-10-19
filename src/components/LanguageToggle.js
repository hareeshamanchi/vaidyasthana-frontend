import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { FiGlobe } from "react-icons/fi";
import "./LanguageToggle.css";

/**
 * Accessible English ⇄ Telugu Language Toggle Component.
 * Supports desktop full label mode ("English | తెలుగు") and compact mobile mode.
 */
const LanguageToggle = ({ compact = false, className = "" }) => {
  const { language, setLanguage } = useLanguage();

  const handleSelectEnglish = (e) => {
    e.stopPropagation();
    setLanguage("en");
  };

  const handleSelectTelugu = (e) => {
    e.stopPropagation();
    setLanguage("te");
  };

  return (
    <div
      className={`vaidya-language-toggle language-toggle-pill ${compact ? "compact" : ""} ${className}`}
      role="group"
      aria-label="Language selection / భాష ఎంపిక"
    >
      <div className="lang-icon-wrapper" aria-hidden="true">
        <FiGlobe className="lang-globe-icon" size={compact ? 14 : 15} />
      </div>

      <button
        type="button"
        className={`lang-option-btn ${language === "en" ? "active" : ""}`}
        onClick={handleSelectEnglish}
        aria-pressed={language === "en"}
        aria-label="Switch to English"
        title="Switch to English"
      >
        <span className="lang-text full-label">English</span>
        <span className="lang-text short-label">EN</span>
      </button>

      <span className="lang-divider" aria-hidden="true">
        |
      </span>

      <button
        type="button"
        className={`lang-option-btn ${language === "te" ? "active" : ""}`}
        onClick={handleSelectTelugu}
        aria-pressed={language === "te"}
        aria-label="Switch to Telugu / తెలుగు భాషకు మారండి"
        title="తెలుగు భాషకు మారండి (Switch to Telugu)"
      >
        <span className="lang-text full-label">తెలుగు</span>
        <span className="lang-text short-label">తె</span>
      </button>
    </div>
  );
};

export default LanguageToggle;
