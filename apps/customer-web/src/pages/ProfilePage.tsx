import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addAddress,
  deleteMyAccount,
  formatAddressText,
  getUserProfile,
  isCustomerProfileComplete,
  logout,
  updateUserAddress,
  updateUserProfile,
  type SavedAddress,
  type UserProfile
} from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";
import { useBoot } from "../components/AuthGate";
import { pickLocationOnMap } from "../hooks/useGeolocation";

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const forceComplete = Boolean((location.state as { forceComplete?: boolean } | null)?.forceComplete);
  const { setAuthed, setProfileComplete } = useBoot();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<Partial<SavedAddress>>({ country: "India" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUserProfile().then((res) => {
      if (!res.data) return;
      setProfile(res.data);
      setName(res.data.name || "");
      setEmail(res.data.email || "");
      const addr = res.data.address || res.data.addresses?.find((a) => a.isDefault) || res.data.addresses?.[0];
      if (addr) setAddress(addr);
    });
  }, []);

  const saveProfile = async () => {
    setError("");
    setLoading(true);
    try {
      await updateUserProfile({ name, email });
      const coords = await pickLocationOnMap();
      const payload = {
        ...address,
        latitude: coords?.latitude ?? address.latitude,
        longitude: coords?.longitude ?? address.longitude,
        isDefault: true
      };
      if (address._id) {
        await updateUserAddress({ ...payload, addressId: address._id });
      } else {
        await addAddress(payload as SavedAddress);
      }
      const refreshed = await getUserProfile();
      if (refreshed.data) {
        setProfile(refreshed.data);
        const complete = isCustomerProfileComplete(refreshed.data);
        setProfileComplete(complete);
        if (complete) {
          setMessage("Profile saved.");
          navigate(forceComplete ? "/" : "/profile", { replace: forceComplete });
        } else {
          setError("Please fill all address fields and allow location for delivery pin.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await logout();
    setAuthed(false);
    setProfileComplete(false);
    navigate("/login", { replace: true });
  };

  const onDelete = async () => {
    if (!confirm("Delete your Vyaha account permanently?")) return;
    await deleteMyAccount();
    setAuthed(false);
    navigate("/login", { replace: true });
  };

  return (
    <CustomerShell title={forceComplete ? "Complete registration" : "Profile"} showNav={!forceComplete}>
      {forceComplete ? (
        <p style={{ color: "var(--muted)" }}>Add your name and delivery address before ordering.</p>
      ) : null}
      <div className="card">
        <div className="field">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email (optional)</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>House / door no.</label>
          <input
            value={address.houseFlatDoorNo || ""}
            onChange={(e) => setAddress({ ...address, houseFlatDoorNo: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Street / road</label>
          <input
            value={address.streetRoadName || address.street || ""}
            onChange={(e) => setAddress({ ...address, streetRoadName: e.target.value, street: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Area / locality</label>
          <input
            value={address.areaLocality || address.area || ""}
            onChange={(e) => setAddress({ ...address, areaLocality: e.target.value, area: e.target.value })}
          />
        </div>
        <div className="field">
          <label>City</label>
          <input
            value={address.cityTownVillage || address.city || ""}
            onChange={(e) => setAddress({ ...address, cityTownVillage: e.target.value, city: e.target.value })}
          />
        </div>
        <div className="field">
          <label>State</label>
          <input value={address.state || ""} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
        </div>
        <div className="field">
          <label>Pincode</label>
          <input value={address.pincode || ""} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          Delivery pin: {address.latitude && address.longitude ? `${address.latitude.toFixed(5)}, ${address.longitude.toFixed(5)}` : "Will use browser location on save"}
        </p>
        {profile ? <p>Phone: {profile.phone}</p> : null}
        {profile?.address || profile?.addresses?.[0] ? (
          <p>Current: {formatAddressText(profile.address || profile.addresses?.[0])}</p>
        ) : null}
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn" style={{ width: "100%" }} disabled={loading} onClick={saveProfile}>
          {loading ? "Saving..." : "Save profile"}
        </button>
      </div>
      {!forceComplete ? (
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <button className="btn secondary" onClick={onLogout}>
            Log out
          </button>
          <button className="btn ghost" onClick={onDelete}>
            Delete account
          </button>
          <a href="https://www.vyaha.com/privacy">Privacy policy</a>
          <a href="https://www.vyaha.com/terms">Terms</a>
        </div>
      ) : null}
    </CustomerShell>
  );
}
