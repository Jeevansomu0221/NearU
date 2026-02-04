import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { 
  getAvailableDeliveryJobs, 
  acceptDeliveryJob, 
  updateDeliveryStatus,
  getMyOrders,
  getOrderDetails,
  updateDeliveryStatus as updateOrderDeliveryStatus
} from "../controllers/order.controller";

const router = express.Router();

// Apply auth middleware to all delivery routes
router.use(authMiddleware);

// =================== DELIVERY JOBS ===================
// Get available delivery jobs (READY orders not assigned)
router.get("/available-jobs", getAvailableDeliveryJobs);

// Accept a delivery job
router.post("/:orderId/accept", acceptDeliveryJob);

// =================== MY ORDERS ===================
// Get my assigned delivery orders
router.get("/my-orders", getMyOrders);

// Get order details
router.get("/orders/:orderId", getOrderDetails);

// =================== ORDER STATUS UPDATES ===================
// Update delivery status (PICKED_UP, DELIVERED)
router.patch("/:orderId/status", updateDeliveryStatus);

export default router;