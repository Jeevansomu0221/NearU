import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { ROLES } from "../config/roles";
import {
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook
} from "../controllers/payment.controller";

const router = Router();

router.post("/webhook", handlePaymentWebhook);

router.post(
  "/create-order",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  createPaymentOrder
);

router.post(
  "/verify",
  authMiddleware,
  roleMiddleware([ROLES.CUSTOMER]),
  verifyPayment
);

export default router;
