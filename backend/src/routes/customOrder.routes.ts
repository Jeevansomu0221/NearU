import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  createCustomOrder,
  getCustomOrderStatus,
  confirmCustomOrder
} from "../controllers/customOrder.controller";

const router = Router();

router.post("/", authMiddleware, createCustomOrder);
router.get("/:id", authMiddleware, getCustomOrderStatus);
router.post("/:id/confirm", authMiddleware, confirmCustomOrder);

export default router;
