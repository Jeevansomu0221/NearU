import { Schema, model, Types } from "mongoose";

export interface IPartner {
  userId: Types.ObjectId;
  shopName: string;
  category: string;   // ✅ ADD THIS
  address: string;
  isActive: boolean;
}

const PartnerSchema = new Schema<IPartner>(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true
    },
    shopName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true   // Tiffin, Bakery, etc.
    },
    address: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default model<IPartner>("Partner", PartnerSchema);
