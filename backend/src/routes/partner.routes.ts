import { Router } from "express";

const router = Router();

router.post("/register", (req, res) => {
  res.json({ message: "Partner registered (mock)" });
});

router.get("/orders", (req, res) => {
  res.json({ message: "Partner orders list" });
});

export default router;
