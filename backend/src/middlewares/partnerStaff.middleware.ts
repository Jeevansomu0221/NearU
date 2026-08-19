import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";

export const isPartnerStaffActor = (user?: AuthRequest["user"]) =>
  Boolean(user?.actorType === "staff" || user?.staffId);

export const rejectPartnerStaff = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (isPartnerStaffActor(req.user)) {
    return res.status(403).json({
      success: false,
      message: "Staff accounts can only manage orders. Ask the restaurant owner for this action."
    });
  }

  return next();
};
