import { useEffect, useState } from "react";
import { createSupportTicket, getPartnerProfile, updatePartnerProfile } from "@vyaha/api-client";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [supportMsg, setSupportMsg] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPartnerProfile().then((res) => {
      const data = (res.data || {}) as Record<string, string>;
      setProfile({
        restaurantName: data.restaurantName || "",
        ownerName: data.ownerName || "",
        restaurantPhone: data.restaurantPhone || data.phone || "",
        email: data.email || ""
      });
    });
  }, []);

  const save = async () => {
    await updatePartnerProfile(profile);
    setMessage("Profile updated.");
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
    </div>
  );
}
