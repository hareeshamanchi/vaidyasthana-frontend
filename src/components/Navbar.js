import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import AuthModal from './AuthModal';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalType, setAuthModalType] = useState(null);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleOpenLogin = () => setAuthModalType('login');
  const handleOpenSignup = () => setAuthModalType('register');
  
  const handleLogout = () => {
    logout();
    navigate('/');
    closeMobileMenu();
  };

  const handleLoginSuccess = (userData) => {
    setAuthModalType(null);
    if (userData.user.role === 'patient') {
      navigate('/dashboard');
    }
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
        {user && <li><Link to="/dashboard">Dashboard</Link></li>}
        <li><Link to="/ai-analysis">AI Analysis</Link></li>
        <li><Link to="/diet">Diet Plan</Link></li>
        <li><Link to="/appointment">Appointments</Link></li>
        <li><Link to="/insurance">Insurance</Link></li>
        <li><Link to="/contact">Contact</Link></li>
        {user ? (
          <>
            <li className="user-name">Hello, {user.name}</li>
            <li onClick={handleLogout} className="signup">Logout</li>
          </>
        ) : (
          <>
            <li onClick={handleOpenLogin} className="login">Login</li>
            <li onClick={handleOpenSignup} className="signup">Sign Up</li>
          </>
        )}
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
          {user && <li><Link to="/dashboard" onClick={closeMobileMenu}>Dashboard</Link></li>}
          <li><Link to="/ai-analysis" onClick={closeMobileMenu}>AI Analysis</Link></li>
          <li><Link to="/diet" onClick={closeMobileMenu}>Diet Plan</Link></li>
          <li><Link to="/appointment" onClick={closeMobileMenu}>Appointments</Link></li>
          <li><Link to="/insurance" onClick={closeMobileMenu}>Insurance</Link></li>
          <li><Link to="/contact" onClick={closeMobileMenu}>Contact</Link></li>
          {user ? (
            <li onClick={handleLogout} className="signup">Logout</li>
          ) : (
            <>
              <li onClick={() => { handleOpenLogin(); closeMobileMenu(); }} className="login">Login</li>
              <li onClick={() => { handleOpenSignup(); closeMobileMenu(); }} className="signup">Sign Up</li>
            </>
          )}
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