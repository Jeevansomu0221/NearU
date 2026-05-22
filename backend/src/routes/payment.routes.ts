import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { CONSUMER_APP_ROLES } from "../config/roles";
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
  roleMiddleware([...CONSUMER_APP_ROLES]),
  createPaymentOrder
);

router.post(
  "/verify",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  verifyPayment
);

export default router;
