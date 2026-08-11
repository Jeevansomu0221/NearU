import { acceptPartnerAgreement, type PartnerKycState } from "@vyaha/api-client";

type Props = {
  kyc: PartnerKycState;
  termsAccepted: boolean;
  partnerAgreementAccepted: boolean;
  onTermsAcceptedChange: (value: boolean) => void;
  onPartnerAgreementAcceptedChange: (value: boolean) => void;
  summary: {
    restaurantName: string;
    ownerName: string;
    city: string;
    category: string;
  };
};

export default function AgreementStep({
  kyc,
  termsAccepted,
  partnerAgreementAccepted,
  onTermsAcceptedChange,
  onPartnerAgreementAcceptedChange,
  summary
}: Props) {
  return (
    <div className="onb-step">
      <p className="onb-hint">
        Vyaha will verify your documents before your restaurant goes live. After approval, your shop can start receiving orders.
      </p>

      <div className="onb-summary">
        <h4>{summary.restaurantName || "Your restaurant"}</h4>
        <p>Owner: {summary.ownerName || "—"}</p>
        <p>City: {summary.city || "—"}</p>
        <p>Category: {summary.category || "—"}</p>
      </div>

      <ol className="onb-timeline">
        <li>Submit application for review</li>
        <li>Vyaha verifies documents and shop details</li>
        <li>Accept Restaurant Partner agreement after approval</li>
        <li>Shop goes live and orders start coming in</li>
      </ol>

      <label className="onb-check">
        <input
          type="checkbox"
          checked={termsAccepted || Boolean(kyc.termsAcceptedAt)}
          onChange={(e) => onTermsAcceptedChange(e.target.checked)}
        />
        I accept Vyaha Terms of Service
      </label>
      <a href="https://www.vyaha.com/terms" target="_blank" rel="noreferrer" className="onb-link">
        Read terms
      </a>

      <label className="onb-check">
        <input
          type="checkbox"
          checked={partnerAgreementAccepted || Boolean(kyc.partnerAgreementAcceptedAt)}
          onChange={(e) => onPartnerAgreementAcceptedChange(e.target.checked)}
        />
        I accept the Restaurant Partner agreement
      </label>
      <a href="https://www.vyaha.com/partner-policy" target="_blank" rel="noreferrer" className="onb-link">
        Read partner policy
      </a>
    </div>
  );
}

export const validateAndSaveAgreement = async (
  termsAccepted: boolean,
  partnerAgreementAccepted: boolean,
  kyc: PartnerKycState,
  onKycChange: (next: PartnerKycState) => void
) => {
  if (!termsAccepted && !kyc.termsAcceptedAt) {
    return { ok: false as const, message: "Please accept the terms and conditions." };
  }
  if (!partnerAgreementAccepted && !kyc.partnerAgreementAcceptedAt) {
    return { ok: false as const, message: "Please accept the Restaurant Partner agreement." };
  }
  if (kyc.termsAcceptedAt && kyc.partnerAgreementAcceptedAt) {
    return { ok: true as const };
  }
  try {
    const result = await acceptPartnerAgreement({ termsAccepted: true, partnerAgreementAccepted: true });
    onKycChange(result.kyc);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Could not save agreement" };
  }
};
