import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isLocalMongoUri = (mongoURI: string) => {
  return mongoURI.includes("127.0.0.1") || mongoURI.includes("localhost");
};

const startLocalMongoForDev = async () => {
  const mongodPath =
    process.env.MONGOD_PATH || "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe";
  const dbPath = process.env.MONGO_DBPATH || path.resolve(process.cwd(), ".mongo-data");

  if (!fs.existsSync(mongodPath)) {
    console.warn(`MongoDB executable not found at ${mongodPath}`);
    return;
  }

  fs.mkdirSync(dbPath, { recursive: true });
  console.log(`Starting local MongoDB for development at ${dbPath}...`);

  const child = spawn(mongodPath, ["--dbpath", dbPath, "--port", "27017", "--bind_ip", "127.0.0.1"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });

  child.unref();
  await sleep(2500);
};

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nearu";
    
    let conn;
    try {
      conn = await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    } catch (error: any) {
      if (isLocalMongoUri(mongoURI) && error?.message?.includes("ECONNREFUSED")) {
        await startLocalMongoForDev();
        conn = await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
      } else {
        throw error;
      }
    }
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Connection events
    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
