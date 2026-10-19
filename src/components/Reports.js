import React, { useEffect, useState } from "react";
import "./Report.css";
import { reportsAPI } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

const Reports = () => {
  const { t, isTelugu } = useLanguage();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    reportsAPI
      .getReports()
      .then((res) => setReports(res.data || []))
      .catch((err) => console.error("Error fetching reports:", err));
  }, []);

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString(isTelugu ? "te-IN" : undefined);

  const getFileIcon = (fileName) => {
    if (!fileName) return "📁";
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "pdf") return "📄";
    if (["jpg", "jpeg", "png"].includes(ext)) return "🖼️";
    if (["doc", "docx"].includes(ext)) return "📃";
    return "📁";
  };

  const handleView = async (reportId) => {
    try {
      const res = await reportsAPI.viewReport(reportId);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("View report error:", err);
    }
  };

  return (
    <div className="reports-container">
      <h2>{t("dashboard.recordsVaultTitle", "Uploaded Medical Reports")}</h2>

      {reports.length === 0 ? (
        <p>{t("dashboard.noMatchingRecords", "No reports found.")}</p>
      ) : (
        <ul className="report-list">
          {reports.map((report) => (
            <li key={report._id} className="report-item">
              <div className="file-icon">
                {getFileIcon(report.originalName || report.fileName)}
              </div>

              <div className="file-details">
                <p className="file-name">
                  {report.originalName || report.fileName}
                </p>

                <p className="upload-date">
                  {t("dashboard.tableDate", "Uploaded")}: {formatDate(report.uploadedAt || report.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleView(report._id)}
                className="view-btn"
              >
                {t("common.view", "View")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Reports;