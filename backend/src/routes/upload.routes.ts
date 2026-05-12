import { Router } from "express";
import { uploadImage, deleteImage } from "../controllers/upload.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import fileUpload from "express-fileupload";

const router = Router();

const uploadMiddleware = fileUpload({
  limits: { fileSize: 15 * 1024 * 1024 },
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: false
});

// Authenticate before parsing multipart to avoid long uploads failing late on expired token.
router.post("/image", authMiddleware, uploadMiddleware, uploadImage as any);

// Delete image (optional)
router.delete("/image", authMiddleware, deleteImage as any);

export default router;
