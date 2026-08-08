import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { 
  getAvailableDeliveryJobs,
  acceptDeliveryJob,
  updateDeliveryStatus,
  getMyOrders,
  getOrderDetails
} from "../controllers/order.controller";
import {
  getDeliveryProfile,
  updateDeliveryProfile,
  getDeliveryStats,
  getMyDeliveryReviews,
  getTodaysEarnings,
  getAllDeliveryPartnersForAdmin,
  updateDeliveryPartnerStatusByAdmin,
  requestDeliveryPartnerDocumentReupload,
  updateBankDetails,
  updateBankVerificationByAdmin,
  updateDeliveryLocation,
  calculateDeliveryDistance,
  getDeliveryAppUpdateInfo
} from "../controllers/delivery.controller";
import {
  sendDeliveryAadhaarOtp,
  verifyDeliveryAadhaarOtp,
  startDeliveryDigiLocker,
  completeDeliveryDigiLocker,
  digilockerCallback,
  verifyDeliveryPan,
  skipDeliveryPan,
  verifyDeliveryBank,
  skipDeliveryBank,
  completeDeliveryRegistrationBasics
} from "../controllers/deliveryKyc.controller";
import {
  getMyCashLedger,
  submitCashDeposit
} from "../controllers/cash.controller";
import {
  getMyWithdrawalWallet,
  requestWithdrawal
} from "../controllers/withdrawal.controller";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = express.Router();

// Public DigiLocker redirect (no auth) — Eko returns here after consent
router.get("/kyc/digilocker/callback", digilockerCallback);

// Apply auth middleware to all other delivery routes
router.use(authMiddleware);

// =================== PROFILE ===================
router.get("/profile", getDeliveryProfile);
router.put("/profile", updateDeliveryProfile);
router.put("/bank-details", updateBankDetails);
router.get("/app-update-info", getDeliveryAppUpdateInfo);

// =================== DIGITAL KYC (Eko DigiLocker / PAN / bank) ===================
router.post("/kyc/digilocker/start", startDeliveryDigiLocker);
router.post("/kyc/digilocker/complete", completeDeliveryDigiLocker);
// Deprecated Aadhaar OTP endpoints — return 410
router.post("/kyc/aadhaar/send-otp", sendDeliveryAadhaarOtp);
router.post("/kyc/aadhaar/verify-otp", verifyDeliveryAadhaarOtp);
router.post("/kyc/pan/verify", verifyDeliveryPan);
router.post("/kyc/pan/skip", skipDeliveryPan);
router.post("/kyc/bank/verify", verifyDeliveryBank);
router.post("/kyc/bank/skip", skipDeliveryBank);
router.post("/kyc/registration-basics", completeDeliveryRegistrationBasics);

// =================== STATS ===================
router.get("/stats", getDeliveryStats);
router.get("/reviews", getMyDeliveryReviews);
router.get("/earnings/today", getTodaysEarnings);
router.get("/cash-ledger", getMyCashLedger);
router.post("/cash-deposits", submitCashDeposit);
router.get("/withdrawal-wallet", getMyWithdrawalWallet);
router.post("/withdrawals", requestWithdrawal);

// =================== ADMIN DELIVERY VERIFICATION ===================
router.get("/admin/all", roleMiddleware(["admin"]), getAllDeliveryPartnersForAdmin);
router.put("/admin/:deliveryPartnerId/status", roleMiddleware(["admin"]), updateDeliveryPartnerStatusByAdmin);
router.put("/admin/:deliveryPartnerId/bank-verification", roleMiddleware(["admin"]), updateBankVerificationByAdmin);
router.put("/admin/:deliveryPartnerId/documents/reupload", roleMiddleware(["admin"]), requestDeliveryPartnerDocumentReupload);

// =================== DELIVERY JOBS ===================
router.get("/available-jobs", getAvailableDeliveryJobs);

router.post("/:orderId/accept", acceptDeliveryJob);

// =================== MY ORDERS ===================
router.get("/my-orders", getMyOrders);
router.get("/orders/:orderId", getOrderDetails);

// =================== ORDER STATUS UPDATES ===================
router.patch("/:orderId/status", updateDeliveryStatus);
router.post("/location", updateDeliveryLocation);
router.post("/calculate-distance", calculateDeliveryDistance);

export default router;
