import { apiPost } from "./client.js";
export const createRazorpayOrder = (orderId) => apiPost("/payment/create-order", { orderId });
export const verifyPayment = (data) => apiPost("/payment/verify", data);
