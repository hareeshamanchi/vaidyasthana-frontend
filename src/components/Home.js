import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from "react";
import "./Home.css";
import BMIPopup from "./BMIPopup";
import AuthModal from "./AuthModal";
import UploadProgressCard from "./UploadProgressCard";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { reportsAPI } from "../services/api";
import { getLocalizedFeatureData } from "./featureData";
import {
  FiUploadCloud,
  FiShield,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiActivity,
  FiFileText,
  FiCpu,
  FiLock,
  FiArrowRight,
  FiEye,
  FiAlertCircle,
} from "react-icons/fi";

const Home = () => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("Preparing your report");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [completedReport, setCompletedReport] = useState(null);
  const homePollTimerRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [isBMIPopupOpen, setBMIPopupOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [authModalType, setAuthModalType] = useState(null);

  useEffect(() => {
    return () => {
      if (homePollTimerRef.current) {
        clearInterval(homePollTimerRef.current);
      }
    };
  }, []);

  const images = [
    "/assets/11.png",
    "/assets/22.png",
    "/assets/33.png",
    "/assets/55.png",
    "/assets/44.png",
    "/assets/5.png",
  ];

  // Fetch the list of uploaded reports
  const fetchReports = useCallback(async () => {
    if (!user) {
      setReports([]);
      return;
    }
    try {
      const res = await reportsAPI.getReports();
      setReports(res.data || []);
    } catch (err) {
      console.error("Could not fetch reports.", err);
      setReports([]);
    }
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Carousel rotation
  useEffect(() => {
    const id = setInterval(
      () => setCurrentImage((i) => (i + 1) % images.length),
      4500
    );
    return () => clearInterval(id);
  }, [images.length]);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleFileUpload = async () => {
    if (!user) {
      setAuthModalType("login");
      setMessage(t("auth.signInSubtitle", "Please sign in or register to securely store and encrypt medical records."));
      return;
    }
    if (!files.length || isUploading) {
      setMessage(t("common.required", "Please select at least one file."));
      return;
    }

    if (homePollTimerRef.current) {
      clearInterval(homePollTimerRef.current);
      homePollTimerRef.current = null;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("file", file));

    setIsUploading(true);
    setUploadStage(t("uploadProgress.preparing", "Preparing your report"));
    setUploadProgress(0);
    setUploadError(null);
    setCompletedReport(null);
    setMessage("");

    try {
      const uploadRes = await reportsAPI.uploadReport(formData, (evt) => {
        if (evt.total) {
          const pct = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(Math.min(pct, 90));
          if (pct >= 90) {
            setUploadStage(t("uploadProgress.extracting", "Extracting text from your document"));
          } else {
            setUploadStage(t("uploadProgress.uploading", "Uploading your medical report"));
          }
        }
      });

      const data = uploadRes.data || {};
      const jobId = data.jobId || data._id;

      if (!jobId) {
        setIsUploading(false);
        setUploadStage(t("uploadProgress.complete", "Analysis complete"));
        fetchReports();
        return;
      }

      let pollCount = 0;
      const maxPolls = 80;

      homePollTimerRef.current = setInterval(async () => {
        pollCount += 1;
        try {
          const statusRes = await reportsAPI.getReportStatus(jobId);
          const { analysisStatus, processingStage, errorMessage, report, aiAnalysis } =
            statusRes.data || {};

          if (processingStage) setUploadStage(processingStage);

          if (analysisStatus === "Completed") {
            clearInterval(homePollTimerRef.current);
            homePollTimerRef.current = null;
            setUploadProgress(100);
            setUploadStage(t("uploadProgress.complete", "Analysis complete"));
            setCompletedReport(report || { _id: jobId, aiAnalysis });
            setIsUploading(false);
            fetchReports();
          } else if (analysisStatus === "Failed") {
            clearInterval(homePollTimerRef.current);
            homePollTimerRef.current = null;
            setUploadError(errorMessage || t("uploadProgress.uploadFailed", "Processing failed. Please retry."));
            setIsUploading(false);
          } else if (pollCount >= maxPolls) {
            clearInterval(homePollTimerRef.current);
            homePollTimerRef.current = null;
            setUploadStage(t("uploadProgress.complete", "Analysis complete"));
            setIsUploading(false);
            fetchReports();
          }
        } catch (pollErr) {
          if (pollCount >= maxPolls) {
            clearInterval(homePollTimerRef.current);
            homePollTimerRef.current = null;
            setIsUploading(false);
          }
        }
      }, 1500);
    } catch (err) {
      console.error("Upload error:", err);
      const errMsg =
        err.response?.data?.message ||
        t("uploadProgress.uploadFailed", "Error uploading files. Please ensure you are logged in and backend is running.");
      setUploadError(errMsg);
      setIsUploading(false);
    }
  };

  const handleDismissHomeUpload = () => {
    if (homePollTimerRef.current) {
      clearInterval(homePollTimerRef.current);
      homePollTimerRef.current = null;
    }
    setIsUploading(false);
    setUploadStage(t("uploadProgress.preparing", "Preparing your report"));
    setUploadProgress(0);
    setUploadError(null);
    setCompletedReport(null);
    setFiles([]);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
    fetchReports();
  };

  const handleViewReport = async (reportId) => {
    try {
      const res = await reportsAPI.viewReport(reportId);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        alert(t("common.error", "Unable to generate secure report link."));
      }
    } catch (err) {
      console.error("Failed to view report:", err);
      alert(t("common.error", "Error opening report. Ensure backend is running."));
    }
  };

  const getFileIcon = (name) => {
    if (!name) return <FiFileText />;
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return <FiFileText color="#dc2626" />;
    if (["jpg", "jpeg", "png"].includes(ext)) return <FiActivity color="#0284c7" />;
    return <FiFileText color="#475569" />;
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = useMemo(
    () => [
      {
        question: t("home.faq1Q", "What is Vaidyasthana?"),
        answer: t("home.faq1A", "Vaidyasthana is a secure, cloud-based healthcare records platform that enables patients to store diagnostic documents in private Azure Blob Storage and understand complex laboratory results using Azure AI Document Intelligence and Azure OpenAI."),
      },
      {
        question: t("home.faq2Q", "Are my medical documents private and confidential?"),
        answer: t("home.faq2A", "Yes. Your documents are stored in private Azure Blob Storage containers without public anonymous access. Every document request generates a short-lived (60-minute), cryptographically signed Shared Access Signature (SAS) token with strict server-side authorization checks."),
      },
      {
        question: t("home.faq3Q", "Does the AI replace a licensed physician?"),
        answer: t("home.faq3A", "No. Vaidyasthana's AI report summaries and biomarker interpretations are educational tools designed to explain medical terminology and suggest clarifying questions for your physician. It does not provide clinical diagnoses or alter medical prescriptions."),
      },
      {
        question: t("home.faq4Q", "How do repeating sound dose reminders work?"),
        answer: t("home.faq4A", "When a scheduled medication dose becomes due, Vaidyasthana plays a gentle melodic chime and repeats every 90 seconds until you mark the dose Taken or Skipped."),
      },
      {
        question: t("contact.hoursTitle", "Support Hours & Assistance"),
        answer: t("contact.hoursDetails", "Monday – Saturday: 9:00 AM – 8:00 PM IST. Dedicated patient and clinician assistance team available anytime."),
      },
    ],
    [t]
  );

  const localizedFeatures = useMemo(() => getLocalizedFeatureData(t), [t]);

  return (
    <div id="home" className="home-wrapper">
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="hero-container">
          <div className="hero-text-content">
            <div className="hero-trust-badge">
              <FiShield className="trust-icon" />
              <span>{t("home.heroBadge", "Enterprise Medical Intelligence & Patient Health Records")}</span>
            </div>

            <h1 className="hero-main-title">
              <span className="hero-title-lead">{t("home.welcomeTo", "Welcome to Vaidyasthana")}</span>
              <span className="hero-gradient-text">{t("home.heroTitle", "Universal Cloud Health Records & AI Clinical Intelligence")}</span>
            </h1>

            <p className="hero-description">
              {t("home.heroSubtitle", "Consolidate diagnostic reports, track prescribed medications with repeating audible reminders, connect with verified doctors, and unlock automated AI biomarker insights.")}
            </p>

            <div className="hero-cta-buttons">
              {user ? (
                <button
                  className="btn-hero-primary"
                  onClick={() => navigate("/dashboard")}
                  type="button"
                >
                  {t("nav.myRecordsDashboard", "Go to Patient Vault")} <FiArrowRight />
                </button>
              ) : (
                <button
                  className="btn-hero-primary cta-primary-btn"
                  onClick={() => setAuthModalType("register")}
                  type="button"
                >
                  {t("home.ctaButton", "Get Started Free")} <FiArrowRight />
                </button>
              )}
              <Link to="/ai-analysis" className="btn-hero-secondary">
                {t("nav.aiAnalysis", "Explore AI Analysis")}
              </Link>
            </div>

            <div className="hero-feature-pills">
              <span className="pill-item">
                <FiLock className="pill-icon" /> {t("footer.privateAzureVault", "Private Cloud Vault")}
              </span>
              <span className="pill-item">
                <FiCpu className="pill-icon" /> {t("footer.azureDocIntel", "Automated OCR Extraction")}
              </span>
              <span className="pill-item">
                <FiShield className="pill-icon" /> {t("home.securityCard2Title", "60-Min SAS Authorization")}
              </span>
              <span className="pill-item">
                <FiCheckCircle className="pill-icon" /> {t("footer.physicianPortal", "Physician Audit Trail")}
              </span>
            </div>
          </div>

          {/* Interactive Hero Visual Composition */}
          <div className="hero-visual-card">
            <div className="clinical-mockup-window">
              <div className="mockup-header">
                <div className="window-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="mockup-header-title">{t("home.uploadCardTitle", "Diagnostic Panel • Azure AI Extraction")}</span>
                <span className="mockup-badge-live">
                  <span className="live-dot"></span> {t("status.active", "Live Analysis")}
                </span>
              </div>

              <div className="mockup-body">
                <div className="mockup-patient-strip">
                  <div className="mockup-patient-id">
                    <strong>{t("dashboard.tableName", "Record")}:</strong> Comprehensive Metabolic Panel (CMP)
                  </div>
                  <span className="mockup-status-tag">{t("status.verified", "OCR Verified")}</span>
                </div>

                <div className="mockup-biomarker-table">
                  <div className="biomarker-row biomarker-header">
                    <span>{t("aiAnalysis.biomarkerName", "Biomarker")}</span>
                    <span>{t("aiAnalysis.measuredValue", "Result")}</span>
                    <span>{t("aiAnalysis.referenceRange", "Reference")}</span>
                    <span>{t("common.status", "Status")}</span>
                  </div>
                  <div className="biomarker-row">
                    <span className="bio-name">Hemoglobin (Hb)</span>
                    <span className="bio-val">14.2 g/dL</span>
                    <span className="bio-ref">13.5 - 17.5</span>
                    <span className="bio-badge normal">{t("aiAnalysis.normalBadge", "Normal")}</span>
                  </div>
                  <div className="biomarker-row">
                    <span className="bio-name">Fasting Glucose</span>
                    <span className="bio-val highlight-warn">118 mg/dL</span>
                    <span className="bio-ref">70 - 99</span>
                    <span className="bio-badge warn">{t("aiAnalysis.highBadge", "Elevated")}</span>
                  </div>
                  <div className="biomarker-row">
                    <span className="bio-name">Serum Creatinine</span>
                    <span className="bio-val">0.95 mg/dL</span>
                    <span className="bio-ref">0.70 - 1.30</span>
                    <span className="bio-badge normal">{t("aiAnalysis.normalBadge", "Normal")}</span>
                  </div>
                </div>

                <div className="mockup-ai-insight">
                  <div className="insight-badge">
                    <FiCpu size={14} /> {t("aiAnalysis.clinicalSummaryTitle", "AI Clinical Summary")}
                  </div>
                  <p>
                    {t("aiAnalysis.safetyNoticeText", "Fasting glucose is mildly elevated above standard reference intervals. Recommends physician discussion for HbA1c screening and lifestyle guidance.")}
                  </p>
                </div>

                <div className="mockup-security-footer">
                  <span className="mockup-sec-badge">
                    <FiLock size={12} /> Azure Key Vault Encrypted • AES-256 GCM
                  </span>
                  <span className="mockup-sec-badge tag-teal">
                    <FiShield size={12} /> {t("video.connected", "Authorized Access Only")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Showcase Carousel Section */}
      <section className="showcase-carousel-section">
        <div className="section-heading-wrap showcase-heading">
          <span className="section-eyebrow">{t("home.showcaseEyebrow", "Medical Interface Showcase")}</span>
          <h2>{t("home.showcaseTitle", "Clinical Records Visualization Showcase")}</h2>
          <p>
            {t("home.featuresSubtitle", "Experience how Vaidyasthana unifies encrypted document storage, automated lab OCR extraction, and clinical AI insights.")}
          </p>
        </div>

        <div className="carousel-frame">
          <div className="carousel-header-bar">
            <span className="carousel-title-tag">{t("common.appName", "Vaidyasthana")} • {t("common.tagline", "Clinical Health Records")}</span>
            <div className="carousel-nav-controls">
              <button
                className="carousel-arrow-btn"
                onClick={() =>
                  setCurrentImage(
                    (i) => (i - 1 + images.length) % images.length
                  )
                }
                aria-label={t("common.previousPreview", "Previous preview")}
                type="button"
                title={t("common.previousPreview", "Previous preview")}
              >
                <FiChevronLeft size={18} />
              </button>
              <div className="carousel-indicators">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    className={`indicator-dot ${
                      currentImage === idx ? "active" : ""
                    }`}
                    onClick={() => setCurrentImage(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                className="carousel-arrow-btn"
                onClick={() =>
                  setCurrentImage((i) => (i + 1) % images.length)
                }
                aria-label={t("common.nextPreview", "Next preview")}
                type="button"
                title={t("common.nextPreview", "Next preview")}
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="carousel-viewport">
            <img
              src={images[currentImage]}
              alt={`Clinical interface view ${currentImage + 1}`}
              className="carousel-slide-img"
            />
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section className="features-showcase-section">
        <div className="section-heading-wrap">
          <span className="section-eyebrow">{t("home.quickActionsTitle", "Enterprise Healthcare Platform")}</span>
          <h2>{t("home.featuresTitle", "Designed for Patients, Trusted by Clinicians")}</h2>
          <p>
            {t("home.featuresSubtitle", "Vaidyasthana provides an integrated healthcare technology stack bridging paper documents with digital insights.")}
          </p>
        </div>

        <div className="features-grid">
          {localizedFeatures.map((feature, idx) => (
            <div key={feature.key || idx} className="feature-card">
              <div className="feature-icon-wrapper">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="feature-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4-Step Document & AI Workflow */}
      <section className="workflow-section">
        <div className="section-heading-wrap">
          <span className="section-eyebrow">{t("home.quickActionsTitle", "End-to-End Workflow")}</span>
          <h2>{t("home.featuresTitle", "How Vaidyasthana Works")}</h2>
          <p>{t("home.featuresSubtitle", "From paper test report to clinical clarity in four intuitive steps")}</p>
        </div>

        <div className="workflow-steps-grid">
          <div className="workflow-step-card">
            <div className="step-badge">01</div>
            <div className="step-icon-wrap">
              <FiUploadCloud size={24} />
            </div>
            <h4>{t("dashboard.uploadRecordBtn", "Upload Documents")}</h4>
            <p>
              {t("home.uploadCardSubtitle", "Upload laboratory results, prescriptions, or imaging reports in PDF, JPEG, or PNG format with a single click.")}
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-badge">02</div>
            <div className="step-icon-wrap">
              <FiFileText size={24} />
            </div>
            <h4>{t("footer.azureDocIntel", "Azure OCR Extraction")}</h4>
            <p>
              {t("footer.mission", "Azure AI Document Intelligence accurately extracts laboratory tables, numeric test units, and clinical headers.")}
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-badge">03</div>
            <div className="step-icon-wrap">
              <FiCpu size={24} />
            </div>
            <h4>{t("aiAnalysis.clinicalSummaryTitle", "AI Medical Summary")}</h4>
            <p>
              {t("aiAnalysis.safetyNoticeText", "Azure OpenAI models translate complex terminology into plain-language explanations and highlight abnormal parameters.")}
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-badge">04</div>
            <div className="step-icon-wrap">
              <FiActivity size={24} />
            </div>
            <h4>{t("doctorDashboard.title", "Physician Review")}</h4>
            <p>
              {t("doctorDashboard.subtitle", "Share verified records with your physician via the Doctor Portal using your unique Patient ID.")}
            </p>
          </div>
        </div>
      </section>

      {/* Security & Cloud Privacy Architecture Section */}
      <section className="security-architecture-section">
        <div className="security-card">
          <div className="security-content">
            <div className="security-tag">
              <FiLock size={16} /> {t("home.securityTitle", "Enterprise Privacy Standards")}
            </div>
            <h2>{t("home.securitySubtitle", "Built on Private Azure Cloud Infrastructure")}</h2>
            <p>
              {t("footer.mission", "Medical records contain the most sensitive data in existence. Vaidyasthana enforces strict architectural boundaries to guarantee your records remain private and tamper-resistant.")}
            </p>

            <div className="security-features-list">
              <div className="sec-feature-item">
                <FiCheckCircle className="sec-check-icon" />
                <div>
                  <strong>{t("home.securityCard1Title", "No Anonymous Public Blobs:")}</strong> {t("home.securityCard1Desc", "Storage containers are configured with private access policies.")}
                </div>
              </div>
              <div className="sec-feature-item">
                <FiCheckCircle className="sec-check-icon" />
                <div>
                  <strong>{t("home.securityCard2Title", "Time-Limited SAS Access:")}</strong> {t("home.securityCard2Desc", "Viewing requests issue cryptographically signed 60-minute Shared Access Signatures.")}
                </div>
              </div>
              <div className="sec-feature-item">
                <FiCheckCircle className="sec-check-icon" />
                <div>
                  <strong>{t("home.securityCard3Title", "Role-Based Access Control:")}</strong> {t("home.securityCard3Desc", "Patients only access their own vault. Clinicians require verified permissions.")}
                </div>
              </div>
            </div>
          </div>

          <div className="security-stats-card">
            <div className="stat-box">
              <div className="stat-number">256-bit</div>
              <div className="stat-label">{t("footer.encryptedStorage", "AES Encryption at Rest")}</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">60 min</div>
              <div className="stat-label">{t("home.securityCard2Title", "SAS Token Lifespan")}</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">100%</div>
              <div className="stat-label">{t("home.securityCard3Title", "Patient Record Ownership")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Upload Action if Logged In */}
      {user && (
        <section className="home-quick-upload-section">
          <div className="quick-upload-card">
            <div className="quick-upload-header">
              <FiUploadCloud size={28} className="upload-icon" />
              <div>
                <h3>{t("home.uploadCardTitle", "Quick Upload to Your Vault")}</h3>
                <p>{t("home.uploadCardSubtitle", "Upload a new report directly from the home portal")}</p>
              </div>
            </div>

            {isUploading || uploadError || completedReport ? (
              <UploadProgressCard
                files={files}
                currentStage={uploadStage}
                uploadProgress={uploadProgress}
                error={uploadError}
                completedReport={completedReport}
                onRetry={handleFileUpload}
                onDismiss={handleDismissHomeUpload}
                onViewDocument={() =>
                  handleViewReport(completedReport?._id)
                }
              />
            ) : (
              <div className="quick-upload-form">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="file-input-control"
                />
                <button
                  className="btn-quick-upload"
                  onClick={handleFileUpload}
                  disabled={isUploading || files.length === 0}
                  type="button"
                >
                  {t("home.uploadButton", "Upload & Analyze")}
                </button>
              </div>
            )}

            {message && !uploadError && (
              <div className="upload-feedback-message">
                <FiAlertCircle /> {message}
              </div>
            )}

            {reports.length > 0 && (
              <div className="recent-reports-mini">
                <span className="recent-title">{t("home.recentReports", "Recent Uploads:")}</span>
                <div className="recent-reports-pills">
                  {reports.slice(0, 3).map((r) => (
                    <button
                      key={r._id}
                      className="mini-report-pill"
                      onClick={() => handleViewReport(r._id)}
                      type="button"
                    >
                      {getFileIcon(r.originalName || r.fileName)}
                      <span>{r.originalName || r.fileName}</span>
                      <FiEye size={12} />
                    </button>
                  ))}
                  <Link to="/dashboard" className="view-all-link">
                    {t("home.viewAllRecords", "View all")} ({reports.length}) →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Frequently Asked Questions (FAQ) */}
      <section className="faq-section">
        <div className="section-heading-wrap">
          <span className="section-eyebrow">{t("home.faqTitle", "Patient & Provider FAQs")}</span>
          <h2>{t("home.faqTitle", "Frequently Asked Questions")}</h2>
          <p>{t("home.faqSubtitle", "Common questions regarding security, AI analysis, and records sharing")}</p>
        </div>

        <div className="faq-accordion-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${activeFaq === index ? "expanded" : ""}`}
            >
              <button
                className="faq-question-btn"
                onClick={() => toggleFaq(index)}
                aria-expanded={activeFaq === index}
              >
                <span>{faq.question}</span>
                {activeFaq === index ? (
                  <FiChevronUp className="faq-chevron" />
                ) : (
                  <FiChevronDown className="faq-chevron" />
                )}
              </button>
              {activeFaq === index && (
                <div className="faq-answer-body">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="bottom-cta-banner">
        <div className="cta-banner-content">
          <h2>{t("home.ctaTitle", "Ready to Organize Your Medical Records?")}</h2>
          <p>
            {t("home.ctaSubtitle", "Experience instant document organization, intelligent lab interpretations, and convenient appointment management with Vaidyasthana.")}
          </p>
          <div className="cta-banner-actions">
            {user ? (
              <button
                className="btn-banner-primary"
                onClick={() => navigate("/dashboard")}
                type="button"
              >
                {t("nav.myRecordsDashboard", "Access My Dashboard")}
              </button>
            ) : (
              <button
                className="btn-banner-primary"
                onClick={() => setAuthModalType("register")}
                type="button"
              >
                {t("home.ctaButton", "Create Free Account")}
              </button>
            )}
            <Link to="/contact" className="btn-banner-secondary">
              {t("nav.supportContact", "Contact Clinical Support")}
            </Link>
          </div>
        </div>
      </section>

      {/* Floating BMI Tool Button */}
      <button
        className="floating-bmi-btn"
        onClick={() => setBMIPopupOpen(true)}
        title={t("bmi.title", "Check Body Mass Index")}
        aria-label={t("bmi.title", "Open BMI Calculator")}
        type="button"
      >
        <span className="bmi-btn-icon">⚖️</span>
        <span className="bmi-btn-text">{t("bmi.title", "BMI Calculator")}</span>
      </button>

      {/* BMI Calculator Modal */}
      {isBMIPopupOpen && (
        <BMIPopup onClose={() => setBMIPopupOpen(false)} />
      )}

      {/* Auth Modal */}
      {authModalType && (
        <AuthModal
          type={authModalType}
          onClose={() => setAuthModalType(null)}
          onLoginSuccess={(data) => {
            setAuthModalType(null);
            fetchReports();
            if (data.user?.role === "doctor") {
              navigate("/doctor-dashboard");
            } else if (data.user?.role === "admin") {
              navigate("/admin-dashboard");
            } else {
              navigate("/dashboard");
            }
          }}
        />
      )}
    </div>
  );
};

export default Home;
