import { Request, Response } from "express";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import { ROLES } from "../config/roles";
import { successResponse, errorResponse } from "../utils/response";
import mongoose from "mongoose";

// Define the user type from your JWT payload
interface AuthUser {
  id: string;
  role: string;
}

// Extend Express Request to include user
interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * ================================
 * CREATE ORDER (SHOP or CUSTOM)
 * ================================
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || user.role !== ROLES.CUSTOMER) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const {
      orderType,
      partnerId,
      deliveryAddress,
      note,
      items
    } = req.body;

    if (!orderType || !deliveryAddress) {
      return errorResponse(res, "Missing required fields", 400);
    }

    if (orderType === "SHOP" && !partnerId) {
      return errorResponse(res, "partnerId is required for shop orders", 400);
    }

    const order = await Order.create({
      orderType,
      customerId: user.id,  // Changed from user._id to user.id
      partnerId: orderType === "SHOP" ? partnerId : undefined,
      deliveryAddress,
      note,
      items,
      status: "CREATED"
    });

    return successResponse(res, order, "Order created successfully");
  } catch (err) {
    console.error("createOrder error:", err);
    return errorResponse(res, "Failed to create order");
  }
};

/**
 * ================================
 * ADMIN – PRICE CUSTOM ORDER
 * ================================
 */
export const priceCustomOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || user.role !== ROLES.ADMIN) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { orderId } = req.params;
    const { itemTotal, deliveryFee } = req.body;

    if (!itemTotal || deliveryFee === undefined) {
      return errorResponse(res, "Pricing details required", 400);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (order.orderType !== "CUSTOM") {
      return errorResponse(res, "Only custom orders can be priced", 400);
    }

    order.itemTotal = itemTotal;
    order.deliveryFee = deliveryFee;
    order.grandTotal = itemTotal + deliveryFee;
    order.status = "PRICED";

    await order.save();

    return successResponse(res, order, "Order priced successfully");
  } catch (err) {
    console.error("priceCustomOrder error:", err);
    return errorResponse(res, "Failed to price order");
  }
};

/**
 * ================================
 * CUSTOMER – ACCEPT PRICED ORDER
 * ================================
 */
export const acceptCustomOrderPrice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Convert user.id string to ObjectId for comparison
    const userId = new mongoose.Types.ObjectId(user.id);
    
    if (!order.customerId.equals(userId)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (order.status !== "PRICED") {
      return errorResponse(res, "Order not ready for confirmation", 400);
    }

    order.status = "CONFIRMED";
    await order.save();

    return successResponse(res, order, "Order confirmed");
  } catch (err) {
    console.error("acceptCustomOrderPrice error:", err);
    return errorResponse(res, "Failed to confirm order");
  }
};

/**
 * ================================
 * ADMIN – ASSIGN DELIVERY PARTNER
 * ================================
 */
export const assignDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || user.role !== ROLES.ADMIN) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { orderId } = req.params;
    const { deliveryPartnerId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    order.deliveryPartnerId = deliveryPartnerId;
    order.status = "ASSIGNED";

    await order.save();

    return successResponse(res, order, "Delivery assigned");
  } catch (err) {
    console.error("assignDelivery error:", err);
    return errorResponse(res, "Failed to assign delivery");
  }
};

/**
 * ================================
 * DELIVERY – UPDATE ORDER STATUS
 * ================================
 */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const allowedStatuses = ["PICKED_UP", "DELIVERED"];

    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, "Invalid status update", 400);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Convert user.id to ObjectId for comparison
    const userId = new mongoose.Types.ObjectId(user.id);
    
    if (!order.deliveryPartnerId?.equals(userId)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    order.status = status;
    await order.save();

    return successResponse(res, order, "Order status updated");
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    return errorResponse(res, "Failed to update status");
  }
};

/**
 * ================================
 * GET ORDERS (ROLE BASED)
 * ================================
 */
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    let filter = {};

    if (user.role === ROLES.CUSTOMER) {
      filter = { customerId: user.id };
    } else if (user.role === ROLES.DELIVERY) {
      filter = { deliveryPartnerId: user.id };
    } else if (user.role === ROLES.ADMIN) {
      filter = {};
    } else if (user.role === ROLES.PARTNER) {
      filter = { partnerId: user.id };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("customerId partnerId deliveryPartnerId");

    return successResponse(res, orders);
  } catch (err) {
    console.error("getMyOrders error:", err);
    return errorResponse(res, "Failed to fetch orders");
  }
};