import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  createPartner,
  getMyPartnerProfile,
} from "../controllers/partner.controller";

const router = Router();

// Partner creates shop
router.post("/register", authMiddleware, createPartner);

// Partner views own shop
router.get("/me", authMiddleware, getMyPartnerProfile);

export default router;
