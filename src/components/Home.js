import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Home.css';
import BMIPopup from './BMIPopup';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Home = () => {
  /* ---------- state ---------- */
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [isBMIPopupOpen, setBMIPopupOpen] = useState(false);
  const navigate = useNavigate();

  /* carousel images */
  const images = [
    '/assets/11.png',
    '/assets/22.png',
    '/assets/33.png',
    '/assets/55.png',
    '/assets/44.png',
    '/assets/5.png',
  ];

  /* ---------- effects ---------- */

  // rotate carousel every 4 s
  useEffect(() => {
    const id = setInterval(
      () => setCurrentImage((i) => (i + 1) % images.length),
      4000
    );
    return () => clearInterval(id); // ✅ cleanup returns a function
  }, [images.length]);

  // initial fetch of reports
  useEffect(() => {
    fetchReports();
  }, []);

  /* ---------- handlers ---------- */

  const handleFileChange = (e) => setFiles([...e.target.files]);

  const handleFileUpload = async () => {
    if (!files.length) {
      setMessage('Please select at least one file.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file)); // FastAPI expects “files”

    try {
      await axios.post('http://localhost:5000/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Files uploaded successfully.');
      setFiles([]);
      fetchReports();
    } catch (err) {
      console.error(err);
      setMessage('Error uploading files.');
    }
  };

  const fetchReports = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/upload/all');
      setReports(data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const handleDietPlan = async () => {
    if (!reports.length) return toast.error('No reports found.');

    const latest = reports[0];

    try {
      const res = await axios.post('http://localhost:5000/analyze-path', {
        image_path: latest.filePath,
      });
      if (res.data?.conditions) {
        navigate('/diet', { state: { results: res.data } });
      } else {
        toast.error('No analysis result.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Analysis failed.');
    }
  };

  /* ---------- helpers ---------- */

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼';
    if (['doc', 'docx'].includes(ext)) return '📃';
    return '📁';
  };

  /* ---------- render ---------- */
  return (
    <div id="home">
      <header className="home-header">
        <h1>Welcome to Vaidyasthana</h1>
        <p>The AI‑Powered Medical Record Management System</p>
      </header>

      {/* carousel */}
      <section className="image-carousel">
        <div className="carousel-container">
          <img
            src={images[currentImage]}
            alt={`Slide ${currentImage + 1}`}
            className="carousel-image"
          />
        </div>
      </section>

      {/* upload */}
      <section className="upload-section">
        <h2>Upload Your Reports or Documents</h2>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.csv,.xlsx"
          onChange={handleFileChange}
        />
        <button onClick={handleFileUpload}>Upload</button>
        <p>{message}</p>
      </section>

      {/* reports list */}
      <section className="report-preview-section">
        <h2>Uploaded Reports</h2>
        {reports.length === 0 ? (
          <p>No reports found.</p>
        ) : (
          <ul className="report-list">
            {reports.map((r) => (
              <li key={r.id} className="report-item">
                <span className="icon">{getFileIcon(r.fileName)}</span>
                <div>
                  <p className="file-name">{r.fileName}</p>
                  <p className="upload-time">
                    Uploaded on {new Date(r.uploadedAt).toLocaleString()}
                  </p>
                </div>
                <a
                   href={`http://localhost:5000/uploads/${r.filePath}`}
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

      {/* BMI button */}
      <button
        onClick={() => setBMIPopupOpen(true)}
        className="floating-bmi-button animated-bmi"
      >
        BMI
      </button>

      {isBMIPopupOpen && (
        <BMIPopup onClose={() => setBMIPopupOpen(false)} />
      )}
    </div>
  );
};

export default Home;
