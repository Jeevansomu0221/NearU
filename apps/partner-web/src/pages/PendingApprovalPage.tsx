import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyStatus } from "@vyaha/api-client";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";

export default function PendingApprovalPage() {
  const [name, setName] = useState("your restaurant");

  useEffect(() => {
    const poll = () =>
      getMyStatus().then((res) => {
        if (res.data?.restaurantName) setName(res.data.restaurantName);
        if (res.data?.status === "APPROVED") window.location.href = "/business/welcome";
        if (res.data?.status === "REJECTED") window.location.href = "/business/rejected";
      });
    poll();
    const timer = setInterval(poll, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="partner-app status-page" data-theme="light">
      <div className="status-orb status-orb--a" aria-hidden />
      <div className="status-orb status-orb--b" aria-hidden />

      <header className="status-topbar">
        <Link className="status-brand" to="https://www.vyaha.com">
          <img src={partnerLogo} alt="Vyaha Partner" />
        </Link>
        <Link className="status-topbar__link" to="/login">
          Back to login
        </Link>
      </header>

      <main className="status-shell">
        <section className="status-hero-card status-hero-card--pending">
          <div className="status-badge status-badge--pending">
            <span className="status-pulse" aria-hidden />
            Under review
          </div>
          <div className="status-icon status-icon--pending" aria-hidden>
            ⏳
          </div>
          <h1>Pending approval</h1>
          <p className="status-lead">
            <strong>{name}</strong> is being reviewed by the Vyaha partner team.
          </p>
          <div className="status-timeline">
            <div className="status-timeline__item is-done">
              <span />
              Application received
            </div>
            <div className="status-timeline__item is-active">
              <span />
              Document verification
            </div>
            <div className="status-timeline__item">
              <span />
              Go live on Vyaha
            </div>
          </div>
          <p className="status-copy">This usually takes 1–2 business days. We’ll refresh this page automatically.</p>
          <div className="status-actions">
            <Link className="btn secondary status-btn" to="/login">
              Back to login
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
