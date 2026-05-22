import crypto from "crypto";
import { PaymentService } from "./payment.service";
import { config } from "../config/env";

describe("PaymentService", () => {
  it("verifies a valid checkout signature", () => {
    const orderId = "order_123";
    const paymentId = "pay_123";
    const secret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(PaymentService.verifyCheckoutSignature(orderId, paymentId, signature)).toBe(true);
  });
});
