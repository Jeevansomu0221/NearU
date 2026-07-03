import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Payout from "../models/Payout.model";
import { notifyPayoutPaid } from "../services/notification.service";
import { getRiderOrderEarnings, getRiderPayoutBreakdown, markPendingWithdrawalRequestsPaid } from "../services/payout.service";

interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
  };
}

type PeriodType = "WEEKLY" | "MONTHLY";
type RecipientType = "PARTNER" | "DELIVERY_PARTNER";

const VALID_PERIOD_TYPES = new Set<PeriodType>(["WEEKLY", "MONTHLY"]);
const VALID_RECIPIENT_TYPES = new Set<RecipientType>(["PARTNER", "DELIVERY_PARTNER"]);

const isAdmin = (req: AuthRequest, res: Response): boolean => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ success: false, message: "Admin access only" });
    return false;
  }
  return true;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getPeriodRange = (periodType: PeriodType, referenceDateValue?: unknown) => {
  const referenceDate =
    typeof referenceDateValue === "string" && referenceDateValue
      ? new Date(referenceDateValue)
      : new Date();
  const safeReferenceDate = Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate;

  if (periodType === "MONTHLY") {
    const periodStart = new Date(safeReferenceDate.getFullYear(), safeReferenceDate.getMonth(), 1);
    const periodEnd = new Date(safeReferenceDate.getFullYear(), safeReferenceDate.getMonth() + 1, 1);
    return { periodStart, periodEnd };
  }

  const periodStart = startOfDay(safeReferenceDate);
  const day = periodStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  periodStart.setDate(periodStart.getDate() + mondayOffset);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 7);
  return { periodStart, periodEnd };
};

const getOrderDeliveredAt = (order: any) => new Date(order.deliveredAt || order.updatedAt || order.createdAt);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isInPeriod = (order: any, periodStart: Date, periodEnd: Date) => {
  const deliveredAt = getOrderDeliveredAt(order);
  return deliveredAt >= periodStart && deliveredAt < periodEnd;
};

const getBankDetails = (source: any, recipientType: RecipientType) => {
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

const hasMissingBankDetails = (bankDetails: ReturnType<typeof getBankDetails>) =>
  !bankDetails.accountHolderName ||
  ((!bankDetails.accountNumber || !bankDetails.ifsc) && !bankDetails.upiId);

const buildOrderSummary = (order: any, amount: number) => ({
  _id: String(order._id),
  createdAt: order.createdAt,
  deliveredAt: order.deliveredAt || order.updatedAt,
  itemTotal: Number(order.itemTotal || 0),
  deliveryFee: Number(order.deliveryFee || 0),
  grandTotal: Number(order.grandTotal || 0),
  amount
});

const buildRows = (groups: Map<string, any>) =>
  Array.from(groups.values()).sort((a, b) => {
    const amountDifference = Number(b.amount || 0) - Number(a.amount || 0);
    if (amountDifference !== 0) return amountDifference;
    return Number(b.walletBalance || 0) - Number(a.walletBalance || 0);
  });

const buildPartnerContactDetails = (partner: any) => ({
  ownerPhone: partner?.ownerPhone || partner?.phone || "",
  ownerEmail: partner?.email || "",
  restaurantPhone: partner?.restaurantPhone || partner?.phone || ""
});

const getPendingPayoutOrders = async (recipientType: RecipientType, recipientId?: string) => {
  const baseQuery: Record<string, unknown> = {
    status: "DELIVERED",
    paymentStatus: "PAID"
  };

  if (recipientType === "PARTNER") {
    baseQuery["partnerPayout.status"] = { $ne: "PAID" };
    if (recipientId) baseQuery.partnerId = recipientId;
  } else {
    baseQuery["deliveryPayout.status"] = { $ne: "PAID" };
    baseQuery.deliveryPartnerId = { $exists: true, $ne: null };
  }

  return Order.find(baseQuery)
    .select("partnerId deliveryPartnerId itemTotal deliveryFee tipAmount grandTotal createdAt updatedAt deliveredAt")
    .lean();
};

const getPayoutOrders = async (
  recipientType: RecipientType,
  periodStart: Date,
  periodEnd: Date,
  recipientId?: string
) => {
  const orders = await getPendingPayoutOrders(recipientType, recipientType === "PARTNER" ? recipientId : undefined);

  return orders.filter((order) => {
    if (!isInPeriod(order, periodStart, periodEnd)) return false;
    return recipientType === "DELIVERY_PARTNER" || !recipientId || String(order.partnerId) === recipientId;
  });
};

export const getPayoutSummary = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const periodType = String(req.query.periodType || "WEEKLY").toUpperCase() as PeriodType;
    if (!VALID_PERIOD_TYPES.has(periodType)) {
      return res.status(400).json({ success: false, message: "Invalid period type" });
    }

    const { periodStart, periodEnd } = getPeriodRange(periodType, req.query.date);
    const [partnerOrders, deliveryOrders, allPartnerPendingPayoutOrders] = await Promise.all([
      getPayoutOrders("PARTNER", periodStart, periodEnd),
      getPayoutOrders("DELIVERY_PARTNER", periodStart, periodEnd),
      getPendingPayoutOrders("PARTNER")
    ]);

    const partnerIds = [
      ...new Set(
        [...partnerOrders, ...allPartnerPendingPayoutOrders]
          .map((order) => (order.partnerId ? String(order.partnerId) : ""))
          .filter(Boolean)
      )
    ];
    const deliveryUserIds = [
      ...new Set(deliveryOrders.map((order) => String(order.deliveryPartnerId)).filter(Boolean))
    ];

    const [partners, deliveryPartners] = await Promise.all([
      Partner.find({ _id: { $in: partnerIds } })
        .select("ownerName restaurantName phone ownerPhone restaurantPhone email documents settings")
        .lean(),
      DeliveryPartner.find({ userId: { $in: deliveryUserIds } })
        .select("userId name phone documents cashBalance pendingDepositAmount")
        .lean()
    ]);

    const partnerMap = new Map(partners.map((partner: any) => [String(partner._id), partner]));
    const deliveryPartnerByUserId = new Map(
      deliveryPartners.map((partner: any) => [String(partner.userId), partner])
    );

    const partnerWalletSummaries = new Map<string, any>();
    allPartnerPendingPayoutOrders.forEach((order: any) => {
      if (!order.partnerId) return;
      const key = String(order.partnerId);

      const amount = Number(order.itemTotal || 0);
      const deliveredAt = getOrderDeliveredAt(order);
      const current = partnerWalletSummaries.get(key) || {
        walletBalance: 0,
        walletPendingPayoutOrderCount: 0,
        walletOldestDeliveredAt: deliveredAt,
        walletLatestDeliveredAt: deliveredAt,
        walletNextPayoutAt: addDays(deliveredAt, 7),
        walletOrders: []
      };

      current.walletBalance += amount;
      current.walletPendingPayoutOrderCount += 1;
      current.walletOrders.push(buildOrderSummary(order, amount));
      if (deliveredAt < current.walletOldestDeliveredAt) current.walletOldestDeliveredAt = deliveredAt;
      if (deliveredAt > current.walletLatestDeliveredAt) current.walletLatestDeliveredAt = deliveredAt;
      current.walletNextPayoutAt = addDays(current.walletOldestDeliveredAt, 7);
      partnerWalletSummaries.set(key, current);
    });

    const partnerGroups = new Map<string, any>();
    partnerOrders.forEach((order: any) => {
      const partner = partnerMap.get(String(order.partnerId));
      if (!partner) return;

      const amount = Number(order.itemTotal || 0);
      const key = String(partner._id);
      const bankDetails = getBankDetails(partner, "PARTNER");
      const contactDetails = buildPartnerContactDetails(partner);
      const walletSummary = partnerWalletSummaries.get(key) || {};
      const current = partnerGroups.get(key) || {
        key: `PARTNER-${key}`,
        recipientType: "PARTNER",
        recipientId: key,
        name: partner.restaurantName || "Unknown restaurant",
        secondaryName: partner.ownerName || "",
        phone: contactDetails.restaurantPhone || partner.phone || "",
        ownerPhone: contactDetails.ownerPhone,
        ownerEmail: contactDetails.ownerEmail,
        restaurantPhone: contactDetails.restaurantPhone,
        walletBalance: Number(walletSummary.walletBalance || 0),
        walletPendingPayoutOrderCount: Number(walletSummary.walletPendingPayoutOrderCount || 0),
        walletOldestDeliveredAt: walletSummary.walletOldestDeliveredAt,
        walletLatestDeliveredAt: walletSummary.walletLatestDeliveredAt,
        walletNextPayoutAt: walletSummary.walletNextPayoutAt,
        walletOrders: walletSummary.walletOrders || [],
        bankDetails,
        missingBankDetails: hasMissingBankDetails(bankDetails),
        periodType,
        periodStart,
        periodEnd,
        orderCount: 0,
        amount: 0,
        orders: []
      };

      current.orderCount += 1;
      current.amount += amount;
      current.orders.push(buildOrderSummary(order, amount));
      partnerGroups.set(key, current);
    });

    partnerWalletSummaries.forEach((walletSummary, key) => {
      if (partnerGroups.has(key)) return;

      const partner = partnerMap.get(key);
      if (!partner) return;

      const bankDetails = getBankDetails(partner, "PARTNER");
      const contactDetails = buildPartnerContactDetails(partner);
      partnerGroups.set(key, {
        key: `PARTNER-${key}`,
        recipientType: "PARTNER",
        recipientId: key,
        name: partner.restaurantName || "Unknown restaurant",
        secondaryName: partner.ownerName || "",
        phone: contactDetails.restaurantPhone || partner.phone || "",
        ownerPhone: contactDetails.ownerPhone,
        ownerEmail: contactDetails.ownerEmail,
        restaurantPhone: contactDetails.restaurantPhone,
        walletBalance: Number(walletSummary.walletBalance || 0),
        walletPendingPayoutOrderCount: Number(walletSummary.walletPendingPayoutOrderCount || 0),
        walletOldestDeliveredAt: walletSummary.walletOldestDeliveredAt,
        walletLatestDeliveredAt: walletSummary.walletLatestDeliveredAt,
        walletNextPayoutAt: walletSummary.walletNextPayoutAt,
        walletOrders: walletSummary.walletOrders || [],
        bankDetails,
        missingBankDetails: hasMissingBankDetails(bankDetails),
        periodType,
        periodStart,
        periodEnd,
        orderCount: 0,
        amount: 0,
        orders: []
      });
    });

    const deliveryGroups = new Map<string, any>();
    deliveryOrders.forEach((order: any) => {
      const deliveryPartner = deliveryPartnerByUserId.get(String(order.deliveryPartnerId));
      if (!deliveryPartner) return;

      const grossAmount = getRiderOrderEarnings(order);
      const key = String(deliveryPartner._id);
      const bankDetails = getBankDetails(deliveryPartner, "DELIVERY_PARTNER");
      const current = deliveryGroups.get(key) || {
        key: `DELIVERY_PARTNER-${key}`,
        recipientType: "DELIVERY_PARTNER",
        recipientId: key,
        name: deliveryPartner.name || "Unknown rider",
        secondaryName: "",
        phone: deliveryPartner.phone || "",
        bankDetails,
        missingBankDetails: hasMissingBankDetails(bankDetails),
        periodType,
        periodStart,
        periodEnd,
        orderCount: 0,
        grossEarnings: 0,
        cashHeld: Math.max(Number(deliveryPartner.cashBalance || 0), 0),
        offsetApplied: 0,
        netPayable: 0,
        cashDueToPlatform: Math.max(Number(deliveryPartner.cashBalance || 0), 0),
        pendingDepositAmount: Number(deliveryPartner.pendingDepositAmount || 0),
        amount: 0,
        orders: []
      };

      current.orderCount += 1;
      current.grossEarnings += grossAmount;
      current.orders.push(buildOrderSummary(order, grossAmount));
      const breakdown = getRiderPayoutBreakdown(current.grossEarnings, current.cashHeld);
      current.offsetApplied = breakdown.offsetApplied;
      current.netPayable = breakdown.netPayable;
      current.cashDueToPlatform = breakdown.cashDueToPlatform;
      current.amount = breakdown.netPayable;
      deliveryGroups.set(key, current);
    });

    const partnerRows = buildRows(partnerGroups);
    const deliveryPartnerRows = buildRows(deliveryGroups);
    const partnerPeriodRows = partnerRows.filter((row) => Number(row.amount || 0) > 0);
    const partnerWalletRows = partnerRows.filter((row) => Number(row.walletBalance || 0) > 0);

    res.json({
      success: true,
      data: {
        periodType,
        periodStart,
        periodEnd,
        totals: {
          partnerAmount: partnerPeriodRows.reduce((sum, row) => sum + row.amount, 0),
          partnerCount: partnerPeriodRows.length,
          partnerWalletAmount: partnerWalletRows.reduce((sum, row) => sum + row.walletBalance, 0),
          partnerWalletCount: partnerWalletRows.length,
          deliveryGrossAmount: deliveryPartnerRows.reduce((sum, row) => sum + row.grossEarnings, 0),
          deliveryCashOffset: deliveryPartnerRows.reduce((sum, row) => sum + row.offsetApplied, 0),
          deliveryCashDueToPlatform: deliveryPartnerRows.reduce((sum, row) => sum + row.cashDueToPlatform, 0),
          deliveryAmount: deliveryPartnerRows.reduce((sum, row) => sum + row.netPayable, 0),
          deliveryCount: deliveryPartnerRows.length,
          totalAmount:
            partnerWalletRows.reduce((sum, row) => sum + row.walletBalance, 0) +
            deliveryPartnerRows.reduce((sum, row) => sum + row.netPayable, 0)
        },
        partners: partnerRows,
        deliveryPartners: deliveryPartnerRows
      }
    });
  } catch (error: any) {
    console.error("Error getting payout summary:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payout summary" });
  }
};

export const getPayoutHistory = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const recipientType = String(req.query.recipientType || "").toUpperCase();
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const query = VALID_RECIPIENT_TYPES.has(recipientType as RecipientType)
      ? { recipientType }
      : {};

    const payouts = await Payout.find(query).sort({ paidAt: -1 }).limit(limit).lean();

    res.json({
      success: true,
      data: payouts
    });
  } catch (error: any) {
    console.error("Error getting payout history:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payout history" });
  }
};

export const createPayout = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const recipientType = String(req.body.recipientType || "").toUpperCase() as RecipientType;
    const periodType = String(req.body.periodType || "").toUpperCase() as PeriodType;
    const recipientId = String(req.body.recipientId || "");
    const payAllPending = recipientType === "PARTNER" && req.body.payAllPending === true;

    if (!VALID_RECIPIENT_TYPES.has(recipientType)) {
      return res.status(400).json({ success: false, message: "Invalid recipient type" });
    }

    if (!VALID_PERIOD_TYPES.has(periodType)) {
      return res.status(400).json({ success: false, message: "Invalid period type" });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ success: false, message: "Invalid recipient" });
    }

    let periodStart = new Date(req.body.periodStart);
    let periodEnd = new Date(req.body.periodEnd);
    if (
      !payAllPending &&
      (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart >= periodEnd)
    ) {
      return res.status(400).json({ success: false, message: "Invalid payout period" });
    }

    const recipient =
      recipientType === "PARTNER"
        ? await Partner.findById(recipientId)
            .select("ownerName restaurantName phone ownerPhone restaurantPhone email documents settings")
            .lean()
        : await DeliveryPartner.findById(recipientId).select("userId name phone documents cashBalance").lean();

    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    const orders =
      recipientType === "PARTNER"
        ? payAllPending
          ? await getPendingPayoutOrders("PARTNER", recipientId)
          : await getPayoutOrders("PARTNER", periodStart, periodEnd, recipientId)
        : (
            await getPayoutOrders("DELIVERY_PARTNER", periodStart, periodEnd)
          ).filter((order: any) => String(order.deliveryPartnerId) === String((recipient as any).userId));

    if (!orders.length) {
      return res.status(400).json({ success: false, message: "No payment-successful orders are pending payout" });
    }

    const now = new Date();
    if (payAllPending) {
      const deliveredDates = orders
        .map(getOrderDeliveredAt)
        .filter((date: Date) => !Number.isNaN(date.getTime()))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      periodStart = deliveredDates[0] || now;
      periodEnd = deliveredDates.length ? addDays(deliveredDates[deliveredDates.length - 1], 1) : addDays(now, 1);
    }

    const grossAmount = orders.reduce((sum, order: any) => {
      return sum + Number(recipientType === "PARTNER" ? order.itemTotal || 0 : getRiderOrderEarnings(order));
    }, 0);
    const riderCashBalance =
      recipientType === "DELIVERY_PARTNER" ? Number((recipient as any).cashBalance || 0) : 0;
    if (recipientType === "DELIVERY_PARTNER" && riderCashBalance > 0) {
      return res.status(400).json({
        success: false,
        message: "Rider must deposit the full COD cash balance back to Vyaha before wallet earnings can be paid out."
      });
    }

    const riderBreakdown =
      recipientType === "DELIVERY_PARTNER"
        ? getRiderPayoutBreakdown(grossAmount, riderCashBalance)
        : null;
    const amount = riderBreakdown ? riderBreakdown.netPayable : grossAmount;

    if (grossAmount <= 0 || amount <= 0) {
      return res.status(400).json({ success: false, message: "Payout amount must be greater than zero" });
    }

    const bankSnapshot = getBankDetails(recipient, recipientType);
    const partnerContactDetails =
      recipientType === "PARTNER" ? buildPartnerContactDetails(recipient) : null;
    const payout = await Payout.create({
      recipientType,
      recipientId,
      recipientSnapshot:
        recipientType === "PARTNER"
          ? {
              name: (recipient as any).restaurantName || "",
              phone: partnerContactDetails?.restaurantPhone || (recipient as any).phone || "",
              secondaryName: (recipient as any).ownerName || "",
              ownerPhone: partnerContactDetails?.ownerPhone || "",
              ownerEmail: partnerContactDetails?.ownerEmail || "",
              restaurantPhone: partnerContactDetails?.restaurantPhone || ""
            }
          : {
              name: (recipient as any).name || "",
              phone: (recipient as any).phone || "",
              secondaryName: ""
            },
      periodType,
      periodStart,
      periodEnd,
      amount,
      payoutBreakdown: riderBreakdown
        ? {
            grossEarnings: riderBreakdown.grossEarnings,
            cashHeldBeforeOffset: riderBreakdown.cashHeld,
            offsetApplied: riderBreakdown.offsetApplied,
            netPayable: riderBreakdown.netPayable,
            cashDueAfterOffset: riderBreakdown.cashDueToPlatform
          }
        : {
            grossEarnings: grossAmount,
            cashHeldBeforeOffset: 0,
            offsetApplied: 0,
            netPayable: amount,
            cashDueAfterOffset: 0
          },
      orderCount: orders.length,
      orderIds: orders.map((order: any) => order._id),
      bankSnapshot,
      status: "PAID",
      paidReference: String(req.body.paidReference || "").trim(),
      paidNotes: String(req.body.paidNotes || "").trim(),
      paidAt: now,
      paidBy: req.user?.id
    });

    const payoutUpdate =
      recipientType === "PARTNER"
        ? {
            "partnerPayout.status": "PAID",
            "partnerPayout.payoutId": payout._id,
            "partnerPayout.amount": amount,
            "partnerPayout.settledAt": now
          }
        : {
            "deliveryPayout.status": "PAID",
            "deliveryPayout.payoutId": payout._id,
            "deliveryPayout.amount": amount,
            "deliveryPayout.settledAt": now
          };

    await Order.bulkWrite(
      orders.map((order: any) => ({
        updateOne: {
          filter: { _id: order._id },
          update: {
            $set: {
              ...payoutUpdate,
              ...(recipientType === "PARTNER"
                ? { "partnerPayout.amount": Number(order.itemTotal || 0) }
                : { "deliveryPayout.amount": getRiderOrderEarnings(order) })
            }
          }
        }
      }))
    );

    if (recipientType === "DELIVERY_PARTNER") {
      await markPendingWithdrawalRequestsPaid({
        deliveryPartnerId: recipientId,
        payoutId: payout._id,
        paidReference: String(req.body.paidReference || "").trim(),
        paidNotes: String(req.body.paidNotes || "").trim(),
        reviewedBy: req.user?.id
      });
    }

    void notifyPayoutPaid(payout).catch((error) => {
      console.error("Failed to notify payout paid:", error);
    });

    res.status(201).json({
      success: true,
      data: payout,
      message: "Payout marked as paid"
    });
  } catch (error: any) {
    console.error("Error creating payout:", error);
    res.status(500).json({ success: false, message: "Failed to mark payout as paid" });
  }
};
