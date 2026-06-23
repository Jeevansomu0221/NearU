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

  deliveryBundleId: {
    type: String,
    trim: true,
    default: ""
  },

  deliveryBundleSize: {
    type: Number,
    default: 1,
    min: 1
  },

  deliveryBundleSequence: {
    type: Number,
    default: 1,
    min: 1
  },

  deliveryRejectedBy: {
    type: [Types.ObjectId],
    ref: "User",
    default: []
  },

  selfDelivery: {
    mode: {
      type: String,
      enum: ["self", "platform"],
      default: "platform"
    },
    reservedFor: {
      type: [Types.ObjectId],
      ref: "User",
      default: []
    },
    rejectedBy: {
      type: [Types.ObjectId],
      ref: "User",
      default: []
    },
    expiresAt: {
      type: Date
    },
    fallbackReleasedAt: {
      type: Date
    }
  },

  deliveryAddress: {
    type: String,
    required: true
  },

  deliveryLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
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
    default: 0
  },

  foodGst: {
    type: Number,
    default: 0,
    min: 0
  },

  deliveryGst: {
    type: Number,
    default: 0,
    min: 0
  },

  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },

  taxDiscount: {
    type: Number,
    default: 0,
    min: 0
  },

  riderToShopDistanceKm: {
    type: Number,
    default: 0,
    min: 0
  },

  shopToCustomerDistanceKm: {
    type: Number,
    default: 0,
    min: 0
  },

  deliveryDistanceKm: {
    type: Number,
    default: 0,
    min: 0
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
    enum: ["RAZORPAY", "CASH_ON_DELIVERY", "UPI_AT_DELIVERY", "CARD", "UPI", "WALLET"],
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

  deliveryQr: {
    razorpayQrId: {
      type: String,
      default: ""
    },
    imageUrl: {
      type: String,
      default: ""
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    createdAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    paidAt: {
      type: Date
    },
    paymentId: {
      type: String,
      default: ""
    },
    qrType: {
      type: String,
      enum: ["upi_qr", "payment_link"],
      default: "upi_qr"
    }
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
  },

  cancellationReason: {
    type: String,
    default: ""
  },

  customerCancellationMessage: {
    type: String,
    default: ""
  },

  deliveryReadyAt: {
    type: Date
  },

  autoCancelledAt: {
    type: Date
  },

  deliveredAt: {
    type: Date
  },

  restaurantRating: {
    foodQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    packaging: {
      type: Number,
      min: 1,
      max: 5
    },
    overallExperience: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },

  deliveryRating: {
    deliverySpeed: {
      type: Number,
      min: 1,
      max: 5
    },
    partnerBehavior: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },

  ratingSubmittedAt: {
    type: Date
  },

  codCollection: {
    collectedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    collectedAt: {
      type: Date
    },
    collectedBy: {
      type: Types.ObjectId,
      ref: "User"
    },
    cashLedgerEntryId: {
      type: Types.ObjectId,
      ref: "CashLedgerEntry"
    }
  },

  partnerPayout: {
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING"
    },
    payoutId: {
      type: Types.ObjectId,
      ref: "Payout"
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    settledAt: {
      type: Date
    }
  },

  deliveryPayout: {
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING"
    },
    payoutId: {
      type: Types.ObjectId,
      ref: "Payout"
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    settledAt: {
      type: Date
    }
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
OrderSchema.index({ status: 1, deliveredAt: -1 });
OrderSchema.index({ "partnerPayout.status": 1, deliveredAt: -1 });
OrderSchema.index({ "deliveryPayout.status": 1, deliveredAt: -1 });
OrderSchema.index({ razorpayOrderId: 1 });
OrderSchema.index({ status: 1, deliveryReadyAt: 1 });
OrderSchema.index({ deliveryRejectedBy: 1, status: 1 });
OrderSchema.index({ deliveryLocation: "2dsphere" });
OrderSchema.index({ "selfDelivery.expiresAt": 1 });
OrderSchema.index({ "selfDelivery.reservedFor": 1, status: 1 });
OrderSchema.index({ deliveryBundleId: 1, deliveryBundleSequence: 1 });
OrderSchema.index({ deliveryBundleId: 1, status: 1 });
OrderSchema.index({ customerId: 1, ratingSubmittedAt: -1 });

export default model("Order", OrderSchema);