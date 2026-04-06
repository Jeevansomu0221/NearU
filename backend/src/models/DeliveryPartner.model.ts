import mongoose, { Schema, Document } from "mongoose";

export interface IDeliveryPartner extends Document {
  userId: mongoose.Types.ObjectId;
  phone: string;
  name: string;
  email?: string;
  address?: string;
  vehicleType: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  reviewComment?: string;
  documents?: {
    aadhaarUrl?: string;
    panUrl?: string;
    drivingLicenseUrl?: string;
    vehicleRcUrl?: string;
    insuranceUrl?: string;
    cancelledChequeUrl?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    submittedAt?: Date;
    isComplete?: boolean;
  };
  isAvailable: boolean;
  status: "PENDING" | "VERIFIED" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "INACTIVE";
  totalDeliveries: number;
  totalEarnings: number;
  currentLocation?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String
    },
    address: {
      type: String,
      default: ""
    },
    vehicleType: {
      type: String,
      enum: ["Bike", "Cycle", "Scooter", "Motorcycle"],
      default: "Bike"
    },
    vehicleNumber: {
      type: String
    },
    licenseNumber: {
      type: String
    },
    profilePhotoUrl: {
      type: String,
      default: ""
    },
    reviewComment: {
      type: String,
      default: ""
    },
    documents: {
      aadhaarUrl: { type: String, default: "" },
      panUrl: { type: String, default: "" },
      drivingLicenseUrl: { type: String, default: "" },
      vehicleRcUrl: { type: String, default: "" },
      insuranceUrl: { type: String, default: "" },
      cancelledChequeUrl: { type: String, default: "" },
      bankAccountNumber: { type: String, default: "" },
      bankIfsc: { type: String, default: "" },
      submittedAt: { type: Date, default: null },
      isComplete: { type: Boolean, default: false }
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "ACTIVE", "REJECTED", "SUSPENDED", "INACTIVE"],
      default: "PENDING"
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    currentLocation: {
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
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create geospatial index for location queries
DeliveryPartnerSchema.index({ currentLocation: "2dsphere" });

const DeliveryPartner = mongoose.model<IDeliveryPartner>(
  "DeliveryPartner",
  DeliveryPartnerSchema
);

export default DeliveryPartner;
