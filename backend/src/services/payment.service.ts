import crypto from "crypto";
import Razorpay from "razorpay";
import { config } from "../config/env";

type RazorpayOrderParams = {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
};

export type CodCollectionProvider = "razorpay_qr" | "razorpay_link" | "platform_upi";

export type CodCollectionSession = {
  provider: CodCollectionProvider;
  razorpayQrId?: string;
  paymentLinkId?: string;
  qrImageUrl?: string;
  paymentUrl: string;
  amount: number;
  manualConfirmRequired?: boolean;
};

const buildPlatformUpiUri = (vpa: string, payeeName: string, amount: number, note: string) => {
  const params = new URLSearchParams();
  params.set("pa", vpa);
  params.set("pn", payeeName);
  params.set("am", amount.toFixed(2));
  params.set("cu", "INR");
  params.set("tn", note);
  return `upi://pay?${params.toString()}`;
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
  },

  createCodCollectionPayment: async ({
    amountPaise,
    orderId,
    orderRef
  }: {
    amountPaise: number;
    orderId: string;
    orderRef: string;
  }): Promise<CodCollectionSession> => {
    const razorpay = getRazorpayClient();
    const notes = {
      orderId,
      deliveryCollection: "true"
    };
    const amount = amountPaise / 100;

    try {
      const paymentLink = await razorpay.paymentLink.create({
        amount: amountPaise,
        currency: "INR",
        description: `Vyaha COD ${orderRef}`,
        notes,
        notify: { sms: false, email: false },
        reminder_enable: false
      } as any);

      return {
        provider: "razorpay_link",
        paymentLinkId: paymentLink.id,
        paymentUrl: (paymentLink as any).short_url,
        amount
      };
    } catch (linkError) {
      console.warn("Razorpay payment link creation failed, trying QR:", (linkError as Error)?.message || linkError);
    }

    try {
      const qr = await razorpay.qrCode.create({
        type: "upi_qr",
        name: `COD ${orderRef}`,
        usage: "single_use",
        fixed_amount: true,
        payment_amount: amountPaise,
        description: `Vyaha COD ${orderRef}`,
        close_by: Math.floor(Date.now() / 1000) + 3600,
        notes
      } as any);

      return {
        provider: "razorpay_qr",
        razorpayQrId: qr.id,
        qrImageUrl: (qr as any).image_url,
        paymentUrl: (qr as any).image_url || "",
        amount
      };
    } catch (qrError) {
      console.warn("Razorpay QR creation failed:", (qrError as Error)?.message || qrError);
    }

    const platformVpa = config.platformUpiVpa || process.env.PLATFORM_UPI_VPA || "";
    if (platformVpa) {
      const payeeName = config.platformUpiPayeeName || process.env.PLATFORM_UPI_PAYEE_NAME || "Vyaha";
      return {
        provider: "platform_upi",
        paymentUrl: buildPlatformUpiUri(platformVpa, payeeName, amount, `COD ${orderRef}`),
        amount,
        manualConfirmRequired: true
      };
    }

    throw new Error("UPI collection is not configured. Contact support.");
  },

  checkCodCollectionPayment: async (session: {
    provider?: CodCollectionProvider;
    razorpayQrId?: string;
    paymentLinkId?: string;
    amount?: number;
  }) => {
    if (!session?.provider) {
      return { paid: false, manualConfirmRequired: false };
    }

    if (session.provider === "platform_upi") {
      return { paid: false, manualConfirmRequired: true };
    }

    const razorpay = getRazorpayClient();

    if (session.provider === "razorpay_qr" && session.razorpayQrId) {
      const qr = await razorpay.qrCode.fetch(session.razorpayQrId);
      const expectedAmount = Number((qr as any).payment_amount || 0);
      const receivedAmount = Number((qr as any).payments_amount_received || 0);
      const paid = expectedAmount > 0 ? receivedAmount >= expectedAmount : receivedAmount > 0;
      return {
        paid,
        manualConfirmRequired: false,
        receivedAmount: receivedAmount / 100,
        expectedAmount: expectedAmount / 100
      };
    }

    if (session.provider === "razorpay_link" && session.paymentLinkId) {
      const paymentLink = await razorpay.paymentLink.fetch(session.paymentLinkId);
      return {
        paid: (paymentLink as any).status === "paid",
        manualConfirmRequired: false
      };
    }

    return { paid: false, manualConfirmRequired: false };
  }
};
