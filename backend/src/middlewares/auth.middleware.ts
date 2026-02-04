import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    console.log("🔐 Auth Middleware - Checking token");
    console.log("Authorization header:", authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No Bearer token found");
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }
    
    const token = authHeader.split(" ")[1];
    console.log("Token received:", token.substring(0, 20) + "...");
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as any;
    
    console.log("✅ Token verified successfully");
    console.log("Decoded user:", {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      name: decoded.name
    });
    
    // Add user to request
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      name: decoded.name,
      partnerId: decoded.partnerId,
      deliveryPartnerId: decoded.deliveryPartnerId
    };
    
    console.log("🔒 User authenticated:", req.user.role);
    next();
  } catch (error: any) {
    console.error("❌ Auth Middleware Error:", error.message);
    
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
    
    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};