import { Response } from "express";
import { UploadedFile } from "express-fileupload";
import cloudinary from "../config/cloudinary";
import { AuthRequest } from "../middlewares/auth.middleware";
import { config } from "../config/env";

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

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/octet-stream"
]);

const allowedExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "pdf"
]);

const getFileExtension = (name: string): string => {
  if (!name) return "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot < 0 || lastDot === name.length - 1) return "";
  return name.slice(lastDot + 1).toLowerCase();
};

const isAllowedUpload = (imageFile: UploadedFile) => {
  const mimeType = (imageFile.mimetype || "").toLowerCase();
  const extension = getFileExtension(imageFile.name);

  // Accept if the mime type is in our allow list (most common, reliable signal from the client).
  if (mimeType && allowedMimeTypes.has(mimeType)) {
    return true;
  }

  // Accept if the file extension is in our allow list (covers cases where the OS sends
  // a generic mime type like application/octet-stream but the file is clearly an image/PDF).
  if (extension && allowedExtensions.has(extension)) {
    return true;
  }

  // Accept image/* mime types we did not explicitly enumerate (e.g. image/jpg, image/x-png)
  // because Cloudinary will handle them and reject if truly invalid.
  if (mimeType.startsWith("image/")) {
    return true;
  }

  return false;
};

const normalizePublicId = (value: string) => value.replace(/^\/+/, "").replace(/\.[a-z0-9]+$/i, "");

const getUserUploadFolder = (userId: string) =>
  `${config.cloudinaryUploadFolder.replace(/\/+$/, "")}/users/${userId}`;

const uploadBufferToCloudinary = async (imageFile: UploadedFile, ownerId: string) => {
  const uploadOptions: any = {
    folder: getUserUploadFolder(ownerId),
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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

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

    if (!isAllowedUpload(imageFile)) {
      console.warn("Rejected upload due to file type:", {
        name: imageFile.name,
        mimetype: imageFile.mimetype,
        size: imageFile.size
      });
      return res.status(400).json({
        success: false,
        message: "Only JPG, PNG, WEBP, HEIC, or PDF files are allowed"
      });
    }

    const uploadResult = await uploadBufferToCloudinary(imageFile, req.user.id);

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
    const cloudinaryMessage = error?.error?.message || error?.message;
    console.error("Upload error:", {
      message: cloudinaryMessage,
      http_code: error?.http_code,
      code: error?.code,
      name: error?.name
    });

    const statusCode =
      typeof error?.http_code === "number"
        ? error.http_code
        : typeof error?.statusCode === "number"
          ? error.statusCode
          : 500;

    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      success: false,
      message: cloudinaryMessage
        ? `Upload failed: ${cloudinaryMessage}`
        : "Failed to upload image. Please try again."
    });
  }
};

export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required"
      });
    }

    const normalizedPublicId = normalizePublicId(publicId);
    const ownerFolder = getUserUploadFolder(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !normalizedPublicId.startsWith(`${ownerFolder}/`)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete files uploaded by your account"
      });
    }

    const result = await cloudinary.uploader.destroy(normalizedPublicId);

    res.json({
      success: true,
      data: result,
      message: "Image deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image"
    });
  }
};
