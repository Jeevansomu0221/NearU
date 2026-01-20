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
    "CREATED",
    "ACCEPTED",
    "REJECTED",
    "PREPARING",
    "READY",
    "PICKED_UP",
    "DELIVERED"
  ],
  default: "CREATED"
},

    price: {
      type: Number,
      required: false,
    },
  },
  { timestamps: true }
);

export default model("SubOrder", SubOrderSchema);
