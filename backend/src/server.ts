import dotenv from "dotenv";
dotenv.config(); // 👈 THIS LINE IS MANDATORY

import app from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
  console.log(`NearU backend running on port ${PORT}`);
});
