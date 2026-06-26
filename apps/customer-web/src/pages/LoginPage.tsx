import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendOtpWithFallback } from "@vyaha/api-client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const session = await sendOtpWithFallback(cleaned, "customer");
      navigate("/otp", { state: { phone: cleaned, otpSession: session } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 420 }}>
        <p>
          <Link to="/">← Back to vyaha.com</Link>
        </p>
        <div className="card">
          <h2>Sign in to order</h2>
          <p style={{ color: "var(--muted)" }}>Use your mobile number. We will send a one-time password.</p>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Mobile number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number"
                inputMode="numeric"
              />
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Sending OTP..." : "Continue"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
