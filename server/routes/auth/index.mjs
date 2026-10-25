import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { UserModel } from "../../models/index.mjs";
import { requireAuth } from "../../middlewares/index.mjs";
import { AppError, asyncHandler } from "../../utils/errors.mjs";
import { emailPattern } from "../../utils/core.mjs";
import { generateToken, registerTenant } from "../../services/auth.service.mjs";

const router = express.Router();

/**
 * Login rate limiter: 10 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, _next) => {
    throw new AppError(
      429,
      "TOO_MANY_REQUESTS",
      "Too many login attempts. Please try again after 15 minutes.",
    );
  },
});

// ── POST /api/v1/auth/register ─────────────────────────────────────────────
// Public tenant registration. Provisions a new company, admin, leave types, and settings.
router.post(
  "/auth/register",
  asyncHandler(async (req, res) => {
    const { companyName, adminName, adminEmail, adminPassword } = req.body;
    const result = await registerTenant({
      companyName,
      adminName,
      adminEmail,
      adminPassword,
    });
    return res.status(201).json(result);
  }),
);

// ── POST /api/v1/auth/login ────────────────────────────────────────────────
// Public. Authenticates user and returns JWT with tenant companyId.
router.post(
  "/auth/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || typeof email !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "Email is required", { email: "Required" });
    }
    if (!password || typeof password !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "Password is required", {
        password: "Required",
      });
    }
    if (!emailPattern.test(email.trim())) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid email address", {
        email: "Invalid format",
      });
    }

    // Must explicitly select password (select:false on model)
    const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select("+password");

    if (!user) {
      // Generic message — do not reveal whether the email exists
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (!user.isActive) {
      throw new AppError(403, "ACCOUNT_INACTIVE", "Your account has been deactivated");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = generateToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        companyId: user.companyId,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword,
        firstname: user.firstname,
        lastname: user.lastname,
      },
    });
  }),
);

// ── POST /api/v1/auth/change-password ──────────────────────────────────────
// Authenticated. Clears mustChangePassword and returns a refreshed token.
router.post(
  "/auth/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Current password and new password are required",
        {
          currentPassword: !currentPassword ? "Required" : undefined,
          newPassword: !newPassword ? "Required" : undefined,
        },
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      throw new AppError(400, "VALIDATION_ERROR", "New password must be at least 8 characters", {
        newPassword: "Must be at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "New password must be different from current password",
        {
          newPassword: "Must be different from current password",
        },
      );
    }

    const user = await UserModel.findById(req.user._id).select("+password");
    if (!user) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }

    const match = await bcrypt.compare(currentPassword, user.password || "");
    if (!match) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      message: "Password changed successfully",
      token,
      user: {
        id: user._id,
        companyId: user.companyId,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword,
        firstname: user.firstname,
        lastname: user.lastname,
      },
    });
  }),
);

export default router;
