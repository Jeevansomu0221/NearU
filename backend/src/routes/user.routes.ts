import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import User from "../models/User.model";

const router = Router();

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id).select("-otp");

  res.json(user);
});

export default router;
