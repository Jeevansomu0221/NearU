import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import Order from "../models/Order.model";
import SubOrder from "../models/SubOrder.model";

/**
 * ================================
 * CUSTOMER – CREATE CUSTOM ORDER
 * ================================
 */
export const createCustomOrder = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user || req.user.role !== "customer") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { deliveryAddress, note } = req.body;

    if (!deliveryAddress || !note) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const order = await Order.create({
      orderType: "CUSTOM",
      customerId: req.user.id,
      deliveryAddress,
      note,
      status: "CREATED"
    });

    return res.status(201).json({
      message: "Custom order created",
      orderId: order._id
    });
  } catch (error) {
    console.error("createCustomOrder:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * ================================
 * CUSTOMER – GET ORDER STATUS + PRICE
 * ================================
 */
export const getCustomOrderStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const subOrder = await SubOrder.findOne({
      orderId: order._id,
      status: "ACCEPTED"
    });

    return res.json({
      orderId: order._id,
      status: order.status,
      price: subOrder?.price ?? null
    });
  } catch (error) {
    console.error("getCustomOrderStatus:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * ================================
 * CUSTOMER – CONFIRM PRICE
 * ================================
 */
export const confirmCustomOrder = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user || req.user.role !== "customer") {
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

    return res.json({ message: "Order confirmed" });
  } catch (error) {
    console.error("confirmCustomOrder:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
