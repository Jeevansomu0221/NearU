import { Request, Response } from "express";
import mongoose from "mongoose";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Payout from "../models/Payout.model";
import WithdrawalRequest from "../models/WithdrawalRequest.model";
import {
  executeDeliveryPartnerPayout,
  getBankDetails,
  getPendingDeliveryPayoutOrders,
  getRiderPayoutBreakdown,
  hasMissingBankDetails,
  hasVerifiedBankDetails
} from "../services/payout.service";

interface AuthRequest extends Request {
  user?: {
    id: string;
    phone?: string;
    role: string;
  };
}

const requireUser = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return req.user;
};

const requireAdmin = (req: AuthRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    res.status(403).json({ success: false, message: "Admin access only" });
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
  return filters.length ? DeliveryPartner.findOne({ $or: filters }) : null;
};

const maskAccountNumber = (accountNumber?: string) => {
  const value = String(accountNumber || "");
  if (!value) return "";
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
};

const buildWalletPayload = async (deliveryPartner: any) => {
  const orders = await getPendingDeliveryPayoutOrders(String(deliveryPartner.userId));
  const grossEarnings = orders.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);
  const breakdown = getRiderPayoutBreakdown(grossEarnings, Number(deliveryPartner.cashBalance || 0));
  const bankDetails = getBankDetails(deliveryPartner, "DELIVERY_PARTNER");

  let pendingRequest = await WithdrawalRequest.findOne({
    deliveryPartnerId: deliveryPartner._id,
    status: "PENDING"
  })
    .sort({ createdAt: -1 })
    .lean();

  if (pendingRequest) {
    const paidPayoutAfterRequest = await Payout.findOne({
      recipientType: "DELIVERY_PARTNER",
      recipientId: deliveryPartner._id,
      paidAt: { $gte: new Date(pendingRequest.createdAt) }
    })
      .sort({ paidAt: -1 })
      .lean();

    if (paidPayoutAfterRequest) {
      await WithdrawalRequest.updateOne(
        { _id: pendingRequest._id },
        {
          $set: {
            status: "PAID",
            payoutId: paidPayoutAfterRequest._id,
            paidReference: paidPayoutAfterRequest.paidReference || "",
            reviewedAt: paidPayoutAfterRequest.paidAt || new Date()
          }
        }
      );
      pendingRequest = null;
    }
  }

  const payouts = await Payout.find({
    recipientType: "DELIVERY_PARTNER",
    recipientId: deliveryPartner._id
  })
    .sort({ paidAt: -1 })
    .limit(50)
    .lean();

  const withdrawalHistory = await WithdrawalRequest.find({
    deliveryPartnerId: deliveryPartner._id
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const latestPaidWithdrawal = withdrawalHistory.find((entry) => entry.status === "PAID") || null;
  const latestPaidPayout = payouts[0] || null;

  return {
    availableBalance: pendingRequest ? 0 : breakdown.netPayable,
    grossEarnings: breakdown.grossEarnings,
    cashHeld: breakdown.cashHeld,
    cashOffset: breakdown.offsetApplied,
    netPayable: breakdown.netPayable,
    cashDueToPlatform: breakdown.cashDueToPlatform,
    pendingPayoutOrderCount: orders.length,
    pendingDepositAmount: Number(deliveryPartner.pendingDepositAmount || 0),
    hasBankDetails: !hasMissingBankDetails(bankDetails),
    bankVerified: hasVerifiedBankDetails(deliveryPartner),
    bankVerificationStatus: deliveryPartner.documents?.bankVerificationStatus || "",
    bankReviewComment: deliveryPartner.documents?.bankReviewComment || "",
    bankDetails: {
      accountHolderName: bankDetails.accountHolderName,
      maskedAccountNumber: maskAccountNumber(bankDetails.accountNumber),
      ifsc: bankDetails.ifsc,
      upiId: bankDetails.upiId
    },
    pendingRequest: pendingRequest
      ? {
          _id: String(pendingRequest._id),
          amount: Number(pendingRequest.amount || 0),
          status: pendingRequest.status,
          createdAt: pendingRequest.createdAt
        }
      : null,
    lastPaidWithdrawal: latestPaidWithdrawal
      ? {
          _id: String(latestPaidWithdrawal._id),
          amount: Number(latestPaidWithdrawal.amount || 0),
          status: latestPaidWithdrawal.status,
          reviewedAt: latestPaidWithdrawal.reviewedAt,
          paidReference: latestPaidWithdrawal.paidReference || ""
        }
      : null,
    lastPaidPayout: latestPaidPayout
      ? {
          _id: String(latestPaidPayout._id),
          amount: Number(latestPaidPayout.amount || 0),
          paidAt: latestPaidPayout.paidAt,
          paidReference: latestPaidPayout.paidReference || ""
        }
      : null,
    payouts: payouts.map((payout: any) => ({
      _id: String(payout._id),
      amount: Number(payout.amount || 0),
      orderCount: Number(payout.orderCount || 0),
      status: payout.status,
      paidAt: payout.paidAt,
      paidReference: payout.paidReference || "",
      paidNotes: payout.paidNotes || ""
    })),
    withdrawalHistory: withdrawalHistory.map((entry: any) => ({
      _id: String(entry._id),
      amount: Number(entry.amount || 0),
      status: entry.status,
      createdAt: entry.createdAt,
      reviewedAt: entry.reviewedAt,
      paidReference: entry.paidReference || "",
      rejectionReason: entry.rejectionReason || ""
    }))
  };
};

export const getMyWithdrawalWallet = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const deliveryPartner = await findDeliveryPartnerForUser(user)?.lean();
    if (!deliveryPartner) {
      return res.status(404).json({ success: false, message: "Delivery profile not found" });
    }

    res.json({
      success: true,
      data: await buildWalletPayload(deliveryPartner)
    });
  } catch (error: any) {
    console.error("getMyWithdrawalWallet error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch withdrawal wallet" });
  }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const deliveryPartner = await findDeliveryPartnerForUser(user);
    if (!deliveryPartner) {
      return res.status(404).json({ success: false, message: "Delivery profile not found" });
    }

    const existingPending = await WithdrawalRequest.findOne({
      deliveryPartnerId: deliveryPartner._id,
      status: "PENDING"
    }).lean();
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending withdrawal request. Please wait for admin approval."
      });
    }

    const bankDetails = getBankDetails(deliveryPartner, "DELIVERY_PARTNER");
    if (!hasVerifiedBankDetails(deliveryPartner)) {
      const bankStatus = deliveryPartner.documents?.bankVerificationStatus || "";
      if (bankStatus === "PENDING") {
        return res.status(400).json({
          success: false,
          message: "Your bank details are under admin review. You can withdraw after they are verified."
        });
      }
      if (bankStatus === "REJECTED") {
        return res.status(400).json({
          success: false,
          message: "Your bank details were rejected. Update them in Profile and wait for verification."
        });
      }
      return res.status(400).json({
        success: false,
        message: "Add and verify your bank account or UPI ID in Profile before requesting a withdrawal."
      });
    }

    const orders = await getPendingDeliveryPayoutOrders(String(deliveryPartner.userId));
    if (!orders.length) {
      return res.status(400).json({
        success: false,
        message: "No delivered earnings are available for withdrawal yet."
      });
    }

    const grossEarnings = orders.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);
    const breakdown = getRiderPayoutBreakdown(grossEarnings, Number(deliveryPartner.cashBalance || 0));
    if (breakdown.netPayable <= 0) {
      return res.status(400).json({
        success: false,
        message: "Your COD cash balance offsets your earnings. Deposit cash back before withdrawing."
      });
    }

    const request = await WithdrawalRequest.create({
      deliveryPartnerId: deliveryPartner._id,
      userId: deliveryPartner.userId,
      amount: breakdown.netPayable,
      grossEarnings: breakdown.grossEarnings,
      cashOffset: breakdown.offsetApplied,
      orderCount: orders.length,
      orderIds: orders.map((order) => order._id),
      bankSnapshot: {
        accountHolderName: bankDetails.accountHolderName,
        accountNumber: bankDetails.accountNumber,
        ifsc: bankDetails.ifsc,
        upiId: bankDetails.upiId
      },
      status: "PENDING"
    });

    res.status(201).json({
      success: true,
      data: request,
      message: "Withdrawal request sent to admin. You will be notified once payment is completed."
    });
  } catch (error: any) {
    console.error("requestWithdrawal error:", error);
    res.status(500).json({ success: false, message: "Failed to submit withdrawal request" });
  }
};

export const getAdminWithdrawalRequests = async (req: AuthRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const status = String(req.query.status || "PENDING").toUpperCase();
    const validStatuses = new Set(["PENDING", "PAID", "REJECTED", "ALL"]);
    if (!validStatuses.has(status)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal status" });
    }

    const query: Record<string, unknown> = {};
    if (status !== "ALL") query.status = status;

    const requests = await WithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("deliveryPartnerId", "name phone cashBalance pendingDepositAmount")
      .populate("userId", "name phone email")
      .lean();

    res.json({ success: true, data: requests });
  } catch (error: any) {
    console.error("getAdminWithdrawalRequests error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch withdrawal requests" });
  }
};

export const approveWithdrawalRequest = async (req: AuthRequest, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const requestId = String(req.params.requestId || "");
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal request" });
    }

    const withdrawalRequest = await WithdrawalRequest.findOne({
      _id: requestId,
      status: "PENDING"
    });
    if (!withdrawalRequest) {
      return res.status(404).json({ success: false, message: "Pending withdrawal request not found" });
    }

    const deliveryPartner = await DeliveryPartner.findById(withdrawalRequest.deliveryPartnerId);
    if (!deliveryPartner) {
      return res.status(404).json({ success: false, message: "Delivery profile not found" });
    }

    const orders = await getPendingDeliveryPayoutOrders(String(deliveryPartner.userId));
    if (!orders.length) {
      return res.status(400).json({
        success: false,
        message: "No pending delivery earnings remain for this rider"
      });
    }

    const payout = await executeDeliveryPartnerPayout({
      deliveryPartner,
      orders,
      paidReference: String(req.body.paidReference || "").trim(),
      paidNotes: String(req.body.paidNotes || "").trim(),
      paidBy: admin.id
    });

    const updatedRequest = await WithdrawalRequest.findById(withdrawalRequest._id).lean();

    res.json({
      success: true,
      data: { withdrawalRequest: updatedRequest || withdrawalRequest, payout },
      message: "Withdrawal paid and rider notified"
    });
  } catch (error: any) {
    console.error("approveWithdrawalRequest error:", error);
    const statusCode = Number(error?.statusCode) || 500;
    res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to approve withdrawal request"
    });
  }
};

export const rejectWithdrawalRequest = async (req: AuthRequest, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const requestId = String(req.params.requestId || "");
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal request" });
    }

    const withdrawalRequest = await WithdrawalRequest.findOne({
      _id: requestId,
      status: "PENDING"
    });
    if (!withdrawalRequest) {
      return res.status(404).json({ success: false, message: "Pending withdrawal request not found" });
    }

    withdrawalRequest.status = "REJECTED";
    withdrawalRequest.rejectionReason = String(req.body.rejectionReason || "Withdrawal request rejected").trim();
    withdrawalRequest.reviewedBy = new mongoose.Types.ObjectId(admin.id);
    withdrawalRequest.reviewedAt = new Date();
    await withdrawalRequest.save();

    res.json({
      success: true,
      data: withdrawalRequest,
      message: "Withdrawal request rejected"
    });
  } catch (error: any) {
    console.error("rejectWithdrawalRequest error:", error);
    res.status(500).json({ success: false, message: "Failed to reject withdrawal request" });
  }
};
