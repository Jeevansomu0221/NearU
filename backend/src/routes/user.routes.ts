import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import User from "../models/User.model";
import Partner from "../models/Partner.model";
import MenuItem from "../models/MenuItem.model";

const router = Router();

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select("-__v");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

router.get("/shops/:partnerId/menu", async (req, res) => {
  try {
    const items = await MenuItem.find({
      partnerId: req.params.partnerId,
      isAvailable: true
    });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

router.get("/nearby-shops", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const shops = await Partner.find({ isActive: true }).select(
      "shopName category address location isOpen openingTime closingTime rating"
    );

    res.json({
      success: true,
      data: shops.map((shop) => ({
        _id: shop._id,
        shopName: shop.shopName,
        category: shop.category,
        address: shop.address,
        isOpen: shop.isOpen,
        openingTime: shop.openingTime,
        closingTime: shop.closingTime,
        rating: shop.rating
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;
