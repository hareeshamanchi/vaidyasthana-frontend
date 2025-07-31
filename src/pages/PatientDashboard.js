import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import './PatientDashboard.css';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }
    if (user) {
      fetchReports();
    }
  }, [user, loading, navigate]);

  const fetchReports = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/upload/all');
      setReports(data);
    } catch (err) {
      setReports([]);
      console.error('Could not fetch reports.');
    }
  };

  const handleFileChange = (e) => setFiles([...e.target.files]);

  const handleFileUpload = async () => {
    if (!files.length) {
      setMessage('Please select at least one file.');
      return;
    }
    const formData = new FormData();
    files.forEach((file) => formData.append('file', file));

    try {
      await axios.post('http://localhost:5000/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Files uploaded successfully.');
      document.querySelector('input[type="file"]').value = '';
      setFiles([]);
      fetchReports();
    } catch (err) {
      console.error(err);
      setMessage('Error uploading files.');
    }
  };

  const getFileIcon = (name) => {
    if (!name) return '📁';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📃';
    return '📁';
  };

  if (loading || !user) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="patient-dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome, {user.name}!</h1>
        <p>Manage your medical reports here. Your unique patient ID is: <strong>patient-{user.phone_number.replace(/\D/g, '')}</strong></p>
      </header>

      <section className="upload-section">
        <h2>Upload a New Report</h2>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
        />
        <button onClick={handleFileUpload}>Upload</button>
        {message && <p className="message">{message}</p>}
      </section>

      <section className="reports-section">
        <h2>Your Uploaded Reports</h2>
        {reports.length === 0 ? (
          <p>You have not uploaded any reports yet.</p>
        ) : (
          <ul className="report-list">
            {reports.map((r, index) => (
              <li key={index} className="report-item">
                <span className="icon">{getFileIcon(r.fileName)}</span>
                <p className="file-name">{r.fileName}</p>
                <a
                  href={`http://localhost:5000/upload/view/${r.fileName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-button"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PatientDashboard;
