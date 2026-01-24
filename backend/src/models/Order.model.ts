import { Schema, model, Types } from "mongoose";

const OrderSchema = new Schema({
  orderType: {
    type: String,
    enum: ["SHOP", "CUSTOM"],
    required: true
  },

  customerId: {
    type: Types.ObjectId,
    ref: "User",
    required: true
  },

  partnerId: {
    type: Types.ObjectId,
    ref: "Partner"
  },

  deliveryPartnerId: {
    type: Types.ObjectId,
    ref: "User"
  },

  deliveryAddress: {
    type: String,
    required: true
  },

  note: String, // custom order text OR instructions

  items: [
    {
      name: String,
      quantity: Number,
      price: Number
    }
  ],

  itemTotal: Number,
  deliveryFee: Number,
  grandTotal: Number,

  paymentStatus: {
    type: String,
    enum: ["PENDING", "PAID", "FAILED"],
    default: "PENDING"
  },

  status: {
    type: String,
    enum: [
      "CREATED",          // customer placed
      "PRICED",           // admin priced (CUSTOM)
      "CONFIRMED",        // customer accepted
      "ASSIGNED",         // delivery assigned
      "PICKED_UP",
      "DELIVERED",
      "CANCELLED"
    ],
    default: "CREATED"
  }
}, { timestamps: true });


export default model("Order", OrderSchema);
