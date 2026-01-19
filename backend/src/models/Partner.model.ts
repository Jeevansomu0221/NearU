import { Schema, model, Document, Types } from "mongoose";

export interface IPartner extends Document {
  userId: Types.ObjectId;
  shopName: string;
  categories: string[];
  address: string;
  isActive: boolean;
  createdAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one user → one shop
    },

    shopName: {
      type: String,
      required: true,
    },

    categories: {
      type: [String],
      required: true,
      enum: [
        "tiffin",
        "bakery",
        "fast_food",
        "sweet_shop",
        "mini_restaurant",
      ],
    },

    address: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default model<IPartner>("Partner", PartnerSchema);
