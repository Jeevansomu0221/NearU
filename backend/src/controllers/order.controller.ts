// NEARU/backend/src/controllers/order.controller.ts
import { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import MenuItem from "../models/MenuItem.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import { CONSUMER_APP_ROLES, ROLES } from "../config/roles";
import { successResponse, errorResponse } from "../utils/response";
import { AuthRequest } from "../middlewares/auth.middleware";
import { config } from "../config/env";

const isConsumerAppRole = (role?: string) =>
  !!role && CONSUMER_APP_ROLES.some((allowedRole) => allowedRole === role.toLowerCase());

const resolvePartnerForUser = async (user?: AuthRequest["user"]) => {
  if (!user) return null;

  if (user.partnerId) {
    const partnerByToken = await Partner.findById(user.partnerId);
    if (partnerByToken) return partnerByToken;
  }

  let partner = await Partner.findOne({ userId: user.id });
  if (!partner && user.phone) {
    partner = await Partner.findOne({ phone: user.phone });
    if (partner && !partner.userId) {
      partner.userId = new mongoose.Types.ObjectId(user.id);
      await partner.save();
    }
  }

  return partner;
};

// Define interface for masked customer
interface MaskedCustomer {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  phone?: string;
}

const formatPartnerForDelivery = (partnerDoc: any) => {
  if (!partnerDoc) return partnerDoc;
  const partnerObj = partnerDoc.toObject ? partnerDoc.toObject() : partnerDoc;

  if (!partnerObj.address) {
    return partnerObj;
  }

  const addr = partnerObj.address;
  return {
    ...partnerObj,
    address: `${addr.roadStreet}, ${addr.colony}, ${addr.area}, ${addr.city}, ${addr.state} - ${addr.pincode}`,
    googleMapsLink: addr.googleMapsLink || "",
    location: partnerObj.location || null
  };
};

const haversineKm = (from: [number, number], to: [number, number]) => {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * ================================
 * CREATE SHOP ORDER (UPDATED WITH PAYMENT)
 * ================================
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || !isConsumerAppRole(user.role)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { partnerId, deliveryAddress, items, note, paymentMethod = "RAZORPAY" } = req.body;

    // Validate required fields
    if (!partnerId || !deliveryAddress) {
      return errorResponse(res, "Missing required fields: partnerId and deliveryAddress", 400);
    }

    if (!items || items.length === 0) {
      return errorResponse(res, "Items are required for orders", 400);
    }

    // Validate payment method
    const validPaymentMethods = ["RAZORPAY", "CASH_ON_DELIVERY", "CARD", "UPI", "WALLET"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return errorResponse(res, `Invalid payment method. Valid methods: ${validPaymentMethods.join(", ")}`, 400);
    }

    // Validate partner exists and is open
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return errorResponse(res, "Restaurant not found", 404);
    }

    if (!partner.isOpen) {
      return errorResponse(res, "Restaurant is currently closed", 400);
    }

    if (partner.status !== "APPROVED") {
      return errorResponse(res, "Restaurant is not approved for orders", 400);
    }

    // Validate menu items and check availability
    let itemTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      
      if (!menuItem) {
        return errorResponse(res, `Item "${item.name}" not found in menu`, 400);
      }

      if (!menuItem.isAvailable) {
        return errorResponse(res, `Item "${item.name}" is currently unavailable`, 400);
      }

      if (menuItem.price !== item.price) {
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

    // Determine payment status based on payment method
    let paymentStatus: string;
    if (paymentMethod === "CASH_ON_DELIVERY") {
      // For COD orders, payment will be collected on delivery
      paymentStatus = "PAYMENT_PENDING_DELIVERY";
    } else {
      // For online payments, payment is pending
      paymentStatus = "PENDING";
    }

    // Determine initial order status
    // COD orders start as CONFIRMED, online payments start as PENDING
    const initialStatus = paymentMethod === "CASH_ON_DELIVERY" ? "CONFIRMED" : "PENDING";

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
      paymentMethod,
      paymentStatus,
      status: initialStatus
    });

    await order.save();

    // Update partner's order count
    await Partner.findByIdAndUpdate(
      partnerId,
      { $inc: { totalOrders: 1 } }
    );

    // Populate before sending response
    const populatedOrder = await Order.findById(order._id)
      .populate("partnerId", "restaurantName phone shopName")
      .populate("customerId", "name phone");

    console.log(`📱 Order ${order._id} created for partner ${partnerId}`);
    console.log(`💰 Payment Method: ${paymentMethod}, Payment Status: ${paymentStatus}, Order Status: ${initialStatus}`);

    return successResponse(res, populatedOrder, "Order created successfully");

  } catch (err: any) {
    console.error("createOrder error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name
    });
    return errorResponse(res, `Failed to create order: ${err.message}`);
  }
};

/**
 * ================================
 * UPDATE ORDER PAYMENT STATUS
 * ================================
 */
export const updateOrderPayment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { 
      paymentId, 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      paymentMethod,
      paymentStatus 
    } = req.body;

    if (!user || !isConsumerAppRole(user.role)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user is the customer who placed this order
    const userId = new mongoose.Types.ObjectId(user.id);
    if (!order.customerId.equals(userId)) {
      return errorResponse(res, "Unauthorized to update this order", 401);
    }

    // Validate payment status
    const validPaymentStatuses = ["PENDING", "PAYMENT_PENDING_DELIVERY", "PAID", "FAILED", "REFUNDED", "CANCELLED"];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return errorResponse(res, `Invalid payment status. Valid statuses: ${validPaymentStatuses.join(", ")}`, 400);
    }

    // Update payment details
    if (paymentId) order.paymentId = paymentId;
    if (razorpayOrderId) order.razorpayOrderId = razorpayOrderId;
    if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) order.razorpaySignature = razorpaySignature;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    
    // If payment is successful and order was PENDING, update to CONFIRMED
    if (paymentStatus === "PAID" && order.status === "PENDING") {
      order.status = "CONFIRMED";
    }

    await order.save();

    // Get updated order with populated fields
    const updatedOrder = await Order.findById(orderId)
      .populate("partnerId", "restaurantName phone shopName")
      .populate("customerId", "name phone");

    return successResponse(res, updatedOrder, "Payment status updated successfully");

  } catch (err: any) {
    console.error("Update payment error:", err);
    return errorResponse(res, "Failed to update payment status");
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

    // Check payment status before allowing partner to accept
    if (status === "ACCEPTED") {
      // For COD orders, allow if payment status is PAYMENT_PENDING_DELIVERY
      // For online payments, require PAID status
      const isCODPending = order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "PAYMENT_PENDING_DELIVERY";
      const isOnlinePaid = order.paymentMethod !== "CASH_ON_DELIVERY" && order.paymentStatus === "PAID";
      
      if (!isCODPending && !isOnlinePaid) {
        return errorResponse(
          res, 
          `Cannot accept order. Payment status: ${order.paymentStatus}`, 
          400
        );
      }
    }

    // Check if this account owns the partner profile for this order.
    const partner = await resolvePartnerForUser(user);
    const isPartner = Boolean(partner && order.partnerId.equals(partner._id));

    if (!isPartner && user.role !== ROLES.ADMIN) {
      return errorResponse(res, "Unauthorized to update this order", 401);
    }

    // Update order status
    order.status = status;
    await order.save();

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

    // Check payment status before assigning delivery
    // For COD orders, paymentStatus is PAYMENT_PENDING_DELIVERY which is allowed
    // For online payments, need PAID status
    const isCODPending = order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "PAYMENT_PENDING_DELIVERY";
    const isOnlinePaid = order.paymentMethod !== "CASH_ON_DELIVERY" && order.paymentStatus === "PAID";
    
    if (!isCODPending && !isOnlinePaid) {
      return errorResponse(
        res, 
        `Cannot assign delivery. Payment status: ${order.paymentStatus}`, 
        400
      );
    }

    // Only assign delivery if order is READY
    if (order.status !== "READY") {
      return errorResponse(res, `Order must be READY before assigning delivery. Current status: ${order.status}`, 400);
    }

    const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId).select("userId status isAvailable");
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery partner not found", 404);
    }

    if (!["VERIFIED", "ACTIVE"].includes(deliveryPartner.status) || !deliveryPartner.isAvailable) {
      return errorResponse(res, "Delivery partner is not eligible for assignment", 400);
    }

    order.deliveryPartnerId = new mongoose.Types.ObjectId(deliveryPartner.userId);
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
    const { status, collectedAmount } = req.body;

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

    if (status === "DELIVERED" && order.paymentMethod === "CASH_ON_DELIVERY") {
      const amount = Number(collectedAmount);
      if (!Number.isFinite(amount) || amount < order.grandTotal) {
        return errorResponse(res, `Collect Rs ${order.grandTotal} before marking this order as delivered`, 400);
      }
    }

    order.status = status;
    
    // If delivered, update payment status for COD orders
    if (status === "DELIVERED" && order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "PAYMENT_PENDING_DELIVERY") {
      order.paymentStatus = "PAID";
    }

    await order.save();

    const responseOrder = order.toObject() as any;
    if (status === "DELIVERED") {
      responseOrder.deliveryEarnings = order.deliveryFee || 49;
      responseOrder.collectedAmount = collectedAmount ? Number(collectedAmount) : undefined;
    }

    return successResponse(res, responseOrder, `Order ${status.toLowerCase()} successfully`);
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
    const isCustomerOrdersRoute = req.path === "/my";
    const isPartnerOrdersRoute = req.path.startsWith("/partner");
    const isDeliveryOrdersRoute = req.path.startsWith("/delivery");
    const isAdminOrdersRoute = req.path.startsWith("/admin");

    if (isCustomerOrdersRoute) {
      filter.customerId = user.id;
    } else if (isAdminOrdersRoute) {
      filter = {};
    } else if (isDeliveryOrdersRoute) {
      filter.deliveryPartnerId = user.id;
    } else if (isPartnerOrdersRoute) {
      const partner = await resolvePartnerForUser(user);
      if (partner) {
        filter.partnerId = partner._id;
      } else {
        return successResponse(res, [], "No partner found");
      }
    } else {
      filter.customerId = user.id;
    }

    let orders;
    
    if (isPartnerOrdersRoute) {
      // For partners: don't show customer details, only delivery partner details
      orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .populate("partnerId", "restaurantName shopName phone")
        .populate("deliveryPartnerId", "name phone");
      
      // Mask customer information for partners
      orders = orders.map(order => {
        const orderObj = order.toObject() as any;
        
        // Create a masked customer object
        const maskedCustomer: MaskedCustomer = {
          _id: orderObj.customerId ? orderObj.customerId._id || "masked" : "masked",
          name: "Customer"
        };
        
        // Replace customerId with masked version
        orderObj.customerId = maskedCustomer;
        return orderObj;
      });
    } else {
      // Customer app order list and delivery partner lists
      orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .populate("customerId", "name phone")
        .populate("partnerId", "restaurantName shopName phone")
        .populate("deliveryPartnerId", "name phone");
    }

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
    const orderObj = order.toObject() as any;
    
    // Check if user is the customer
    const isCustomer = orderObj.customerId && orderObj.customerId._id 
      ? new mongoose.Types.ObjectId(orderObj.customerId._id.toString()).equals(userId)
      : false;
    
    // Check if user is the delivery partner
    const isDelivery = orderObj.deliveryPartnerId && orderObj.deliveryPartnerId._id
      ? new mongoose.Types.ObjectId(orderObj.deliveryPartnerId._id.toString()).equals(userId)
      : false;
    
    // Check if the account owns the partner profile, regardless of its primary role.
    const partner = await resolvePartnerForUser(user);
    const isPartner = Boolean(
      partner &&
        orderObj.partnerId &&
        orderObj.partnerId._id &&
        new mongoose.Types.ObjectId(orderObj.partnerId._id.toString()).equals(partner._id)
    );

    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCustomer && !isDelivery && !isPartner && !isAdmin) {
      return errorResponse(res, "Unauthorized to view this order", 401);
    }

    // For partners: mask customer details
    if (isPartner) {
      // Create a masked customer object
      const maskedCustomer: MaskedCustomer = {
        _id: orderObj.customerId ? orderObj.customerId._id || "masked" : "masked",
        name: "Customer"
      };
      
      // Mask phone number if it exists in the populated customer object
      if (orderObj.customerId && (orderObj.customerId as any).phone) {
        const phoneStr = (orderObj.customerId as any).phone.toString();
        // Mask all but last 3 digits
        if (phoneStr.length > 3) {
          maskedCustomer.phone = "XXXXXX" + phoneStr.slice(-3);
        }
      }
      
      // Replace customerId with masked version
      orderObj.customerId = maskedCustomer;
      
      // Also mask detailed delivery address for partners
      // Show only area/city, not full address
      if (orderObj.deliveryAddress) {
        const addressParts = orderObj.deliveryAddress.split(',');
        if (addressParts.length > 2) {
          // Show only last 2 parts (city, state - pincode)
          orderObj.deliveryAddress = `${addressParts[addressParts.length - 2]}, ${addressParts[addressParts.length - 1]}`;
        }
      }
      
      return successResponse(res, orderObj, "Order details retrieved");
    }

    return successResponse(res, order, "Order details retrieved");
  } catch (err: any) {
    console.error("getOrderDetails error:", err);
    return errorResponse(res, "Failed to get order details");
  }
};

/**
 * ================================
 * DELIVERY - GET AVAILABLE JOBS (READY orders not assigned)
 * ================================
 */
export const getAvailableDeliveryJobs = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const deliveryPartner = await DeliveryPartner.findOne({ userId: user.id }).lean();
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    const activeOrder = await Order.findOne({
      deliveryPartnerId: user.id,
      status: { $in: ["ASSIGNED", "PICKED_UP"] }
    }).select("_id status").lean();

    if (activeOrder) {
      return successResponse(
        res,
        [],
        "Complete your current delivery before accepting another job"
      );
    }

    // Allow both VERIFIED and ACTIVE delivery partners to see jobs.
    // Admin moves PENDING -> VERIFIED after document review; ACTIVE is the
    // "currently working" promotion. We also accept VERIFIED to avoid the
    // common case where admin only marked the partner as VERIFIED and not yet ACTIVE.
    const eligibleStatuses = ["ACTIVE", "VERIFIED"];
    if (!eligibleStatuses.includes(deliveryPartner.status) || !deliveryPartner.isAvailable) {
      return successResponse(res, [], "Delivery partner is not eligible for nearby jobs");
    }

    const riderCoordinates = deliveryPartner.currentLocation?.coordinates;
    const hasRiderLocation = Boolean(
      riderCoordinates &&
      riderCoordinates.length === 2 &&
      !(riderCoordinates[0] === 0 && riderCoordinates[1] === 0)
    );

    // Find orders that are READY and not assigned to any delivery partner
    const availableJobs = await Order.find({
      status: "READY",
      $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }]
    })
    .populate("customerId", "name phone")
    .populate({
      path: "partnerId",
      select: "restaurantName shopName phone address category location",
      transform: formatPartnerForDelivery
    })
    .sort({ createdAt: -1 });

    console.log(`🔍 Found ${availableJobs.length} available delivery jobs for user ${user.id}`);

    // If the rider hasn't shared their location yet, still show every READY
    // job so they at least know what's pending and can refresh after enabling GPS.
    if (!hasRiderLocation) {
      const jobs = availableJobs.map((job: any) => job.toObject());
      return successResponse(res, jobs, "Available delivery jobs retrieved (rider location pending)");
    }

    const rankedJobs = availableJobs
      .map((job: any) => {
        const partnerCoordinates = job.partnerId?.location?.coordinates;
        const partnerHasLocation = Boolean(
          partnerCoordinates &&
          partnerCoordinates.length === 2 &&
          !(partnerCoordinates[0] === 0 && partnerCoordinates[1] === 0)
        );

        // If the shop never set its location, still surface the job to the
        // rider but mark distance as unknown rather than dropping it silently.
        if (!partnerHasLocation) {
          return {
            ...job.toObject(),
            distanceToRestaurant: null
          };
        }

        const distanceToRestaurant = haversineKm(riderCoordinates as [number, number], partnerCoordinates);
        if (distanceToRestaurant > config.deliveryRadiusKm) {
          return null;
        }

        return {
          ...job.toObject(),
          distanceToRestaurant: Number(distanceToRestaurant.toFixed(2))
        };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => {
        const leftDist = left.distanceToRestaurant ?? Number.POSITIVE_INFINITY;
        const rightDist = right.distanceToRestaurant ?? Number.POSITIVE_INFINITY;
        return leftDist - rightDist;
      });

    return successResponse(res, rankedJobs, "Available delivery jobs retrieved");

  } catch (err: any) {
    console.error("getAvailableDeliveryJobs error:", err);
    return errorResponse(res, "Failed to get available delivery jobs");
  }
};

/**
 * ================================
 * DELIVERY - ACCEPT JOB (Assign self to order)
 * ================================
 */
export const acceptDeliveryJob = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const deliveryPartner = await DeliveryPartner.findOne({ userId: user.id }).select("status isAvailable");
    const acceptStatuses = ["ACTIVE", "VERIFIED"];
    if (!deliveryPartner || !acceptStatuses.includes(deliveryPartner.status) || !deliveryPartner.isAvailable) {
      return errorResponse(res, "Delivery partner is not eligible to accept jobs", 403);
    }

    const activeOrder = await Order.findOne({
      deliveryPartnerId: user.id,
      status: { $in: ["ASSIGNED", "PICKED_UP"] }
    }).select("_id").lean();

    if (activeOrder) {
      return errorResponse(res, "Complete your current delivery before accepting another job", 409);
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: "READY",
        $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }]
      },
      {
        $set: {
          deliveryPartnerId: new mongoose.Types.ObjectId(user.id),
          status: "ASSIGNED"
        }
      },
      { new: true }
    );

    if (!order) {
      return errorResponse(res, "Order is no longer available", 409);
    }

    // Get populated order for response
    const populatedOrder = await Order.findById(orderId)
      .populate("customerId", "name phone")
      .populate({
        path: "partnerId",
        select: "restaurantName shopName phone address category",
        transform: formatPartnerForDelivery
      })
      .populate("deliveryPartnerId", "name phone");

    console.log(`🚚 Delivery partner ${user.id} accepted job for order ${orderId}`);

    return successResponse(res, populatedOrder, "Delivery job accepted successfully");
  } catch (err: any) {
    console.error("acceptDeliveryJob error:", err);
    return errorResponse(res, "Failed to accept delivery job");
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

    if (!user || !isConsumerAppRole(user.role)) {
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
    // Include PENDING status in cancellable statuses
    const cancellableStatuses = ["CONFIRMED", "PENDING"];
    if (!cancellableStatuses.includes(order.status)) {
      return errorResponse(res, `Order cannot be cancelled in ${order.status} status`, 400);
    }

    // Update order status
    order.status = "CANCELLED";
    
    // Update payment status if payment was made
    if (order.paymentStatus === "PAID" || order.paymentStatus === "PAYMENT_PENDING_DELIVERY") {
      order.paymentStatus = "REFUNDED";
    } else {
      order.paymentStatus = "CANCELLED";
    }

    await order.save();

    return successResponse(res, order, "Order cancelled successfully");
  } catch (err: any) {
    console.error("cancelOrder error:", err);
    return errorResponse(res, "Failed to cancel order");
  }
};

/**
 * ================================
 * PARTNER - GET ORDER DETAILS FOR PARTNER (WITH MASKED CUSTOMER INFO)
 * ================================
 */
export const getPartnerOrderDetails = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId)
      .populate("partnerId", "restaurantName shopName phone address")
      .populate("deliveryPartnerId", "name phone vehicleType");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user is the partner for this order
    const partner = await resolvePartnerForUser(user);
    const isPartner = Boolean(partner && order.partnerId.equals(partner._id));

    if (!isPartner) {
      return errorResponse(res, "Unauthorized to view this order", 401);
    }

    const orderObj = order.toObject() as any;
    
    // Completely mask customer information for partners
    const maskedCustomer: MaskedCustomer = {
      _id: new mongoose.Types.ObjectId(), // Create a new ObjectId
      name: "Customer"
    };
    
    orderObj.customerId = maskedCustomer;
    
    // Mask delivery address (only show general area)
    if (orderObj.deliveryAddress) {
      const addressParts = orderObj.deliveryAddress.split(',');
      if (addressParts.length > 2) {
        // Show only city and pincode
        orderObj.deliveryAddress = `${addressParts[addressParts.length - 2]}, ${addressParts[addressParts.length - 1]}`;
      }
    }

    return successResponse(res, orderObj, "Order details retrieved for partner");
  } catch (err: any) {
    console.error("getPartnerOrderDetails error:", err);
    return errorResponse(res, "Failed to get order details");
  }
};
