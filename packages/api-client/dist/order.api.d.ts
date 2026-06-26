import type { ApiResponse, Order, OrderItem, OrderPricingQuote } from "./types.js";
export declare const createShopOrder: (partnerId: string, deliveryAddress: string, items: OrderItem[], note: string | undefined, paymentMethod: string | undefined, deliveryLocation: {
    latitude: number;
    longitude: number;
}) => Promise<ApiResponse<Order>>;
export declare const quoteOrderPricing: (groups: Array<{
    partnerId: string;
    itemTotal: number;
}>, deliveryLocation: {
    latitude: number;
    longitude: number;
}) => Promise<ApiResponse<OrderPricingQuote>>;
export declare const getMyOrders: (page?: number, limit?: number) => Promise<ApiResponse<Order[]>>;
export declare const getOrderDetails: (orderId: string) => Promise<ApiResponse<Order>>;
export declare const cancelOrder: (orderId: string) => Promise<ApiResponse<unknown>>;
export declare const submitOrderRating: (orderId: string, payload: {
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
}) => Promise<ApiResponse<Order>>;
export declare const getPartnerOrders: () => Promise<ApiResponse<Order[]>>;
export declare const getPartnerOrderDetails: (orderId: string) => Promise<ApiResponse<Order>>;
export declare const updatePartnerOrderStatus: (orderId: string, status: string) => Promise<ApiResponse<Order>>;
//# sourceMappingURL=order.api.d.ts.map