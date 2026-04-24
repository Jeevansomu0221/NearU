import { Response } from "express";
import { UploadedFile } from "express-fileupload";
import cloudinary from "../config/cloudinary";
import { AuthRequest } from "../middlewares/auth.middleware";

const MAX_CLOUDINARY_UPLOAD_ATTEMPTS = 2;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 180000;
const RETRYABLE_CLOUDINARY_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNABORTED",
  "ENOTFOUND"
]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableUploadError = (error: any) => {
  const statusCode = error?.http_code || error?.statusCode || error?.status;
  return (
    RETRYABLE_CLOUDINARY_ERROR_CODES.has(error?.code) ||
    error?.name === "TimeoutError" ||
    error?.syscall === "read" ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode === 499 ||
    (typeof statusCode === "number" && statusCode >= 500)
  );
};

const uploadBufferToCloudinary = async (imageFile: UploadedFile) => {
  const uploadOptions: any = {
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "nearu-app",
    resource_type: "auto",
    timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS
  };

  if (imageFile.mimetype.startsWith("image/")) {
    uploadOptions.transformation = [
      { width: 800, height: 800, crop: "limit" }
    ];
  }

  for (let attempt = 1; attempt <= MAX_CLOUDINARY_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }

            if (!result) {
              reject(new Error("Cloudinary upload finished without a result"));
              return;
            }

            resolve(result);
          }
        );

        uploadStream.end(imageFile.data);
      });
    } catch (error: any) {
      const shouldRetry = attempt < MAX_CLOUDINARY_UPLOAD_ATTEMPTS && isRetryableUploadError(error);

      if (!shouldRetry) {
        throw error;
      }

      console.warn(`Cloudinary upload attempt ${attempt} failed; retrying...`, {
        code: error?.code,
        message: error?.message
      });
      await delay(500 * attempt);
    }
  }

  throw new Error("Cloudinary upload failed");
};

export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    console.log("Upload image request received");

    const uploadedInput = req.files?.image || req.files?.file;

    if (!uploadedInput) {
      return res.status(400).json({
        success: false,
        message: "No file provided"
      });
    }

    const imageFile = Array.isArray(uploadedInput)
      ? uploadedInput[0]
      : uploadedInput as UploadedFile;

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/pdf"
    ];
    if (!allowedMimeTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only JPG, PNG, WEBP, HEIC, or PDF files are allowed"
      });
    }

    console.log("Uploading to Cloudinary...", {
      name: imageFile.name,
      mimetype: imageFile.mimetype,
      size: imageFile.size
    });

    const uploadResult = await uploadBufferToCloudinary(imageFile);

    console.log("Upload successful:", uploadResult.secure_url);

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
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: error.message
    });
  }
};

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
