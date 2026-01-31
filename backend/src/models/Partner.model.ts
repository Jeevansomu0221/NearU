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
      // Google Maps link is now compulsory
      googleMapsLink: {
        type: String,
        required: true,
        validate: {
          validator: function(v: string) {
            return v.startsWith('https://maps.app.goo.gl/') || 
                   v.startsWith('https://goo.gl/maps/') ||
                   v.startsWith('https://www.google.com/maps/') ||
                   v.startsWith('https://www.google.co.in/maps/');
          },
          message: 'Please provide a valid Google Maps link'
        }
      }
    },
    
    // UPDATE: Add sweets and ice creams to categories
    category: {
      type: String,
      required: true,
      enum: [
        "bakery", 
        "mini-restaurant", 
        "tiffin-center", 
        "fast-food", 
        "sweets",       // ADDED
        "ice-creams",   // ADDED
        "other"
      ]
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
PartnerSchema.index({ 'address.pincode': 1 });
PartnerSchema.index({ 'address.area': 1 });
PartnerSchema.index({ 'address.city': 1 });  // ADDED index for city
PartnerSchema.index({ 'address.state': 1 });

export default model("Partner", PartnerSchema);