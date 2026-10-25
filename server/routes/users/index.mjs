import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import { emailPattern } from "../../utils/core.mjs";
import * as userService from "../../services/user.service.mjs";

const router = express.Router();

const createHrSchema = z.object({
  firstname: z.string().min(1, "Firstname is required"),
  lastname: z.string().min(1, "Lastname is required"),
  email: z.string().regex(emailPattern, "Invalid email address format"),
});

const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      fields[key] = issue.message;
    }
    throw new AppError(400, "VALIDATION_ERROR", "Validation failed", fields);
  }
  req.validatedBody = result.data;
  next();
};

/**
 * POST /users/hr
 * Admin creates an HR user account.
 */
router.post(
  "/users/hr",
  requireAuth,
  requireRole("admin"),
  validateBody(createHrSchema),
  asyncHandler(async (req, res) => {
    const result = await userService.createHr(req.validatedBody, req.user);
    return res.status(201).json(result);
  }),
);

/**
 * GET /users?role
 * Admin views users list.
 */
router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const users = await userService.getUsers(req.query, req.user);
    return res.status(200).json({ data: users });
  }),
);

/**
 * PATCH /users/:id/deactivate
 * Admin deactivates a user account (cannot deactivate self).
 */
router.patch(
  "/users/:id/deactivate",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const user = await userService.deactivateUser(req.params.id, req.user);
    return res.status(200).json({ message: "User account deactivated", user });
  }),
);

/**
 * POST /users/:id/reset-password
 * Admin resets a user's password with a new temporary password.
 */
router.post(
  "/users/:id/reset-password",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await userService.resetPassword(req.params.id, req.user);
    return res.status(200).json(result);
  }),
);

export default router;
