import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import sharp from "sharp";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadOnCloudinary = async (
  file,
  folder = "avatars",
  publicId = null,
) => {
  if (!file?.buffer) {
    throw new Error("A file buffer is required for Cloudinary upload");
  }

  const appFolder = process.env.CLOUDINARY_APP_FOLDER;

  if (!appFolder) {
    throw new Error("CLOUDINARY_APP_FOLDER is not configured");
  }

  // Resize image before uploading
  const isAvatar = folder === "avatars";
  const resizedBuffer = await sharp(file.buffer)
    .resize(
      isAvatar
        ? { width: 500, height: 500, fit: "cover", position: "center" }
        : { width: 1280, withoutEnlargement: true },
    )
    .jpeg({ quality: 80 })
    .toBuffer();

  const cloudinaryFolder = `${appFolder.replace(/\/+$/, "")}/${folder}`;

  const uploadOptions = {
    folder: cloudinaryFolder,
    resource_type: "image",
    overwrite: Boolean(publicId),
  };

  if (publicId) {
    uploadOptions.public_id = publicId;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      },
    );

    streamifier.createReadStream(resizedBuffer).pipe(stream);
  });
};
