const API_URL = "http://localhost:5000/api/auth";

export const authService = {
  // Sign Up with email and password
  signup: async (email, password, fullName) => {
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, fullName }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Sign up failed");
    }

    // Store token and user in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Login with email and password
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Store token and user in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Verify code (OTP/email verification)
  verifyCode: async (email, code) => {
    const response = await fetch(`${API_URL}/verify-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Verification failed");
    }

    // Store token and user in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Resend verification code
  resendCode: async (email) => {
    const response = await fetch(`${API_URL}/resend-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to resend code");
    }

    return data;
  },

  // Get current user
  getCurrentUser: async () => {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}/me`, {
      method: "GET",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  },

  // Logout
  logout: async () => {
    const response = await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Logout failed");
    }

    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return data;
  },

  // Google OAuth
  googleAuth: async (code) => {
    const response = await fetch(`${API_URL}/oauth/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, provider: "google" }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Google authentication failed");
    }

    // Store token and user in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // GitHub OAuth
  githubAuth: async (code) => {
    const response = await fetch(`${API_URL}/oauth/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, provider: "github" }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "GitHub authentication failed");
    }

    // Store token and user in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Link OAuth account
  linkOAuthAccount: async (code, provider) => {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}/oauth/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code, provider }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to link OAuth account");
    }

    return data;
  },

  // Disconnect OAuth account
  disconnectOAuthAccount: async (provider) => {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}/oauth/disconnect/${provider}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to disconnect OAuth account");
    }

    // Update user in localStorage
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },
};
