import { Schema, model, Types } from "mongoose";

const DeliveryJobSchema = new Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true
    },

    deliveryPartnerId: {
      type: Types.ObjectId,
      ref: "DeliveryPartner",
      required: true
    },

    status: {
      type: String,
      enum: ["ASSIGNED", "PICKING", "DELIVERED"],
      default: "ASSIGNED"
    }
  },
  { timestamps: true }
);

export default model("DeliveryJob", DeliveryJobSchema);
