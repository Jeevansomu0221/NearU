import { Schema, model } from "mongoose";

const PartnerStaffLoginActivitySchema = new Schema(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
      index: true
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "PartnerStaff",
      required: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    displayName: {
      type: String,
      default: ""
    },
    event: {
      type: String,
      enum: ["login", "logout", "failed_login"],
      required: true
    },
    success: {
      type: Boolean,
      default: true
    },
    ip: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    },
    platform: {
      type: String,
      enum: ["web", "app", "unknown"],
      default: "unknown"
    },
    message: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

PartnerStaffLoginActivitySchema.index({ partnerId: 1, createdAt: -1 });
PartnerStaffLoginActivitySchema.index({ staffId: 1, createdAt: -1 });

export default model("PartnerStaffLoginActivity", PartnerStaffLoginActivitySchema);
