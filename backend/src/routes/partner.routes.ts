// backend/src/routes/partner.routes.ts
import { Router } from "express";
import {
  submitPartnerProfile,
  getPartnerStatus,
  getPendingPartners,
  updatePartnerStatus,
  getAllPartners,
  updateShopStatus,    // Now this exists
  getPartnerStats      // Now this exists
} from "../controllers/partner.controller";
import {
  getPartnerMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability
} from "../controllers/menu.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

// Public routes
router.post("/onboard", submitPartnerProfile);
router.get("/status/:phone", getPartnerStatus);

// Protected partner routes
router.use(authMiddleware);

// Menu Management
router.get("/menu", roleMiddleware(["partner"]), getPartnerMenu);
router.post("/menu", roleMiddleware(["partner"]), addMenuItem);
router.put("/menu/:id", roleMiddleware(["partner"]), updateMenuItem);
router.delete("/menu/:id", roleMiddleware(["partner"]), deleteMenuItem);
router.put("/menu/:id/availability", roleMiddleware(["partner"]), toggleItemAvailability);

// Shop Management
router.put("/shop-status", roleMiddleware(["partner"]), updateShopStatus);
router.get("/stats", roleMiddleware(["partner"]), getPartnerStats);

// Admin routes
router.get("/admin/pending", roleMiddleware(["admin"]), getPendingPartners);
router.get("/admin/all", roleMiddleware(["admin"]), getAllPartners);
router.put("/admin/:partnerId/status", roleMiddleware(["admin"]), updatePartnerStatus);

export default router;