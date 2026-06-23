import { PaymentService } from "./payment.service";

type DeliveryQrOrder = {
  _id: unknown;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentId?: string;
  grandTotal?: number;
  deliveryQr?: {
    razorpayQrId?: string;
    imageUrl?: string;
    qrType?: string;
    amount?: number;
    createdAt?: Date;
    expiresAt?: Date;
    paidAt?: Date;
    paymentId?: string;
  };
  save: () => Promise<unknown>;
};

const isCodOrder = (paymentMethod?: string) =>
  paymentMethod === "CASH_ON_DELIVERY" || paymentMethod === "UPI_AT_DELIVERY";

export const isCodAwaitingPayment = (order: { paymentMethod?: string; paymentStatus?: string }) =>
  isCodOrder(order.paymentMethod) && order.paymentStatus !== "PAID";

export const isOrderPaidViaDeliveryQr = (order: { deliveryQr?: { paymentId?: string; paidAt?: unknown } | null }) =>
  Boolean(order.deliveryQr?.paymentId && order.deliveryQr?.paidAt);

export const markOrdersPaidFromDeliveryQr = async (
  orders: DeliveryQrOrder[],
  paymentId: string
) => {
  const now = new Date();
  for (const order of orders) {
    if (!isCodOrder(order.paymentMethod)) {
      continue;
    }

    order.paymentStatus = "PAID";
    order.paymentId = paymentId;
    order.deliveryQr = {
      ...(order.deliveryQr || {}),
      razorpayQrId: order.deliveryQr?.razorpayQrId || "",
      imageUrl: order.deliveryQr?.imageUrl || "",
      qrType: order.deliveryQr?.qrType || "upi_qr",
      amount: order.deliveryQr?.amount || Number(order.grandTotal || 0),
      createdAt: order.deliveryQr?.createdAt,
      expiresAt: order.deliveryQr?.expiresAt,
      paidAt: now,
      paymentId
    };
    await order.save();
  }
};

const buildDeliveryPaymentResponse = (input: {
  alreadyPaid: boolean;
  amount: number;
  qrType: "upi_qr" | "payment_link";
  imageUrl: string;
  paymentLinkUrl: string;
  razorpayQrId: string;
  expiresAt: Date | null;
  paidAt: Date | null;
  paymentId: string;
}) => ({
  alreadyPaid: input.alreadyPaid,
  amount: input.amount,
  qrType: input.qrType,
  imageUrl: input.imageUrl,
  paymentLinkUrl: input.paymentLinkUrl,
  razorpayQrId: input.razorpayQrId,
  expiresAt: input.expiresAt,
  paidAt: input.paidAt,
  paymentId: input.paymentId
});

const saveDeliveryQrOnOrders = async (
  unpaidOrders: DeliveryQrOrder[],
  payload: {
    razorpayQrId: string;
    imageUrl: string;
    qrType: "upi_qr" | "payment_link";
    amount: number;
    expiresAt: Date;
  }
) => {
  for (const order of unpaidOrders) {
    order.deliveryQr = {
      razorpayQrId: payload.razorpayQrId,
      imageUrl: payload.imageUrl,
      qrType: payload.qrType,
      amount: payload.amount,
      createdAt: new Date(),
      expiresAt: payload.expiresAt,
      paidAt: undefined,
      paymentId: ""
    };
    await order.save();
  }
};

const createUpiQrForUnpaidOrders = async (unpaidOrders: DeliveryQrOrder[], amount: number, orderIds: string) => {
  const qr = await PaymentService.createDeliveryQr({
    amountPaise: Math.round(amount * 100),
    description: `Vyaha COD UPI payment for ${unpaidOrders.length} order(s)`,
    notes: {
      orderIds,
      purpose: "COD_UPI_AT_DOORSTEP"
    }
  });

  const expiresAt = qr.close_by ? new Date(qr.close_by * 1000) : new Date(Date.now() + 2 * 60 * 60 * 1000);
  await saveDeliveryQrOnOrders(unpaidOrders, {
    razorpayQrId: qr.id,
    imageUrl: qr.image_url,
    qrType: "upi_qr",
    amount,
    expiresAt
  });

  return buildDeliveryPaymentResponse({
    alreadyPaid: false,
    amount,
    qrType: "upi_qr",
    imageUrl: qr.image_url,
    paymentLinkUrl: "",
    razorpayQrId: qr.id,
    expiresAt,
    paidAt: null,
    paymentId: ""
  });
};

const createPaymentLinkForUnpaidOrders = async (
  unpaidOrders: DeliveryQrOrder[],
  amount: number,
  orderIds: string
) => {
  const paymentLink = await PaymentService.createCodPaymentLink({
    amountPaise: Math.round(amount * 100),
    description: `Vyaha COD payment for ${unpaidOrders.length} order(s)`,
    notes: {
      orderIds,
      purpose: "COD_UPI_AT_DOORSTEP"
    }
  });

  const expiresAt = paymentLink.expire_by
    ? new Date(paymentLink.expire_by * 1000)
    : new Date(Date.now() + 2 * 60 * 60 * 1000);

  await saveDeliveryQrOnOrders(unpaidOrders, {
    razorpayQrId: paymentLink.id,
    imageUrl: paymentLink.short_url,
    qrType: "payment_link",
    amount,
    expiresAt
  });

  return buildDeliveryPaymentResponse({
    alreadyPaid: false,
    amount,
    qrType: "payment_link",
    imageUrl: "",
    paymentLinkUrl: paymentLink.short_url,
    razorpayQrId: paymentLink.id,
    expiresAt,
    paidAt: null,
    paymentId: ""
  });
};

const responseFromStoredDeliveryQr = (order: DeliveryQrOrder, alreadyPaid: boolean, extras?: Partial<{
  amount: number;
  paidAt: Date | null;
  paymentId: string;
}>) => {
  const qrType = order.deliveryQr?.qrType === "payment_link" ? "payment_link" : "upi_qr";
  const paymentLinkUrl = qrType === "payment_link" ? order.deliveryQr?.imageUrl || "" : "";

  return buildDeliveryPaymentResponse({
    alreadyPaid,
    amount: extras?.amount ?? Number(order.deliveryQr?.amount || order.grandTotal || 0),
    qrType,
    imageUrl: qrType === "upi_qr" ? order.deliveryQr?.imageUrl || "" : "",
    paymentLinkUrl,
    razorpayQrId: order.deliveryQr?.razorpayQrId || "",
    expiresAt: order.deliveryQr?.expiresAt || null,
    paidAt: extras?.paidAt ?? order.deliveryQr?.paidAt ?? null,
    paymentId: extras?.paymentId ?? order.deliveryQr?.paymentId ?? order.paymentId ?? ""
  });
};

export const ensureDeliveryQrForOrders = async (orders: DeliveryQrOrder[]) => {
  const codOrders = orders.filter((order) => isCodAwaitingPayment(order));
  if (!codOrders.length) {
    throw new Error("This order is not awaiting cash-on-delivery payment");
  }

  const unpaidOrders = codOrders.filter((order) => order.paymentStatus !== "PAID");
  if (!unpaidOrders.length) {
    return responseFromStoredDeliveryQr(codOrders[0], true);
  }

  const amount = unpaidOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
  const orderIds = unpaidOrders.map((order) => String(order._id)).join(",");
  const existingReferenceId = unpaidOrders.find((order) => order.deliveryQr?.razorpayQrId)?.deliveryQr?.razorpayQrId;
  const existingQrType = unpaidOrders[0]?.deliveryQr?.qrType;

  if (!existingReferenceId || existingQrType === "payment_link" || existingReferenceId.startsWith("plink_")) {
    try {
      return await createUpiQrForUnpaidOrders(unpaidOrders, amount, orderIds);
    } catch (upiError) {
      if (existingReferenceId?.startsWith("plink_")) {
        const synced = await PaymentService.syncCodDeliveryPayment(existingReferenceId);
        if (synced?.paid) {
          await markOrdersPaidFromDeliveryQr(unpaidOrders, synced.paymentId || "");
          return responseFromStoredDeliveryQr(unpaidOrders[0], true, {
            amount: synced.amount,
            paidAt: new Date(),
            paymentId: synced.paymentId || ""
          });
        }

        const anchor =
          unpaidOrders.find((order) => order.deliveryQr?.razorpayQrId === existingReferenceId) || unpaidOrders[0];
        return buildDeliveryPaymentResponse({
          alreadyPaid: false,
          amount: Number(anchor.deliveryQr?.amount || amount),
          qrType: "payment_link",
          imageUrl: "",
          paymentLinkUrl: synced.paymentLinkUrl || anchor.deliveryQr?.imageUrl || "",
          razorpayQrId: existingReferenceId,
          expiresAt: anchor.deliveryQr?.expiresAt || null,
          paidAt: null,
          paymentId: ""
        });
      }

      console.warn("Vyaha UPI QR unavailable, falling back to payment link:", upiError);
      return createPaymentLinkForUnpaidOrders(unpaidOrders, amount, orderIds);
    }
  }

  const synced = await PaymentService.syncCodDeliveryPayment(existingReferenceId);
  if (synced?.paid) {
    await markOrdersPaidFromDeliveryQr(unpaidOrders, synced.paymentId || "");
    return responseFromStoredDeliveryQr(unpaidOrders[0], true, {
      amount: synced.amount,
      paidAt: new Date(),
      paymentId: synced.paymentId || ""
    });
  }

  const anchor =
    unpaidOrders.find((order) => order.deliveryQr?.razorpayQrId === existingReferenceId) || unpaidOrders[0];
  return responseFromStoredDeliveryQr(anchor, false);
};

export const syncDeliveryPaymentForOrders = async (orders: DeliveryQrOrder[]) => {
  const codOrders = orders.filter((order) => isCodOrder(order.paymentMethod));
  if (!codOrders.length) {
    return { paid: false, amount: 0, paymentId: "", paymentLinkUrl: "" };
  }

  if (codOrders.every((order) => order.paymentStatus === "PAID")) {
    const paidOrder = codOrders[0];
    const qrType = paidOrder.deliveryQr?.qrType === "payment_link" ? "payment_link" : "upi_qr";
    return {
      paid: true,
      amount: codOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      paymentId: paidOrder.deliveryQr?.paymentId || paidOrder.paymentId || "",
      paymentLinkUrl: qrType === "payment_link" ? paidOrder.deliveryQr?.imageUrl || "" : ""
    };
  }

  const referenceId = codOrders.find((order) => order.deliveryQr?.razorpayQrId)?.deliveryQr?.razorpayQrId;
  if (!referenceId) {
    return { paid: false, amount: 0, paymentId: "", paymentLinkUrl: "" };
  }

  const synced = await PaymentService.syncCodDeliveryPayment(referenceId);
  if (synced?.paid) {
    await markOrdersPaidFromDeliveryQr(
      codOrders.filter((order) => order.paymentStatus !== "PAID"),
      synced.paymentId || ""
    );
  }

  return synced;
};
