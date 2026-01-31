import express from "express";
import cors from "cors";
import menuRoutes from "./routes/menu.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import partnerRoutes from "./routes/partner.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import deliveryRoutes from "./routes/delivery.routes";

const app = express();

// Configure CORS to allow your Expo app AND admin panel
app.use(cors({
  origin: [
    'http://localhost:8081', // For Expo web
    'http://localhost:19006', // For Expo dev server
    'http://localhost:5173', // For Vite dev server (admin panel) - ADD THIS
    'exp://10.3.128.220:8081', // For Expo on your network
    /\.exp\.direct$/, // For Expo direct connections
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Routes
app.use("/api/menu", menuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "NearU backend is running" });
});

export default app;