describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("rejects wildcard CORS origins in production", () => {
    process.env.NODE_ENV = "production";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.JWT_SECRET = "test-secret";
    process.env.CORS_ORIGINS = "*";
    process.env.OTP_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.ADMIN_PANEL_PHONE = "9999999999";
    process.env.ADMIN_PANEL_PASSWORD = "strong-password";
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret";
    process.env.CLOUDINARY_CLOUD_NAME = "cloud";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";

    const { validateEnv } = require("./env");

    expect(() => validateEnv()).toThrow("CORS_ORIGINS must not contain * in production");
  });
});
