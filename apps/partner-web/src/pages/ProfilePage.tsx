import { useEffect, useState } from "react";
import { createSupportTicket, getPartnerProfile, resolveShopAddressPin, updatePartnerProfile } from "@vyaha/api-client";
import AddressPinConfirmModal from "../components/AddressPinConfirmModal";

type AddressForm = {
  shopHouseName: string;
  floor: string;
  roadStreet: string;
  colony: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  nearbyPlaces: string;
};

const emptyAddress = (): AddressForm => ({
  shopHouseName: "",
  floor: "",
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
      shopHouseName: String(savedAddress.shopHouseName || ""),
      floor: String(savedAddress.floor || ""),
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
    if (!address.shopHouseName || !address.floor || !address.colony || !address.area || !address.city || !address.state) {
      setMessage("Fill shop/house name, floor, area, city, and state before saving.");
      return;
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      setMessage("Pincode must be exactly 6 digits.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const result = await resolveShopAddressPin({
        shopName: profile.restaurantName.trim(),
        restaurantName: profile.restaurantName.trim(),
        shopHouseName: address.shopHouseName.trim(),
        buildingApartmentName: address.shopHouseName.trim(),
        streetRoadName: address.roadStreet.trim(),
        area: address.area.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode.trim(),
        landmark: [address.colony, address.nearbyPlaces].filter(Boolean).join(", ")
      });
      if (!result.success || !result.data) {
        setMessage(result.message || "Could not locate this shop address.");
        return;
      }
      setPendingPin(result.data);
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
        <p>We search Google Maps with your shop/house name, then you confirm the exact pin on the building.</p>
        {(
          [
            ["shopHouseName", "Shop / house name"],
            ["floor", "Floor / location"],
            ["roadStreet", "Road / street (optional)"],
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
          [address.shopHouseName, address.floor].filter(Boolean).join(", "),
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
