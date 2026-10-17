import React, { useState, useEffect, useContext } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import AuthModal from "./AuthModal";
import NotificationDropdown from "./NotificationDropdown";
import { AuthContext } from "../context/AuthContext";
import {
  FiMenu,
  FiX,
  FiLogOut,
  FiActivity,
  FiFileText,
  FiCalendar,
  FiShield,
  FiMail,
  FiCpu,
  FiHeart,
} from "react-icons/fi";

function Navbar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalType, setAuthModalType] = useState(null);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleOpenLogin = () => setAuthModalType("login");
  const handleOpenSignup = () => setAuthModalType("register");

  const handleLogout = () => {
    logout();
    navigate("/");
    closeMobileMenu();
  };

  const handleLoginSuccess = (data) => {
    setAuthModalType(null);
    if (data.user && data.user.role === "patient") {
      navigate("/dashboard");
    } else if (data.user && data.user.role === "doctor") {
      navigate("/doctor-dashboard");
    } else if (data.user && data.user.role === "admin") {
      navigate("/admin-dashboard");
    }
  };

  const logo = process.env.PUBLIC_URL + "/assets/logo.png";

  const isActive = (path) => location.pathname === path;

  const isDoctor = user && user.role === "doctor";
  const isPatient = user && (user.role === "patient" || !user.role);
  const isAdmin = user && user.role === "admin";

  const getUserInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <nav className="vaidya-navbar" role="navigation" aria-label="Main Navigation">
      <div className="navbar-inner">
        {/* Brand Logo & Title */}
        <div className="navbar-brand">
          <Link to="/" className="brand-link" onClick={closeMobileMenu}>
            <div className="brand-logo-wrap">
              <img
                src={logo}
                alt="Vaidyasthana Logo"
                className="brand-logo-img"
                onError={(e) => {
                  e.target.style.display = "none";
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div className="brand-logo-fallback" style={{ display: "none" }}>
                <FiActivity size={20} color="#0284c7" />
              </div>
            </div>
            <div className="brand-text">
              <span className="navbar-title">Vaidyasthana</span>
              <span className="brand-tagline">Clinical Health Records</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <ul className="navbar-links desktop-only">
          <li>
            <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
              Home
            </Link>
          </li>

          {/* Doctor-specific links */}
          {isDoctor && (
            <>
              <li>
                <Link
                  to="/doctor-dashboard"
                  className={`nav-link doctor-link ${
                    isActive("/doctor-dashboard") ? "active" : ""
                  }`}
                >
                  <FiShield className="nav-icon" /> Doctor Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/appointment"
                  className={`nav-link ${
                    isActive("/appointment") || isActive("/appointments") ? "active" : ""
                  }`}
                >
                  <FiCalendar className="nav-icon" /> Consultations
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor-dashboard"
                  className={`nav-link ${
                    isActive("/doctor-dashboard") ? "active" : ""
                  }`}
                >
                  <FiFileText className="nav-icon" /> Medical Vault
                </Link>
              </li>
              <li>
                <Link
                  to="/timeline"
                  className={`nav-link ${
                    isActive("/timeline") || isActive("/health-timeline") ? "active" : ""
                  }`}
                >
                  <FiActivity className="nav-icon" /> Health Timeline
                </Link>
              </li>
            </>
          )}

          {/* Patient-specific links */}
          {isPatient && (
            <>
              <li>
                <Link
                  to="/timeline"
                  className={`nav-link ${
                    isActive("/timeline") || isActive("/health-timeline") ? "active" : ""
                  }`}
                >
                  <FiActivity className="nav-icon" /> Timeline
                </Link>
              </li>
              <li>
                <Link
                  to="/appointment"
                  className={`nav-link ${
                    isActive("/appointment") || isActive("/appointments") ? "active" : ""
                  }`}
                >
                  <FiCalendar className="nav-icon" /> Appointments
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
                >
                  <FiFileText className="nav-icon" /> My Records
                </Link>
              </li>
              <li>
                <Link
                  to="/ai-analysis"
                  className={`nav-link ${isActive("/ai-analysis") ? "active" : ""}`}
                >
                  <FiCpu className="nav-icon" /> AI Analysis
                </Link>
              </li>
              <li>
                <Link
                  to="/diet"
                  className={`nav-link ${isActive("/diet") ? "active" : ""}`}
                >
                  <FiHeart className="nav-icon" /> Diet Plan
                </Link>
              </li>
              <li>
                <Link
                  to="/insurance"
                  className={`nav-link ${isActive("/insurance") ? "active" : ""}`}
                >
                  <FiShield className="nav-icon" /> Insurance
                </Link>
              </li>
            </>
          )}

          {/* Admin-specific links */}
          {isAdmin && (
            <>
              <li>
                <Link
                  to="/admin-dashboard"
                  className={`nav-link admin-link ${
                    isActive("/admin-dashboard") || isActive("/admin") ? "active" : ""
                  }`}
                >
                  <FiShield className="nav-icon" /> Admin Portal
                </Link>
              </li>
              <li>
                <Link
                  to="/appointment"
                  className={`nav-link ${
                    isActive("/appointment") || isActive("/appointments") ? "active" : ""
                  }`}
                >
                  <FiCalendar className="nav-icon" /> Consultations
                </Link>
              </li>
            </>
          )}

          {/* Guest links */}
          {!user && (
            <>
              <li>
                <Link
                  to="/appointment"
                  className={`nav-link ${
                    isActive("/appointment") || isActive("/appointments") ? "active" : ""
                  }`}
                >
                  <FiCalendar className="nav-icon" /> Appointments
                </Link>
              </li>
              <li>
                <Link
                  to="/ai-analysis"
                  className={`nav-link ${isActive("/ai-analysis") ? "active" : ""}`}
                >
                  <FiCpu className="nav-icon" /> AI Analysis
                </Link>
              </li>
              <li>
                <Link
                  to="/diet"
                  className={`nav-link ${isActive("/diet") ? "active" : ""}`}
                >
                  <FiHeart className="nav-icon" /> Diet Plan
                </Link>
              </li>
              <li>
                <Link
                  to="/insurance"
                  className={`nav-link ${isActive("/insurance") ? "active" : ""}`}
                >
                  <FiShield className="nav-icon" /> Insurance
                </Link>
              </li>
            </>
          )}

          <li>
            <Link
              to="/contact"
              className={`nav-link ${isActive("/contact") ? "active" : ""}`}
            >
              <FiMail className="nav-icon" /> Contact
            </Link>
          </li>
        </ul>

        {/* Desktop Auth Controls */}
        <div className="navbar-auth desktop-only">
          {user ? (
            <div className="navbar-user-section">
              <NotificationDropdown user={user} />
              <div className="user-profile-badge">
                <div className="user-avatar-circle" title={user.name}>
                  {getUserInitials(user.name)}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role-pill">{user.role || "patient"}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-nav-logout"
                  title="Sign Out"
                  aria-label="Logout"
                >
                  <FiLogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <button
                onClick={handleOpenLogin}
                className="btn-nav-login login"
                type="button"
              >
                Sign In
              </button>
              <button
                onClick={handleOpenSignup}
                className="btn-nav-signup signup"
                type="button"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        {/* Mobile Header Controls */}
        <div className="mobile-header-controls mobile-only">
          {user && (
            <div className="mobile-header-notif">
              <NotificationDropdown user={user} />
            </div>
          )}
          <button
            className="mobile-toggle-btn"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Portaled to document.body to prevent backdrop-filter clipping) */}
      {isMobileMenuOpen &&
        (typeof document !== "undefined"
          ? ReactDOM.createPortal(
              <div className="mobile-drawer-backdrop" onClick={closeMobileMenu}>
                <div
                  className="mobile-drawer"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-label="Mobile Navigation"
                >
            <div className="mobile-drawer-header">
              <div className="brand-text">
                <span className="navbar-title">Vaidyasthana</span>
                <span className="brand-tagline">Clinical Health Records</span>
              </div>
              <button
                className="close-drawer-btn"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <FiX size={22} />
              </button>
            </div>

            {user && (
              <div className="mobile-user-profile">
                <div className="mobile-user-info-row">
                  <div className="user-avatar-circle">
                    {getUserInitials(user.name)}
                  </div>
                  <div className="mobile-user-text">
                    <div className="mobile-user-name">{user.name}</div>
                    <span className="user-role-pill">{user.role || "patient"}</span>
                  </div>
                </div>
                <div className="mobile-notif-wrap">
                  <NotificationDropdown user={user} />
                </div>
              </div>
            )}

            <ul className="mobile-nav-links">
              <li>
                <Link
                  to="/"
                  className={isActive("/") ? "active" : ""}
                  onClick={closeMobileMenu}
                >
                  Home
                </Link>
              </li>

              {/* Doctor-specific Mobile Links */}
              {isDoctor && (
                <>
                  <li>
                    <Link
                      to="/doctor-dashboard"
                      className={isActive("/doctor-dashboard") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Doctor Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/appointment"
                      className={isActive("/appointment") || isActive("/appointments") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Consultations Schedule
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/doctor-dashboard"
                      className={isActive("/doctor-dashboard") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Medical Vault
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/timeline"
                      className={isActive("/timeline") || isActive("/health-timeline") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Patient Health Timeline
                    </Link>
                  </li>
                </>
              )}

              {/* Patient-specific Mobile Links */}
              {isPatient && (
                <>
                  <li>
                    <Link
                      to="/timeline"
                      className={isActive("/timeline") || isActive("/health-timeline") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Health Timeline
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/appointment"
                      className={isActive("/appointment") || isActive("/appointments") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Appointments
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard"
                      className={isActive("/dashboard") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      My Records & Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/ai-analysis"
                      className={isActive("/ai-analysis") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      AI Medical Insights
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/diet"
                      className={isActive("/diet") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Diet & Nutrition Plan
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/insurance"
                      className={isActive("/insurance") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Health Insurance
                    </Link>
                  </li>
                </>
              )}

              {/* Admin-specific Mobile Links */}
              {isAdmin && (
                <>
                  <li>
                    <Link
                      to="/admin-dashboard"
                      className={isActive("/admin-dashboard") || isActive("/admin") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Administrative Verification
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/appointment"
                      className={isActive("/appointment") || isActive("/appointments") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Consultations
                    </Link>
                  </li>
                </>
              )}

              {/* Guest Mobile Links */}
              {!user && (
                <>
                  <li>
                    <Link
                      to="/appointment"
                      className={isActive("/appointment") || isActive("/appointments") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Appointments
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/ai-analysis"
                      className={isActive("/ai-analysis") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      AI Medical Insights
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/diet"
                      className={isActive("/diet") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Diet & Nutrition Plan
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/insurance"
                      className={isActive("/insurance") ? "active" : ""}
                      onClick={closeMobileMenu}
                    >
                      Health Insurance
                    </Link>
                  </li>
                </>
              )}

              <li>
                <Link
                  to="/contact"
                  className={isActive("/contact") ? "active" : ""}
                  onClick={closeMobileMenu}
                >
                  Support & Contact
                </Link>
              </li>
            </ul>

            <div className="mobile-drawer-footer">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="mobile-btn-logout"
                  type="button"
                >
                  <FiLogOut size={16} /> Sign Out
                </button>
              ) : (
                <div className="mobile-auth-stack">
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleOpenLogin();
                    }}
                    className="mobile-btn-login"
                    type="button"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleOpenSignup();
                    }}
                    className="mobile-btn-signup"
                    type="button"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )
    : null)}

      {/* Auth Modal Portal */}
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
