import { Request, Response } from "express";
import mongoose from "mongoose";
import DeliveryPartner from "../models/DeliveryPartner.model";
import User from "../models/User.model";
import { successResponse, errorResponse } from "../utils/response";
import {
  createEphemeralShareCode,
  isDecentroConfigured,
  maskAadhaarNumber,
  sendAadhaarOtp,
  validateAadhaarOtp,
  validateBankAccount,
  verifyPan
} from "../services/decentro.service";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    phone?: string;
    deliveryPartnerId?: string;
  };
}

const aadhaarRegex = /^[0-9]{12}$/;
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

export const sendDeliveryAadhaarOtp = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    if (!isDecentroConfigured()) {
      return errorResponse(res, "Decentro KYC is not configured on the server", 503);
    }

    const aadhaarNumber = String(req.body.aadhaarNumber || req.body.aadhaar_number || "").replace(/\D/g, "");
    if (!aadhaarRegex.test(aadhaarNumber)) {
      return errorResponse(res, "Aadhaar number must be 12 digits", 400);
    }
    if (req.body.consent !== true && String(req.body.consent || "").toUpperCase() !== "Y") {
      return errorResponse(res, "Aadhaar consent is required", 400);
    }

    const partner = await findDeliveryPartnerForUser(user);
    if (!partner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    if (partner.documents?.aadhaarVerified) {
      return errorResponse(res, "Aadhaar is already verified for this rider", 400);
    }

    const otpResult = await sendAadhaarOtp(aadhaarNumber);
    const shareCode = createEphemeralShareCode();

    await DeliveryPartner.updateOne(
      { _id: partner._id },
      {
        $set: {
          "documents.aadhaarNumber": aadhaarNumber,
          "documents.aadhaarMasked": maskAadhaarNumber(aadhaarNumber),
          "documents.aadhaarOtpTxnId": otpResult.initiationTransactionId,
          "documents.aadhaarShareCode": shareCode,
          "documents.kycProvider": "decentro"
        }
      }
    );

    return successResponse(
      res,
      {
        initiationTransactionId: otpResult.initiationTransactionId,
        maskedAadhaar: maskAadhaarNumber(aadhaarNumber),
        message: otpResult.message
      },
      "Aadhaar OTP sent"
    );
  } catch (error: any) {
    console.error("sendDeliveryAadhaarOtp error:", error);
    return errorResponse(res, error?.message || "Failed to send Aadhaar OTP", 400);
  }
};

export const verifyDeliveryAadhaarOtp = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    if (!isDecentroConfigured()) {
      return errorResponse(res, "Decentro KYC is not configured on the server", 503);
    }

    const otp = String(req.body.otp || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(otp)) {
      return errorResponse(res, "Enter the 6-digit Aadhaar OTP", 400);
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
      req.body.initiationTransactionId || req.body.initiation_transaction_id || docs.aadhaarOtpTxnId || ""
    );
    if (!initiationTransactionId) {
      return errorResponse(res, "Request Aadhaar OTP first", 400);
    }

    const shareCode = String(docs.aadhaarShareCode || createEphemeralShareCode());
    const profile = await validateAadhaarOtp({
      initiationTransactionId,
      otp,
      shareCode
    });

    const lockedName = profile.name.trim();
    const now = new Date();

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
            "documents.aadhaarMasked": profile.maskedAadhaar || maskAadhaarNumber(docs.aadhaarNumber || ""),
            "documents.nameLocked": true,
            "documents.aadhaarOtpTxnId": "",
            "documents.aadhaarShareCode": "",
            "documents.kycProvider": "decentro",
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
      "Aadhaar verified. Name locked from Aadhaar."
    );
  } catch (error: any) {
    console.error("verifyDeliveryAadhaarOtp error:", error);
    return errorResponse(res, error?.message || "Failed to verify Aadhaar OTP", 400);
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
      return errorResponse(res, "PAN is already verified", 400);
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
      return errorResponse(res, "Bank details are already verified", 400);
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
      return errorResponse(res, "Bank details are already verified", 400);
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
