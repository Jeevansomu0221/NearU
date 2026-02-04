// NEARU/backend/src/models/Order.model.ts
import { Schema, model, Types } from "mongoose";

const OrderSchema = new Schema({
  // Order type is always "SHOP" now
  orderType: {
    type: String,
    enum: ["SHOP"],
    default: "SHOP",
    required: true
  },

  customerId: {
    type: Types.ObjectId,
    ref: "User",
    required: true
  },

  partnerId: {
    type: Types.ObjectId,
    ref: "Partner",
    required: true
  },

  deliveryPartnerId: {
    type: Types.ObjectId,
    ref: "User"
  },

  deliveryAddress: {
    type: String,
    required: true
  },

  note: {
    type: String,
    default: ""
  },

  items: [
    {
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      menuItemId: {
        type: Types.ObjectId,
        ref: "MenuItem",
        required: true
      }
    }
  ],

  itemTotal: {
    type: Number,
    required: true,
    min: 0
  },

  deliveryFee: {
    type: Number,
    required: true,
    default: 49
  },

  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },

  // Payment Information
  paymentId: {
    type: String,  // Payment gateway transaction ID
  },

  paymentMethod: {
    type: String,
    enum: ["RAZORPAY", "CASH_ON_DELIVERY", "CARD", "UPI", "WALLET"],
    default: "RAZORPAY"
  },

  paymentStatus: {
    type: String,
    enum: [
      "PENDING",                 // Payment pending for online payments
      "PAYMENT_PENDING_DELIVERY", // COD - payment pending until delivery
      "PAID",                   // Payment completed
      "FAILED",                 // Payment failed
      "REFUNDED",               // Payment refunded
      "CANCELLED"               // Payment cancelled
    ],
    default: "PENDING"
  },

  razorpayOrderId: {
    type: String,  // Razorpay order ID
  },

  razorpayPaymentId: {
    type: String,  // Razorpay payment ID
  },

  razorpaySignature: {
    type: String,  // Razorpay signature for verification
  },

  // Order Status - UPDATED TO INCLUDE "PENDING"
  status: {
    type: String,
    enum: [
      "PENDING",         // Payment pending for online payments
      "CONFIRMED",       // Order placed by customer (payment successful or COD)
      "ACCEPTED",        // Partner accepted order
      "PREPARING",       // Partner preparing food
      "READY",          // Food ready for pickup
      "ASSIGNED",       // Delivery partner assigned
      "PICKED_UP",      // Delivery picked up order
      "DELIVERED",      // Order delivered to customer
      "CANCELLED",      // Order cancelled
      "REJECTED"        // Partner rejected order
    ],
    default: "PENDING"
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ partnerId: 1, createdAt: -1 });
OrderSchema.index({ deliveryPartnerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ razorpayOrderId: 1 });

export default model("Order", OrderSchema);