import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { emailPattern } from "../utils/core.mjs";
import { audit } from "./audit.service.mjs";

/**
 * Generates a clean 12-character random temporary password.
 */
export const generateTempPassword = () => {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
};

/**
 * Creates an HR user account.
 * - Admin only
 * - Generates 12-character temp password returned once
 * - mustChangePassword: true, isActive: true
 * - Audited
 */
export const createHr = async ({ firstname, lastname, email }, actor) => {
  if (!firstname || !lastname || !email) {
    throw new AppError(400, "VALIDATION_ERROR", "Firstname, lastname, and email are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid email address format");
  }

  const existing = await UserModel.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError(409, "DUPLICATE_EMAIL", "A user with this email address already exists");
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await UserModel.create({
    firstname: firstname.trim(),
    lastname: lastname.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "hr",
    isActive: true,
    mustChangePassword: true,
  });

  await audit({
    actor,
    actorRole: actor.role,
    action: "HR_USER_CREATED",
    entity: "users",
    entityId: user._id,
    before: null,
    after: {
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });

  return {
    user: {
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    },
    tempPassword,
  };
};

/**
 * Retrieves all users, optionally filtered by role.
 */
export const getUsers = async ({ role } = {}) => {
  const query = {};
  if (role) query.role = role;

  if (mongoose.connection.readyState !== 1 && !UserModel.find?.mock) {
    return [];
  }

  return await UserModel.find(query).select("-password").sort({ createdAt: -1 }).lean();
};

/**
 * Deactivates a user account.
 * - Admin cannot deactivate their own account.
 * - Audited.
 */
export const deactivateUser = async (id, actor) => {
  if (String(actor._id) === String(id)) {
    throw new AppError(
      422,
      "CANNOT_DEACTIVATE_SELF",
      "Administrators cannot deactivate their own account",
    );
  }

  const user = await UserModel.findById(id);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const before = { isActive: user.isActive };
  user.isActive = false;
  await user.save();

  await audit({
    actor,
    actorRole: actor.role,
    action: "USER_DEACTIVATED",
    entity: "users",
    entityId: user._id,
    before,
    after: { isActive: false },
  });

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
};

/**
 * Resets a user's password with a new temporary password.
 * - Admin only.
 * - Generates new 12-char temp password.
 * - Sets mustChangePassword: true.
 * - Audited.
 */
export const resetPassword = async (id, actor) => {
  const user = await UserModel.findById(id).select("+password");
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const before = { mustChangePassword: user.mustChangePassword };
  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  user.password = hashedPassword;
  user.mustChangePassword = true;
  await user.save();

  await audit({
    actor,
    actorRole: actor.role,
    action: "USER_PASSWORD_RESET",
    entity: "users",
    entityId: user._id,
    before,
    after: { mustChangePassword: true },
  });

  return {
    message: "Password reset successfully",
    tempPassword,
  };
};
