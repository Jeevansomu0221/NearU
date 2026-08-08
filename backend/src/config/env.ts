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

const normalizeTestPhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

/** Soft OTP bypass pairs used by apps + backend (no SMS). */
const DEFAULT_TEST_LOGIN_CREDENTIALS: Record<string, string> = {
  "1010101010": "000000",
  "1234567890": "123456"
};

const parseTestLoginCredentials = (): Record<string, string> => {
  const credentials = { ...DEFAULT_TEST_LOGIN_CREDENTIALS };
  const legacyPhone = normalizeTestPhone(process.env.TEST_LOGIN_PHONE || "1010101010");
  const legacyOtp = process.env.TEST_LOGIN_OTP || "000000";
  if (legacyPhone && legacyOtp) {
    credentials[legacyPhone] = legacyOtp;
  }

  const raw = process.env.TEST_LOGIN_CREDENTIALS;
  if (!raw) {
    return credentials;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [phone, otp] of Object.entries(parsed)) {
      const normalizedPhone = normalizeTestPhone(phone);
      if (normalizedPhone && otp) {
        credentials[normalizedPhone] = String(otp).trim();
      }
    }
  } catch {
    // Keep defaults + legacy env when JSON is invalid.
  }

  return credentials;
};

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
  /** DLT template ID from operator portal (informational / support). */
  twofactorTemplateId: process.env.TWOFACTOR_TEMPLATE_ID || "",
  /** Force OTP delivery channel. Only "sms" is supported by this backend. */
  twofactorOtpChannel: (process.env.TWOFACTOR_OTP_CHANNEL || "sms").trim().toLowerCase(),
  // Keep fallback opt-in only; implicit fallback can switch provider behavior unexpectedly.
  otpFirebaseFallback: process.env.OTP_FIREBASE_FALLBACK === "true",
  otpDebug: process.env.OTP_DEBUG === "true",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  adminPanelPhone: process.env.ADMIN_PANEL_PHONE || "",
  adminPanelPassword: process.env.ADMIN_PANEL_PASSWORD || "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  platformUpiVpa: process.env.PLATFORM_UPI_VPA || "",
  platformUpiPayeeName: process.env.PLATFORM_UPI_PAYEE_NAME || "Vyaha Technologies",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryUploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "nearu-app",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  deliveryRadiusKm: Number.parseFloat(process.env.DELIVERY_RADIUS_KM || "8"),
  deliveryLocationFreshnessMinutes: parsePositiveInt(process.env.DELIVERY_LOCATION_FRESHNESS_MINUTES, 10),
  testLoginPhone: (process.env.TEST_LOGIN_PHONE || "1010101010").replace(/\D/g, "").slice(-10),
  testLoginOtp: process.env.TEST_LOGIN_OTP || "000000",
  testLoginCredentials: parseTestLoginCredentials(),
  allowMultiDeviceSessions: process.env.ALLOW_MULTI_DEVICE_SESSIONS !== "false",

  /** Eko ICICI — settlement (v1 balance) + KYC tools (v3 DigiLocker/PAN/bank). */
  ekoBaseUrl: (process.env.EKO_BASE_URL || "https://api.eko.in:25002/ekoicici").replace(/\/$/, ""),
  ekoKycBaseUrl: (process.env.EKO_KYC_BASE_URL || "https://api.eko.in/ekoicici/v3").replace(/\/$/, ""),
  ekoDeveloperKey: process.env.EKO_DEVELOPER_KEY || "",
  /** Authenticator / access key from Eko email — used only server-side for HMAC secret-key. */
  ekoAccessKey: process.env.EKO_ACCESS_KEY || process.env.EKO_AUTHENTICATOR_KEY || "",
  ekoInitiatorId: (process.env.EKO_INITIATOR_ID || "").replace(/\D/g, ""),
  /** Optional — some Eko APIs require user_code from onboarding. */
  ekoUserCode: (process.env.EKO_USER_CODE || "").trim(),
  ekoDigilockerRedirectUrl:
    process.env.EKO_DIGILOCKER_REDIRECT_URL ||
    `${(process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api/delivery/kyc/digilocker/callback`,
  /** When true, DigiLocker/PAN/bank KYC succeed with fake data (no live Eko calls). */
  ekoMock: process.env.EKO_MOCK === "true"
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

    if (config.otpProvider === "2factor" && config.twofactorOtpChannel !== "sms") {
      missing.push("TWOFACTOR_OTP_CHANNEL must be sms");
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
