// backend/src/middlewares/role.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      console.error("❌ roleMiddleware - No user found in request");
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    console.log("🔍 roleMiddleware - Checking role:", {
      userRole: authReq.user.role,
      allowedRoles: allowedRoles,
      userId: authReq.user.id,
      phone: authReq.user.phone
    });

    // Convert both to lowercase for comparison
    const userRole = authReq.user.role.toLowerCase();
    const allowedRolesLower = allowedRoles.map(r => r.toLowerCase());

    if (!allowedRolesLower.includes(userRole)) {
      console.error("❌ roleMiddleware - Role not allowed:", {
        userRole: userRole,
        allowedRoles: allowedRolesLower
      });
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${userRole} role not allowed`
      });
    }

    console.log("✅ roleMiddleware - Role check passed");
    next();
  };
};