import { Schema, model, Types } from "mongoose";

const PartnerSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ["bakery", "tiffin", "fast-food", "restaurant", "geverage", "other"],
    required: true
  },
  address: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [0, 0]
    }
  },
  phone: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false // Requires admin approval
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  openingTime: {
    type: String,
    default: "09:00"
  },
  closingTime: {
    type: String,
    default: "22:00"
  },
  deliveryRadius: {
    type: Number, // in kilometers
    default: 5
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  logo: {
    type: String
  },
  documents: {
    gst: String,
    fssai: String,
    tradeLicense: String
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
PartnerSchema.index({ location: "2dsphere" });

export default model("Partner", PartnerSchema);