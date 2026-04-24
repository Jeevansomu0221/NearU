import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import User from "../models/User.model";
import { successResponse, errorResponse } from "../utils/response";

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

  if (!user || user.role !== "delivery") {
    errorResponse(res, "Unauthorized", 401);
    return null;
  }

  return user;
};

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const aadhaarRegex = /^[0-9]{12}$/;
const dlRegex = /^[A-Z]{2}[0-9]{2}[0-9]{11}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const firstString = (...values: any[]) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";

const isDeliveryProfileComplete = (profile: {
  name?: string;
  address?: string;
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
}) => {
  const hasRealName =
    !!profile.name &&
    !/^Delivery\s\d{4}$/.test(profile.name.trim()) &&
    profile.name.trim().length >= 3;

  const hasMandatoryDocuments = Boolean(
    (profile.documents?.aadhaarFrontUrl?.trim() || profile.documents?.aadhaarUrl?.trim()) &&
      profile.documents?.aadhaarBackUrl?.trim() &&
      profile.documents?.panFrontUrl?.trim() &&
      (profile.documents?.drivingLicenseFrontUrl?.trim() || profile.documents?.drivingLicenseUrl?.trim()) &&
      profile.documents?.drivingLicenseBackUrl?.trim() &&
      (profile.documents?.vehicleRcFrontUrl?.trim() || profile.documents?.vehicleRcUrl?.trim()) &&
      profile.documents?.vehicleRcBackUrl?.trim() &&
      profile.documents?.insuranceUrl?.trim() &&
      profile.documents?.bankAccountHolderName?.trim() &&
      profile.documents?.bankAccountNumber?.trim() &&
      profile.documents?.bankIfsc?.trim() &&
      profile.documents?.bankDocumentType?.trim() &&
      (profile.documents?.cancelledChequeUrl?.trim() ||
        profile.documents?.bankPassbookUrl?.trim() ||
        profile.documents?.bankStatementUrl?.trim())
  );

  return Boolean(
    hasRealName &&
      profile.address?.trim() &&
      profile.vehicleType &&
      profile.vehicleNumber?.trim() &&
      profile.licenseNumber?.trim() &&
      hasMandatoryDocuments
  );
};

export const getDeliveryProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = ensureDeliveryUser(req, res);
    if (!user) return;

    const [userDoc, deliveryPartner] = await Promise.all([
      User.findById(user.id).select("name phone email"),
      DeliveryPartner.findOne({ userId: user.id }).lean()
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
        address: deliveryPartner.address,
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
        rating: deliveryPartner.rating,
        ratingCount: deliveryPartner.ratingCount,
        isProfileComplete: isDeliveryProfileComplete({
          name: userDoc.name,
          address: deliveryPartner.address,
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
      address,
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

    if (address !== undefined) {
      if (typeof address !== "string" || address.trim().length < 10) {
        return errorResponse(res, "Address must be at least 10 characters", 400);
      }
      updateDelivery.address = address.trim();
    }

    if (vehicleType !== undefined) {
      const validVehicleTypes = ["Bike", "Cycle", "Scooter", "Motorcycle"];
      if (!validVehicleTypes.includes(vehicleType)) {
        return errorResponse(res, `Vehicle type must be one of: ${validVehicleTypes.join(", ")}`, 400);
      }
      updateDelivery.vehicleType = vehicleType;
    }

    if (vehicleNumber !== undefined) {
      if (typeof vehicleNumber !== "string" || vehicleNumber.trim().length < 5) {
        return errorResponse(res, "Vehicle number is required", 400);
      }
      updateDelivery.vehicleNumber = vehicleNumber.trim().toUpperCase();
    }

    if (licenseNumber !== undefined) {
      if (typeof licenseNumber !== "string" || !dlRegex.test(licenseNumber.trim().toUpperCase())) {
        return errorResponse(res, "Driving license format looks invalid", 400);
      }
      updateDelivery.licenseNumber = licenseNumber.trim().toUpperCase();
    }

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return errorResponse(res, "Availability must be true or false", 400);
      }
      updateDelivery.isAvailable = isAvailable;
    }

    if (profilePhotoUrl !== undefined) {
      updateDelivery.profilePhotoUrl = typeof profilePhotoUrl === "string" ? profilePhotoUrl.trim() : "";
    }

    if (documents !== undefined) {
      const currentPartner = await DeliveryPartner.findOne({ userId: user.id }).lean();
      if (!currentPartner) {
        return errorResponse(res, "Delivery profile not found", 404);
      }

      const nextDocuments: any = {
        ...(currentPartner.documents || {}),
        ...documents
      };

      const normalizedDocuments = {
        ...nextDocuments,
        aadhaarNumber: firstString(nextDocuments.aadhaarNumber, nextDocuments.aadhaar_number),
        aadhaarFrontUrl: firstString(nextDocuments.aadhaarFrontUrl, nextDocuments.aadhaar_front_url, nextDocuments.aadhaarUrl),
        aadhaarBackUrl: firstString(nextDocuments.aadhaarBackUrl, nextDocuments.aadhaar_back_url),
        panNumber: firstString(nextDocuments.panNumber, nextDocuments.pan_number).toUpperCase(),
        panFrontUrl: firstString(nextDocuments.panFrontUrl, nextDocuments.pan_front_url, nextDocuments.panUrl),
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
      if (normalizedDocuments.bankAccountNumber && !/^[0-9]+$/.test(normalizedDocuments.bankAccountNumber)) {
        return errorResponse(res, "Bank account number must be numeric", 400);
      }
      if (normalizedDocuments.bankIfsc && !ifscRegex.test(normalizedDocuments.bankIfsc)) {
        return errorResponse(res, "IFSC code format is invalid", 400);
      }

      const hasMandatoryDocuments = Boolean(
        normalizedDocuments.aadhaarNumber &&
          normalizedDocuments.aadhaarFrontUrl &&
          normalizedDocuments.aadhaarBackUrl &&
          normalizedDocuments.panNumber &&
          normalizedDocuments.panFrontUrl &&
          normalizedDocuments.drivingLicenseFrontUrl &&
          normalizedDocuments.drivingLicenseBackUrl &&
          normalizedDocuments.vehicleRcFrontUrl &&
          normalizedDocuments.vehicleRcBackUrl &&
          normalizedDocuments.insuranceUrl?.trim() &&
          normalizedDocuments.bankAccountHolderName &&
          normalizedDocuments.bankAccountNumber &&
          normalizedDocuments.bankIfsc &&
          normalizedDocuments.bankDocumentType &&
          (normalizedDocuments.cancelledChequeUrl ||
            normalizedDocuments.bankPassbookUrl ||
            normalizedDocuments.bankStatementUrl)
      );

      updateDelivery.documents = {
        ...normalizedDocuments,
        aadhaarUrl: normalizedDocuments.aadhaarFrontUrl,
        panUrl: normalizedDocuments.panFrontUrl,
        drivingLicenseUrl: normalizedDocuments.drivingLicenseFrontUrl,
        vehicleRcUrl: normalizedDocuments.vehicleRcFrontUrl,
        bankIfsc: normalizedDocuments.bankIfsc,
        submittedAt: hasMandatoryDocuments ? new Date() : currentPartner.documents?.submittedAt || null,
        isComplete: hasMandatoryDocuments
      };

      if (hasMandatoryDocuments && status === undefined && reviewComment === undefined) {
        updateDelivery.status = "PENDING";
      }
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
      DeliveryPartner.findOneAndUpdate({ userId: user.id }, updateDelivery, {
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
        address: deliveryPartner.address,
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
        rating: deliveryPartner.rating,
        ratingCount: deliveryPartner.ratingCount,
        isProfileComplete: isDeliveryProfileComplete({
          name: userDoc.name,
          address: deliveryPartner.address,
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

    const deliveryPartner = await DeliveryPartner.findOne({ userId: user.id }).lean();
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
        totalDeliveries: deliveryPartner.totalDeliveries,
        totalEarnings: deliveryPartner.totalEarnings,
        todaysDeliveries: todaysOrders.length,
        todaysEarnings: todaysOrders.reduce(
          (sum, order) => sum + (typeof order.deliveryFee === "number" ? order.deliveryFee : 0),
          0
        ),
        averageDeliveryTime
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

    const deliveryPartner = await DeliveryPartner.findOne({ userId: user.id }).lean();
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

    return successResponse(res, { earnings }, "Today's earnings retrieved successfully");
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

    deliveryPartner.status = status;
    deliveryPartner.reviewComment = typeof reviewComment === "string" ? reviewComment.trim() : "";
    await deliveryPartner.save();

    return successResponse(res, deliveryPartner, "Delivery partner status updated successfully");
  } catch (error) {
    console.error("updateDeliveryPartnerStatusByAdmin error:", error);
    return errorResponse(res, "Failed to update delivery partner status");
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
