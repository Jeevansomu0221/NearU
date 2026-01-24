import { Request, Response } from "express";
import User from "../models/User.model";
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
    const { phone, otp, name, role } = req.body;

    if (!phone || !otp) {
      return errorResponse(res, "Phone and OTP are required", 400);
    }

    // Verify OTP
    const isValidOTP = await OTPService.verifyOTP(phone, otp);
    
    if (!isValidOTP) {
      return errorResponse(res, "Invalid or expired OTP", 400);
    }

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      // New user registration
      if (!name) {
        return errorResponse(res, "Name is required for new users", 400);
      }
      
      user = await User.create({
        phone,
        name,
        role: role || "customer"
      });
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone
    });

    return successResponse(res, {
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    }, "Login successful");

  } catch (error) {
    console.error("verifyOTP error:", error);
    return errorResponse(res, "Login failed");
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