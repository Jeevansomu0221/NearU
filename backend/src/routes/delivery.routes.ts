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
  getTodaysEarnings,
  getAllDeliveryPartnersForAdmin,
  updateDeliveryPartnerStatusByAdmin
} from "../controllers/delivery.controller";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = express.Router();

// Apply auth middleware to all delivery routes
router.use(authMiddleware);

// =================== PROFILE ===================
router.get("/profile", getDeliveryProfile);
router.put("/profile", updateDeliveryProfile);

// =================== STATS ===================
router.get("/stats", getDeliveryStats);
router.get("/earnings/today", getTodaysEarnings);

// =================== ADMIN DELIVERY VERIFICATION ===================
router.get("/admin/all", roleMiddleware(["admin"]), getAllDeliveryPartnersForAdmin);
router.put("/admin/:deliveryPartnerId/status", roleMiddleware(["admin"]), updateDeliveryPartnerStatusByAdmin);

// =================== DELIVERY JOBS ===================
router.get("/available-jobs", getAvailableDeliveryJobs);

router.post("/:orderId/accept", acceptDeliveryJob);

// =================== MY ORDERS ===================
router.get("/my-orders", getMyOrders);
router.get("/orders/:orderId", getOrderDetails);

// =================== ORDER STATUS UPDATES ===================
router.patch("/:orderId/status", updateDeliveryStatus);

export default router;
