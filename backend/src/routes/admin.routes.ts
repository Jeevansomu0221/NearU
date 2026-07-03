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
  approveWithdrawalRequest,
  getAdminWithdrawalRequests,
  rejectWithdrawalRequest
} from "../controllers/withdrawal.controller";
import {
  getAdminCashDeposits,
  rejectCashDeposit,
  verifyCashDeposit
} from "../controllers/cash.controller";
import {
  approveAccountDeletion,
  getAccountDeletionRequests,
  refreshAccountDeletionPayoutCheck,
  rejectAccountDeletion
} from "../controllers/accountDeletion.controller";

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
router.get("/withdrawals", getAdminWithdrawalRequests);
router.post("/withdrawals/:requestId/approve", approveWithdrawalRequest);
router.post("/withdrawals/:requestId/reject", rejectWithdrawalRequest);
router.get("/cash-deposits", getAdminCashDeposits);
router.post("/cash-deposits/:depositId/verify", verifyCashDeposit);
router.post("/cash-deposits/:depositId/reject", rejectCashDeposit);

// Partner Management
router.get("/partners", getPartnerRequests);
router.get("/partners/:partnerId", getPartnerDetails);
router.put("/partners/:partnerId/status", updatePartnerStatus);
router.put("/partners/:partnerId/documents/reupload", requestPartnerDocumentReupload);

// Account Deletion Requests
router.get("/account-deletions", getAccountDeletionRequests);
router.post("/account-deletions/:requestId/refresh-payouts", refreshAccountDeletionPayoutCheck);
router.post("/account-deletions/:requestId/approve", approveAccountDeletion);
router.post("/account-deletions/:requestId/reject", rejectAccountDeletion);

// Customer Support
router.get("/support/tickets", getAllSupportTickets);
router.post("/support/tickets/:ticketId/reply", replyToSupportTicket);
router.put("/support/tickets/:ticketId/status", updateSupportTicketStatus);

export default router;