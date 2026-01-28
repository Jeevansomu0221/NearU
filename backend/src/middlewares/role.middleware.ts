import { Request, Response, NextFunction } from "express";

// Define AuthRequest type here since it's not exported from auth.middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    partnerId?: string;
  };
}

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const userRole = authReq.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(", ")}`
        });
      }

      next();
    } catch (error) {
      console.error("Role middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error in role validation"
      });
    }
  };
};