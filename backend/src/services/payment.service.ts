import crypto from "crypto";
import Razorpay from "razorpay";
import { config } from "../config/env";

type RazorpayOrderParams = {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
};

let razorpayClient: Razorpay | null = null;

const getRazorpayClient = () => {
  const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }

  return razorpayClient;
};

export const PaymentService = {
  createOrder: async ({ amount, receipt, notes = {} }: RazorpayOrderParams) => {
    const razorpay = getRazorpayClient();
    return razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      payment_capture: true,
      notes
    });
  },

  createDeliveryQr: async ({
    amountPaise,
    description,
    notes = {}
  }: {
    amountPaise: number;
    description: string;
    notes?: Record<string, string>;
  }) => {
    const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
    const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const closeBy = Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000);

    const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "upi_qr",
        name: "Vyaha Delivery Payment",
        usage: "single_use",
        fixed_amount: true,
        payment_amount: amountPaise,
        description,
        close_by: closeBy,
        notes
      })
    });

    const payload = (await response.json()) as {
      id?: string;
      image_url?: string;
      close_by?: number;
      error?: { description?: string; reason?: string; code?: string };
    };

    if (!response.ok || !payload.id || !payload.image_url) {
      const razorpayMessage =
        payload.error?.description ||
        payload.error?.reason ||
        (payload.error?.code ? `Razorpay error: ${payload.error.code}` : "");
      throw new Error(
        razorpayMessage ||
          "Failed to create Vyaha QR. Ask admin to enable Razorpay QR Codes on the merchant account."
      );
    }

    return payload as { id: string; image_url: string; close_by?: number };
  },

  syncDeliveryQrPayment: async (qrId: string) => {
    const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
    const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrId}/payments?count=10`, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });

    const payload = (await response.json()) as {
      items?: Array<{ status?: string; id?: string; amount?: number }>;
    };

    if (!response.ok) {
      return { paid: false, amount: 0, paymentId: "", imageUrl: "" };
    }

    const captured = (payload.items || []).find((item) => item.status === "captured");
    if (!captured) {
      return { paid: false, amount: 0, paymentId: "", imageUrl: "" };
    }

    return {
      paid: true,
      paymentId: captured.id || "",
      amount: Number(captured.amount || 0) / 100,
      imageUrl: ""
    };
  },

  verifyCheckoutSignature: (orderId: string, paymentId: string, signature: string) => {
    const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return expected === signature;
  },

  verifyWebhookSignature: (payload: Buffer, signature: string) => {
    const webhookSecret = config.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    return expected === signature;
  }
};
