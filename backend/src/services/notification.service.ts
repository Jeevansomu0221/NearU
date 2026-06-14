import admin from "firebase-admin";
import mongoose from "mongoose";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import User from "../models/User.model";
import { getFirebaseApp } from "./firebaseAuth.service";

export type NotificationApp = "customer" | "partner" | "delivery";

type NotificationData = Record<string, string | number | boolean | null | undefined>;

type SendOptions = {
  title: string;
  body: string;
  data?: NotificationData;
  app?: NotificationApp;
};

const CUSTOMER_ORDER_COPY: Record<string, { title: string; body: string }> = {
  CONFIRMED: {
    title: "Order confirmed",
    body: "Your order is confirmed. The shop will start preparing it soon."
  },
  ACCEPTED: {
    title: "Order accepted",
    body: "The shop accepted your order."
  },
  PREPARING: {
    title: "Preparing your order",
    body: "Your food is being prepared now."
  },
  READY: {
    title: "Order ready",
    body: "Your order is packed and ready for pickup."
  },
  ASSIGNED: {
    title: "Delivery partner assigned",
    body: "A delivery partner has accepted your order."
  },
  PICKED_UP: {
    title: "Order on the way",
    body: "Your delivery partner has picked up the order."
  },
  DELIVERED: {
    title: "Order delivered",
    body: "Your order has been delivered."
  },
  CANCELLED: {
    title: "Order cancelled",
    body: "Your order was cancelled."
  },
  REJECTED: {
    title: "Order cancelled",
    body: "The shop could not accept this order."
  }
};

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument"
]);

const ANDROID_NOTIFICATION_CHANNEL_ID = "vyaha_alerts";
const ANDROID_NOTIFICATION_ICON = "vyaha_notification_icon";
const ANDROID_NOTIFICATION_COLORS: Record<NotificationApp, string> = {
  customer: "#0F9D58",
  delivery: "#0F9D58",
  partner: "#174EA6"
};

const idString = (value: any) => {
  const rawId = value?._id || value;
  if (!rawId) return "";
  return typeof rawId.toString === "function" ? rawId.toString() : String(rawId);
};

const compactIds = (values: any[]) =>
  Array.from(new Set(values.map((value) => idString(value)).filter(Boolean)));

const compactStrings = (values: any[]) =>
  values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...` : value;

const formatMoneyForNotification = (amount: number) =>
  `Rs ${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;

const formatAddressForNotification = (address: any) => {
  if (!address) return "";
  if (typeof address === "string") return truncate(address.trim(), 120);

  return truncate(
    compactStrings([
      address.flatNo,
      address.apartment,
      address.roadStreet,
      address.colony,
      address.area || address.areaLocality,
      address.city || address.cityTownVillage,
      address.pincode
    ]).join(", "),
    120
  );
};

const getDeliveryJobNotificationDetails = async (order: any) => {
  const orderId = idString(order._id);
  const populatedOrder = orderId
    ? await Order.findById(orderId)
        .populate("customerId", "name phone")
        .populate("partnerId", "restaurantName shopName address")
        .select("customerId partnerId deliveryAddress deliveryFee grandTotal paymentMethod")
        .lean()
    : null;
  const source = populatedOrder || order;
  const partner = source.partnerId || {};
  const customer = source.customerId || {};
  const restaurantName = partner.restaurantName || partner.shopName || "Restaurant";
  const pickupAddress = formatAddressForNotification(partner.address);
  const dropAddress = formatAddressForNotification(source.deliveryAddress);
  const earnings = Number(source.deliveryFee || 0) || 49;
  const orderTotal = Number(source.grandTotal || 0);
  const paymentLabel = source.paymentMethod === "CASH_ON_DELIVERY" ? "COD" : "Pre-paid";

  return {
    orderId,
    restaurantName,
    pickupAddress,
    dropAddress,
    customerName: customer.name || "Customer",
    earnings,
    orderTotal,
    paymentLabel
  };
};

const toStringData = (data: NotificationData = {}) =>
  Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = String(value);
    }
    return acc;
  }, {});

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getEnabledTokensForUsers = async (userIds: string[], app?: NotificationApp) => {
  const normalizedIds = compactIds(userIds);
  if (!normalizedIds.length) return [];

  const users = await User.find({
    _id: { $in: normalizedIds.map((id) => new mongoose.Types.ObjectId(id)) }
  })
    .select("notificationTokens")
    .lean();

  const tokens = users.flatMap((user: any) =>
    (Array.isArray(user.notificationTokens) ? user.notificationTokens : [])
      .filter((entry: any) => entry?.enabled !== false && entry?.token && (!app || entry.app === app))
      .map((entry: any) => String(entry.token))
  );

  return Array.from(new Set(tokens));
};

const disableInvalidTokens = async (tokens: string[]) => {
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  if (!uniqueTokens.length) return;

  await User.updateMany(
    { "notificationTokens.token": { $in: uniqueTokens } },
    {
      $set: {
        "notificationTokens.$[token].enabled": false,
        "notificationTokens.$[token].disabledAt": new Date()
      }
    },
    { arrayFilters: [{ "token.token": { $in: uniqueTokens } }] }
  );
};

export const sendNotificationToUsers = async (userIds: any[], options: SendOptions) => {
  try {
    const tokens = await getEnabledTokensForUsers(compactIds(userIds), options.app);
    if (!tokens.length) {
      return { sent: 0, failed: 0 };
    }

    getFirebaseApp();
    const messaging = admin.messaging();
    const data = toStringData(options.data);
    const invalidTokens: string[] = [];
    let sent = 0;
    let failed = 0;

    for (const tokenBatch of chunk(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenBatch,
        notification: {
          title: options.title,
          body: options.body
        },
        data,
        android: {
          priority: "high",
          notification: {
            channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
            color: ANDROID_NOTIFICATION_COLORS[options.app || "customer"],
            icon: ANDROID_NOTIFICATION_ICON,
            priority: "high",
            sound: "default"
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "default"
            }
          }
        }
      });

      sent += response.successCount;
      failed += response.failureCount;
      response.responses.forEach((result, index) => {
        const code = result.error?.code;
        if (code && INVALID_TOKEN_CODES.has(code)) {
          invalidTokens.push(tokenBatch[index]);
        }
      });
    }

    await disableInvalidTokens(invalidTokens);
    return { sent, failed };
  } catch (error) {
    console.error("Notification send failed:", error);
    return { sent: 0, failed: 0 };
  }
};

export const notifyPartnerNewOrder = async (order: any) => {
  const partner = await Partner.findById(order.partnerId).select("userId restaurantName shopName notifications").lean();
  const partnerUserId = idString((partner as any)?.userId);
  if (!partnerUserId || (partner as any)?.notifications?.newOrderAlerts === false) return;

  const shopName = (partner as any)?.restaurantName || (partner as any)?.shopName || "your shop";
  await sendNotificationToUsers([partnerUserId], {
    app: "partner",
    title: "New order received",
    body: `Order #${idString(order._id).slice(-6)} is waiting for acceptance at ${shopName}.`,
    data: {
      type: "NEW_ORDER",
      orderId: idString(order._id),
      status: order.status || "CONFIRMED"
    }
  });
};

export const notifyCustomerOrderStatus = async (order: any, status: string) => {
  const orderId = idString(order._id);
  const copy = CUSTOMER_ORDER_COPY[status] || {
    title: "Order update",
    body: `Order #${orderId.slice(-6)} status changed to ${status}.`
  };

  await sendNotificationToUsers([order.customerId], {
    app: "customer",
    title: copy.title,
    body:
      status === "CANCELLED" || status === "REJECTED"
        ? order.customerCancellationMessage || copy.body
        : copy.body,
    data: {
      type: "ORDER_STATUS",
      orderId,
      status
    }
  });
};

export const notifyDeliveryJobReady = async (order: any) => {
  const selfDelivery = order.selfDelivery || {};
  const reservedFor = compactIds(Array.isArray(selfDelivery.reservedFor) ? selfDelivery.reservedFor : []);
  const targetUserIds = reservedFor.length
    ? reservedFor
    : compactIds(
        (await DeliveryPartner.find({
          status: { $in: ["ACTIVE", "VERIFIED"] },
          isAvailable: { $ne: false }
        })
          .select("userId")
          .lean()).map((partner: any) => partner.userId)
      );
  const details = await getDeliveryJobNotificationDetails(order);
  const bodyParts = [
    `Pickup: ${details.restaurantName}${details.pickupAddress ? ` - ${details.pickupAddress}` : ""}`,
    `Drop: ${details.customerName}${details.dropAddress ? ` - ${details.dropAddress}` : ""}`,
    `Earn Rs ${details.earnings} | Order Rs ${details.orderTotal} | ${details.paymentLabel}`
  ];

  await sendNotificationToUsers(targetUserIds, {
    app: "delivery",
    title: `New delivery job - Rs ${details.earnings}`,
    body: bodyParts.join("\n"),
    data: {
      type: "DELIVERY_JOB_READY",
      orderId: details.orderId,
      jobId: details.orderId,
      status: "READY",
      notificationStyle: "DELIVERY_JOB_ACTIONS",
      restaurantName: details.restaurantName,
      pickupAddress: details.pickupAddress,
      dropAddress: details.dropAddress,
      customerName: details.customerName,
      earnings: details.earnings,
      orderTotal: details.orderTotal,
      paymentLabel: details.paymentLabel
    }
  });
};

export const notifyDeliveryAssigned = async (order: any) => {
  const partner = await Partner.findById(order.partnerId).select("userId").lean();
  await Promise.all([
    sendNotificationToUsers([order.customerId], {
      app: "customer",
      title: "Delivery partner assigned",
      body: "A delivery partner has accepted your order.",
      data: {
        type: "ORDER_STATUS",
        orderId: idString(order._id),
        status: "ASSIGNED"
      }
    }),
    sendNotificationToUsers([(partner as any)?.userId], {
      app: "partner",
      title: "Delivery partner assigned",
      body: `Order #${idString(order._id).slice(-6)} has a delivery partner.`,
      data: {
        type: "ORDER_STATUS",
        orderId: idString(order._id),
        status: "ASSIGNED"
      }
    })
  ]);
};

export const notifyAssignedDeliveryPartner = async (order: any) => {
  await sendNotificationToUsers([order.deliveryPartnerId], {
    app: "delivery",
    title: "Delivery assigned",
    body: `Order #${idString(order._id).slice(-6)} has been assigned to you.`,
    data: {
      type: "DELIVERY_ASSIGNED",
      orderId: idString(order._id),
      jobId: idString(order._id)
    }
  });
};

export const notifyPartnerDeliveryStatus = async (order: any, status: string) => {
  const partner = await Partner.findById(order.partnerId).select("userId").lean();
  const titles: Record<string, string> = {
    PICKED_UP: "Order picked up",
    DELIVERED: "Order delivered",
    CANCELLED: "Order cancelled"
  };

  await sendNotificationToUsers([(partner as any)?.userId], {
    app: "partner",
    title: titles[status] || "Order update",
    body: `Order #${idString(order._id).slice(-6)} status changed to ${status}.`,
    data: {
      type: "ORDER_STATUS",
      orderId: idString(order._id),
      status
    }
  });
};

export const notifyPartnerApplicationStatus = async (partner: any) => {
  await sendNotificationToUsers([partner.userId], {
    app: "partner",
    title: partner.status === "APPROVED" ? "Shop approved" : "Shop application updated",
    body:
      partner.status === "APPROVED"
        ? "Your shop is approved and ready to receive orders."
        : partner.rejectionReason || "Please check your partner application status.",
    data: {
      type: "PARTNER_STATUS",
      status: partner.status
    }
  });
};

export const notifyPartnerDocumentReupload = async (partner: any) => {
  await sendNotificationToUsers([partner.userId], {
    app: "partner",
    title: "Document re-upload requested",
    body: partner.documents?.reuploadNotes || "Please update the requested shop documents.",
    data: {
      type: "PARTNER_REUPLOAD",
      status: partner.status || "PENDING"
    }
  });
};

export const notifyDeliveryApplicationStatus = async (deliveryPartner: any) => {
  await sendNotificationToUsers([deliveryPartner.userId], {
    app: "delivery",
    title: ["VERIFIED", "ACTIVE"].includes(deliveryPartner.status) ? "Delivery profile approved" : "Delivery profile updated",
    body:
      ["VERIFIED", "ACTIVE"].includes(deliveryPartner.status)
        ? "You can now receive delivery jobs."
        : deliveryPartner.reviewComment || "Please check your delivery profile status.",
    data: {
      type: "DELIVERY_STATUS",
      status: deliveryPartner.status
    }
  });
};

export const notifyDeliveryDocumentReupload = async (deliveryPartner: any) => {
  await sendNotificationToUsers([deliveryPartner.userId], {
    app: "delivery",
    title: "Document re-upload requested",
    body: deliveryPartner.documents?.reuploadNotes || deliveryPartner.reviewComment || "Please update the requested delivery documents.",
    data: {
      type: "DELIVERY_REUPLOAD",
      status: deliveryPartner.status || "REJECTED"
    }
  });
};

export const notifyPayoutPaid = async (payout: any) => {
  const recipientType = payout?.recipientType;
  const recipientId = idString(payout?.recipientId);
  if (!recipientId) return;

  const recipient =
    recipientType === "PARTNER"
      ? await Partner.findById(recipientId).select("userId").lean()
      : recipientType === "DELIVERY_PARTNER"
        ? await DeliveryPartner.findById(recipientId).select("userId").lean()
        : null;
  const userId = idString((recipient as any)?.userId);
  if (!userId) return;

  const amount = Number(payout?.amount || 0);
  await sendNotificationToUsers([userId], {
    app: recipientType === "PARTNER" ? "partner" : "delivery",
    title: "Wallet money paid",
    body:
      amount > 0
        ? `${formatMoneyForNotification(amount)} has been paid to your bank account. Please check your bank.`
        : "Your payout has been settled. Please check your wallet history.",
    data: {
      type: "PAYOUT_PAID",
      payoutId: idString(payout?._id),
      recipientType,
      amount,
      status: payout?.status || "PAID",
      paidAt: payout?.paidAt instanceof Date ? payout.paidAt.toISOString() : payout?.paidAt
    }
  });
};

export const notifyPaymentConfirmed = async (orderId: string) => {
  const order = await Order.findById(orderId).select("_id partnerId status").lean();
  if (order?.status === "CONFIRMED") {
    await notifyPartnerNewOrder(order);
  }
};
