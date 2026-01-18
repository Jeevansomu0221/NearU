import { Router } from "express";

const router = Router();

router.get("/dashboard", (req, res) => {
  res.json({ message: "Admin dashboard" });
});

export default router;
