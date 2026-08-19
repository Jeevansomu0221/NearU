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
import {
  geocodeDeliveryAddress,
  getDeliveryPlaceAddress,
  resolveDeliveryAddressPin,
  reverseGeocodeDeliveryAddress,
  suggestDeliveryAddresses
} from "../controllers/user.controller";

import menuRoutes from "./menu.routes";
import {
  createPartnerStaff,
  deletePartnerStaff,
  getPartnerStaffLoginActivity,
  listPartnerStaff,
  updatePartnerStaff
} from "../controllers/partnerStaff.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { rejectPartnerStaff } from "../middlewares/partnerStaff.middleware";
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
router.post("/onboard", authMiddleware, rejectPartnerStaff, submitPartnerProfile);

/* ======================================================
   AUTHENTICATED ROUTES (customer OR partner)
====================================================== */
router.get("/my-status", authMiddleware, getMyStatus);
router.post("/complete-setup", authMiddleware, rejectPartnerStaff, completeSetup);
router.get("/onboarding-draft", authMiddleware, rejectPartnerStaff, getPartnerOnboardingDraft);
router.put("/onboarding-draft", authMiddleware, rejectPartnerStaff, savePartnerOnboardingDraft);
router.delete("/onboarding-draft", authMiddleware, rejectPartnerStaff, clearPartnerOnboardingDraft);

router.get("/geocode/suggest", authMiddleware, suggestDeliveryAddresses);
router.get("/geocode", authMiddleware, geocodeDeliveryAddress);
router.get("/geocode/place", authMiddleware, getDeliveryPlaceAddress);
router.post("/geocode/resolve", authMiddleware, resolveDeliveryAddressPin);
router.post("/geocode/reverse", authMiddleware, reverseGeocodeDeliveryAddress);

router.get("/kyc/status", authMiddleware, rejectPartnerStaff, getPartnerKycStatus);
router.post("/kyc/digilocker/start", authMiddleware, rejectPartnerStaff, startPartnerDigiLocker);
router.post("/kyc/digilocker/complete", authMiddleware, rejectPartnerStaff, completePartnerDigiLocker);
router.post("/kyc/pan/verify", authMiddleware, rejectPartnerStaff, verifyPartnerPan);
router.post("/kyc/pan/skip", authMiddleware, rejectPartnerStaff, skipPartnerPan);
router.post("/kyc/fssai/verify", authMiddleware, rejectPartnerStaff, verifyPartnerFssai);
router.post("/kyc/gst/verify", authMiddleware, rejectPartnerStaff, verifyPartnerGst);
router.post("/kyc/bank/verify", authMiddleware, rejectPartnerStaff, verifyPartnerBank);
router.post("/kyc/bank/skip", authMiddleware, rejectPartnerStaff, skipPartnerBank);
router.post("/kyc/accept-agreement", authMiddleware, rejectPartnerStaff, acceptPartnerOnboardingTerms);

/* ======================================================
   PARTNER-ONLY ROUTES (approved partners)
====================================================== */
router.put("/shop-status", authMiddleware, updateShopStatus);
router.get("/stats", authMiddleware, getPartnerStats);
router.get("/wallet", authMiddleware, rejectPartnerStaff, getPartnerWallet);
router.get("/reviews", authMiddleware, getMyPartnerReviews);

// Profile Management
router.get("/profile", authMiddleware, getPartnerProfile);
router.put("/profile", authMiddleware, rejectPartnerStaff, updatePartnerProfile);

// Staff logins must be declared as concrete paths. Express 5 will otherwise let
// GET /partners/staff fall through to GET /:partnerId ("staff" as a shop id).
router.get("/staff/login-activity", authMiddleware, rejectPartnerStaff, getPartnerStaffLoginActivity);
router.get("/staff", authMiddleware, rejectPartnerStaff, listPartnerStaff);
router.post("/staff", authMiddleware, rejectPartnerStaff, createPartnerStaff);
router.put("/staff/:staffId", authMiddleware, rejectPartnerStaff, updatePartnerStaff);
router.delete("/staff/:staffId", authMiddleware, rejectPartnerStaff, deletePartnerStaff);

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
