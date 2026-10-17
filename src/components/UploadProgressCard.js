import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  FiUploadCloud,
  FiFileText,
  FiImage,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiCpu,
  FiDatabase,
  FiEye,
  FiArrowRight,
  FiXCircle,
} from "react-icons/fi";
import "./UploadProgressCard.css";

const STAGES = [
  { id: 1, label: "Preparing your report", icon: FiFileText },
  { id: 2, label: "Uploading your medical report", icon: FiUploadCloud },
  { id: 3, label: "Extracting text from your document", icon: FiDatabase },
  { id: 4, label: "AI is analyzing your report", icon: FiCpu },
  { id: 5, label: "Saving your analysis", icon: FiDatabase },
  { id: 6, label: "Analysis complete", icon: FiCheckCircle },
];

export const getStageIndex = (stageLabel) => {
  switch (stageLabel) {
    case "Preparing your report":
      return 0;
    case "Uploading your medical report":
      return 1;
    case "Extracting text from your document":
      return 2;
    case "AI is analyzing your report":
      return 3;
    case "Saving your analysis":
      return 4;
    case "Analysis complete":
      return 5;
    default:
      return 0;
  }
};

const UploadProgressCard = ({
  files = [],
  currentStage = "Preparing your report",
  uploadProgress = 0,
  error = null,
  completedReport = null,
  onRetry = null,
  onDismiss = null,
  onViewDocument = null,
}) => {
  const stageIdx = getStageIndex(currentStage);
  const isFailed = Boolean(error);
  const isComplete = currentStage === "Analysis complete" && !isFailed;
  const isServerProcessing = stageIdx >= 2 && !isComplete && !isFailed;
  const isFileUploading = stageIdx === 1 && !isFailed;

  const primaryFile = files[0];
  const fileExtension = primaryFile?.name?.split(".").pop()?.toLowerCase() || "";
  const isPdf = fileExtension === "pdf";
  const fileSizeKb = primaryFile?.size ? (primaryFile.size / 1024).toFixed(0) : "0";

  return (
    <div
      className={`upload-progress-card ${isFailed ? "state-error" : ""} ${
        isComplete ? "state-complete" : ""
      }`}
      role="region"
      aria-label="Medical Report Processing Status"
    >
      {/* Accessible Live Announcement */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isFailed
          ? `Upload failed: ${error}`
          : isComplete
          ? "Report processing and AI analysis complete."
          : `Current processing stage: ${currentStage}`}
      </div>

      {/* Header Info */}
      <div className="progress-card-header">
        <div className="file-preview-indicator">
          {isPdf ? (
            <FiFileText className="file-badge-icon pdf" size={24} />
          ) : (
            <FiImage className="file-badge-icon img" size={24} />
          )}
          <div className="file-meta">
            <span className="file-name" title={primaryFile?.name || "Medical Document"}>
              {primaryFile?.name || "Medical Document"}
              {files.length > 1 && ` (+${files.length - 1} more)`}
            </span>
            <span className="file-sub">
              {fileSizeKb} KB • {fileExtension.toUpperCase() || "DOCUMENT"}
            </span>
          </div>
        </div>

        <div className="status-badge-indicator">
          {isFailed ? (
            <span className="pill-status error">
              <FiXCircle size={14} /> Attention Needed
            </span>
          ) : isComplete ? (
            <span className="pill-status success">
              <FiCheckCircle size={14} /> Ready
            </span>
          ) : (
            <span className="pill-status active">
              <FiRefreshCw className="spin-icon" size={14} /> Processing
            </span>
          )}
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="progress-track-wrapper">
        <div className="progress-label-row">
          <span className="status-current-text">{currentStage}</span>
          <span className="progress-percentage-text">
            {isFailed
              ? "Failed"
              : isComplete
              ? "100%"
              : isFileUploading
              ? `${Math.min(uploadProgress, 99)}%`
              : isServerProcessing
              ? "Analyzing..."
              : "0%"}
          </span>
        </div>

        <div
          className={`progress-bar-track ${
            isServerProcessing ? "indeterminate" : ""
          } ${isComplete ? "completed" : ""} ${isFailed ? "failed" : ""}`}
        >
          <div
            className="progress-bar-fill"
            style={{
              width: isComplete
                ? "100%"
                : isFileUploading
                ? `${Math.min(uploadProgress, 99)}%`
                : isServerProcessing
                ? "100%"
                : "5%",
            }}
          />
        </div>

        {/* Indeterminate AI Analysis Explanation Notice */}
        {isServerProcessing && (
          <p className="ai-indeterminate-notice">
            <FiCpu className="pulsing-icon" /> AI is analyzing your report. This
            may take a little while.
          </p>
        )}
      </div>

      {/* Structured 6-Stage Timeline */}
      <div className="stages-timeline-list" aria-hidden="true">
        {STAGES.map((s, index) => {
          const StageIcon = s.icon;
          let stageClass = "stage-pending";

          if (isFailed && index === stageIdx) {
            stageClass = "stage-error";
          } else if (index < stageIdx || isComplete) {
            stageClass = "stage-completed";
          } else if (index === stageIdx) {
            stageClass = "stage-active";
          }

          return (
            <div key={s.id} className={`timeline-stage-item ${stageClass}`}>
              <div className="stage-icon-circle">
                {stageClass === "stage-completed" ? (
                  <FiCheckCircle size={14} />
                ) : stageClass === "stage-error" ? (
                  <FiXCircle size={14} />
                ) : stageClass === "stage-active" ? (
                  <FiRefreshCw size={14} className="spin-icon" />
                ) : (
                  <StageIcon size={14} />
                )}
              </div>
              <span className="stage-title">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error Action State */}
      {isFailed && (
        <div className="error-alert-box">
          <FiAlertCircle size={20} className="error-icon" />
          <div className="error-copy">
            <strong>Upload or Analysis Interrupted</strong>
            <p>{error}</p>
          </div>
          <div className="error-actions">
            {onRetry && (
              <button
                type="button"
                className="btn-retry-action"
                onClick={onRetry}
              >
                <FiRefreshCw size={14} /> Retry Upload
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                className="btn-dismiss-action"
                onClick={onDismiss}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion Details Card */}
      {isComplete && (
        <div className="completion-summary-card">
          <div className="completion-header">
            <FiCheckCircle size={24} className="success-icon" />
            <div>
              <h4>Medical Document Secured & Evaluated</h4>
              <p>
                Clinical markers extracted and interpreted via Azure AI.
              </p>
            </div>
          </div>

          {completedReport?.aiAnalysis && (
            <div className="analysis-quick-preview">
              <div className="preview-stat">
                <span className="stat-label">Clinical Severity:</span>
                <span
                  className={`severity-tag ${
                    completedReport.aiAnalysis.severity?.toLowerCase() || "unknown"
                  }`}
                >
                  {completedReport.aiAnalysis.severity || "Evaluated"}
                </span>
              </div>
              {completedReport.aiAnalysis.summary && (
                <p className="preview-summary">
                  {completedReport.aiAnalysis.summary.slice(0, 160)}...
                </p>
              )}
            </div>
          )}

          <div className="completion-actions-row">
            <Link
              to="/ai-analysis"
              className="btn-view-ai-insights"
              onClick={onDismiss}
            >
              <FiCpu size={16} /> View AI Insights <FiArrowRight size={14} />
            </Link>

            {onViewDocument && (
              <button
                type="button"
                className="btn-view-sas-doc"
                onClick={onViewDocument}
              >
                <FiEye size={16} /> View Original Document
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                className="btn-done-action"
                onClick={onDismiss}
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

UploadProgressCard.propTypes = {
  files: PropTypes.array,
  currentStage: PropTypes.string,
  uploadProgress: PropTypes.number,
  error: PropTypes.string,
  completedReport: PropTypes.object,
  onRetry: PropTypes.func,
  onDismiss: PropTypes.func,
  onViewDocument: PropTypes.func,
};

export default UploadProgressCard;
