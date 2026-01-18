import { Router, Request, Response } from "express";
import User from "../models/User.model";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/jwt";

const router = Router();

// Send OTP
router.post("/send-otp", async (req: Request, res: Response) => {
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

  res.json({ message: "OTP sent (dev mode)" });
});

// Verify OTP
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  const user = await User.findOne({ phone });

  if (!user || user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  // ✅ ADD THIS PART
  const token = generateToken(user._id.toString(), user.role);

  res.status(200).json({
    message: "Login successful",
    token,     // 👈 THIS IS NEW
    user,
  });
});


export default router;
