import React, { useState, useEffect } from "react";
import { Mail, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

const VerifyEmail = ({ email, onSubmit, onResend, onBack }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      toast.error("Verification code expired!");
      setCode("");
      return;
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ email, code });
      toast.success("Email verified successfully!");
    } catch (err) {
      if (err.message.includes("expired")) {
        toast.error("Code expired. Please request a new one.");
      } else {
        toast.error(err.message || "Verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await onResend({ email });
      toast.success("New code sent to your email!");
      setTimeLeft(1800); // Reset timer
      setCode("");
    } catch (err) {
      toast.error(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            No email found. Please register again.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-linear-to-br from-indigo-50 to-blue-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600">
            We sent a 6-digit code to <br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-200 rounded-lg focus:border-indigo-600 focus:outline-none transition-colors bg-white disabled:opacity-60"
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Code expires in</p>
            <p
              className={`text-2xl font-bold ${
                timeLeft < 300 ? "text-red-600" : "text-indigo-600"
              }`}
            >
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-h animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResendCode}
            disabled={resending || timeLeft > 1750}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-indigo-600 font-semibold border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Resend Code
              </>
            )}
          </button>
        </div>

        <button
          onClick={onBack}
          className="w-full mt-4 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors point"
        >
          Back to Registration
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
