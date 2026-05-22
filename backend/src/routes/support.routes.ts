import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { CONSUMER_APP_ROLES } from "../config/roles";
import {
  addCustomerSupportMessage,
  createSupportTicket,
  getMySupportTickets,
  getSupportFAQs
} from "../controllers/support.controller";

const router = Router();

router.get("/faqs", getSupportFAQs);

router.use(authMiddleware);
router.use(roleMiddleware([...CONSUMER_APP_ROLES]));

router.get("/tickets", getMySupportTickets);
router.post("/tickets", createSupportTicket);
router.post("/tickets/:ticketId/messages", addCustomerSupportMessage);

export default router;
