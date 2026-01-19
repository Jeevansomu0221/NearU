// src/models/Order.model.ts
import { Schema, model, Types } from "mongoose";

const OrderSchema = new Schema(
  {
    customerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    deliveryAddress: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },

    totalAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default model("Order", OrderSchema);
