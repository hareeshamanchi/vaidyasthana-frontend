import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import { authAPI } from "../services/api";
import { disconnectSocket } from "../services/socket";

export const AuthContext = createContext();

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // Warning shown 2 minutes prior

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(120);

  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);

  const resetInactivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityWarning) {
      setInactivityWarning(false);
    }
  }, [inactivityWarning]);

  const checkLoggedIn = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getProfile();
      const userData = response.data?.user || response.data;
      setUser(userData);
      lastActivityRef.current = Date.now();
    } catch (error) {
      console.warn("Session check failed or token expired:", error.message);
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLoggedIn();
  }, [checkLoggedIn]);

  const login = (userData, token) => {
    disconnectSocket();
    if (token) {
      localStorage.setItem("token", token);
    }
    const cleanUser = userData?.user || userData;
    setUser(cleanUser);
    lastActivityRef.current = Date.now();
    setInactivityWarning(false);
  };

  const logout = useCallback(async () => {
    try {
      await authAPI.logout().catch(() => {});
    } finally {
      disconnectSocket();
      localStorage.removeItem("token");
      setUser(null);
      setInactivityWarning(false);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await authAPI.logoutAll().catch(() => {});
    } finally {
      disconnectSocket();
      localStorage.removeItem("token");
      setUser(null);
      setInactivityWarning(false);
    }
  }, []);

  const updateUserProfile = (updatedData) => {
    setUser((prev) => ({
      ...prev,
      ...updatedData,
    }));
  };

  // Inactivity timeout monitor
  useEffect(() => {
    if (!user) {
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
      return;
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    warningTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const timeLeft = INACTIVITY_TIMEOUT_MS - elapsed;

      if (timeLeft <= 0) {
        logout();
      } else if (timeLeft <= WARNING_THRESHOLD_MS) {
        setInactivityWarning(true);
        setInactivitySecondsLeft(Math.max(0, Math.ceil(timeLeft / 1000)));
      } else {
        if (inactivityWarning) {
          setInactivityWarning(false);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
    };
  }, [user, inactivityWarning, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        logoutAll,
        loading,
        checkLoggedIn,
        updateUserProfile,
        inactivityWarning,
        inactivitySecondsLeft,
        resetInactivity,
      }}
    >
      {!loading && children}

      {/* Inactivity Warning Modal */}
      {inactivityWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inactivity-warning-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
                fontSize: "24px",
              }}
            >
              ⏱
            </div>
            <h3
              id="inactivity-warning-title"
              style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}
            >
              Session Inactivity Warning
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              You have been inactive. For your clinical security, your session will automatically log out in{" "}
              <strong style={{ color: "#d97706" }}>{inactivitySecondsLeft} seconds</strong>.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                type="button"
                onClick={resetInactivity}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.95rem",
                }}
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={logout}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.95rem",
                }}
              >
                Sign Out Now
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
