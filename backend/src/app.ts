import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import menuRoutes from "./routes/menu.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import partnerRoutes from "./routes/partner.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import deliveryRoutes from "./routes/delivery.routes";
import uploadRoutes from "./routes/upload.routes";
import paymentRoutes from "./routes/payment.routes";
import { config } from "./config/env";

const app = express();
const allowAllOrigins = !config.isProduction && config.corsOrigins.length === 0;
const allowConfiguredWildcardOrigin = config.corsOrigins.includes("*");

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
      isLocalDevelopmentOrigin(origin)
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

app.use(rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use((req, res, next) => {
  if (req.path === "/api/payment/webhook") {
    return express.raw({ type: "application/json", limit: config.requestBodyLimit })(req, res, next);
  }

  return express.json({ limit: config.requestBodyLimit })(req, res, next);
});

app.use("/api/menu", menuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Vyaha backend is running", env: config.nodeEnv });
});

export default app;
