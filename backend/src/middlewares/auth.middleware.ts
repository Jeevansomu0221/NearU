import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Define and export the AuthRequest type
export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    partnerId?: string;
  };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No auth header or invalid format");
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    console.log("🔐 Verifying token:", token.substring(0, 20) + "...");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Attach user info to request
    (req as AuthRequest).user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      partnerId: decoded.partnerId
    };
    
    console.log("✅ Authenticated user:", {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      hasPartnerId: !!decoded.partnerId
    });
    
    next();
  } catch (error: any) {
    console.error("❌ Auth middleware error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }
    
    return res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};