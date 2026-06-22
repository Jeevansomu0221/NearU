import { Schema, model } from "mongoose";

const OtpSessionSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true
    },
    channel: {
      type: String,
      enum: ["sms", "voice"],
      default: "sms"
    },
    attempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

OtpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("OtpSession", OtpSessionSchema);
