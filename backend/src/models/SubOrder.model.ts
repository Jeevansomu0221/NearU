// src/models/SubOrder.model.ts
import { Schema, model, Types } from "mongoose";

const SubOrderSchema = new Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
    },

    partnerId: {
      type: Types.ObjectId,
      ref: "Partner",
      required: true,
    },

    items: [
      {
        name: String,
        quantity: Number,
      },
    ],

    status: {
      type: String,
      enum: [
        "ASSIGNED",
        "ACCEPTED",
        "REJECTED",
        "PREPARING",
        "READY",
      ],
      default: "ASSIGNED",
    },

    price: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default model("SubOrder", SubOrderSchema);
