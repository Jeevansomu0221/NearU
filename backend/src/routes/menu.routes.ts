import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import {
  getPartnerMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability // Corrected name
} from "../controllers/menu.controller";

const router = Router();

// All menu routes require partner authentication
router.use(authMiddleware);
router.use(roleMiddleware(["partner"]));

// Menu management routes
router.get("/", getPartnerMenu);
router.post("/", addMenuItem);
router.put("/:id", updateMenuItem);
router.delete("/:id", deleteMenuItem);
router.put("/:id/availability", toggleItemAvailability); // Corrected here too

export default router;