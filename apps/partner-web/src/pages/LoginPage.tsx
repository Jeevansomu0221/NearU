import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  checkApiHealth,
  persistAuthSession,
  sendOtpWithFallback,
  verifyOtpSession,
  type OtpSessionInfo
} from "@vyaha/api-client";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";
import { restorePartnerSession, routeForPartnerStatus } from "../auth/session";

type AuthMode = "signin" | "register";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode: AuthMode = searchParams.get("mode") === "register" ? "register" : "signin";
  const [booting, setBooting] = useState(true);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState<OtpSessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiReady, setApiReady] = useState<"checking" | "ok" | "down">("checking");

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setStep("phone");
    setOtp("");
    setSession(null);
    setError("");
    setSearchParams(next === "register" ? { mode: "register" } : {}, { replace: true });
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const restored = await restorePartnerSession();
      if (!active) return;
      if (restored.kind === "authenticated") {
        navigate(routeForPartnerStatus(restored.partner), { replace: true });
        return;
      }
      setBooting(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (booting) return;
    let active = true;
    void checkApiHealth().then((ok) => {
      if (active) setApiReady(ok ? "ok" : "down");
    });
    return () => {
      active = false;
    };
  }, [booting]);

  const routeAfterLogin = async () => {
    const restored = await restorePartnerSession();
    if (restored.kind === "authenticated") {
      // Register intent always starts onboarding when no partner profile exists yet.
      if (mode === "register" && !restored.partner) {
        navigate("/onboarding", { replace: true });
        return;
      }
      navigate(routeForPartnerStatus(restored.partner), { replace: true });
      return;
    }
    navigate("/onboarding", { replace: true });
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
      setError(getErrorMessage(err, "Failed to send OTP"));
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
      setError(getErrorMessage(err, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <div className="partner-app auth-page" data-theme="light">
        <div className="dash-loading" style={{ minHeight: "100vh" }}>
          <div className="dash-loading__spinner" aria-hidden />
          <p>Checking your saved session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="partner-app auth-page" data-theme="light">
      <header className="auth-header">
        <Link className="auth-brand" to="https://www.vyaha.com" aria-label="Back to Vyaha">
          <img src={partnerLogo} alt="Vyaha Partner" className="auth-brand__logo" />
        </Link>
        <Link className="auth-back" to="https://www.vyaha.com">
          Back to vyaha.com
        </Link>
      </header>

      <main className="auth-shell">
        <section className="auth-story">
          <span className="auth-eyebrow">Restaurant Partner Portal</span>
          <h1>
            {mode === "register"
              ? "Register your restaurant and start onboarding in minutes."
              : "Grow your restaurant with a platform built for local businesses."}
          </h1>
          <p>
            {mode === "register"
              ? "Create your partner account with OTP, then complete KYC, menu, and shop details."
              : "Manage onboarding, orders, menus and payouts from one simple partner dashboard."}
          </p>
          <div className="auth-benefits">
            <div>
              <span>✓</span>
              <p>
                <strong>0 onboarding fee</strong>
                <small>Join Vyaha as a partner without paying any setup fee.</small>
              </p>
            </div>
            <div>
              <span>✓</span>
              <p>
                <strong>No commission for first 45 days</strong>
                <small>Start earning with zero commission during your launch period.</small>
              </p>
            </div>
            <div>
              <span>✓</span>
              <p>
                <strong>Less commission</strong>
                <small>Keep more from every order with lower commission than typical aggregators.</small>
              </p>
            </div>
          </div>
          <p className="auth-trust">Secure verification powered by Vyaha and Eko</p>
        </section>

        <section className="auth-panel">
          <div className="auth-mode-tabs" role="tablist" aria-label="Partner account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`auth-mode-tab ${mode === "signin" ? "is-active" : ""}`}
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-mode-tab ${mode === "register" ? "is-active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>

          <div className="auth-panel__top">
            <span className="auth-step-badge">
              {step === "phone" ? (mode === "register" ? "New partner" : "Welcome") : "Verify your number"}
            </span>
            <h2>
              {step === "phone"
                ? mode === "register"
                  ? "Register your restaurant"
                  : "Sign in to continue"
                : "Enter your OTP"}
            </h2>
            <p>
              {step === "phone"
                ? mode === "register"
                  ? "Enter your mobile number to create a partner account and start onboarding."
                  : "Use the mobile number linked to your restaurant. We’ll keep you signed in on this device."
                : `We sent a 6-digit code to +91 ${phone}.`}
            </p>
          </div>
          {apiReady === "checking" ? <p className="auth-hint">Checking API connection…</p> : null}
          {apiReady === "down" ? (
            <p className="auth-error" role="alert">
              Cannot reach the API server. For local testing, run `cd backend && npm run dev`. On production, check that
              api.vyaha.com is up.
            </p>
          ) : null}
          {step === "phone" ? (
            <form className="auth-form" onSubmit={sendOtp}>
              <div className="field">
                <label htmlFor="partner-phone">Mobile number</label>
                <div className="auth-phone-field">
                  <span>+91</span>
                  <input
                    id="partner-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="Enter 10-digit number"
                    autoFocus
                  />
                </div>
              </div>
              {error ? (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="btn auth-submit" disabled={loading || apiReady === "down"}>
                {loading ? "Sending code…" : mode === "register" ? "Register with OTP" : "Continue with OTP"}
              </button>
              <p className="auth-fineprint">
                {mode === "register"
                  ? "Already partnered with Vyaha? Switch to Sign in."
                  : "New restaurant? Switch to Register to start onboarding."}
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={verify}>
              <div className="field">
                <label htmlFor="partner-otp">One-time password</label>
                <input
                  id="partner-otp"
                  className="auth-otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  autoFocus
                />
              </div>
              {session?.deliveryHint ? <p className="auth-hint">{session.deliveryHint}</p> : null}
              {error ? (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="btn auth-submit" disabled={loading || otp.length < 6}>
                {loading
                  ? "Verifying…"
                  : mode === "register"
                    ? "Verify & start onboarding"
                    : "Verify & continue"}
              </button>
              <button
                type="button"
                className="auth-change-number"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
              >
                Change mobile number
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="auth-footer">© 2026 Vyaha Technologies · Partner support: support@vyaha.com</footer>
    </div>
  );
}
