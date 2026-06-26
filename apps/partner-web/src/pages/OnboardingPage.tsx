import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOnboardingDraft,
  getStoredUser,
  saveOnboardingDraft,
  submitOnboarding,
  uploadImage
} from "@vyaha/api-client";
import { pickLocationOnMap } from "../hooks/useGeolocation";

const CATEGORIES = ["bakery", "mini-restaurant", "tiffin-center", "cloud-kitchen", "fast-food", "sweets", "other"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ownerName: "",
    restaurantName: "",
    phone: "",
    restaurantPhone: "",
    category: "mini-restaurant",
    state: "",
    city: "",
    pincode: "",
    area: "",
    roadStreet: ""
  });
  const [docs, setDocs] = useState({
    fssaiNumber: "",
    fssaiUrl: "",
    panNumber: "",
    panFrontUrl: "",
    aadhaarNumber: "",
    aadhaarFrontUrl: "",
    bankAccountHolderName: "",
    bankAccountNumber: "",
    bankIfsc: ""
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOnboardingDraft()
      .then((res) => {
        const draft = (res.data || {}) as { form?: typeof form; documents?: typeof docs };
        if (draft.form) setForm((f) => ({ ...f, ...draft.form }));
        if (draft.documents) setDocs((d) => ({ ...d, ...draft.documents }));
      })
      .catch(() => undefined);
    const user = getStoredUser();
    if (user?.phone) setForm((f) => ({ ...f, phone: String(user.phone) }));
  }, []);

  const uploadDoc = async (key: keyof typeof docs, file: File) => {
    const res = await uploadImage(file, "partner-docs");
    if (res.success && res.data?.url) {
      setDocs((d) => ({ ...d, [key]: res.data!.url }));
    }
  };

  const saveDraft = async () => {
    await saveOnboardingDraft({ form, documents: docs });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const coords = location || (await pickLocationOnMap());
      const user = getStoredUser();
      const payload: Record<string, unknown> = {
        ownerName: form.ownerName.trim(),
        restaurantName: form.restaurantName.trim(),
        phone: form.phone.trim(),
        ownerPhone: form.phone.trim(),
        restaurantPhone: form.restaurantPhone.trim() || form.phone.trim(),
        category: form.category,
        userId: user?.id,
        address: {
          state: form.state,
          city: form.city,
          pincode: form.pincode,
          area: form.area,
          roadStreet: form.roadStreet,
          colony: "",
          nearbyPlaces: []
        },
        documents: {
          ...docs,
          gstRegistered: false,
          ownerIdProofUrl: docs.aadhaarFrontUrl,
          ownerPanUrl: docs.panFrontUrl
        }
      };
      if (coords) payload.location = coords;
      await submitOnboarding(payload);
      navigate("/submitted", { replace: true, state: { ownerName: form.ownerName, restaurantName: form.restaurantName } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="partner-app" data-theme="light" style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <h2>Partner onboarding</h2>
      <form onSubmit={submit}>
        <div className="card">
          <h3>Business details</h3>
          {(["ownerName", "restaurantName", "phone", "restaurantPhone", "state", "city", "pincode", "area", "roadStreet"] as const).map(
            (key) => (
              <div className="field" key={key}>
                <label>{key}</label>
                <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            )
          )}
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn secondary" onClick={saveDraft}>
            Save draft
          </button>
        </div>
        <div className="card">
          <h3>KYC & bank</h3>
          <div className="field">
            <label>FSSAI number</label>
            <input value={docs.fssaiNumber} onChange={(e) => setDocs({ ...docs, fssaiNumber: e.target.value })} />
          </div>
          <div className="field">
            <label>PAN</label>
            <input value={docs.panNumber} onChange={(e) => setDocs({ ...docs, panNumber: e.target.value })} />
          </div>
          <div className="field">
            <label>Aadhaar</label>
            <input value={docs.aadhaarNumber} onChange={(e) => setDocs({ ...docs, aadhaarNumber: e.target.value })} />
          </div>
          <div className="field">
            <label>Account holder</label>
            <input
              value={docs.bankAccountHolderName}
              onChange={(e) => setDocs({ ...docs, bankAccountHolderName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Account number</label>
            <input
              value={docs.bankAccountNumber}
              onChange={(e) => setDocs({ ...docs, bankAccountNumber: e.target.value })}
            />
          </div>
          <div className="field">
            <label>IFSC</label>
            <input value={docs.bankIfsc} onChange={(e) => setDocs({ ...docs, bankIfsc: e.target.value })} />
          </div>
          {(["fssaiUrl", "panFrontUrl", "aadhaarFrontUrl"] as const).map((key) => (
            <div className="field" key={key}>
              <label>{key} upload</label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && uploadDoc(key, e.target.files[0])} />
              {docs[key] ? <a href={docs[key]}>View uploaded</a> : null}
            </div>
          ))}
          <button type="button" className="btn secondary" onClick={async () => setLocation(await pickLocationOnMap())}>
            Capture shop location
          </button>
          {location ? (
            <p>
              Location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
          ) : null}
        </div>
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        <button className="btn" disabled={loading}>
          {loading ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </div>
  );
}
