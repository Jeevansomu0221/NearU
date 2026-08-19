import { Schema, model } from "mongoose";

const NotificationTokenSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
      trim: true
    },
    app: {
      type: String,
      enum: ["partner"],
      default: "partner"
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web", "unknown"],
      default: "unknown"
    },
    deviceId: {
      type: String,
      default: "",
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    disabledAt: {
      type: Date
    }
  },
  { _id: false }
);

const PartnerStaffSchema = new Schema(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sessionVersion: {
      type: Number,
      default: 0
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    lastLoginIp: {
      type: String,
      default: ""
    },
    lastLoginPlatform: {
      type: String,
      enum: ["web", "app", "unknown"],
      default: "unknown"
    },
    lastOperatorName: {
      type: String,
      default: "",
      trim: true
    },
    revokedOperators: {
      type: [String],
      default: []
    },
    notificationTokens: {
      type: [NotificationTokenSchema],
      default: []
    }
  },
  { timestamps: true }
);

PartnerStaffSchema.index({ username: 1 }, { unique: true });
PartnerStaffSchema.index({ partnerId: 1, isActive: 1 });
PartnerStaffSchema.index({ "notificationTokens.token": 1 });

export default model("PartnerStaff", PartnerStaffSchema);
