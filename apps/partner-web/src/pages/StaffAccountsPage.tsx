import { useEffect, useState } from "react";
import {
  createPartnerStaff,
  disablePartnerStaff,
  getPartnerStaffLoginActivity,
  listPartnerStaff,
  updatePartnerStaff,
  type PartnerStaffAccount,
  type PartnerStaffLoginActivity
} from "@vyaha/api-client";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

const formatWhen = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const eventLabel = (event: PartnerStaffLoginActivity["event"], success: boolean) => {
  if (event === "failed_login" || !success) return "Failed login";
  if (event === "logout") return "Signed out";
  return "Signed in";
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button type="button" className="password-field__toggle" onClick={() => setVisible((current) => !current)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export default function StaffAccountsPage() {
  const [shared, setShared] = useState<PartnerStaffAccount | null>(null);
  const [activity, setActivity] = useState<PartnerStaffLoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [staffRes, activityRes] = await Promise.all([
        listPartnerStaff(),
        getPartnerStaffLoginActivity({ limit: 30 })
      ]);
      setShared((staffRes.data || [])[0] || null);
      setActivity(activityRes.data || []);
    } catch {
      setShared(null);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createPartnerStaff(form);
      setNotice(`Created ${form.username}. Share this with your team. Each person will type their name at sign-in.`);
      setForm({ username: "", password: "", confirmPassword: "" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create kitchen login"));
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async () => {
    if (!shared) return;
    setError("");
    try {
      await updatePartnerStaff(shared._id, { isActive: !shared.isActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update kitchen login"));
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shared) return;
    if (resetForm.password !== resetForm.confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }
    setError("");
    setNotice("");
    try {
      await updatePartnerStaff(shared._id, resetForm);
      setNotice("Password updated. Anyone using the old password will need to sign in again.");
      setResetForm({ password: "", confirmPassword: "" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not reset password"));
    }
  };

  const onDisable = async () => {
    if (!shared) return;
    if (!confirm("Disable the kitchen login? Everyone using it will be signed out.")) return;
    setError("");
    try {
      await disablePartnerStaff(shared._id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not disable kitchen login"));
    }
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-loading__spinner" aria-hidden />
        <p>Loading kitchen login…</p>
      </div>
    );
  }

  return (
    <div className="staff-page">
      <header className="dash-hero">
        <div>
          <p className="dash-eyebrow">Team access</p>
          <h1>Kitchen login</h1>
          <p className="dash-subtitle">
            One username and password for the whole team. Each person types their name when they sign in, and you will
            see who is handling orders.
          </p>
        </div>
      </header>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="staff-notice">{notice}</p> : null}

      {shared ? (
        <section className="card">
          <h2>Shared login</h2>
          <p className="staff-copy">
            <strong>@{shared.username}</strong>
            {shared.isActive ? " · Active" : " · Disabled"}
            {shared.lastOperatorName
              ? ` · Last used by ${shared.lastOperatorName} · ${formatWhen(shared.lastLoginAt)}`
              : " · Not used yet"}
          </p>
          <div className="staff-card__actions">
            <button className="btn secondary" type="button" onClick={() => void onToggle()}>
              {shared.isActive ? "Disable" : "Enable"}
            </button>
            {shared.isActive ? (
              <button className="btn secondary" type="button" onClick={() => void onDisable()}>
                Sign everyone out
              </button>
            ) : null}
          </div>
          <form className="staff-form" onSubmit={onResetPassword}>
            <PasswordField
              id="reset-password"
              label="New password"
              value={resetForm.password}
              onChange={(password) => setResetForm((current) => ({ ...current, password }))}
              placeholder="At least 8 characters"
            />
            <PasswordField
              id="reset-confirm"
              label="Confirm password"
              value={resetForm.confirmPassword}
              onChange={(confirmPassword) => setResetForm((current) => ({ ...current, confirmPassword }))}
              placeholder="Type it again"
            />
            <button className="btn" type="submit">
              Save new password
            </button>
          </form>
        </section>
      ) : (
        <section className="card">
          <h2>Create shared login</h2>
          <p className="staff-copy">
            Share these credentials with kitchen staff. They cannot change the menu, wallet, or shop profile.
          </p>
          <form className="staff-form" onSubmit={onCreate}>
            <div className="field">
              <label htmlFor="staff-username">Username</label>
              <input
                id="staff-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                placeholder="kitchen01"
                autoComplete="off"
                required
              />
            </div>
            <PasswordField
              id="staff-password"
              label="Password"
              value={form.password}
              onChange={(password) => setForm({ ...form, password })}
              placeholder="At least 8 characters"
            />
            <PasswordField
              id="staff-confirm"
              label="Confirm password"
              value={form.confirmPassword}
              onChange={(confirmPassword) => setForm({ ...form, confirmPassword })}
              placeholder="Type it again"
            />
            <button className="btn" disabled={saving}>
              {saving ? "Creating…" : "Create login"}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Who signed in</h2>
        {activity.length === 0 ? (
          <p className="staff-copy">No sign-in activity yet.</p>
        ) : (
          <div className="staff-activity">
            {activity.map((item) => (
              <div key={item._id} className={`staff-activity__row ${item.success ? "" : "is-fail"}`}>
                <div>
                  <strong>
                    {item.displayName || "Staff"} · {eventLabel(item.event, item.success)}
                  </strong>
                  <p>
                    {item.platform && item.platform !== "unknown" ? `${item.platform}` : ""}
                    {item.ip ? ` · ${item.ip}` : ""}
                  </p>
                </div>
                <small>{formatWhen(item.createdAt)}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
