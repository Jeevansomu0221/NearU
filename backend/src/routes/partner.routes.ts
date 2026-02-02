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
  completeSetup,
  getPartnerProfile,    // ADD THIS
  updatePartnerProfile  // ADD THIS
} from "../controllers/partner.controller";

import menuRoutes from "./menu.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ======================================================
   PUBLIC ROUTES
====================================================== */
router.post("/onboard", submitPartnerProfile);
router.get("/status/:phone", getPartnerStatus);

/* ======================================================
   AUTHENTICATED ROUTES (customer OR partner)
====================================================== */
router.get("/my-status", authMiddleware, getMyStatus);
router.post("/complete-setup", authMiddleware, completeSetup);

/* ======================================================
   PARTNER-ONLY ROUTES (approved partners)
====================================================== */
router.put("/shop-status", authMiddleware, roleMiddleware(["partner"]), updateShopStatus);
router.get("/stats", authMiddleware, roleMiddleware(["partner"]), getPartnerStats);

// Profile Management - ADD THESE LINES
router.get("/profile", authMiddleware, roleMiddleware(["partner"]), getPartnerProfile);
router.put("/profile", authMiddleware, roleMiddleware(["partner"]), updatePartnerProfile);

// Menu Management
router.use("/menu", authMiddleware, roleMiddleware(["partner"]), menuRoutes);

/* ======================================================
   ADMIN ROUTES
====================================================== */
router.get("/admin/pending", 
  authMiddleware,
  roleMiddleware(["admin"]), 
  getPendingPartners
);

router.get("/admin/all", 
  authMiddleware,
  roleMiddleware(["admin"]), 
  getAllPartners
);

router.put("/admin/:partnerId/status", 
  authMiddleware,
  roleMiddleware(["admin"]), 
  updatePartnerStatus
);

export default router;