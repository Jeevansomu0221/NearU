import { Router } from "express";
import { uploadImage, deleteImage } from "../controllers/upload.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import fileUpload from "express-fileupload";

const router = Router();

// Apply file upload middleware
router.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: false // Use memory storage
}));

// Upload image (authenticated users only)
router.post("/image", authMiddleware, uploadImage as any);

// Delete image (optional)
router.delete("/image", authMiddleware, deleteImage as any);

export default router;