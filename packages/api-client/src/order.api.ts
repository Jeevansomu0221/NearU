import { apiGet, apiPost } from "./client.js";
import type { ApiResponse, Order, OrderItem, OrderPricingQuote } from "./types.js";

export const createShopOrder = (
  partnerId: string,
  deliveryAddress: string,
  items: OrderItem[],
  note: string | undefined,
  paymentMethod: string | undefined,
  deliveryLocation: { latitude: number; longitude: number }
): Promise<ApiResponse<Order>> => {
  const requestData: Record<string, unknown> = {
    partnerId,
    deliveryAddress,
    deliveryLocation,
    items,
    note: note || ""
  };
  if (paymentMethod) {
    requestData.paymentMethod = paymentMethod;
  }
  return apiPost<Order>("/orders", requestData);
};

export const quoteOrderPricing = (
  groups: Array<{ partnerId: string; itemTotal: number }>,
  deliveryLocation: { latitude: number; longitude: number }
): Promise<ApiResponse<OrderPricingQuote>> =>
  apiPost<OrderPricingQuote>("/orders/pricing", { groups, deliveryLocation });

export const getMyOrders = (page = 1, limit = 30): Promise<ApiResponse<Order[]>> =>
  apiGet<Order[]>("/orders/my", { params: { page, limit } });

export const getOrderDetails = (orderId: string): Promise<ApiResponse<Order>> =>
  apiGet<Order>(`/orders/${orderId}`);

export const cancelOrder = (orderId: string): Promise<ApiResponse<unknown>> =>
  apiPost(`/orders/${orderId}/cancel`);

export const submitOrderRating = (
  orderId: string,
  payload: {
    restaurantRating: {
      foodQuality: number;
      packaging: number;
      overallExperience: number;
      comment?: string;
    };
    deliveryRating?: {
      deliverySpeed: number;
      partnerBehavior: number;
      comment?: string;
      rating?: number;
    };
  }
): Promise<ApiResponse<Order>> => apiPost<Order>(`/orders/${orderId}/ratings`, payload);

export const getPartnerOrders = (): Promise<ApiResponse<Order[]>> => apiGet<Order[]>("/orders/partner/my");

export const getPartnerOrderDetails = (orderId: string): Promise<ApiResponse<Order>> =>
  apiGet<Order>(`/orders/partner/${orderId}`);

export const updatePartnerOrderStatus = (
  orderId: string,
  status: string
): Promise<ApiResponse<Order>> => apiPost<Order>(`/orders/partner/${orderId}/status`, { status });
