import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import SubOrder from "../models/SubOrder.model";
import Partner from "../models/Partner.model";

const router = Router();

/**
 * GET partner profile
 */
router.get("/me", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "partner") {
    return res.status(403).json({ message: "Access denied" });
  }

  const partner = await Partner.findOne({ userId: req.user.id });
  if (!partner) {
    return res.status(404).json({ message: "Partner profile not found" });
  }

  res.json(partner);
});

/**
 * GET assigned sub-orders
 */
router.get("/sub-orders", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "partner") {
    return res.status(403).json({ message: "Access denied" });
  }

  const partner = await Partner.findOne({ userId: req.user.id });
  if (!partner) {
    return res.status(404).json({ message: "Partner profile not found" });
  }

  const subOrders = await SubOrder.find({ partnerId: partner._id });
  res.json(subOrders);
});

/**
 * ACCEPT sub-order (partner sets price)
 */
router.post("/sub-orders/:id/accept", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "partner") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { price } = req.body;
  if (!price) {
    return res.status(400).json({ message: "Price is required" });
  }

  const subOrder = await SubOrder.findById(req.params.id);
  if (!subOrder) {
    return res.status(404).json({ message: "SubOrder not found" });
  }

  subOrder.status = "ACCEPTED";
  subOrder.price = price;
  await subOrder.save();

  res.json({ message: "SubOrder accepted", subOrder });
});

/**
 * REJECT sub-order
 */
router.post("/sub-orders/:id/reject", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "partner") {
    return res.status(403).json({ message: "Access denied" });
  }

  const subOrder = await SubOrder.findById(req.params.id);
  if (!subOrder) {
    return res.status(404).json({ message: "SubOrder not found" });
  }

  subOrder.status = "REJECTED";
  await subOrder.save();

  res.json({ message: "SubOrder rejected" });
});

export default router;
