// src/components/Home.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState([]);
  const [currentImage, setCurrentImage] = useState(0);

  // Image paths directly listed here
  const images = [
    "/assets/1.png",
    "/assets/2.png",
    "/assets/3.png",
    "/assets/5.png",
    "/assets/4.png",
    "/assets/6.png",
    "/assets/i.jpg"
  ];

  // Image Carousel Scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change image every 4 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleFileUpload = async () => {
    if (!file) return setMessage('Please select a file to upload.');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', '12345'); // Hardcoded for now

    try {
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('File uploaded successfully.');
      fetchReports();
    } catch (error) {
      setMessage('There was an error uploading the file.');
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

  useEffect(() => {
    fetchReports();
  }, []);

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
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
        <input type="file" accept=".pdf,.jpg,.png,.doc,.docx,.txt" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload</button>
        <p>{message}</p>
      </section>

      {/* Display Uploaded Files */}
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
                  href={`http://localhost:5000${report.filePath}`}
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

export default Home;
