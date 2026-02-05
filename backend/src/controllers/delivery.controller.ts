import { Request, Response } from "express";
import Order from "../models/Order.model";
import { successResponse, errorResponse } from "../utils/response";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Get available delivery jobs
 */
export const getAvailableJobs = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user || user.role !== "delivery") {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Find orders that need delivery
    const availableJobs = await Order.find({
      status: { $in: ["CONFIRMED", "ACCEPTED_BY_SHOP"] },
      deliveryPartnerId: { $exists: false } // Not assigned yet
    })
    .populate("customerId", "name phone")
    .populate("partnerId", "shopName address")
    .sort({ createdAt: -1 });

    return successResponse(res, availableJobs);

  } catch (error) {
    console.error("getAvailableJobs error:", error);
    return errorResponse(res, "Failed to get jobs");
  }
};

/**
 * Accept a delivery job
 */
export const acceptDeliveryJob = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    
    if (!user || user.role !== "delivery") {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (order.deliveryPartnerId) {
      return errorResponse(res, "Order already assigned", 400);
    }

    if (!["CONFIRMED", "ACCEPTED_BY_SHOP"].includes(order.status)) {
      return errorResponse(res, "Order not ready for delivery", 400);
    }

    // Assign delivery partner
    order.deliveryPartnerId = new mongoose.Types.ObjectId(user.id);
    order.status = "ASSIGNED";
    await order.save();

    return successResponse(res, order, "Delivery job accepted");

  } catch (error) {
    console.error("acceptDeliveryJob error:", error);
    return errorResponse(res, "Failed to accept job");
  }
};