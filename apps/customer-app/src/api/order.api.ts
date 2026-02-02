// apps/customer-app/src/api/order.api.ts
import api from "./client";

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

/**
 * CREATE SHOP ORDER
 */
export const createShopOrder = (
  partnerId: string,
  deliveryAddress: string,
  items: OrderItem[],
  note?: string
) => {
  const requestData: CreateOrderRequest = {
    partnerId,
    deliveryAddress,
    items,
    note: note || ""
  };

  console.log("Creating order with data:", requestData);
  
  return api.post("/orders", requestData);
};

/**
 * GET MY ORDERS
 */
export const getMyOrders = () => {
  return api.get("/orders/my");
};

/**
 * GET ORDER DETAILS
 */
export const getOrderDetails = (orderId: string) => {
  return api.get(`/orders/${orderId}`);
};

/**
 * CANCEL ORDER
 */
export const cancelOrder = (orderId: string) => {
  return api.post(`/orders/${orderId}/cancel`);
};