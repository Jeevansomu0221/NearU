import { Request, Response } from "express";
import Partner from "../models/Partner.model";

// Define AuthRequest interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    partnerId?: string;
  };
}

/**
 * GET ALL SHOPS (for customers)
 */
export const getAllShops = async (req: Request, res: Response) => {
  try {
    console.log("🛍️ Fetching all shops...");
    
    // Get all approved partners who have completed setup
    const shops = await Partner.find({ 
      status: "APPROVED",
      hasCompletedSetup: true 
    })
    .select('_id restaurantName shopName category address isOpen rating shopImageUrl openingTime closingTime')
    .lean();

    console.log(`✅ Found ${shops.length} shops`);
    
    // Debug: Log first few shops to check images
    shops.slice(0, 3).forEach((shop, index) => {
      console.log(`Shop ${index}: ${shop.shopName}, Image URL: ${shop.shopImageUrl || 'No image'}`);
    });

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

/**
 * GET SINGLE SHOP DETAILS
 */
export const getShopDetails = async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    console.log("🔍 Getting shop details for:", shopId);
    
    const shop = await Partner.findById(shopId)
      .select('_id restaurantName shopName category address isOpen rating shopImageUrl openingTime closingTime phone ownerName')
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    console.log(`✅ Found shop: ${shop.shopName}, Image URL: ${shop.shopImageUrl || 'No image'}`);

    return res.json({
      success: true,
      data: shop
    });
  } catch (error: any) {
    console.error("❌ Error getting shop details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shop details",
      error: error.message
    });
  }
};