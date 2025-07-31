import React, { useState } from 'react';
import axios from 'axios';
import './DoctorDashboard.css';

axios.defaults.withCredentials = true;

const DoctorDashboard = () => {
  const [patientId, setPatientId] = useState('');
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState('');
  const [searchedPatient, setSearchedPatient] = useState('');

  const handleFetchReports = async () => {
    if (!patientId) {
      setMessage('Please enter a patient ID.');
      return;
    }
    setMessage('Fetching reports...');
    setSearchedPatient(patientId);
    try {
      const response = await axios.get(`http://localhost:5000/doctor/patient-reports/${patientId}`);
      setReports(response.data);
      if (response.data.length === 0) {
        setMessage('No reports found for this patient.');
      } else {
        setMessage('');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
      setMessage(error.response?.data?.error || 'Failed to fetch reports.');
    }
  };

  const getFileIcon = (name) => {
    if (!name) return '📁';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼';
    if (['doc', 'docx'].includes(ext)) return '📃';
    return '📁';
  };

  return (
    <div className="doctor-dashboard-container">
      <header className="dashboard-header">
        <h1>Doctor Dashboard</h1>
        <p>Access patient reports by entering their unique ID.</p>
      </header>

      <div className="search-container">
        <input
          type="text"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Enter Patient ID"
          className="patient-id-input"
        />
        <button onClick={handleFetchReports} className="fetch-button">
          Fetch Reports
        </button>
      </div>

      {message && <p className="message-text">{message}</p>}

      {reports.length > 0 && (
        <div className="reports-list-container">
          <h2>Reports for Patient ID: {searchedPatient}</h2>
          <ul className="report-list">
            {reports.map((report, index) => (
              <li key={index} className="report-item">
                <span className="icon">{getFileIcon(report.fileName)}</span>
                <p className="file-name">{report.fileName}</p>
                <a
                  href={`http://localhost:5000/upload/view/${report.fileName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-button"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;