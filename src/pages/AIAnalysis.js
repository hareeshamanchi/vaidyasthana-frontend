import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AIAnalysis.css';

const AIAnalysis = () => {
  const [reports, setReports] = useState([]);
  const [analysisResult, setAnalysisResult] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all uploaded reports
  useEffect(() => {
    axios.get('http://localhost:5000/upload/all')
      .then(res => setReports(res.data))
      .catch(err => console.error('Error fetching reports:', err));
  }, []);

  // Analyze all reports together
  const analyzeAllReports = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/analyze/');
      setAnalysisResult(res.data.analysis);
    } catch (err) {
      setAnalysisResult('❌ Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="ai-analysis-container">
      <h2>AI Analysis of Uploaded Reports</h2>

      <ul>
        {reports.map((report) => (
          <li key={report._id}>{report.fileName}</li>
        ))}
      </ul>

      <button onClick={analyzeAllReports} disabled={loading}>
        {loading ? 'Analyzing All Reports...' : 'Analyze All'}
      </button>

      {analysisResult && (
        <div className="analysis-output">
          <h3>AI Combined Analysis</h3>
          <pre>{analysisResult}</pre>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
