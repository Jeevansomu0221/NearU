import { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import { ROLES } from "../config/roles";
import { successResponse, errorResponse } from "../utils/response";
import { AuthRequest } from "../middlewares/auth.middleware";
import Partner from "../models/Partner.model";

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
      customerId: user.id,
      partnerId: orderType === "SHOP" ? partnerId : undefined,
      deliveryAddress,
      note,
      items,
      status: orderType === "SHOP" ? "CONFIRMED" : "CREATED",
      paymentStatus: orderType === "SHOP" ? "PAID" : "PENDING"
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

    if (itemTotal === undefined || deliveryFee === undefined) {
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

    const userId = new mongoose.Types.ObjectId(user.id);

    if (!order.customerId.equals(userId)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (order.status !== "PRICED") {
      return errorResponse(res, "Order not ready for confirmation", 400);
    }

    order.status = "CONFIRMED";
    order.paymentStatus = "PAID";

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

    const userId = new mongoose.Types.ObjectId(user.id);

    // FIXED: Check if deliveryPartnerId exists before calling equals()
    if (!order.deliveryPartnerId || !order.deliveryPartnerId.equals(userId)) {
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

    let filter: any = {};

    if (user.role === ROLES.CUSTOMER) {
      filter.customerId = user.id;
    } else if (user.role === ROLES.DELIVERY) {
      filter.deliveryPartnerId = user.id;
    } else if (user.role === ROLES.PARTNER) {
      if (user.partnerId) {
        filter.partnerId = user.partnerId;
      } else {
        const partner = await Partner.findOne({ userId: user.id });
        if (partner) {
          filter.partnerId = partner._id;
        } else {
          return successResponse(res, [], "No partner found");
        }
      }
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

/**
 * ================================
 * GET ORDER DETAILS
 * ================================
 */
export const getOrderDetails = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId)
      .populate("customerId partnerId deliveryPartnerId");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user has permission to view this order
    const userId = new mongoose.Types.ObjectId(user.id);
    const isCustomer = order.customerId.equals(userId);
    
    // FIXED: Check if deliveryPartnerId exists before calling equals()
    const isDelivery = order.deliveryPartnerId 
      ? order.deliveryPartnerId.equals(userId) 
      : false;
    
    let isPartner = false;

    if (user.role === ROLES.PARTNER) {
      if (user.partnerId) {
        // FIXED: Check if partnerId exists before calling equals()
        isPartner = order.partnerId 
          ? order.partnerId.equals(new mongoose.Types.ObjectId(user.partnerId))
          : false;
      } else {
        const partner = await Partner.findOne({ userId: user.id });
        if (partner) {
          isPartner = order.partnerId 
            ? order.partnerId.equals(partner._id)
            : false;
        }
      }
    }

    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCustomer && !isDelivery && !isPartner && !isAdmin) {
      return errorResponse(res, "Unauthorized to view this order", 401);
    }

    return successResponse(res, order, "Order details retrieved");
  } catch (err) {
    console.error("getOrderDetails error:", err);
    return errorResponse(res, "Failed to get order details");
  }
};

/**
 * ================================
 * CANCEL ORDER
 * ================================
 */
export const cancelOrder = async (req: AuthRequest, res: Response) => {
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

    // Only customer who placed the order can cancel
    const userId = new mongoose.Types.ObjectId(user.id);
    if (!order.customerId.equals(userId)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Only certain statuses can be cancelled
    const cancellableStatuses = ["CREATED", "PRICED", "CONFIRMED"];
    if (!cancellableStatuses.includes(order.status)) {
      return errorResponse(res, `Order cannot be cancelled in ${order.status} status`, 400);
    }

    order.status = "CANCELLED";
    await order.save();

    return successResponse(res, order, "Order cancelled successfully");
  } catch (err) {
    console.error("cancelOrder error:", err);
    return errorResponse(res, "Failed to cancel order");
  }
};

/**
 * ================================
 * UPDATE ORDER (ADMIN ONLY)
 * ================================
 */
export const updateOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || user.role !== ROLES.ADMIN) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { orderId } = req.params;
    const updateData = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true, runValidators: true }
    ).populate("customerId partnerId deliveryPartnerId");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    return successResponse(res, order, "Order updated successfully");
  } catch (err) {
    console.error("updateOrder error:", err);
    return errorResponse(res, "Failed to update order");
  }
};