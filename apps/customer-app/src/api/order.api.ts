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
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  items: OrderItem[];
  note?: string;
  paymentMethod?: string;
  deliveryBundleId?: string;
  deliveryBundleSize?: number;
  deliveryBundleSequence?: number;
}

export interface OrderPricingGroup {
  partnerId: string;
  shopName: string;
  itemTotal: number;
  deliveryFee: number;
  foodGst: number;
  deliveryGst: number;
  platformFee: number;
  taxDiscount: number;
  riderToShopDistanceKm: number;
  shopToCustomerDistanceKm: number;
  deliveryDistanceKm: number;
  grandTotal: number;
  payableTotal: number;
}

export interface OrderPricingQuote {
  groups: OrderPricingGroup[];
  itemTotal: number;
  deliveryFee: number;
  foodGst: number;
  deliveryGst: number;
  platformFee: number;
  taxDiscount: number;
  deliveryDistanceKm: number;
  grandTotal: number;
  payableTotal: number;
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
  deliveryLocation?: {
    coordinates: [number, number];
  };
  note?: string;
  items: OrderItem[];
  itemTotal?: number;
  deliveryFee?: number;
  foodGst?: number;
  deliveryGst?: number;
  platformFee?: number;
  taxDiscount?: number;
  riderToShopDistanceKm?: number;
  shopToCustomerDistanceKm?: number;
  deliveryDistanceKm?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  cancellationReason?: string;
  customerCancellationMessage?: string;
  autoCancelledAt?: string;
  restaurantRating?: {
    foodQuality?: number;
    packaging?: number;
    overallExperience?: number;
    comment?: string;
  };
  deliveryRating?: {
    deliverySpeed?: number;
    partnerBehavior?: number;
    comment?: string;
  };
  ratingSubmittedAt?: string;
}

/**
 * CREATE SHOP ORDER (with payment method)
 */
export const createShopOrder = (
  partnerId: string,
  deliveryAddress: string,
  items: OrderItem[],
  note: string | undefined,
  paymentMethod: string | undefined,
  deliveryLocation: { latitude: number; longitude: number },
  bundle?: { id: string; size: number; sequence: number }
): Promise<ApiResponse<Order>> => {
  const requestData: CreateOrderRequest = {
    partnerId,
    deliveryAddress,
    deliveryLocation,
    items,
    note: note || ""
  };

  // Add payment method if provided
  if (paymentMethod) {
    requestData.paymentMethod = paymentMethod;
  }

  if (bundle?.id) {
    requestData.deliveryBundleId = bundle.id;
    requestData.deliveryBundleSize = bundle.size;
    requestData.deliveryBundleSequence = bundle.sequence;
  }

  return apiPost<Order>("/orders", requestData);
};

export const quoteOrderPricing = (
  groups: Array<{ partnerId: string; itemTotal: number }>,
  deliveryLocation: { latitude: number; longitude: number }
): Promise<ApiResponse<OrderPricingQuote>> => {
  return apiPost<OrderPricingQuote>("/orders/pricing", {
    groups,
    deliveryLocation
  });
};

/**
 * GET MY ORDERS
 */
export const getMyOrders = (page = 1, limit = 30): Promise<ApiResponse<Order[]>> => {
  return apiGet<Order[]>("/orders/my", { params: { page, limit } });
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

export const submitOrderRating = (
  orderId: string,
  payload: {
    restaurantRating: {
      foodQuality: number;
      packaging: number;
      overallExperience: number;
      comment?: string;
    };
    deliveryRating: {
      deliverySpeed: number;
      partnerBehavior: number;
      comment?: string;
    };
  }
): Promise<ApiResponse<Order>> => {
  return apiPost<Order>(`/orders/${orderId}/ratings`, payload);
};