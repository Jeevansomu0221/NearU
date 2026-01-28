// backend/src/routes/auth.routes.ts
import { Router } from "express";
import { sendOTP, verifyOTP, refreshToken } from "../controllers/auth.controller"; // Changed to verifyOTP

const router = Router();

// Public routes
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP); // Changed to verifyOTP

// Protected routes
router.post("/refresh", refreshToken); // Will need auth middleware

export default router;