import { Schema, model, Types } from "mongoose";

const CashLedgerEntrySchema = new Schema(
  {
    deliveryPartnerId: {
      type: Types.ObjectId,
      ref: "DeliveryPartner",
      required: true
    },
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["COD_COLLECTED", "EARNINGS_OFFSET", "CASH_DEPOSIT_SUBMITTED", "CASH_DEPOSIT_VERIFIED"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    balanceDelta: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["POSTED", "PENDING", "VERIFIED", "REJECTED"],
      default: "POSTED",
      required: true
    },
    orderId: {
      type: Types.ObjectId,
      ref: "Order"
    },
    payoutId: {
      type: Types.ObjectId,
      ref: "Payout"
    },
    relatedEntryId: {
      type: Types.ObjectId,
      ref: "CashLedgerEntry"
    },
    reference: {
      type: String,
      default: ""
    },
    proofUrl: {
      type: String,
      default: ""
    },
    note: {
      type: String,
      default: ""
    },
    reviewedBy: {
      type: Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

CashLedgerEntrySchema.index({ deliveryPartnerId: 1, createdAt: -1 });
CashLedgerEntrySchema.index({ userId: 1, createdAt: -1 });
CashLedgerEntrySchema.index({ type: 1, status: 1, createdAt: -1 });
CashLedgerEntrySchema.index({ orderId: 1, type: 1 }, { sparse: true });

export default model("CashLedgerEntry", CashLedgerEntrySchema);
