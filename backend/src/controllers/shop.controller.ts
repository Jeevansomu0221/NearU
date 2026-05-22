import { Request, Response } from "express";
import Partner from "../models/Partner.model";

const DEFAULT_RADIUS_KM = 3;
const MAX_RADIUS_KM = 10;

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
            shopImageUrl: 1,
            openingTime: 1,
            closingTime: 1,
            distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] }
          }
        }
      ]);

      return res.json({
        success: true,
        data: shops,
        radiusKm,
        locationApplied: true
      });
    }

    const shops = await Partner.find(baseQuery)
      .select("_id restaurantName shopName category address isOpen rating shopImageUrl openingTime closingTime")
      .lean();

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