import { Router } from "express";
import { sendOTP, verifyOTP, refreshToken } from "../controllers/auth.controller";

const router = Router();

// Public routes
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// Protected routes
router.post("/refresh", refreshToken); // Will need auth middleware

export default router;