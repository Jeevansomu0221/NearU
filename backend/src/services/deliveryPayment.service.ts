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
  paymentLinkUrl: string;
  razorpayQrId: string;
  expiresAt: Date | null;
  paidAt: Date | null;
  paymentId: string;
}) => ({
  alreadyPaid: input.alreadyPaid,
  amount: input.amount,
  paymentLinkUrl: input.paymentLinkUrl,
  imageUrl: input.paymentLinkUrl,
  razorpayQrId: input.razorpayQrId,
  expiresAt: input.expiresAt,
  paidAt: input.paidAt,
  paymentId: input.paymentId
});

export const ensureDeliveryQrForOrders = async (orders: DeliveryQrOrder[]) => {
  const codOrders = orders.filter((order) => isCodAwaitingPayment(order));
  if (!codOrders.length) {
    throw new Error("This order is not awaiting cash-on-delivery payment");
  }

  const unpaidOrders = codOrders.filter((order) => order.paymentStatus !== "PAID");
  if (!unpaidOrders.length) {
    const paidOrder = codOrders[0];
    const paymentLinkUrl = paidOrder.deliveryQr?.imageUrl || "";
    return buildDeliveryPaymentResponse({
      alreadyPaid: true,
      amount: Number(paidOrder.grandTotal || 0),
      paymentLinkUrl,
      razorpayQrId: paidOrder.deliveryQr?.razorpayQrId || "",
      expiresAt: paidOrder.deliveryQr?.expiresAt || null,
      paidAt: paidOrder.deliveryQr?.paidAt || null,
      paymentId: paidOrder.deliveryQr?.paymentId || paidOrder.paymentId || ""
    });
  }

  const existingLinkId = unpaidOrders.find((order) => order.deliveryQr?.razorpayQrId)?.deliveryQr?.razorpayQrId;
  if (existingLinkId) {
    const synced = await PaymentService.syncCodDeliveryPayment(existingLinkId);
    if (synced?.paid) {
      await markOrdersPaidFromDeliveryQr(unpaidOrders, synced.paymentId || "");
      const paidOrder = unpaidOrders[0];
      return buildDeliveryPaymentResponse({
        alreadyPaid: true,
        amount: synced.amount || Number(paidOrder.grandTotal || 0),
        paymentLinkUrl: synced.paymentLinkUrl || paidOrder.deliveryQr?.imageUrl || "",
        razorpayQrId: existingLinkId,
        expiresAt: paidOrder.deliveryQr?.expiresAt || null,
        paidAt: new Date(),
        paymentId: synced.paymentId || ""
      });
    }

    const anchor = unpaidOrders.find((order) => order.deliveryQr?.razorpayQrId === existingLinkId) || unpaidOrders[0];
    const paymentLinkUrl = anchor.deliveryQr?.imageUrl || synced.paymentLinkUrl || "";
    return buildDeliveryPaymentResponse({
      alreadyPaid: false,
      amount: Number(
        anchor.deliveryQr?.amount || unpaidOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0)
      ),
      paymentLinkUrl,
      razorpayQrId: existingLinkId,
      expiresAt: anchor.deliveryQr?.expiresAt || null,
      paidAt: null,
      paymentId: ""
    });
  }

  const amount = unpaidOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
  const orderIds = unpaidOrders.map((order) => String(order._id)).join(",");
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

  for (const order of unpaidOrders) {
    order.deliveryQr = {
      razorpayQrId: paymentLink.id,
      imageUrl: paymentLink.short_url,
      amount,
      createdAt: new Date(),
      expiresAt,
      paidAt: undefined,
      paymentId: ""
    };
    await order.save();
  }

  return buildDeliveryPaymentResponse({
    alreadyPaid: false,
    amount,
    paymentLinkUrl: paymentLink.short_url,
    razorpayQrId: paymentLink.id,
    expiresAt,
    paidAt: null,
    paymentId: ""
  });
};

export const syncDeliveryPaymentForOrders = async (orders: DeliveryQrOrder[]) => {
  const codOrders = orders.filter((order) => isCodOrder(order.paymentMethod));
  if (!codOrders.length) {
    return { paid: false, amount: 0, paymentId: "", paymentLinkUrl: "" };
  }

  if (codOrders.every((order) => order.paymentStatus === "PAID")) {
    return {
      paid: true,
      amount: codOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      paymentId: codOrders[0].deliveryQr?.paymentId || codOrders[0].paymentId || "",
      paymentLinkUrl: codOrders[0].deliveryQr?.imageUrl || ""
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
