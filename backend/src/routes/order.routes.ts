import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  createOrder,
  priceCustomOrder,
  acceptCustomOrderPrice,
  assignDelivery,
  updateOrderStatus,
  getMyOrders
} from "../controllers/order.controller";

const router = Router();

/**
 * ================================
 * CUSTOMER
 * ================================
 */

// Create SHOP or CUSTOM order
router.post("/", authMiddleware, createOrder);

// Get my orders (customer / delivery / partner / admin)
router.get("/my", authMiddleware, getMyOrders);

// Accept priced custom order
router.post("/:orderId/accept", authMiddleware, acceptCustomOrderPrice);

/**
 * ================================
 * ADMIN
 * ================================
 */

// Price a custom order
router.post("/:orderId/price", authMiddleware, priceCustomOrder);

// Assign delivery partner
router.post("/:orderId/assign-delivery", authMiddleware, assignDelivery);

/**
 * ================================
 * DELIVERY
 * ================================
 */

// Update order status (PICKED_UP / DELIVERED)
router.post("/:orderId/status", authMiddleware, updateOrderStatus);

export default router;
