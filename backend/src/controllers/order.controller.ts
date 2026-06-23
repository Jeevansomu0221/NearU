// NEARU/backend/src/controllers/order.controller.ts
import { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import MenuItem from "../models/MenuItem.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import CashLedgerEntry from "../models/CashLedgerEntry.model";
import User from "../models/User.model";
import { CONSUMER_APP_ROLES, ROLES } from "../config/roles";
import { successResponse, errorResponse } from "../utils/response";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  notifyAssignedDeliveryPartner,
  notifyCustomerOrderStatus,
  notifyDeliveryAssigned,
  notifyDeliveryJobReady,
  notifyPartnerDeliveryStatus,
  notifyPartnerNewOrder
} from "../services/notification.service";

const isConsumerAppRole = (role?: string) =>
  !!role && CONSUMER_APP_ROLES.some((allowedRole) => allowedRole === role.toLowerCase());

const RESTAURANT_ACCEPT_TIMEOUT_MS = 10 * 60 * 1000;
const DELIVERY_ACCEPT_TIMEOUT_MS = 30 * 60 * 1000;
const SELF_DELIVERY_ACCEPT_TIMEOUT_MS = 5 * 60 * 1000;
const DELIVERY_FIRST_KM_FEE = 15;
const DELIVERY_ADDITIONAL_KM_FEE = 10;
const FOOD_GST_RATE = 0.05;

const parseOrderPagination = (req: AuthRequest) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || "30"), 10) || 30));
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};
const DELIVERY_GST_RATE = 0.18;
const PLATFORM_FEE = 0;
const AUTO_CANCEL_MESSAGE =
  "Sorry for the problem. We could not place this order. If online payment was done, the refund will be completed within today.";

const resolvePartnerForUser = async (user?: AuthRequest["user"]) => {
  if (!user) return null;

  if (user.partnerId && mongoose.Types.ObjectId.isValid(user.partnerId)) {
    const partnerByToken = await Partner.findById(user.partnerId);
    if (partnerByToken) return partnerByToken;
  }

  let partner = mongoose.Types.ObjectId.isValid(user.id)
    ? await Partner.findOne({ userId: user.id })
    : null;
  if (!partner && user.phone) {
    partner = await Partner.findOne({ phone: user.phone });
    if (partner && !partner.userId && mongoose.Types.ObjectId.isValid(user.id)) {
      partner.userId = new mongoose.Types.ObjectId(user.id);
      await partner.save();
    }
  }

  return partner;
};

const resolveDeliveryPartnerForUser = async (user?: AuthRequest["user"], select = "") => {
  if (!user) return null;

  const byUserId = mongoose.Types.ObjectId.isValid(user.id)
    ? await DeliveryPartner.findOne({ userId: user.id }).select(select)
    : null;
  if (byUserId) return byUserId;

  return user.phone
    ? DeliveryPartner.findOne({ phone: user.phone }).select(select)
    : null;
};

const idString = (value: any) => {
  const rawId = value?._id || value;
  if (!rawId) return "";
  return typeof rawId.toString === "function" ? rawId.toString() : String(rawId);
};

const idsMatch = (left: any, right: any) => {
  const leftId = idString(left);
  const rightId = idString(right);
  return Boolean(leftId && rightId && leftId === rightId);
};

const enrichDeliveryPartnerProfiles = async <T extends Record<string, any>>(orders: T[]): Promise<T[]> => {
  const deliveryUserIds = Array.from(
    new Set(orders.map((order) => idString(order.deliveryPartnerId)).filter(Boolean))
  );

  if (deliveryUserIds.length === 0) {
    return orders;
  }

  const deliveryProfiles = await DeliveryPartner.find({
    userId: { $in: deliveryUserIds.map((id) => new mongoose.Types.ObjectId(id)) }
  })
    .select("userId name phone vehicleType")
    .lean();

  const profilesByUserId = new Map(deliveryProfiles.map((profile: any) => [idString(profile.userId), profile]));

  return orders.map((order) => {
    const deliveryUserId = idString(order.deliveryPartnerId);
    const profile = profilesByUserId.get(deliveryUserId);
    if (!deliveryUserId || !profile) return order;

    const existing = order.deliveryPartnerId && typeof order.deliveryPartnerId === "object"
      ? order.deliveryPartnerId
      : { _id: deliveryUserId };

    return {
      ...order,
      deliveryPartnerId: {
        ...existing,
        name: profile.name || existing.name || "",
        phone: profile.phone || existing.phone || "",
        vehicleType: profile.vehicleType || existing.vehicleType || ""
      }
    };
  });
};

const idStrings = (values: any[] = []) => values.map((value) => idString(value)).filter(Boolean);

const getActiveSelfDeliveryUserIds = (partner: any): string[] => {
  const settings = partner?.settings || {};
  if (settings.deliveryMode !== "self") return [];

  return (Array.isArray(settings.selfDeliveryPartners) ? settings.selfDeliveryPartners : [])
    .filter((entry: any) => entry?.isActive !== false && entry?.userId)
    .map((entry: any) => idString(entry.userId))
    .filter(Boolean)
    .slice(0, 5);
};

const getOnlineSelfDeliveryUserIds = async (partner: any): Promise<string[]> => {
  const selfDeliveryUserIds = getActiveSelfDeliveryUserIds(partner);
  if (selfDeliveryUserIds.length === 0) return [];

  const activeUserObjectIds = selfDeliveryUserIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (activeUserObjectIds.length === 0) return [];

  const onlineRiders = await DeliveryPartner.find({
    userId: { $in: activeUserObjectIds },
    status: { $in: ["ACTIVE", "VERIFIED"] },
    isAvailable: { $ne: false }
  })
    .select("userId")
    .lean();
  const onlineUserIds = new Set(onlineRiders.map((rider: any) => idString(rider.userId)));

  return selfDeliveryUserIds.filter((id) => onlineUserIds.has(id));
};

const getSelfDeliveryState = (order: any, now = new Date()) => {
  const selfDelivery = order?.selfDelivery || {};
  const reservedFor = idStrings(selfDelivery.reservedFor);
  const rejectedBy = new Set(idStrings(selfDelivery.rejectedBy));
  const expiresAt = selfDelivery.expiresAt ? new Date(selfDelivery.expiresAt) : null;
  const isSelfMode = selfDelivery.mode === "self" && reservedFor.length > 0;
  const isExpired = !expiresAt || expiresAt.getTime() <= now.getTime();
  const allReservedRidersRejected = reservedFor.length > 0 && reservedFor.every((id) => rejectedBy.has(id));
  const fallbackReleased = Boolean(selfDelivery.fallbackReleasedAt) || isExpired || allReservedRidersRejected;

  return {
    reservedFor,
    rejectedBy,
    expiresAt,
    isSelfMode,
    fallbackReleased
  };
};

const isDeliveryJobVisibleToUser = (order: any, userId: string, now = new Date()) => {
  const deliveryRejectedBy = new Set(idStrings(order?.deliveryRejectedBy));
  if (deliveryRejectedBy.has(userId)) return false;

  const selfDelivery = getSelfDeliveryState(order, now);
  if (!selfDelivery.isSelfMode || selfDelivery.fallbackReleased) return true;

  return selfDelivery.reservedFor.includes(userId) && !selfDelivery.rejectedBy.has(userId);
};

const buildUnassignedDeliveryFilter = () => ({
  $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }]
});

const buildStaleDeliveryReadyFilter = (deadline: Date) => ({
  $or: [
    { deliveryReadyAt: { $lte: deadline } },
    { deliveryReadyAt: { $exists: false }, updatedAt: { $lte: deadline } },
    { deliveryReadyAt: null, updatedAt: { $lte: deadline } }
  ]
});

const buildFreshDeliveryReadyFilter = (deadline: Date) => ({
  $or: [
    { deliveryReadyAt: { $gt: deadline } },
    { deliveryReadyAt: { $exists: false }, updatedAt: { $gt: deadline } },
    { deliveryReadyAt: null, updatedAt: { $gt: deadline } }
  ]
});

const buildDeliveryAcceptVisibilityFilter = (userId: string, now = new Date()) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return {
    $or: [
      { "selfDelivery.mode": { $ne: "self" } },
      { "selfDelivery.reservedFor": { $size: 0 } },
      { "selfDelivery.expiresAt": { $lte: now } },
      { "selfDelivery.fallbackReleasedAt": { $type: "date", $lte: now } },
      {
        $and: [
          { "selfDelivery.reservedFor": userObjectId },
          { "selfDelivery.rejectedBy": { $ne: userObjectId } },
          { "selfDelivery.expiresAt": { $gt: now } }
        ]
      }
    ]
  };
};

const configureSelfDeliveryForReadyOrder = async (order: any, partner: any) => {
  const selfDeliveryUserIds = await getOnlineSelfDeliveryUserIds(partner);

  if (selfDeliveryUserIds.length === 0) {
    order.selfDelivery = {
      mode: "platform",
      reservedFor: [],
      rejectedBy: [],
      expiresAt: undefined,
      fallbackReleasedAt: undefined
    };
    return;
  }

  order.selfDelivery = {
    mode: "self",
    reservedFor: selfDeliveryUserIds.map((id) => new mongoose.Types.ObjectId(id)),
    rejectedBy: [],
    expiresAt: new Date(Date.now() + SELF_DELIVERY_ACCEPT_TIMEOUT_MS),
    fallbackReleasedAt: undefined
  };
};

const maskedCustomerFrom = (customer: any): MaskedCustomer => {
  const phone = typeof customer?.phone === "string" ? customer.phone : "";
  const maskedCustomer: MaskedCustomer = {
    _id: idString(customer) || "masked",
    name: "Customer"
  };

  if (phone.length > 3) {
    maskedCustomer.phone = `XXXXXX${phone.slice(-3)}`;
  }

  return maskedCustomer;
};

const maskDeliveryAddressForPartner = (value: unknown) => {
  if (typeof value !== "string") return value;

  const addressParts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (addressParts.length > 2) {
    return `${addressParts[addressParts.length - 2]}, ${addressParts[addressParts.length - 1]}`;
  }

  return value;
};

// Define interface for masked customer
interface MaskedCustomer {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  phone?: string;
}

const formatPartnerForDelivery = (partnerDoc: any) => {
  if (!partnerDoc) return partnerDoc;
  const partnerObj = partnerDoc.toObject ? partnerDoc.toObject() : partnerDoc;

  if (!partnerObj.address) {
    return partnerObj;
  }

  const addr = partnerObj.address;
  return {
    ...partnerObj,
    address: `${addr.roadStreet}, ${addr.colony}, ${addr.area}, ${addr.city}, ${addr.state} - ${addr.pincode}`,
    googleMapsLink: addr.googleMapsLink || "",
    location: partnerObj.location || null
  };
};

type GeoPoint = { type: "Point"; coordinates: [number, number] };

const buildGeoPoint = (latitudeInput: any, longitudeInput: any): GeoPoint | undefined => {
  const latitude = Number(latitudeInput);
  const longitude = Number(longitudeInput);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  ) {
    return {
      type: "Point",
      coordinates: [longitude, latitude]
    };
  }

  return undefined;
};

const buildGoogleMapsDirectionsLink = (location?: GeoPoint) => {
  const [longitude, latitude] = location?.coordinates || [];
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return undefined;
  }

  const destination = `${latitude},${longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
};

const normalizeLocationPayload = (value: any): GeoPoint | undefined => {
  const coordinateArray = Array.isArray(value?.coordinates) ? value.coordinates : undefined;

  return buildGeoPoint(
    value?.latitude ?? value?.lat ?? value?.coordinates?.latitude ?? coordinateArray?.[1],
    value?.longitude ?? value?.lng ?? value?.lon ?? value?.coordinates?.longitude ?? coordinateArray?.[0]
  );
};

const resolveCustomerSavedLocation = async (customerId: any): Promise<GeoPoint | undefined> => {
  const resolvedCustomerId = customerId?._id || customerId;
  if (!resolvedCustomerId) return undefined;

  const customer = await User.findById(resolvedCustomerId).select("address addresses").lean();
  if (!customer) return undefined;

  const addresses = Array.isArray((customer as any).addresses) ? (customer as any).addresses : [];
  const candidates = [
    addresses.find((entry: any) => entry?.isDefault),
    (customer as any).address,
    ...addresses
  ].filter(Boolean);

  for (const candidate of candidates) {
    const location = normalizeLocationPayload(candidate);
    if (location) return location;
  }

  return undefined;
};

const ensureDeliveryLocationForResponse = async (orderObj: any): Promise<any> => {
  if (!orderObj) return orderObj;

  const existingLocation = normalizeLocationPayload(orderObj.deliveryLocation);
  if (existingLocation) {
    orderObj.deliveryLocation = existingLocation;
    orderObj.deliveryGoogleMapsLink = buildGoogleMapsDirectionsLink(existingLocation);
    return orderObj;
  }

  const fallbackLocation = await resolveCustomerSavedLocation(orderObj.customerId);
  if (!fallbackLocation) return orderObj;

  orderObj.deliveryLocation = fallbackLocation;
  orderObj.deliveryGoogleMapsLink = buildGoogleMapsDirectionsLink(fallbackLocation);

  if (orderObj._id) {
    await Order.findByIdAndUpdate(orderObj._id, { deliveryLocation: fallbackLocation }).catch((error) => {
      console.error("Failed to persist fallback delivery location:", error);
    });
  }

  return orderObj;
};

const haversineKm = (from: [number, number], to: [number, number]) => {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isBundledDeliveryOrder = (order: any) =>
  Boolean(order?.deliveryBundleId && Number(order?.deliveryBundleSize || 1) > 1);

const getBundleStatus = (orders: any[]) => {
  const statuses = new Set(orders.map((order) => order.status));
  if (statuses.size === 1) return orders[0]?.status || "READY";
  if (statuses.has("PICKED_UP")) return "PICKED_UP";
  if (statuses.has("ASSIGNED")) return "ASSIGNED";
  if (orders.every((order) => order.status === "READY")) return "READY";
  return "PREPARING";
};

const sortBundleOrders = (orders: any[]) =>
  [...orders].sort((left, right) => {
    const leftSeq = Number(left.deliveryBundleSequence || 1);
    const rightSeq = Number(right.deliveryBundleSequence || 1);
    if (leftSeq !== rightSeq) return leftSeq - rightSeq;
    return idString(left._id).localeCompare(idString(right._id));
  });

const buildBundledDeliveryJob = (orders: any[]) => {
  const sortedOrders = sortBundleOrders(orders);
  const primary = sortedOrders[0];
  if (!primary || !isBundledDeliveryOrder(primary)) return primary;

  const itemTotal = sortedOrders.reduce((sum, order) => sum + Number(order.itemTotal || 0), 0);
  const deliveryFee = sortedOrders.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);
  const grandTotal = sortedOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
  const deliveryDistanceKm = sortedOrders.reduce((sum, order) => sum + Number(order.deliveryDistanceKm || 0), 0);
  const paymentMethod = sortedOrders.some((order) => order.paymentMethod === "CASH_ON_DELIVERY")
    ? "CASH_ON_DELIVERY"
    : primary.paymentMethod;
  const paymentStatus = sortedOrders.every((order) => order.paymentStatus === "PAID")
    ? "PAID"
    : primary.paymentStatus;

  return {
    ...primary,
    status: getBundleStatus(sortedOrders),
    isBundledDelivery: true,
    deliveryBundleSize: sortedOrders.length,
    itemTotal: roundMoney(itemTotal),
    deliveryFee: roundMoney(deliveryFee),
    grandTotal: roundMoney(grandTotal),
    deliveryDistanceKm: roundDistance(deliveryDistanceKm),
    paymentMethod,
    paymentStatus,
    items: sortedOrders.flatMap((order) => {
      const partnerName = order.partnerId?.restaurantName || order.partnerId?.shopName || "Restaurant";
      return (order.items || []).map((item: any) => ({
        ...item,
        shopName: partnerName,
        orderId: idString(order._id)
      }));
    }),
    bundleOrders: sortedOrders,
    pickupStops: sortedOrders.map((order) => ({
      orderId: idString(order._id),
      sequence: Number(order.deliveryBundleSequence || 1),
      status: order.status,
      partnerId: order.partnerId,
      items: order.items || [],
      itemTotal: order.itemTotal || 0,
      deliveryFee: order.deliveryFee || 0,
      grandTotal: order.grandTotal || 0
    }))
  };
};

const groupBundledDeliveryJobs = (orders: any[]) => {
  const grouped = new Map<string, any[]>();
  const jobs: any[] = [];

  for (const order of orders) {
    if (!isBundledDeliveryOrder(order)) {
      jobs.push(order);
      continue;
    }

    const bundleId = String(order.deliveryBundleId);
    grouped.set(bundleId, [...(grouped.get(bundleId) || []), order]);
  }

  for (const bundleOrders of grouped.values()) {
    const expectedSize = Number(bundleOrders[0]?.deliveryBundleSize || bundleOrders.length);
    if (bundleOrders.length >= expectedSize) {
      jobs.push(buildBundledDeliveryJob(bundleOrders));
    }
  }

  return jobs.sort((left, right) => {
    const leftDate = new Date(left.createdAt || 0).getTime();
    const rightDate = new Date(right.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
};

const getPopulatedBundleOrders = async (bundleId: string) => {
  const orders = await Order.find({ deliveryBundleId: bundleId })
    .populate("customerId", "name phone")
    .populate({
      path: "partnerId",
      select: "restaurantName shopName phone address category location",
      transform: formatPartnerForDelivery
    })
    .populate("deliveryPartnerId", "name phone")
    .sort({ deliveryBundleSequence: 1, createdAt: 1 });

  return Promise.all(orders.map((order: any) => ensureDeliveryLocationForResponse(order.toObject())));
};

const roundMoney = (value: number) => Number(value.toFixed(2));
const roundDistance = (value: number) => Number(value.toFixed(2));

const isValidCoordinates = (coordinates: any): coordinates is [number, number] =>
  Array.isArray(coordinates) &&
  coordinates.length === 2 &&
  coordinates.every((value) => Number.isFinite(Number(value))) &&
  !(Number(coordinates[0]) === 0 && Number(coordinates[1]) === 0);

const normalizeCoordinates = (coordinates: any): [number, number] | undefined => {
  if (!isValidCoordinates(coordinates)) return undefined;
  return [Number(coordinates[0]), Number(coordinates[1])];
};

const calculateTaxOffer = (itemTotal: number, deliveryFee: number) => {
  const foodGst = roundMoney(itemTotal * FOOD_GST_RATE);
  const deliveryGst = roundMoney(deliveryFee * DELIVERY_GST_RATE);
  const platformFee = PLATFORM_FEE;

  return {
    foodGst,
    deliveryGst,
    platformFee,
    taxDiscount: roundMoney(foodGst + deliveryGst + platformFee)
  };
};

const calculateDeliveryFee = (distanceKm: number) => {
  const billableKm = Math.max(1, Math.ceil(distanceKm));
  return DELIVERY_FIRST_KM_FEE + Math.max(0, billableKm - 1) * DELIVERY_ADDITIONAL_KM_FEE;
};

const findNearestRiderDistanceKm = async (
  shopCoordinates: [number, number],
  userIds?: string[]
): Promise<number | null> => {
  const filter: Record<string, any> = {
    status: { $in: ["ACTIVE", "VERIFIED"] },
    isAvailable: { $ne: false }
  };

  if (userIds?.length) {
    filter.userId = {
      $in: userIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id))
    };
  }

  const riders = await DeliveryPartner.find(filter)
    .select("currentLocation")
    .lean();

  let nearestDistance: number | null = null;

  for (const rider of riders) {
    const riderCoordinates = normalizeCoordinates((rider as any).currentLocation?.coordinates);
    if (!riderCoordinates) continue;

    const distance = haversineKm(riderCoordinates, shopCoordinates);
    if (nearestDistance === null || distance < nearestDistance) {
      nearestDistance = distance;
    }
  }

  return nearestDistance;
};

const resolveRiderToShopDistanceKm = async (partner: any, shopCoordinates: [number, number]) => {
  const selfDeliveryUserIds = getActiveSelfDeliveryUserIds(partner);
  const selfDeliveryDistance = selfDeliveryUserIds.length
    ? await findNearestRiderDistanceKm(shopCoordinates, selfDeliveryUserIds)
    : null;

  if (selfDeliveryDistance !== null) {
    return selfDeliveryDistance;
  }

  return await findNearestRiderDistanceKm(shopCoordinates);
};

const calculateDeliveryPricing = async (partner: any, deliveryLocation: GeoPoint) => {
  const shopLocation = normalizeLocationPayload(partner?.location);
  const shopCoordinates = normalizeCoordinates(shopLocation?.coordinates);
  const customerCoordinates = normalizeCoordinates(deliveryLocation.coordinates);

  if (!shopCoordinates) {
    throw new Error("Shop location is missing. Ask the restaurant to update its shop GPS pin.");
  }

  if (!customerCoordinates) {
    throw new Error("Exact delivery map pin is required. Please save your address GPS location.");
  }

  const shopToCustomerDistanceKm = haversineKm(shopCoordinates, customerCoordinates);
  const deliveryDistanceKm = shopToCustomerDistanceKm;

  return {
    riderToShopDistanceKm: 0,
    shopToCustomerDistanceKm: roundDistance(shopToCustomerDistanceKm),
    deliveryDistanceKm: roundDistance(deliveryDistanceKm),
    deliveryFee: calculateDeliveryFee(deliveryDistanceKm)
  };
};

/**
 * ================================
 * QUOTE ORDER PRICING
 * ================================
 */
export const quoteOrderPricing = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || !isConsumerAppRole(user.role)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { groups, deliveryLocation } = req.body;
    const normalizedDeliveryLocation = normalizeLocationPayload(deliveryLocation) || await resolveCustomerSavedLocation(user.id);

    if (!normalizedDeliveryLocation) {
      return errorResponse(res, "Exact delivery map pin is required. Please save your address GPS location.", 400);
    }

    if (!Array.isArray(groups) || groups.length === 0) {
      return errorResponse(res, "At least one shop is required for pricing", 400);
    }

    const pricedGroups = [];

    for (const group of groups) {
      const partnerId = group.partnerId || group.shopId;
      if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
        return errorResponse(res, "Invalid shop in pricing request", 400);
      }

      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return errorResponse(res, "Restaurant not found", 404);
      }

      if (partner.status !== "APPROVED") {
        return errorResponse(res, "Restaurant is not approved for orders", 400);
      }

      const itemTotal = Math.max(0, roundMoney(Number(group.itemTotal || group.subtotal || 0)));
      const deliveryPricing = await calculateDeliveryPricing(partner, normalizedDeliveryLocation);
      const taxOffer = calculateTaxOffer(itemTotal, deliveryPricing.deliveryFee);

      pricedGroups.push({
        partnerId: idString(partner._id),
        shopName: partner.restaurantName || partner.shopName || "Restaurant",
        itemTotal,
        ...deliveryPricing,
        ...taxOffer,
        grandTotal: roundMoney(itemTotal + deliveryPricing.deliveryFee),
        payableTotal: roundMoney(itemTotal + deliveryPricing.deliveryFee)
      });
    }

    const totals = pricedGroups.reduce(
      (sum, group) => ({
        itemTotal: roundMoney(sum.itemTotal + group.itemTotal),
        deliveryFee: roundMoney(sum.deliveryFee + group.deliveryFee),
        foodGst: roundMoney(sum.foodGst + group.foodGst),
        deliveryGst: roundMoney(sum.deliveryGst + group.deliveryGst),
        platformFee: roundMoney(sum.platformFee + group.platformFee),
        taxDiscount: roundMoney(sum.taxDiscount + group.taxDiscount),
        deliveryDistanceKm: roundDistance(sum.deliveryDistanceKm + group.deliveryDistanceKm),
        grandTotal: roundMoney(sum.grandTotal + group.grandTotal),
        payableTotal: roundMoney(sum.payableTotal + group.payableTotal)
      }),
      {
        itemTotal: 0,
        deliveryFee: 0,
        foodGst: 0,
        deliveryGst: 0,
        platformFee: 0,
        taxDiscount: 0,
        deliveryDistanceKm: 0,
        grandTotal: 0,
        payableTotal: 0
      }
    );

    return successResponse(res, { groups: pricedGroups, ...totals }, "Pricing calculated successfully");
  } catch (err: any) {
    console.error("quoteOrderPricing error:", err);
    return errorResponse(res, `Failed to calculate pricing: ${err.message}`);
  }
};

const markAutoCancelled = (order: any, reason: string) => {
  order.status = "CANCELLED";
  order.cancellationReason = reason;
  order.customerCancellationMessage = AUTO_CANCEL_MESSAGE;
  order.autoCancelledAt = new Date();

  if (order.paymentStatus === "PAID") {
    order.paymentStatus = "REFUNDED";
  } else if (["PENDING", "PAYMENT_PENDING_DELIVERY"].includes(order.paymentStatus)) {
    order.paymentStatus = "CANCELLED";
  }
};

export const cancelStaleUnacceptedOrders = async () => {
  try {
    const now = new Date();
    const restaurantDeadline = new Date(now.getTime() - RESTAURANT_ACCEPT_TIMEOUT_MS);
    const deliveryDeadline = new Date(now.getTime() - DELIVERY_ACCEPT_TIMEOUT_MS);

    const restaurantTimedOutFilter = {
      status: "CONFIRMED",
      createdAt: { $lte: restaurantDeadline }
    };

    const deliveryTimedOutFilter = {
      $and: [
        { status: "READY" },
        buildUnassignedDeliveryFilter(),
        buildStaleDeliveryReadyFilter(deliveryDeadline)
      ]
    };

    const autoCancelByPaymentStatus = async (baseFilter: any, reason: string) => {
      const baseSet = {
        status: "CANCELLED",
        cancellationReason: reason,
        customerCancellationMessage: AUTO_CANCEL_MESSAGE,
        autoCancelledAt: now
      };

      await Promise.all([
        Order.updateMany(
          { ...baseFilter, paymentStatus: "PAID" },
          { $set: { ...baseSet, paymentStatus: "REFUNDED" } }
        ),
        Order.updateMany(
          { ...baseFilter, paymentStatus: { $in: ["PENDING", "PAYMENT_PENDING_DELIVERY"] } },
          { $set: { ...baseSet, paymentStatus: "CANCELLED" } }
        ),
        Order.updateMany(
          { ...baseFilter, paymentStatus: { $nin: ["PAID", "PENDING", "PAYMENT_PENDING_DELIVERY"] } },
          { $set: baseSet }
        )
      ]);
    };

    const autoCancelJobs = [
      autoCancelByPaymentStatus(deliveryTimedOutFilter, "No delivery partner accepted the order in time")
    ];

    if (process.env.ENABLE_ORDER_AUTO_CANCEL === "true") {
      autoCancelJobs.push(
        autoCancelByPaymentStatus(restaurantTimedOutFilter, "Restaurant did not accept the order in time")
      );
    }

    await Promise.all(autoCancelJobs);
  } catch (error) {
    console.error("cancelStaleUnacceptedOrders error:", error);
  }
};

/**
 * ================================
 * CREATE SHOP ORDER (UPDATED WITH PAYMENT)
 * ================================
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || !isConsumerAppRole(user.role)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const {
      partnerId,
      deliveryAddress,
      deliveryLocation,
      items,
      note,
      paymentMethod = "RAZORPAY",
      deliveryBundleId,
      deliveryBundleSize,
      deliveryBundleSequence
    } = req.body;

    // Validate required fields
    if (!partnerId || !deliveryAddress) {
      return errorResponse(res, "Missing required fields: partnerId and deliveryAddress", 400);
    }

    if (!items || items.length === 0) {
      return errorResponse(res, "Items are required for orders", 400);
    }

    const normalizedBundleId = typeof deliveryBundleId === "string" ? deliveryBundleId.trim() : "";
    const normalizedBundleSize = Number(deliveryBundleSize || 1);
    const normalizedBundleSequence = Number(deliveryBundleSequence || 1);
    if (
      normalizedBundleId &&
      (!Number.isInteger(normalizedBundleSize) ||
        normalizedBundleSize < 2 ||
        normalizedBundleSize > 4 ||
        !Number.isInteger(normalizedBundleSequence) ||
        normalizedBundleSequence < 1 ||
        normalizedBundleSequence > normalizedBundleSize)
    ) {
      return errorResponse(res, "Invalid bundled delivery metadata", 400);
    }

    // Validate payment method
    const validPaymentMethods = ["RAZORPAY", "CASH_ON_DELIVERY", "CARD", "UPI", "WALLET"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return errorResponse(res, `Invalid payment method. Valid methods: ${validPaymentMethods.join(", ")}`, 400);
    }

    const normalizedDeliveryLocation = normalizeLocationPayload(deliveryLocation) || await resolveCustomerSavedLocation(user.id);
    if (!normalizedDeliveryLocation) {
      return errorResponse(res, "Exact delivery map pin is required. Please save your address GPS location.", 400);
    }

    // Validate partner exists and is open
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return errorResponse(res, "Restaurant not found", 404);
    }

    if (!partner.isOpen) {
      return errorResponse(res, "Restaurant is currently closed", 400);
    }

    if (partner.status !== "APPROVED") {
      return errorResponse(res, "Restaurant is not approved for orders", 400);
    }

    // Validate menu items and check availability
    let itemTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      
      if (!menuItem) {
        return errorResponse(res, `Item "${item.name}" not found in menu`, 400);
      }

      if (!menuItem.isAvailable) {
        return errorResponse(res, `Item "${item.name}" is currently unavailable`, 400);
      }

      if (menuItem.price !== item.price) {
        return errorResponse(res, `Price mismatch for "${item.name}"`, 400);
      }

      itemTotal += menuItem.price * item.quantity;
      validatedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price
      });
    }

    // Calculate totals from shop-to-customer distance. GST and platform
    // charges are recorded as waived so the payable amount remains transparent.
    const deliveryPricing = await calculateDeliveryPricing(partner, normalizedDeliveryLocation);
    const deliveryFee = deliveryPricing.deliveryFee;
    const taxOffer = calculateTaxOffer(itemTotal, deliveryFee);
    const grandTotal = roundMoney(itemTotal + deliveryFee);

    // Determine payment status based on payment method
    let paymentStatus: string;
    if (paymentMethod === "CASH_ON_DELIVERY") {
      // For COD orders, payment will be collected on delivery
      paymentStatus = "PAYMENT_PENDING_DELIVERY";
    } else {
      // For online payments, payment is pending
      paymentStatus = "PENDING";
    }

    // Determine initial order status
    // COD orders start as CONFIRMED, online payments start as PENDING
    const initialStatus = paymentMethod === "CASH_ON_DELIVERY" ? "CONFIRMED" : "PENDING";

    // Create the main order
    const order = new Order({
      orderType: "SHOP",
      customerId: user.id,
      partnerId,
      deliveryAddress,
      deliveryLocation: normalizedDeliveryLocation,
      deliveryBundleId: normalizedBundleId,
      deliveryBundleSize: normalizedBundleId ? normalizedBundleSize : 1,
      deliveryBundleSequence: normalizedBundleId ? normalizedBundleSequence : 1,
      note: note || "",
      items: validatedItems,
      itemTotal,
      deliveryFee,
      foodGst: taxOffer.foodGst,
      deliveryGst: taxOffer.deliveryGst,
      platformFee: taxOffer.platformFee,
      taxDiscount: taxOffer.taxDiscount,
      riderToShopDistanceKm: deliveryPricing.riderToShopDistanceKm,
      shopToCustomerDistanceKm: deliveryPricing.shopToCustomerDistanceKm,
      deliveryDistanceKm: deliveryPricing.deliveryDistanceKm,
      grandTotal,
      paymentMethod,
      paymentStatus,
      status: initialStatus
    });

    await order.save();

    // Update partner's order count
    await Partner.findByIdAndUpdate(
      partnerId,
      { $inc: { totalOrders: 1 } }
    );

    // Populate before sending response
    const populatedOrder = await Order.findById(order._id)
      .populate("partnerId", "restaurantName phone shopName")
      .populate("customerId", "name phone");

    console.log(`📱 Order ${order._id} created for partner ${partnerId}`);
    console.log(`💰 Payment Method: ${paymentMethod}, Payment Status: ${paymentStatus}, Order Status: ${initialStatus}`);

    if (initialStatus === "CONFIRMED") {
      void notifyPartnerNewOrder(order).catch((error) => {
        console.error("Failed to notify partner about new order:", error);
      });
    }

    return successResponse(res, populatedOrder, "Order created successfully");

  } catch (err: any) {
    console.error("createOrder error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name
    });
    return errorResponse(res, `Failed to create order: ${err.message}`);
  }
};

/**
 * ================================
 * UPDATE ORDER PAYMENT STATUS
 * ================================
 */
export const updateOrderPayment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { 
      paymentId, 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      paymentMethod,
      paymentStatus 
    } = req.body;

    if (!user || !isConsumerAppRole(user.role)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user is the customer who placed this order
    const userId = new mongoose.Types.ObjectId(user.id);
    if (!order.customerId.equals(userId)) {
      return errorResponse(res, "Unauthorized to update this order", 401);
    }

    // Validate payment status
    const validPaymentStatuses = ["PENDING", "PAYMENT_PENDING_DELIVERY", "PAID", "FAILED", "REFUNDED", "CANCELLED"];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return errorResponse(res, `Invalid payment status. Valid statuses: ${validPaymentStatuses.join(", ")}`, 400);
    }

    // Update payment details
    if (paymentId) order.paymentId = paymentId;
    if (razorpayOrderId) order.razorpayOrderId = razorpayOrderId;
    if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) order.razorpaySignature = razorpaySignature;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    
    // If payment is successful and order was PENDING, update to CONFIRMED
    const didConfirmOrder = paymentStatus === "PAID" && order.status === "PENDING";
    if (didConfirmOrder) {
      order.status = "CONFIRMED";
      order.cancellationReason = "";
      order.customerCancellationMessage = "";
      order.autoCancelledAt = undefined;
    }

    await order.save();

    // Get updated order with populated fields
    const updatedOrder = await Order.findById(orderId)
      .populate("partnerId", "restaurantName phone shopName")
      .populate("customerId", "name phone");

    if (didConfirmOrder) {
      void notifyPartnerNewOrder(order).catch((error) => {
        console.error("Failed to notify partner about paid order:", error);
      });
    }

    return successResponse(res, updatedOrder, "Payment status updated successfully");

  } catch (err: any) {
    console.error("Update payment error:", err);
    return errorResponse(res, "Failed to update payment status");
  }
};

/**
 * ================================
 * PARTNER - UPDATE ORDER STATUS
 * ================================
 */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Allowed status updates for partners
    const allowedStatuses = ["ACCEPTED", "PREPARING", "READY", "REJECTED"];
    
    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Allowed: ${allowedStatuses.join(", ")}`, 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (status === "REJECTED" && order.status === "CANCELLED" && order.cancellationReason === "Restaurant rejected the order") {
      return successResponse(res, order, "Order cancelled. Refund will be completed within today if online payment was done.");
    }

    if (["CANCELLED", "REJECTED", "DELIVERED"].includes(order.status)) {
      return errorResponse(res, `Order cannot be updated because it is ${order.status}`, 400);
    }

    // Check payment status before allowing partner to accept
    if (status === "ACCEPTED") {
      // For COD orders, allow if payment status is PAYMENT_PENDING_DELIVERY
      // For online payments, require PAID status
      const isCODPending = order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "PAYMENT_PENDING_DELIVERY";
      const isOnlinePaid = order.paymentMethod !== "CASH_ON_DELIVERY" && order.paymentStatus === "PAID";
      
      if (!isCODPending && !isOnlinePaid) {
        return errorResponse(
          res, 
          `Cannot accept order. Payment status: ${order.paymentStatus}`, 
          400
        );
      }
    }

    // Check if this account owns the partner profile for this order.
    const partner = await resolvePartnerForUser(user);
    const isPartner = Boolean(partner && order.partnerId.equals(partner._id));

    if (!isPartner && user.role !== ROLES.ADMIN) {
      return errorResponse(res, "Unauthorized to update this order", 401);
    }

    const previousStatus = order.status;
    order.status = status;
    if (status === "READY" && previousStatus !== "READY") {
      const orderPartner = partner || await Partner.findById(order.partnerId);
      order.deliveryReadyAt = new Date();
      await configureSelfDeliveryForReadyOrder(order, orderPartner);
    }
    if (status === "REJECTED") {
      markAutoCancelled(order, "Restaurant rejected the order");
    }
    await order.save();

    void notifyCustomerOrderStatus(order, status === "REJECTED" ? "REJECTED" : order.status).catch((error) => {
      console.error("Failed to notify customer about order status:", error);
    });

    if (status === "READY" && previousStatus !== "READY") {
      let shouldNotifyDeliveryReady = true;
      if (isBundledDeliveryOrder(order)) {
        const bundleOrders = await Order.find({ deliveryBundleId: order.deliveryBundleId })
          .select("status deliveryBundleSize")
          .lean();
        const expectedBundleSize = Number(order.deliveryBundleSize || bundleOrders.length);
        shouldNotifyDeliveryReady =
          bundleOrders.length >= expectedBundleSize &&
          bundleOrders.every((bundleOrder: any) => bundleOrder.status === "READY");
      }

      if (shouldNotifyDeliveryReady) void notifyDeliveryJobReady(order).catch((error) => {
        console.error("Failed to notify delivery partners about ready order:", error);
      });
    }

    return successResponse(
      res,
      order,
      status === "REJECTED"
        ? "Order cancelled. Refund will be completed within today if online payment was done."
        : `Order status updated to ${order.status}`
    );
  } catch (err: any) {
    console.error("updateOrderStatus error:", err);
    return errorResponse(res, "Failed to update order status");
  }
};

/**
 * ================================
 * ADMIN – ASSIGN DELIVERY PARTNER
 * ================================
 */
export const assignDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || user.role !== ROLES.ADMIN) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { orderId } = req.params;
    const { deliveryPartnerId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check payment status before assigning delivery
    // For COD orders, paymentStatus is PAYMENT_PENDING_DELIVERY which is allowed
    // For online payments, need PAID status
    const isCODPending = order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "PAYMENT_PENDING_DELIVERY";
    const isOnlinePaid = order.paymentMethod !== "CASH_ON_DELIVERY" && order.paymentStatus === "PAID";
    
    if (!isCODPending && !isOnlinePaid) {
      return errorResponse(
        res, 
        `Cannot assign delivery. Payment status: ${order.paymentStatus}`, 
        400
      );
    }

    // Only assign delivery if order is READY
    if (order.status !== "READY") {
      return errorResponse(res, `Order must be READY before assigning delivery. Current status: ${order.status}`, 400);
    }

    const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId).select("userId status isAvailable");
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery partner not found", 404);
    }

    if (!["VERIFIED", "ACTIVE"].includes(deliveryPartner.status) || !deliveryPartner.isAvailable) {
      return errorResponse(res, "Delivery partner is not eligible for assignment", 400);
    }

    order.deliveryPartnerId = new mongoose.Types.ObjectId(deliveryPartner.userId);
    order.status = "ASSIGNED";

    await order.save();

    void Promise.all([
      notifyAssignedDeliveryPartner(order),
      notifyDeliveryAssigned(order)
    ]).catch((error) => {
      console.error("Failed to notify delivery assignment:", error);
    });

    return successResponse(res, order, "Delivery partner assigned");
  } catch (err: any) {
    console.error("assignDelivery error:", err);
    return errorResponse(res, "Failed to assign delivery partner");
  }
};

/**
 * ================================
 * DELIVERY – UPDATE DELIVERY STATUS
 * ================================
 */
export const updateDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const { status, collectedAmount } = req.body;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const allowedStatuses = ["PICKED_UP", "DELIVERED"];

    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, "Invalid status update", 400);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    const deliveryOrders = isBundledDeliveryOrder(order)
      ? await Order.find({ deliveryBundleId: order.deliveryBundleId }).sort({ deliveryBundleSequence: 1, createdAt: 1 })
      : [order];

    if (deliveryOrders.length === 0) {
      return errorResponse(res, "Order not found", 404);
    }

    const unauthorizedOrder = deliveryOrders.find((deliveryOrder: any) => {
      return !deliveryOrder.deliveryPartnerId || !deliveryOrder.deliveryPartnerId.equals(userId);
    });
    if (unauthorizedOrder) {
      return errorResponse(res, "Unauthorized - Not assigned to this delivery job", 401);
    }

    if (status === "PICKED_UP" && deliveryOrders.some((deliveryOrder: any) => deliveryOrder.status !== "ASSIGNED")) {
      return errorResponse(res, "All bundled orders must be ASSIGNED before pickup", 400);
    }

    if (status === "DELIVERED" && deliveryOrders.some((deliveryOrder: any) => deliveryOrder.status !== "PICKED_UP")) {
      return errorResponse(res, "All bundled orders must be PICKED_UP before delivery", 400);
    }

    const codOrders = deliveryOrders.filter((deliveryOrder: any) => deliveryOrder.paymentMethod === "CASH_ON_DELIVERY");
    const totalCodAmount = codOrders.reduce((sum: number, deliveryOrder: any) => sum + Number(deliveryOrder.grandTotal || 0), 0);
    const codCollectedAmount = status === "DELIVERED" && totalCodAmount > 0 ? Number(collectedAmount) : 0;
    if (status === "DELIVERED" && totalCodAmount > 0) {
      if (!Number.isFinite(codCollectedAmount) || codCollectedAmount < totalCodAmount) {
        return errorResponse(res, `Collect Rs ${totalCodAmount} before marking this delivery as delivered`, 400);
      }
    }

    let deliveryPartner: any = null;
    let createdCashLedgerAmount = 0;
    if (status === "DELIVERED") {
      deliveryPartner = await DeliveryPartner.findOne({ userId: user.id });
      if (!deliveryPartner) {
        return errorResponse(res, "Delivery profile not found", 404);
      }
    }

    for (const deliveryOrder of deliveryOrders) {
      deliveryOrder.status = status;
      if (status === "DELIVERED") {
        deliveryOrder.deliveredAt = new Date();

        if (
          deliveryOrder.paymentMethod === "CASH_ON_DELIVERY" &&
          deliveryOrder.paymentStatus === "PAYMENT_PENDING_DELIVERY"
        ) {
          deliveryOrder.paymentStatus = "PAID";
        }

        const orderCodAmount = Number(deliveryOrder.grandTotal || 0);
        if (
          deliveryPartner &&
          deliveryOrder.paymentMethod === "CASH_ON_DELIVERY" &&
          orderCodAmount > 0 &&
          !deliveryOrder.codCollection?.cashLedgerEntryId
        ) {
          const cashLedgerEntry = await CashLedgerEntry.create({
            deliveryPartnerId: deliveryPartner._id,
            userId: user.id,
            type: "COD_COLLECTED",
            amount: orderCodAmount,
            balanceDelta: orderCodAmount,
            status: "POSTED",
            orderId: deliveryOrder._id,
            note: `COD collected for order #${String(deliveryOrder._id).slice(-6)}`
          });

          deliveryOrder.codCollection = {
            collectedAmount: orderCodAmount,
            collectedAt: new Date(),
            collectedBy: userId,
            cashLedgerEntryId: cashLedgerEntry._id
          };
          createdCashLedgerAmount += orderCodAmount;
        }
      }

      await deliveryOrder.save();
    }

    if (status === "DELIVERED" && deliveryPartner) {
      const totalDeliveryEarnings = deliveryOrders.reduce(
        (sum: number, deliveryOrder: any) => sum + Number(deliveryOrder.deliveryFee || 0),
        0
      );
      const deliveryIncrement: Record<string, number> = {
        totalDeliveries: deliveryOrders.length,
        totalEarnings: totalDeliveryEarnings
      };
      if (createdCashLedgerAmount > 0) {
        deliveryIncrement.cashBalance = createdCashLedgerAmount;
      }

      await DeliveryPartner.updateOne(
        { _id: deliveryPartner._id },
        {
          $inc: deliveryIncrement,
          $set: {
            lastCashActivityAt: createdCashLedgerAmount > 0 ? new Date() : deliveryPartner.lastCashActivityAt,
            lastCashActivityType: createdCashLedgerAmount > 0 ? "COD_COLLECTED" : deliveryPartner.lastCashActivityType
          }
        }
      );
    }

    void Promise.all(
      deliveryOrders.flatMap((deliveryOrder: any) => [
        notifyCustomerOrderStatus(deliveryOrder, status),
        notifyPartnerDeliveryStatus(deliveryOrder, status)
      ])
    ).catch((error) => {
      console.error("Failed to notify delivery status:", error);
    });

    const responseOrders = await Promise.all(
      deliveryOrders.map((deliveryOrder: any) => ensureDeliveryLocationForResponse(deliveryOrder.toObject()))
    );
    const responseOrder = isBundledDeliveryOrder(order) ? buildBundledDeliveryJob(responseOrders) : responseOrders[0];
    if (status === "DELIVERED") {
      responseOrder.deliveryEarnings = responseOrders.reduce(
        (sum: number, deliveryOrder: any) => sum + Number(deliveryOrder.deliveryFee || 0),
        0
      );
      responseOrder.collectedAmount = collectedAmount ? Number(collectedAmount) : undefined;
    }

    return successResponse(res, responseOrder, `Delivery ${status.toLowerCase()} successfully`);
  } catch (err: any) {
    console.error("updateDeliveryStatus error:", err);
    return errorResponse(res, "Failed to update delivery status");
  }
};

/**
 * ================================
 * GET ORDERS (ROLE BASED)
 * ================================
 */
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    await cancelStaleUnacceptedOrders();

    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    let filter: any = {};
    const isCustomerOrdersRoute = req.path === "/my";
    const isPartnerOrdersRoute = req.path.startsWith("/partner");
    const isDeliveryOrdersRoute = req.path.startsWith("/delivery");
    const isAdminOrdersRoute = req.path.startsWith("/admin");

    if (isCustomerOrdersRoute) {
      filter.customerId = user.id;
    } else if (isAdminOrdersRoute) {
      filter = {};
    } else if (isDeliveryOrdersRoute) {
      const deliveryPartner = await resolveDeliveryPartnerForUser(user, "userId");
      filter.deliveryPartnerId = deliveryPartner?.userId || user.id;
    } else if (isPartnerOrdersRoute) {
      const partner = await resolvePartnerForUser(user);
      if (partner) {
        filter.partnerId = partner._id;
      } else {
        return successResponse(res, [], "No partner found");
      }
    } else {
      filter.customerId = user.id;
    }

    const { page, limit, skip } = parseOrderPagination(req);
    const total = await Order.countDocuments(filter);

    let orders;
    
    if (isPartnerOrdersRoute) {
      // For partners: don't show customer details, only delivery partner details
      orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("partnerId", "restaurantName shopName phone")
        .populate("deliveryPartnerId", "name phone");
      
      // Mask customer information for partners
      orders = orders.map(order => {
        const orderObj = order.toObject() as any;
        orderObj.customerId = maskedCustomerFrom(orderObj.customerId);
        return orderObj;
      });
      orders = await enrichDeliveryPartnerProfiles(orders);
    } else {
      // Customer app order list and delivery partner lists
      orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name phone")
        .populate({
          path: "partnerId",
          select: "restaurantName shopName phone address category location",
          transform: formatPartnerForDelivery
        })
        .populate("deliveryPartnerId", "name phone");
    }

    const pagination = {
      page,
      limit,
      total,
      hasMore: skip + orders.length < total
    };

    if (isDeliveryOrdersRoute) {
      const deliveryOrders = await Promise.all(
        orders.map((order: any) => ensureDeliveryLocationForResponse(order.toObject ? order.toObject() : order))
      );
      return successResponse(res, groupBundledDeliveryJobs(deliveryOrders), "Orders retrieved successfully", 200, pagination);
    }

    return successResponse(res, orders, "Orders retrieved successfully", 200, pagination);
  } catch (err: any) {
    console.error("getMyOrders error:", err);
    return errorResponse(res, "Failed to fetch orders");
  }
};

const normalizeRatingScore = (value: unknown) => {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
};

const updateAverageRating = (currentRating: number, currentCount: number, nextRating: number) => {
  const safeCount = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
  const safeRating = Number.isFinite(currentRating) && currentRating > 0 ? currentRating : 0;
  return Number(((safeRating * safeCount + nextRating) / (safeCount + 1)).toFixed(2));
};

export const submitOrderRating = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user || !isConsumerAppRole(user.role)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const restaurantRating = {
      foodQuality: normalizeRatingScore(req.body?.restaurantRating?.foodQuality),
      packaging: normalizeRatingScore(req.body?.restaurantRating?.packaging),
      overallExperience: normalizeRatingScore(req.body?.restaurantRating?.overallExperience),
      comment: String(req.body?.restaurantRating?.comment || "").trim()
    };
    const deliveryRating = {
      deliverySpeed: normalizeRatingScore(req.body?.deliveryRating?.deliverySpeed),
      partnerBehavior: normalizeRatingScore(req.body?.deliveryRating?.partnerBehavior),
      comment: String(req.body?.deliveryRating?.comment || "").trim()
    };

    const hasInvalidScore = [
      restaurantRating.foodQuality,
      restaurantRating.packaging,
      restaurantRating.overallExperience,
      deliveryRating.deliverySpeed,
      deliveryRating.partnerBehavior
    ].some((score) => score === null);

    if (hasInvalidScore) {
      return errorResponse(res, "All ratings must be between 1 and 5", 400);
    }

    const order: any = await Order.findOne({ _id: orderId, customerId: user.id });
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (order.status !== "DELIVERED") {
      return errorResponse(res, "Ratings can be submitted after order delivery", 400);
    }

    if (order.ratingSubmittedAt) {
      return errorResponse(res, "Ratings already submitted for this order", 400);
    }

    order.restaurantRating = restaurantRating;
    order.deliveryRating = deliveryRating;
    order.ratingSubmittedAt = new Date();
    await order.save();

    const partner: any = await Partner.findById(order.partnerId).select("rating ratingCount");
    if (partner && restaurantRating.overallExperience) {
      const nextCount = Number(partner.ratingCount || 0) + 1;
      partner.rating = updateAverageRating(Number(partner.rating || 0), Number(partner.ratingCount || 0), restaurantRating.overallExperience);
      partner.ratingCount = nextCount;
      await partner.save();
    }

    if (order.deliveryPartnerId) {
      const deliveryPartner: any = await DeliveryPartner.findOne({ userId: order.deliveryPartnerId }).select("rating ratingCount");
      if (deliveryPartner && deliveryRating.deliverySpeed && deliveryRating.partnerBehavior) {
        const nextDeliveryScore = Number(((deliveryRating.deliverySpeed + deliveryRating.partnerBehavior) / 2).toFixed(2));
        const nextCount = Number(deliveryPartner.ratingCount || 0) + 1;
        deliveryPartner.rating = updateAverageRating(Number(deliveryPartner.rating || 0), Number(deliveryPartner.ratingCount || 0), nextDeliveryScore);
        deliveryPartner.ratingCount = nextCount;
        await deliveryPartner.save();
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate("customerId", "name phone")
      .populate({
        path: "partnerId",
        select: "restaurantName shopName phone address category location rating ratingCount",
        transform: formatPartnerForDelivery
      })
      .populate("deliveryPartnerId", "name phone");

    return successResponse(res, updatedOrder, "Ratings submitted successfully");
  } catch (err: any) {
    console.error("submitOrderRating error:", err);
    return errorResponse(res, "Failed to submit ratings");
  }
};

/**
 * ================================
 * GET ORDER DETAILS
 * ================================
 */
export const getOrderDetails = async (req: AuthRequest, res: Response) => {
  try {
    await cancelStaleUnacceptedOrders();

    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId)
      .populate("customerId", "name phone")
      .populate({
        path: "partnerId",
        select: "restaurantName shopName phone address category location",
        transform: formatPartnerForDelivery
      })
      .populate("deliveryPartnerId", "name phone");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user has permission to view this order
    const orderObj = order.toObject() as any;
    
    // Check if user is the customer
    const isCustomer = idsMatch(orderObj.customerId, user.id);
    
    // Check if user is the delivery partner
    const isDelivery = idsMatch(orderObj.deliveryPartnerId, user.id);
    
    // Check if the account owns the partner profile, regardless of its primary role.
    const partner = await resolvePartnerForUser(user);
    const isPartner = Boolean(
      partner &&
        orderObj.partnerId &&
        idsMatch(orderObj.partnerId, partner._id)
    );

    const isAdmin = user.role === ROLES.ADMIN;
    const isDeliveryDetailsRoute = req.path.startsWith("/delivery/");
    let availableDeliveryJobForUser: any = null;

    if (isDeliveryDetailsRoute && !isDelivery) {
      const deliveryPartner = await resolveDeliveryPartnerForUser(user, "userId status isAvailable");
      const deliveryUserId = idString(deliveryPartner?.userId) || user.id;
      const isEligibleDeliveryViewer = Boolean(
        deliveryPartner &&
          ["ACTIVE", "VERIFIED"].includes(deliveryPartner.status) &&
          deliveryPartner.isAvailable !== false
      );
      const isUnassignedReadyOrder =
        orderObj.status === "READY" &&
        (!orderObj.deliveryPartnerId || idString(orderObj.deliveryPartnerId) === "");

      if (isEligibleDeliveryViewer && isUnassignedReadyOrder && isDeliveryJobVisibleToUser(orderObj, deliveryUserId)) {
        if (isBundledDeliveryOrder(orderObj)) {
          const bundledOrders = await getPopulatedBundleOrders(String(orderObj.deliveryBundleId));
          const expectedBundleSize = Number(orderObj.deliveryBundleSize || bundledOrders.length);
          const canViewBundle =
            bundledOrders.length >= expectedBundleSize &&
            bundledOrders.every((bundleOrder: any) => {
              const isReady = bundleOrder.status === "READY";
              const isUnassigned = !bundleOrder.deliveryPartnerId || idString(bundleOrder.deliveryPartnerId) === "";
              return isReady && isUnassigned && isDeliveryJobVisibleToUser(bundleOrder, deliveryUserId);
            });

          if (canViewBundle) {
            return successResponse(res, buildBundledDeliveryJob(bundledOrders), "Bundled delivery details retrieved");
          }
        } else {
          availableDeliveryJobForUser = await ensureDeliveryLocationForResponse(orderObj);
        }
      }
    }

    if (!isCustomer && !isDelivery && !isPartner && !isAdmin && !availableDeliveryJobForUser) {
      return errorResponse(res, "Unauthorized to view this order", 401);
    }

    if (isDelivery && req.path.startsWith("/delivery/") && isBundledDeliveryOrder(orderObj)) {
      const bundledOrders = await getPopulatedBundleOrders(String(orderObj.deliveryBundleId));
      return successResponse(res, buildBundledDeliveryJob(bundledOrders), "Bundled delivery details retrieved");
    }

    if (availableDeliveryJobForUser) {
      return successResponse(res, availableDeliveryJobForUser, "Delivery details retrieved");
    }

    // Only partner-only viewers should see masked customer details. A delivery
    // rider can also match a partner profile by phone/user linkage, but they
    // still need the real drop address and GPS pin to complete delivery.
    if (isPartner && !isCustomer && !isDelivery && !isAdmin) {
      orderObj.customerId = maskedCustomerFrom(orderObj.customerId);
      
      // Also mask detailed delivery address for partners
      // Show only area/city, not full address
      orderObj.deliveryAddress = maskDeliveryAddressForPartner(orderObj.deliveryAddress);
      orderObj.deliveryLocation = undefined;

      const [partnerOrder] = await enrichDeliveryPartnerProfiles([orderObj]);
      return successResponse(res, partnerOrder, "Order details retrieved");
    }

    const responseOrder = await ensureDeliveryLocationForResponse(orderObj);
    return successResponse(res, responseOrder, "Order details retrieved");
  } catch (err: any) {
    console.error("getOrderDetails error:", err);
    return errorResponse(res, "Failed to get order details");
  }
};

/**
 * ================================
 * DELIVERY - GET AVAILABLE JOBS (READY orders not assigned)
 * ================================
 */
export const getAvailableDeliveryJobs = async (req: AuthRequest, res: Response) => {
  try {
    await cancelStaleUnacceptedOrders();

    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const deliveryPartnerDoc = await resolveDeliveryPartnerForUser(user);
    const deliveryPartner = deliveryPartnerDoc?.toObject ? deliveryPartnerDoc.toObject() : deliveryPartnerDoc;
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    // Allow both VERIFIED and ACTIVE delivery partners to see jobs.
    // Admin moves PENDING -> VERIFIED after document review; ACTIVE is the
    // "currently working" promotion. We also accept VERIFIED to avoid the
    // common case where admin only marked the partner as VERIFIED and not yet ACTIVE.
    const eligibleStatuses = ["ACTIVE", "VERIFIED"];
    if (!eligibleStatuses.includes(deliveryPartner.status)) {
      return successResponse(res, [], "Delivery partner is not eligible for nearby jobs");
    }
    if (deliveryPartner.isAvailable === false) {
      return successResponse(res, [], "You are currently marked unavailable for delivery jobs");
    }

    const deliveryUserId = idString(deliveryPartner.userId) || user.id;
    const deliveryUserObjectId = new mongoose.Types.ObjectId(deliveryUserId);

    const riderCoordinates = deliveryPartner.currentLocation?.coordinates;
    const hasRiderLocation = Boolean(
      riderCoordinates &&
      riderCoordinates.length === 2 &&
      !(riderCoordinates[0] === 0 && riderCoordinates[1] === 0)
    );

    const deliveryDeadline = new Date(Date.now() - DELIVERY_ACCEPT_TIMEOUT_MS);

    // Find non-expired READY orders that are not assigned to any delivery partner.
    const availableJobs = await Order.find({
      $and: [
        { status: "READY" },
        buildUnassignedDeliveryFilter(),
        { deliveryRejectedBy: { $ne: deliveryUserObjectId } },
        buildFreshDeliveryReadyFilter(deliveryDeadline)
      ]
    })
    .populate("customerId", "name phone")
    .populate({
      path: "partnerId",
      select: "restaurantName shopName phone address category location",
      transform: formatPartnerForDelivery
    })
    .sort({ createdAt: -1 });

    console.log(`🔍 Found ${availableJobs.length} available delivery jobs for user ${user.id}`);

    const availableJobObjects = (await Promise.all(
      availableJobs.map((job: any) => ensureDeliveryLocationForResponse(job.toObject()))
    )).filter((job: any) => isDeliveryJobVisibleToUser(job, deliveryUserId));
    const deliveryJobs = groupBundledDeliveryJobs(availableJobObjects);

    // If the rider hasn't shared their location yet, still show every READY
    // job so they at least know what's pending and can refresh after enabling GPS.
    if (!hasRiderLocation) {
      return successResponse(res, deliveryJobs, "Available delivery jobs retrieved (rider location pending)");
    }

    const rankedJobs = deliveryJobs
      .map((job: any) => {
        const partnerCoordinates = job.partnerId?.location?.coordinates;
        const partnerHasLocation = Boolean(
          partnerCoordinates &&
          partnerCoordinates.length === 2 &&
          !(partnerCoordinates[0] === 0 && partnerCoordinates[1] === 0)
        );

        // If the shop never set its location, still surface the job to the
        // rider but mark distance as unknown rather than dropping it silently.
        if (!partnerHasLocation) {
          return {
            ...job,
            distanceToRestaurant: null
          };
        }

        const distanceToRestaurant = haversineKm(riderCoordinates as [number, number], partnerCoordinates);
        return {
          ...job,
          distanceToRestaurant: Number(distanceToRestaurant.toFixed(2))
        };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => {
        const leftDist = left.distanceToRestaurant ?? Number.POSITIVE_INFINITY;
        const rightDist = right.distanceToRestaurant ?? Number.POSITIVE_INFINITY;
        return leftDist - rightDist;
      });

    return successResponse(res, rankedJobs, "Available delivery jobs retrieved");

  } catch (err: any) {
    console.error("getAvailableDeliveryJobs error:", err);
    return errorResponse(res, "Failed to get available delivery jobs");
  }
};

/**
 * ================================
 * DELIVERY - ACCEPT JOB (Assign self to order)
 * ================================
 */
export const acceptDeliveryJob = async (req: AuthRequest, res: Response) => {
  try {
    await cancelStaleUnacceptedOrders();

    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const deliveryPartner = await resolveDeliveryPartnerForUser(user, "userId status isAvailable");
    const acceptStatuses = ["ACTIVE", "VERIFIED"];
    if (!deliveryPartner || !acceptStatuses.includes(deliveryPartner.status)) {
      return errorResponse(res, "Delivery partner is not eligible to accept jobs", 403);
    }
    if (deliveryPartner.isAvailable === false) {
      return errorResponse(res, "You are currently marked unavailable for delivery jobs", 403);
    }

    const deliveryUserId = idString(deliveryPartner.userId) || user.id;

    const activeOrder = await Order.findOne({
      deliveryPartnerId: deliveryUserId,
      status: { $in: ["ASSIGNED", "PICKED_UP"] }
    }).select("_id status").lean();

    if (activeOrder) {
      return errorResponse(
        res,
        "Complete your current delivery before accepting another job",
        409,
        {
          code: "ACTIVE_DELIVERY_EXISTS",
          activeOrderId: idString(activeOrder._id),
          activeOrderStatus: activeOrder.status
        }
      );
    }

    const acceptFilter: any = {
      $and: [
        { _id: orderId, status: "READY" },
        buildUnassignedDeliveryFilter(),
        { deliveryRejectedBy: { $ne: new mongoose.Types.ObjectId(deliveryUserId) } },
        buildFreshDeliveryReadyFilter(new Date(Date.now() - DELIVERY_ACCEPT_TIMEOUT_MS)),
        buildDeliveryAcceptVisibilityFilter(deliveryUserId)
      ]
    };

    const requestedOrder = await Order.findOne(acceptFilter);
    if (!requestedOrder) {
      return errorResponse(res, "Order is no longer available", 409);
    }

    if (isBundledDeliveryOrder(requestedOrder)) {
      const expectedBundleSize = Number(requestedOrder.deliveryBundleSize || 1);
      const bundleAcceptFilter: any = {
        $and: [
          { deliveryBundleId: requestedOrder.deliveryBundleId, status: "READY" },
          buildUnassignedDeliveryFilter(),
          { deliveryRejectedBy: { $ne: new mongoose.Types.ObjectId(deliveryUserId) } },
          buildFreshDeliveryReadyFilter(new Date(Date.now() - DELIVERY_ACCEPT_TIMEOUT_MS)),
          buildDeliveryAcceptVisibilityFilter(deliveryUserId)
        ]
      };
      const bundleOrders = await Order.find(bundleAcceptFilter).select("_id").lean();

      if (bundleOrders.length < expectedBundleSize) {
        return errorResponse(res, "Bundled delivery is waiting for all restaurants to be ready", 409);
      }

      const bundleOrderIds = bundleOrders.map((bundleOrder: any) => bundleOrder._id);
      const updateResult = await Order.updateMany(
        {
          _id: { $in: bundleOrderIds },
          status: "READY",
          $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }]
        },
        {
          $set: {
            deliveryPartnerId: new mongoose.Types.ObjectId(deliveryUserId),
            status: "ASSIGNED"
          }
        }
      );

      if (updateResult.modifiedCount !== bundleOrders.length) {
        return errorResponse(res, "Bundled delivery is no longer available", 409);
      }

      const bundledOrders = await getPopulatedBundleOrders(String(requestedOrder.deliveryBundleId));
      void Promise.all(
        bundledOrders.map((bundleOrder: any) => notifyDeliveryAssigned(bundleOrder))
      ).catch((error) => {
        console.error("Failed to notify accepted bundled delivery job:", error);
      });

      console.log(`🚚 Delivery partner ${user.id} accepted bundled job ${requestedOrder.deliveryBundleId}`);
      return successResponse(res, buildBundledDeliveryJob(bundledOrders), "Bundled delivery job accepted successfully");
    }

    const order = await Order.findOneAndUpdate(
      acceptFilter,
      {
        $set: {
          deliveryPartnerId: new mongoose.Types.ObjectId(deliveryUserId),
          status: "ASSIGNED"
        }
      },
      { new: true }
    );

    if (!order) {
      return errorResponse(res, "Order is no longer available", 409);
    }

    // Get populated order for response
    const populatedOrder = await Order.findById(orderId)
      .populate("customerId", "name phone")
      .populate({
        path: "partnerId",
        select: "restaurantName shopName phone address category location",
        transform: formatPartnerForDelivery
      })
      .populate("deliveryPartnerId", "name phone");

    console.log(`🚚 Delivery partner ${user.id} accepted job for order ${orderId}`);

    void notifyDeliveryAssigned(order).catch((error) => {
      console.error("Failed to notify accepted delivery job:", error);
    });

    const responseOrder = populatedOrder
      ? await ensureDeliveryLocationForResponse(populatedOrder.toObject())
      : populatedOrder;

    return successResponse(res, responseOrder, "Delivery job accepted successfully");
  } catch (err: any) {
    console.error("acceptDeliveryJob error:", err);
    return errorResponse(res, "Failed to accept delivery job");
  }
};

export const rejectDeliveryJob = async (req: AuthRequest, res: Response) => {
  try {
    await cancelStaleUnacceptedOrders();

    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const deliveryPartner = await resolveDeliveryPartnerForUser(user, "userId status");
    if (!deliveryPartner) {
      return errorResponse(res, "Delivery profile not found", 404);
    }

    const deliveryUserId = idString(deliveryPartner.userId) || user.id;
    const deliveryUserObjectId = new mongoose.Types.ObjectId(deliveryUserId);
    const order = await Order.findById(orderId).select(
      "_id status deliveryPartnerId selfDelivery deliveryReadyAt updatedAt deliveryBundleId deliveryBundleSize"
    );
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    if (order.status !== "READY" || order.deliveryPartnerId) {
      return errorResponse(res, "Job is no longer available", 409);
    }

    const deliveryDeadline = new Date(Date.now() - DELIVERY_ACCEPT_TIMEOUT_MS);
    const readyAt = order.deliveryReadyAt || order.updatedAt;
    if (readyAt && readyAt.getTime() <= deliveryDeadline.getTime()) {
      return errorResponse(res, "Job is no longer available", 409);
    }

    if (isBundledDeliveryOrder(order)) {
      await Order.updateMany(
        {
          deliveryBundleId: order.deliveryBundleId,
          status: "READY",
          $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }]
        },
        {
          $addToSet: { deliveryRejectedBy: deliveryUserObjectId }
        }
      );

      return successResponse(res, { orderId, deliveryBundleId: order.deliveryBundleId }, "Bundled delivery job rejected");
    }

    const selfDelivery = getSelfDeliveryState(order);
    const rejectionUpdate: any = {
      $addToSet: { deliveryRejectedBy: deliveryUserObjectId }
    };

    if (
      selfDelivery.isSelfMode &&
      !selfDelivery.fallbackReleased &&
      selfDelivery.reservedFor.includes(deliveryUserId)
    ) {
      const nextRejectedBy = new Set(selfDelivery.rejectedBy);
      nextRejectedBy.add(deliveryUserId);
      const allSelfRidersRejected = selfDelivery.reservedFor.every((id) => nextRejectedBy.has(id));
      const now = new Date();

      rejectionUpdate.$addToSet["selfDelivery.rejectedBy"] = deliveryUserObjectId;
      if (allSelfRidersRejected) {
        rejectionUpdate.$set = {
          "selfDelivery.fallbackReleasedAt": now,
          "selfDelivery.expiresAt": now
        };
      }
    }

    await Order.updateOne(
      {
        _id: orderId,
        status: "READY",
        $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }]
      },
      rejectionUpdate
    );

    return successResponse(res, { orderId }, "Delivery job rejected");
  } catch (err: any) {
    console.error("rejectDeliveryJob error:", err);
    return errorResponse(res, "Failed to reject delivery job");
  }
};

/**
 * ================================
 * CANCEL ORDER (CUSTOMER ONLY)
 * ================================
 */
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user || !isConsumerAppRole(user.role)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    if (!order.customerId.equals(userId)) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Only allow cancellation if order hasn't been accepted by partner
    // Include PENDING status in cancellable statuses
    const cancellableStatuses = ["CONFIRMED", "PENDING"];
    if (!cancellableStatuses.includes(order.status)) {
      return errorResponse(res, `Order cannot be cancelled in ${order.status} status`, 400);
    }

    // Update order status
    order.status = "CANCELLED";
    
    // Update payment status if payment was made
    if (order.paymentStatus === "PAID" || order.paymentStatus === "PAYMENT_PENDING_DELIVERY") {
      order.paymentStatus = "REFUNDED";
    } else {
      order.paymentStatus = "CANCELLED";
    }

    await order.save();

    void notifyPartnerDeliveryStatus(order, "CANCELLED").catch((error) => {
      console.error("Failed to notify partner about cancelled order:", error);
    });

    return successResponse(res, order, "Order cancelled successfully");
  } catch (err: any) {
    console.error("cancelOrder error:", err);
    return errorResponse(res, "Failed to cancel order");
  }
};

/**
 * ================================
 * PARTNER - GET ORDER DETAILS FOR PARTNER (WITH MASKED CUSTOMER INFO)
 * ================================
 */
export const getPartnerOrderDetails = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { orderId } = req.params;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const order = await Order.findById(orderId)
      .populate("partnerId", "restaurantName shopName phone address")
      .populate("deliveryPartnerId", "name phone vehicleType");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    // Check if user is the partner for this order
    const partner = await resolvePartnerForUser(user);
    const isPartner = Boolean(partner && idsMatch((order as any).partnerId, partner._id));

    if (!isPartner) {
      return errorResponse(res, "Unauthorized to view this order", 401);
    }

    const orderObj = order.toObject() as any;
    
    // Completely mask customer information for partners
    orderObj.customerId = maskedCustomerFrom(orderObj.customerId);
    
    // Mask delivery address (only show general area)
    orderObj.deliveryAddress = maskDeliveryAddressForPartner(orderObj.deliveryAddress);

    const [partnerOrder] = await enrichDeliveryPartnerProfiles([orderObj]);
    return successResponse(res, partnerOrder, "Order details retrieved for partner");
  } catch (err: any) {
    console.error("getPartnerOrderDetails error:", err);
    return errorResponse(res, "Failed to get order details");
  }
};
