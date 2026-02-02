import { Router } from "express";
import { getAllShops, getShopDetails } from "../controllers/user.controller";

const router = Router();

// Public routes - no authentication required
router.get("/shops", getAllShops);
router.get("/shop/:shopId", getShopDetails);

export default router;