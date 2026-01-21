import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import Partner from "../models/Partner.model";
import SubOrder from "../models/SubOrder.model";

const router = Router();

/**
 * ✅ GET suborders assigned to logged-in partner
 */
router.get(
  "/suborders",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      // role check
      if (req.user?.role !== "partner") {
        return res.status(403).json({ message: "Access denied" });
      }

      // find partner profile
      const partner = await Partner.findOne({
        userId: req.user.id
      });

      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }

      // fetch suborders
      const subOrders = await SubOrder.find({
        partnerId: partner._id,
        status: { $in: ["CREATED", "ACCEPTED"] }
      });

      res.json(subOrders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
