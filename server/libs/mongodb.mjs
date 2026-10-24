import dotenv from "dotenv";
import mongoose from "mongoose";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = [".env.local", ".env"]
  .map((fileName) => resolve(serverDirectory, fileName))
  .find((filePath) => existsSync(filePath));

if (envPath) {
  dotenv.config({ path: envPath });
}

const uri = process.env.MONGODB_URI;

export const connect_db = async () => {
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.DB_NAME || "hcm-lite",
    });

    console.log("Mongoose connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};
