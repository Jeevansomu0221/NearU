import { Router } from "express";
import Partner from "../models/Partner.model";

const router = Router();

/**
 * GET NEARBY SHOPS (CUSTOMER)
 */
router.get("/shops", async (req, res) => {
  const shops = await Partner.find({
    status: "APPROVED"
  }).select(
    "shopName category address isOpen openingTime closingTime rating"
  );

  res.json({
    success: true,
    data: shops
  });
});

export default router;
