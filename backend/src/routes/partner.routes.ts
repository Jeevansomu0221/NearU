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
import {
  getPartnerKycStatus,
  startPartnerDigiLocker,
  completePartnerDigiLocker,
  partnerDigiLockerCallback,
  verifyPartnerPan,
  skipPartnerPan,
  verifyPartnerFssai,
  verifyPartnerGst,
  verifyPartnerBank,
  skipPartnerBank,
  acceptPartnerOnboardingTerms
} from "../controllers/partnerKyc.controller";

const router = Router();

router.get("/kyc/digilocker/callback", partnerDigiLockerCallback);

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

router.get("/kyc/status", authMiddleware, getPartnerKycStatus);
router.post("/kyc/digilocker/start", authMiddleware, startPartnerDigiLocker);
router.post("/kyc/digilocker/complete", authMiddleware, completePartnerDigiLocker);
router.post("/kyc/pan/verify", authMiddleware, verifyPartnerPan);
router.post("/kyc/pan/skip", authMiddleware, skipPartnerPan);
router.post("/kyc/fssai/verify", authMiddleware, verifyPartnerFssai);
router.post("/kyc/gst/verify", authMiddleware, verifyPartnerGst);
router.post("/kyc/bank/verify", authMiddleware, verifyPartnerBank);
router.post("/kyc/bank/skip", authMiddleware, skipPartnerBank);
router.post("/kyc/accept-agreement", authMiddleware, acceptPartnerOnboardingTerms);

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
