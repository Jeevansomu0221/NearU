import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteAccount, getPartnerProfile, getStoredUser, logout, updatePartnerProfile } from "@vyaha/api-client";
import { usePartnerTheme } from "../contexts/PartnerThemeContext";

type DeliveryMode = "platform" | "self" | "self_free";

type SelfDeliveryPartner = {
  deliveryPartnerId?: string;
  userId?: string;
  phone: string;
  name?: string;
  isActive?: boolean;
};

const normalizeDeliveryMode = (value: unknown): DeliveryMode => {
  if (value === "self_free" || value === "self") return value;
  return "platform";
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isDarkMode, setDarkMode } = usePartnerTheme();
  const isStaff = getStoredUser()?.actorType === "staff";
  const staffName = String(getStoredUser()?.operatorName || getStoredUser()?.name || getStoredUser()?.username || "Staff");
  const [prepTime, setPrepTime] = useState("20");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("platform");
  const [selfDeliveryPartners, setSelfDeliveryPartners] = useState<SelfDeliveryPartner[]>([]);
  const [alerts, setAlerts] = useState({ newOrder: true, payment: true, promo: false });
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPartnerProfile().then((res) => {
      const data = (res.data || {}) as Record<string, unknown>;
      const settings = (data.settings || {}) as Record<string, unknown>;
      const notifications = (data.notifications || {}) as Record<string, unknown>;
      setPrepTime(String(settings.estimatedPrepTime ?? data.estimatedPrepTime ?? "20"));
      setDeliveryMode(normalizeDeliveryMode(settings.deliveryMode ?? data.deliveryMode));
      const riders = Array.isArray(settings.selfDeliveryPartners)
        ? (settings.selfDeliveryPartners as SelfDeliveryPartner[])
            .slice(0, 5)
            .map((partner) => ({
              deliveryPartnerId: partner.deliveryPartnerId,
              userId: partner.userId,
              phone: String(partner.phone || ""),
              name: partner.name || "",
              isActive: partner.isActive !== false
            }))
        : [];
      setSelfDeliveryPartners(riders);
      setAlerts({
        newOrder: notifications.newOrderAlerts !== false && data.newOrderAlerts !== false,
        payment: notifications.paymentAlerts !== false && data.paymentAlerts !== false,
        promo: Boolean(notifications.promotionalNotifications ?? data.promotionalNotifications)
      });
    });
  }, []);

  const updateRiderPhone = (index: number, value: string) => {
    const phone = value.replace(/[^\d+]/g, "").slice(0, 16);
    setSelfDeliveryPartners((prev) =>
      prev.map((partner, partnerIndex) => (partnerIndex === index ? { ...partner, phone } : partner))
    );
  };

  const addRider = () => {
    setSelfDeliveryPartners((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, { phone: "" }];
    });
  };

  const removeRider = (index: number) => {
    setSelfDeliveryPartners((prev) => prev.filter((_, partnerIndex) => partnerIndex !== index));
  };

  const save = async () => {
    const riders = selfDeliveryPartners
      .map((partner) => ({ ...partner, phone: partner.phone.trim() }))
      .filter((partner) => partner.phone.length > 0)
      .slice(0, 5);

    if ((deliveryMode === "self" || deliveryMode === "self_free") && riders.length === 0) {
      setSaveError("Add at least one delivery-app rider phone before enabling self or free self delivery.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      await updatePartnerProfile({
        settings: {
          estimatedPrepTime: Number(prepTime),
          deliveryMode,
          selfDeliveryPartners: riders
        },
        notifications: {
          newOrderAlerts: alerts.newOrder,
          paymentAlerts: alerts.payment,
          promotionalNotifications: alerts.promo
        }
      });
    } catch (error: any) {
      setSaveError(error?.response?.data?.message || error?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
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
      {isStaff ? (
        <div className="card">
          <p>
            Signed in as staff <strong>{staffName}</strong>. You can manage live orders. Shop profile, wallet, and staff
            accounts stay with the restaurant owner.
          </p>
          <label>
            <input type="checkbox" checked={isDarkMode} onChange={(e) => setDarkMode(e.target.checked)} /> Dark mode
          </label>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="field">
              <label>Estimated prep time (minutes)</label>
              <input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
            </div>
            <div className="field">
              <label>Delivery mode</label>
              <select
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(normalizeDeliveryMode(e.target.value))}
              >
                <option value="platform">Vyaha delivery partners</option>
                <option value="self">Self delivery</option>
                <option value="self_free">Free self delivery</option>
              </select>
            </div>

            {(deliveryMode === "self" || deliveryMode === "self_free") && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Self delivery riders</label>
                <p style={{ margin: "4px 0 10px", fontSize: 13, opacity: 0.8 }}>
                  {deliveryMode === "self_free"
                    ? "Customers pay ₹0 delivery fee. Listed riders get 5 minutes to accept; otherwise the order is cancelled (no platform fallback)."
                    : "Listed riders get 5 minutes to accept each order before it opens to platform delivery."}
                </p>
                {selfDeliveryPartners.map((partner, index) => (
                  <div key={`${partner.userId || partner.deliveryPartnerId || "new"}-${index}`} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={partner.phone}
                      onChange={(e) => updateRiderPhone(index, e.target.value)}
                      placeholder="Delivery rider phone"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn secondary" onClick={() => removeRider(index)}>
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn secondary"
                  onClick={addRider}
                  disabled={selfDeliveryPartners.length >= 5}
                >
                  {selfDeliveryPartners.length >= 5 ? "Maximum 5 riders" : "Add delivery rider"}
                </button>
              </div>
            )}

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
            {saveError ? <p style={{ color: "#b42318", marginTop: 8 }}>{saveError}</p> : null}
            <button className="btn" style={{ marginTop: 12 }} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
          <div className="card">
            <Link to="/staff">Shared kitchen login and who signed in</Link>
            <br />
            <a href="https://www.vyaha.com/partner-policy">Partner policy</a>
            <br />
            <a href="https://www.vyaha.com/terms">Terms</a>
            <br />
            <a href="https://www.vyaha.com/delete-account">Delete account info</a>
          </div>
        </>
      )}
      <button className="btn secondary" onClick={onLogout}>
        Log out
      </button>
      {isStaff ? null : (
        <button className="btn secondary" style={{ marginLeft: 8 }} onClick={onDelete}>
          Delete account
        </button>
      )}
    </div>
  );
}
