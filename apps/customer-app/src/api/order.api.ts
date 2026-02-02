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
}

// Define Order type
export interface Order {
  _id: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  partnerId: {
    restaurantName: string;
  };
}

/**
 * CREATE SHOP ORDER
 */
export const createShopOrder = (
  partnerId: string,
  deliveryAddress: string,
  items: OrderItem[],
  note?: string
): Promise<ApiResponse<Order>> => {
  const requestData: CreateOrderRequest = {
    partnerId,
    deliveryAddress,
    items,
    note: note || ""
  };

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