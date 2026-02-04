// NEARU/backend/src/routes/payment.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { ROLES } from "../config/roles";
import {
  createPaymentOrder,
  verifyPayment
} from "../controllers/payment.controller";

const router = Router();

// Create payment order
router.post(
  "/create-order",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  createPaymentOrder
);

// Verify payment
router.post(
  "/verify",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  verifyPayment
);

export default router;