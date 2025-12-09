import React, { useState, useEffect } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

const VerifyCode = ({ email, onSubmit, onResend, onBack }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!code || code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ email, code });
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendCooldown(30);
    try {
      await onResend({ email });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px] pointer-events-none opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[100px] pointer-events-none opacity-60"></div>

      <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-border shadow-2xl z-10 transition-all duration-300">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-linear-to-br from-primary to-secondary rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-textMain mb-2">
            Verify Your Email
          </h1>
          <p className="text-textMuted">
            Enter the 6-digit code sent to {email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 relative">
            <label className="text-xs font-medium text-textMuted ml-1">
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={loading}
              placeholder="000000"
              maxLength="6"
              className="w-full px-4 py-4 text-center text-3xl tracking-[.25em] bg-surfaceHighlight border border-border rounded-xl text-textMain placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono disabled:opacity-60"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-textMuted">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="text-primary hover:underline font-medium text-sm disabled:text-textMuted cursor-pointer transition-colors"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend Code"}
          </button>
        </div>

        <button
          onClick={onBack}
          className="w-full mt-4 py-2.5 text-textMuted hover:text-textMain font-medium transition-colors cursor-pointer"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default VerifyCode;
