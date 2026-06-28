import { Schema, model, Types } from "mongoose";

const WithdrawalRequestSchema = new Schema(
  {
    deliveryPartnerId: {
      type: Types.ObjectId,
      ref: "DeliveryPartner",
      required: true,
      index: true
    },
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    grossEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    cashOffset: {
      type: Number,
      default: 0,
      min: 0
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0
    },
    orderIds: {
      type: [Types.ObjectId],
      ref: "Order",
      default: []
    },
    bankSnapshot: {
      accountHolderName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      upiId: { type: String, default: "" }
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "REJECTED"],
      default: "PENDING",
      index: true
    },
    payoutId: {
      type: Types.ObjectId,
      ref: "Payout"
    },
    paidReference: {
      type: String,
      default: ""
    },
    paidNotes: {
      type: String,
      default: ""
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    reviewedBy: {
      type: Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

WithdrawalRequestSchema.index({ deliveryPartnerId: 1, status: 1, createdAt: -1 });

export default model("WithdrawalRequest", WithdrawalRequestSchema);
