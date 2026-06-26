import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAccessToken,
  getMyStatus,
  getStoredPhone,
  persistAuthSession,
  sendOtpWithFallback,
  verifyOtpSession,
  type OtpSessionInfo
} from "@vyaha/api-client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState<OtpSessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const routeAfterLogin = async () => {
    const res = await getMyStatus();
    if (!res.success || !res.data) {
      navigate("/onboarding", { replace: true });
      return;
    }
    switch (res.data.status) {
      case "PENDING":
        navigate("/pending", { replace: true });
        break;
      case "APPROVED":
        navigate(res.data.hasCompletedSetup === false ? "/welcome" : "/", { replace: true });
        break;
      case "REJECTED":
        navigate("/rejected", { replace: true });
        break;
      default:
        navigate("/onboarding", { replace: true });
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Enter a valid 10-digit number.");
      return;
    }
    setLoading(true);
    try {
      const s = await sendOtpWithFallback(cleaned, "partner");
      setSession(s);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const cleaned = phone.replace(/\D/g, "");
      const response = await verifyOtpSession(cleaned, otp, "partner", session);
      await persistAuthSession(
        response.data!.token,
        response.data!.refreshToken,
        response.data!.user as Record<string, unknown>,
        cleaned
      );
      await routeAfterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="partner-app" data-theme="light" style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <p>
        <Link to="https://www.vyaha.com">← vyaha.com</Link>
      </p>
      <div className="card">
        <h2>Restaurant login</h2>
        {step === "phone" ? (
          <form onSubmit={sendOtp}>
            <div className="field">
              <label>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
            <button className="btn" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <p>OTP sent to +91 {phone}</p>
            <div className="field">
              <label>OTP</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
            <button className="btn" disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function BootRedirect({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      const phone = getStoredPhone();
      if (!token || !phone) {
        setReady(true);
        return;
      }
      try {
        const res = await getMyStatus();
        if (!res.success || !res.data) {
          navigate("/onboarding", { replace: true });
        } else if (res.data.status === "PENDING") {
          navigate("/pending", { replace: true });
        } else if (res.data.status === "REJECTED") {
          navigate("/rejected", { replace: true });
        }
      } catch {
        // stay on requested route
      } finally {
        setReady(true);
      }
    };
    run();
  }, [navigate]);

  if (!ready) return <p style={{ padding: 24 }}>Loading...</p>;
  return children;
}
