import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import User from "../models/User.model";
import Partner from "../models/Partner.model";
import MenuItem from "../models/MenuItem.model";
const router = Router();

/**
 * GET logged-in user profile
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id).select("-otp");
  res.json(user);
});
/**
 * Customer: get menu of a shop
 */
router.get("/shops/:partnerId/menu", async (req, res) => {
  const items = await MenuItem.find({
    partnerId: req.params.partnerId,
    isAvailable: true
  });

  res.json(items);
});

/**
 * ✅ GET nearby shops (MVP)
 * Returns all active partners
 */
router.get(
  "/nearby-shops",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const shops = await Partner.find({ isActive: true }).select(
      "shopName category address"
    );

    res.json(
      shops.map((shop) => ({
        _id: shop._id,
        shopName: shop.shopName,
        category: shop.category,
        isOpen: true
      }))
    );
  }
);

export default router;
