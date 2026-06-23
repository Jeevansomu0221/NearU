import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value: string | undefined) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  port: parsePositiveInt(process.env.PORT, 5000),
  nodeEnv,
  isProduction,
  isTest,
  mongodbURI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiry: process.env.JWT_EXPIRY || "15m",
  refreshJwtExpiry: process.env.REFRESH_JWT_EXPIRY || "7d",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || "1mb",
  rateLimitWindowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: parsePositiveInt(process.env.RATE_LIMIT_MAX, 300),
  otpProvider: (process.env.OTP_PROVIDER || "").trim().toLowerCase(),
  otpExpiryMinutes: parsePositiveInt(process.env.OTP_EXPIRY_MINUTES, 10),
  otpResendCooldownSeconds: parsePositiveInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 30),
  otpMaxAttempts: parsePositiveInt(process.env.OTP_MAX_ATTEMPTS, 5),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || "",
  twofactorApiKey: process.env.TWOFACTOR_API_KEY || "",
  twofactorSenderId: process.env.TWOFACTOR_SENDER_ID || "",
  twofactorTemplateName: process.env.TWOFACTOR_TEMPLATE_NAME || "",
  twofactorDltEntityId: process.env.TWOFACTOR_DLT_ENTITY_ID || "",
  otpFirebaseFallback: process.env.OTP_FIREBASE_FALLBACK !== "false",
  otpDebug: process.env.OTP_DEBUG === "true",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  adminPanelPhone: process.env.ADMIN_PANEL_PHONE || "",
  adminPanelPassword: process.env.ADMIN_PANEL_PASSWORD || "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryUploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "nearu-app",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  deliveryRadiusKm: Number.parseFloat(process.env.DELIVERY_RADIUS_KM || "8"),
  deliveryLocationFreshnessMinutes: parsePositiveInt(process.env.DELIVERY_LOCATION_FRESHNESS_MINUTES, 10)
};

export const validateEnv = (): void => {
  const missing: string[] = [];

  if (!config.mongodbURI) {
    missing.push("MONGODB_URI");
  }

  if (!config.jwtSecret) {
    missing.push("JWT_SECRET");
  }

  if (isProduction) {
    if (!config.corsOrigins.length) {
      missing.push("CORS_ORIGINS");
    }

    if (!config.adminPanelPhone || !config.adminPanelPassword) {
      missing.push("ADMIN_PANEL_PHONE/ADMIN_PANEL_PASSWORD");
    }

    if (!config.otpProvider) {
      missing.push("OTP_PROVIDER");
    }

    if (config.otpProvider === "twilio" && (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioVerifyServiceSid)) {
      missing.push("TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_VERIFY_SERVICE_SID");
    }

    if (
      config.otpProvider === "2factor" &&
      (!config.twofactorApiKey || !config.twofactorTemplateName || !config.twofactorSenderId)
    ) {
      missing.push("TWOFACTOR_API_KEY/TWOFACTOR_TEMPLATE_NAME/TWOFACTOR_SENDER_ID");
    }

    if (config.otpProvider === "firebase" && !config.firebaseProjectId && !config.firebaseServiceAccountPath && !config.firebaseServiceAccountJson) {
      missing.push("FIREBASE_PROJECT_ID/FIREBASE_SERVICE_ACCOUNT_PATH/FIREBASE_SERVICE_ACCOUNT_JSON");
    }

    if (!config.razorpayKeyId || !config.razorpayKeySecret || !config.razorpayWebhookSecret) {
      missing.push("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET/RAZORPAY_WEBHOOK_SECRET");
    }

    if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
      missing.push("CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET");
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};
