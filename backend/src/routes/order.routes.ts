import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  res.json({ message: "Order created" });
});

router.get("/:id", (req, res) => {
  res.json({ message: "Order details" });
});

export default router;
