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
    aadhaarNumber?: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    aadhaarUrl?: string;
    panNumber?: string;
    panFrontUrl?: string;
    panUrl?: string;
    drivingLicenseFrontUrl?: string;
    drivingLicenseBackUrl?: string;
    drivingLicenseUrl?: string;
    vehicleRcFrontUrl?: string;
    vehicleRcBackUrl?: string;
    vehicleRcUrl?: string;
    insuranceUrl?: string;
    bankDocumentType?: "cheque" | "passbook" | "statement" | "";
    bankAccountHolderName?: string;
    cancelledChequeUrl?: string;
    bankPassbookUrl?: string;
    bankStatementUrl?: string;
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
      aadhaarNumber: { type: String, default: "" },
      aadhaarFrontUrl: { type: String, default: "" },
      aadhaarBackUrl: { type: String, default: "" },
      aadhaarUrl: { type: String, default: "" },
      panNumber: { type: String, default: "" },
      panFrontUrl: { type: String, default: "" },
      panUrl: { type: String, default: "" },
      drivingLicenseFrontUrl: { type: String, default: "" },
      drivingLicenseBackUrl: { type: String, default: "" },
      drivingLicenseUrl: { type: String, default: "" },
      vehicleRcFrontUrl: { type: String, default: "" },
      vehicleRcBackUrl: { type: String, default: "" },
      vehicleRcUrl: { type: String, default: "" },
      insuranceUrl: { type: String, default: "" },
      bankDocumentType: { type: String, enum: ["cheque", "passbook", "statement", ""], default: "" },
      bankAccountHolderName: { type: String, default: "" },
      cancelledChequeUrl: { type: String, default: "" },
      bankPassbookUrl: { type: String, default: "" },
      bankStatementUrl: { type: String, default: "" },
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
