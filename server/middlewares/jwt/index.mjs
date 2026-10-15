import jwt from "jsonwebtoken";
import { UserModel } from "../../models/index.mjs";

export const authGuard = async (req, res, next) => {
  try {
    //1. take out token from Authorization header (authorizedtoken)
    const token = req.headers.authorizedtoken;

    //2. if no token is there
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found",
      });
    }

    //3. verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
          expiredAt: error.expiredAt,
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }
      throw error;
    }

    //4. ensure decoded id exists
    if (!decoded._id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    //5. find the user by id and attach user object to req
    const current_user = await UserModel.findOne({ _id: decoded._id });

    //6. if user not found
    if (!current_user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.current_user = current_user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};
