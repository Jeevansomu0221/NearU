import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name?: string;
  phone: string;
  role: "customer" | "partner" | "delivery" | "admin";
  isVerified: boolean;
  otp?: string;
  otpExpiresAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["customer", "partner", "delivery", "admin"],
      default: "customer",
    },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
otpExpiresAt: { type: Date }

  },
  { timestamps: true }
);

export default model<IUser>("User", UserSchema);
