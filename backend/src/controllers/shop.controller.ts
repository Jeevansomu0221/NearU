import { Request, Response } from "express";
import Partner from "../models/Partner.model";

export const getShopsWithImages = async (req: Request, res: Response) => {
  try {
    console.log("🛍️ Fetching shops with images...");
    
    const shops = await Partner.find({ 
      status: "APPROVED",
      hasCompletedSetup: true 
    })
    .select('_id restaurantName shopName category address isOpen rating shopImageUrl openingTime closingTime')
    .lean();

    console.log(`✅ Found ${shops.length} shops`);
    
    // Log first shop to debug
    if (shops.length > 0) {
      console.log("First shop data:", JSON.stringify(shops[0], null, 2));
    }

    return res.json({
      success: true,
      data: shops
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