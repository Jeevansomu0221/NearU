// NEARU/backend/src/controllers/payment.controller.ts
import { Response } from "express";
import crypto from "crypto";
import Order from "../models/Order.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";

/**
 * Create Payment Order (Mock for now)
 */
export const createPaymentOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency = "INR" } = req.body;
    
    if (!amount) {
      return errorResponse(res, "Amount is required", 400);
    }

    // Generate mock payment order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return successResponse(res, {
      id: orderId,
      amount: amount * 100, // Return in paise for consistency
      currency,
      receipt: `receipt_${Date.now()}`
    }, "Payment order created successfully");

  } catch (error: any) {
    console.error("Payment order creation error:", error);
    return errorResponse(res, "Failed to create payment order");
  }
};

/**
 * Verify Payment (Mock for now)
 */
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id) {
      return errorResponse(res, "Missing payment details", 400);
    }

    // For mock purposes, always return success
    return successResponse(res, {
      verified: true,
      razorpay_order_id,
      razorpay_payment_id
    }, "Payment verified successfully");

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return errorResponse(res, "Payment verification failed");
  }
};

// The updateOrderPayment function is now in order.controller.ts
/**
 * Update Order Payment Status
 */
export const updateOrderPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { 
      paymentId, 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      paymentMethod,
      paymentStatus 
    } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Update payment details
    order.paymentId = paymentId;
    order.razorpayOrderId = razorpayOrderId;
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.paymentMethod = paymentMethod || "RAZORPAY";
    order.paymentStatus = paymentStatus || "PAID";
    
    // If payment is successful, ensure order status is CONFIRMED
    if (paymentStatus === "PAID" && order.status === "CONFIRMED") {
      order.status = "CONFIRMED";
    }

    await order.save();

    return successResponse(res, order, "Payment status updated successfully");

  } catch (error: any) {
    console.error("Update payment error:", error);
    return errorResponse(res, "Failed to update payment status");
  }
};