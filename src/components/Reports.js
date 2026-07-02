import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Reports.css";

const API = process.env.REACT_APP_API;

const Reports = () => {
  const [reports, setReports] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    axios
      .get(`${API}/upload/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setReports(res.data))
      .catch((err) =>
        console.error("Error fetching reports:", err)
      );
  }, [token]);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString();

  const getFileIcon = (fileName) => {
    const ext = fileName
      .split(".")
      .pop()
      .toLowerCase();

    if (ext === "pdf") return "📄";
    if (
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "png"
    )
      return "🖼️";
    if (
      ext === "doc" ||
      ext === "docx"
    )
      return "📃";

    return "📁";
  };

  return (
    <div className="reports-container">
      <h2>Uploaded Medical Reports</h2>

      {reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <ul className="report-list">
          {reports.map((report) => (
            <li
              key={report._id}
              className="report-item"
            >
              <div className="file-icon">
                {getFileIcon(report.fileName)}
              </div>

              <div className="file-details">
                <p className="file-name">
                  {report.fileName}
                </p>

                <p className="upload-date">
                  Uploaded:{" "}
                  {formatDate(
                    report.uploadedAt
                  )}
                </p>
              </div>

              <a
                href={report.fileURL}
                target="_blank"
                rel="noopener noreferrer"
                className="view-btn"
              >
                View
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Reports;