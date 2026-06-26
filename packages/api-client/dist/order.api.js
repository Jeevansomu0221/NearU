import { apiGet, apiPost } from "./client.js";
export const createShopOrder = (partnerId, deliveryAddress, items, note, paymentMethod, deliveryLocation) => {
    const requestData = {
        partnerId,
        deliveryAddress,
        deliveryLocation,
        items,
        note: note || ""
    };
    if (paymentMethod) {
        requestData.paymentMethod = paymentMethod;
    }
    return apiPost("/orders", requestData);
};
export const quoteOrderPricing = (groups, deliveryLocation) => apiPost("/orders/pricing", { groups, deliveryLocation });
export const getMyOrders = (page = 1, limit = 30) => apiGet("/orders/my", { params: { page, limit } });
export const getOrderDetails = (orderId) => apiGet(`/orders/${orderId}`);
export const cancelOrder = (orderId) => apiPost(`/orders/${orderId}/cancel`);
export const submitOrderRating = (orderId, payload) => apiPost(`/orders/${orderId}/ratings`, payload);
export const getPartnerOrders = () => apiGet("/orders/partner/my");
export const getPartnerOrderDetails = (orderId) => apiGet(`/orders/partner/${orderId}`);
export const updatePartnerOrderStatus = (orderId, status) => apiPost(`/orders/partner/${orderId}/status`, { status });
