import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAccount, getPartnerProfile, logout, updatePartnerProfile } from "@vyaha/api-client";
import { usePartnerTheme } from "../contexts/PartnerThemeContext";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isDarkMode, setDarkMode } = usePartnerTheme();
  const [prepTime, setPrepTime] = useState("20");
  const [deliveryMode, setDeliveryMode] = useState<"platform" | "self">("platform");
  const [alerts, setAlerts] = useState({ newOrder: true, payment: true, promo: false });

  useEffect(() => {
    getPartnerProfile().then((res) => {
      const data = (res.data || {}) as Record<string, unknown>;
      setPrepTime(String(data.estimatedPrepTime || "20"));
      setDeliveryMode((data.deliveryMode as "platform" | "self") || "platform");
      setAlerts({
        newOrder: data.newOrderAlerts !== false,
        payment: data.paymentAlerts !== false,
        promo: Boolean(data.promotionalNotifications)
      });
    });
  }, []);

  const save = async () => {
    await updatePartnerProfile({
      estimatedPrepTime: Number(prepTime),
      deliveryMode,
      newOrderAlerts: alerts.newOrder,
      paymentAlerts: alerts.payment,
      promotionalNotifications: alerts.promo
    });
  };

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const onDelete = async () => {
    if (!confirm("Delete partner account?")) return;
    await deleteAccount();
    navigate("/login", { replace: true });
  };

  return (
    <div>
      <h2>Settings</h2>
      <div className="card">
        <div className="field">
          <label>Estimated prep time (minutes)</label>
          <input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
        </div>
        <div className="field">
          <label>Delivery mode</label>
          <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value as "platform" | "self")}>
            <option value="platform">Vyaha delivery partners</option>
            <option value="self">Self delivery</option>
          </select>
        </div>
        <label>
          <input type="checkbox" checked={isDarkMode} onChange={(e) => setDarkMode(e.target.checked)} /> Dark mode
        </label>
        <div style={{ marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={alerts.newOrder}
              onChange={(e) => setAlerts({ ...alerts, newOrder: e.target.checked })}
            />{" "}
            New order alerts
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={alerts.payment}
              onChange={(e) => setAlerts({ ...alerts, payment: e.target.checked })}
            />{" "}
            Payment alerts
          </label>
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={save}>
          Save settings
        </button>
      </div>
      <div className="card">
        <a href="https://www.vyaha.com/partner-policy">Partner policy</a>
        <br />
        <a href="https://www.vyaha.com/terms">Terms</a>
        <br />
        <a href="https://www.vyaha.com/delete-account">Delete account info</a>
      </div>
      <button className="btn secondary" onClick={onLogout}>
        Log out
      </button>
      <button className="btn secondary" style={{ marginLeft: 8 }} onClick={onDelete}>
        Delete account
      </button>
    </div>
  );
}
