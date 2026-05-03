import dotenv from "dotenv";

dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

console.log("ENV CHECK");
console.log("Mongo:", process.env.MONGODB_URI);
console.log("JWT:", process.env.JWT_SECRET);
console.log("Firebase:", !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
console.log("NODE_ENV:", process.env.NODE_ENV);

import app from "./app";
import connectDB from "./config/db";
import { config, validateEnv } from "./config/env";

const startServer = async () => {
  validateEnv();
  await connectDB();

  app.listen(config.port, () => {
    console.log(`Vyaha backend running on port ${config.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start Vyaha backend:", error);
  process.exit(1);
});
