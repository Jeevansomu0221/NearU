// backend/src/models/MenuItem.model.ts
import { Schema, model } from "mongoose";

const MenuItemSchema = new Schema(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true
    },
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
      default: "Other",
      enum: ["Starters", "Main Course", "Desserts", "Beverages", "Breads", "Other"]
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
      type: Number,
      default: 15, // minutes
      min: 1
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    rating: {
      type: Number,
      default: 4.0,
      min: 0,
      max: 5
    }
  },
  { timestamps: true }
);

export default model("MenuItem", MenuItemSchema);