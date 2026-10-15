import express from "express";
import { UserModel } from "../../models/index.mjs";
import { authGuard } from "../../middlewares/index.mjs";
import { uploadOnCloudinary } from "../../libs/cloudinary.mjs";
import { multerMiddleware, handleMulterError } from "../../libs/multer.mjs";

const router = express.Router();

router.use(authGuard);

// GET PROFILE
router.get("/profile", async (req, res) => {
  try {
    return res.status(200).send({
      message: "Profile Fetched",
      data: req.current_user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Avatar upload failed",
      error: error.message,
    });
  }
});
router.get("/profile/:userId", async (req, res) => {
  try {
    const userId = req.params.userId || req.current_user._id;
    const user = await UserModel.findById({ _id: userId });

    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    return res.status(200).send({
      message: "Other Profile Fetched",
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Avatar upload failed",
      error: error.message,
    });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const { firstname, lastname, username } = req.body;
    const user = await UserModel.findById(req.current_user._id);

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;

    if (username !== undefined) {
      const trimmedUsername = username?.trim();

      if (!trimmedUsername) {
        return res.status(400).send({ message: "Username cannot be empty" });
      }

      const existingUsername = await UserModel.findOne({
        username: trimmedUsername,
        _id: { $ne: user._id },
      });

      if (existingUsername) {
        return res.status(400).send({ message: "Username already taken" });
      }

      user.username = trimmedUsername;
    }

    await user.save();

    return res.status(200).send({ message: "Profile Updated", data: user });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});
// UPDATE AVATAR
router.put(
  "/profile/avatar",
  handleMulterError("avatar"),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).send({
          message: "No file uploaded",
        });
      }

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).send({
          message: "Only images are allowed",
        });
      }

      const user = await UserModel.findById(req.current_user._id);

      if (!user) {
        return res.status(404).send({
          message: "User not found",
        });
      }

      const result = await uploadOnCloudinary(file);

      user.profileimg = result.secure_url;

      await user.save();

      return res.status(200).send({
        message: "Avatar Updated",
        data: user,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).send({
        message: "Internal Server Error",
      });
    }
  },
);
router.delete("/profile", async (req, res) => {
  try {
    const user = await UserModel.findById({ _id: req.current_user._id });

    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    await UserModel.findByIdAndDelete(req.current_user._id);

    return res.status(200).send({
      message: "Profile deleted",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
