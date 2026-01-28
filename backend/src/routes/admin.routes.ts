// backend/src/routes/admin.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import {
  getAllOrders,
  getPartnerRequests,
  updatePartnerStatus,
  getPartnerDetails,
  getOrderDetails,
  updateOrderStatus,
  getDashboardStats
} from "../controllers/admin.controller";

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware(["admin"]));

// Dashboard
router.get("/dashboard/stats", getDashboardStats);

// Order Management
router.get("/orders", getAllOrders);
router.get("/orders/:orderId", getOrderDetails);
router.put("/orders/:orderId/status", updateOrderStatus);

// Partner Management
router.get("/partners", getPartnerRequests);
router.get("/partners/:partnerId", getPartnerDetails);
router.put("/partners/:partnerId/status", updatePartnerStatus);

export default router;