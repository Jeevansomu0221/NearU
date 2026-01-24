import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

/**
 * Middleware to check if user has required role
 * @param allowedRoles Array of allowed roles
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const userRole = req.user.role;
      
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
        message: "Internal server error"
      });
    }
  };
};

/**
 * Individual role checkers (optional - for convenience)
 */
export const isAdmin = roleMiddleware(["admin"]);
export const isCustomer = roleMiddleware(["customer"]);
export const isPartner = roleMiddleware(["partner"]);
export const isDelivery = roleMiddleware(["delivery"]);
export const isAdminOrPartner = roleMiddleware(["admin", "partner"]);