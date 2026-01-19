import { Request, Response } from "express";
import Partner from "../models/Partner.model";
import User from "../models/User.model";

/**
 * Create Partner Shop
 * Only users with role = partner
 */
export const createPartner = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const user = await User.findById(userId);

  if (!user || user.role !== "partner") {
    return res.status(403).json({ message: "Not authorized as partner" });
  }

  // Check if partner already has a shop
  const existingPartner = await Partner.findOne({ userId });
  if (existingPartner) {
    return res.status(400).json({ message: "Shop already registered" });
  }

  const { shopName, categories, address } = req.body;

  if (!shopName || !categories || !address) {
    return res.status(400).json({ message: "All fields required" });
  }

  const partner = await Partner.create({
    userId,
    shopName,
    categories,
    address,
  });

  res.status(201).json({
    message: "Partner shop created",
    partner,
  });
};

/**
 * Get Partner Profile
 */
export const getMyPartnerProfile = async (req: Request, res: Response) => {
  const partner = await Partner.findOne({ userId: req.user!.id });

  if (!partner) {
    return res.status(404).json({ message: "Partner not found" });
  }

  res.json(partner);
};
