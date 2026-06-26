import { apiPost } from "./client.js";
import type { ApiResponse } from "./types.js";

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  keyId: string;
  orderId: string;
}

export const createRazorpayOrder = (orderId: string): Promise<ApiResponse<RazorpayOrderResponse>> =>
  apiPost<RazorpayOrderResponse>("/payment/create-order", { orderId });

export const verifyPayment = (data: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<ApiResponse<unknown>> => apiPost("/payment/verify", data);

export type { RazorpayOrderResponse };
