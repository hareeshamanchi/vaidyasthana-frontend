import React, { createContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";
import { disconnectSocket } from "../services/socket";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUserProfile = (updatedData) => {
    setUser((prev) => ({
      ...prev,
      ...updatedData,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        checkLoggedIn,
        updateUserProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};