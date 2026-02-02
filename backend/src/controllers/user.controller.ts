// NEARU/backend/src/controllers/user.controller.ts
import { Response } from "express";
import User from "../models/User.model";
import Order from "../models/Order.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";

/**
 * GET USER PROFILE
 */
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Find user by ID
    const userData = await User.findById(user.id)
      .select("-__v -createdAt -updatedAt")
      .lean();

    if (!userData) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, userData, "Profile retrieved successfully");
  } catch (err: any) {
    console.error("getUserProfile error:", err);
    return errorResponse(res, "Failed to get profile");
  }
};

/**
 * UPDATE USER PROFILE
 */
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { name, email } = req.body;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-__v -createdAt -updatedAt");

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, updatedUser, "Profile updated successfully");
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    
    if (err.code === 11000) {
      return errorResponse(res, "Email already exists", 400);
    }
    
    if (err.name === 'ValidationError') {
      return errorResponse(res, err.message, 400);
    }
    
    return errorResponse(res, "Failed to update profile");
  }
};

/**
 * UPDATE USER ADDRESS
 */
export const updateUserAddress = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { street, city, state, pincode, area, landmark } = req.body;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Validate pincode if provided
    if (pincode && !/^\d{6}$/.test(pincode)) {
      return errorResponse(res, "Pincode must be 6 digits", 400);
    }

    // Build address object
    const address = {
      street: street || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      area: area || "",
      landmark: landmark || ""
    };

    // Update user address
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { address },
      { new: true, runValidators: true }
    ).select("-__v -createdAt -updatedAt");

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, updatedUser, "Address updated successfully");
  } catch (err: any) {
    console.error("updateUserAddress error:", err);
    
    if (err.name === 'ValidationError') {
      return errorResponse(res, err.message, 400);
    }
    
    return errorResponse(res, "Failed to update address");
  }
};

/**
 * GET USER'S ORDERS
 */
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Find all orders for this customer
    const orders = await Order.find({ customerId: user.id })
      .populate("partnerId", "restaurantName shopName phone")
      .populate("deliveryPartnerId", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, orders, "Orders retrieved successfully");
  } catch (err: any) {
    console.error("getMyOrders error:", err);
    return errorResponse(res, "Failed to get orders");
  }
};