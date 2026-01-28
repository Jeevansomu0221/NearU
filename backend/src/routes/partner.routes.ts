import { Router } from "express";
import {
  submitPartnerProfile,
  getPartnerStatus,
  getPendingPartners,
  updatePartnerStatus,
  getAllPartners,
  updateShopStatus,
  getPartnerStats,
  getMyStatus,
  completeSetup
} from "../controllers/partner.controller";
import menuRoutes from "./menu.routes"; // Import menu routes
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

// Public routes
router.post("/onboard", submitPartnerProfile);
router.get("/status/:phone", getPartnerStatus);

// Protected partner routes
router.use(authMiddleware);

// Partner status and setup
router.get("/my-status", roleMiddleware(["partner"]), getMyStatus);
router.post("/complete-setup", roleMiddleware(["partner"]), completeSetup);

// Menu Management - Mount menu routes under /partners/menu
router.use("/menu", roleMiddleware(["partner"]), menuRoutes);

// Shop Management
router.put("/shop-status", roleMiddleware(["partner"]), updateShopStatus);
router.get("/stats", roleMiddleware(["partner"]), getPartnerStats);

// Admin routes
router.get("/admin/pending", roleMiddleware(["admin"]), getPendingPartners);
router.get("/admin/all", roleMiddleware(["admin"]), getAllPartners);
router.put("/admin/:partnerId/status", roleMiddleware(["admin"]), updatePartnerStatus);

export default router;