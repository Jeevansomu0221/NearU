import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { registerNotificationToken, unregisterNotificationToken } from "../controllers/notification.controller";

const router = Router();

router.post("/register-token", authMiddleware, registerNotificationToken);
router.delete("/token", authMiddleware, unregisterNotificationToken);

export default router;
