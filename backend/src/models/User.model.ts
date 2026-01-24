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
    enum: Object.values(ROLES),
    default: ROLES.CUSTOMER
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