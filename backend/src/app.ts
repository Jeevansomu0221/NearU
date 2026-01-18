import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import partnerRoutes from "./routes/partner.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

export default app;
