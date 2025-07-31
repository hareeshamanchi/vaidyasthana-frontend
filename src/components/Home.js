import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import './Home.css';
import BMIPopup from './BMIPopup';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// ——— CRITICAL FIX ———
// Include the session cookie on every request
axios.defaults.withCredentials = true;

const Home = () => {
  const { user } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [isBMIPopupOpen, setBMIPopupOpen] = useState(false);

  const images = [
    '/assets/11.png',
    '/assets/22.png',
    '/assets/33.png',
    '/assets/55.png',
    '/assets/44.png',
    '/assets/5.png',
  ];

  // Fetch the list of uploaded reports
  const fetchReports = async () => {
    if (!user) {
      setReports([]);
      return;
    }
    try {
      const { data } = await axios.get('http://localhost:5000/upload/all');
      setReports(data);
    } catch (err) {
      console.error('Could not fetch reports.', err);
      setReports([]);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  // Carousel rotation
  useEffect(() => {
    const id = setInterval(
      () => setCurrentImage(i => (i + 1) % images.length),
      4000
    );
    return () => clearInterval(id);
  }, [images.length]);

  const handleFileChange = e => {
    setFiles([...e.target.files]);
  };

  const handleFileUpload = async () => {
    if (!files.length) {
      setMessage('Please select at least one file.');
      return;
    }
    const formData = new FormData();
    files.forEach(file => formData.append('file', file));

    try {
      await axios.post(
        'http://localhost:5000/upload/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setMessage('Files uploaded successfully.');
      // reset input
      document.querySelector('input[type="file"]').value = '';
      setFiles([]);
      fetchReports();
    } catch (err) {
      console.error('Upload error:', err);
      setMessage('Error uploading files. Please make sure you are logged in.');
    }
  };

  const getFileIcon = name => {
    if (!name) return '📁';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📃';
    return '📁';
  };

  return (
    <div id="home">
      <header className="home-header">
        <h1>Welcome to Vaidyasthana</h1>
        <p>The AI-Powered Medical Record Management System</p>
      </header>

      <section className="image-carousel">
        <div className="carousel-container">
          <img
            src={images[currentImage]}
            alt={`Slide ${currentImage + 1}`}
            className="carousel-image"
          />
        </div>
      </section>

      {user ? (
        <>
          <section className="upload-section">
            <h2>Welcome, {user.name}! Upload Your Reports</h2>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
            />
            <button onClick={handleFileUpload}>Upload</button>
            {message && <p className="message">{message}</p>}
          </section>

          <section className="report-preview-section">
            <h2>Your Uploaded Reports</h2>
            {reports.length === 0 ? (
              <p>You have not uploaded any reports yet.</p>
            ) : (
              <ul className="report-list">
                {reports.map((r, idx) => (
                  <li key={idx} className="report-item">
                    <span className="icon">{getFileIcon(r.fileName)}</span>
                    <div>
                      <p className="file-name">{r.fileName}</p>
                    </div>
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
        </>
      ) : (
        <section className="info-section">
          <h2>Your Health, Simplified</h2>
          <p>Please log in or sign up to manage your medical records.</p>
        </section>
      )}

      <button
        onClick={() => setBMIPopupOpen(true)}
        className="floating-bmi-button animated-bmi"
      >
        BMI
      </button>
      {isBMIPopupOpen && <BMIPopup onClose={() => setBMIPopupOpen(false)} />}
    </div>
  );
};

export default Home;
