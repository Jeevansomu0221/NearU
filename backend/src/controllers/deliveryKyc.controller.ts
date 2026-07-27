import { Request, Response } from "express";
import mongoose from "mongoose";
import DeliveryPartner from "../models/DeliveryPartner.model";
import User from "../models/User.model";
import { successResponse, errorResponse } from "../utils/response";
import {
  fetchDigiLockerEAadhaar,
  initiateDigiLockerSession,
  isDecentroConfigured,
  validateBankAccount,
  verifyPan
} from "../services/decentro.service";
import { config } from "../config/env";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    phone?: string;
    deliveryPartnerId?: string;
  };
}

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const emergencyPhoneRegex = /^[0-9]{10}$/;

const ensureDeliveryUser = (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    errorResponse(res, "Unauthorized", 401);
    return null;
  }
  return user;
};

const findDeliveryPartnerForUser = (user: NonNullable<AuthRequest["user"]>) => {
  const filters = [];
  if (mongoose.Types.ObjectId.isValid(user.id)) {
    filters.push({ userId: user.id });
  }
  if (user.phone) {
    filters.push({ phone: user.phone });
  }
  return filters.length > 0 ? DeliveryPartner.findOne({ $or: filters }) : null;
};

const serializeProfile = async (userId: string, partner: any) => {
  const userDoc = await User.findById(userId).select("name phone email");
  return {
    _id: partner._id,
    userId: partner.userId,
    name: userDoc?.name || partner.name,
    phone: userDoc?.phone || partner.phone,
    email: userDoc?.email || partner.email,
    dateOfBirth: partner.dateOfBirth,
    address: partner.address,
    emergencyContactName: partner.emergencyContactName,
    emergencyContactPhone: partner.emergencyContactPhone,
    termsAcceptedAt: partner.termsAcceptedAt,
    vehicleType: partner.vehicleType,
    vehicleNumber: partner.vehicleNumber,
    licenseNumber: partner.licenseNumber,
    profilePhotoUrl: partner.profilePhotoUrl,
    documents: partner.documents,
    isAvailable: partner.isAvailable,
    status: partner.status,
    isProfileComplete: Boolean(partner.documents?.aadhaarVerified && partner.termsAcceptedAt)
  };
};

/** @deprecated Aadhaar OTP is deprecated by Decentro — use DigiLocker. */
export const sendDeliveryAadhaarOtp = async (_req: AuthRequest, res: Response) => {
  return errorResponse(
    res,
    "Aadhaar OTP is deprecated by Decentro. Use DigiLocker via /delivery/kyc/digilocker/start",
    410
  );
};

/** @deprecated Aadhaar OTP is deprecated by Decentro — use DigiLocker. */
export const verifyDeliveryAadhaarOtp = async (_req: AuthRequest, res: Response) => {
  return errorResponse(
    res,
    "Aadhaar OTP is deprecated by Decentro. Use DigiLocker via /delivery/kyc/digilocker/complete",
    410
  );
};

export const startDeliveryDigiLocker = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    if (!isDecentroConfigured()) {
      return errorResponse(res, "Decentro KYC is not configured on the server", 503);
    }

    if (req.body.consent !== true && String(req.body.consent || "").toUpperCase() !== "Y") {
      return errorResponse(res, "Aadhaar / DigiLocker consent is required", 400);
    }

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    if (partner.documents?.aadhaarVerified) {
      return errorResponse(res, "Aadhaar is already verified for this rider", 400);
    }

    const session = await initiateDigiLockerSession();

    await DeliveryPartner.updateOne(
      { _id: partner._id },
      {
        $set: {
          "documents.aadhaarOtpTxnId": session.initiationTransactionId,
          "documents.aadhaarShareCode": "",
          "documents.kycProvider": "decentro-digilocker"
        }
      }
    );

    return successResponse(
      res,
      {
        initiationTransactionId: session.initiationTransactionId,
        authorizationUrl: session.authorizationUrl,
        mock: Boolean(config.decentroMock),
        message: session.message
      },
      "DigiLocker session started"
    );
  } catch (error: any) {
    console.error("startDeliveryDigiLocker error:", error);
    return errorResponse(res, error?.message || "Failed to start DigiLocker", 400);
  }
};

export const completeDeliveryDigiLocker = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    if (!isDecentroConfigured()) {
      return errorResponse(res, "Decentro KYC is not configured on the server", 503);
    }

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    const docs: any = partner.documents || {};
    if (docs.aadhaarVerified) {
      const refreshed = await DeliveryPartner.findById(partner._id).lean();
      return successResponse(res, await serializeProfile(user.id, refreshed || partner), "Aadhaar already verified");
    }

    const initiationTransactionId = String(
      req.body.initiationTransactionId ||
        req.body.initiation_transaction_id ||
        docs.aadhaarOtpTxnId ||
        ""
    );
    if (!initiationTransactionId) {
      return errorResponse(res, "Start DigiLocker verification first", 400);
    }

    const code = String(req.body.code || req.body.authorization_code || "").trim() || undefined;
    const profile = await fetchDigiLockerEAadhaar({
      initiationTransactionId,
      code
    });

    const lockedName = profile.name.trim();
    const now = new Date();
    const masked = profile.maskedAadhaar || docs.aadhaarMasked || "";

    await Promise.all([
      User.updateOne({ _id: user.id }, { $set: { name: lockedName } }),
      DeliveryPartner.updateOne(
        { _id: partner._id },
        {
          $set: {
            name: lockedName,
            dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : partner.dateOfBirth,
            address: profile.address || partner.address || "",
            status: "ACTIVE",
            "documents.aadhaarVerified": true,
            "documents.aadhaarVerifiedAt": now,
            "documents.aadhaarName": lockedName,
            "documents.aadhaarMasked": masked,
            "documents.nameLocked": true,
            "documents.aadhaarOtpTxnId": "",
            "documents.aadhaarShareCode": "",
            "documents.kycProvider": "decentro-digilocker",
            "documents.submittedAt": now,
            "documents.isComplete": true
          }
        }
      )
    ]);

    const refreshed = await DeliveryPartner.findById(partner._id).lean();
    return successResponse(
      res,
      {
        ...(await serializeProfile(user.id, refreshed || partner)),
        extracted: {
          name: lockedName,
          dateOfBirth: profile.dateOfBirth,
          address: profile.address,
          gender: profile.gender
        }
      },
      "Aadhaar verified via DigiLocker. Name locked."
    );
  } catch (error: any) {
    console.error("completeDeliveryDigiLocker error:", error);
    return errorResponse(res, error?.message || "Failed to complete DigiLocker verification", 400);
  }
};

/** Public HTTPS callback for DigiLocker redirect — deep-links back into the delivery app. */
export const digilockerCallback = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || "").trim();
    const error = String(req.query.error || req.query.error_description || "").trim();
    const deepLinkParams = new URLSearchParams();
    if (code) deepLinkParams.set("code", code);
    if (error) deepLinkParams.set("error", error);
    const deepLink = `vyaha-delivery://kyc/digilocker${deepLinkParams.toString() ? `?${deepLinkParams}` : ""}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DigiLocker — return to app</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; color: #101828; }
    a { color: #16A34A; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Verification complete</h1>
  <p>Return to the <strong>Vyaha Delivery</strong> app and tap <em>I've finished in DigiLocker</em>.</p>
  <p><a href="${deepLink}">Open Vyaha Delivery</a></p>
  <script>setTimeout(function(){ window.location.href = ${JSON.stringify(deepLink)}; }, 400);</script>
</body>
</html>`);
  } catch (error: any) {
    console.error("digilockerCallback error:", error);
    return errorResponse(res, "DigiLocker callback failed", 500);
  }
};

export const verifyDeliveryPan = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    if (!isDecentroConfigured()) {
      return errorResponse(res, "Decentro KYC is not configured on the server", 503);
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

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }
    if (!partner.documents?.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before PAN", 400);
    }

    const panResult = await verifyPan(panNumber);
    const now = new Date();

    await DeliveryPartner.updateOne(
      { _id: partner._id },
      {
        $set: {
          "documents.panNumber": panNumber,
          "documents.panName": panResult.name || "",
          "documents.panVerified": true,
          "documents.panVerifiedAt": now,
          "documents.panSkipped": false,
          "documents.kycProvider": "decentro"
        }
      }
    );

    const refreshed = await DeliveryPartner.findById(partner._id).lean();
    return successResponse(
      res,
      {
        ...(await serializeProfile(user.id, refreshed || partner)),
        panName: panResult.name || null
      },
      "PAN verified successfully"
    );
  } catch (error: any) {
    console.error("verifyDeliveryPan error:", error);
    return errorResponse(res, error?.message || "Failed to verify PAN", 400);
  }
};

export const skipDeliveryPan = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }
    if (!partner.documents?.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before skipping PAN", 400);
    }
    if (partner.documents?.panVerified) {
      const refreshed = await DeliveryPartner.findById(partner._id).lean();
      return successResponse(
        res,
        await serializeProfile(user.id, refreshed || partner),
        "PAN is already verified"
      );
    }

    await DeliveryPartner.updateOne(
      { _id: partner._id },
      {
        $set: {
          "documents.panSkipped": true
        }
      }
    );

    const refreshed = await DeliveryPartner.findById(partner._id).lean();
    return successResponse(res, await serializeProfile(user.id, refreshed || partner), "PAN skipped. You can add it later in Profile.");
  } catch (error: any) {
    console.error("skipDeliveryPan error:", error);
    return errorResponse(res, error?.message || "Failed to skip PAN");
  }
};

export const verifyDeliveryBank = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    if (!isDecentroConfigured()) {
      return errorResponse(res, "Decentro KYC is not configured on the server", 503);
    }

    const accountNumber = String(req.body.bankAccountNumber || req.body.accountNumber || "").replace(/\D/g, "");
    const ifsc = String(req.body.bankIfsc || req.body.ifsc || "")
      .trim()
      .toUpperCase();
    const accountHolderName = String(
      req.body.bankAccountHolderName || req.body.accountHolderName || req.body.name || ""
    ).trim();
    const upiId = String(req.body.bankUpiId || req.body.upiId || "")
      .trim()
      .toLowerCase();
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

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }
    if (!partner.documents?.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before bank verification", 400);
    }

    const docs: any = partner.documents || {};
    if (docs.bankVerificationStatus === "VERIFIED") {
      const refreshed = await DeliveryPartner.findById(partner._id).lean();
      return successResponse(
        res,
        await serializeProfile(user.id, refreshed || partner),
        "Bank details are already verified"
      );
    }

    const matchName = accountHolderName || docs.aadhaarName || partner.name || "";

    try {
      const bankResult = await validateBankAccount({
        accountNumber,
        ifsc,
        name: matchName || undefined
      });

      await DeliveryPartner.updateOne(
        { _id: partner._id },
        {
          $set: {
            "documents.bankAccountNumber": accountNumber,
            "documents.bankIfsc": ifsc,
            "documents.bankAccountHolderName": bankResult.beneficiaryName || matchName,
            "documents.bankUpiId": upiId,
            "documents.bankVerificationStatus": "VERIFIED",
            "documents.bankReviewComment": "",
            "documents.bankDetailsSkipped": false,
            "documents.kycProvider": "decentro"
          }
        }
      );

      const refreshed = await DeliveryPartner.findById(partner._id).lean();
      return successResponse(
        res,
        {
          ...(await serializeProfile(user.id, refreshed || partner)),
          beneficiaryName: bankResult.beneficiaryName || null,
          nameMatchScore: bankResult.nameMatchScore ?? null
        },
        "Bank account verified via Decentro"
      );
    } catch (decentroError: any) {
      if (!allowAdminFallback) {
        throw decentroError;
      }

      await DeliveryPartner.updateOne(
        { _id: partner._id },
        {
          $set: {
            "documents.bankAccountNumber": accountNumber,
            "documents.bankIfsc": ifsc,
            "documents.bankAccountHolderName": matchName,
            "documents.bankUpiId": upiId,
            "documents.bankVerificationStatus": "PENDING",
            "documents.bankReviewComment": `Decentro verification failed: ${decentroError?.message || "unknown error"}. Pending admin review.`,
            "documents.bankDetailsSkipped": false,
            "documents.kycProvider": "decentro"
          }
        }
      );

      const refreshed = await DeliveryPartner.findById(partner._id).lean();
      return successResponse(
        res,
        {
          ...(await serializeProfile(user.id, refreshed || partner)),
          adminFallback: true,
          decentroError: decentroError?.message || "Decentro bank verification failed"
        },
        "Decentro bank verification failed. Details submitted for admin review.",
        200
      );
    }
  } catch (error: any) {
    console.error("verifyDeliveryBank error:", error);
    return errorResponse(res, error?.message || "Failed to verify bank details", 400);
  }
};

export const skipDeliveryBank = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }
    if (!partner.documents?.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before skipping bank details", 400);
    }
    if (partner.documents?.bankVerificationStatus === "VERIFIED") {
      const refreshed = await DeliveryPartner.findById(partner._id).lean();
      return successResponse(
        res,
        await serializeProfile(user.id, refreshed || partner),
        "Bank details are already verified. Continuing."
      );
    }

    await DeliveryPartner.updateOne(
      { _id: partner._id },
      {
        $set: {
          "documents.bankDetailsSkipped": true,
          "documents.bankVerificationStatus": "",
          "documents.bankReviewComment": ""
        }
      }
    );

    const refreshed = await DeliveryPartner.findById(partner._id).lean();
    return successResponse(
      res,
      await serializeProfile(user.id, refreshed || partner),
      "Bank details skipped. Add them later in Profile for payouts."
    );
  } catch (error: any) {
    console.error("skipDeliveryBank error:", error);
    return errorResponse(res, error?.message || "Failed to skip bank details");
  }
};

export const completeDeliveryRegistrationBasics = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }
    if (!partner.documents?.aadhaarVerified) {
      return errorResponse(res, "Verify Aadhaar before completing registration", 400);
    }

    const vehicleType = String(req.body.vehicleType || partner.vehicleType || "Bike").trim();
    const vehicleNumber = String(req.body.vehicleNumber || "").trim().toUpperCase();
    const licenseNumber = String(req.body.licenseNumber || "").trim().toUpperCase();
    const emergencyContactName = String(req.body.emergencyContactName || "").trim();
    const emergencyContactPhone = String(req.body.emergencyContactPhone || "").replace(/\D/g, "").slice(-10);
    const termsAccepted = Boolean(req.body.termsAccepted);

    if (!emergencyContactName) {
      return errorResponse(res, "Emergency contact name is required", 400);
    }
    if (!emergencyPhoneRegex.test(emergencyContactPhone)) {
      return errorResponse(res, "Emergency contact phone must be 10 digits", 400);
    }
    if (!termsAccepted && !partner.termsAcceptedAt) {
      return errorResponse(res, "Please accept the terms to continue", 400);
    }

    const motorVehicle = !["cycle", "bicycle", "ev"].includes(vehicleType.toLowerCase());
    if (motorVehicle && !vehicleNumber) {
      return errorResponse(res, "Vehicle number is required", 400);
    }

    await DeliveryPartner.updateOne(
      { _id: partner._id },
      {
        $set: {
          vehicleType,
          vehicleNumber: motorVehicle ? vehicleNumber : "",
          licenseNumber: motorVehicle ? licenseNumber : "",
          emergencyContactName,
          emergencyContactPhone,
          ...(termsAccepted ? { termsAcceptedAt: partner.termsAcceptedAt || new Date() } : {}),
          status: partner.status === "PENDING" || partner.status === "INACTIVE" ? "ACTIVE" : partner.status
        }
      }
    );

    const refreshed = await DeliveryPartner.findById(partner._id).lean();
    return successResponse(res, await serializeProfile(user.id, refreshed || partner), "Registration details saved");
  } catch (error: any) {
    console.error("completeDeliveryRegistrationBasics error:", error);
    return errorResponse(res, error?.message || "Failed to save registration details");
  }
};
