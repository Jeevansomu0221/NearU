import { Router, Request, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import Order from "../models/Order.model";
import SubOrder from "../models/SubOrder.model";

const router = Router();

/**
 * ✅ CREATE ORDER (Customer – Custom Order)
 */
router.post(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== "customer") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { deliveryAddress, note } = req.body;

      if (!deliveryAddress || !note) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const order = await Order.create({
        customerId: req.user.id,
        deliveryAddress,
        note,
        status: "CREATED"
      });

      res.status(201).json({
        message: "Order created",
        orderId: order._id
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * ✅ GET ORDER STATUS + PRICE (Customer)
 */
router.get(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.customerId.toString() !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subOrder = await SubOrder.findOne({
        orderId: order._id,
        status: "ACCEPTED"
      });

      res.json({
        orderId: order._id,
        status: order.status,
        price: subOrder?.price ?? null
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * ✅ CUSTOMER CONFIRMS PRICE
 */
router.post(
  "/:id/confirm",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== "customer") {
        return res.status(403).json({ message: "Access denied" });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.customerId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      order.status = "CONFIRMED";
      await order.save();

      res.json({ message: "Order confirmed" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
