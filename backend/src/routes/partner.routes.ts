import { Router } from "express";
import {
  submitPartnerProfile,
  getPartnerStatus,
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
  clearPartnerOnboardingDraft
} from "../controllers/partner.controller";

import { getShopsWithImages } from "../controllers/shop.controller";

import menuRoutes from "./menu.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ======================================================
   PUBLIC ROUTES
====================================================== */
router.post("/onboard", authMiddleware, submitPartnerProfile);
router.get("/status/:phone", getPartnerStatus);

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

export default router;
