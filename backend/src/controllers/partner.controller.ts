import { Request, Response } from "express";
import Partner from "../models/Partner.model";
import User from "../models/User.model";
import MenuItem from "../models/MenuItem.model";
import { successResponse, errorResponse } from "../utils/response";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Register as a partner/shop
 */
export const registerPartner = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const {
      shopName,
      description,
      category,
      address,
      latitude,
      longitude,
      phone,
      openingTime,
      closingTime,
      deliveryRadius
    } = req.body;

    // Validate required fields
    const requiredFields = [
      shopName, category, address, latitude, 
      longitude, phone
    ];
    
    if (requiredFields.some(field => !field)) {
      return errorResponse(res, "All fields are required", 400);
    }

    // Check if user is already a partner
    const existingPartner = await Partner.findOne({ userId: user.id });
    if (existingPartner) {
      return errorResponse(res, "Already registered as partner", 400);
    }

    // Create partner
    const partner = await Partner.create({
      userId: new mongoose.Types.ObjectId(user.id),
      shopName,
      description,
      category,
      address,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      phone,
      openingTime: openingTime || "09:00",
      closingTime: closingTime || "22:00",
      deliveryRadius: deliveryRadius || 5,
      isActive: false // Requires admin approval
    });

    // Update user role to partner
    await User.findByIdAndUpdate(user.id, { role: "partner" });

    return successResponse(
      res, 
      partner, 
      "Partner registration submitted. Awaiting admin approval."
    );

  } catch (error) {
    console.error("registerPartner error:", error);
    return errorResponse(res, "Failed to register partner");
  }
};

/**
 * Get partner dashboard
 */
export const getPartnerDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user || user.role !== "partner") {
      return errorResponse(res, "Unauthorized", 401);
    }

    const partner = await Partner.findOne({ userId: user.id });
    
    if (!partner) {
      return errorResponse(res, "Partner not found", 404);
    }

    // Get dashboard stats
    const stats = {
      shopName: partner.shopName,
      isActive: partner.isActive,
      isOpen: partner.isOpen,
      totalOrders: partner.totalOrders,
      rating: partner.rating,
      todayOrders: 0, // TODO: Calculate from orders
      todayRevenue: 0 // TODO: Calculate from orders
    };

    return successResponse(res, stats);

  } catch (error) {
    console.error("getPartnerDashboard error:", error);
    return errorResponse(res, "Failed to get dashboard");
  }
};