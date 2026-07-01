import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import "./PatientDashboard.css";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const PatientDashboard = () => {
  const { user, loading } = useContext(AuthContext);

  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [reports, setReports] = useState([]);

  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
      return;
    }

    if (user) {
      fetchReports();
    }

    // eslint-disable-next-line
  }, [user, loading]);

  // ===========================
  // Fetch Reports
  // ===========================
  const fetchReports = async () => {
    try {
      const { data } = await axios.get(
        "http://localhost:5000/upload/all",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReports(data);
    } catch (error) {
      console.error(error);
      setReports([]);
    }
  };

  // ===========================
  // Upload Reports
  // ===========================
  const handleFileUpload = async () => {
    if (files.length === 0) {
      setMessage("Please select files.");
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("file", file);
    });

    try {
      const res = await axios.post(
        "http://localhost:5000/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage(res.data.message);

      setFiles([]);

      document.querySelector(
        'input[type="file"]'
      ).value = "";

      fetchReports();

    } catch (error) {

      console.error(error);

      if (error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Upload Failed");
      }

    }
  };

  // ===========================
  // View Report
  // ===========================
  const viewReport = async (reportId) => {

    try {

      const res = await axios.get(
        `http://localhost:5000/upload/view/${reportId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      window.open(
        res.data.url,
        "_blank"
      );

    } catch (error) {

      console.error(error);

      setMessage(
        "Unable to open report."
      );

    }

  };

  // ===========================
  // File Icon
  // ===========================
  const getFileIcon = (name) => {

    if (!name) return "📁";

    const ext = name
      .split(".")
      .pop()
      .toLowerCase();

    if (ext === "pdf") return "📄";

    if (
      ["jpg", "jpeg", "png"].includes(ext)
    )
      return "🖼️";

    if (
      ["doc", "docx"].includes(ext)
    )
      return "📃";

    return "📁";

  };

  if (loading) {
    return (
      <div className="loading-container">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-container">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="patient-dashboard-container">

      <header className="dashboard-header">

        <h1>
          Welcome, {user.name}
        </h1>

        <p>
          Manage your medical reports here.
        </p>

        <p>
          <strong>
            Patient ID :
          </strong>{" "}
          {user.id || user._id}
        </p>

      </header>

      <section className="upload-section">

        <h2>
          Upload Medical Reports
        </h2>

        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) =>
            setFiles([...e.target.files])
          }
        />

        <button
          onClick={handleFileUpload}
        >
          Upload
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

      </section>

      <section className="reports-section">

        <h2>Your Reports</h2>

        {reports.length === 0 ? (

          <p>No reports uploaded.</p>

        ) : (

          <ul className="report-list">

            {reports.map((report) => (

              <li
                key={report._id}
                className="report-item"
              >

                <span className="icon">
                  {getFileIcon(
                    report.originalName
                  )}
                </span>

                <div className="file-name">
                  {report.originalName}
                </div>

                <button
                  className="view-button"
                  onClick={() =>
                    viewReport(report._id)
                  }
                >
                  View
                </button>

              </li>

            ))}

          </ul>

        )}

      </section>

    </div>
  );
};

export default PatientDashboard;