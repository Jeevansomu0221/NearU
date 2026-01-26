import { Request, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";

// Remove the duplicate AuthRequest interface
// The correct one is imported from auth.middleware

export const testPartner = async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      message: "Partner controller working"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};