import mongoose from "mongoose";
import { emailPattern } from "../../utils/core.mjs";

const UserSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
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

// Compound unique indexes per company
UserSchema.index({ companyId: 1, email: 1 }, { unique: true });
UserSchema.index({ companyId: 1, username: 1 }, { unique: true, sparse: true });

export const UserModel = mongoose.model("users", UserSchema);
