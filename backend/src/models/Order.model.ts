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

  paymentStatus: {
    type: String,
    enum: ["PAID", "FAILED", "REFUNDED"],
    default: "PAID"
  },

  status: {
    type: String,
    enum: [
      "CONFIRMED",        // Order placed by customer
      "ACCEPTED",         // Partner accepted order
      "PREPARING",        // Partner preparing food
      "READY",           // Food ready for pickup
      "ASSIGNED",        // Delivery partner assigned
      "PICKED_UP",       // Delivery picked up order
      "DELIVERED",       // Order delivered to customer
      "CANCELLED",       // Order cancelled
      "REJECTED"         // Partner rejected order
    ],
    default: "CONFIRMED"
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ partnerId: 1, createdAt: -1 });
OrderSchema.index({ deliveryPartnerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export default model("Order", OrderSchema);