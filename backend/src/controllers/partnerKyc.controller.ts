import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User.model";
import { config } from "../config/env";
import { successResponse, errorResponse } from "../utils/response";
import {
  fetchDigiLockerEAadhaar,
  initiateDigiLockerSession,
  isEkoConfigured,
  toValidDateOrUndefined,
  validateBankAccount,
  verifyFssai,
  verifyGstin,
  verifyPan
} from "../services/eko.service";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    phone?: string;
  };
}

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const partnerDigiLockerCallbackUrl = () =>
  `${config.apiBaseUrl.replace(/\/$/, "")}/api/partners/kyc/digilocker/callback`;

const ensurePartnerUser = (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user?.id) {
    errorResponse(res, "Unauthorized", 401);
    return null;
  }
  return user;
};

const emptyKyc = () => ({
  panVerified: false,
  panVerifiedAt: "",
  panNumber: "",
  panName: "",
  panSkipped: false,
  fssaiVerified: false,
  fssaiVerifiedAt: "",
  fssaiNumber: "",
  fssaiBusinessName: "",
  fssaiLicenseStatus: "",
  gstVerified: false,
  gstVerifiedAt: "",
  gstNumber: "",
  gstLegalName: "",
  gstStatus: "",
  aadhaarVerified: false,
  aadhaarVerifiedAt: "",
  aadhaarName: "",
  aadhaarMasked: "",
  aadhaarNumber: "",
  aadhaarOtpTxnId: "",
  bankVerificationStatus: "",
  bankVerifiedAt: "",
  bankDetailsSkipped: false,
  bankAccountHolderName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  kycProvider: "",
  termsAcceptedAt: "",
  partnerAgreementAcceptedAt: ""
});

const isActiveGovStatus = (status: string) => {
  const value = String(status || "").trim();
  if (!value) return false;
  if (/\binactive\b|\bcancel|\bsuspend|\bexpir|\binvalid\b|\bdummy\b|\brevok|\bsurrender/i.test(value)) return false;
  return /\bactive\b|\bvalid\b|\blicensed\b/i.test(value);
};

const isDummyName = (name: string) =>
  /^dummy$/i.test(String(name || "").trim()) || /^(test|sample|fake)\b/i.test(String(name || "").trim());

const serializeKyc = (kyc: Record<string, any> | null | undefined) => {
  const next = {
    ...emptyKyc(),
    ...(kyc && typeof kyc === "object" ? kyc : {})
  };

  // Clear stale "verified" flags from older logic that accepted INACTIVE/DUMMY records.
  if (
    next.fssaiVerified &&
    (!isActiveGovStatus(String(next.fssaiLicenseStatus || "")) || isDummyName(String(next.fssaiBusinessName || "")))
  ) {
    next.fssaiVerified = false;
    next.fssaiVerifiedAt = "";
  }
  if (
    next.gstVerified &&
    (!isActiveGovStatus(String(next.gstStatus || "")) || isDummyName(String(next.gstLegalName || "")))
  ) {
    next.gstVerified = false;
    next.gstVerifiedAt = "";
  }

  return next;
};

const loadUserDraft = async (userId: string) => {
  const user = await User.findById(userId).select("partnerOnboardingDraft name").lean();
  if (!user) return null;
  const draft =
    user.partnerOnboardingDraft && typeof user.partnerOnboardingDraft === "object"
      ? { ...user.partnerOnboardingDraft }
      : {};
  const kyc = serializeKyc((draft as any).kyc);
  return { user, draft, kyc };
};

const saveKycToDraft = async (
  userId: string,
  kycPatch: Record<string, unknown>,
  draftPatch?: Record<string, unknown>
) => {
  const loaded = await loadUserDraft(userId);
  if (!loaded) throw new Error("User not found");

  const nextDraft = {
    ...loaded.draft,
    ...(draftPatch || {}),
    kyc: {
      ...loaded.kyc,
      ...kycPatch
    },
    updatedAt: new Date().toISOString()
  };

  await User.findByIdAndUpdate(userId, {
    $set: { partnerOnboardingDraft: nextDraft }
  });

  return nextDraft.kyc as ReturnType<typeof serializeKyc>;
};

export const getPartnerKycStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    const loaded = await loadUserDraft(user.id);
    if (!loaded) {
      return errorResponse(res, "User not found", 404);
    }

    const kyc = serializeKyc(loaded.kyc);
    const staleFssai =
      Boolean(loaded.kyc?.fssaiVerified) && !kyc.fssaiVerified;
    const staleGst = Boolean(loaded.kyc?.gstVerified) && !kyc.gstVerified;
    if (staleFssai || staleGst) {
      await saveKycToDraft(user.id, {
        ...(staleFssai
          ? { fssaiVerified: false, fssaiVerifiedAt: "" }
          : {}),
        ...(staleGst ? { gstVerified: false, gstVerifiedAt: "" } : {})
      });
    }

    return successResponse(res, kyc, "Partner KYC status");
  } catch (error: any) {
    console.error("getPartnerKycStatus error:", error);
    return errorResponse(res, error?.message || "Failed to load KYC status", 400);
  }
};

export const startPartnerDigiLocker = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    if (!isEkoConfigured()) {
      return errorResponse(res, "Eko KYC is not configured on the server", 503);
    }

    if (req.body.consent !== true && String(req.body.consent || "").toUpperCase() !== "Y") {
      return errorResponse(res, "Aadhaar / DigiLocker consent is required", 400);
    }

    const loaded = await loadUserDraft(user.id);
    if (!loaded) {
      return errorResponse(res, "User not found", 404);
    }
    if (loaded.kyc.aadhaarVerified) {
      return errorResponse(res, "Aadhaar is already verified", 400);
    }

    const session = await initiateDigiLockerSession(partnerDigiLockerCallbackUrl());

    await saveKycToDraft(user.id, {
      aadhaarOtpTxnId: session.initiationTransactionId,
      kycProvider: "eko-digilocker"
    });

    return successResponse(
      res,
      {
        initiationTransactionId: session.initiationTransactionId,
        authorizationUrl: session.authorizationUrl,
        mock: Boolean(config.ekoMock),
        message: session.message
      },
      "DigiLocker session started"
    );
  } catch (error: any) {
    console.error("startPartnerDigiLocker error:", error);
    return errorResponse(res, error?.message || "Failed to start DigiLocker", 400);
  }
};

export const completePartnerDigiLocker = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    if (!isEkoConfigured()) {
      return errorResponse(res, "Eko KYC is not configured on the server", 503);
    }

    const loaded = await loadUserDraft(user.id);
    if (!loaded) {
      return errorResponse(res, "User not found", 404);
    }

    if (loaded.kyc.aadhaarVerified) {
      return successResponse(res, serializeKyc(loaded.kyc), "Aadhaar already verified");
    }

    const initiationTransactionId = String(
      req.body.initiationTransactionId ||
        req.body.initiation_transaction_id ||
        loaded.kyc.aadhaarOtpTxnId ||
        ""
    );
    const bodyReferenceId = String(req.body.reference_id || req.body.referenceId || "").trim();
    const bodyVerificationId = String(req.body.verification_id || req.body.verificationId || "").trim();
    const sessionToken =
      initiationTransactionId ||
      (bodyReferenceId && bodyVerificationId ? `${bodyReferenceId}:${bodyVerificationId}` : "");
    if (!sessionToken) {
      return errorResponse(res, "Start DigiLocker verification first", 400);
    }

    const profile = await fetchDigiLockerEAadhaar({ initiationTransactionId: sessionToken });
    const lockedName = profile.name.trim();
    const now = new Date().toISOString();
    const masked = profile.maskedAadhaar || "";
    const aadhaarDigits = masked.replace(/\D/g, "").slice(-12);

    const kyc = await saveKycToDraft(
      user.id,
      {
        aadhaarVerified: true,
        aadhaarVerifiedAt: now,
        aadhaarName: lockedName,
        aadhaarMasked: masked,
        aadhaarNumber: aadhaarDigits.length === 12 ? aadhaarDigits : loaded.kyc.aadhaarNumber,
        aadhaarOtpTxnId: "",
        kycProvider: "eko-digilocker"
      },
      {
        form: {
          ...(typeof loaded.draft.form === "object" && loaded.draft.form ? loaded.draft.form : {}),
          ownerName: lockedName
        }
      }
    );

    if (lockedName) {
      await User.updateOne({ _id: user.id }, { $set: { name: lockedName } });
    }

    return successResponse(
      res,
      {
        kyc,
        extracted: {
          name: lockedName,
          dateOfBirth: toValidDateOrUndefined(profile.dateOfBirth)
            ? toValidDateOrUndefined(profile.dateOfBirth)?.toISOString().slice(0, 10)
            : profile.dateOfBirth,
          address: profile.address,
          gender: profile.gender
        }
      },
      "Aadhaar verified via DigiLocker"
    );
  } catch (error: any) {
    console.error("completePartnerDigiLocker error:", error);
    return errorResponse(res, error?.message || "Failed to complete DigiLocker verification", 400);
  }
};

export const partnerDigiLockerCallback = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || "").trim();
    const error = String(req.query.error || req.query.error_description || "").trim();
    const referenceId = String(req.query.reference_id || req.query.referenceId || "").trim();
    const verificationId = String(req.query.verification_id || req.query.verificationId || "").trim();
    const deepLinkParams = new URLSearchParams();
    if (code) deepLinkParams.set("code", code);
    if (error) deepLinkParams.set("error", error);
    if (referenceId) deepLinkParams.set("reference_id", referenceId);
    if (verificationId) deepLinkParams.set("verification_id", verificationId);
    const deepLink = `vyaha-partner://kyc/digilocker${deepLinkParams.toString() ? `?${deepLinkParams}` : ""}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DigiLocker — return to app</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; color: #101828; }
    a { color: #174EA6; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Verification complete</h1>
  <p>Return to the <strong>Vyaha Partner</strong> app and tap <em>I've finished in DigiLocker</em>.</p>
  <p><a href="${deepLink}">Open Vyaha Partner</a></p>
  <script>setTimeout(function(){ window.location.href = ${JSON.stringify(deepLink)}; }, 400);</script>
</body>
</html>`);
  } catch (error: any) {
    console.error("partnerDigiLockerCallback error:", error);
    return errorResponse(res, "DigiLocker callback failed", 500);
  }
};

export const verifyPartnerPan = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    if (!isEkoConfigured()) {
      return errorResponse(res, "Eko KYC is not configured on the server", 503);
    }

    const panNumber = String(req.body.panNumber || req.body.pan_number || "")
      .trim()
      .toUpperCase();
    if (!panRegex.test(panNumber)) {
      return errorResponse(res, "PAN must match AAAAA9999A format", 400);
    }
    if (req.body.consent !== true && String(req.body.consent || "").toUpperCase() !== "Y") {
      return errorResponse(res, "PAN verification consent is required", 400);
    }

    const loaded = await loadUserDraft(user.id);
    if (!loaded) {
      return errorResponse(res, "User not found", 404);
    }

    const ownerName = String(
      req.body.ownerName ||
        (loaded.draft as any)?.form?.ownerName ||
        loaded.user.name ||
        ""
    ).trim();
    const panResult = await verifyPan({
      panNumber,
      name: ownerName || "Partner",
      dateOfBirth: undefined
    });
    const now = new Date().toISOString();

    const kyc = await saveKycToDraft(user.id, {
      panNumber,
      panName: panResult.name || ownerName || "",
      panVerified: true,
      panVerifiedAt: now,
      panSkipped: false,
      kycProvider: "eko"
    });

    return successResponse(res, { kyc, panName: panResult.name || null }, "PAN verified successfully");
  } catch (error: any) {
    console.error("verifyPartnerPan error:", error);
    return errorResponse(res, error?.message || "Failed to verify PAN", 400);
  }
};

export const skipPartnerPan = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    const loaded = await loadUserDraft(user.id);
    if (!loaded) {
      return errorResponse(res, "User not found", 404);
    }
    if (loaded.kyc.panVerified) {
      return successResponse(res, serializeKyc(loaded.kyc), "PAN is already verified");
    }

    const kyc = await saveKycToDraft(user.id, { panSkipped: true });
    return successResponse(res, { kyc }, "PAN skipped. You can add it later in Profile.");
  } catch (error: any) {
    console.error("skipPartnerPan error:", error);
    return errorResponse(res, error?.message || "Failed to skip PAN", 400);
  }
};

export const verifyPartnerBank = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    if (!isEkoConfigured()) {
      return errorResponse(res, "Eko KYC is not configured on the server", 503);
    }

    const accountNumber = String(req.body.bankAccountNumber || req.body.accountNumber || "").replace(/\D/g, "");
    const ifsc = String(req.body.bankIfsc || req.body.ifsc || "")
      .trim()
      .toUpperCase();
    const accountHolderName = String(
      req.body.bankAccountHolderName || req.body.accountHolderName || req.body.name || ""
    ).trim();
    const allowAdminFallback = req.body.allowAdminFallback !== false;

    if (!accountNumber || !ifsc) {
      return errorResponse(res, "Bank account number and IFSC are required", 400);
    }
    if (!/^[0-9]+$/.test(accountNumber)) {
      return errorResponse(res, "Bank account number must be numeric", 400);
    }
    if (!ifscRegex.test(ifsc)) {
      return errorResponse(res, "IFSC code format is invalid", 400);
    }

    const loaded = await loadUserDraft(user.id);
    if (!loaded) {
      return errorResponse(res, "User not found", 404);
    }

    const matchName =
      accountHolderName ||
      String((loaded.draft as any)?.form?.ownerName || loaded.kyc.panName || loaded.user.name || "").trim();

    if (loaded.kyc.bankVerificationStatus === "VERIFIED") {
      return successResponse(res, { kyc: serializeKyc(loaded.kyc) }, "Bank details are already verified");
    }

    try {
      const bankResult = await validateBankAccount({
        accountNumber,
        ifsc,
        name: matchName || undefined
      });

      const kyc = await saveKycToDraft(user.id, {
        bankAccountNumber: accountNumber,
        bankIfsc: ifsc,
        bankAccountHolderName: bankResult.beneficiaryName || matchName,
        bankVerificationStatus: "VERIFIED",
        bankVerifiedAt: new Date().toISOString(),
        bankDetailsSkipped: false,
        kycProvider: "eko"
      });

      return successResponse(
        res,
        {
          kyc,
          beneficiaryName: bankResult.beneficiaryName || null,
          nameMatchScore: bankResult.nameMatchScore ?? null
        },
        "Bank account verified"
      );
    } catch (ekoError: any) {
      if (!allowAdminFallback) {
        throw ekoError;
      }

      const kyc = await saveKycToDraft(user.id, {
        bankAccountNumber: accountNumber,
        bankIfsc: ifsc,
        bankAccountHolderName: matchName,
        bankVerificationStatus: "PENDING_ADMIN",
        bankDetailsSkipped: false,
        kycProvider: "eko"
      });

      return successResponse(
        res,
        {
          kyc,
          adminFallback: true,
          ekoError: ekoError?.message || "Bank verification pending admin review"
        },
        "Bank details saved for admin review"
      );
    }
  } catch (error: any) {
    console.error("verifyPartnerBank error:", error);
    return errorResponse(res, error?.message || "Failed to verify bank", 400);
  }
};

export const skipPartnerBank = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    const loaded = await loadUserDraft(user.id);
    if (!loaded) {
      return errorResponse(res, "User not found", 404);
    }

    const kyc = await saveKycToDraft(user.id, {
      bankDetailsSkipped: true,
      bankAccountNumber: "",
      bankIfsc: "",
      bankAccountHolderName: ""
    });

    return successResponse(res, { kyc }, "Bank details skipped. Add them later from Profile.");
  } catch (error: any) {
    console.error("skipPartnerBank error:", error);
    return errorResponse(res, error?.message || "Failed to skip bank", 400);
  }
};

const fssaiRegex = /^[0-9]{14}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const verifyPartnerFssai = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    if (!isEkoConfigured()) {
      return errorResponse(res, "Eko KYC is not configured on the server", 503);
    }

    const fssaiNumber = String(req.body.fssaiNumber || req.body.fssai || "").replace(/\D/g, "");
    if (!fssaiRegex.test(fssaiNumber)) {
      return errorResponse(res, "FSSAI number must be 14 digits", 400);
    }

    const result = await verifyFssai({ fssaiNumber });
    const now = new Date().toISOString();
    const kyc = await saveKycToDraft(user.id, {
      fssaiNumber: result.fssaiNumber,
      fssaiBusinessName: result.businessName || "",
      fssaiLicenseStatus: result.licenseStatus || "Active",
      fssaiVerified: true,
      fssaiVerifiedAt: now,
      kycProvider: "eko"
    });

    return successResponse(
      res,
      {
        kyc,
        businessName: result.businessName || null,
        licenseStatus: result.licenseStatus || null,
        expiryDate: result.expiryDate || null
      },
      "FSSAI license verified"
    );
  } catch (error: any) {
    console.error("verifyPartnerFssai error:", error);
    return errorResponse(res, error?.message || "Failed to verify FSSAI", 400);
  }
};

export const verifyPartnerGst = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    if (!isEkoConfigured()) {
      return errorResponse(res, "Eko KYC is not configured on the server", 503);
    }

    const gstin = String(req.body.gstNumber || req.body.gstin || "")
      .trim()
      .toUpperCase();
    if (!gstRegex.test(gstin)) {
      return errorResponse(res, "GSTIN must be a valid 15-character GST number", 400);
    }

    const loaded = await loadUserDraft(user.id);
    const businessName = String(
      req.body.businessName ||
        (loaded?.draft as any)?.form?.restaurantName ||
        (loaded?.draft as any)?.form?.ownerName ||
        ""
    ).trim();

    const result = await verifyGstin({ gstin, businessName: businessName || undefined });
    const now = new Date().toISOString();
    const kyc = await saveKycToDraft(user.id, {
      gstNumber: result.gstin,
      gstLegalName: result.legalName || result.tradeName || "",
      gstStatus: result.status || "Active",
      gstVerified: true,
      gstVerifiedAt: now,
      kycProvider: "eko"
    });

    return successResponse(
      res,
      {
        kyc,
        legalName: result.legalName || null,
        tradeName: result.tradeName || null,
        status: result.status || null
      },
      "GSTIN verified"
    );
  } catch (error: any) {
    console.error("verifyPartnerGst error:", error);
    return errorResponse(res, error?.message || "Failed to verify GSTIN", 400);
  }
};

export const acceptPartnerOnboardingTerms = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensurePartnerUser(req, res);
    if (!user) return;

    const termsAccepted = Boolean(req.body.termsAccepted);
    const partnerAgreementAccepted = Boolean(req.body.partnerAgreementAccepted);

    if (!termsAccepted) {
      return errorResponse(res, "Terms acceptance is required", 400);
    }
    if (!partnerAgreementAccepted) {
      return errorResponse(res, "Restaurant Partner agreement acceptance is required", 400);
    }

    const now = new Date().toISOString();
    const kyc = await saveKycToDraft(user.id, {
      termsAcceptedAt: now,
      partnerAgreementAcceptedAt: now
    });

    return successResponse(res, { kyc }, "Agreement accepted");
  } catch (error: any) {
    console.error("acceptPartnerOnboardingTerms error:", error);
    return errorResponse(res, error?.message || "Failed to save agreement", 400);
  }
};

/** Read KYC from user draft — used by partner.controller on submit. */
export const readPartnerKycFromUser = async (userId: mongoose.Types.ObjectId | string) => {
  const loaded = await loadUserDraft(String(userId));
  return loaded?.kyc || emptyKyc();
};
