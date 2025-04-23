// src/pages/AIAnalysis.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AIAnalysis.css';

const AIAnalysis = () => {
  const [reports, setReports] = useState([]);
  const [analysisResults, setAnalysisResults] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/upload/all')
      .then(res => setReports(res.data))
      .catch(err => console.error(err));
  }, []);

  const analyzeReport = async (reportId) => {
    setLoadingId(reportId);
    try {
      const res = await axios.post(`http://localhost:5000/analysis/${reportId}`);
      setAnalysisResults(prev => ({ ...prev, [reportId]: res.data }));
    } catch (err) {
      setAnalysisResults(prev => ({ ...prev, [reportId]: { error: 'Analysis failed.' } }));
    }
    setLoadingId(null);
  };

  return (
    <div className="ai-analysis-container">
      <h2>AI Analysis of Uploaded Reports</h2>
      {reports.map(report => (
        <div key={report._id} className="report-analysis-card">
          <p><strong>{report.fileName}</strong></p>
          <button onClick={() => analyzeReport(report._id)} disabled={loadingId === report._id}>
            {loadingId === report._id ? 'Analyzing...' : 'Analyze'}
          </button>
          {analysisResults[report._id] && (
            <pre className="analysis-output">
              {JSON.stringify(analysisResults[report._id], null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

export default AIAnalysis;
