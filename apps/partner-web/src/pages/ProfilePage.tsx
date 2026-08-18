import { useEffect, useState } from "react";
import { createSupportTicket, getPartnerProfile, resolveExactGoogleShopPin, updatePartnerProfile } from "@vyaha/api-client";
import AddressPinConfirmModal from "../components/AddressPinConfirmModal";

type AddressForm = {
  roadStreet: string;
  colony: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  nearbyPlaces: string;
};

const emptyAddress = (): AddressForm => ({
  roadStreet: "",
  colony: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  nearbyPlaces: ""
});

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [address, setAddress] = useState<AddressForm>(emptyAddress());
  const [supportMsg, setSupportMsg] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pinConfirmVisible, setPinConfirmVisible] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadProfile = async () => {
    const res = await getPartnerProfile();
    const data = (res.data || {}) as Record<string, unknown>;
    const savedAddress = (data.address || {}) as Record<string, unknown>;
    setProfile({
      restaurantName: String(data.restaurantName || ""),
      ownerName: String(data.ownerName || ""),
      restaurantPhone: String(data.restaurantPhone || data.phone || ""),
      email: String(data.email || "")
    });
    setAddress({
      roadStreet: String(savedAddress.roadStreet || ""),
      colony: String(savedAddress.colony || ""),
      area: String(savedAddress.area || ""),
      city: String(savedAddress.city || ""),
      state: String(savedAddress.state || ""),
      pincode: String(savedAddress.pincode || ""),
      nearbyPlaces: Array.isArray(savedAddress.nearbyPlaces)
        ? savedAddress.nearbyPlaces.join(", ")
        : String(savedAddress.nearbyPlaces || "")
    });
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const save = async () => {
    await updatePartnerProfile(profile);
    setMessage("Profile updated.");
  };

  const saveAddress = async () => {
    if (!address.roadStreet || !address.colony || !address.area || !address.city || !address.state) {
      setMessage("Fill all address fields before saving.");
      return;
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      setMessage("Pincode must be exactly 6 digits.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const pin = await resolveExactGoogleShopPin({
        shopName: profile.restaurantName.trim(),
        restaurantName: profile.restaurantName.trim(),
        roadStreet: address.roadStreet.trim(),
        colony: address.colony.trim(),
        area: address.area.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode.trim(),
        nearbyPlaces: address.nearbyPlaces
      });
      setPendingPin(pin);
      setPinConfirmVisible(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not locate this shop address.");
    } finally {
      setSaving(false);
    }
  };

  const confirmAddressPin = async (pin: { latitude: number; longitude: number }) => {
    setSaving(true);
    try {
      await updatePartnerProfile({
        address: {
          ...address,
          nearbyPlaces: address.nearbyPlaces
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        },
        location: pin
      });
      setPinConfirmVisible(false);
      setPendingPin(null);
      setMessage("Shop address and map pin saved.");
      await loadProfile();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save address.");
    } finally {
      setSaving(false);
    }
  };

  const sendSupport = async () => {
    await createSupportTicket({
      subject: "Partner support",
      message: supportMsg,
      category: "OTHER"
    });
    setSupportMsg("");
    setMessage("Support ticket created.");
  };

  return (
    <div>
      <h2>Profile</h2>
      <div className="card">
        <div className="field">
          <label>Restaurant name</label>
          <input
            value={profile.restaurantName}
            onChange={(e) => setProfile({ ...profile, restaurantName: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Owner name</label>
          <input value={profile.ownerName} onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })} />
        </div>
        <div className="field">
          <label>Restaurant phone</label>
          <input
            value={profile.restaurantPhone}
            onChange={(e) => setProfile({ ...profile, restaurantPhone: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
        </div>
        <button className="btn" onClick={save}>
          Save profile
        </button>
      </div>

      <div className="card">
        <h3>Shop address</h3>
        <p>We locate the typed address on the map, then you confirm the exact shop pin.</p>
        {(
          [
            ["roadStreet", "Road / street"],
            ["colony", "Colony / society"],
            ["area", "Area / locality"],
            ["city", "City"],
            ["state", "State"],
            ["pincode", "Pincode"],
            ["nearbyPlaces", "Nearby places"]
          ] as Array<[keyof AddressForm, string]>
        ).map(([key, label]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <input
              value={address[key]}
              onChange={(e) =>
                setAddress({
                  ...address,
                  [key]: key === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value
                })
              }
            />
          </div>
        ))}
        <button className="btn" onClick={saveAddress} disabled={saving}>
          {saving ? "Locating…" : "Save address & confirm pin"}
        </button>
      </div>

      <div className="card">
        <h3>Contact support</h3>
        <div className="field">
          <label>Message</label>
          <textarea value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} rows={3} />
        </div>
        <button className="btn secondary" onClick={sendSupport}>
          Send ticket
        </button>
      </div>
      {message ? <p>{message}</p> : null}

      <AddressPinConfirmModal
        visible={pinConfirmVisible && Boolean(pendingPin)}
        addressLines={[
          address.roadStreet,
          address.colony,
          address.area,
          [address.city, address.state, address.pincode].filter(Boolean).join(", ")
        ].filter(Boolean)}
        latitude={pendingPin?.latitude || 0}
        longitude={pendingPin?.longitude || 0}
        confirming={saving}
        onConfirm={confirmAddressPin}
        onEdit={() => {
          setPinConfirmVisible(false);
          setPendingPin(null);
        }}
      />
    </div>
  );
}
