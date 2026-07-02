import { Request, Response } from "express";
import Partner from "../models/Partner.model";
import Order from "../models/Order.model";

const DEFAULT_RADIUS_KM = 3;
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

const findApprovedShops = (limit = MAX_SHOPS_FALLBACK) =>
  Partner.find({
    status: "APPROVED",
    hasCompletedSetup: true
  })
    .select("_id restaurantName shopName category address isOpen rating ratingCount shopImageUrl openingTime closingTime")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

const buildApprovedShopsFallback = async (radiusKm: number, message: string) => {
  const shops = await findApprovedShops();

  return {
    success: true,
    data: shops,
    radiusKm,
    locationApplied: false,
    message
  };
};

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

        if (shops.length === 0) {
          return res.json(await buildApprovedShopsFallback(
            radiusKm,
            `No shops found within ${radiusKm} km. Showing approved shops instead.`
          ));
        }

        return res.json({
          success: true,
          data: shops,
          radiusKm,
          locationApplied: true
        });
      } catch (geoError) {
        console.error("❌ Geo shop lookup failed, falling back to approved shops:", geoError);
        return res.json(await buildApprovedShopsFallback(
          radiusKm,
          "Showing approved shops while nearby lookup is unavailable"
        ));
      }
    }

    const shops = await findApprovedShops();

    return res.json({
      success: true,
      data: shops,
      radiusKm,
      locationApplied: false
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

    const reviews = orders.map((order: any) => ({
      _id: order._id,
      rating: order.restaurantRating?.overallExperience || 0,
      comment: order.restaurantRating?.comment || "",
      submittedAt: order.ratingSubmittedAt,
      customerName: order.customerId?.name || "Customer"
    }));

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