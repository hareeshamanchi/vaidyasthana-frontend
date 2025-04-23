// src/components/AIAnalysis.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AIAnalysis.css';

const AIAnalysis = () => {
  const [reports, setReports] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/upload/all')
      .then(res => setReports(res.data))
      .catch(err => console.error('Failed to fetch reports', err));
  }, []);

  const analyzeReport = async (report) => {
    setSelectedReport(report.fileName);
    try {
      const res = await axios.post('http://localhost:5000/analyze', { filePath: report.filePath });
      setAnalysisResult(res.data);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAnalysisResult({ error: 'Analysis failed. Try again.' });
    }
  };

  return (
    <div className="ai-analysis-container">
      <h2>AI Report Analysis</h2>
      <ul className="report-list">
        {reports.map(report => (
          <li key={report._id} className="report-item">
            <span>{report.fileName}</span>
            <button onClick={() => analyzeReport(report)}>Analyze</button>
          </li>
        ))}
      </ul>

      {analysisResult && (
        <div className="analysis-result">
          <h3>Analysis for: {selectedReport}</h3>
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
