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

const handleUploadMiddleware = (req: any, res: any, next: any) => {
  uploadMiddleware(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }

    if (error?.code === "LIMIT_FILE_SIZE" || /maxFileSize/i.test(error?.message || "")) {
      return res.status(413).json({
        success: false,
        message: "File is too large. Maximum upload size is 15 MB."
      });
    }

    return res.status(400).json({
      success: false,
      message: error?.message || "Upload failed. Please try again."
    });
  });
};

// Authenticate before parsing multipart to avoid long uploads failing late on expired token.
router.post("/image", authMiddleware, handleUploadMiddleware, uploadImage as any);

// Delete image (optional)
router.delete("/image", authMiddleware, deleteImage as any);

export default router;
