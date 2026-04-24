import { Router } from "express";
import { uploadImage, deleteImage } from "../controllers/upload.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import fileUpload from "express-fileupload";

const router = Router();

// Apply file upload middleware
router.use(fileUpload({
  limits: { fileSize: 15 * 1024 * 1024 },
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: false
}));

// Upload image (authenticated users only)
router.post("/image", authMiddleware, uploadImage as any);

// Delete image (optional)
router.delete("/image", authMiddleware, deleteImage as any);

export default router;
