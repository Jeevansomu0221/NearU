import { Schema, model, Types } from "mongoose";

export type AccountDeletionAppRole = "partner" | "delivery";
export type AccountDeletionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

const PayoutCheckSchema = new Schema(
  {
    pendingPayoutAmount: { type: Number, default: 0, min: 0 },
    pendingPayoutOrderCount: { type: Number, default: 0, min: 0 },
    pendingWithdrawals: { type: Number, default: 0, min: 0 },
    cashBalance: { type: Number, default: 0, min: 0 },
    pendingDepositAmount: { type: Number, default: 0, min: 0 },
    activeOrders: { type: Number, default: 0, min: 0 },
    hasOutstandingPayouts: { type: Boolean, default: false },
    checkedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const AccountDeletionRequestSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    appRole: {
      type: String,
      enum: ["partner", "delivery"],
      required: true,
      index: true
    },
    profileId: {
      type: Types.ObjectId,
      required: true,
      index: true
    },
    reasonCategory: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    codBalanceAcknowledged: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true
    },
    snapshot: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      businessName: { type: String, default: "" }
    },
    payoutCheck: {
      type: PayoutCheckSchema,
      default: () => ({})
    },
    reviewedBy: {
      type: Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },
  { timestamps: true }
);

AccountDeletionRequestSchema.index({ appRole: 1, status: 1, createdAt: -1 });
AccountDeletionRequestSchema.index(
  { userId: 1, appRole: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" }
  }
);

export default model("AccountDeletionRequest", AccountDeletionRequestSchema);
