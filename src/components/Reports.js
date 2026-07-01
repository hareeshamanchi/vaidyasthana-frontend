// Reports.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Reports.css';

const API = '`${process.env.REACT_APP_API}
'; // Define API base URL

const Reports = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    axios.get(`${API}/upload/all`) // Use API variable
      .then((res) => setReports(res.data))
      .catch((err) => console.error('Error fetching reports:', err));
  }, []);

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString();

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop();
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📃';
    return '📁';
  };

  return (
    <div className="reports-container">
      <h2>Uploaded Medical Reports</h2>
      {reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <ul className="report-list">
          {reports.map((report) => (
            <li key={report._id} className="report-item">
              <div className="file-icon">{getFileIcon(report.fileName)}</div>
              <div className="file-details">
                <p className="file-name">{report.fileName}</p>
                <p className="upload-date">Uploaded: {formatDate(report.uploadedAt)}</p>
              </div>
              {/* Use report.fileURL directly for viewing reports from Azure Blob */}
              <a
                 href={report.fileURL} // Changed to fileURL
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