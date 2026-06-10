import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Payout from "../models/Payout.model";
import CashLedgerEntry from "../models/CashLedgerEntry.model";

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
    upiId: recipientType === "PARTNER" ? source?.settings?.upiId || "" : ""
  };
};

const hasMissingBankDetails = (bankDetails: ReturnType<typeof getBankDetails>) =>
  !bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifsc;

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
  Array.from(groups.values()).sort((a, b) => b.amount - a.amount);

const getRiderPayoutBreakdown = (grossEarnings: number, cashBalance: number) => {
  const cashHeld = Math.max(Number(cashBalance || 0), 0);
  const offsetApplied = Math.min(grossEarnings, cashHeld);
  return {
    grossEarnings,
    cashHeld,
    offsetApplied,
    netPayable: grossEarnings - offsetApplied,
    cashDueToPlatform: cashHeld - offsetApplied
  };
};

const getPayoutOrders = async (
  recipientType: RecipientType,
  periodStart: Date,
  periodEnd: Date,
  recipientId?: string
) => {
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

  const orders = await Order.find(baseQuery)
    .select("partnerId deliveryPartnerId itemTotal deliveryFee grandTotal createdAt updatedAt deliveredAt")
    .lean();

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
    const [partnerOrders, deliveryOrders] = await Promise.all([
      getPayoutOrders("PARTNER", periodStart, periodEnd),
      getPayoutOrders("DELIVERY_PARTNER", periodStart, periodEnd)
    ]);

    const partnerIds = [...new Set(partnerOrders.map((order) => String(order.partnerId)).filter(Boolean))];
    const deliveryUserIds = [
      ...new Set(deliveryOrders.map((order) => String(order.deliveryPartnerId)).filter(Boolean))
    ];

    const [partners, deliveryPartners] = await Promise.all([
      Partner.find({ _id: { $in: partnerIds } })
        .select("ownerName restaurantName phone documents settings")
        .lean(),
      DeliveryPartner.find({ userId: { $in: deliveryUserIds } })
        .select("userId name phone documents cashBalance pendingDepositAmount")
        .lean()
    ]);

    const partnerMap = new Map(partners.map((partner: any) => [String(partner._id), partner]));
    const deliveryPartnerByUserId = new Map(
      deliveryPartners.map((partner: any) => [String(partner.userId), partner])
    );

    const partnerGroups = new Map<string, any>();
    partnerOrders.forEach((order: any) => {
      const partner = partnerMap.get(String(order.partnerId));
      if (!partner) return;

      const amount = Number(order.itemTotal || 0);
      const key = String(partner._id);
      const bankDetails = getBankDetails(partner, "PARTNER");
      const current = partnerGroups.get(key) || {
        key: `PARTNER-${key}`,
        recipientType: "PARTNER",
        recipientId: key,
        name: partner.restaurantName || "Unknown restaurant",
        secondaryName: partner.ownerName || "",
        phone: partner.phone || "",
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

    const deliveryGroups = new Map<string, any>();
    deliveryOrders.forEach((order: any) => {
      const deliveryPartner = deliveryPartnerByUserId.get(String(order.deliveryPartnerId));
      if (!deliveryPartner) return;

      const grossAmount = Number(order.deliveryFee || 0);
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

    res.json({
      success: true,
      data: {
        periodType,
        periodStart,
        periodEnd,
        totals: {
          partnerAmount: partnerRows.reduce((sum, row) => sum + row.amount, 0),
          partnerCount: partnerRows.length,
          deliveryGrossAmount: deliveryPartnerRows.reduce((sum, row) => sum + row.grossEarnings, 0),
          deliveryCashOffset: deliveryPartnerRows.reduce((sum, row) => sum + row.offsetApplied, 0),
          deliveryCashDueToPlatform: deliveryPartnerRows.reduce((sum, row) => sum + row.cashDueToPlatform, 0),
          deliveryAmount: deliveryPartnerRows.reduce((sum, row) => sum + row.netPayable, 0),
          deliveryCount: deliveryPartnerRows.length,
          totalAmount:
            partnerRows.reduce((sum, row) => sum + row.amount, 0) +
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

    if (!VALID_RECIPIENT_TYPES.has(recipientType)) {
      return res.status(400).json({ success: false, message: "Invalid recipient type" });
    }

    if (!VALID_PERIOD_TYPES.has(periodType)) {
      return res.status(400).json({ success: false, message: "Invalid period type" });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ success: false, message: "Invalid recipient" });
    }

    const periodStart = new Date(req.body.periodStart);
    const periodEnd = new Date(req.body.periodEnd);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart >= periodEnd) {
      return res.status(400).json({ success: false, message: "Invalid payout period" });
    }

    const recipient =
      recipientType === "PARTNER"
        ? await Partner.findById(recipientId).select("ownerName restaurantName phone documents settings").lean()
        : await DeliveryPartner.findById(recipientId).select("userId name phone documents cashBalance").lean();

    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    const orders =
      recipientType === "PARTNER"
        ? await getPayoutOrders("PARTNER", periodStart, periodEnd, recipientId)
        : (
            await getPayoutOrders("DELIVERY_PARTNER", periodStart, periodEnd)
          ).filter((order: any) => String(order.deliveryPartnerId) === String((recipient as any).userId));

    if (!orders.length) {
      return res.status(400).json({ success: false, message: "No unpaid delivered orders found for this payout" });
    }

    const grossAmount = orders.reduce((sum, order: any) => {
      return sum + Number(recipientType === "PARTNER" ? order.itemTotal || 0 : order.deliveryFee || 0);
    }, 0);
    const riderBreakdown =
      recipientType === "DELIVERY_PARTNER"
        ? getRiderPayoutBreakdown(grossAmount, Number((recipient as any).cashBalance || 0))
        : null;
    const amount = riderBreakdown ? riderBreakdown.netPayable : grossAmount;

    if (grossAmount <= 0) {
      return res.status(400).json({ success: false, message: "Payout amount must be greater than zero" });
    }

    const bankSnapshot = getBankDetails(recipient, recipientType);
    const now = new Date();
    const payout = await Payout.create({
      recipientType,
      recipientId,
      recipientSnapshot:
        recipientType === "PARTNER"
          ? {
              name: (recipient as any).restaurantName || "",
              phone: (recipient as any).phone || "",
              secondaryName: (recipient as any).ownerName || ""
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
                : { "deliveryPayout.amount": Number(order.deliveryFee || 0) })
            }
          }
        }
      }))
    );

    if (recipientType === "DELIVERY_PARTNER" && riderBreakdown && riderBreakdown.offsetApplied > 0) {
      await CashLedgerEntry.create({
        deliveryPartnerId: recipientId,
        userId: (recipient as any).userId,
        type: "EARNINGS_OFFSET",
        amount: riderBreakdown.offsetApplied,
        balanceDelta: -riderBreakdown.offsetApplied,
        status: "POSTED",
        payoutId: payout._id,
        note: `Offset against payout #${String(payout._id).slice(-6)}`
      });

      await DeliveryPartner.updateOne(
        { _id: recipientId },
        {
          $inc: { cashBalance: -riderBreakdown.offsetApplied },
          $set: {
            lastCashActivityAt: now,
            lastCashActivityType: "EARNINGS_OFFSET"
          }
        }
      );
    }

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
