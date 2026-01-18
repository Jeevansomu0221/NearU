import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
  res.json({ message: "OTP sent (mock)" });
});

router.post("/verify", (req, res) => {
  res.json({ token: "mock-jwt-token" });
});

export default router;
