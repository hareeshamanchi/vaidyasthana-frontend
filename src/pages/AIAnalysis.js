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
} from "react-icons/fi";

const AIAnalysis = () => {
  const { t, translateCategory, translateStatus } = useLanguage();
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

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
                <div className="section-title-wrap">
                  <FiCpu className="sec-icon blue" />
                  <h3>{t("aiAnalysis.summaryTitle", "Plain-Language Clinical Summary")}</h3>
                </div>
                <div className="summary-box-card">
                  <p>
                    {selectedReport.aiAnalysis?.summary ||
                      t("aiAnalysis.summaryDefault", "Detailed clinical summary is being generated by Azure OpenAI. If newly configured, click 'Re-run AI Analysis' above.")}
                  </p>
                </div>
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