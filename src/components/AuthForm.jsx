import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth.jsx";

import {
  ArrowRight,
  Lock,
  Mail,
  User,
  Notebook,
  Loader2,
  Check,
  X,
  Github,
} from "lucide-react";

const API_URL = `http://localhost:5000/api/auth`;

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AuthForm = ({ onLogin }) => {
  const { signup, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Validation Logic
  const validations = {
    name: (name) => name.length >= 6,
    email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    password: (pass) => /^(?=.*[A-Z])(?=.*\d).{6,}$/.test(pass),
  };

  // Check form validity in real-time
  useEffect(() => {
    if (isLogin) {
      const emailValid = validations.email(formData.email);
      const passValid = validations.password(formData.password);
      setIsFormValid(emailValid && passValid);
    } else {
      const nameValid = validations.name(formData.name);
      const emailValid = validations.email(formData.email);
      const passValid = validations.password(formData.password);
      setIsFormValid(nameValid && emailValid && passValid);
    }
  }, [formData, isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Use the login method from useAuth context
        await login(formData.email, formData.password);
        // Context will handle state update and navigation
      } else {
        // Use the signup method from useAuth context
        await signup(formData.email, formData.password, formData.name);
        toast.success(
          "Registration successful! Please check your email to verify."
        );
        setFormData({ name: "", email: "", password: "" });
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth login/signup
  const handleOAuthConnect = async (provider) => {
    try {
      // Get OAuth URL from backend
      const endpoint = `/api/auth/oauth/${provider.toLowerCase()}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to get ${provider} OAuth URL`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error(`No OAuth URL returned for ${provider}`);
      }

      // Store provider in localStorage for callback handler
      localStorage.setItem("authMode", isLogin ? "login" : "signup");
      localStorage.setItem("oauthProvider", provider.toLowerCase());

      // Redirect to OAuth provider
      window.location.href = data.url;
    } catch (error) {
      toast.error(`Failed to connect ${provider}`);
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Helper to render Status Icon
  const renderStatusIcon = (isValid, value) => {
    if (!value) return null;
    return isValid ? (
      <Check className="absolute right-3 top-3.5 w-5 h-5 text-green-500 animate-in zoom-in duration-200" />
    ) : (
      <X className="absolute right-3 top-3.5 w-5 h-5 text-red-500 animate-in zoom-in duration-200" />
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-y-auto">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px] pointer-events-none opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[100px] pointer-events-none opacity-60"></div>

      <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-border shadow-2xl z-10 border-main transition-all duration-300">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <Notebook className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-textMain mb-2">
            {isLogin ? "Welcome Back" : "Join Kulsi AI"}
          </h1>
          <p className="text-textMuted">
            {isLogin
              ? "Enter your credentials to access your workspace."
              : "Start your intelligent learning journey."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1 relative group">
              <label
                htmlFor="name"
                className="text-xs font-medium text-textMuted ml-1"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  aria-label="Full Name"
                  aria-invalid={
                    formData.name && !validations.name(formData.name)
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    formData.name && !validations.name(formData.name)
                      ? "name-error"
                      : undefined
                  }
                  className={`w-full pl-12 pr-10 py-3 bg-surfaceHighlight border rounded-xl text-textMain focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 disabled:opacity-60 ${
                    formData.name && !validations.name(formData.name)
                      ? "border-red-300 bg-red-50/10"
                      : "border-border"
                  }`}
                  placeholder="John Doe"
                />
                {renderStatusIcon(
                  validations.name(formData.name),
                  formData.name
                )}
              </div>
              {/* Inline Hint - Only show if user has started typing */}
              {formData.name.length > 0 && (
                <div
                  id="name-error"
                  className={`text-[10px] mt-1 ml-1 transition-colors duration-200 absolute -bottom-[22px] left-0 w-full truncate ${
                    !validations.name(formData.name)
                      ? "text-red-500 font-medium"
                      : "text-green-600"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  Full name must be at least 6 characters
                </div>
              )}
            </div>
          )}

          <div
            className={`space-y-1 ${
              formData.name.length > 0 && "pt-3"
            } relative`}
          >
            <label
              htmlFor="email"
              className="text-xs font-medium text-textMuted ml-1"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                aria-label="Email Address"
                aria-invalid={
                  !isLogin &&
                  formData.email &&
                  !validations.email(formData.email)
                    ? "true"
                    : "false"
                }
                aria-describedby={
                  formData.email && !validations.email(formData.email)
                    ? "email-error"
                    : undefined
                }
                className={`w-full pl-12 pr-10 py-3 bg-surfaceHighlight border rounded-xl text-textMain focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 disabled:opacity-60 ${
                  !isLogin &&
                  formData.email &&
                  !validations.email(formData.email)
                    ? "border-red-300 bg-red-50/10"
                    : "border-border"
                }`}
                placeholder="name@example.com"
              />
              {renderStatusIcon(
                validations.email(formData.email),
                formData.email
              )}
            </div>
            {/* Inline Hint - Only show if user has started typing */}
            {formData.email.length > 0 && (
              <div
                id="email-error"
                className={`text-[10px] mt-1 ml-1 transition-colors duration-200 absolute -bottom-[22px] left-0 w-full truncate ${
                  !validations.email(formData.email)
                    ? "text-red-500 font-medium"
                    : "text-green-600"
                }`}
                role="status"
                aria-live="polite"
              >
                Enter a valid email address
              </div>
            )}
          </div>

          <div
            className={`space-y-1 ${
              formData.email.length > 0 && "pt-3"
            } relative`}
          >
            <label
              htmlFor="password"
              className="text-xs font-medium text-textMuted ml-1"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                aria-label="Password"
                aria-invalid={
                  !isLogin &&
                  formData.password &&
                  !validations.password(formData.password)
                    ? "true"
                    : "false"
                }
                aria-describedby={
                  formData.password && !validations.password(formData.password)
                    ? "password-error"
                    : undefined
                }
                className={`w-full pl-12 pr-10 py-3 bg-surfaceHighlight border rounded-xl text-textMain focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 disabled:opacity-60 ${
                  !isLogin &&
                  formData.password &&
                  !validations.password(formData.password)
                    ? "border-red-300 bg-red-50/10"
                    : "border-border"
                }`}
                placeholder="••••••••"
              />
              {renderStatusIcon(
                validations.password(formData.password),
                formData.password
              )}
            </div>
            {/* Inline Hint - Only show if user has started typing */}
            {formData.password.length > 0 && (
              <div
                id="password-error"
                className={`text-[10px] mt-1 ml-1 leading-tight transition-colors duration-200 absolute -bottom-[22px] left-0 w-full ${
                  !validations.password(formData.password)
                    ? "text-red-500 font-medium"
                    : "text-green-600"
                }`}
                role="status"
                aria-live="polite"
              >
                Min 6 chars & include a number and uppercase letter
              </div>
            )}
          </div>

          <div
            style={{ height: formData.password.length > 0 ? "10px" : "0px" }}
          ></div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-primary/20 mt-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
            aria-label={
              loading
                ? isLogin
                  ? "Signing in"
                  : "Creating account"
                : isLogin
                ? "Sign in"
                : "Sign up"
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isLogin ? "Signing In..." : "Creating Account..."}
              </>
            ) : (
              <>
                {isLogin ? "Sign In" : "Sign Up"}{" "}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* OAuth Buttons */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-textMuted">
                  {isLogin ? "Or sign in with" : "Or sign up with"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthConnect("Google")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-surfaceHighlight hover:bg-surface border border-border text-textMain font-medium py-2.5 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <GoogleIcon />
                <span className="text-sm">Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthConnect("GitHub")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-surfaceHighlight hover:bg-surface border border-border text-textMain font-medium py-2.5 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Github className="w-4 h-4" />
                <span className="text-sm">GitHub</span>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-textMuted">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setFormData({ name: "", email: "", password: "" });
                setIsFormValid(false);
              }}
              className="text-primary hover:underline cursor-pointer font-medium transition-colors"
              disabled={loading}
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
