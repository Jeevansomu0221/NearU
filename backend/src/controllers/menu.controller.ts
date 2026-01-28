import { Request, Response } from "express";
import { Types } from "mongoose"; // Import Types from mongoose
import MenuItem from "../models/MenuItem.model";
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
 * GET PARTNER MENU ITEMS
 */
export const getPartnerMenu = async (req: Request, res: Response) => {
  try {
    console.log("📋 getPartnerMenu called");
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const userPhone = authReq.user?.phone;
    
    console.log("User info:", { userId, userPhone });
    
    if (!userId || !userPhone) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user info missing"
      });
    }

    // Find partner by userId first, then by phone
    let partner = await Partner.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!partner) {
      console.log("Partner not found by userId, trying by phone:", userPhone);
      partner = await Partner.findOne({ phone: userPhone });
      
      // If found by phone, update userId
      if (partner && !partner.userId) {
        partner.userId = new Types.ObjectId(userId);
        await partner.save();
        console.log("✅ Updated partner userId");
      }
    }
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found. Please complete onboarding first."
      });
    }
    
    console.log("✅ Found partner:", partner._id);

    const menuItems = await MenuItem.find({ partnerId: partner._id })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${menuItems.length} menu items`);

    return res.json({
      success: true,
      data: menuItems,
      count: menuItems.length
    });
  } catch (error: any) {
    console.error("❌ Error getting partner menu:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get menu items",
      error: error.message
    });
  }
};

/**
 * ADD MENU ITEM
 */
export const addMenuItem = async (req: Request, res: Response) => {
  try {
    console.log("➕ addMenuItem called");
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const userPhone = authReq.user?.phone;
    
    if (!userId || !userPhone) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Find partner
    let partner = await Partner.findOne({ userId: new Types.ObjectId(userId) });
    if (!partner) {
      partner = await Partner.findOne({ phone: userPhone });
      if (partner && !partner.userId) {
        partner.userId = new Types.ObjectId(userId);
        await partner.save();
      }
    }
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found"
      });
    }

    const {
      name,
      description,
      price,
      category,
      imageUrl,
      isVegetarian,
      preparationTime,
      isAvailable
    } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Name and price are required"
      });
    }

    const menuItem = await MenuItem.create({
      partnerId: partner._id,
      name,
      description: description || "",
      price: parseFloat(price),
      category: category || "Other",
      imageUrl: imageUrl || "",
      isVegetarian: isVegetarian !== false, // Default to true
      preparationTime: preparationTime || 15,
      isAvailable: isAvailable !== false // Default to true
    });

    // Update partner's menu items count
    partner.menuItemsCount = (partner.menuItemsCount || 0) + 1;
    
    // If this is the first menu item, mark setup as complete
    if (partner.menuItemsCount === 1 && !partner.hasCompletedSetup) {
      partner.hasCompletedSetup = true;
      partner.setupCompletedAt = new Date();
      console.log("✅ First menu item - marking setup as complete");
    }
    
    await partner.save();

    console.log("✅ Menu item added:", menuItem._id);

    return res.status(201).json({
      success: true,
      data: menuItem,
      message: "Menu item added successfully"
    });
  } catch (error: any) {
    console.error("❌ Error adding menu item:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((err: any) => err.message)
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to add menu item",
      error: error.message
    });
  }
};

/**
 * UPDATE MENU ITEM
 */
export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Find partner
    const partner = await Partner.findOne({ userId: new Types.ObjectId(userId) });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    const updateData = req.body;

    // Find and update menu item
    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: id, partnerId: partner._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found"
      });
    }

    return res.json({
      success: true,
      data: menuItem,
      message: "Menu item updated successfully"
    });
  } catch (error: any) {
    console.error("Error updating menu item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update menu item",
      error: error.message
    });
  }
};

/**
 * DELETE MENU ITEM
 */
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Find partner
    const partner = await Partner.findOne({ userId: new Types.ObjectId(userId) });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    // Find and delete menu item
    const menuItem = await MenuItem.findOneAndDelete({ 
      _id: id, 
      partnerId: partner._id 
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found"
      });
    }

    // Update partner's menu items count
    if (partner.menuItemsCount > 0) {
      partner.menuItemsCount -= 1;
      await partner.save();
    }

    return res.json({
      success: true,
      message: "Menu item deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting menu item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete menu item",
      error: error.message
    });
  }
};

/**
 * TOGGLE ITEM AVAILABILITY
 */
export const toggleItemAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Find partner
    const partner = await Partner.findOne({ userId: new Types.ObjectId(userId) });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: id, partnerId: partner._id },
      { isAvailable },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found"
      });
    }

    return res.json({
      success: true,
      data: menuItem,
      message: `Item ${isAvailable ? 'available' : 'unavailable'}`
    });
  } catch (error: any) {
    console.error("Error toggling availability:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update availability",
      error: error.message
    });
  }
};