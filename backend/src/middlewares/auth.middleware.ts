// backend/src/middlewares/auth.middleware.ts
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
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Attach user info to request
    (req as AuthRequest).user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      partnerId: decoded.partnerId
    };
    
    console.log("🔐 Authenticated user:", {
      id: decoded.id,
      role: decoded.role,
      hasPartnerId: !!decoded.partnerId
    });
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};