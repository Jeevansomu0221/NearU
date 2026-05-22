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
  getDashboardStats,
  requestPartnerDocumentReupload
} from "../controllers/admin.controller";
import {
  getAllSupportTickets,
  replyToSupportTicket,
  updateSupportTicketStatus
} from "../controllers/support.controller";

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
router.put("/partners/:partnerId/documents/reupload", requestPartnerDocumentReupload);

// Customer Support
router.get("/support/tickets", getAllSupportTickets);
router.post("/support/tickets/:ticketId/reply", replyToSupportTicket);
router.put("/support/tickets/:ticketId/status", updateSupportTicketStatus);

export default router;