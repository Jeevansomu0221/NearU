import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { persistAuthSession, verifyOtpSession, type OtpSessionInfo } from "@vyaha/api-client";
import { useBoot } from "../components/AuthGate";

export default function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthed, setProfileComplete } = useBoot();
  const state = location.state as { phone?: string; otpSession?: OtpSessionInfo } | null;
  const phone = state?.phone || "";
  const otpSession = state?.otpSession;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!phone || !otpSession) {
    return (
      <div className="empty-state">
        <p>Start from the login screen.</p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await verifyOtpSession(phone, otp, "customer", otpSession);
      const token = response.data!.token;
      const refreshToken = response.data!.refreshToken;
      const user = response.data!.user;
      await persistAuthSession(token, refreshToken, user as Record<string, unknown>, phone);
      setAuthed(true);
      setProfileComplete(false);
      navigate("/profile", { replace: true, state: { forceComplete: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 420 }}>
        <div className="card">
          <h2>Verify OTP</h2>
          <p style={{ color: "var(--muted)" }}>
            Sent to +91 {phone}. {otpSession.deliveryHint || ""}
          </p>
          <form onSubmit={onVerify}>
            <div className="field">
              <label>OTP</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} />
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Verifying..." : "Verify & continue"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
