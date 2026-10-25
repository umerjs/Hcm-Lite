import jwt from "jsonwebtoken";
import { UserModel } from "../../models/index.mjs";
import { AppError, asyncHandler } from "../../utils/errors.mjs";

/**
 * requireAuth — verifies the JWT from "Authorization: Bearer <token>".
 * Rejects inactive users.
 * Sets req.user = { _id, email, role, employeeId, isActive, mustChangePassword }.
 *
 * Routes that only need authentication (not a specific role) use this alone.
 * The change-password route is exempt from the mustChangePassword block
 * so users can actually change their password.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "No token provided");
  }
  const token = authHeader.slice(7);

  // 2. Verify the token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError(401, "TOKEN_EXPIRED", "Token has expired");
    }
    throw new AppError(401, "INVALID_TOKEN", "Invalid token");
  }

  const userId = decoded._id || decoded.id;
  if (!userId) {
    throw new AppError(401, "INVALID_TOKEN", "Invalid token payload");
  }

  // Enforce tenant scoping: companyId is required in token payload
  if (!decoded.companyId) {
    throw new AppError(401, "UNAUTHENTICATED", "Token missing tenant context (companyId)");
  }

  // 3. Load user (password intentionally excluded)
  const user = await UserModel.findById(userId).select(
    "_id email role employeeId isActive mustChangePassword companyId",
  );

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "User not found");
  }

  // 4. Reject deactivated users
  if (!user.isActive) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "Your account has been deactivated");
  }

  req.user = user;
  req.user.companyId = user.companyId || decoded.companyId;
  req.companyId = req.user.companyId;

  if (!req.user.companyId) {
    throw new AppError(401, "UNAUTHENTICATED", "User has no tenant association");
  }

  next();
});

/**
 * requireRole(...roles) — call after requireAuth.
 * Blocks mustChangePassword users from every route EXCEPT change-password.
 * Also enforces role membership.
 *
 * Usage: router.get("/admin/thing", requireAuth, requireRole("admin"), handler)
 */
export const requireRole = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
    }

    // Block users who must change their password (except on the change-password route itself)
    if (req.user.mustChangePassword && req.path !== "/change-password") {
      throw new AppError(
        403,
        "MUST_CHANGE_PASSWORD",
        "You must change your password before continuing",
      );
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action");
    }

    next();
  });

// Keep the old name as an alias so existing imports don't break during migration.
// Remove after all routes are updated to requireAuth.
export const authGuard = requireAuth;
