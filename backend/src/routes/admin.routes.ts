import { Router, Request, Response } from "express";
import Order from "../models/Order.model";
import SubOrder from "../models/SubOrder.model";
import DeliveryJob from "../models/DeliveryJob.model";

const router = Router();

/**
 * Admin assigns partner to an order (creates sub-order)
 */
router.post("/assign-partner", async (req: Request, res: Response) => {
  try {
    const { orderId, partnerId, items } = req.body;

    if (!orderId || !partnerId || !items) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const subOrder = await SubOrder.create({
      orderId,
      partnerId,
      items,
      status: "CREATED"
    });

    res.status(201).json({
      message: "Partner assigned successfully",
      subOrder
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ Admin assigns delivery partner to an order
 */
router.post("/assign-delivery", async (req: Request, res: Response) => {
  try {
    const { orderId, deliveryPartnerId } = req.body;

    if (!orderId || !deliveryPartnerId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ STEP 1: Check if delivery already assigned for this order
    const existingJob = await DeliveryJob.findOne({ orderId });

    if (existingJob) {
      return res
        .status(400)
        .json({ message: "Delivery already assigned for this order" });
    }

    // ✅ STEP 2: Create delivery job
    const job = await DeliveryJob.create({
      orderId,
      deliveryPartnerId,
      status: "ASSIGNED"
    });

    res.status(201).json({
      message: "Delivery partner assigned",
      job
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


export default router;
