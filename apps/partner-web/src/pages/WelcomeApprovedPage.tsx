import { Link } from "react-router-dom";

export default function WelcomeApprovedPage() {
  return (
    <div className="partner-app" data-theme="light" style={{ padding: 32, maxWidth: 520, margin: "0 auto" }}>
      <div className="card">
        <h2>Welcome to Vyaha</h2>
        <p>Your restaurant is approved. Add menu items to start receiving orders.</p>
        <Link className="btn" to="/menu">
          Set up menu
        </Link>
        <Link className="btn secondary" to="/" style={{ marginLeft: 8 }}>
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
