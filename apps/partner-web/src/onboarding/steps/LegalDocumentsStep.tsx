import { useState } from "react";
import {
  skipPartnerPan,
  verifyPartnerFssai,
  verifyPartnerGst,
  verifyPartnerPan,
  type PartnerKycState
} from "@vyaha/api-client";

type Props = {
  kyc: PartnerKycState;
  onKycChange: (next: PartnerKycState) => void;
  ownerName: string;
  restaurantName: string;
  panNumber: string;
  onPanNumberChange: (value: string) => void;
  fssaiNumber: string;
  onFssaiNumberChange: (value: string) => void;
  fssaiUrl: string;
  gstRegistered: "yes" | "no" | "";
  onGstRegisteredChange: (value: "yes" | "no") => void;
  gstNumber: string;
  onGstNumberChange: (value: string) => void;
  gstUrl: string;
  uploadingKey: string | null;
  onUploadDocument: (key: "fssaiUrl" | "gstUrl", file: File) => void;
};

const VerifiedBadge = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="onb-verified">
    <span className="onb-verified__icon">✓</span>
    <div>
      <strong>{title}</strong>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  </div>
);

const DocUpload = ({
  label,
  docKey,
  url,
  uploadingKey,
  onUpload
}: {
  label: string;
  docKey: "fssaiUrl" | "gstUrl";
  url: string;
  uploadingKey: string | null;
  onUpload: (key: "fssaiUrl" | "gstUrl", file: File) => void;
}) => {
  const isPdf = /\.pdf($|\?)/i.test(url);
  return (
    <label className="onb-upload onb-doc-upload">
      <span>{label}</span>
      {url ? (
        isPdf ? (
          <a className="onb-doc-link" href={url} target="_blank" rel="noreferrer">
            View uploaded PDF
          </a>
        ) : (
          <img src={url} alt={label} className="onb-preview" />
        )
      ) : null}
      <input
        type="file"
        accept="image/*,application/pdf"
        disabled={uploadingKey !== null}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(docKey, file);
          e.target.value = "";
        }}
      />
      {uploadingKey === docKey ? (
        <span>Uploading…</span>
      ) : (
        <span className="btn secondary">{url ? "Replace certificate" : "Upload certificate"}</span>
      )}
    </label>
  );
};

export default function LegalDocumentsStep({
  kyc,
  onKycChange,
  ownerName,
  restaurantName,
  panNumber,
  onPanNumberChange,
  fssaiNumber,
  onFssaiNumberChange,
  fssaiUrl,
  gstRegistered,
  onGstRegisteredChange,
  gstNumber,
  onGstNumberChange,
  gstUrl,
  uploadingKey,
  onUploadDocument
}: Props) {
  const [busy, setBusy] = useState<"" | "pan" | "fssai" | "gst">("");
  const [panConsent, setPanConsent] = useState(false);
  const [error, setError] = useState("");

  const handleVerifyPan = async () => {
    const pan = panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      setError("PAN must match AAAAA9999A format.");
      return;
    }
    if (!panConsent) {
      setError("Please consent to PAN verification.");
      return;
    }
    setError("");
    setBusy("pan");
    try {
      const result = await verifyPartnerPan({ panNumber: pan, consent: true, ownerName });
      onKycChange(result.kyc);
      onPanNumberChange(result.kyc.panNumber || pan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PAN could not be verified.");
    } finally {
      setBusy("");
    }
  };

  const handleSkipPan = async () => {
    setBusy("pan");
    setError("");
    try {
      const result = await skipPartnerPan();
      onKycChange(result.kyc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not skip PAN");
    } finally {
      setBusy("");
    }
  };

  const handleVerifyFssai = async () => {
    const fssai = fssaiNumber.replace(/\D/g, "");
    if (!/^\d{14}$/.test(fssai)) {
      setError("FSSAI number must be 14 digits.");
      return;
    }
    setError("");
    setBusy("fssai");
    try {
      const result = await verifyPartnerFssai({ fssaiNumber: fssai });
      onKycChange(result.kyc);
      onFssaiNumberChange(result.kyc.fssaiNumber || fssai);
    } catch (err) {
      setError(err instanceof Error ? err.message : "FSSAI could not be verified.");
    } finally {
      setBusy("");
    }
  };

  const handleVerifyGst = async () => {
    const gstin = gstNumber.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
      setError("Enter a valid 15-character GSTIN.");
      return;
    }
    setError("");
    setBusy("gst");
    try {
      const result = await verifyPartnerGst({ gstNumber: gstin, businessName: restaurantName || ownerName });
      onKycChange(result.kyc);
      onGstNumberChange(result.kyc.gstNumber || gstin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GSTIN could not be verified.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="onb-step">
      <p className="onb-hint">
        We verify PAN, FSSAI and GST with Eko against government records. Only active licenses show a green badge.
        Also upload the FSSAI and GST certificates for admin review.
      </p>
      {error ? <p className="onb-error">{error}</p> : null}

      <h4>PAN</h4>
      <label className="field">
        <span>PAN number</span>
        <input
          value={panNumber}
          onChange={(e) => onPanNumberChange(e.target.value.toUpperCase().slice(0, 10))}
          placeholder="AAAAA9999A"
          disabled={Boolean(kyc.panVerified || kyc.panSkipped)}
        />
      </label>
      {kyc.panVerified ? (
        <VerifiedBadge title="PAN verified — legitimate" subtitle={kyc.panName ? `Registered name: ${kyc.panName}` : undefined} />
      ) : kyc.panSkipped ? (
        <VerifiedBadge title="PAN skipped" subtitle="You can verify PAN later from Profile." />
      ) : (
        <>
          <label className="onb-check">
            <input type="checkbox" checked={panConsent} onChange={(e) => setPanConsent(e.target.checked)} />
            I consent to PAN verification via Eko
          </label>
          <button type="button" className="btn" onClick={handleVerifyPan} disabled={busy !== ""}>
            {busy === "pan" ? "Verifying…" : "Verify PAN"}
          </button>
          <button type="button" className="btn secondary" onClick={handleSkipPan} disabled={busy !== ""}>
            Skip PAN for now
          </button>
        </>
      )}

      <h4>FSSAI license</h4>
      <label className="field">
        <span>FSSAI number</span>
        <input
          value={fssaiNumber}
          onChange={(e) => onFssaiNumberChange(e.target.value.replace(/\D/g, "").slice(0, 14))}
          placeholder="14-digit FSSAI number"
          inputMode="numeric"
          disabled={Boolean(kyc.fssaiVerified)}
        />
      </label>
      {kyc.fssaiVerified ? (
        <VerifiedBadge
          title="FSSAI verified — legitimate"
          subtitle={[kyc.fssaiBusinessName, kyc.fssaiLicenseStatus].filter(Boolean).join(" · ") || undefined}
        />
      ) : (
        <button type="button" className="btn" onClick={handleVerifyFssai} disabled={busy !== ""}>
          {busy === "fssai" ? "Verifying…" : "Verify FSSAI"}
        </button>
      )}
      <DocUpload
        label="FSSAI certificate (image or PDF)"
        docKey="fssaiUrl"
        url={fssaiUrl}
        uploadingKey={uploadingKey}
        onUpload={onUploadDocument}
      />

      <h4>GST registration</h4>
      <div className="onb-chips">
        {(["yes", "no"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`onb-chip ${gstRegistered === value ? "onb-chip--active" : ""}`}
            onClick={() => onGstRegisteredChange(value)}
          >
            {value === "yes" ? "Yes, GST registered" : "No GST registration"}
          </button>
        ))}
      </div>
      {gstRegistered === "yes" ? (
        <>
          <label className="field">
            <span>GSTIN</span>
            <input
              value={gstNumber}
              onChange={(e) => onGstNumberChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
              placeholder="15-character GSTIN"
              disabled={Boolean(kyc.gstVerified)}
            />
          </label>
          {kyc.gstVerified ? (
            <VerifiedBadge
              title="GSTIN verified — legitimate"
              subtitle={[kyc.gstLegalName, kyc.gstStatus].filter(Boolean).join(" · ") || undefined}
            />
          ) : (
            <button type="button" className="btn" onClick={handleVerifyGst} disabled={busy !== ""}>
              {busy === "gst" ? "Verifying…" : "Verify GSTIN"}
            </button>
          )}
          <DocUpload
            label="GST certificate (image or PDF)"
            docKey="gstUrl"
            url={gstUrl}
            uploadingKey={uploadingKey}
            onUpload={onUploadDocument}
          />
        </>
      ) : null}
    </div>
  );
}
