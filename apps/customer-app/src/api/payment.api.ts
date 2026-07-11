// apps/customer-app/src/api/payment.api.ts
import { apiGet, apiPost, ApiResponse } from "./client";

interface RazorpayOrderRequest {
  orderId: string;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  keyId: string;
  orderId: string;
}

interface VerifyPaymentRequest {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Create Razorpay Order
 */
export const createRazorpayOrder = (
  data: RazorpayOrderRequest
): Promise<ApiResponse<RazorpayOrderResponse>> => {
  return apiPost<RazorpayOrderResponse>("/payment/create-order", data);
};

/**
 * Verify Payment
 */
export const verifyPayment = (
  data: VerifyPaymentRequest
): Promise<ApiResponse<any>> => {
  return apiPost<any>("/payment/verify", data);
};

/**
 * Check payment status (server-side reconciliation with Razorpay)
 */
export const checkPaymentStatus = (orderId: string): Promise<ApiResponse<any>> => {
  return apiGet<any>(`/payment/status/${orderId}`);
};