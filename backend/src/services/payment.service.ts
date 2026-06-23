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

  createCodPaymentLink: async ({
    amountPaise,
    description,
    notes = {},
    expireBySeconds = 2 * 60 * 60
  }: {
    amountPaise: number;
    description: string;
    notes?: Record<string, string>;
    expireBySeconds?: number;
  }) => {
    const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
    const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const expire_by = Math.floor(Date.now() / 1000) + expireBySeconds;

    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        accept_partial: false,
        description,
        reminder_enable: false,
        notes,
        expire_by
      })
    });

    const payload = (await response.json()) as {
      id?: string;
      short_url?: string;
      expire_by?: number;
      error?: { description?: string; reason?: string; code?: string };
    };

    if (!response.ok || !payload.id || !payload.short_url) {
      const razorpayMessage =
        payload.error?.description ||
        payload.error?.reason ||
        (payload.error?.code ? `Razorpay error: ${payload.error.code}` : "");
      throw new Error(razorpayMessage || "Failed to create Vyaha payment link");
    }

    return {
      id: payload.id,
      short_url: payload.short_url,
      expire_by: payload.expire_by || expire_by
    };
  },

  syncPaymentLinkPayment: async (paymentLinkId: string) => {
    const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
    const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const linkResponse = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}`, {
      headers: { Authorization: `Basic ${auth}` }
    });

    const linkPayload = (await linkResponse.json()) as {
      status?: string;
      amount?: number;
      short_url?: string;
    };

    if (!linkResponse.ok || linkPayload.status !== "paid") {
      return { paid: false, amount: 0, paymentId: "", paymentLinkUrl: linkPayload.short_url || "" };
    }

    const paymentsResponse = await fetch(
      `https://api.razorpay.com/v1/payment_links/${paymentLinkId}/payments?count=5`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const paymentsPayload = (await paymentsResponse.json()) as {
      items?: Array<{ status?: string; id?: string; amount?: number }>;
    };

    const captured = (paymentsPayload.items || []).find((item) => item.status === "captured");

    return {
      paid: true,
      paymentId: captured?.id || "",
      amount: Number(captured?.amount || linkPayload.amount || 0) / 100,
      paymentLinkUrl: linkPayload.short_url || ""
    };
  },

  syncCodDeliveryPayment: async (referenceId: string) => {
    if (referenceId.startsWith("plink_")) {
      return PaymentService.syncPaymentLinkPayment(referenceId);
    }

    return PaymentService.syncDeliveryQrPayment(referenceId);
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
      return { paid: false, amount: 0, paymentId: "", paymentLinkUrl: "" };
    }

    const captured = (payload.items || []).find((item) => item.status === "captured");
    if (!captured) {
      return { paid: false, amount: 0, paymentId: "", paymentLinkUrl: "" };
    }

    return {
      paid: true,
      paymentId: captured.id || "",
      amount: Number(captured.amount || 0) / 100,
      paymentLinkUrl: ""
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
