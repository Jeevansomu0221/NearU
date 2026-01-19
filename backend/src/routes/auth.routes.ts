import { Router, Request, Response } from "express";
import User from "../models/User.model";
import { generateToken } from "../utils/jwt";

const router = Router();

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP (dev mode)
 */
router.post("/send-otp", async (req: Request, res: Response) => {
  try {
    const { phone, role } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        role: role || "customer",
      });
    }

    user.otp = otp;
    user.otpExpiresAt = expiresAt;
    await user.save();

    console.log(`🔐 OTP for ${phone}: ${otp}`);

    res.status(200).json({
      message: "OTP sent (dev mode)",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP & login
 */
router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP required" });
    }

    const user = await User.findOne({ phone });

    if (
      !user ||
      user.otp !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
