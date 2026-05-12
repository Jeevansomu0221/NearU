import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminPasswordLogin, logout, refreshToken, sendOTP, verifyOTP } from "../controllers/auth.controller";

const router = Router();

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/admin-password-login", adminPasswordLogin);
router.post("/refresh", refreshToken);
router.post("/logout", authMiddleware, logout);

export default router;
