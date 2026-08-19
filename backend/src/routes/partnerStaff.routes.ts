import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rejectPartnerStaff } from "../middlewares/partnerStaff.middleware";
import {
  createPartnerStaff,
  deletePartnerStaff,
  getPartnerStaffLoginActivity,
  listPartnerStaff,
  updatePartnerStaff
} from "../controllers/partnerStaff.controller";

const router = Router();

router.get("/login-activity", authMiddleware, rejectPartnerStaff, getPartnerStaffLoginActivity);
router.get("/", authMiddleware, rejectPartnerStaff, listPartnerStaff);
router.post("/", authMiddleware, rejectPartnerStaff, createPartnerStaff);
router.put("/:staffId", authMiddleware, rejectPartnerStaff, updatePartnerStaff);
router.delete("/:staffId", authMiddleware, rejectPartnerStaff, deletePartnerStaff);

export default router;
