// NEARU/backend/src/routes/order.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { CONSUMER_APP_ROLES, ROLES } from "../config/roles";
import {
  createOrder,
  quoteOrderPricing,
  updateOrderStatus,
  assignDelivery,
  updateDeliveryStatus,
  createCodUpiCollection,
  getCodUpiPaymentStatus,
  confirmCodUpiPayment,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  submitOrderRating,
  getAvailableDeliveryJobs,
  acceptDeliveryJob,
  rejectDeliveryJob
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
  roleMiddleware([...CONSUMER_APP_ROLES]), 
  createOrder
);

router.post(
  "/pricing",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  quoteOrderPricing
);

// Get my orders (customer only)
router.get(
  "/my", 
  authMiddleware, 
  roleMiddleware([...CONSUMER_APP_ROLES]), 
  getMyOrders
);

router.post(
  "/:orderId/ratings",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  submitOrderRating
);

// Get order details (customer only)
router.get(
  "/:orderId", 
  authMiddleware, 
  roleMiddleware([...CONSUMER_APP_ROLES]), 
  getOrderDetails
);

// Cancel order (customer only)
router.post(
  "/:orderId/cancel", 
  authMiddleware, 
  roleMiddleware([...CONSUMER_APP_ROLES]), 
  cancelOrder
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
  getMyOrders
);

// Partner gets order details
router.get(
  "/partner/:orderId", 
  authMiddleware, 
  getOrderDetails
);

// Partner updates order status (ACCEPTED, PREPARING, READY, REJECTED)
router.post(
  "/partner/:orderId/status", 
  authMiddleware, 
  updateOrderStatus
);

/**
 * ================================
 * DELIVERY ROUTES
 * ================================
 */

// Delivery gets available jobs (READY orders not assigned)
router.get(
  "/delivery/available-jobs", 
  authMiddleware, 
  getAvailableDeliveryJobs
);

// Delivery accepts a job (assigns self to order)
router.post(
  "/delivery/:orderId/accept", 
  authMiddleware, 
  acceptDeliveryJob
);

router.post(
  "/delivery/:orderId/reject",
  authMiddleware,
  rejectDeliveryJob
);

// Delivery gets assigned orders
router.get(
  "/delivery/my", 
  authMiddleware, 
  getMyOrders
);

// Delivery gets order details
router.get(
  "/delivery/:orderId", 
  authMiddleware, 
  getOrderDetails
);

// Delivery updates status (PICKED_UP, DELIVERED)
router.post(
  "/delivery/:orderId/status", 
  authMiddleware, 
  updateDeliveryStatus
);

router.post(
  "/delivery/:orderId/cod-upi",
  authMiddleware,
  createCodUpiCollection
);

router.get(
  "/delivery/:orderId/cod-upi/status",
  authMiddleware,
  getCodUpiPaymentStatus
);

router.post(
  "/delivery/:orderId/cod-upi/confirm",
  authMiddleware,
  confirmCodUpiPayment
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

router.post(
  "/admin/orders/:orderId/assign-delivery",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  assignDelivery
);

export default router;
