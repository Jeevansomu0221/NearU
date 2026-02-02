// NEARU/backend/src/controllers/order.controller.ts
import { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import MenuItem from "../models/MenuItem.model";
import SubOrder from "../models/SubOrder.model";
import { ROLES } from "../config/roles";
import { successResponse, errorResponse } from "../utils/response";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * ================================
 * CREATE SHOP ORDER
 * ================================
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user;

    if (!user || user.role !== ROLES.CUSTOMER) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { partnerId, deliveryAddress, items, note } = req.body;

    // Validate required fields
    if (!partnerId || !deliveryAddress) {
      return errorResponse(res, "Missing required fields: partnerId and deliveryAddress", 400);
    }

    if (!items || items.length === 0) {
      return errorResponse(res, "Items are required for orders", 400);
    }

    // Validate partner exists and is open
    const partner = await Partner.findById(partnerId).session(session);
    if (!partner) {
      await session.abortTransaction();
      return errorResponse(res, "Restaurant not found", 404);
    }

    if (!partner.isOpen) {
      await session.abortTransaction();
      return errorResponse(res, "Restaurant is currently closed", 400);
    }

    if (partner.status !== "APPROVED") {
      await session.abortTransaction();
      return errorResponse(res, "Restaurant is not approved for orders", 400);
    }

    // Validate menu items and check availability
    let itemTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId).session(session);
      
      if (!menuItem) {
        await session.abortTransaction();
        return errorResponse(res, `Item "${item.name}" not found in menu`, 400);
      }

      if (!menuItem.isAvailable) {
        await session.abortTransaction();
        return errorResponse(res, `Item "${item.name}" is currently unavailable`, 400);
      }

      if (menuItem.price !== item.price) {
        await session.abortTransaction();
        return errorResponse(res, `Price mismatch for "${item.name}"`, 400);
      }

      itemTotal += menuItem.price * item.quantity;
      validatedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price
      });
    }

    // Calculate totals
    const deliveryFee = 49; // Fixed delivery fee for now
    const grandTotal = itemTotal + deliveryFee;

    // Create the main order
    const order = new Order({
      orderType: "SHOP",
      customerId: user.id,
      partnerId,
      deliveryAddress,
      note: note || "",
      items: validatedItems,
      itemTotal,
      deliveryFee,
      grandTotal,
      status: "CONFIRMED",
      paymentStatus: "PAID"
    });

    await order.save({ session });

    // Create sub-order for the partner
    const subOrder = new SubOrder({
      orderId: order._id,
      partnerId,
      items: validatedItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity
      })),
      status: "CREATED"
    });

    await subOrder.save({ session });

    // Update partner's order count
    await Partner.findByIdAndUpdate(
      partnerId,
      { $inc: { totalOrders: 1 } },
      { session }
    );

    await session.commitTransaction();

    // Populate before sending response
    const populatedOrder = await Order.findById(order._id)
      .populate("partnerId", "restaurantName phone shopName")
      .populate("customerId", "name phone");

    console.log(`📱 Order ${order._id} created for partner ${partnerId}`);

    return successResponse(res, populatedOrder, "Order created successfully");

  } catch (err: any) {
    await session.abortTransaction();
    console.error("createOrder error:", err);
    return errorResponse(res, "Failed to create order");
  } finally {
    session.endSession();
  }
};

/**
 * ================================
 * PARTNER - UPDATE ORDER STATUS
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

    // Allowed status updates for partners
    const allowedStatuses = ["ACCEPTED", "PREPARING", "READY", "REJECTED"];
    
    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Allowed: ${allowedStatuses.join(", ")}`, 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user is the partner for this order
    const userId = new mongoose.Types.ObjectId(user.id);
    let isPartner = false;
    
    if (user.role === ROLES.PARTNER) {
      if (user.partnerId) {
        isPartner = order.partnerId.equals(new mongoose.Types.ObjectId(user.partnerId));
      } else {
        const partner = await Partner.findOne({ userId: user.id });
        if (partner) {
          isPartner = order.partnerId.equals(partner._id);
        }
      }
    }

    if (!isPartner && user.role !== ROLES.ADMIN) {
      return errorResponse(res, "Unauthorized to update this order", 401);
    }

    // Update both main order and sub-order
    order.status = status;
    await order.save();

    // Update sub-order status
    await SubOrder.findOneAndUpdate(
      { orderId: order._id },
      { status },
      { new: true }
    );

    return successResponse(res, order, `Order status updated to ${status}`);
  } catch (err: any) {
    console.error("updateOrderStatus error:", err);
    return errorResponse(res, "Failed to update order status");
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

    // Only assign delivery if order is READY
    if (order.status !== "READY") {
      return errorResponse(res, `Order must be READY before assigning delivery. Current status: ${order.status}`, 400);
    }

    order.deliveryPartnerId = deliveryPartnerId;
    order.status = "ASSIGNED";

    await order.save();

    return successResponse(res, order, "Delivery partner assigned");
  } catch (err: any) {
    console.error("assignDelivery error:", err);
    return errorResponse(res, "Failed to assign delivery partner");
  }
};

/**
 * ================================
 * DELIVERY – UPDATE DELIVERY STATUS
 * ================================
 */
export const updateDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!user || user.role !== ROLES.DELIVERY) {
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

    // Check if deliveryPartnerId exists and matches
    if (!order.deliveryPartnerId || !order.deliveryPartnerId.equals(userId)) {
      return errorResponse(res, "Unauthorized - Not assigned to this order", 401);
    }

    // Validate status flow
    if (status === "PICKED_UP" && order.status !== "ASSIGNED") {
      return errorResponse(res, "Order must be ASSIGNED before being picked up", 400);
    }

    if (status === "DELIVERED" && order.status !== "PICKED_UP") {
      return errorResponse(res, "Order must be PICKED_UP before being delivered", 400);
    }

    order.status = status;
    await order.save();

    // Also update sub-order status
    if (status === "DELIVERED") {
      await SubOrder.findOneAndUpdate(
        { orderId: order._id },
        { status: "DELIVERED" },
        { new: true }
      );
    }

    return successResponse(res, order, `Order ${status.toLowerCase()} successfully`);
  } catch (err: any) {
    console.error("updateDeliveryStatus error:", err);
    return errorResponse(res, "Failed to update delivery status");
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
      .populate("customerId", "name phone")
      .populate("partnerId", "restaurantName shopName phone")
      .populate("deliveryPartnerId", "name phone");

    return successResponse(res, orders);
  } catch (err: any) {
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
      .populate("customerId", "name phone")
      .populate("partnerId", "restaurantName shopName phone address")
      .populate("deliveryPartnerId", "name phone");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user has permission to view this order
    const userId = new mongoose.Types.ObjectId(user.id);
    const isCustomer = order.customerId.equals(userId);
    
    const isDelivery = order.deliveryPartnerId 
      ? order.deliveryPartnerId.equals(userId) 
      : false;
    
    let isPartner = false;

    if (user.role === ROLES.PARTNER) {
      if (user.partnerId) {
        isPartner = order.partnerId.equals(new mongoose.Types.ObjectId(user.partnerId));
      } else {
        const partner = await Partner.findOne({ userId: user.id });
        if (partner) {
          isPartner = order.partnerId.equals(partner._id);
        }
      }
    }

    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCustomer && !isDelivery && !isPartner && !isAdmin) {
      return errorResponse(res, "Unauthorized to view this order", 401);
    }

    return successResponse(res, order, "Order details retrieved");
  } catch (err: any) {
    console.error("getOrderDetails error:", err);
    return errorResponse(res, "Failed to get order details");
  }
};

/**
 * ================================
 * CANCEL ORDER (CUSTOMER ONLY)
 * ================================
 */
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user || user.role !== ROLES.CUSTOMER) {
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

    // Only allow cancellation if order hasn't been accepted by partner
    const cancellableStatuses = ["CONFIRMED"];
    if (!cancellableStatuses.includes(order.status)) {
      return errorResponse(res, `Order cannot be cancelled in ${order.status} status`, 400);
    }

    order.status = "CANCELLED";
    await order.save();

    // Also cancel the sub-order
    await SubOrder.findOneAndUpdate(
      { orderId: order._id },
      { status: "CANCELLED" },
      { new: true }
    );

    return successResponse(res, order, "Order cancelled successfully");
  } catch (err: any) {
    console.error("cancelOrder error:", err);
    return errorResponse(res, "Failed to cancel order");
  }
};