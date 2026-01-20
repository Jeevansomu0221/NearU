import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import DeliveryPartner from "../models/DeliveryPartner.model";
import DeliveryJob from "../models/DeliveryJob.model";
import Order from "../models/Order.model";
import User from "../models/User.model";
import Partner from "../models/Partner.model";
import SubOrder from "../models/SubOrder.model";
import mongoose from "mongoose";

const router = Router();

/**
 * GET delivery partner current job
 */
router.get("/jobs", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "delivery") {
    return res.status(403).json({ message: "Access denied" });
  }

  const deliveryPartner = await DeliveryPartner.findOne({
    userId: req.user.id
  });

  if (!deliveryPartner) {
    return res.status(404).json({ message: "Delivery profile not found" });
  }

const job = await DeliveryJob.findOne({
  deliveryPartnerId: deliveryPartner._id,
  status: { $ne: "DELIVERED" }
}).sort({ createdAt: -1 });



  if (!job) {
    return res.json({ message: "No active delivery jobs" });
  }

  // Order
  const order = await Order.findById(job.orderId);

  // Customer
  const customer = await User.findById(order?.customerId);

  // SubOrders + Partners
 // SubOrders + Partners
const subOrders = await SubOrder.find({ orderId: job.orderId });
const partnerIds = subOrders.map(s => s.partnerId);

// Fetch partners
const partners = await Partner.find({ _id: { $in: partnerIds } });

// Fetch partner users to get phone numbers
const partnerUserIds = partners.map(p => p.userId);
const partnerUsers = await User.find({ _id: { $in: partnerUserIds } });

// Map partnerId → phone
const partnerPhoneMap = new Map(
  partnerUsers.map(u => [u._id.toString(), u.phone])
);

res.json({
  jobId: job._id,
  status: job.status,
  customer: {
    name: customer?.name || "Customer",
    phone: customer?.phone,
    address: order?.deliveryAddress
  },
  pickups: partners.map(p => ({
    shopName: p.shopName,
    address: p.address,
    phone: partnerPhoneMap.get(p.userId.toString())
  }))
});

});

/**
 * UPDATE status → PICKING
 */
router.post("/jobs/:id/picking", authMiddleware, async (req: any, res) => {
  const job = await DeliveryJob.findById(req.params.id);
  if (!job) return res.status(404).json({ message: "Job not found" });

  job.status = "PICKING";
  await job.save();

  res.json({ message: "Status updated to PICKING" });
});

/**
 * UPDATE status → DELIVERED
 */
router.post("/jobs/:id/delivered", authMiddleware, async (req: any, res) => {
  const job = await DeliveryJob.findById(req.params.id);
  if (!job) return res.status(404).json({ message: "Job not found" });

  job.status = "DELIVERED";
  await job.save();

  res.json({ message: "Order delivered successfully" });
});

export default router;
