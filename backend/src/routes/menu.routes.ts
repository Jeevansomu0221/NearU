import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import {
  getPartnerMenu,           // Add this back
  getPublicPartnerMenu,     // Keep this
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability
} from "../controllers/menu.controller";

const router = Router();

// PUBLIC ROUTE: Get partner's menu (for customers)
// This doesn't require authentication
router.get("/partner/:partnerId", getPublicPartnerMenu);

// PROTECTED ROUTES: All other menu routes require partner authentication
router.use(authMiddleware);
router.use(roleMiddleware(["partner"]));

// Menu management routes (partner only)
router.get("/", getPartnerMenu);
router.post("/", addMenuItem);
router.put("/:id", updateMenuItem);
router.delete("/:id", deleteMenuItem);
router.patch("/:id/availability", toggleItemAvailability);

export default router;