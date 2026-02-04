// apps/customer-app/src/api/payment.api.ts
import { apiPost, ApiResponse } from "./client";

interface RazorpayOrderRequest {
  amount: number;
  currency?: string;
  receipt?: string;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentUpdateData {
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentMethod?: string;
  paymentStatus?: string;
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
 * Update Order Payment Status
 */
export const updateOrderPayment = (
  orderId: string,
  paymentData: PaymentUpdateData
): Promise<ApiResponse<any>> => {
  return apiPost<any>(`/payment/order/${orderId}/update-payment`, paymentData);
};