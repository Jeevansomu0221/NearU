import { Request, Response } from "express";
import Partner from "../models/Partner.model";
import Order from "../models/Order.model";
import { parseGoogleMapsLink } from "../utils/mapsParser";

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 10;
const MAX_SHOPS_FALLBACK = 100;

const parseCoordinate = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseRadiusKm = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RADIUS_KM;
  }

  return Math.min(parsed, MAX_RADIUS_KM);
};

const shopListProjection =
  "_id restaurantName shopName category address isOpen rating ratingCount shopImageUrl openingTime closingTime location";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceKmBetween = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const roundDistanceKm = (distanceKm: number) => Math.round(distanceKm * 10) / 10;

const findShopsMissingCoordinates = (limit = MAX_SHOPS_FALLBACK) =>
  Partner.find({
    status: "APPROVED",
    hasCompletedSetup: true,
    "location.coordinates": [0, 0],
    "address.googleMapsLink": { $exists: true, $nin: ["", null] }
  })
    .select(shopListProjection)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

const resolveShopCoordinates = (shop: any): [number, number] | null => {
  const [longitude, latitude] = shop?.location?.coordinates || [];
  if (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    !(longitude === 0 && latitude === 0)
  ) {
    return [longitude, latitude];
  }

  const mapsLink = typeof shop?.address?.googleMapsLink === "string" ? shop.address.googleMapsLink : "";
  const parsed = parseGoogleMapsLink(mapsLink);
  if (!parsed) {
    return null;
  }

  return [parsed.longitude, parsed.latitude];
};

const mapShopsWithinRadius = (
  shops: any[],
  latitude: number,
  longitude: number,
  radiusKm: number
) =>
  shops
    .map((shop) => {
      const coordinates = resolveShopCoordinates(shop);
      if (!coordinates) {
        return null;
      }

      const [shopLongitude, shopLatitude] = coordinates;
      const distanceKm = distanceKmBetween(latitude, longitude, shopLatitude, shopLongitude);
      if (distanceKm > radiusKm) {
        return null;
      }

      const { location: _location, ...shopWithoutLocation } = shop;
      return {
        ...shopWithoutLocation,
        distanceKm: roundDistanceKm(distanceKm)
      };
    })
    .filter(Boolean)
    .sort((left: any, right: any) => left.distanceKm - right.distanceKm);

export const getShopsWithImages = async (req: Request, res: Response) => {
  try {
    const latitude = parseCoordinate(req.query.latitude);
    const longitude = parseCoordinate(req.query.longitude);
    const radiusKm = parseRadiusKm(req.query.radiusKm);
    const baseQuery = {
      status: "APPROVED",
      hasCompletedSetup: true
    };

    if (latitude !== null && longitude !== null) {
      try {
        const shops = await Partner.aggregate([
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [longitude, latitude]
              },
              distanceField: "distanceMeters",
              maxDistance: radiusKm * 1000,
              spherical: true,
              query: {
                ...baseQuery,
                "location.coordinates": { $ne: [0, 0] }
              }
            }
          },
          {
            $project: {
              _id: 1,
              restaurantName: 1,
              shopName: 1,
              category: 1,
              address: 1,
              isOpen: 1,
              rating: 1,
              ratingCount: 1,
              shopImageUrl: 1,
              openingTime: 1,
              closingTime: 1,
              distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] }
            }
          },
          { $limit: MAX_SHOPS_FALLBACK }
        ]);

        const shopsMissingCoordinates = await findShopsMissingCoordinates();
        const additionalShops = mapShopsWithinRadius(
          shopsMissingCoordinates,
          latitude,
          longitude,
          radiusKm
        );

        const mergedShops = [...shops, ...additionalShops]
          .reduce((acc: any[], shop: any) => {
            if (!acc.some((existing) => String(existing._id) === String(shop._id))) {
              acc.push(shop);
            }
            return acc;
          }, [])
          .sort((left: any, right: any) => left.distanceKm - right.distanceKm)
          .slice(0, MAX_SHOPS_FALLBACK);

        return res.json({
          success: true,
          data: mergedShops,
          radiusKm,
          locationApplied: true,
          message:
            mergedShops.length === 0
              ? `No shops found within ${radiusKm} km of your location.`
              : undefined
        });
      } catch (geoError) {
        console.error("❌ Geo shop lookup failed:", geoError);

        const shopsMissingCoordinates = await findShopsMissingCoordinates();
        const fallbackShops = mapShopsWithinRadius(
          shopsMissingCoordinates,
          latitude,
          longitude,
          radiusKm
        ).slice(0, MAX_SHOPS_FALLBACK);

        return res.json({
          success: true,
          data: fallbackShops,
          radiusKm,
          locationApplied: true,
          message:
            fallbackShops.length === 0
              ? `No shops found within ${radiusKm} km of your location.`
              : "Nearby lookup is limited right now. Showing shops with saved map locations."
        });
      }
    }

    return res.json({
      success: true,
      data: [],
      radiusKm,
      locationApplied: false,
      message: "Location is required to show nearby shops."
    });
  } catch (error: any) {
    console.error("❌ Error getting shops:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
      error: error.message
    });
  }
};

export const getPartnerPublicProfile = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;

    const partner = await Partner.findOne({
      _id: partnerId,
      status: "APPROVED",
      hasCompletedSetup: true
    })
      .select(
        "restaurantName shopName category address isOpen rating ratingCount shopImageUrl openingTime closingTime"
      )
      .lean();

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }

    return res.json({
      success: true,
      data: partner
    });
  } catch (error: any) {
    console.error("getPartnerPublicProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant details"
    });
  }
};

export const getPartnerReviews = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const partner = await Partner.findOne({
      _id: partnerId,
      status: "APPROVED",
      hasCompletedSetup: true
    })
      .select("rating ratingCount")
      .lean();

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }

    const reviewFilter = {
      partnerId,
      status: "DELIVERED",
      ratingSubmittedAt: { $ne: null },
      "restaurantRating.overallExperience": { $gte: 1, $lte: 5 }
    };

    const [orders, total] = await Promise.all([
      Order.find(reviewFilter)
        .sort({ ratingSubmittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("customerId", "name")
        .select("restaurantRating ratingSubmittedAt createdAt")
        .lean(),
      Order.countDocuments(reviewFilter)
    ]);

    const reviews = orders.map((order: any) => {
      const foodQuality = order.restaurantRating?.foodQuality || 0;
      const packaging = order.restaurantRating?.packaging || 0;
      const overallExperience =
        order.restaurantRating?.overallExperience ||
        (foodQuality && packaging ? Number(((foodQuality + packaging) / 2).toFixed(2)) : foodQuality || packaging || 0);

      return {
        _id: order._id,
        rating: overallExperience,
        foodQuality,
        packaging,
        overallExperience,
        comment: order.restaurantRating?.comment || "",
        submittedAt: order.ratingSubmittedAt,
        customerName: order.customerId?.name || "Customer"
      };
    });

    return res.json({
      success: true,
      data: {
        reviews,
        total,
        rating: partner.rating,
        ratingCount: partner.ratingCount || total,
        page,
        limit
      }
    });
  } catch (error: any) {
    console.error("getPartnerReviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant reviews"
    });
  }
};