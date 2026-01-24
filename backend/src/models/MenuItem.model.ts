import { Schema, model, Types } from "mongoose";

const MenuItemSchema = new Schema({
  partnerId: {
    type: Types.ObjectId,
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
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ["main", "starter", "dessert", "beverage", "snack"],
    default: "main"
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  image: {
    type: String
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  addOns: [{
    name: String,
    price: Number
  }]
}, {
  timestamps: true
});

// Index for faster queries
MenuItemSchema.index({ partnerId: 1, isAvailable: 1 });

export default model("MenuItem", MenuItemSchema);