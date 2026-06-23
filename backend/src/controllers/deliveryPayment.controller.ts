import { Response } from "express";
import Order from "../models/Order.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import {
  ensureDeliveryQrForOrders,
  isUpiAtDeliveryMethod,
  syncDeliveryPaymentForOrders
} from "../services/deliveryPayment.service";

const getDeliveryOrdersForRider = async (orderId: string, userId: string) => {
  const order = await Order.findById(orderId);
  if (!order) {
    return null;
  }

  if (!order.deliveryPartnerId || order.deliveryPartnerId.toString() !== userId) {
    return { unauthorized: true as const };
  }

  if (order.deliveryBundleId) {
    return Order.find({ deliveryBundleId: order.deliveryBundleId }).sort({ deliveryBundleSequence: 1, createdAt: 1 });
  }

  return [order];
};

export const getDeliveryQr = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const orderId = String(req.params.orderId || "");

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const orders = await getDeliveryOrdersForRider(orderId, user.id);
    if (!orders) {
      return errorResponse(res, "Order not found", 404);
    }
    if ("unauthorized" in orders) {
      return errorResponse(res, "Unauthorized - Not assigned to this delivery job", 401);
    }

    const hasUpiAtDelivery = orders.some((order) => isUpiAtDeliveryMethod(order.paymentMethod));
    if (!hasUpiAtDelivery) {
      return errorResponse(res, "This delivery does not use UPI at delivery", 400);
    }

    const qr = await ensureDeliveryQrForOrders(orders as any);
    return successResponse(
      res,
      {
        ...qr,
        paymentStatus: qr.alreadyPaid ? "PAID" : "PAYMENT_PENDING_DELIVERY"
      },
      qr.alreadyPaid ? "Delivery payment already received" : "Delivery QR generated"
    );
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to create delivery QR");
  }
};

export const getDeliveryPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const orderId = String(req.params.orderId || "");

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const orders = await getDeliveryOrdersForRider(orderId, user.id);
    if (!orders) {
      return errorResponse(res, "Order not found", 404);
    }
    if ("unauthorized" in orders) {
      return errorResponse(res, "Unauthorized - Not assigned to this delivery job", 401);
    }

    const refreshedOrders = await Order.find({
      _id: { $in: orders.map((order) => order._id) }
    });
    const status = await syncDeliveryPaymentForOrders(refreshedOrders as any);

    return successResponse(res, {
      paid: status.paid,
      amount: status.amount || 0,
      paymentId: status.paymentId || "",
      paymentStatus: status.paid ? "PAID" : "PAYMENT_PENDING_DELIVERY"
    }, status.paid ? "Delivery payment received" : "Waiting for customer UPI payment");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to check delivery payment status");
  }
};
