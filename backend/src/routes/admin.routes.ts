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
        totalUsers: 0,
        totalPartners: 0,
        totalOrders: 0,
        revenue: 0,
        pendingVerifications: 0
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
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
      // TODO: Get all orders with filters
      res.json([]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * Verify partner
 */
router.put("/partners/:id/verify",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      // TODO: Update partner verification status
      res.json({ message: "Partner verification updated" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router; // ✅ This is the default export