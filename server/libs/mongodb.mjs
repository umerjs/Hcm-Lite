import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

export const connect_db = async () => {
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  try {
    await mongoose.connect(uri, {
      dbName: "mongodb-auth-crud",
    });

    console.log("Mongoose connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};
