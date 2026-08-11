import { useState } from "react";
import { skipPartnerBank, verifyPartnerBank, type PartnerKycState } from "@vyaha/api-client";

type Props = {
  kyc: PartnerKycState;
  onKycChange: (next: PartnerKycState) => void;
  defaultHolderName?: string;
};

export default function BankStep({ kyc, onKycChange, defaultHolderName }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [holderName, setHolderName] = useState(kyc.bankAccountHolderName || defaultHolderName || "");
  const [accountNumber, setAccountNumber] = useState(kyc.bankAccountNumber || "");
  const [ifsc, setIfsc] = useState(kyc.bankIfsc || "");

  const isDone = kyc.bankVerificationStatus === "VERIFIED" || kyc.bankDetailsSkipped;

  const handleVerify = async () => {
    if (!accountNumber.trim() || !ifsc.trim()) {
      setError("Account number and IFSC are required.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const result = await verifyPartnerBank({
        bankAccountNumber: accountNumber.trim(),
        bankIfsc: ifsc.trim().toUpperCase(),
        bankAccountHolderName: holderName.trim() || defaultHolderName,
        allowAdminFallback: true
      });
      onKycChange(result.kyc);
      if (result.adminFallback) {
        setError(result.ekoError || "Bank details saved for admin review.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify bank");
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await skipPartnerBank();
      onKycChange(result.kyc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not skip bank");
    } finally {
      setBusy(false);
    }
  };

  if (isDone) {
    return (
      <div className="onb-verified">
        <span className="onb-verified__icon">✓</span>
        <div>
          <strong>
            {kyc.bankVerificationStatus === "VERIFIED"
              ? `Payout account verified${kyc.bankAccountHolderName ? `: ${kyc.bankAccountHolderName}` : ""}`
              : "Bank details skipped — add them later from Profile."}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="onb-step">
      <p className="onb-hint">Verify the bank account for payouts. You can skip and add this later.</p>
      {error ? <p className={error.includes("admin") ? "onb-hint" : "onb-error"}>{error}</p> : null}
      <label className="field">
        <span>Account holder name</span>
        <input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="As per bank records" />
      </label>
      <label className="field">
        <span>Bank account number</span>
        <input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          placeholder="Account number"
          inputMode="numeric"
        />
      </label>
      <label className="field">
        <span>IFSC code</span>
        <input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="IFSC" />
      </label>
      <button type="button" className="btn" onClick={handleVerify} disabled={busy}>
        {busy ? "Verifying…" : "Verify bank account"}
      </button>
      <button type="button" className="btn secondary" onClick={handleSkip} disabled={busy}>
        Skip for now
      </button>
    </div>
  );
}
