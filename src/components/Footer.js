import React from 'react';
import './Footer.css';
import { Link } from 'react-router-dom';
import { FaWhatsapp, FaInstagram, FaTwitter } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-top">
        {/* Vaidyasthana Portal Name */}
        <div className="footer-section">
          <h2>Vaidyasthana</h2>
          <p>Your AI-powered healthcare partner.</p>
        </div>

        {/* Google Map Embed for MITS College */}
        <div className="footer-section">
          <h3>Our Location</h3>
          <iframe
            title="MITS College Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3870.037027927531!2d79.53944741431642!3d14.823682076090315!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bb2b9467f3e4b07%3A0xc69bb24691b67843!2sMadanapalle%20Institute%20of%20Technology%20%26%20Science%20(MITS)!5e0!3m2!1sen!2sin!4v1682913249373!5m2!1sen!2sin"
            width="250"
            height="180"
            style={{ border: '0' }}
            allowFullScreen=""
            loading="lazy"
          />
        </div>

        {/* Navigation Links */}
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            {['Home', 'AI Analysis', 'Diet Plan', 'Appointments', 'Insurance', 'Contact'].map((link, index) => (
              <li key={index}>
                <Link to={`/${link.toLowerCase().replace(/\s/g, '-')}`}>{link}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Social Media Icons */}
      <div className="footer-socials">
        {[
          { href: 'https://wa.me/9849839103', icon: <FaWhatsapp color="#25D366" /> },
          { href: 'https://www.instagram.com/vaidyasthana_30?igsh=cGpta3NzMzY2bGdq', icon: <FaInstagram color="#E1306C" /> },
          { href: 'https://twitter.com/vaidhyasthana', icon: <FaTwitter color="#1DA1F2" /> },
        ].map((social, index) => (
          <a key={index} href={social.href} target="_blank" rel="noopener noreferrer">
            <span className="social-icon">{social.icon}</span>
          </a>
        ))}
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Vaidyasthana. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
