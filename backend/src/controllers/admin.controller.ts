import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import User from "../models/User.model";

// Create a type for authenticated requests
interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    partnerId?: string;
  };
}

const isAdmin = (req: AuthRequest, res: Response): boolean => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Admin access only"
    });
    return false;
  }
  return true;
};

/**
 * GET ALL ORDERS (ADMIN)
 */
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("customerId partnerId deliveryPartnerId");

    res.json({
      success: true,
      data: orders
    });
  } catch (error: any) {
    console.error("Error getting all orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
};

/**
 * GET PARTNER REQUESTS (ADMIN)
 * Gets all partners with their status
 */
export const getPartnerRequests = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const partners = await Partner.find()
      .sort({ createdAt: -1 })
      .populate("userId", "name phone email")
      .select("ownerName restaurantName phone address category status createdAt documents approvedAt");

    res.json({
      success: true,
      data: partners
    });
  } catch (error: any) {
    console.error("Error getting partner requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch partner requests"
    });
  }
};

/**
 * UPDATE PARTNER STATUS (ADMIN)
 * Approve/Reject/Suspend partner
 */
export const updatePartnerStatus = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const { partnerId } = req.params;
    const { status, rejectionReason } = req.body;

    // Validate status
    const validStatuses = ["APPROVED", "REJECTED", "SUSPENDED", "PENDING"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    // Find partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    // Update partner status
    partner.status = status;
    
    if (status === "APPROVED") {
      // Convert string ID to ObjectId if it exists
      if (req.user?.id) {
        partner.approvedBy = new mongoose.Types.ObjectId(req.user.id);
      }
      partner.approvedAt = new Date();
      partner.rejectionReason = undefined;
      
      // Update user role to partner if userId exists
      if (partner.userId) {
        await User.findByIdAndUpdate(partner.userId, { role: "partner" });
      }
    } else if (status === "REJECTED") {
      partner.rejectionReason = rejectionReason || "Application rejected";
      partner.approvedBy = undefined;
      partner.approvedAt = undefined;
    } else if (status === "SUSPENDED") {
      partner.rejectionReason = rejectionReason || "Account suspended";
    }

    await partner.save();

    res.json({
      success: true,
      data: partner,
      message: `Partner status updated to ${status}`
    });
  } catch (error: any) {
    console.error("Error updating partner status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update partner status"
    });
  }
};

/**
 * GET PARTNER DETAILS (ADMIN)
 */
export const getPartnerDetails = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const { partnerId } = req.params;

    const partner = await Partner.findById(partnerId)
      .populate("userId", "name phone email")
      .populate("approvedBy", "name phone");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error: any) {
    console.error("Error getting partner details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch partner details"
    });
  }
};

/**
 * GET ORDER DETAILS (ADMIN)
 */
export const getOrderDetails = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("customerId", "name phone")
      .populate("partnerId", "restaurantName phone address")
      .populate("deliveryPartnerId", "name phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error: any) {
    console.error("Error getting order details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details"
    });
  }
};

/**
 * UPDATE ORDER STATUS (ADMIN)
 */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`
    });
  } catch (error: any) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
};

/**
 * GET DASHBOARD STATS (ADMIN)
 */
// Fixed getDashboardStats function in admin.controller.ts
/**
 * GET DASHBOARD STATS (ADMIN)
 */
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req, res)) return;

  try {
    // Get counts
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "PENDING" });
    const totalPartners = await Partner.countDocuments();
    const pendingPartners = await Partner.countDocuments({ status: "PENDING" });
    const activePartners = await Partner.countDocuments({ status: "APPROVED", isOpen: true });

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Calculate total earnings - use grandTotal field from your Order model
    const deliveredOrders = await Order.find({ status: "DELIVERED" });
    
    let totalEarnings = 0;
    
    deliveredOrders.forEach(order => {
      // Use the grandTotal field from your Order model
      if (order.grandTotal && typeof order.grandTotal === 'number') {
        totalEarnings += order.grandTotal;
      }
    });

    const stats = {
      totalOrders,
      pendingOrders,
      todayOrders,
      totalPartners,
      pendingPartners,
      activePartners,
      totalEarnings,
      today: today.toISOString().split('T')[0]
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats"
    });
  }
};