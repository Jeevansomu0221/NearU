import { Schema, model, Types } from "mongoose";

const PayoutSchema = new Schema(
  {
    recipientType: {
      type: String,
      enum: ["PARTNER", "DELIVERY_PARTNER"],
      required: true
    },
    recipientId: {
      type: Types.ObjectId,
      required: true
    },
    recipientSnapshot: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      secondaryName: { type: String, default: "" }
    },
    periodType: {
      type: String,
      enum: ["WEEKLY", "MONTHLY"],
      required: true
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    payoutBreakdown: {
      grossEarnings: { type: Number, default: 0, min: 0 },
      cashHeldBeforeOffset: { type: Number, default: 0, min: 0 },
      offsetApplied: { type: Number, default: 0, min: 0 },
      netPayable: { type: Number, default: 0, min: 0 },
      cashDueAfterOffset: { type: Number, default: 0, min: 0 }
    },
    orderCount: {
      type: Number,
      required: true,
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
      bankDocumentType: { type: String, default: "" },
      upiId: { type: String, default: "" }
    },
    status: {
      type: String,
      enum: ["PAID"],
      default: "PAID",
      required: true
    },
    paidReference: {
      type: String,
      default: ""
    },
    paidNotes: {
      type: String,
      default: ""
    },
    paidAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    paidBy: {
      type: Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

PayoutSchema.index({ recipientType: 1, recipientId: 1, paidAt: -1 });
PayoutSchema.index({ periodType: 1, periodStart: -1 });
PayoutSchema.index({ status: 1, paidAt: -1 });

export default model("Payout", PayoutSchema);
