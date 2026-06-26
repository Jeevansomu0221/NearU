import { Link, useLocation } from "react-router-dom";

export default function ApplicationSubmittedPage() {
  const state = (useLocation().state || {}) as { ownerName?: string; restaurantName?: string };

  return (
    <div className="partner-app" data-theme="light" style={{ padding: 32, maxWidth: 520, margin: "0 auto" }}>
      <div className="card">
        <h2>Application submitted</h2>
        <p>
          Thanks {state.ownerName || "partner"}! We received the application for {state.restaurantName || "your restaurant"}.
        </p>
        <p>Our team will review your documents and notify you once approved.</p>
        <Link className="btn" to="/pending">
          Check status
        </Link>
      </div>
    </div>
  );
}
