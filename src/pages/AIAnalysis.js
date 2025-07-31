import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AIAnalysis.css";

const API = "http://localhost:5000"; // Define API base URL

const AIAnalysis = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(null); // store filename or "all"
  const [results, setResults] = useState({});   // key: filename, value: result

  useEffect(() => {
    axios
      .get(`${API}/upload/all`)
      .then((res) => setReports(res.data))
      .catch((err) => console.error("Error fetching reports:", err));
  }, []);

  const analyzeAllReports = async () => {
    setLoading("all");
    try {
      const res = await axios.post(`${API}/analyze/`);
      setResults((prev) => ({
        ...prev,
        all: JSON.stringify(res.data.analysis, null, 2),
      }));
    } catch (err) {
      setResults((prev) => ({ ...prev, all: "❌ Analysis failed. Please try again." }));
    }
    setLoading(null);
  };

  const analyzeSingleReport = async (report) => {
    setLoading(report.fileName);
    try {
      // Changed endpoint to use report.id (_id from MongoDB)
      const res = await axios.post(`${API}/analyze/${report.id}`); // Use report.id
      setResults((prev) => ({
        ...prev,
        [report.fileName]: JSON.stringify(res.data, null, 2),
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [report.fileName]: `❌ Analysis failed for ${report.fileName}`,
      }));
    }
    setLoading(null);
  };

  return (
    <div className="ai-analysis-container">
      <h2>🧠 AI Analysis of Medical Reports</h2>

      <ul className="analysis-list">
        {reports.map((r) => (
          <li key={r.id || r._id} className="analysis-item">
            <div className="report-title">{r.fileName}</div>

            <button
              className="analyze-btn"
              onClick={() => analyzeSingleReport(r)}
              disabled={loading !== null}
            >
              {loading === r.fileName ? "Analyzing..." : "Analyze"}
            </button>

            {results[r.fileName] && (
              <pre className="analysis-text animate-fade-in">{results[r.fileName]}</pre>
            )}
          </li>
        ))}
      </ul>

      <button className="analyze-all-btn" onClick={analyzeAllReports} disabled={loading !== null}>
        {loading === "all" ? "Analyzing All..." : "Analyze All"}
      </button>

      {results["all"] && (
        <div className="analysis-output animate-fade-in">
          <h3>🧾 AI Combined Analysis</h3>
          <pre className="analysis-text">{results["all"]}</pre>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;