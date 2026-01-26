import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { ROLES } from "../config/roles";

const router = Router();

router.get("/",
  authMiddleware,
  roleMiddleware([ROLES.DELIVERY]),
  async (req, res) => {
    try {
      res.json({
        success: true,
        message: "Delivery routes working",
        data: null
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  }
);

export default router;