import express from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models/index.mjs";
import { requireAuth } from "../../middlewares/index.mjs";
import { AppError, asyncHandler } from "../../utils/errors.mjs";

const router = express.Router();

// PUT /api/v1/password — change password for the authenticated user.
// mustChangePassword users are allowed here (they need this route to unblock themselves).
router.put(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(400, "VALIDATION_ERROR", "currentPassword and newPassword are required", {
        currentPassword: !currentPassword ? "Required" : undefined,
        newPassword: !newPassword ? "Required" : undefined,
      });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      throw new AppError(400, "VALIDATION_ERROR", "New password must be at least 8 characters", {
        newPassword: "Too short",
      });
    }

    // Re-fetch user with password for comparison
    const user = await UserModel.findById(req.user._id).select("+password");
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  }),
);

export default router;
