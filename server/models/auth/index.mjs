import mongoose from "mongoose";
import { emailPattern } from "../../utils/core.mjs";

const UserSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
      trim: true,
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      match: [emailPattern, "Please enter a valid email"],
    },
    // select:false — never returned in queries unless explicitly .select("+password")
    password: {
      type: String,
      required: true,
      select: false,
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // optional for HCM users created by HR
    },
    profileimg: {
      type: String,
      trim: true,
      default: null,
    },
    // ── HCM Lite additions ──────────────────────────────────────────────────
    role: {
      type: String,
      enum: ["admin", "hr", "employee"],
      default: "employee",
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employees",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model("users", UserSchema);
