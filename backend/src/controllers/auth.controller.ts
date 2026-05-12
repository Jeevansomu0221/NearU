import { Request, Response } from "express";
import { Types } from "mongoose";
import User from "../models/User.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import { OTPService } from "../services/otp.service";
import { verifyFirebasePhoneToken } from "../services/firebaseAuth.service";
import { successResponse, errorResponse } from "../utils/response";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ROLES } from "../config/roles";
import { config } from "../config/env";

const phoneRegex = /^[0-9]{10}$/;
const DEFAULT_ADMIN_PASSWORD = "Porschecarrera@911";
const ADMIN_PASSWORDS = Array.from(new Set([process.env.ADMIN_PANEL_PASSWORD, DEFAULT_ADMIN_PASSWORD].filter(Boolean)));
const ADMIN_PHONE = process.env.ADMIN_PANEL_PHONE || "9999999999";

const buildTokens = async (user: any) => {
  let partnerId: string | null = null;
  let deliveryPartnerId: string | null = null;

  if (user.role === ROLES.PARTNER) {
    const partner = await Partner.findOne({ userId: user._id }).select("_id").lean();
    partnerId = partner?._id?.toString() || null;
  }

  if (user.role === ROLES.DELIVERY) {
    let deliveryPartner = await DeliveryPartner.findOne({ userId: user._id }).select("_id").lean();

    if (!deliveryPartner) {
      const created = await DeliveryPartner.create({
        userId: user._id,
        phone: user.phone,
        name: user.name,
        isAvailable: false,
        status: "PENDING"
      });
      deliveryPartner = { _id: created._id } as any;
    }

    deliveryPartnerId = deliveryPartner?._id?.toString() || null;
  }

  const sessionVersion = user.sessionVersion || 0;
  const accessToken = generateAccessToken({
    id: user._id.toString(),
    phone: user.phone,
    role: user.role,
    name: user.name,
    partnerId,
    deliveryPartnerId,
    sessionVersion
  });
  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    sessionVersion
  });

  return {
    accessToken,
    refreshToken,
    partnerId,
    deliveryPartnerId
  };
};

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone, role } = req.body;

    if (!phone || !role) {
      return errorResponse(res, "Phone number and role are required", 400);
    }

    if (!phoneRegex.test(phone)) {
      return errorResponse(res, "Invalid phone number format", 400);
    }

    if (!Object.values(ROLES).includes(role)) {
      return errorResponse(res, "Invalid role", 400);
    }

    if (role === ROLES.ADMIN) {
      const existingAdmin = await User.findOne({ phone, role: ROLES.ADMIN }).select("_id").lean();
      if (!existingAdmin) {
        return errorResponse(res, "Admin OTP is restricted", 403);
      }
    }

    await OTPService.sendOTP(phone);

    const data: { phone: string; devOtp?: string } = { phone };
    const devOtp = OTPService.getDevOtp(phone);
    if (!config.isProduction && devOtp) {
      data.devOtp = devOtp;
    }

    return successResponse(res, data, "OTP sent successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to send OTP", 400);
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp, role, firebaseIdToken } = req.body;

    if (!phone || !role || (!otp && !firebaseIdToken)) {
      return errorResponse(res, "Phone, OTP, and role are required", 400);
    }

    if (!phoneRegex.test(phone)) {
      return errorResponse(res, "Invalid phone number format", 400);
    }

    if (!Object.values(ROLES).includes(role)) {
      return errorResponse(res, "Invalid role", 400);
    }

    if (firebaseIdToken) {
      await verifyFirebasePhoneToken(firebaseIdToken, phone);
    } else {
      const isOtpValid = await OTPService.verifyOTP(phone, otp);
      if (!isOtpValid) {
        return errorResponse(res, "Invalid or expired OTP", 400);
      }
    }

    let user = await User.findOne({ phone });

    if (!user) {
      if (role === ROLES.ADMIN) {
        return errorResponse(res, "Admin account not found", 403);
      }

      user = await User.create({
        phone,
        role,
        isActive: true,
        name: ""
      });
    } else if (user.role !== role) {
      if (role === ROLES.ADMIN || user.role === ROLES.ADMIN) {
        return errorResponse(res, "Role mismatch for this account", 403);
      }

      user.role = role;
    }

    user.lastLogin = new Date();
    await user.save();

    if (user.role === ROLES.PARTNER) {
      const partner = await Partner.findOne({ phone, userId: { $exists: false } });
      if (partner) {
        partner.userId = new Types.ObjectId(user._id);
        await partner.save();
      }
    }

    const { accessToken, refreshToken, partnerId, deliveryPartnerId } = await buildTokens(user);

    return successResponse(res, {
      token: accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role,
        partnerId,
        deliveryPartnerId
      }
    }, "Login successful");
  } catch (error: any) {
    if (error?.code === 11000) {
      const duplicatedField = Object.keys(error.keyPattern || error.keyValue || {})[0];
      const message =
        duplicatedField === "email"
          ? "This email is already linked to another account."
          : "This account detail is already in use.";

      return errorResponse(res, message, 400);
    }

    return errorResponse(res, error.message || "Server error during OTP verification");
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, "Refresh token is required", 400);
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.sessionVersion !== decoded.sessionVersion) {
      return errorResponse(res, "Refresh token expired", 401);
    }

    const tokens = await buildTokens(user);
    return successResponse(res, {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }, "Token refreshed");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to refresh token", 401);
  }
};

export const adminPasswordLogin = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return errorResponse(res, "Password is required", 400);
    }

    if (!ADMIN_PASSWORDS.includes(password)) {
      return errorResponse(res, "Invalid admin password", 401);
    }

    let user = await User.findOne({ phone: ADMIN_PHONE });

    if (!user) {
      user = await User.create({
        phone: ADMIN_PHONE,
        role: ROLES.ADMIN,
        isActive: true,
        name: "Vyaha Admin"
      });
    } else if (user.role !== ROLES.ADMIN) {
      user.role = ROLES.ADMIN;
      user.isActive = true;
    }

    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = await buildTokens(user);

    return successResponse(res, {
      token: accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    }, "Admin login successful");
  } catch (error: any) {
    return errorResponse(res, error.message || "Admin login failed", 500);
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    await User.findByIdAndUpdate(req.user.id, { $inc: { sessionVersion: 1 } });
    return successResponse(res, null, "Logged out successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to logout");
  }
};
