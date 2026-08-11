import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyStatus,
  getPartnerStats,
  getPartnerWallet,
  updateShopStatus,
  type PartnerWallet
} from "@vyaha/api-client";
import { usePartnerOrderWatcher } from "../hooks/usePartnerOrderWatcher";

export default function DashboardPage() {
  const [shopOpen, setShopOpen] = useState(true);
  const [partner, setPartner] = useState<Record<string, unknown> | null>(null);
  const [wallet, setWallet] = useState<PartnerWallet | null>(null);
  const [stats, setStats] = useState({ todayOrders: 0, pendingOrders: 0, todayEarnings: 0 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  usePartnerOrderWatcher(true);

  const load = async () => {
    setLoading(true);
    try {
      const statusRes = await getMyStatus();
      if (statusRes.data) {
        setPartner(statusRes.data as unknown as Record<string, unknown>);
        setShopOpen((statusRes.data as { isOpen?: boolean }).isOpen !== false);
      }
      const [statsRes, walletRes] = await Promise.all([getPartnerStats(), getPartnerWallet()]);
      if (statsRes.data) setStats(statsRes.data as typeof stats);
      if (walletRes.data) setWallet(walletRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const toggleShop = async () => {
    setToggling(true);
    try {
      await updateShopStatus(!shopOpen);
      setShopOpen((v) => !v);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-loading__spinner" aria-hidden />
        <p>Loading your restaurant dashboard…</p>
      </div>
    );
  }

  const restaurantName = String(partner?.restaurantName || "Your restaurant");
  const todayEarnings = wallet?.todayEarnings ?? stats.todayEarnings;
  const walletBalance = wallet?.walletBalance ?? 0;

  return (
    <div className="dash">
      <header className="dash-hero">
        <div>
          <p className="dash-eyebrow">Partner dashboard</p>
          <h1>{restaurantName}</h1>
          <p className="dash-subtitle">Monitor orders, earnings, and shop availability in real time.</p>
        </div>
        <div className={`dash-live ${shopOpen ? "is-open" : "is-closed"}`}>
          <span className="dash-live__dot" aria-hidden />
          {shopOpen ? "Live · accepting orders" : "Closed · not accepting orders"}
        </div>
      </header>

      <section className={`dash-status card ${shopOpen ? "is-open" : "is-closed"}`}>
        <div className="dash-status__copy">
          <strong>Shop status</strong>
          <p>{shopOpen ? "Customers can place orders right now." : "Your shop is closed. Open it when you're ready."}</p>
        </div>
        <button className={`btn ${shopOpen ? "" : "dash-open-btn"}`} onClick={toggleShop} disabled={toggling}>
          {toggling ? "Updating…" : shopOpen ? "Close shop" : "Open shop"}
        </button>
      </section>

      <section className="dash-stats">
        <article className="dash-stat card">
          <div className="dash-stat__icon" aria-hidden>
            ☰
          </div>
          <div>
            <span>Today orders</span>
            <strong>{stats.todayOrders}</strong>
          </div>
        </article>
        <article className="dash-stat card">
          <div className="dash-stat__icon dash-stat__icon--warn" aria-hidden>
            !
          </div>
          <div>
            <span>Pending action</span>
            <strong>{stats.pendingOrders}</strong>
          </div>
        </article>
        <article className="dash-stat card">
          <div className="dash-stat__icon dash-stat__icon--money" aria-hidden>
            ₹
          </div>
          <div>
            <span>Today earnings</span>
            <strong>₹{todayEarnings}</strong>
          </div>
        </article>
        <article className="dash-stat card">
          <div className="dash-stat__icon dash-stat__icon--wallet" aria-hidden>
            ◈
          </div>
          <div>
            <span>Wallet balance</span>
            <strong>₹{walletBalance}</strong>
          </div>
        </article>
      </section>

      {stats.pendingOrders > 0 ? (
        <div className="alert-banner dash-alert">
          <div>
            <strong>{stats.pendingOrders} order(s) need acceptance</strong>
            <p>New orders are waiting. Accept them quickly to keep delivery on time.</p>
          </div>
          <Link className="btn" to="/orders">
            View orders
          </Link>
        </div>
      ) : null}

      <section className="dash-actions">
        <h2>Quick actions</h2>
        <div className="dash-actions__grid">
          <Link className="dash-action card" to="/orders">
            <strong>Manage orders</strong>
            <span>Accept, prepare, and track live orders</span>
          </Link>
          <Link className="dash-action card" to="/menu">
            <strong>Edit menu</strong>
            <span>Update items, prices, and availability</span>
          </Link>
          <Link className="dash-action card" to="/wallet">
            <strong>Check wallet</strong>
            <span>See payouts and settlement status</span>
          </Link>
          <Link className="dash-action card" to="/profile">
            <strong>Shop profile</strong>
            <span>Hours, photos, and restaurant details</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
