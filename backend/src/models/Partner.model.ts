import { Schema, model } from "mongoose";

const PartnerSchema = new Schema(
  {
    ownerName: {
      type: String,
      required: true
    },
    restaurantName: {
      type: String,
      required: true
    },
    // ALIAS FOR CUSTOMER SIDE (FIXES ERROR)
    shopName: {
      type: String
    },
    phone: {
      type: String,
      required: true,
      unique: true
    },
    
    // DETAILED ADDRESS FIELDS
    address: {
      type: String,
      required: true
    },
    // Detailed address components
    addressLine1: {
      type: String,
      required: true
    },
    addressLine2: {
      type: String,
      default: ""
    },
    areaColony: {
      type: String,
      required: true
    },
    landmark: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^\d{6}$/.test(v);
        },
        message: 'Pincode must be 6 digits'
      }
    },
    roadNo: {
      type: String,
      default: ""
    },
    
    // Google Maps link is now compulsory
    googleMapsLink: {
      type: String,
      required: true
    },
    
    category: {
      type: String,
      required: true,
      enum: ["bakery", "mini-restaurant", "tiffin-center", "fast-food", "cafe", "dessert-parlor", "other"]
    },
    // ADD THIS: User reference for authentication - REMOVE unique constraint
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // REMOVED: unique: true - This causes duplicate key error for null values
      index: { sparse: true } // This allows multiple null values
    },
    // SHOP STATUS
    isOpen: {
      type: Boolean,
      default: true
    },
    openingTime: {
      type: String,
      default: "08:00"
    },
    closingTime: {
      type: String,
      default: "22:00"
    },
    rating: {
      type: Number,
      default: 4
    },
    documents: {
      fssaiUrl: String,
      shopLicenseUrl: String,
      idProofUrl: String,
      // ADD THIS: Document submission tracking
      submittedAt: Date,
      isComplete: { type: Boolean, default: false }
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING"
    },
    // ADD THIS: Approval tracking
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: Date,
    rejectionReason: String,
    // ADD THIS: Setup completion tracking
    hasCompletedSetup: {
      type: Boolean,
      default: false
    },
    setupCompletedAt: Date,
    // ADD THIS: Menu items count
    menuItemsCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Optional: Add a partial index for userId (only enforce uniqueness when userId is not null)
PartnerSchema.index(
  { userId: 1 },
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { userId: { $ne: null } } // Only enforce uniqueness when userId is not null
  }
);

// Index for faster status queries
PartnerSchema.index({ status: 1 });
PartnerSchema.index({ phone: 1 });
// Index for location-based queries
PartnerSchema.index({ city: 1, state: 1 });
PartnerSchema.index({ pincode: 1 });

export default model("Partner", PartnerSchema);