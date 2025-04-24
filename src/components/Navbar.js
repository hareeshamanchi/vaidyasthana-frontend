import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import AuthModal from './AuthModal';

function Navbar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalType, setAuthModalType] = useState(null);

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
    window.location.reload();
  };

  const logo = process.env.PUBLIC_URL + '/assets/logo.png';

  return (
    <nav className="premium-navbar">
      <div className="navbar-brand">
        <Link to="/" className="logo-link">
          <img src={logo} alt="Vaidyasthana Logo" className="navbar-logo" />
        </Link>
        <Link to="/" className="navbar-title">Vaidyasthana</Link>
      </div>

      {/* Desktop Navigation */}
      <ul className="navbar-links desktop-only">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/ai-analysis">AI Analysis</Link></li>
        <li><a href="/diet">Diet Plan</a></li> {/* Updated line */}
        <li><Link to="/appointment">Appointments</Link></li> {/* Added Appointments */}
        <li><Link to="/insurance">Insurance</Link></li> {/* Updated Insurance link */}
        <li><Link to="/contact">Contact</Link></li> {/* Added Contact */}
        <li onClick={handleOpenLogin} className="login">Login</li>
        <li onClick={handleOpenSignup} className="signup">Sign Up</li>
      </ul>

      {/* Mobile Menu Toggle */}
      <div className="mobile-only hamburger-container" onClick={toggleMobileMenu}>
        <div className={`hamburger-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <ul className="navbar-links mobile-menu">
          <li><Link to="/" onClick={closeMobileMenu}>Home</Link></li>
          <li><Link to="/ai-analysis" onClick={closeMobileMenu}>AI Analysis</Link></li>
          <li><a href="/diet" onClick={closeMobileMenu}>Diet Plan</a></li> {/* Updated line */}
          <li><Link to="/appointment" onClick={closeMobileMenu}>Appointments</Link></li> {/* Added Appointments */}
          <li><Link to="/insurance" onClick={closeMobileMenu}>Insurance</Link></li> {/* Updated Insurance link */}
          <li><Link to="/contact" onClick={closeMobileMenu}>Contact</Link></li> {/* Added Contact */}
          <li onClick={handleOpenLogin} className="login">Login</li>
          <li onClick={handleOpenSignup} className="signup">Sign Up</li>
        </ul>
      )}

      {/* Authentication Modal */}
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
