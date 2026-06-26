import type { ApiResponse } from "./types.js";
interface RazorpayOrderResponse {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    keyId: string;
    orderId: string;
}
export declare const createRazorpayOrder: (orderId: string) => Promise<ApiResponse<RazorpayOrderResponse>>;
export declare const verifyPayment: (data: {
    orderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}) => Promise<ApiResponse<unknown>>;
export type { RazorpayOrderResponse };
//# sourceMappingURL=payment.api.d.ts.map