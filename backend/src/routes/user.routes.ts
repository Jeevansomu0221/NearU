import { Router, Request, Response } from "express";

const router = Router();

// Test users API
router.get("/", (req: Request, res: Response) => {
  res.status(200).json([]);
});

export default router;
