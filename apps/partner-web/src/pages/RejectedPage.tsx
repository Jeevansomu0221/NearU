import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyStatus } from "@vyaha/api-client";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";

export default function RejectedPage() {
  const [message, setMessage] = useState("Please contact support@vyaha.com for details.");

  useEffect(() => {
    getMyStatus().then((res) => {
      if (res.message) setMessage(res.message);
    });
  }, []);

  return (
    <div className="partner-app status-page" data-theme="light">
      <div className="status-orb status-orb--a" aria-hidden />
      <div className="status-orb status-orb--b" aria-hidden />

      <header className="status-topbar">
        <Link className="status-brand" to="https://www.vyaha.com">
          <img src={partnerLogo} alt="Vyaha Partner" />
        </Link>
      </header>

      <main className="status-shell">
        <section className="status-hero-card status-hero-card--danger">
          <div className="status-badge status-badge--danger">Not approved</div>
          <div className="status-icon status-icon--danger" aria-hidden>
            !
          </div>
          <h1>Application not approved</h1>
          <p className="status-lead">{message}</p>
          <p className="status-copy">
            You can update your documents and resubmit, or write to{" "}
            <a href="mailto:support@vyaha.com">support@vyaha.com</a> for help.
          </p>
          <div className="status-actions">
            <Link className="btn status-btn" to="/onboarding">
              Update application
            </Link>
            <Link className="btn secondary status-btn" to="/login">
              Back to login
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
