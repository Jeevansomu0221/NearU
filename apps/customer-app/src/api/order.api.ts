// apps/customer-app/src/api/order.api.ts
import { apiGet, apiPost, ApiResponse } from "./client";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  menuItemId?: string;
}

interface CreateOrderRequest {
  partnerId: string;
  deliveryAddress: string;
  items: OrderItem[];
  note?: string;
  paymentMethod?: string;
}

// Define complete Order type with all fields
export interface Order {
  _id: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  partnerId: any; // Can be populated object or string ID
  customerId?: any;
  deliveryPartnerId?: any;
  deliveryAddress?: string;
  note?: string;
  items: OrderItem[];
  itemTotal?: number;
  deliveryFee?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

/**
 * CREATE SHOP ORDER (with payment method)
 */
export const createShopOrder = (
  partnerId: string,
  deliveryAddress: string,
  items: OrderItem[],
  note?: string,
  paymentMethod?: string
): Promise<ApiResponse<Order>> => {
  const requestData: CreateOrderRequest = {
    partnerId,
    deliveryAddress,
    items,
    note: note || ""
  };

  // Add payment method if provided
  if (paymentMethod) {
    requestData.paymentMethod = paymentMethod;
  }

  console.log("Creating order with data:", requestData);
  
  return apiPost<Order>("/orders", requestData);
};

/**
 * GET MY ORDERS
 */
export const getMyOrders = (): Promise<ApiResponse<Order[]>> => {
  return apiGet<Order[]>("/orders/my");
};

/**
 * GET ORDER DETAILS
 */
export const getOrderDetails = (orderId: string): Promise<ApiResponse<Order>> => {
  return apiGet<Order>(`/orders/${orderId}`);
};

/**
 * CANCEL ORDER
 */
export const cancelOrder = (orderId: string): Promise<ApiResponse<any>> => {
  return apiPost<any>(`/orders/${orderId}/cancel`);
};

/**
 * UPDATE ORDER PAYMENT STATUS
 */
export const updateOrderPaymentStatus = (
  orderId: string,
  paymentData: {
    paymentId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentMethod?: string;
    paymentStatus?: string;
  }
): Promise<ApiResponse<Order>> => {
  return apiPost<Order>(`/orders/${orderId}/update-payment`, paymentData);
};