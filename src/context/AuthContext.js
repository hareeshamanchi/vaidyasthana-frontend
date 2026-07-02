import React, {
  createContext,
  useState,
  useEffect,
} from "react";

import axios from "axios";

const API = process.env.REACT_APP_API;

export const AuthContext =
  createContext();

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const checkLoggedIn =
      async () => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setLoading(false);
          return;
        }

        try {
          const response =
            await axios.get(
              `${API}/api/auth/profile`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

          setUser(response.data);
        } catch (error) {
          localStorage.removeItem(
            "token"
          );

          setUser(null);
        } finally {
          setLoading(false);
        }
      };

    checkLoggedIn();
  }, []);

  const login = (
    userData,
    token
  ) => {
    localStorage.setItem(
      "token",
      token
    );

    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(
      "token"
    );

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};