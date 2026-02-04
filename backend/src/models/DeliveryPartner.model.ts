import mongoose, { Schema, Document } from "mongoose";

export interface IDeliveryPartner extends Document {
  userId: mongoose.Types.ObjectId;
  phone: string;
  name: string;
  email?: string;
  vehicleType: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  isAvailable: boolean;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
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
    vehicleType: {
      type: String,
      enum: ["Bike", "Cycle", "Car", "Scooter", "Motorcycle"],
      default: "Bike"
    },
    vehicleNumber: {
      type: String
    },
    licenseNumber: {
      type: String
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE"
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