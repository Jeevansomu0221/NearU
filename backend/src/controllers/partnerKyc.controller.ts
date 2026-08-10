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
  aadhaarVerified: false,
  aadhaarVerifiedAt: "",
  aadhaarName: "",
  aadhaarMasked: "",
  aadhaarNumber: "",
  panVerified: false,
  panVerifiedAt: "",
  panNumber: "",
  panName: "",
  panSkipped: false,
  bankVerificationStatus: "",
  bankVerifiedAt: "",
  bankDetailsSkipped: false,
  bankAccountHolderName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  aadhaarOtpTxnId: "",
  kycProvider: "",
  termsAcceptedAt: "",
  partnerAgreementAcceptedAt: ""
});

const serializeKyc = (kyc: Record<string, any> | null | undefined) => ({
  ...emptyKyc(),
  ...(kyc && typeof kyc === "object" ? kyc : {})
});

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

    return successResponse(res, serializeKyc(loaded.kyc), "Partner KYC status");
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
    if (!loaded.kyc.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before PAN", 400);
    }

    const matchName = String(loaded.kyc.aadhaarName || loaded.user.name || "").trim();
    const panResult = await verifyPan({
      panNumber,
      name: matchName || "Partner",
      dateOfBirth: undefined
    });
    const now = new Date().toISOString();

    const kyc = await saveKycToDraft(user.id, {
      panNumber,
      panName: panResult.name || matchName || "",
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
    if (!loaded.kyc.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before skipping PAN", 400);
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
    if (!loaded.kyc.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before bank verification", 400);
    }
    if (loaded.kyc.bankVerificationStatus === "VERIFIED") {
      return successResponse(res, { kyc: serializeKyc(loaded.kyc) }, "Bank details are already verified");
    }

    const matchName = accountHolderName || loaded.kyc.aadhaarName || loaded.user.name || "";

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
