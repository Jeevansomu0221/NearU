import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminPasswordLogin, getOtpConfig, logout, refreshToken, sendOTP, verifyOTP } from "../controllers/auth.controller";

const router = Router();

const authRateLimitKey = (req: any) => {
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  const role = typeof req.body?.role === "string" ? req.body.role.trim() : "";
  return `${ipKeyGenerator(req.ip || "")}:${phone}:${role}`;
};

const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  keyGenerator: authRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait a few minutes and try again."
  }
});

const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  keyGenerator: authRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP verification attempts. Please wait a few minutes and try again."
  }
});

const adminLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many admin login attempts. Please try again later."
  }
});

const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many token refresh attempts. Please try again later."
  }
});

router.get("/otp-config", getOtpConfig);
router.post("/send-otp", sendOtpLimiter, sendOTP);
router.post("/verify-otp", verifyOtpLimiter, verifyOTP);
router.post("/admin-password-login", adminLoginLimiter, adminPasswordLogin);
router.post("/refresh", refreshTokenLimiter, refreshToken);
router.post("/logout", authMiddleware, logout);

export default router;
