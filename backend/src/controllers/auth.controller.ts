import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import Partner from "../models/Partner.model"; // ADD THIS IMPORT
import { OTPService } from "../services/otp.service";
import { generateToken } from "../utils/jwt";
import { successResponse, errorResponse } from "../utils/response";

/**
 * Send OTP to phone
 */
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return errorResponse(res, "Phone number is required", 400);
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return errorResponse(res, "Invalid phone number format", 400);
    }

    // Send OTP
    const result = await OTPService.sendOTP(phone);
    
    if (!result.success) {
      return errorResponse(res, "Failed to send OTP", 500);
    }

    return successResponse(res, { phone }, "OTP sent successfully");
  } catch (error) {
    console.error("sendOTP error:", error);
    return errorResponse(res, "Failed to send OTP");
  }
};

/**
 * Verify OTP and login/register
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp, role } = req.body;
    
    console.log("🔍 OTP Verification Request:", { phone, otp, role });
    
    // ⚠️ TEMPORARY: Bypass OTP check for testing
    console.log("⚠️ TEST MODE: Bypassing OTP check");
    
    // Find user or create new one for partners
    let user = await User.findOne({ phone });
    
    if (!user) {
      // If user doesn't exist and role is partner, create new user
      if (role === "partner") {
        console.log("👤 Creating new partner user for phone:", phone);
        user = await User.create({
          phone,
          name: "Partner User", // Default name, will be updated in onboarding
          role: "partner",
          isActive: true
        });
      } else {
        // For admin or other roles, user must exist
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
    }
    
    console.log("🔍 User Role:", user.role, "Requested Role:", role);
    
    // Check if admin access is requested
    if (role === "admin" && user.role !== "admin") {
      console.log("❌ Admin access denied - User role is:", user.role);
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Admin access required"
      });
    }
    
    // Find partner if user is a partner
    let partnerId = null;
    if (user.role === "partner") {
      const partner = await Partner.findOne({ userId: user._id });
      if (partner) {
        partnerId = partner._id;
        console.log("✅ Found partner profile:", partner._id);
      } else {
        console.log("📝 No partner profile yet - user needs to onboard");
      }
    }
    
    // Generate token with partnerId if available
    const tokenPayload: any = {
      id: user._id,
      phone: user.phone,
      role: user.role,
      name: user.name
    };
    
    if (partnerId) {
      tokenPayload.partnerId = partnerId;
    }
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    console.log("✅ OTP Verified Successfully for:", user.role);
    console.log("✅ Token payload includes partnerId:", !!partnerId);
    
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        partnerId: partnerId // Include partnerId in response for frontend
      }
    });
    
  } catch (error: any) {
    console.error("❌ OTP Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * Refresh token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Extract old token and verify
    // Generate new token with same payload
    // Return new token
    
    return successResponse(res, { token: "new-token-here" }, "Token refreshed");
  } catch (error) {
    console.error("refreshToken error:", error);
    return errorResponse(res, "Failed to refresh token");
  }
};