// NEARU/backend/src/routes/user.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { ROLES } from "../config/roles";
import {
  getUserProfile,
  updateUserProfile,
  updateUserAddress,
  getMyOrders
} from "../controllers/user.controller";

const router = Router();

/**
 * ================================
 * CUSTOMER PROFILE ROUTES
 * ================================
 */

// Get user profile (customer only)
router.get(
  "/profile",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  getUserProfile
);

// Update user profile (customer only)
router.put(
  "/profile",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  updateUserProfile
);

// Update user address (customer only)
router.put(
  "/address",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  updateUserAddress
);

// Get user's orders (customer only)
router.get(
  "/orders",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  getMyOrders
);

export default router;