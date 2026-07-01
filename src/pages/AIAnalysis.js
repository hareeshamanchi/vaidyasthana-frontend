import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AIAnalysis.css";

const API = "http://localhost:5000";

const AIAnalysis = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await axios.get(
        `${API}/upload/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReports(data);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="ai-analysis-container">
        <h2>Loading AI Analysis...</h2>
      </div>
    );
  }

  return (
    <div className="ai-analysis-container">

      <h1>🧠 AI Medical Report Analysis</h1>

      {reports.length === 0 ? (

        <p>No Reports Found.</p>

      ) : (

        reports.map((report) => (

          <div
            className="analysis-card"
            key={report._id}
          >

            <h2>
              📄 {report.originalName}
            </h2>

            <p>

              <strong>Status :</strong>{" "}

              {report.analysisStatus}

            </p>

            <p>

              <strong>Pages :</strong>{" "}

              {report.pageCount}

            </p>

            <hr />

            <h3>🩺 AI Summary</h3>

            <p>

              {report.aiAnalysis?.summary ||
                "No Summary"}

            </p>

            <h3>⚠ Severity</h3>

            <p>

              {report.aiAnalysis?.severity ||
                "Unknown"}

            </p>

            <h3>
              🧪 Abnormal Parameters
            </h3>

            {report.aiAnalysis?.abnormalParameters
              ?.length > 0 ? (

              <ul>

                {report.aiAnalysis.abnormalParameters.map(
                  (item, index) => (

                    <li key={index}>

                      <strong>
                        {item.parameter}
                      </strong>

                      {" : "}

                      {item.value}

                      {" ("}

                      {item.status}

                      {")"}

                    </li>

                  )
                )}

              </ul>

            ) : (

              <p>None</p>

            )}

            <h3>
              🦠 Possible Diseases
            </h3>

            <ul>

              {report.aiAnalysis?.possibleDiseases?.map(
                (disease, index) => (

                  <li key={index}>
                    {disease}
                  </li>

                )
              )}

            </ul>

            <h3>
              💊 Recommendations
            </h3>

            <ul>

              {report.aiAnalysis?.recommendations?.map(
                (item, index) => (

                  <li key={index}>
                    {item}
                  </li>

                )
              )}

            </ul>

            <h3>
              🥗 Diet Plan
            </h3>

            <ul>

              {report.aiAnalysis?.dietPlan?.map(
                (item, index) => (

                  <li key={index}>
                    {item}
                  </li>

                )
              )}

            </ul>

            <h3>
              🏃 Exercise Plan
            </h3>

            <ul>

              {report.aiAnalysis?.exercisePlan?.map(
                (item, index) => (

                  <li key={index}>
                    {item}
                  </li>

                )
              )}

            </ul>

            <h3>
              👨‍⚕ Doctor Advice
            </h3>

            <p>

              {report.aiAnalysis?.doctorAdvice}

            </p>

            <h3>
              🧪 Follow-up Tests
            </h3>

            <ul>

              {report.aiAnalysis?.followUpTests?.map(
                (item, index) => (

                  <li key={index}>
                    {item}
                  </li>

                )
              )}

            </ul>

          </div>

        ))

      )}

    </div>
  );
};

export default AIAnalysis;