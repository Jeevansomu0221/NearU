require('dns').setDefaultResultOrder('ipv4first');

import dotenv from "dotenv";

dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

import app from "./app";
import connectDB from "./config/db";
import { config, validateEnv } from "./config/env";
import { cancelStaleUnacceptedOrders } from "./controllers/order.controller";

const AUTO_CANCEL_SWEEP_INTERVAL_MS = 60 * 1000;

const startServer = async () => {
  validateEnv();
  await connectDB();

  await cancelStaleUnacceptedOrders();
  setInterval(() => {
    void cancelStaleUnacceptedOrders();
  }, AUTO_CANCEL_SWEEP_INTERVAL_MS);

  app.listen(config.port, () => {
    console.log(`Vyaha backend running on port ${config.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start Vyaha backend:", error);
  process.exit(1);
});
