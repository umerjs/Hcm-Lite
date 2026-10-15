import authRoutes from "./auth/index.mjs";
import profileRoutes from "./profile/index.mjs";
import passwordRoutes from "./password/index.mjs";
import { multerMiddleware } from "../libs/multer.mjs";
export {
  authRoutes,
  profileRoutes,
  passwordRoutes,
  multerMiddleware,
};
