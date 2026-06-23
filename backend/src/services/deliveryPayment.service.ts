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

const isPayAtDeliveryMethod = (paymentMethod?: string) =>
  paymentMethod === "CASH_ON_DELIVERY" || paymentMethod === "UPI_AT_DELIVERY";

export const isUpiAtDeliveryMethod = (paymentMethod?: string) => paymentMethod === "UPI_AT_DELIVERY";

export const markOrdersPaidFromDeliveryQr = async (
  orders: DeliveryQrOrder[],
  paymentId: string
) => {
  const now = new Date();
  for (const order of orders) {
    if (!isUpiAtDeliveryMethod(order.paymentMethod)) {
      continue;
    }

    order.paymentStatus = "PAID";
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

export const ensureDeliveryQrForOrders = async (orders: DeliveryQrOrder[]) => {
  const upiOrders = orders.filter((order) => isUpiAtDeliveryMethod(order.paymentMethod));
  if (!upiOrders.length) {
    throw new Error("This order does not require UPI payment at delivery");
  }

  const unpaidOrders = upiOrders.filter((order) => order.paymentStatus !== "PAID");
  if (!unpaidOrders.length) {
    const paidOrder = upiOrders[0];
    return {
      alreadyPaid: true,
      amount: Number(paidOrder.grandTotal || 0),
      imageUrl: paidOrder.deliveryQr?.imageUrl || "",
      razorpayQrId: paidOrder.deliveryQr?.razorpayQrId || "",
      expiresAt: paidOrder.deliveryQr?.expiresAt || null,
      paidAt: paidOrder.deliveryQr?.paidAt || null,
      paymentId: paidOrder.deliveryQr?.paymentId || paidOrder.paymentId || ""
    };
  }

  const existingQrId = unpaidOrders.find((order) => order.deliveryQr?.razorpayQrId)?.deliveryQr?.razorpayQrId;
  if (existingQrId) {
    const synced = await PaymentService.syncDeliveryQrPayment(existingQrId);
    if (synced?.paid) {
      await markOrdersPaidFromDeliveryQr(unpaidOrders, synced.paymentId || "");
      const paidOrder = unpaidOrders[0];
      return {
        alreadyPaid: true,
        amount: synced.amount || Number(paidOrder.grandTotal || 0),
        imageUrl: paidOrder.deliveryQr?.imageUrl || synced.imageUrl || "",
        razorpayQrId: existingQrId,
        expiresAt: paidOrder.deliveryQr?.expiresAt || null,
        paidAt: new Date(),
        paymentId: synced.paymentId || ""
      };
    }

    const anchor = unpaidOrders.find((order) => order.deliveryQr?.razorpayQrId === existingQrId) || unpaidOrders[0];
    return {
      alreadyPaid: false,
      amount: Number(anchor.deliveryQr?.amount || unpaidOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0)),
      imageUrl: anchor.deliveryQr?.imageUrl || "",
      razorpayQrId: existingQrId,
      expiresAt: anchor.deliveryQr?.expiresAt || null,
      paidAt: null,
      paymentId: ""
    };
  }

  const amount = unpaidOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
  const orderIds = unpaidOrders.map((order) => String(order._id)).join(",");
  const qr = await PaymentService.createDeliveryQr({
    amountPaise: Math.round(amount * 100),
    description: `Vyaha delivery payment for ${unpaidOrders.length} order(s)`,
    notes: {
      orderIds,
      purpose: "UPI_AT_DELIVERY"
    }
  });

  const expiresAt = qr.close_by ? new Date(qr.close_by * 1000) : new Date(Date.now() + 2 * 60 * 60 * 1000);
  for (const order of unpaidOrders) {
    order.deliveryQr = {
      razorpayQrId: qr.id,
      imageUrl: qr.image_url,
      amount,
      createdAt: new Date(),
      expiresAt,
      paidAt: undefined,
      paymentId: ""
    };
    await order.save();
  }

  return {
    alreadyPaid: false,
    amount,
    imageUrl: qr.image_url,
    razorpayQrId: qr.id,
    expiresAt,
    paidAt: null,
    paymentId: ""
  };
};

export const syncDeliveryPaymentForOrders = async (orders: DeliveryQrOrder[]) => {
  const upiOrders = orders.filter((order) => isUpiAtDeliveryMethod(order.paymentMethod));
  if (!upiOrders.length) {
    return { paid: false, amount: 0 };
  }

  if (upiOrders.every((order) => order.paymentStatus === "PAID")) {
    return {
      paid: true,
      amount: upiOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
      paymentId: upiOrders[0].deliveryQr?.paymentId || upiOrders[0].paymentId || ""
    };
  }

  const qrId = upiOrders.find((order) => order.deliveryQr?.razorpayQrId)?.deliveryQr?.razorpayQrId;
  if (!qrId) {
    return { paid: false, amount: 0 };
  }

  const synced = await PaymentService.syncDeliveryQrPayment(qrId);
  if (synced?.paid) {
    await markOrdersPaidFromDeliveryQr(
      upiOrders.filter((order) => order.paymentStatus !== "PAID"),
      synced.paymentId || ""
    );
  }

  return synced;
};

export { isPayAtDeliveryMethod };
