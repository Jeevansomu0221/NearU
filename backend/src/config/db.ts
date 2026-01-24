import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/nearu";
    
    const conn = await mongoose.connect(mongoURI);
    
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