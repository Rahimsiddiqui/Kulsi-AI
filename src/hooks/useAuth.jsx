import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { authService } from "../services/authService.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if token exists in localStorage
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (!token) {
          // No token stored, user is not authenticated
          setLoading(false);
          return;
        }

        // Token exists, verify it with server
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          // Token is invalid or expired, clear auth state
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        // On error, clear auth to be safe
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signup = async (email, password, fullName) => {
    try {
      const response = await authService.signup(email, password, fullName);
      // Signup doesn't authenticate - user needs to verify email first
      toast.success("Registration successful! Check your email to verify.");
      return response;
    } catch (err) {
      toast.error(err.message || "Registration failed");
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      toast.success("Login successful!");
      return response;
    } catch (err) {
      toast.error(err.message || "Login failed");
      throw err;
    }
  };

  const verifyCode = async (email, code) => {
    try {
      const response = await authService.verifyCode(email, code);
      setUser(response.user);
      setIsAuthenticated(true);
      toast.success("Email verified successfully!");
      return response;
    } catch (err) {
      toast.error(err.message || "Verification failed");
      throw err;
    }
  };

  const resendCode = async (email) => {
    try {
      const response = await authService.resendCode(email);
      toast.success("Verification code sent successfully!");
      return response;
    } catch (err) {
      toast.error(err.message || "Failed to resend code");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      toast.success("Logged out successfully!");
    } catch (err) {
      toast.error(err.message || "Logout failed");
      throw err;
    }
  };

  const googleAuth = async (code) => {
    try {
      const response = await authService.googleAuth(code);
      setUser(response.user);
      setIsAuthenticated(true);
      toast.success("Google authentication successful!");
      return response;
    } catch (err) {
      toast.error(err.message || "Google authentication failed");
      throw err;
    }
  };

  const githubAuth = async (code) => {
    try {
      const response = await authService.githubAuth(code);
      setUser(response.user);
      setIsAuthenticated(true);
      toast.success("GitHub authentication successful!");
      return response;
    } catch (err) {
      toast.error(err.message || "GitHub authentication failed");
      throw err;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    signup,
    login,
    verifyCode,
    resendCode,
    logout,
    googleAuth,
    githubAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
