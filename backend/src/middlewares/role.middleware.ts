import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const userRole = authReq.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - no role found"
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${userRole} role not allowed`
      });
    }

    next();
  };
};