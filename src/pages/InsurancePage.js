import React, { useState, useEffect } from 'react';
import './InsurancePage.css';
import { motion } from 'framer-motion';

const InsurancePage = () => {
  const [aiMessage, setAiMessage] = useState('Analyzing your insurance needs...');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAiMessage('Based on your health reports, we recommend the Premium Wellness Plan. This plan covers chronic care, emergency services, and personalized health tracking.');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="insurance-container">
      <motion.div
        className="insurance-header"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1>Vaidyasthana Insurance</h1> {/* Corrected spelling */}
        <p>Your Health, Our Priority</p>
        <p className="sub-heading">Secure your future with AI-powered personalized plans and 24/7 support.</p>
      </motion.div>

      <motion.div
        className="insurance-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <h2>Recommended Plan</h2>
        <p className="ai-text">{aiMessage}</p>
        <ul className="features-list">
          <li>✔ Full body health analysis</li>
          <li>✔ Annual doctor checkups</li>
          <li>✔ Mental health counseling</li>
          <li>✔ 24/7 virtual assistant powered by AI</li>
        </ul>
        <button className="enroll-btn">Enroll</button> {/* Updated button text */}
      </motion.div>

      <motion.div
        className="time-bar"
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ delay: 1.5, duration: 4, ease: 'easeInOut' }}
      />
    </div>
  );
};

export default InsurancePage;
