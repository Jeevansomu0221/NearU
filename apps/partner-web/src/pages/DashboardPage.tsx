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
    await updateShopStatus(!shopOpen);
    setShopOpen((v) => !v);
  };

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h2>{String(partner?.restaurantName || "Your restaurant")}</h2>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>Shop status</strong>
          <p style={{ color: "var(--muted)", margin: 0 }}>{shopOpen ? "Accepting orders" : "Closed"}</p>
        </div>
        <button className="btn" onClick={toggleShop}>
          {shopOpen ? "Close shop" : "Open shop"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Today orders</div>
          <strong style={{ fontSize: "1.4rem" }}>{stats.todayOrders}</strong>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Pending action</div>
          <strong style={{ fontSize: "1.4rem" }}>{stats.pendingOrders}</strong>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Today earnings</div>
          <strong style={{ fontSize: "1.4rem" }}>₹{wallet?.todayEarnings ?? stats.todayEarnings}</strong>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Wallet balance</div>
          <strong style={{ fontSize: "1.4rem" }}>₹{wallet?.walletBalance ?? 0}</strong>
        </div>
      </div>
      {stats.pendingOrders > 0 ? (
        <div className="alert-banner">
          {stats.pendingOrders} order(s) need acceptance. <Link to="/orders">View orders</Link>
        </div>
      ) : null}
    </div>
  );
}
