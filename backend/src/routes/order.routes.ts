// NEARU/backend/src/routes/order.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { ROLES } from "../config/roles";
import {
  createOrder,
  updateOrderStatus,
  assignDelivery,
  updateDeliveryStatus,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  updateOrderPayment
} from "../controllers/order.controller";

const router = Router();

/**
 * ================================
 * CUSTOMER ROUTES
 * ================================
 */

// Create shop order (customer only)
router.post(
  "/", 
  authMiddleware, 
  roleMiddleware([ROLES.CUSTOMER]), 
  createOrder
);

// Get my orders (customer only)
router.get(
  "/my", 
  authMiddleware, 
  roleMiddleware([ROLES.CUSTOMER]), 
  getMyOrders
);

// Get order details (customer only)
router.get(
  "/:orderId", 
  authMiddleware, 
  roleMiddleware([ROLES.CUSTOMER]), 
  getOrderDetails
);

// Cancel order (customer only)
router.post(
  "/:orderId/cancel", 
  authMiddleware, 
  roleMiddleware([ROLES.CUSTOMER]), 
  cancelOrder
);

// Update order payment status (customer only)
router.post(
  "/:orderId/update-payment", 
  authMiddleware, 
  roleMiddleware([ROLES.CUSTOMER]), 
  updateOrderPayment
);

/**
 * ================================
 * PARTNER ROUTES
 * ================================
 */

// Partner gets their orders
router.get(
  "/partner/my", 
  authMiddleware, 
  roleMiddleware([ROLES.PARTNER]), 
  getMyOrders
);

// Partner gets order details
router.get(
  "/partner/:orderId", 
  authMiddleware, 
  roleMiddleware([ROLES.PARTNER]), 
  getOrderDetails
);

// Partner updates order status (ACCEPTED, PREPARING, READY, REJECTED)
router.post(
  "/partner/:orderId/status", 
  authMiddleware, 
  roleMiddleware([ROLES.PARTNER]), 
  updateOrderStatus
);

/**
 * ================================
 * DELIVERY ROUTES
 * ================================
 */

// Delivery gets assigned orders
router.get(
  "/delivery/my", 
  authMiddleware, 
  roleMiddleware([ROLES.DELIVERY]), 
  getMyOrders
);

// Delivery gets order details
router.get(
  "/delivery/:orderId", 
  authMiddleware, 
  roleMiddleware([ROLES.DELIVERY]), 
  getOrderDetails
);

// Delivery updates status (PICKED_UP, DELIVERED)
router.post(
  "/delivery/:orderId/status", 
  authMiddleware, 
  roleMiddleware([ROLES.DELIVERY]), 
  updateDeliveryStatus
);

/**
 * ================================
 * ADMIN ROUTES
 * ================================
 */

// Admin gets all orders
router.get(
  "/admin/all", 
  authMiddleware, 
  roleMiddleware([ROLES.ADMIN]), 
  getMyOrders
);

// Admin gets order details
router.get(
  "/admin/:orderId", 
  authMiddleware, 
  roleMiddleware([ROLES.ADMIN]), 
  getOrderDetails
);

// Admin assigns delivery partner
router.post(
  "/admin/:orderId/assign-delivery", 
  authMiddleware, 
  roleMiddleware([ROLES.ADMIN]), 
  assignDelivery
);

export default router;