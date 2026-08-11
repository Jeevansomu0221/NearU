import { Link } from "react-router-dom";
import partnerLogo from "../assets/vyaha-partner-text-logo.png";

export default function WelcomeApprovedPage() {
  return (
    <div className="partner-app status-page" data-theme="light">
      <div className="status-orb status-orb--a" aria-hidden />
      <div className="status-orb status-orb--b" aria-hidden />

      <header className="status-topbar">
        <Link className="status-brand" to="https://www.vyaha.com">
          <img src={partnerLogo} alt="Vyaha Partner" />
        </Link>
        <Link className="status-topbar__link" to="/">
          Skip to dashboard
        </Link>
      </header>

      <main className="status-shell">
        <section className="status-hero-card status-hero-card--success">
          <div className="status-badge status-badge--success">Approved</div>
          <div className="status-icon status-icon--success" aria-hidden>
            ✓
          </div>
          <h1>Welcome to Vyaha</h1>
          <p className="status-lead">
            Your restaurant is approved. Set up your menu so customers can start ordering from you.
          </p>

          <div className="status-steps">
            <div className="status-step">
              <span>1</span>
              <div>
                <strong>Add menu items</strong>
                <small>Photos, prices, and categories</small>
              </div>
            </div>
            <div className="status-step">
              <span>2</span>
              <div>
                <strong>Open your shop</strong>
                <small>Start accepting live orders</small>
              </div>
            </div>
            <div className="status-step">
              <span>3</span>
              <div>
                <strong>Track earnings</strong>
                <small>Wallet and payouts in one place</small>
              </div>
            </div>
          </div>

          <div className="status-actions">
            <Link className="btn status-btn" to="/menu">
              Set up menu
            </Link>
            <Link className="btn secondary status-btn" to="/">
              Go to dashboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
