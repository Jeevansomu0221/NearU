import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { ROLES } from "../config/roles";

const router = Router();

/**
 * Admin dashboard stats
 */
router.get("/dashboard",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      // TODO: Add dashboard logic
      res.json({
        success: true,
        data: {
          totalUsers: 0,
          totalPartners: 0,
          totalOrders: 0,
          revenue: 0,
          pendingVerifications: 0
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  }
);

/**
 * Get all orders for admin
 */
router.get("/orders",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      // TODO: Get all orders
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  }
);

export default router;