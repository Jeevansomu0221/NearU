import { Router } from "express";
import {
  submitPartnerProfile,
  getPendingPartners,
  updatePartnerStatus,
  getAllPartners,
  updateShopStatus,
  getPartnerStats,
  getPartnerWallet,
  getMyStatus,
  completeSetup,
  getPartnerProfile,
  updatePartnerProfile,
  getPartnerOnboardingDraft,
  savePartnerOnboardingDraft,
  clearPartnerOnboardingDraft,
  getMyPartnerReviews
} from "../controllers/partner.controller";

import { getShopsWithImages, getPartnerPublicProfile, getPartnerReviews } from "../controllers/shop.controller";

import menuRoutes from "./menu.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ======================================================
   PUBLIC ROUTES
====================================================== */
router.post("/onboard", authMiddleware, submitPartnerProfile);

/* ======================================================
   AUTHENTICATED ROUTES (customer OR partner)
====================================================== */
router.get("/my-status", authMiddleware, getMyStatus);
router.post("/complete-setup", authMiddleware, completeSetup);
router.get("/onboarding-draft", authMiddleware, getPartnerOnboardingDraft);
router.put("/onboarding-draft", authMiddleware, savePartnerOnboardingDraft);
router.delete("/onboarding-draft", authMiddleware, clearPartnerOnboardingDraft);

/* ======================================================
   PARTNER-ONLY ROUTES (approved partners)
====================================================== */
router.put("/shop-status", authMiddleware, updateShopStatus);
router.get("/stats", authMiddleware, getPartnerStats);
router.get("/wallet", authMiddleware, getPartnerWallet);
router.get("/reviews", authMiddleware, getMyPartnerReviews);

// Profile Management
router.get("/profile", authMiddleware, getPartnerProfile);
router.put("/profile", authMiddleware, updatePartnerProfile);

// Menu Management
router.use("/menu", menuRoutes);

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

/* ======================================================
   PUBLIC SHOP ROUTES (for customers)
====================================================== */
router.get("/shops", getShopsWithImages);
router.get("/:partnerId/reviews", getPartnerReviews);
router.get("/:partnerId", getPartnerPublicProfile);

export default router;
