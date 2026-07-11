import mongoose from "mongoose";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Partner from "../models/Partner.model";
import { config } from "../config/env";
import { haversineKm, normalizeCoordinates } from "../utils/geo.util";

const idString = (value: any) => {
  const rawId = value?._id || value;
  if (!rawId) return "";
  return typeof rawId.toString === "function" ? rawId.toString() : String(rawId);
};

const compactIds = (values: any[]) =>
  Array.from(new Set(values.map((value) => idString(value)).filter(Boolean)));

export const getLocationFreshnessCutoff = (now = new Date()) =>
  new Date(now.getTime() - config.deliveryLocationFreshnessMinutes * 60 * 1000);

export const isRiderLocationFresh = (updatedAt: Date | string | undefined, now = new Date()) => {
  if (!updatedAt) return false;
  const timestamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return timestamp >= getLocationFreshnessCutoff(now).getTime();
};

export const resolveOrderShopCoordinates = async (order: any): Promise<[number, number] | undefined> => {
  const partnerRef = order?.partnerId;
  const partnerId = idString(partnerRef?._id || partnerRef);
  if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) return undefined;

  const partner =
    partnerRef?.location
      ? partnerRef
      : await Partner.findById(partnerId).select("location").lean();

  return normalizeCoordinates(partner?.location?.coordinates);
};

export const filterNearbyDeliveryUserIds = async (
  shopCoordinates: [number, number],
  userIds?: string[],
  radiusKm = config.deliveryRadiusKm
): Promise<string[]> => {
  const normalizedUserIds = compactIds(userIds || []);
  const filter: Record<string, any> = {
    status: { $in: ["ACTIVE", "VERIFIED"] },
    isAvailable: { $ne: false },
    updatedAt: { $gte: getLocationFreshnessCutoff() },
    currentLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: shopCoordinates
        },
        $maxDistance: radiusKm * 1000
      }
    }
  };

  if (normalizedUserIds.length) {
    filter.userId = {
      $in: normalizedUserIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id))
    };
  }

  const riders = await DeliveryPartner.find(filter).select("userId").lean();
  return compactIds(riders.map((rider: any) => rider.userId));
};

export const isRiderNearShop = (
  riderCoordinates: [number, number] | undefined,
  shopCoordinates: [number, number],
  radiusKm = config.deliveryRadiusKm
) => {
  if (!riderCoordinates) return false;
  return haversineKm(riderCoordinates, shopCoordinates) <= radiusKm;
};
