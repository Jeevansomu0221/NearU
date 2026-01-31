// FIXED version - backend/src/routes/partner.routes.ts
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

// IMPORTANT: Don't apply authMiddleware globally here
// Apply it individually to routes that need it

router.get("/my-status", authMiddleware, getMyStatus);
router.post("/complete-setup", authMiddleware, completeSetup);

/* ======================================================
   PARTNER-ONLY ROUTES (approved partners)
====================================================== */
router.put("/shop-status", authMiddleware, roleMiddleware(["partner"]), updateShopStatus);
router.get("/stats", authMiddleware, roleMiddleware(["partner"]), getPartnerStats);

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