import multer from "multer";

export const multerMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

export const handleMulterError = (field) => (req, res, next) => {
  multerMiddleware.single(field)(req, res, (err) => {
    if (err) return res.status(400).send({ message: err.message });
    next();
  });
};
