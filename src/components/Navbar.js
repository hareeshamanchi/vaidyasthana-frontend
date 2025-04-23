import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import './Navbar.css';
import AuthModal from './AuthModal'; // Auth modal component

function Navbar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalType, setAuthModalType] = useState(null); // 'login' or 'register'

  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleOpenLogin = () => {
    setAuthModalType('login');
    closeMobileMenu();
  };

  const handleOpenSignup = () => {
    setAuthModalType('register');
    closeMobileMenu();
  };

  const handleLoginSuccess = () => {
    setAuthModalType(null);
    window.location.reload(); // optional: refresh after login
  };

  // Accessing logo from public folder
  const logo = process.env.PUBLIC_URL + '/assets/logo.png';

  return (
    <nav className="premium-navbar">
      <div className="navbar-brand">
        <a href="/" className="logo-link">
          <img src={logo} alt="Vaidyasthana Logo" className="navbar-logo" />
        </a>
        <a href="/" className="navbar-title">Vaidyasthana</a>
      </div>

      {/* Desktop Navigation */}
      <ul className="navbar-links desktop-only">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/ai-analysis">AI Analysis</Link></li> {/* Update link to AI Analysis route */}
        <li><a href="#diet">Diet Plan</a></li>
        <li><a href="#appointments">Appointments</a></li>
        <li><a href="#reports">Reports</a></li>
        <li><a href="#insurance">Insurance</a></li>
        <li><a href="#contact">Contact</a></li>
        <li onClick={handleOpenLogin} className="login">Login</li>
        <li onClick={handleOpenSignup} className="signup">Sign Up</li>
      </ul>

      {/* Hamburger Icon for Mobile */}
      <div className="mobile-only hamburger-container" onClick={toggleMobileMenu}>
        <div className={`hamburger-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <ul className="navbar-links mobile-menu">
          <li><Link to="/" onClick={closeMobileMenu}>Home</Link></li>
          <li><Link to="/ai-analysis" onClick={closeMobileMenu}>AI Analysis</Link></li> {/* Update mobile link */}
          <li><a href="#diet" onClick={closeMobileMenu}>Diet Plan</a></li>
          <li><a href="#appointments" onClick={closeMobileMenu}>Appointments</a></li>
          <li><a href="#reports" onClick={closeMobileMenu}>Reports</a></li>
          <li><a href="#insurance" onClick={closeMobileMenu}>Insurance</a></li>
          <li><a href="#contact" onClick={closeMobileMenu}>Contact</a></li>
          <li onClick={handleOpenLogin} className="login">Login</li>
          <li onClick={handleOpenSignup} className="signup">Sign Up</li>
        </ul>
      )}

      {/* Auth Modal */}
      {authModalType && (
        <AuthModal
          type={authModalType}
          onClose={() => setAuthModalType(null)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </nav>
  );
}

export default Navbar;
