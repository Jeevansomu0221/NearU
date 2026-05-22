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
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    shopDescription: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      required: true,
      unique: true
    },
    
    // ADD THIS: Shop profile image
    shopImageUrl: {
      type: String,
      default: ""
    },
    bannerImageUrl: {
      type: String,
      default: ""
    },
    
    // Detailed address structure as requested
    address: {
      state: {
        type: String,
        required: true,
        trim: true
      },
      city: {  // ADDED: City/Town field
        type: String,
        required: true,
        trim: true
      },
      pincode: {
        type: String,
        required: true,
        validate: {
          validator: function(v: string) {
            return /^\d{6}$/.test(v);
          },
          message: 'Pincode must be 6 digits'
        },
        trim: true
      },
      area: {
        type: String,
        required: true,
        trim: true
      },
      colony: {
        type: String,
        required: true,
        trim: true
      },
      roadStreet: {
        type: String,
        required: true,
        trim: true
      },
      nearbyPlaces: [{
        type: String,
        trim: true
      }],
      // Google Maps link is optional. Partners can either paste a maps share
      // link (we'll parse lat/lng out of it) or use the in-app "Use my shop
      // location" button which sends coordinates directly.
      googleMapsLink: {
        type: String,
        default: "",
        trim: true
      }
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    
    // UPDATE: Add sweets and ice creams to categories
    category: {
      type: String,
      required: true,
      enum: [
        "bakery", 
        "mini-restaurant", 
        "grocery",
        "tiffin-center", 
        "fast-food", 
        "sweets",       // ADDED
        "ice-creams",   // ADDED
        "juice",
        "other"
      ]
    },
    // ADD THIS: User reference for authentication - REMOVE unique constraint
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // REMOVED: unique: true - This causes duplicate key error for null values
      // Index is declared once below with a partial filter.
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
    weeklyHolidays: {
      type: [String],
      default: []
    },
    rating: {
      type: Number,
      default: 4
    },
    documents: {
      fssaiNumber: String,
      fssaiUrl: String,
      panNumber: String,
      panFrontUrl: String,
      aadhaarNumber: String,
      aadhaarFrontUrl: String,
      aadhaarBackUrl: String,
      gstUrl: String,
      shopLicenseUrl: String,
      ownerIdProofUrl: String,
      ownerPanUrl: String,
      bankProofUrl: String,
      bankDocumentType: {
        type: String,
        enum: ["cheque", "passbook", "statement", ""],
        default: ""
      },
      bankAccountHolderName: String,
      bankAccountNumber: String,
      bankIfsc: String,
      addressProofUrl: String,
      menuProofUrl: String,
      restaurantPhotosUrls: [String],
      operatingHoursNote: String,
      // ADD THIS: Document submission tracking
      submittedAt: Date,
      isComplete: { type: Boolean, default: false },
      // Per-document re-upload flags set by admin; partner app shows "Re-upload required" when true.
      reuploadFlags: {
        fssaiUrl: { type: Boolean, default: false },
        panFrontUrl: { type: Boolean, default: false },
        aadhaarFrontUrl: { type: Boolean, default: false },
        aadhaarBackUrl: { type: Boolean, default: false },
        bankProofUrl: { type: Boolean, default: false },
        addressProofUrl: { type: Boolean, default: false },
        gstUrl: { type: Boolean, default: false },
        shopLicenseUrl: { type: Boolean, default: false },
        ownerPanUrl: { type: Boolean, default: false },
        menuProofUrl: { type: Boolean, default: false }
      },
      reuploadNotes: { type: String, default: "" }
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
    },
    settings: {
      autoAcceptOrders: { type: Boolean, default: false },
      estimatedPrepTime: { type: Number, default: 20, min: 1 },
      deliveryMode: { type: String, enum: ["self", "platform"], default: "platform" },
      deliveryRadiusKm: { type: Number, default: 3, min: 0.5 },
      minimumOrderAmount: { type: Number, default: 0, min: 0 },
      upiId: { type: String, default: "" }
    },
    notifications: {
      newOrderAlerts: { type: Boolean, default: true },
      paymentAlerts: { type: Boolean, default: true },
      promotionalNotifications: { type: Boolean, default: false }
    },
    language: {
      type: String,
      enum: ["en", "hi", "ta", "te", "kn", "ml", "mr"],
      default: "en"
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
PartnerSchema.index({ location: "2dsphere" });
// Index for location-based queries
PartnerSchema.index({ 'address.pincode': 1 });
PartnerSchema.index({ 'address.area': 1 });
PartnerSchema.index({ 'address.city': 1 });  // ADDED index for city
PartnerSchema.index({ 'address.state': 1 });

export default model("Partner", PartnerSchema);
