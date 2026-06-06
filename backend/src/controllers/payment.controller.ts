import { Response } from "express";
import Order from "../models/Order.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { PaymentService } from "../services/payment.service";
import { config } from "../config/env";
import { notifyPartnerNewOrder, notifyPaymentConfirmed } from "../services/notification.service";

export const createPaymentOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (!orderId) {
      return errorResponse(res, "orderId is required", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (order.customerId.toString() !== req.user.id) {
      return errorResponse(res, "Unauthorized to create payment for this order", 403);
    }

    if (order.paymentStatus === "PAID") {
      return errorResponse(res, "Order is already paid", 400);
    }

    const paymentOrder = await PaymentService.createOrder({
      amount: Math.round(order.grandTotal * 100),
      receipt: `nearu_${order._id.toString()}`,
      notes: {
        orderId: order._id.toString(),
        customerId: req.user.id
      }
    });

    order.razorpayOrderId = paymentOrder.id;
    order.paymentMethod = "RAZORPAY";
    order.paymentStatus = "PENDING";
    await order.save();

    return successResponse(res, {
      ...paymentOrder,
      keyId: config.razorpayKeyId,
      orderId: order._id.toString()
    }, "Payment order created successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to create payment order");
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse(res, "Missing payment details", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (order.customerId.toString() !== req.user.id) {
      return errorResponse(res, "Unauthorized to verify this payment", 403);
    }

    if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
      return errorResponse(res, "Payment order does not match this order", 400);
    }

    const isValidSignature = PaymentService.verifyCheckoutSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      order.paymentStatus = "FAILED";
      await order.save();
      return errorResponse(res, "Payment signature verification failed", 400);
    }

    order.razorpayOrderId = razorpay_order_id;
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentMethod = "RAZORPAY";
    order.paymentStatus = "PAID";
    const didConfirmOrder = order.status === "PENDING";
    if (didConfirmOrder) {
      order.status = "CONFIRMED";
    }
    await order.save();

    if (didConfirmOrder) {
      void notifyPartnerNewOrder(order).catch((error) => {
        console.error("Failed to notify partner about verified payment:", error);
      });
    }

    return successResponse(res, order, "Payment verified successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Payment verification failed");
  }
};

export const handlePaymentWebhook = async (req: any, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (!signature || typeof signature !== "string") {
      return errorResponse(res, "Missing webhook signature", 400);
    }

    const payload = req.body as Buffer;
    if (!Buffer.isBuffer(payload)) {
      return errorResponse(res, "Invalid webhook payload", 400);
    }

    const isValid = PaymentService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return errorResponse(res, "Invalid webhook signature", 400);
    }

    const event = JSON.parse(payload.toString("utf-8"));
    if (event.event === "payment.captured") {
      const notes = event.payload?.payment?.entity?.notes;
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = notes?.orderId;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "PAID",
          paymentMethod: "RAZORPAY",
          paymentId: paymentEntity?.id,
          razorpayPaymentId: paymentEntity?.id,
          status: "CONFIRMED"
        });
        void notifyPaymentConfirmed(orderId).catch((error) => {
          console.error("Failed to notify partner from payment webhook:", error);
        });
      }
    }

    if (event.event === "payment.failed") {
      const notes = event.payload?.payment?.entity?.notes;
      const orderId = notes?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { paymentStatus: "FAILED" });
      }
    }

    return successResponse(res, { received: true }, "Webhook processed");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to process webhook");
  }
};
