import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Simple placeholder
router.get("/", authMiddleware, async (req, res) => {
  res.json({
    success: true,
    message: "Order routes placeholder"
  });
});

export default router;