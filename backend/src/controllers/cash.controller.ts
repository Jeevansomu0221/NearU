import { Request, Response } from "express";
import mongoose from "mongoose";
import CashLedgerEntry from "../models/CashLedgerEntry.model";
import DeliveryPartner from "../models/DeliveryPartner.model";

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

export const getMyCashLedger = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const deliveryPartner = await findDeliveryPartnerForUser(user)?.lean();
    if (!deliveryPartner) {
      return res.status(404).json({ success: false, message: "Delivery profile not found" });
    }

    const entries = await CashLedgerEntry.find({ deliveryPartnerId: deliveryPartner._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const totalCodReturned = entries
      .filter((entry) => entry.type === "CASH_DEPOSIT_VERIFIED")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    res.json({
      success: true,
      data: {
        cashBalance: Number(deliveryPartner.cashBalance || 0),
        pendingDepositAmount: Number(deliveryPartner.pendingDepositAmount || 0),
        totalCodReturned,
        entries
      }
    });
  } catch (error: any) {
    console.error("getMyCashLedger error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch cash ledger" });
  }
};

export const submitCashDeposit = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const deliveryPartner = await findDeliveryPartnerForUser(user);
    if (!deliveryPartner) {
      return res.status(404).json({ success: false, message: "Delivery profile not found" });
    }

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Deposit amount must be greater than zero" });
    }

    const cashBalance = Number(deliveryPartner.cashBalance || 0);
    if (amount > cashBalance) {
      return res.status(400).json({ success: false, message: "Deposit amount cannot exceed current cash balance" });
    }

    const entry = await CashLedgerEntry.create({
      deliveryPartnerId: deliveryPartner._id,
      userId: deliveryPartner.userId,
      type: "CASH_DEPOSIT_SUBMITTED",
      amount,
      balanceDelta: 0,
      status: "PENDING",
      reference: String(req.body.reference || "").trim(),
      proofUrl: String(req.body.proofUrl || "").trim(),
      note: String(req.body.note || "").trim()
    });

    deliveryPartner.pendingDepositAmount = Number(deliveryPartner.pendingDepositAmount || 0) + amount;
    deliveryPartner.lastCashActivityAt = new Date();
    deliveryPartner.lastCashActivityType = "CASH_DEPOSIT_SUBMITTED";
    await deliveryPartner.save();

    res.status(201).json({
      success: true,
      data: entry,
      message: "Cash deposit submitted for admin verification"
    });
  } catch (error: any) {
    console.error("submitCashDeposit error:", error);
    res.status(500).json({ success: false, message: "Failed to submit cash deposit" });
  }
};

export const getAdminCashDeposits = async (req: AuthRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const status = String(req.query.status || "PENDING").toUpperCase();
    const validStatuses = new Set(["PENDING", "VERIFIED", "REJECTED", "ALL"]);
    if (!validStatuses.has(status)) {
      return res.status(400).json({ success: false, message: "Invalid deposit status" });
    }

    const query: Record<string, unknown> = { type: "CASH_DEPOSIT_SUBMITTED" };
    if (status !== "ALL") query.status = status;

    const deposits = await CashLedgerEntry.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("deliveryPartnerId", "name phone cashBalance pendingDepositAmount")
      .populate("userId", "name phone email")
      .lean();

    res.json({ success: true, data: deposits });
  } catch (error: any) {
    console.error("getAdminCashDeposits error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch cash deposits" });
  }
};

export const verifyCashDeposit = async (req: AuthRequest, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const depositId = String(req.params.depositId || "");
    if (!mongoose.Types.ObjectId.isValid(depositId)) {
      return res.status(400).json({ success: false, message: "Invalid deposit" });
    }

    const deposit = await CashLedgerEntry.findOne({
      _id: depositId,
      type: "CASH_DEPOSIT_SUBMITTED",
      status: "PENDING"
    });
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Pending deposit not found" });
    }

    const deliveryPartner = await DeliveryPartner.findById(deposit.deliveryPartnerId);
    if (!deliveryPartner) {
      return res.status(404).json({ success: false, message: "Delivery profile not found" });
    }

    const amount = Number(deposit.amount || 0);
    const balanceReduction = Math.min(amount, Number(deliveryPartner.cashBalance || 0));
    const now = new Date();

    const verifiedEntry = await CashLedgerEntry.create({
      deliveryPartnerId: deliveryPartner._id,
      userId: deliveryPartner.userId,
      type: "CASH_DEPOSIT_VERIFIED",
      amount,
      balanceDelta: -balanceReduction,
      status: "POSTED",
      relatedEntryId: deposit._id,
      reference: String(req.body.reference || deposit.reference || "").trim(),
      proofUrl: deposit.proofUrl || "",
      note: String(req.body.note || deposit.note || "").trim(),
      reviewedBy: admin.id,
      reviewedAt: now
    });

    deposit.status = "VERIFIED";
    deposit.reviewedBy = new mongoose.Types.ObjectId(admin.id);
    deposit.reviewedAt = now;
    deposit.relatedEntryId = verifiedEntry._id;
    await deposit.save();

    deliveryPartner.cashBalance = Math.max(Number(deliveryPartner.cashBalance || 0) - balanceReduction, 0);
    deliveryPartner.pendingDepositAmount = Math.max(Number(deliveryPartner.pendingDepositAmount || 0) - amount, 0);
    deliveryPartner.lastCashActivityAt = now;
    deliveryPartner.lastCashActivityType = "CASH_DEPOSIT_VERIFIED";
    await deliveryPartner.save();

    res.json({
      success: true,
      data: { deposit, verifiedEntry },
      message: "Cash deposit verified"
    });
  } catch (error: any) {
    console.error("verifyCashDeposit error:", error);
    res.status(500).json({ success: false, message: "Failed to verify cash deposit" });
  }
};

export const rejectCashDeposit = async (req: AuthRequest, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const depositId = String(req.params.depositId || "");
    if (!mongoose.Types.ObjectId.isValid(depositId)) {
      return res.status(400).json({ success: false, message: "Invalid deposit" });
    }

    const deposit = await CashLedgerEntry.findOne({
      _id: depositId,
      type: "CASH_DEPOSIT_SUBMITTED",
      status: "PENDING"
    });
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Pending deposit not found" });
    }

    await DeliveryPartner.updateOne(
      { _id: deposit.deliveryPartnerId },
      {
        $inc: { pendingDepositAmount: -Number(deposit.amount || 0) },
        $set: {
          lastCashActivityAt: new Date(),
          lastCashActivityType: "CASH_DEPOSIT_REJECTED"
        }
      }
    );

    deposit.status = "REJECTED";
    deposit.reviewedBy = new mongoose.Types.ObjectId(admin.id);
    deposit.reviewedAt = new Date();
    deposit.rejectionReason = String(req.body.rejectionReason || "Deposit rejected").trim();
    await deposit.save();

    res.json({
      success: true,
      data: deposit,
      message: "Cash deposit rejected"
    });
  } catch (error: any) {
    console.error("rejectCashDeposit error:", error);
    res.status(500).json({ success: false, message: "Failed to reject cash deposit" });
  }
};
