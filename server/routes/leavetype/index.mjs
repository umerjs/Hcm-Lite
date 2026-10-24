import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as leavetypeService from "../../services/leavetype.service.mjs";

const router = express.Router();

const updateQuotaSchema = z.object({
  yearlyQuota: z.number().int().min(0).nullable(),
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
 * GET /leave-types
 * Accessible to Admin, HR, and Employee.
 */
router.get(
  "/leave-types",
  requireAuth,
  requireRole("admin", "hr", "employee"),
  asyncHandler(async (_req, res) => {
    const leaveTypes = await leavetypeService.getAllLeaveTypes();
    return res.status(200).json({ data: leaveTypes });
  }),
);

/**
 * PUT /leave-types/:key
 * Admin updates yearlyQuota for a leave type.
 */
router.put(
  "/leave-types/:key",
  requireAuth,
  requireRole("admin"),
  validateBody(updateQuotaSchema),
  asyncHandler(async (req, res) => {
    const updated = await leavetypeService.updateLeaveTypeQuota(
      req.params.key,
      req.validatedBody.yearlyQuota,
      req.user,
    );
    return res.status(200).json({ message: "Leave type quota updated", data: updated });
  }),
);

export default router;
