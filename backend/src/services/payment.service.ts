import crypto from "crypto";
import QRCode from "qrcode";
import Razorpay from "razorpay";
import { config } from "../config/env";

type RazorpayOrderParams = {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
};

export type CodCollectionProvider = "razorpay_qr" | "platform_upi";

export type CodCollectionSession = {
  provider: CodCollectionProvider;
  razorpayQrId?: string;
  qrImageUrl?: string;
  qrDataUrl?: string;
  upiUri?: string;
  paymentUrl: string;
  amount: number;
  manualConfirmRequired?: boolean;
};

const buildPlatformUpiUri = (vpa: string, payeeName: string, amount: number, note: string) => {
  const params = new URLSearchParams();
  params.set("pa", vpa.trim());
  params.set("pn", payeeName.trim());
  params.set("am", amount.toFixed(2));
  params.set("cu", "INR");
  params.set("tn", note.trim());
  return `upi://pay?${params.toString()}`;
};

const attachUpiQrDataUrl = async (session: CodCollectionSession): Promise<CodCollectionSession> => {
  if (session.qrImageUrl || session.qrDataUrl) {
    return session;
  }

  const upiPayload = session.upiUri || session.paymentUrl;
  if (!upiPayload?.startsWith("upi://pay?")) {
    return session;
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(upiPayload, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M"
    });
    return { ...session, qrDataUrl, upiUri: upiPayload };
  } catch (error) {
    console.warn("Failed to generate UPI QR data URL:", (error as Error)?.message || error);
    return session;
  }
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
      const qr = await razorpay.qrCode.create({
        type: "upi_qr",
        name: `Vyaha COD ${orderRef}`,
        usage: "single_use",
        fixed_amount: true,
        payment_amount: amountPaise,
        description: `Vyaha COD ${orderRef}`,
        close_by: Math.floor(Date.now() / 1000) + 3600,
        notes
      } as any);

      const imageUrl = String((qr as any).image_url || "").trim();
      if (!imageUrl) {
        throw new Error("Razorpay did not return a QR image");
      }

      return {
        provider: "razorpay_qr",
        razorpayQrId: qr.id,
        qrImageUrl: imageUrl,
        paymentUrl: imageUrl,
        amount
      };
    } catch (qrError) {
      console.warn("Razorpay UPI QR creation failed:", (qrError as Error)?.message || qrError);
    }

    const platformVpa = config.platformUpiVpa || process.env.PLATFORM_UPI_VPA || "";
    if (platformVpa) {
      const payeeName = config.platformUpiPayeeName || process.env.PLATFORM_UPI_PAYEE_NAME || "Vyaha";
      const upiUri = buildPlatformUpiUri(platformVpa, payeeName, amount, `Vyaha COD ${orderRef}`);
      return attachUpiQrDataUrl({
        provider: "platform_upi",
        upiUri,
        paymentUrl: upiUri,
        amount,
        manualConfirmRequired: true
      });
    }

    throw new Error(
      "UPI QR is not available. Enable Razorpay UPI QR on your account or set PLATFORM_UPI_VPA on the server."
    );
  },

  checkCodCollectionPayment: async (session: {
    provider?: CodCollectionProvider | string;
    razorpayQrId?: string;
    amount?: number;
  }) => {
    if (!session?.provider) {
      return { paid: false, manualConfirmRequired: false };
    }

    if (session.provider === "platform_upi") {
      return { paid: false, manualConfirmRequired: true };
    }

    if (session.provider !== "razorpay_qr" || !session.razorpayQrId) {
      return { paid: false, manualConfirmRequired: false };
    }

    const razorpay = getRazorpayClient();
    const qr = await razorpay.qrCode.fetch(session.razorpayQrId);
    const expectedAmount = Number((qr as any).payment_amount || 0);
    const receivedAmount = Number((qr as any).payments_amount_received || 0);
    const paymentsCount = Number((qr as any).payments_count_received || 0);
    const qrStatus = String((qr as any).status || "").toLowerCase();
    const paid =
      paymentsCount > 0 ||
      qrStatus === "closed" ||
      (expectedAmount > 0 ? receivedAmount >= expectedAmount : receivedAmount > 0);

    return {
      paid,
      manualConfirmRequired: false,
      receivedAmount: receivedAmount / 100,
      expectedAmount: expectedAmount / 100
    };
  }
};
