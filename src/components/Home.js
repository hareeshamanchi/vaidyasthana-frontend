import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Home.css';
import BMIPopup from './BMIPopup';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Home = () => {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [isBMIPopupOpen, setBMIPopupOpen] = useState(false);
  const navigate = useNavigate();

  const images = [
    "/assets/11.png",
    "/assets/22.png",
    "/assets/33.png",
    "/assets/55.png",
    "/assets/44.png",
    "/assets/5.png",
   
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleFileUpload = async () => {
    if (!files.length) return setMessage('Please select at least one file.');

    const formData = new FormData();
    files.forEach(file => formData.append('file', file));

    try {
      const res = await axios.post('http://localhost:5000/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Files uploaded successfully.');
      setFiles([]);
      fetchReports();
    } catch (error) {
      console.error(error);
      setMessage('Error uploading files.');
    }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get('http://localhost:5000/upload/all');
      setReports(res.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼';
    if (['doc', 'docx'].includes(ext)) return '📃';
    return '📁';
  };

  const handleDietPlan = async () => {
    if (!reports.length) return toast.error("No reports found.");

    const latestReport = reports[0]; // latest due to descending sort

    try {
      const res = await axios.post("http://localhost:5000/analyze-path", {
        image_path: latestReport.filePath
      });

      if (res.data?.conditions) {
        navigate("/diet", { state: { results: res.data } });
      } else {
        toast.error("No analysis result.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Analysis failed.");
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div id="home">
      <header className="home-header">
        <h1>Welcome to Vaidyasthana</h1>
        <p>The AI-Powered Medical Record Management System</p>
      </header>

      {/* Image Carousel */}
      <section className="image-carousel">
        <div className="carousel-container">
          <img
            src={images[currentImage]}
            alt={`Slide ${currentImage + 1}`}
            className="carousel-image"
          />
        </div>
      </section>

      {/* Upload Section */}
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

      {/* Uploaded Reports */}
      <section className="report-preview-section">
        <h2>Uploaded Reports</h2>
        {reports.length === 0 ? (
          <p>No reports found.</p>
        ) : (
          <ul className="report-list">
            {reports.map((report) => (
              <li key={report._id} className="report-item">
                <span className="icon">{getFileIcon(report.fileName)}</span>
                <div>
                  <p className="file-name">{report.fileName}</p>
                  <p className="upload-time">Uploaded on {new Date(report.uploadedAt).toLocaleString()}</p>
                </div>
                <a
                  href={`http://localhost:5000/${report.filePath}`}
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

      {/* Floating BMI Button */}
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
