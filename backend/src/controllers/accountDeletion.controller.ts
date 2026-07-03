import { Response } from "express";
import AccountDeletionRequest from "../models/AccountDeletionRequest.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { ROLES } from "../config/roles";
import {
  buildPayoutCheck,
  executeAccountDeletion,
  refreshDeletionRequestPayoutCheck
} from "../services/accountDeletion.service";

const DELETION_REQUEST_ROLES = [ROLES.PARTNER, ROLES.DELIVERY] as const;

const normalizeReason = (value: unknown) => String(value || "").trim();

const getProfileForRole = async (userId: string, appRole: string) => {
  if (appRole === ROLES.PARTNER) {
    const partner = await Partner.findOne({ userId }).lean();
    if (!partner) return null;
    return {
      profileId: partner._id,
      snapshot: {
        name: partner.ownerName || "",
        phone: partner.phone || partner.ownerPhone || "",
        businessName: partner.restaurantName || partner.shopName || ""
      }
    };
  }

  if (appRole === ROLES.DELIVERY) {
    const deliveryPartner = await DeliveryPartner.findOne({ userId }).lean();
    if (!deliveryPartner) return null;
    return {
      profileId: deliveryPartner._id,
      snapshot: {
        name: deliveryPartner.name || "",
        phone: deliveryPartner.phone || "",
        businessName: ""
      }
    };
  }

  return null;
};

const buildDeletionBlockers = (payoutCheck: Awaited<ReturnType<typeof buildPayoutCheck>>) => {
  const blockers: string[] = [];

  if (payoutCheck.cashBalance > 0) {
    blockers.push(
      `Settle your COD cash balance of Rs ${Math.round(payoutCheck.cashBalance).toLocaleString("en-IN")} first.`
    );
  }
  if (payoutCheck.pendingDepositAmount > 0) {
    blockers.push("Wait until your pending COD deposit verification is completed.");
  }
  if (payoutCheck.pendingWithdrawals > 0) {
    blockers.push("Complete or cancel your pending withdrawal request first.");
  }
  if (payoutCheck.pendingPayoutAmount > 0) {
    blockers.push(
      `Withdraw or settle wallet earnings of Rs ${Math.round(payoutCheck.pendingPayoutAmount).toLocaleString("en-IN")} first.`
    );
  }
  if (payoutCheck.activeOrders > 0) {
    blockers.push("Finish your active delivery jobs before deleting your account.");
  }

  return blockers;
};

export const getMyDeletionEligibility = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const appRole = user.role;
    if (!DELETION_REQUEST_ROLES.includes(appRole as (typeof DELETION_REQUEST_ROLES)[number])) {
      return errorResponse(res, "Not supported for this role", 403);
    }

    const profile = await getProfileForRole(user.id, appRole);
    if (!profile) {
      return errorResponse(res, "Profile not found for this account", 404);
    }

    const payoutCheck = await buildPayoutCheck(appRole as "partner" | "delivery", String(profile.profileId), user.id);
    const blockers = buildDeletionBlockers(payoutCheck);

    return successResponse(
      res,
      {
        canDelete: !payoutCheck.hasOutstandingPayouts,
        blockers,
        payoutCheck
      },
      "Deletion eligibility retrieved successfully"
    );
  } catch (err: any) {
    console.error("getMyDeletionEligibility error:", err);
    return errorResponse(res, "Failed to check deletion eligibility");
  }
};

export const requestAccountDeletion = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const appRole = user.role;
    if (!DELETION_REQUEST_ROLES.includes(appRole as (typeof DELETION_REQUEST_ROLES)[number])) {
      return errorResponse(res, "Account deletion requests are only supported for partner and delivery apps", 403);
    }

    const reason = normalizeReason(req.body?.reason);
    const reasonCategory = normalizeReason(req.body?.reasonCategory);

    if (!reason || reason.length < 10) {
      return errorResponse(res, "Please provide a deletion reason of at least 10 characters", 400);
    }

    const existingPending = await AccountDeletionRequest.findOne({
      userId: user.id,
      appRole,
      status: "PENDING"
    }).lean();

    if (existingPending) {
      return errorResponse(res, "You already have a pending account deletion request", 409);
    }

    const profile = await getProfileForRole(user.id, appRole);
    if (!profile) {
      return errorResponse(res, "Profile not found for this account", 404);
    }

    const payoutCheck = await buildPayoutCheck(appRole as "partner" | "delivery", String(profile.profileId), user.id);

    if (!payoutCheck.hasOutstandingPayouts) {
      await executeAccountDeletion(user.id, appRole);
      return successResponse(res, null, "Account deleted successfully");
    }

    const request = await AccountDeletionRequest.create({
      userId: user.id,
      appRole,
      profileId: profile.profileId,
      reasonCategory,
      reason,
      snapshot: profile.snapshot,
      payoutCheck,
      status: "PENDING"
    });

    return successResponse(
      res,
      request,
      "Account deletion request submitted. Our team will review pending payouts and process your request.",
      201
    );
  } catch (err: any) {
    console.error("requestAccountDeletion error:", err);
    return errorResponse(res, "Failed to submit account deletion request");
  }
};

export const getMyDeletionRequest = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const appRole = user.role;
    if (!DELETION_REQUEST_ROLES.includes(appRole as (typeof DELETION_REQUEST_ROLES)[number])) {
      return errorResponse(res, "Not supported for this role", 403);
    }

    const request = await AccountDeletionRequest.findOne({
      userId: user.id,
      appRole
    })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, request || null);
  } catch (err: any) {
    console.error("getMyDeletionRequest error:", err);
    return errorResponse(res, "Failed to fetch deletion request");
  }
};

export const cancelMyDeletionRequest = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const appRole = user.role;
    const request = await AccountDeletionRequest.findOne({
      userId: user.id,
      appRole,
      status: "PENDING"
    });

    if (!request) {
      return errorResponse(res, "No pending deletion request found", 404);
    }

    request.status = "CANCELLED";
    await request.save();

    return successResponse(res, request, "Account deletion request cancelled");
  } catch (err: any) {
    console.error("cancelMyDeletionRequest error:", err);
    return errorResponse(res, "Failed to cancel deletion request");
  }
};

export const getAccountDeletionRequests = async (req: AuthRequest, res: Response) => {
  try {
    const appRole = String(req.query.appRole || "").trim();
    const status = String(req.query.status || "PENDING").trim().toUpperCase();

    if (appRole !== "partner" && appRole !== "delivery") {
      return errorResponse(res, "appRole must be partner or delivery", 400);
    }

    const filter: Record<string, unknown> = { appRole };
    if (status !== "ALL") {
      filter.status = status;
    }

    const requests = await AccountDeletionRequest.find(filter)
      .populate("userId", "name phone email")
      .populate("reviewedBy", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, requests);
  } catch (err: any) {
    console.error("getAccountDeletionRequests error:", err);
    return errorResponse(res, "Failed to fetch account deletion requests");
  }
};

export const approveAccountDeletion = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const request = await AccountDeletionRequest.findById(req.params.requestId);
    if (!request) {
      return errorResponse(res, "Deletion request not found", 404);
    }

    if (request.status !== "PENDING") {
      return errorResponse(res, "Only pending deletion requests can be approved", 400);
    }

    await refreshDeletionRequestPayoutCheck(request);

    const adminNotes = normalizeReason(req.body?.adminNotes);
    await executeAccountDeletion(String(request.userId), request.appRole);

    request.status = "APPROVED";
    request.reviewedBy = admin.id as any;
    request.reviewedAt = new Date();
    request.adminNotes = adminNotes;
    await request.save();

    const populated = await AccountDeletionRequest.findById(request._id)
      .populate("userId", "name phone email")
      .populate("reviewedBy", "name phone")
      .lean();

    return successResponse(res, populated, "Account deleted successfully");
  } catch (err: any) {
    console.error("approveAccountDeletion error:", err);
    return errorResponse(res, "Failed to approve account deletion");
  }
};

export const rejectAccountDeletion = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const rejectionReason = normalizeReason(req.body?.rejectionReason);
    if (!rejectionReason) {
      return errorResponse(res, "Rejection reason is required", 400);
    }

    const request = await AccountDeletionRequest.findById(req.params.requestId);
    if (!request) {
      return errorResponse(res, "Deletion request not found", 404);
    }

    if (request.status !== "PENDING") {
      return errorResponse(res, "Only pending deletion requests can be rejected", 400);
    }

    request.status = "REJECTED";
    request.reviewedBy = admin.id as any;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;
    request.adminNotes = normalizeReason(req.body?.adminNotes);
    await request.save();

    const populated = await AccountDeletionRequest.findById(request._id)
      .populate("userId", "name phone email")
      .populate("reviewedBy", "name phone")
      .lean();

    return successResponse(res, populated, "Account deletion request rejected");
  } catch (err: any) {
    console.error("rejectAccountDeletion error:", err);
    return errorResponse(res, "Failed to reject account deletion");
  }
};

export const refreshAccountDeletionPayoutCheck = async (req: AuthRequest, res: Response) => {
  try {
    const request = await AccountDeletionRequest.findById(req.params.requestId);
    if (!request) {
      return errorResponse(res, "Deletion request not found", 404);
    }

    await refreshDeletionRequestPayoutCheck(request);

    const populated = await AccountDeletionRequest.findById(request._id)
      .populate("userId", "name phone email")
      .populate("reviewedBy", "name phone")
      .lean();

    return successResponse(res, populated, "Payout check refreshed");
  } catch (err: any) {
    console.error("refreshAccountDeletionPayoutCheck error:", err);
    return errorResponse(res, "Failed to refresh payout check");
  }
};
