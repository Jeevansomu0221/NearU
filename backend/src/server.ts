import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import connectDB from "./config/db";
import { config, validateEnv } from "./config/env";

const startServer = async () => {
  validateEnv();
  await connectDB();

  app.listen(config.port, () => {
    console.log(`NearU backend running on port ${config.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start NearU backend:", error);
  process.exit(1);
});
