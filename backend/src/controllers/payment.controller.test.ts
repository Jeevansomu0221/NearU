import { verifyPayment } from "./payment.controller";
import Order from "../models/Order.model";

jest.mock("../models/Order.model", () => ({
  __esModule: true,
  default: {
    findById: jest.fn()
  }
}));

describe("verifyPayment", () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { status };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a Razorpay order id that does not match the local order", async () => {
    (Order.findById as jest.Mock).mockResolvedValue({
      customerId: { toString: () => "customer-id" },
      razorpayOrderId: "order_expected"
    });

    const req: any = {
      user: { id: "customer-id" },
      body: {
        orderId: "local-order-id",
        razorpay_order_id: "order_other",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "sig"
      }
    };

    await verifyPayment(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Payment order does not match this order"
      })
    );
  });
});
