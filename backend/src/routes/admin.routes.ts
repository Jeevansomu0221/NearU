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
import {
  createPayout,
  getPayoutHistory,
  getPayoutSummary
} from "../controllers/payout.controller";
import {
  getAdminCashDeposits,
  rejectCashDeposit,
  verifyCashDeposit
} from "../controllers/cash.controller";

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

// Payout Management
router.get("/payouts/summary", getPayoutSummary);
router.get("/payouts/history", getPayoutHistory);
router.post("/payouts", createPayout);
router.get("/cash-deposits", getAdminCashDeposits);
router.post("/cash-deposits/:depositId/verify", verifyCashDeposit);
router.post("/cash-deposits/:depositId/reject", rejectCashDeposit);

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