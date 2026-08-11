import { Link, useLocation } from "react-router-dom";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";

export default function ApplicationSubmittedPage() {
  const state = (useLocation().state || {}) as { ownerName?: string; restaurantName?: string };

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
        <section className="status-hero-card status-hero-card--info">
          <div className="status-badge status-badge--info">Submitted</div>
          <div className="status-icon status-icon--info" aria-hidden>
            ✉
          </div>
          <h1>Application submitted</h1>
          <p className="status-lead">
            Thanks {state.ownerName || "partner"}! We received the application for{" "}
            <strong>{state.restaurantName || "your restaurant"}</strong>.
          </p>
          <p className="status-copy">
            Our team will review your documents and notify you once approved. This usually takes 1–2
            business days.
          </p>
          <div className="status-actions">
            <Link className="btn status-btn" to="/pending">
              Check status
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
