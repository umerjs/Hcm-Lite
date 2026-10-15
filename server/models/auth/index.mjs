import mongoose from "mongoose";
import { emailPattern, passwordPattern } from "../../utils/core.mjs";

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
      match: [emailPattern, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: true,
      trim: true,
      match: [passwordPattern, "Please enter a valid Password"],
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    profileimg: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true },
);
export const UserModel = mongoose.model("users", UserSchema);
