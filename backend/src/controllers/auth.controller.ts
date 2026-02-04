import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import User from "../models/User.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model"; // Make sure this model exists
import { OTPService } from "../services/otp.service";
import { successResponse, errorResponse } from "../utils/response";

// Store test OTPs in memory for development
const testOtps = new Map<string, string>(); // phone -> otp

/**
 * Send OTP to phone
 */
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone, role } = req.body;

    console.log("📱 sendOTP called with:", { phone, role });

    if (!phone || !role) {
      return res.status(400).json({
        success: false,
        message: "Phone number and role are required"
      });
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format (10 digits required)"
      });
    }

    // ✅ UPDATED: Add "delivery" role to valid roles
    const validRoles = ['customer', 'partner', 'admin', 'delivery'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be: ${validRoles.join(", ")}`
      });
    }

    // ✅ DEVELOPMENT/TEST MODE: Generate and display test OTP
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    testOtps.set(phone, testOtp);
    
    console.log("========================================");
    console.log("🔐 DEVELOPMENT MODE - TEST OTP GENERATED");
    console.log(`📱 Phone: ${phone}`);
    console.log(`🔢 OTP: ${testOtp}`);
    console.log(`👤 Role: ${role}`);
    console.log("========================================");
    
    // In production, you would use:
    // const result = await OTPService.sendOTP(phone);
    
    // For development, simulate success with test OTP info
    return res.json({
      success: true,
      message: "OTP sent successfully (DEVELOPMENT MODE)",
      phone: phone,
      role: role,
      testMode: true,
      testOtp: testOtp, // Include test OTP in response for development
      note: "In production, OTP would be sent via SMS"
    });

  } catch (error: any) {
    console.error("❌ sendOTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message
    });
  }
};

/**
 * Verify OTP and login/register
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp, role } = req.body;
    
    console.log("🔍 OTP Verification Request:", { phone, otp, role });
    
    // Validate required fields
    if (!phone || !otp || !role) {
      return res.status(400).json({
        success: false,
        message: "Phone, OTP, and role are required"
      });
    }
    
    // ✅ UPDATED: Validate role
    const validRoles = ['customer', 'partner', 'admin', 'delivery'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be: ${validRoles.join(", ")}`
      });
    }
    
    // DEVELOPMENT/TEST MODE: Check against stored test OTP
    if (testOtps.has(phone)) {
      const storedOtp = testOtps.get(phone);
      if (otp === storedOtp) {
        console.log("✅ TEST MODE: OTP verified successfully");
        testOtps.delete(phone); // Remove used OTP
      } else {
        console.log("❌ TEST MODE: Invalid OTP");
        console.log(`   Expected: ${storedOtp}, Received: ${otp}`);
        return res.status(400).json({
          success: false,
          message: "Invalid OTP"
        });
      }
    } else {
      console.log("⚠️ TEST MODE: No OTP found for this phone. Using bypass mode.");
      // Continue without OTP validation for development
    }
    
    // Find existing user
    let user = await User.findOne({ phone });
    
    // Handle different roles
    if (!user) {
      // User doesn't exist - create new based on role
      const userData: any = {
        phone,
        role: role,
        isActive: true
      };
      
      // Set default name based on role
      switch (role) {
        case "customer":
          userData.name = `Customer ${phone.substring(6)}`;
          console.log("👤 Creating new customer user for phone:", phone);
          break;
        case "partner":
          userData.name = `Partner ${phone.substring(6)}`;
          console.log("👤 Creating new partner user for phone:", phone);
          break;
        case "admin":
          userData.name = `Admin ${phone.substring(6)}`;
          console.log("👤 Creating new admin user for phone:", phone);
          break;
        case "delivery":
          userData.name = `Delivery ${phone.substring(6)}`;
          console.log("🚚 Creating new delivery user for phone:", phone);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid role"
          });
      }
      
      user = await User.create(userData);
    } else {
      // User exists - verify role matches
      if (role === "admin" && user.role !== "admin") {
        // If user exists but isn't admin, we can update them to admin
        // (Remove or modify this based on your security needs)
        console.log(`⚠️ User exists as ${user.role}, updating to admin for development`);
        user.role = "admin";
        user.name = `Admin ${phone.substring(6)}`;
        await user.save();
      }
      
      // For other roles, allow role mismatch for development
      if ((role === "customer" && user.role !== "customer") || 
          (role === "partner" && user.role !== "partner") ||
          (role === "delivery" && user.role !== "delivery")) {
        console.log(`⚠️ Role mismatch: User is ${user.role}, requested ${role}. Updating role.`);
        user.role = role;
        
        // Update name based on new role
        switch (role) {
          case "customer":
            user.name = `Customer ${phone.substring(6)}`;
            break;
          case "partner":
            user.name = `Partner ${phone.substring(6)}`;
            break;
          case "delivery":
            user.name = `Delivery ${phone.substring(6)}`;
            break;
        }
        
        await user.save();
      }
    }
    
    // Find partner if user is a partner
    let partnerId = null;
    let deliveryPartnerId = null;
    
    if (user.role === "partner") {
      let partner = await Partner.findOne({ userId: user._id });
      
      if (!partner) {
        partner = await Partner.findOne({ phone });
        
        if (partner && !partner.userId) {
          partner.userId = user._id;
          await partner.save();
          console.log("✅ Updated partner userId");
        }
      }
      
      if (partner) {
        partnerId = partner._id.toString();
        console.log("✅ Found partner profile:", partnerId);
      }
    }
    
    // ✅ NEW: Find delivery partner if user is a delivery partner
    if (user.role === "delivery") {
      let deliveryPartner = await DeliveryPartner.findOne({ userId: user._id });
      
      if (!deliveryPartner) {
        deliveryPartner = await DeliveryPartner.findOne({ phone });
        
        if (deliveryPartner && !deliveryPartner.userId) {
          deliveryPartner.userId = user._id;
          await deliveryPartner.save();
          console.log("✅ Updated delivery partner userId");
        } else if (!deliveryPartner) {
          // Create a new delivery partner profile if doesn't exist
          deliveryPartner = await DeliveryPartner.create({
            userId: user._id,
            phone: user.phone,
            name: user.name,
            isAvailable: true,
            vehicleType: "Bike", // Default
            status: "ACTIVE"
          });
          console.log("✅ Created new delivery partner profile");
        }
      }
      
      if (deliveryPartner) {
        deliveryPartnerId = deliveryPartner._id.toString();
        console.log("✅ Found delivery partner profile:", deliveryPartnerId);
      }
    }
    
    // Generate token
    const tokenPayload: any = {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
      name: user.name
    };
    
    if (partnerId) {
      tokenPayload.partnerId = partnerId;
    }
    
    // ✅ NEW: Add deliveryPartnerId to token payload
    if (deliveryPartnerId) {
      tokenPayload.deliveryPartnerId = deliveryPartnerId;
    }
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    console.log("========================================");
    console.log("✅ OTP Verified Successfully");
    console.log(`👤 User ID: ${user._id.toString()}`);
    console.log(`📱 Phone: ${user.phone}`);
    console.log(`👥 Role: ${user.role}`);
    console.log(`🔑 Token Generated`);
    console.log("========================================");
    
    return res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role,
        partnerId: partnerId,
        deliveryPartnerId: deliveryPartnerId // ✅ NEW: Include deliveryPartnerId
      },
      message: "Login successful"
    });
    
  } catch (error: any) {
    console.error("❌ OTP Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during OTP verification",
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
    
    return res.json({
      success: true,
      token: "new-token-here",
      message: "Token refreshed (TEST MODE)"
    });
  } catch (error: any) {
    console.error("refreshToken error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh token",
      error: error.message
    });
  }
};