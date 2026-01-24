import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import Partner from "../models/Partner.model";
import SubOrder from "../models/SubOrder.model";
import MenuItem from "../models/MenuItem.model";

const router = Router();

/**
 * 🔹 GET partner menu
 */
router.get("/menu", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "partner") {
      return res.status(403).json({ message: "Access denied" });
    }

    const partner = await Partner.findOne({ userId: req.user.id });
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const items = await MenuItem.find({ partnerId: partner._id });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * 🔹 ADD menu item
 */
router.post("/menu", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "partner") {
      return res.status(403).json({ message: "Access denied" });
    }

    const partner = await Partner.findOne({ userId: req.user.id });
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const { name, price } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: "Name & price required" });
    }

    const item = await MenuItem.create({
      partnerId: partner._id,
      name,
      price,
      isAvailable: true
    });

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * 🔹 TOGGLE menu availability
 */
router.patch(
  "/menu/:id/toggle",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== "partner") {
        return res.status(403).json({ message: "Access denied" });
      }

      const item = await MenuItem.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      item.isAvailable = !item.isAvailable;
      await item.save();

      res.json(item);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * 🔹 GET suborders for partner
 */
router.get(
  "/suborders",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== "partner") {
        return res.status(403).json({ message: "Access denied" });
      }

      const partner = await Partner.findOne({ userId: req.user.id });
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      const subOrders = await SubOrder.find({
        partnerId: partner._id,
        status: { $in: ["CREATED", "ACCEPTED", "PREPARING"] }
      }).sort({ createdAt: -1 });

      res.json(subOrders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
