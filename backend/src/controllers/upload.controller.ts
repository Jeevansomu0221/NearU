import { Response } from "express";
import cloudinary from "../config/cloudinary";
import { AuthRequest } from "../middlewares/auth.middleware";
import { UploadedFile } from "express-fileupload";

export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    console.log("📤 Upload image request received");
    
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    // Handle single file or array
    const imageFile = Array.isArray(req.files.image) 
      ? req.files.image[0] 
      : req.files.image as UploadedFile;

    // Convert to base64 for Cloudinary
    const fileData = imageFile.data;
    const base64Image = `data:${imageFile.mimetype};base64,${fileData.toString('base64')}`;

    console.log("☁️ Uploading to Cloudinary...");
    
    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'nearu-app',
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 800, crop: 'limit' } // Resize for optimization
      ]
    });

    console.log("✅ Upload successful:", uploadResult.secure_url);

    res.json({
      success: true,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        size: uploadResult.bytes
      },
      message: "Image uploaded successfully"
    });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: error.message
    });
  }
};

// For deleting images (optional)
export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required"
      });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    res.json({
      success: true,
      data: result,
      message: "Image deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message
    });
  }
};