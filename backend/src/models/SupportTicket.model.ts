import { Schema, model } from "mongoose";

const SupportMessageSchema = new Schema({
  senderRole: {
    type: String,
    enum: ["customer", "admin"],
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  }
}, {
  timestamps: true
});

const SupportTicketSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: "Order"
  },
  category: {
    type: String,
    enum: ["CUSTOMER_SUPPORT", "ORDER", "PAYMENT", "DELIVERY", "ACCOUNT", "REPORT_ISSUE", "OTHER"],
    default: "CUSTOMER_SUPPORT",
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  status: {
    type: String,
    enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
    default: "OPEN",
    index: true
  },
  priority: {
    type: String,
    enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
    default: "NORMAL"
  },
  messages: {
    type: [SupportMessageSchema],
    default: []
  },
  lastCustomerMessageAt: {
    type: Date,
    default: Date.now
  },
  lastAdminMessageAt: {
    type: Date
  }
}, {
  timestamps: true
});

SupportTicketSchema.index({ updatedAt: -1 });

export default model("SupportTicket", SupportTicketSchema);
