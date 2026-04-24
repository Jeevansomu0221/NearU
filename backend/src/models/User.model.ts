import { Schema, model, Types } from "mongoose";
import { ROLES } from "../config/roles";

const UserSchema = new Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: Object.values(ROLES), // This will be ["customer", "partner", "admin", "delivery"]
    default: ROLES.CUSTOMER
  },
  // ADD THIS ADDRESS FIELD
  address: {
    recipientName: {
      type: String,
      default: ""
    },
    houseFlatDoorNo: {
      type: String,
      default: ""
    },
    buildingApartmentName: {
      type: String,
      default: ""
    },
    streetRoadName: {
      type: String,
      default: ""
    },
    street: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    pincode: {
      type: String,
      default: ""
    },
    area: {
      type: String,
      default: ""
    },
    landmark: {
      type: String,
      default: ""
    },
    cityTownVillage: {
      type: String,
      default: ""
    },
    district: {
      type: String,
      default: ""
    },
    country: {
      type: String,
      default: "India"
    }
  },
  fcmToken: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

export default model("User", UserSchema);
