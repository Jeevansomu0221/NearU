import mongoose from "mongoose";
import Order from "../models/Order.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Payout from "../models/Payout.model";
import WithdrawalRequest from "../models/WithdrawalRequest.model";
import { notifyPayoutPaid } from "./notification.service";

export const getRiderOrderEarnings = (order: any) =>
  Number(order?.deliveryFee || 0) + Number(order?.tipAmount || 0);

export const getRiderPayoutBreakdown = (grossEarnings: number, cashBalance: number) => {
  const cashHeld = Math.max(Number(cashBalance || 0), 0);
  const earnings = Math.max(Number(grossEarnings || 0), 0);
  const canWithdraw = earnings > 0 && cashHeld <= 0;

  return {
    grossEarnings: earnings,
    cashHeld,
    offsetApplied: 0,
    netPayable: canWithdraw ? earnings : 0,
    cashDueToPlatform: cashHeld,
    canWithdraw
  };
};

export const getBankDetails = (source: any, recipientType: "PARTNER" | "DELIVERY_PARTNER") => {
  const documents = source?.documents || {};
  return {
    accountHolderName: documents.bankAccountHolderName || "",
    accountNumber: documents.bankAccountNumber || "",
    ifsc: documents.bankIfsc || "",
    bankDocumentType: documents.bankDocumentType || "",
    upiId:
      recipientType === "PARTNER"
        ? source?.settings?.upiId || ""
        : documents.bankUpiId || ""
  };
};

export const hasMissingBankDetails = (bankDetails: ReturnType<typeof getBankDetails>) =>
  !bankDetails.accountHolderName ||
  ((!bankDetails.accountNumber || !bankDetails.ifsc) && !bankDetails.upiId);

export const hasVerifiedBankDetails = (source: any) => {
  const documents = source?.documents || {};
  const bankDetails = getBankDetails(source, "DELIVERY_PARTNER");
  return documents.bankVerificationStatus === "VERIFIED" && !hasMissingBankDetails(bankDetails);
};

const getOrderDeliveredAt = (order: any) => new Date(order.deliveredAt || order.updatedAt || order.createdAt);

export const getRiderPaidEarningsTotal = async (deliveryPartnerId: mongoose.Types.ObjectId | string) => {
  const [result] = await Payout.aggregate([
    {
      $match: {
        recipientType: "DELIVERY_PARTNER",
        recipientId: new mongoose.Types.ObjectId(String(deliveryPartnerId)),
        status: "PAID"
      }
    },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  return Number(result?.total || 0);
};

export const getRiderWalletSummary = async (deliveryPartner: any, fallbackUserId?: string) => {
  const deliveryUserId = String(deliveryPartner?.userId || fallbackUserId || "").trim();
  const orders = deliveryUserId
    ? await getPendingDeliveryPayoutOrders(deliveryUserId)
    : [];
  const grossEarnings = orders.reduce((sum, order) => sum + getRiderOrderEarnings(order), 0);
  const breakdown = getRiderPayoutBreakdown(grossEarnings, Number(deliveryPartner.cashBalance || 0));
  const totalPaidEarnings = await getRiderPaidEarningsTotal(deliveryPartner._id);

  return {
    walletBalance: grossEarnings,
    grossWalletEarnings: grossEarnings,
    cashHeld: breakdown.cashHeld,
    cashOffset: 0,
    netPayable: breakdown.netPayable,
    cashDueToPlatform: breakdown.cashDueToPlatform,
    canWithdraw: breakdown.canWithdraw,
    pendingPayoutOrderCount: orders.length,
    totalPaidEarnings
  };
};

export const getPendingDeliveryPayoutOrders = async (deliveryUserId: string) => {
  const normalizedUserId = String(deliveryUserId || "").trim();
  if (!normalizedUserId) return [];

  const deliveryPartnerFilter = mongoose.Types.ObjectId.isValid(normalizedUserId)
    ? new mongoose.Types.ObjectId(normalizedUserId)
    : normalizedUserId;

  return Order.find({
    status: "DELIVERED",
    paymentStatus: "PAID",
    deliveryPartnerId: deliveryPartnerFilter,
    "deliveryPayout.status": { $ne: "PAID" }
  })
    .select("deliveryPartnerId deliveryFee tipAmount createdAt updatedAt deliveredAt")
    .lean();
};

export const markPendingWithdrawalRequestsPaid = async ({
  deliveryPartnerId,
  payoutId,
  paidReference = "",
  paidNotes = "",
  reviewedBy
}: {
  deliveryPartnerId: mongoose.Types.ObjectId | string;
  payoutId: mongoose.Types.ObjectId;
  paidReference?: string;
  paidNotes?: string;
  reviewedBy?: string;
}) => {
  const now = new Date();
  await WithdrawalRequest.updateMany(
    { deliveryPartnerId, status: "PENDING" },
    {
      $set: {
        status: "PAID",
        payoutId,
        paidReference: String(paidReference || "").trim(),
        paidNotes: String(paidNotes || "").trim(),
        reviewedBy: reviewedBy && mongoose.Types.ObjectId.isValid(reviewedBy) ? reviewedBy : undefined,
        reviewedAt: now
      }
    }
  );
};

export const executeDeliveryPartnerPayout = async ({
  deliveryPartner,
  orders,
  paidReference = "",
  paidNotes = "",
  paidBy
}: {
  deliveryPartner: any;
  orders: any[];
  paidReference?: string;
  paidNotes?: string;
  paidBy?: string;
}) => {
  if (!orders.length) {
    throw Object.assign(new Error("No payment-successful orders are pending payout"), { statusCode: 400 });
  }

  const grossAmount = orders.reduce((sum, order) => sum + getRiderOrderEarnings(order), 0);
  const cashBalance = Number(deliveryPartner.cashBalance || 0);
  if (cashBalance > 0) {
    throw Object.assign(
      new Error("Rider must deposit the full COD cash balance back to Vyaha before wallet earnings can be paid out"),
      { statusCode: 400 }
    );
  }

  const amount = grossAmount;

  if (amount <= 0) {
    throw Object.assign(new Error("Payout amount must be greater than zero"), { statusCode: 400 });
  }

  const riderBreakdown = getRiderPayoutBreakdown(grossAmount, cashBalance);

  const deliveredDates = orders
    .map(getOrderDeliveredAt)
    .filter((date: Date) => !Number.isNaN(date.getTime()))
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());
  const now = new Date();
  const periodStart = deliveredDates[0] || now;
  const periodEnd = deliveredDates.length
    ? new Date(deliveredDates[deliveredDates.length - 1].getTime() + 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const bankSnapshot = getBankDetails(deliveryPartner, "DELIVERY_PARTNER");
  const payout = await Payout.create({
    recipientType: "DELIVERY_PARTNER",
    recipientId: deliveryPartner._id,
    recipientSnapshot: {
      name: deliveryPartner.name || "",
      phone: deliveryPartner.phone || "",
      secondaryName: ""
    },
    periodType: "WEEKLY",
    periodStart,
    periodEnd,
    amount,
    payoutBreakdown: {
      grossEarnings: riderBreakdown.grossEarnings,
      cashHeldBeforeOffset: riderBreakdown.cashHeld,
      offsetApplied: riderBreakdown.offsetApplied,
      netPayable: riderBreakdown.netPayable,
      cashDueAfterOffset: riderBreakdown.cashDueToPlatform
    },
    orderCount: orders.length,
    orderIds: orders.map((order) => order._id),
    bankSnapshot,
    status: "PAID",
    paidReference: String(paidReference || "").trim(),
    paidNotes: String(paidNotes || "").trim(),
    paidAt: now,
    paidBy: paidBy && mongoose.Types.ObjectId.isValid(paidBy) ? paidBy : undefined
  });

  await Order.bulkWrite(
    orders.map((order: any) => ({
      updateOne: {
        filter: { _id: order._id },
        update: {
          $set: {
            "deliveryPayout.status": "PAID",
            "deliveryPayout.payoutId": payout._id,
            "deliveryPayout.amount": getRiderOrderEarnings(order),
            "deliveryPayout.settledAt": now
          }
        }
      }
    }))
  );

  await markPendingWithdrawalRequestsPaid({
    deliveryPartnerId: deliveryPartner._id,
    payoutId: payout._id,
    paidReference,
    paidNotes,
    reviewedBy: paidBy
  });

  void notifyPayoutPaid(payout).catch((error) => {
    console.error("Failed to notify payout paid:", error);
  });

  return payout;
};
