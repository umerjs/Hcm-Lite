import express from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models/index.mjs";
import { authGuard } from "../../middlewares/index.mjs";

const router = express.Router();

router.put("/password", authGuard, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).send({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).send({
        message: "New password must be at least 6 characters",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      req.current_user.password,
    );

    if (!isPasswordValid) {
      return res.status(400).send({
        message: "Invalid current password",
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await UserModel.findByIdAndUpdate(req.current_user._id, {
      password: newPasswordHash,
    });

    return res.status(200).send({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
