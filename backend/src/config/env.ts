import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  
  // Database
  mongodbURI: process.env.MONGODB_URI || "mongodb://localhost:27017/nearu",
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || "nearu-secret-key-change-in-production",
  jwtExpiry: process.env.JWT_EXPIRY || "7d",
  
  // OTP Service
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10"),
  
  // App URLs
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",
  
  // External Services
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  
  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
};

// Validate required environment variables
export const validateEnv = (): void => {
  const required = ["JWT_SECRET"];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
};