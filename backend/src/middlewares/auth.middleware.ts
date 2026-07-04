import { Request, Response, NextFunction } from "express";
import User from "../models/User.model";
import { isRoleDeletedForApp } from "../config/roles";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    name: string;
    partnerId?: string | null;
    deliveryPartnerId?: string | null;
    sessionVersion: number;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const isDeletionStatusRead =
      req.method === "GET" &&
      (req.path === "/me/deletion-request" || req.originalUrl?.includes("/me/deletion-request"));

    if (isDeletionStatusRead) {
      req.user = {
        id: decoded.id,
        phone: decoded.phone,
        role: decoded.role,
        name: decoded.name,
        partnerId: decoded.partnerId,
        deliveryPartnerId: decoded.deliveryPartnerId,
        sessionVersion: decoded.sessionVersion
      };
      return next();
    }

    const userRecord = await User.findById(decoded.id).select("isActive sessionVersion deletedRoles").lean();

    if (!userRecord || !userRecord.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive"
      });
    }

    if (isRoleDeletedForApp(userRecord.deletedRoles, decoded.role)) {
      return res.status(401).json({
        success: false,
        message: "Account deleted for this app"
      });
    }

    if (userRecord.sessionVersion !== decoded.sessionVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again."
      });
    }

    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      name: decoded.name,
      partnerId: decoded.partnerId,
      deliveryPartnerId: decoded.deliveryPartnerId,
      sessionVersion: decoded.sessionVersion
    };

    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};
