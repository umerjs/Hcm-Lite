import express from "express";
import { UserModel } from "../../models/index.mjs";
import { requireAuth } from "../../middlewares/index.mjs";
import { uploadOnCloudinary } from "../../libs/cloudinary.mjs";
import { handleMulterError } from "../../libs/multer.mjs";
import { AppError, asyncHandler } from "../../utils/errors.mjs";

const router = express.Router();

// All profile routes require auth — applied per-route so unmatched paths fall through to 404
const auth = requireAuth;

// GET /api/v1/profile — own profile
router.get(
  "/profile",
  auth,
  asyncHandler(async (req, res) => {
    const companyId = req.user.companyId;
    let user;
    if (companyId) {
      user = await UserModel.findOne({ _id: req.user._id, companyId });
    }
    if (!user) {
      user = await UserModel.findById(req.user._id);
    }
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return res.status(200).json({ data: user });
  }),
);

// GET /api/v1/profile/:userId — another user's profile (any authenticated user)
router.get(
  "/profile/:userId",
  auth,
  asyncHandler(async (req, res) => {
    const companyId = req.user.companyId;
    let user;
    if (companyId) {
      user = await UserModel.findOne({ _id: req.params.userId, companyId });
    }
    if (!user) {
      user = await UserModel.findById(req.params.userId);
    }
    if (!user || (companyId && user.companyId && String(user.companyId) !== String(companyId))) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    return res.status(200).json({ data: user });
  }),
);

// PUT /api/v1/profile — update own profile
router.put(
  "/profile",
  auth,
  asyncHandler(async (req, res) => {
    const { firstname, lastname, username } = req.body;
    const companyId = req.user.companyId;
    let user;
    if (companyId) {
      user = await UserModel.findOne({ _id: req.user._id, companyId });
    }
    if (!user) {
      user = await UserModel.findById(req.user._id);
    }
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    if (firstname) user.firstname = firstname.trim();
    if (lastname) user.lastname = lastname.trim();

    if (username !== undefined) {
      const trimmed = username?.trim();
      if (!trimmed) throw new AppError(400, "VALIDATION_ERROR", "Username cannot be empty");

      const conflict = await UserModel.findOne({
        username: trimmed,
        _id: { $ne: user._id },
        ...(companyId ? { companyId } : {}),
      });
      if (conflict) throw new AppError(409, "CONFLICT", "Username already taken");

      user.username = trimmed;
    }

    await user.save();
    return res.status(200).json({ message: "Profile updated", data: user });
  }),
);

// PUT /api/v1/profile/avatar — upload avatar to Cloudinary
router.put(
  "/profile/avatar",
  auth,
  handleMulterError("avatar"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw new AppError(400, "VALIDATION_ERROR", "No file uploaded");
    if (!file.mimetype.startsWith("image/"))
      throw new AppError(400, "VALIDATION_ERROR", "Only image files are allowed");

    const companyId = req.user.companyId;
    let user;
    if (companyId) {
      user = await UserModel.findOne({ _id: req.user._id, companyId });
    }
    if (!user) {
      user = await UserModel.findById(req.user._id);
    }
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    const result = await uploadOnCloudinary(file);
    user.profileimg = result.secure_url;
    await user.save();

    return res.status(200).json({ message: "Avatar updated", data: user });
  }),
);

// DELETE /api/v1/profile — delete own account
router.delete(
  "/profile",
  auth,
  asyncHandler(async (req, res) => {
    const companyId = req.user.companyId;
    let user;
    if (companyId) {
      user = await UserModel.findOneAndDelete({ _id: req.user._id, companyId });
    }
    if (!user) {
      user = await UserModel.findByIdAndDelete(req.user._id);
    }
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return res.status(200).json({ message: "Profile deleted" });
  }),
);

export default router;
