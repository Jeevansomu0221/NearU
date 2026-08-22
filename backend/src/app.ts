import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";
import menuRoutes from "./routes/menu.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import partnerRoutes from "./routes/partner.routes";
import partnerStaffRoutes from "./routes/partnerStaff.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import deliveryRoutes from "./routes/delivery.routes";
import uploadRoutes from "./routes/upload.routes";
import paymentRoutes from "./routes/payment.routes";
import legalRoutes from "./routes/legal.routes";
import supportRoutes from "./routes/support.routes";
import notificationRoutes from "./routes/notification.routes";
import { config } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { getEkoRuntimeConfig, probeEkoDigiLocker, probeEkoSettlementBalance } from "./services/eko.service";
import { getFirebaseApp } from "./services/firebaseAuth.service";

const app = express();
const allowAllOrigins = !config.isProduction && config.corsOrigins.length === 0;
const allowConfiguredWildcardOrigin = config.corsOrigins.includes("*");

app.set("trust proxy", 1);

const isLocalDevelopmentOrigin = (origin: string) => {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (
      allowAllOrigins ||
      allowConfiguredWildcardOrigin ||
      !origin ||
      config.corsOrigins.includes(origin) ||
      (!config.isProduction && isLocalDevelopmentOrigin(origin))
    ) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));

app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Public notification large-icons for FCM imageUrl (must be reachable by devices).
app.use(
  "/notification-icons",
  express.static(path.join(__dirname, "../public/notification-icons"), {
    maxAge: "7d",
    fallthrough: false
  })
);

app.use((req, res, next) => {
  if (req.path === "/api/payment/webhook") {
    return express.raw({ type: "application/json", limit: config.requestBodyLimit })(req, res, next);
  }

  return express.json({ limit: config.requestBodyLimit })(req, res, next);
});

app.use(rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path.startsWith("/notification-icons/") ||
    req.path === "/api/auth/send-otp" ||
    req.path === "/api/auth/verify-otp" ||
    req.path === "/api/auth/admin-password-login"
}));

app.use("/api/menu", menuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/partner-staff", partnerStaffRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/legal", legalRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Vyaha backend is running" });
});

// Key IDs are public (sent to apps). Helps confirm which Razorpay MID is live.
app.get("/health/razorpay", (_req, res) => {
  const keyId = config.razorpayKeyId || "";
  res.json({
    status: keyId ? "ok" : "missing",
    keyId,
    payeeName: config.platformUpiPayeeName || "",
    expectedKeyId: "rzp_live_TMrGfC1MZ7Pmqy",
    usingExpectedKey: keyId === "rzp_live_TMrGfC1MZ7Pmqy"
  });
});

app.get("/health/firebase", (_req, res) => {
  try {
    const firebaseApp = getFirebaseApp();
    const credentialSource = config.firebaseServiceAccountJson
      ? "env_json"
      : config.firebaseServiceAccountPath
        ? "env_path"
        : "file_or_adc";

    res.json({
      status: "ok",
      projectId: firebaseApp.options.projectId || config.firebaseProjectId || "",
      credentialSource
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error?.message || "Firebase Admin is not configured",
      projectId: config.firebaseProjectId || "",
      hasServiceAccountJson: Boolean(config.firebaseServiceAccountJson),
      hasServiceAccountPath: Boolean(config.firebaseServiceAccountPath)
    });
  }
});

app.get("/health/eko", async (_req, res) => {
  try {
    const [balance, digilocker] = await Promise.all([
      probeEkoSettlementBalance(),
      probeEkoDigiLocker()
    ]);
    res.json({
      status: balance.ok || digilocker.ok ? "ok" : "error",
      eko: getEkoRuntimeConfig(),
      probe: { balance, digilocker }
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error?.message || "Eko probe failed",
      eko: getEkoRuntimeConfig()
    });
  }
});

app.use(errorMiddleware);

export default app;
