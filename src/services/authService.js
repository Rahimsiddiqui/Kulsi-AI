// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE_URL}/api/auth`;
const API_TIMEOUT = 10000; // 10 second timeout

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        "Request timeout. Please check your connection and try again."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const authService = {
  // Sign Up with email and password
  signup: async (email, password, fullName) => {
    if (!email || !password || !fullName) {
      throw new Error("Email, password, and full name are required");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const response = await fetchWithTimeout(`${API_URL}/signup`, {
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
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const response = await fetchWithTimeout(`${API_URL}/login`, {
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
    if (!email || !code) {
      throw new Error("Email and verification code are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const response = await fetchWithTimeout(`${API_URL}/verify-code`, {
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
    if (!email) {
      throw new Error("Email is required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const response = await fetchWithTimeout(`${API_URL}/resend-code`, {
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

    const response = await fetchWithTimeout(`${API_URL}/me`, {
      method: "GET",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      console.log("[getCurrentUser] Response not ok:", response.status);
      // Clear invalid token from localStorage
      if (response.status === 401 && token) {
        console.log(
          "[getCurrentUser] Clearing invalid token from localStorage"
        );
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      return null;
    }

    const data = await response.json();
    return data.user;
  },

  // Logout
  logout: async () => {
    const response = await fetchWithTimeout(`${API_URL}/logout`, {
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
    if (!code) {
      throw new Error("OAuth code is required");
    }

    const response = await fetchWithTimeout(`${API_URL}/oauth/callback`, {
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
    if (!code) {
      throw new Error("OAuth code is required");
    }

    const response = await fetchWithTimeout(`${API_URL}/oauth/callback`, {
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
