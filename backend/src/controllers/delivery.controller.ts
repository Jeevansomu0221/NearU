import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import User from "../models/User.model";
import { successResponse, errorResponse } from "../utils/response";
import { config } from "../config/env";
import { notifyDeliveryApplicationStatus, notifyDeliveryDocumentReupload } from "../services/notification.service";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    phone?: string;
    deliveryPartnerId?: string;
  };
}

const ensureDeliveryUser = (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    errorResponse(res, "Unauthorized", 401);
    return null;
  }

  return user;
};

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const aadhaarRegex = /^[0-9]{12}$/;
const dlRegex = /^[A-Z]{2}[0-9]{2}[0-9A-Z]{8,14}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const emergencyPhoneRegex = /^[0-9]{10}$/;

const firstString = (...values: any[]) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";

const safeTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const vehicleTypeRequiresMotorDocuments = (value: unknown) =>
  !["cycle", "bicycle", "ev"].includes(safeTrimmedString(value).toLowerCase());
const DELIVERY_REUPLOAD_KEYS = new Set([
  "aadhaarFrontUrl",
  "selfiePhotoUrl",
  "drivingLicenseFrontUrl",
  "drivingLicenseBackUrl"
]);

const clearReuploadFlagIfChanged = (
  flags: Record<string, boolean>,
  key: string,
  nextUrl: string,
  previousUrls: Array<string | undefined | null>
) => {
  if (!flags[key] || !nextUrl) return false;
  const normalizedPreviousUrls = previousUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0);
  if (normalizedPreviousUrls.includes(nextUrl)) return false;
  flags[key] = false;
  return true;
};

const hasValidDateOfBirth = (value?: string | Date | null) => {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || date > new Date()) return false;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= 18;
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

const updateDeliveryPartnerForUser = (user: NonNullable<AuthRequest["user"]>, update: Record<string, unknown>, options = {}) => {
  const filters = [];
  if (mongoose.Types.ObjectId.isValid(user.id)) {
    filters.push({ userId: user.id });
  }
  if (user.phone) {
    filters.push({ phone: user.phone });
  }
  return filters.length > 0 ? DeliveryPartner.findOneAndUpdate({ $or: filters }, update, options) : null;
};

type DeliveryProfileCompletionInput = {
  name?: string;
  dateOfBirth?: string | Date | null;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoUrl?: string;
  termsAcceptedAt?: string | Date | null;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  documents?: {
    aadhaarNumber?: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    aadhaarUrl?: string;
    panNumber?: string;
    panFrontUrl?: string;
    selfiePhotoUrl?: string;
    drivingLicenseFrontUrl?: string;
    drivingLicenseBackUrl?: string;
    drivingLicenseUrl?: string;
    vehicleRcFrontUrl?: string;
    vehicleRcBackUrl?: string;
    vehicleRcUrl?: string;
    insuranceUrl?: string;
    bankAccountHolderName?: string;
    bankDocumentType?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    cancelledChequeUrl?: string;
    bankPassbookUrl?: string;
    bankStatementUrl?: string;
  };
};

const getMissingDeliveryProfileFields = (profile: DeliveryProfileCompletionInput) => {
  const requiresMotorDocuments = vehicleTypeRequiresMotorDocuments(profile.vehicleType);
  const missingFields: string[] = [];
  const hasRealName =
    !!safeTrimmedString(profile.name) &&
    !/^Delivery\s\d{4}$/.test(safeTrimmedString(profile.name)) &&
    safeTrimmedString(profile.name).length >= 3;

  if (!hasRealName) missingFields.push("name");
  if (!hasValidDateOfBirth(profile.dateOfBirth)) missingFields.push("date of birth");
  if (!safeTrimmedString(profile.emergencyContactName)) missingFields.push("emergency contact name");
  if (!emergencyPhoneRegex.test(safeTrimmedString(profile.emergencyContactPhone))) {
    missingFields.push("emergency contact phone");
  }
  if (!profile.termsAcceptedAt) missingFields.push("accepted terms");
  if (!safeTrimmedString(profile.vehicleType)) missingFields.push("vehicle type");
  if (requiresMotorDocuments && !safeTrimmedString(profile.vehicleNumber)) missingFields.push("vehicle number");
  if (requiresMotorDocuments && !safeTrimmedString(profile.licenseNumber)) missingFields.push("driving license number");
  if (!(safeTrimmedString(profile.documents?.aadhaarFrontUrl) || safeTrimmedString(profile.documents?.aadhaarUrl))) {
    missingFields.push("Aadhaar front");
  }
  if (!safeTrimmedString(profile.documents?.aadhaarNumber)) missingFields.push("Aadhaar number");
  if (!safeTrimmedString(profile.documents?.selfiePhotoUrl)) missingFields.push("selfie photo");
  if (
    requiresMotorDocuments &&
    !(safeTrimmedString(profile.documents?.drivingLicenseFrontUrl) || safeTrimmedString(profile.documents?.drivingLicenseUrl))
  ) {
    missingFields.push("driving license front");
  }
  if (requiresMotorDocuments && !safeTrimmedString(profile.documents?.drivingLicenseBackUrl)) {
    missingFields.push("driving license back");
  }

  return missingFields;
};

const isDeliveryProfileComplete = (profile: DeliveryProfileCompletionInput) => {
  return getMissingDeliveryProfileFields(profile).length === 0;
};

export const getDeliveryProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const [userDoc, deliveryPartner] = await Promise.all([
      User.findById(user.id).select("name phone email"),
      findDeliveryPartnerForUser(user)?.lean()
    ]);

    if (!userDoc || !deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    return successResponse(
      res,
      {
        _id: deliveryPartner._id,
        userId: deliveryPartner.userId,
        name: userDoc.name,
        phone: userDoc.phone,
        email: userDoc.email,
        dateOfBirth: deliveryPartner.dateOfBirth,
        address: deliveryPartner.address,
        emergencyContactName: deliveryPartner.emergencyContactName,
        emergencyContactPhone: deliveryPartner.emergencyContactPhone,
        termsAcceptedAt: deliveryPartner.termsAcceptedAt,
        vehicleType: deliveryPartner.vehicleType,
        vehicleNumber: deliveryPartner.vehicleNumber,
        licenseNumber: deliveryPartner.licenseNumber,
        profilePhotoUrl: deliveryPartner.profilePhotoUrl,
        reviewComment: deliveryPartner.reviewComment,
        documents: deliveryPartner.documents,
        isAvailable: deliveryPartner.isAvailable,
        status: deliveryPartner.status,
        totalDeliveries: deliveryPartner.totalDeliveries,
        totalEarnings: deliveryPartner.totalEarnings,
        cashBalance: deliveryPartner.cashBalance || 0,
        pendingDepositAmount: deliveryPartner.pendingDepositAmount || 0,
        lastCashActivityAt: deliveryPartner.lastCashActivityAt,
        lastCashActivityType: deliveryPartner.lastCashActivityType,
        rating: deliveryPartner.rating,
        ratingCount: deliveryPartner.ratingCount,
        isProfileComplete: isDeliveryProfileComplete({
          name: userDoc.name,
          dateOfBirth: deliveryPartner.dateOfBirth,
          address: deliveryPartner.address,
          emergencyContactName: deliveryPartner.emergencyContactName,
          emergencyContactPhone: deliveryPartner.emergencyContactPhone,
          profilePhotoUrl: deliveryPartner.profilePhotoUrl,
          termsAcceptedAt: deliveryPartner.termsAcceptedAt,
          vehicleType: deliveryPartner.vehicleType,
          vehicleNumber: deliveryPartner.vehicleNumber,
          licenseNumber: deliveryPartner.licenseNumber,
          documents: deliveryPartner.documents
        })
      },
      "Delivery profile retrieved successfully"
    );
  } catch (error) {
    console.error("getDeliveryProfile error:", error);
    return errorResponse(res, "Failed to get delivery profile");
  }
};

export const updateDeliveryProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const {
      name,
      email,
      dateOfBirth,
      address,
      emergencyContactName,
      emergencyContactPhone,
      termsAccepted,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      isAvailable,
      profilePhotoUrl,
      documents,
      status,
      reviewComment
    } = req.body;

    const updateUser: Record<string, unknown> = {};
    const updateDelivery: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 3) {
        return errorResponse(res, "Name must be at least 3 characters", 400);
      }
      updateUser.name = name.trim();
    }

    if (email !== undefined) {
      updateUser.email = typeof email === "string" ? email.trim().toLowerCase() : "";
    }

    if (dateOfBirth !== undefined) {
      const parsedDate = new Date(dateOfBirth);
      if (!hasValidDateOfBirth(parsedDate)) {
        return errorResponse(res, "Delivery partner must be at least 18 years old", 400);
      }
      updateDelivery.dateOfBirth = parsedDate;
    }

    if (address !== undefined) {
      if (typeof address !== "string" || address.trim().length < 10) {
        return errorResponse(res, "Address must be at least 10 characters", 400);
      }
      updateDelivery.address = address.trim();
    }

    if (emergencyContactName !== undefined) {
      if (typeof emergencyContactName !== "string" || emergencyContactName.trim().length < 3) {
        return errorResponse(res, "Emergency contact name is required", 400);
      }
      updateDelivery.emergencyContactName = emergencyContactName.trim();
    }

    if (emergencyContactPhone !== undefined) {
      if (typeof emergencyContactPhone !== "string" || !emergencyPhoneRegex.test(emergencyContactPhone.trim())) {
        return errorResponse(res, "Emergency contact phone must be a 10-digit mobile number", 400);
      }
      updateDelivery.emergencyContactPhone = emergencyContactPhone.trim();
    }

    if (termsAccepted !== undefined) {
      if (termsAccepted !== true) {
        return errorResponse(res, "Delivery partner terms must be accepted before submission", 400);
      }
      updateDelivery.termsAcceptedAt = new Date();
    }

    if (vehicleType !== undefined) {
      const validVehicleTypes = ["Bike", "Cycle", "Bicycle", "Scooter", "Motorcycle", "EV", "Car"];
      if (!validVehicleTypes.includes(vehicleType)) {
        return errorResponse(res, `Vehicle type must be one of: ${validVehicleTypes.join(", ")}`, 400);
      }
      updateDelivery.vehicleType = vehicleType === "Motorcycle" ? "EV" : vehicleType;
    }

    if (vehicleNumber !== undefined) {
      if (vehicleNumber === "" || vehicleNumber === null) {
        updateDelivery.vehicleNumber = "";
      } else if (typeof vehicleNumber !== "string" || vehicleNumber.trim().length < 5) {
        return errorResponse(res, "Vehicle number is required", 400);
      } else {
        updateDelivery.vehicleNumber = vehicleNumber.trim().toUpperCase();
      }
    }

    if (licenseNumber !== undefined) {
      if (licenseNumber === "" || licenseNumber === null) {
        updateDelivery.licenseNumber = "";
      } else if (typeof licenseNumber !== "string" || !dlRegex.test(licenseNumber.trim().toUpperCase())) {
        return errorResponse(res, "Driving license format looks invalid", 400);
      } else {
        updateDelivery.licenseNumber = licenseNumber.trim().toUpperCase();
      }
    }

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return errorResponse(res, "Availability must be true or false", 400);
      }
      updateDelivery.isAvailable = isAvailable;
    }

    const needsCurrentPartner = profilePhotoUrl !== undefined || documents !== undefined;
    const currentPartner = needsCurrentPartner ? await findDeliveryPartnerForUser(user)?.lean() : null;
    if (needsCurrentPartner && !currentPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    const existingDocuments: any = currentPartner?.documents || {};
    const nextReuploadFlags = { ...(existingDocuments.reuploadFlags || {}) } as Record<string, boolean>;
    let didUpdateReuploadFlags = false;

    if (profilePhotoUrl !== undefined) {
      const nextProfilePhotoUrl = typeof profilePhotoUrl === "string" ? profilePhotoUrl.trim() : "";
      updateDelivery.profilePhotoUrl = nextProfilePhotoUrl;
      didUpdateReuploadFlags =
        clearReuploadFlagIfChanged(nextReuploadFlags, "profilePhotoUrl", nextProfilePhotoUrl, [currentPartner?.profilePhotoUrl]) ||
        didUpdateReuploadFlags;
    }

    if (documents !== undefined) {
      const nextDocuments: any = {
        ...existingDocuments,
        ...documents
      };

      const normalizedDocuments = {
        ...nextDocuments,
        aadhaarNumber: firstString(nextDocuments.aadhaarNumber, nextDocuments.aadhaar_number),
        aadhaarFrontUrl: firstString(nextDocuments.aadhaarFrontUrl, nextDocuments.aadhaar_front_url, nextDocuments.aadhaarUrl),
        aadhaarBackUrl: firstString(nextDocuments.aadhaarBackUrl, nextDocuments.aadhaar_back_url),
        panNumber: firstString(nextDocuments.panNumber, nextDocuments.pan_number).toUpperCase(),
        panFrontUrl: firstString(nextDocuments.panFrontUrl, nextDocuments.pan_front_url, nextDocuments.panUrl),
        selfiePhotoUrl: firstString(nextDocuments.selfiePhotoUrl, nextDocuments.selfie_photo_url),
        drivingLicenseFrontUrl: firstString(nextDocuments.drivingLicenseFrontUrl, nextDocuments.dlFrontUrl, nextDocuments.dl_front_url, nextDocuments.drivingLicenseUrl),
        drivingLicenseBackUrl: firstString(nextDocuments.drivingLicenseBackUrl, nextDocuments.dlBackUrl, nextDocuments.dl_back_url),
        vehicleRcFrontUrl: firstString(nextDocuments.vehicleRcFrontUrl, nextDocuments.vehicle_rc_front_url, nextDocuments.vehicleRcUrl),
        vehicleRcBackUrl: firstString(nextDocuments.vehicleRcBackUrl, nextDocuments.vehicle_rc_back_url),
        bankAccountHolderName: firstString(nextDocuments.bankAccountHolderName, nextDocuments.bank_account_holder_name),
        bankAccountNumber: firstString(nextDocuments.bankAccountNumber, nextDocuments.bank_account_number),
        bankIfsc: firstString(nextDocuments.bankIfsc, nextDocuments.bank_ifsc).toUpperCase(),
        bankDocumentType: firstString(nextDocuments.bankDocumentType, nextDocuments.bank_document_type),
        cancelledChequeUrl: firstString(nextDocuments.cancelledChequeUrl),
        bankPassbookUrl: firstString(nextDocuments.bankPassbookUrl),
        bankStatementUrl: firstString(nextDocuments.bankStatementUrl)
      };

      if (normalizedDocuments.aadhaarNumber && !aadhaarRegex.test(normalizedDocuments.aadhaarNumber)) {
        return errorResponse(res, "Aadhaar number must be 12 digits", 400);
      }
      if (normalizedDocuments.panNumber && !panRegex.test(normalizedDocuments.panNumber)) {
        return errorResponse(res, "PAN number must match AAAAA9999A format", 400);
      }
      const hasAnyBankInput = Boolean(normalizedDocuments.bankAccountHolderName || normalizedDocuments.bankAccountNumber || normalizedDocuments.bankIfsc);
      if (hasAnyBankInput && !normalizedDocuments.bankAccountHolderName) {
        return errorResponse(res, "Account holder name is required if you add bank details", 400);
      }
      if (hasAnyBankInput && !normalizedDocuments.bankAccountNumber) {
        return errorResponse(res, "Bank account number is required if you add bank details", 400);
      }
      if (normalizedDocuments.bankAccountNumber && !/^[0-9]+$/.test(normalizedDocuments.bankAccountNumber)) {
        return errorResponse(res, "Bank account number must be numeric", 400);
      }
      if (hasAnyBankInput && !normalizedDocuments.bankIfsc) {
        return errorResponse(res, "IFSC code is required if you add bank details", 400);
      }
      if (normalizedDocuments.bankIfsc && !ifscRegex.test(normalizedDocuments.bankIfsc)) {
        return errorResponse(res, "IFSC code format is invalid", 400);
      }

      const nextVehicleType = typeof vehicleType === "string" ? vehicleType : currentPartner?.vehicleType;
      const requiresMotorDocuments = vehicleTypeRequiresMotorDocuments(nextVehicleType);
      const hasMandatoryDocuments = Boolean(
        normalizedDocuments.aadhaarNumber &&
          normalizedDocuments.aadhaarFrontUrl &&
          normalizedDocuments.selfiePhotoUrl &&
          (!requiresMotorDocuments ||
            (normalizedDocuments.drivingLicenseFrontUrl &&
              normalizedDocuments.drivingLicenseBackUrl))
      );

      const replacementChecks = [
        { key: "aadhaarFrontUrl", nextUrl: normalizedDocuments.aadhaarFrontUrl, previousUrls: [existingDocuments.aadhaarFrontUrl, existingDocuments.aadhaarUrl] },
        { key: "aadhaarBackUrl", nextUrl: normalizedDocuments.aadhaarBackUrl, previousUrls: [existingDocuments.aadhaarBackUrl] },
        { key: "panFrontUrl", nextUrl: normalizedDocuments.panFrontUrl, previousUrls: [existingDocuments.panFrontUrl, existingDocuments.panUrl] },
        { key: "selfiePhotoUrl", nextUrl: normalizedDocuments.selfiePhotoUrl, previousUrls: [existingDocuments.selfiePhotoUrl] },
        {
          key: "drivingLicenseFrontUrl",
          nextUrl: normalizedDocuments.drivingLicenseFrontUrl,
          previousUrls: [existingDocuments.drivingLicenseFrontUrl, existingDocuments.drivingLicenseUrl]
        },
        { key: "drivingLicenseBackUrl", nextUrl: normalizedDocuments.drivingLicenseBackUrl, previousUrls: [existingDocuments.drivingLicenseBackUrl] },
        {
          key: "vehicleRcFrontUrl",
          nextUrl: normalizedDocuments.vehicleRcFrontUrl,
          previousUrls: [existingDocuments.vehicleRcFrontUrl, existingDocuments.vehicleRcUrl]
        },
        { key: "vehicleRcBackUrl", nextUrl: normalizedDocuments.vehicleRcBackUrl, previousUrls: [existingDocuments.vehicleRcBackUrl] },
        { key: "insuranceUrl", nextUrl: normalizedDocuments.insuranceUrl, previousUrls: [existingDocuments.insuranceUrl] },
        {
          key: "bankProofUrl",
          nextUrl: firstString(normalizedDocuments.cancelledChequeUrl, normalizedDocuments.bankPassbookUrl, normalizedDocuments.bankStatementUrl),
          previousUrls: [existingDocuments.cancelledChequeUrl, existingDocuments.bankPassbookUrl, existingDocuments.bankStatementUrl]
        }
      ];

      replacementChecks.forEach(({ key, nextUrl, previousUrls }) => {
        didUpdateReuploadFlags = clearReuploadFlagIfChanged(nextReuploadFlags, key, nextUrl, previousUrls) || didUpdateReuploadFlags;
      });

      updateDelivery.documents = {
        ...normalizedDocuments,
        aadhaarUrl: normalizedDocuments.aadhaarFrontUrl,
        panUrl: normalizedDocuments.panFrontUrl,
        drivingLicenseUrl: normalizedDocuments.drivingLicenseFrontUrl,
        vehicleRcUrl: normalizedDocuments.vehicleRcFrontUrl,
        bankIfsc: normalizedDocuments.bankIfsc,
        reuploadFlags: nextReuploadFlags,
        reuploadNotes: existingDocuments.reuploadNotes || "",
        submittedAt: hasMandatoryDocuments ? new Date() : currentPartner?.documents?.submittedAt || null,
        isComplete: hasMandatoryDocuments
      };

      if (hasMandatoryDocuments && status === undefined && reviewComment === undefined) {
        updateDelivery.status = "PENDING";
      }
    } else if (didUpdateReuploadFlags) {
      updateDelivery.documents = {
        ...existingDocuments,
        reuploadFlags: nextReuploadFlags,
        reuploadNotes: existingDocuments.reuploadNotes || ""
      };
    }

    if (status !== undefined) {
      const validStatuses = ["PENDING", "VERIFIED", "ACTIVE", "REJECTED", "SUSPENDED", "INACTIVE"];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Status must be one of: ${validStatuses.join(", ")}`, 400);
      }
      updateDelivery.status = status;
    }

    if (reviewComment !== undefined) {
      updateDelivery.reviewComment = typeof reviewComment === "string" ? reviewComment.trim() : "";
    }

    const [userDoc, deliveryPartner] = await Promise.all([
      User.findByIdAndUpdate(user.id, updateUser, {
        new: true,
        runValidators: true
      }).select("name phone email"),
      updateDeliveryPartnerForUser(user, updateDelivery, {
        new: true,
        runValidators: true
      })
    ]);

    if (!userDoc || !deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    return successResponse(
      res,
      {
        _id: deliveryPartner._id,
        userId: deliveryPartner.userId,
        name: userDoc.name,
        phone: userDoc.phone,
        email: userDoc.email,
        dateOfBirth: deliveryPartner.dateOfBirth,
        address: deliveryPartner.address,
        emergencyContactName: deliveryPartner.emergencyContactName,
        emergencyContactPhone: deliveryPartner.emergencyContactPhone,
        termsAcceptedAt: deliveryPartner.termsAcceptedAt,
        vehicleType: deliveryPartner.vehicleType,
        vehicleNumber: deliveryPartner.vehicleNumber,
        licenseNumber: deliveryPartner.licenseNumber,
        profilePhotoUrl: deliveryPartner.profilePhotoUrl,
        reviewComment: deliveryPartner.reviewComment,
        documents: deliveryPartner.documents,
        isAvailable: deliveryPartner.isAvailable,
        status: deliveryPartner.status,
        totalDeliveries: deliveryPartner.totalDeliveries,
        totalEarnings: deliveryPartner.totalEarnings,
        cashBalance: deliveryPartner.cashBalance || 0,
        pendingDepositAmount: deliveryPartner.pendingDepositAmount || 0,
        lastCashActivityAt: deliveryPartner.lastCashActivityAt,
        lastCashActivityType: deliveryPartner.lastCashActivityType,
        rating: deliveryPartner.rating,
        ratingCount: deliveryPartner.ratingCount,
        isProfileComplete: isDeliveryProfileComplete({
          name: userDoc.name,
          dateOfBirth: deliveryPartner.dateOfBirth,
          address: deliveryPartner.address,
          emergencyContactName: deliveryPartner.emergencyContactName,
          emergencyContactPhone: deliveryPartner.emergencyContactPhone,
          profilePhotoUrl: deliveryPartner.profilePhotoUrl,
          termsAcceptedAt: deliveryPartner.termsAcceptedAt,
          vehicleType: deliveryPartner.vehicleType,
          vehicleNumber: deliveryPartner.vehicleNumber,
          licenseNumber: deliveryPartner.licenseNumber,
          documents: deliveryPartner.documents
        })
      },
      "Delivery profile updated successfully"
    );
  } catch (error: any) {
    console.error("updateDeliveryProfile error:", error);

    if (error?.code === 11000) {
      return errorResponse(res, "That email or vehicle record is already in use", 400);
    }

    return errorResponse(res, "Failed to update delivery profile");
  }
};

export const getDeliveryStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const deliveryPartner = await findDeliveryPartnerForUser(user)?.lean();
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todaysOrders, deliveredOrders] = await Promise.all([
      Order.find({
        deliveryPartnerId: user.id,
        status: "DELIVERED",
        updatedAt: { $gte: todayStart }
      }).lean(),
      Order.find({
        deliveryPartnerId: user.id,
        status: "DELIVERED"
      }).select("createdAt updatedAt deliveryFee").lean()
    ]);

    const averageDeliveryTime =
      deliveredOrders.length > 0
        ? Math.round(
            deliveredOrders.reduce((total, order) => {
              const createdAt = new Date(order.createdAt).getTime();
              const updatedAt = new Date(order.updatedAt).getTime();
              return total + Math.max(0, updatedAt - createdAt);
            }, 0) /
              deliveredOrders.length /
              60000
          )
        : 0;

    return successResponse(
      res,
      {
        totalDeliveries: deliveredOrders.length,
        totalEarnings: deliveredOrders.reduce(
          (sum, order) => sum + (typeof order.deliveryFee === "number" ? order.deliveryFee : 0),
          0
        ),
        todaysDeliveries: todaysOrders.length,
        todaysEarnings: todaysOrders.reduce(
          (sum, order) => sum + (typeof order.deliveryFee === "number" ? order.deliveryFee : 0),
          0
        ),
        averageDeliveryTime,
        cashBalance: deliveryPartner.cashBalance || 0,
        pendingDepositAmount: deliveryPartner.pendingDepositAmount || 0,
        cashDueToPlatform: Math.max((deliveryPartner.cashBalance || 0) - (deliveryPartner.pendingDepositAmount || 0), 0)
      },
      "Delivery stats retrieved successfully"
    );
  } catch (error) {
    console.error("getDeliveryStats error:", error);
    return errorResponse(res, "Failed to get delivery stats");
  }
};

export const getTodaysEarnings = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const deliveryPartner = await findDeliveryPartnerForUser(user)?.lean();
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const deliveredToday = await Order.find({
      deliveryPartnerId: user.id,
      status: "DELIVERED",
      updatedAt: { $gte: todayStart }
    })
      .select("deliveryFee")
      .lean();

    const earnings = deliveredToday.reduce(
      (sum, order) => sum + (typeof order.deliveryFee === "number" ? order.deliveryFee : 0),
      0
    );

    return successResponse(
      res,
      {
        earnings,
        cashBalance: deliveryPartner.cashBalance || 0,
        pendingDepositAmount: deliveryPartner.pendingDepositAmount || 0
      },
      "Today's earnings retrieved successfully"
    );
  } catch (error) {
    console.error("getTodaysEarnings error:", error);
    return errorResponse(res, "Failed to get today's earnings");
  }
};

export const getAllDeliveryPartnersForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return errorResponse(res, "Admin access only", 403);
    }

    const deliveryPartners = await DeliveryPartner.find()
      .populate("userId", "name phone email")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, deliveryPartners, "Delivery partners retrieved successfully");
  } catch (error) {
    console.error("getAllDeliveryPartnersForAdmin error:", error);
    return errorResponse(res, "Failed to get delivery partners");
  }
};

export const updateDeliveryPartnerStatusByAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return errorResponse(res, "Admin access only", 403);
    }

    const { deliveryPartnerId } = req.params;
    const { status, reviewComment } = req.body;
    const validStatuses = ["PENDING", "VERIFIED", "ACTIVE", "REJECTED", "SUSPENDED", "INACTIVE"];

    if (!validStatuses.includes(status)) {
      return errorResponse(res, `Status must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId);
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery partner not found", 404);
    }

    if (["VERIFIED", "ACTIVE"].includes(status)) {
      const userDoc = deliveryPartner.userId
        ? await User.findById(deliveryPartner.userId).select("name")
        : null;
      const missingFields = getMissingDeliveryProfileFields({
        name: firstString(userDoc?.name, deliveryPartner.name),
        dateOfBirth: deliveryPartner.dateOfBirth,
        address: deliveryPartner.address,
        emergencyContactName: deliveryPartner.emergencyContactName,
        emergencyContactPhone: deliveryPartner.emergencyContactPhone,
        profilePhotoUrl: deliveryPartner.profilePhotoUrl,
        termsAcceptedAt: deliveryPartner.termsAcceptedAt,
        vehicleType: deliveryPartner.vehicleType,
        vehicleNumber: deliveryPartner.vehicleNumber,
        licenseNumber: deliveryPartner.licenseNumber,
        documents: deliveryPartner.documents
      });

      if (missingFields.length) {
        return errorResponse(
          res,
          `Cannot approve until the delivery partner completes: ${missingFields.join(", ")}`,
          400,
          { missingFields }
        );
      }
    }

    deliveryPartner.status = status;
    if (status === "ACTIVE") {
      deliveryPartner.isAvailable = true;
    } else if (["PENDING", "REJECTED", "SUSPENDED", "INACTIVE"].includes(status)) {
      deliveryPartner.isAvailable = false;
    }
    deliveryPartner.reviewComment = typeof reviewComment === "string" ? reviewComment.trim() : "";
    await deliveryPartner.save();

    void notifyDeliveryApplicationStatus(deliveryPartner).catch((error) => {
      console.error("Failed to notify delivery status update:", error);
    });

    return successResponse(res, deliveryPartner, "Delivery partner status updated successfully");
  } catch (error) {
    console.error("updateDeliveryPartnerStatusByAdmin error:", error);
    return errorResponse(res, "Failed to update delivery partner status");
  }
};

export const requestDeliveryPartnerDocumentReupload = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return errorResponse(res, "Admin access only", 403);
    }

    const { deliveryPartnerId } = req.params;
    const { keys, note, clear } = req.body as { keys?: string[]; note?: string; clear?: boolean };
    const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId);

    if (!deliveryPartner) {
      return errorResponse(res, "Delivery partner not found", 404);
    }

    const documents: any = deliveryPartner.documents || {};
    documents.reuploadFlags = documents.reuploadFlags || {};

    const sanitizedKeys = Array.isArray(keys)
      ? keys.filter((key) => DELIVERY_REUPLOAD_KEYS.has(key))
      : [];

    if (clear) {
      const targetKeys = sanitizedKeys.length ? sanitizedKeys : Array.from(DELIVERY_REUPLOAD_KEYS);
      targetKeys.forEach((key) => {
        documents.reuploadFlags[key] = false;
      });
      documents.reuploadNotes = sanitizedKeys.length ? String(note || documents.reuploadNotes || "").trim() : "";
    } else {
      const reuploadNote = String(note || "").trim();
      if (!sanitizedKeys.length) {
        return errorResponse(res, "Provide at least one document key to request re-upload.", 400);
      }
      if (!reuploadNote) {
        return errorResponse(res, "Provide a reason for the re-upload request.", 400);
      }
      sanitizedKeys.forEach((key) => {
        documents.reuploadFlags[key] = true;
      });
      documents.reuploadNotes = reuploadNote;
      deliveryPartner.reviewComment = reuploadNote;
      deliveryPartner.status = "REJECTED";
    }

    deliveryPartner.documents = documents;
    deliveryPartner.markModified("documents");
    await deliveryPartner.save();

    if (!clear) {
      void notifyDeliveryDocumentReupload(deliveryPartner).catch((error) => {
        console.error("Failed to notify delivery document re-upload:", error);
      });
    }

    return successResponse(
      res,
      {
        reuploadFlags: documents.reuploadFlags,
        reuploadNotes: documents.reuploadNotes,
        status: deliveryPartner.status,
        reviewComment: deliveryPartner.reviewComment
      },
      clear ? "Re-upload requirement cleared" : "Re-upload requested"
    );
  } catch (error) {
    console.error("requestDeliveryPartnerDocumentReupload error:", error);
    return errorResponse(res, "Failed to update re-upload request");
  }
};

export const updateDeliveryLocation = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return errorResponse(res, "latitude and longitude are required", 400);
    }

    const existing = await findDeliveryPartnerForUser(user)?.select("status");

    if (!existing) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    // Auto-promote VERIFIED riders to ACTIVE the first time they share a
    // valid location. The admin has already approved their documents, so
    // sharing GPS == "I am ready to take jobs".
    const nextStatus = existing.status === "VERIFIED" ? "ACTIVE" : existing.status;

    const deliveryPartner = await updateDeliveryPartnerForUser(
      user,
      {
        currentLocation: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        isAvailable: true,
        status: nextStatus
      },
      { new: true }
    );

    if (!deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    return successResponse(res, {
      currentLocation: deliveryPartner.currentLocation,
      status: deliveryPartner.status,
      freshnessMinutes: config.deliveryLocationFreshnessMinutes
    }, "Location updated successfully");
  } catch (error) {
    console.error("updateDeliveryLocation error:", error);
    return errorResponse(res, "Failed to update delivery location");
  }
};

export const calculateDeliveryDistance = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const { origin, destination } = req.body || {};
    if (
      typeof origin?.latitude !== "number" ||
      typeof origin?.longitude !== "number" ||
      typeof destination?.latitude !== "number" ||
      typeof destination?.longitude !== "number"
    ) {
      return errorResponse(res, "origin and destination coordinates are required", 400);
    }

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(destination.latitude - origin.latitude);
    const dLng = toRadians(destination.longitude - origin.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(origin.latitude)) *
        Math.cos(toRadians(destination.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const duration = Math.max(5, Math.round((distance / 25) * 60));

    return successResponse(res, {
      distance: Number(distance.toFixed(2)),
      duration
    }, "Distance calculated successfully");
  } catch (error) {
    console.error("calculateDeliveryDistance error:", error);
    return errorResponse(res, "Failed to calculate distance");
  }
};

/**
 * Get available delivery jobs
 */
export const getAvailableJobs = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    // Find orders that need delivery
    const availableJobs = await Order.find({
      status: { $in: ["CONFIRMED", "ACCEPTED_BY_SHOP"] },
      deliveryPartnerId: { $exists: false } // Not assigned yet
    })
    .populate("customerId", "name phone")
    .populate("partnerId", "shopName address")
    .sort({ createdAt: -1 });

    return successResponse(res, availableJobs);

  } catch (error) {
    console.error("getAvailableJobs error:", error);
    return errorResponse(res, "Failed to get jobs");
  }
};

/**
 * Accept a delivery job
 */
export const acceptDeliveryJob = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    const { orderId } = req.params;
    if (!user) return;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (order.deliveryPartnerId) {
      return errorResponse(res, "Order already assigned", 400);
    }

    if (!["CONFIRMED", "ACCEPTED_BY_SHOP"].includes(order.status)) {
      return errorResponse(res, "Order not ready for delivery", 400);
    }

    // Assign delivery partner
    order.deliveryPartnerId = new mongoose.Types.ObjectId(user.id);
    order.status = "ASSIGNED";
    await order.save();

    return successResponse(res, order, "Delivery job accepted");

  } catch (error) {
    console.error("acceptDeliveryJob error:", error);
    return errorResponse(res, "Failed to accept job");
  }
};
