import { Schema, model, Types } from "mongoose";

const OrderSchema = new Schema(
  {
    customerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true
    },

    deliveryAddress: {
      type: String,
      required: true
    },

    note: {
      type: String,
      required: true   // ✅ custom order text
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "CONFIRMED",
        "DELIVERING",
        "DELIVERED",
        "CANCELLED"
      ],
      default: "CREATED"
    }
  },
  { timestamps: true }
);

export default model("Order", OrderSchema);
