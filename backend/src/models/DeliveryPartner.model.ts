// src/models/Delivery.model.ts
import { Schema, model, Types } from "mongoose";

const DeliverySchema = new Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
    },

    deliveryPartnerId: {
      type: Types.ObjectId,
      ref: "User",
    },

    pickupPartners: [
      {
        type: Types.ObjectId,
        ref: "Partner",
      },
    ],

    status: {
      type: String,
      enum: ["ASSIGNED", "PICKING", "DELIVERED"],
      default: "ASSIGNED",
    },
  },
  { timestamps: true }
);

export default model("Delivery", DeliverySchema);
