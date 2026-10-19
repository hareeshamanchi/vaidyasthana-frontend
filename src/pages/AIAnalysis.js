import React, { useEffect, useState, useCallback } from "react";
import "./AIAnalysis.css";
import { reportsAPI } from "../services/api";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import {
  FiAlertTriangle,
  FiFileText,
  FiCpu,
  FiEye,
  FiRefreshCw,
  FiActivity,
  FiHelpCircle,
  FiCheckCircle,
  FiShield,
  FiUploadCloud,
  FiArrowRight,
  FiHeart,
  FiGlobe,
} from "react-icons/fi";

const AIAnalysis = () => {
  const { t, translateCategory, translateStatus, language, translateClinicalText } = useLanguage();
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [translationData, setTranslationData] = useState({});
  const [translatingReport, setTranslatingReport] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await reportsAPI.getReports();
      const list = res.data || [];
      setReports(list);
      if (list.length > 0 && !selectedReportId) {
        setSelectedReportId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedReportId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReAnalyze = async (reportId) => {
    setAnalyzingId(reportId);
    setStatusMsg("");
    try {
      const res = await reportsAPI.analyzeReport(reportId);
      setStatusMsg(res.data?.message || "AI Analysis updated successfully.");
      await fetchReports();
    } catch (err) {
      console.error("Re-analysis failed:", err);
      setStatusMsg(
        err.response?.data?.message ||
          "AI analysis could not complete. Verify Azure OpenAI service is active."
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const res = await reportsAPI.viewReport(reportId);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Could not view report:", err);
    }
  };

  const handleTranslateSummary = async (reportId, text) => {
    if (!text) return;
    if (translationData[reportId]?.show) {
      setTranslationData((prev) => ({
        ...prev,
        [reportId]: { ...prev[reportId], show: false },
      }));
      return;
    }

    if (translationData[reportId]?.translatedText) {
      setTranslationData((prev) => ({
        ...prev,
        [reportId]: { ...prev[reportId], show: true },
      }));
      return;
    }

    setTranslatingReport(true);
    try {
      const targetLang = language === "en" ? "te" : language;
      const res = await translateClinicalText({
        text,
        targetLanguage: targetLang,
        context: "clinical_report",
      });
      setTranslationData((prev) => ({
        ...prev,
        [reportId]: {
          show: true,
          originalText: text,
          translatedText: res.translatedText,
          preservedTerms: res.preservedTerms || [],
          disclaimer: res.disclaimer,
          targetLanguage: targetLang,
        },
      }));
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setTranslatingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-analysis-container">
        <div className="ai-loading-state">
          <FiRefreshCw className="ai-spinner-icon" />
          <p>{t("common.loading", "Retrieving Azure AI Clinical Document Interpretations...")}</p>
        </div>
      </div>
    );
  }

  const selectedReport =
    reports.find((r) => r._id === selectedReportId) || reports[0];

  return (
    <div className="ai-analysis-container">
      {/* Medical Safety Disclaimer Banner */}
      <div className="clinical-disclaimer-banner" role="alert">
        <div className="disclaimer-icon-wrap">
          <FiAlertTriangle size={22} />
        </div>
        <div className="disclaimer-copy">
          <strong>{t("aiAnalysis.safetyNoticeTitle", "Mandatory Medical Notice:")}</strong>{" "}
          {t("aiAnalysis.safetyNoticeText", "The diagnostic interpretations below are generated via Azure AI Document Intelligence and Azure OpenAI models for patient educational reference. This output is not a medical diagnosis, clinical prescription, or replacement for evaluation by a licensed physician.")}
        </div>
      </div>

      {/* Page Header */}
      <header className="ai-page-header">
        <div className="ai-header-tag">
          <FiCpu /> {t("aiAnalysis.engineTag", "Azure OpenAI Medical Language Model")}
        </div>
        <h1>{t("aiAnalysis.pageTitle", "AI Medical Report Insights")}</h1>
        <p className="ai-header-subtitle">
          {t("aiAnalysis.pageSubtitle", "Translate complex laboratory measurements, identify abnormal biomarkers, and prepare evidence-based questions for your next clinical consultation.")}
        </p>
      </header>

      {reports.length === 0 ? (
        <div className="empty-analysis-card">
          <div className="empty-icon-wrap">
            <FiUploadCloud size={44} />
          </div>
          <h3>{t("aiAnalysis.emptyTitle", "No Diagnostic Records Found")}</h3>
          <p>
            {t("aiAnalysis.emptyDesc", "You haven't uploaded any reports yet. Upload laboratory test results, blood panels, or radiology findings to generate intelligent insights.")}
          </p>
          <Link to="/dashboard" className="btn-go-vault">
            {t("aiAnalysis.goToVault", "Go to Medical Vault")} <FiArrowRight />
          </Link>
        </div>
      ) : (
        <div className="ai-analysis-workspace">
          {/* Document Tab Selector Bar */}
          <div className="report-tab-selector-bar">
            <span className="tab-bar-label">{t("aiAnalysis.availableDocuments", "Available Documents:")}</span>
            <div className="tab-buttons-scroll">
              {reports.map((rep) => (
                <button
                  key={rep._id}
                  className={`document-tab-btn ${
                    selectedReport?._id === rep._id ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedReportId(rep._id);
                    setStatusMsg("");
                  }}
                  type="button"
                >
                  <FiFileText className="tab-doc-icon" />
                  <span className="tab-title-text">
                    {rep.originalName || rep.fileName}
                  </span>
                  <span
                    className={`tab-status-pill ${
                      rep.analysisStatus?.toLowerCase() || "pending"
                    }`}
                  >
                    {translateStatus(rep.analysisStatus || "Pending")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {statusMsg && (
            <div className="ai-status-alert">
              <FiCheckCircle />
              <span>{statusMsg}</span>
            </div>
          )}

          {selectedReport && (
            <div className="analysis-dossier-card">
              {/* Dossier Top Bar */}
              <div className="dossier-top-bar">
                <div className="dossier-title-area">
                  <div className="dossier-badges-row">
                    <span className="category-pill">{translateCategory(selectedReport.category)}</span>
                    <span
                      className={`severity-pill ${
                        selectedReport.aiAnalysis?.severity?.toLowerCase() || "unknown"
                      }`}
                    >
                      {t("aiAnalysis.severity", `Severity: ${selectedReport.aiAnalysis?.severity || "Standard"}`, { level: selectedReport.aiAnalysis?.severity || "Standard" })}
                    </span>
                  </div>
                  <h2>{selectedReport.originalName || selectedReport.fileName}</h2>
                </div>

                <div className="dossier-actions-row">
                  <button
                    className="btn-view-doc"
                    onClick={() => handleViewReport(selectedReport._id)}
                    type="button"
                  >
                    <FiEye size={16} /> {t("aiAnalysis.originalDocumentBtn", "View Original Document")}
                  </button>
                  <button
                    className="btn-refresh-ai"
                    onClick={() => handleReAnalyze(selectedReport._id)}
                    disabled={analyzingId === selectedReport._id}
                    type="button"
                  >
                    <FiRefreshCw
                      className={analyzingId === selectedReport._id ? "spinning" : ""}
                    />
                    {analyzingId === selectedReport._id
                      ? t("aiAnalysis.analyzing", "Analyzing Document...")
                      : t("aiAnalysis.reAnalyzeBtn", "Re-run AI Analysis")}
                  </button>
                </div>
              </div>

              {/* Dossier Metadata Strip */}
              <div className="dossier-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">{t("aiAnalysis.pipeline", "Processing Pipeline")}</span>
                  <span className="meta-value status-done">
                    <FiCheckCircle size={14} /> {translateStatus(selectedReport.analysisStatus || "Processed")}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t("aiAnalysis.documentPages", "Document Pages")}</span>
                  <span className="meta-value">{t("aiAnalysis.pagesCount", `${selectedReport.pageCount || 1} Page(s)`, { count: selectedReport.pageCount || 1 })}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t("aiAnalysis.uploadTimestamp", "Upload Timestamp")}</span>
                  <span className="meta-value">
                    {new Date(
                      selectedReport.uploadedAt || selectedReport.createdAt
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t("aiAnalysis.storageIntegrity", "Storage Integrity")}</span>
                  <span className="meta-value">
                    <FiShield size={14} color="#0d9488" /> {t("aiAnalysis.privateAzureVault", "Private Azure Vault")}
                  </span>
                </div>
              </div>

              {/* Section 1: Plain-Language Summary */}
              <section className="dossier-sub-section summary-section">
                <div className="section-title-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiCpu className="sec-icon blue" />
                    <h3>{t("aiAnalysis.summaryTitle", "Plain-Language Clinical Summary")}</h3>
                  </div>
                  {selectedReport.aiAnalysis?.summary && (
                    <button
                      type="button"
                      className="btn-translate-clinical"
                      onClick={() => handleTranslateSummary(selectedReport._id, selectedReport.aiAnalysis.summary)}
                      disabled={translatingReport}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#0369a1",
                        background: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        borderRadius: "20px",
                        padding: "4px 12px",
                        cursor: "pointer",
                      }}
                      title="AI-assisted translation preserving medical terms"
                    >
                      <FiGlobe size={14} />
                      {translatingReport
                        ? t("common.translating", "Translating...")
                        : translationData[selectedReport._id]?.show
                        ? t("aiAnalysis.hideTranslation", "Hide Translation")
                        : t("aiAnalysis.translateSummary", "Translate (AI-Assisted)")}
                    </button>
                  )}
                </div>

                {/* Original clinical summary - always preserved */}
                <div className="summary-box-card">
                  <div className="source-label" style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "0.35rem" }}>
                    {t("aiAnalysis.originalReportText", "Original Clinical Summary (English):")}
                  </div>
                  <p>
                    {selectedReport.aiAnalysis?.summary ||
                      t("aiAnalysis.summaryDefault", "Detailed clinical summary is being generated by Azure OpenAI. If newly configured, click 'Re-run AI Analysis' above.")}
                  </p>
                </div>

                {/* AI-Assisted Non-Destructive Translation Display */}
                {translationData[selectedReport._id]?.show && (
                  <div
                    className="translated-summary-box"
                    style={{
                      marginTop: "1rem",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderLeft: "4px solid #0284c7",
                      borderRadius: "8px",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "#e0f2fe",
                          color: "#0369a1",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        <FiShield size={12} /> {t("aiAnalysis.aiTranslationBadge", "AI-Assisted Translation (Non-diagnostic)")}
                      </span>
                      {translationData[selectedReport._id].preservedTerms?.length > 0 && (
                        <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                          {t("aiAnalysis.preservedCount", "{count} Clinical Term(s) Preserved", { count: translationData[selectedReport._id].preservedTerms.length })}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "#1e293b", margin: "0.5rem 0" }}>
                      {translationData[selectedReport._id].translatedText}
                    </p>

                    {translationData[selectedReport._id].preservedTerms?.length > 0 && (
                      <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
                          {t("aiAnalysis.preservedTermsTitle", "Preserved Clinical Entities:")}
                        </span>
                        {translationData[selectedReport._id].preservedTerms.slice(0, 8).map((term, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "0.72rem",
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              color: "#0f172a",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontFamily: "monospace",
                            }}
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "0.75rem",
                        paddingTop: "0.5rem",
                        borderTop: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "6px",
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                      }}
                    >
                      <FiAlertTriangle size={14} style={{ flexShrink: 0, marginTop: "2px", color: "#f59e0b" }} />
                      <span>
                        {translationData[selectedReport._id].disclaimer ||
                          t("aiAnalysis.transDisclaimer", "Medical Translation Disclaimer: This translation is AI-assisted for patient convenience and does not replace the original clinical record. Consult your physician.")}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 2: Flagged Biomarkers */}
              <section className="dossier-sub-section biomarkers-section">
                <div className="section-title-wrap">
                  <FiActivity className="sec-icon teal" />
                  <h3>{t("aiAnalysis.flaggedBiomarkers", "Flagged Laboratory Biomarkers")}</h3>
                </div>

                {selectedReport.aiAnalysis?.abnormalParameters?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="biomarkers-table">
                      <thead>
                        <tr>
                          <th>{t("aiAnalysis.biomarkerName", "Biomarker / Test")}</th>
                          <th>{t("aiAnalysis.measuredValue", "Measured Value")}</th>
                          <th>{t("aiAnalysis.referenceRange", "Reference Range")}</th>
                          <th>{t("aiAnalysis.clinicalFlag", "Clinical Flag")}</th>
                          <th>{t("aiAnalysis.contextInterpretation", "Context / Interpretation")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.aiAnalysis.abnormalParameters.map(
                          (item, index) => (
                            <tr key={index} className="biomarker-row">
                              <td className="bio-name-cell">
                                <strong>{item.parameter}</strong>
                              </td>
                              <td className="bio-val-cell">{item.value}</td>
                              <td className="bio-ref-cell">
                                {item.normalRange || "Standard"}
                              </td>
                              <td>
                                <span
                                  className={`flag-badge ${
                                    item.status?.toLowerCase() || "abnormal"
                                  }`}
                                >
                                  {translateStatus(item.status || "Abnormal")}
                                </span>
                              </td>
                              <td className="bio-context-cell">
                                {item.reason || item.notes || "Out of physiological reference interval"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-abnormal-box">
                    <FiCheckCircle size={24} className="green-icon" />
                    <div>
                      <strong>{t("aiAnalysis.noAbnormalTitle", "No High-Risk Biomarker Deviations Flagged")}</strong>
                      <p>
                        {t("aiAnalysis.noAbnormalDesc", "Measured parameters align within expected laboratory reference thresholds or standard baseline parameters.")}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 3: Questions for Doctor Consultation */}
              {selectedReport.aiAnalysis?.doctorAdvice && (
                <section className="dossier-sub-section doctor-questions-section">
                  <div className="section-title-wrap">
                    <FiHelpCircle className="sec-icon purple" />
                    <h3>{t("aiAnalysis.doctorQuestionsTitle", "Questions for Your Physician Consultation")}</h3>
                  </div>
                  <div className="questions-card">
                    <p className="questions-intro">
                      {t("aiAnalysis.doctorQuestionsIntro", "Take these clinical talking points to your next doctor checkup:")}
                    </p>
                    <ul className="questions-list">
                      {Array.isArray(selectedReport.aiAnalysis.doctorAdvice) ? (
                        selectedReport.aiAnalysis.doctorAdvice.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))
                      ) : (
                        <li>{selectedReport.aiAnalysis.doctorAdvice}</li>
                      )}
                    </ul>
                  </div>
                </section>
              )}

              {/* Section 4: General Lifestyle & Nutritional Guidance */}
              {selectedReport.aiAnalysis?.lifestyleRecommendations && (
                <section className="dossier-sub-section lifestyle-section">
                  <div className="section-title-wrap">
                    <FiHeart className="sec-icon orange" />
                    <h3>{t("aiAnalysis.lifestyleTitle", "General Wellness & Dietary Considerations")}</h3>
                  </div>
                  <div className="lifestyle-guidance-card">
                    <p>
                      {Array.isArray(
                        selectedReport.aiAnalysis.lifestyleRecommendations
                      )
                        ? selectedReport.aiAnalysis.lifestyleRecommendations.join(" • ")
                        : selectedReport.aiAnalysis.lifestyleRecommendations}
                    </p>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;