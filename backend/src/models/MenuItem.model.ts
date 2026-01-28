import { Schema, model } from "mongoose";

const MenuItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    category: {
      type: String,
      required: true,
      enum: ["Restaurant", "Bakery", "Tiffins", "Fast Food", "Unique Foods", "Other"],
      default: "Other"
    },
    imageUrl: {
      type: String,
      default: ""
    },
    isVegetarian: {
      type: Boolean,
      default: true
    },
    preparationTime: {
      type: Number, // in minutes
      default: 15,
      min: 1
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true
    },
    rating: {
      type: Number,
      default: 4,
      min: 1,
      max: 5
    }
  },
  { timestamps: true }
);

export default model("MenuItem", MenuItemSchema);