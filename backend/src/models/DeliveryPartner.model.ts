import { Schema, model, Types } from "mongoose";

const DeliveryPartnerSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default model("DeliveryPartner", DeliveryPartnerSchema);
