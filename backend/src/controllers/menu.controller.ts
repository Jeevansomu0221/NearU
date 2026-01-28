import { Request, Response } from "express";
import MenuItem from "../models/MenuItem.model";
import Partner from "../models/Partner.model";

/**
 * GET PARTNER MENU ITEMS
 */
export const getPartnerMenu = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.partnerId;
    
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "Partner ID not found in token"
      });
    }

    const menuItems = await MenuItem.find({ partnerId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: menuItems
    });
  } catch (error: any) {
    console.error("Error getting partner menu:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get menu items"
    });
  }
};

/**
 * ADD MENU ITEM
 */
export const addMenuItem = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.partnerId;
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
      partnerId,
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
    await Partner.findByIdAndUpdate(partnerId, {
      $inc: { menuItemsCount: 1 }
    });

    return res.json({
      success: true,
      data: menuItem,
      message: "Menu item added successfully"
    });
  } catch (error: any) {
    console.error("Error adding menu item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add menu item"
    });
  }
};

/**
 * UPDATE MENU ITEM
 */
export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const partnerId = (req as any).user.partnerId;
    const updateData = req.body;

    // Find and update menu item
    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: id, partnerId },
      updateData,
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
      message: "Menu item updated successfully"
    });
  } catch (error: any) {
    console.error("Error updating menu item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update menu item"
    });
  }
};

/**
 * DELETE MENU ITEM
 */
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const partnerId = (req as any).user.partnerId;

    // Find and delete menu item
    const menuItem = await MenuItem.findOneAndDelete({ _id: id, partnerId });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found"
      });
    }

    // Update partner's menu items count
    await Partner.findByIdAndUpdate(partnerId, {
      $inc: { menuItemsCount: -1 }
    });

    return res.json({
      success: true,
      message: "Menu item deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting menu item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete menu item"
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
    const partnerId = (req as any).user.partnerId;

    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: id, partnerId },
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
      message: "Failed to update availability"
    });
  }
};