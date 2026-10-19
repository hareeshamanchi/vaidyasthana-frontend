import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./BMIPopup.css";
import { useLanguage } from "../context/LanguageContext";
import {
  FiX,
  FiActivity,
  FiRefreshCw,
  FiInfo,
} from "react-icons/fi";

const BMIPopup = ({ onClose }) => {
  const { t, translateCategory } = useLanguage();
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

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState("");

  const calculateBMI = () => {
    const hNum = parseFloat(height);
    const wNum = parseFloat(weight);

    if (!hNum || !wNum || hNum <= 0 || wNum <= 0) {
      alert("Please enter valid positive numbers for height and weight.");
      return;
    }

    const hInMeters = hNum / 100;
    const result = (wNum / (hInMeters * hInMeters)).toFixed(1);
    setBmi(result);

    let cat = "";
    if (result < 18.5) cat = "Underweight";
    else if (result >= 18.5 && result < 25) cat = "Normal weight";
    else if (result >= 25 && result < 30) cat = "Overweight";
    else cat = "Obese";

    setCategory(cat);
  };

  const resetForm = () => {
    setHeight("");
    setWeight("");
    setBmi(null);
    setCategory("");
  };

  const modalContent = (
    <div
      className="bmi-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="bmi-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="bmi-close-btn"
          onClick={onClose}
          type="button"
          title="Close BMI Modal"
          aria-label="Close"
        >
          <FiX size={20} />
        </button>

        <div className="bmi-card-header">
          <div className="bmi-icon-badge">
            <FiActivity size={20} />
          </div>
          <h2>{t("bmi.title", "Body Mass Index (BMI) Calculator")}</h2>
          <p className="bmi-subtitle">
            {t("bmi.subtitle", "World Health Organization (WHO) adult anthropometric weight classification")}
          </p>
        </div>

        {!bmi ? (
          <div className="bmi-form-body">
            <div className="bmi-input-group">
              <label>{t("bmi.heightLabel", "Height (in cm) *")}</label>
              <input
                type="number"
                placeholder={t("bmi.heightPlaceholder", "e.g. 175")}
                min="50"
                max="250"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>

            <div className="bmi-input-group">
              <label>{t("bmi.weightLabel", "Weight (in kg) *")}</label>
              <input
                type="number"
                placeholder={t("bmi.weightPlaceholder", "e.g. 70")}
                min="20"
                max="300"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <button
              className="btn-calc-bmi"
              onClick={calculateBMI}
              type="button"
            >
              {t("bmi.calculateBtn", "Calculate BMI")}
            </button>
          </div>
        ) : (
          <div className="bmi-result-dossier">
            <div className="result-metric-display">
              <span className="result-label">{t("bmi.resultScore", "Calculated Body Mass Index")}</span>
              <div className="bmi-number-callout">{bmi}</div>
              <div
                className={`bmi-category-badge ${category
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {t("bmi.categoryTitle", "Category:")} {translateCategory(category) || category}
              </div>
            </div>

            {/* WHO Scale Visual Bar */}
            <div className="who-scale-bar-wrap">
              <div className="scale-bar">
                <div
                  className={`scale-segment under ${
                    category === "Underweight" ? "active" : ""
                  }`}
                >
                  &lt;18.5
                </div>
                <div
                  className={`scale-segment normal ${
                    category === "Normal weight" ? "active" : ""
                  }`}
                >
                  18.5 - 24.9
                </div>
                <div
                  className={`scale-segment over ${
                    category === "Overweight" ? "active" : ""
                  }`}
                >
                  25 - 29.9
                </div>
                <div
                  className={`scale-segment obese ${
                    category === "Obese" ? "active" : ""
                  }`}
                >
                  &ge;30
                </div>
              </div>
            </div>

            {/* Screening Disclaimer */}
            <div className="bmi-disclaimer-box">
              <FiInfo className="info-icon" />
              <div>
                <strong>{t("bmi.screeningDisclaimer", "Screening Disclaimer")}:</strong> {t("bmi.tip", "BMI is a general screening metric and does not differentiate between adipose tissue and lean muscle mass. Consult a physician or dietitian for comprehensive body composition analysis.")}
              </div>
            </div>

            <button
              className="btn-recalculate-bmi"
              onClick={resetForm}
              type="button"
            >
              <FiRefreshCw /> {t("bmi.resetBtn", "Recalculate Another Value")}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? ReactDOM.createPortal(modalContent, document.body)
    : modalContent;
};

export default BMIPopup;
