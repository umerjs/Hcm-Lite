import express from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import { emailPattern } from "../../utils/core.mjs";
import * as setupService from "../../services/setup.service.mjs";

const router = express.Router();

const setupSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().regex(emailPattern, "Invalid email address"),
  adminPassword: z.string().min(6, "Admin password must be at least 6 characters"),
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
 * GET /setup/status
 * Public status check returning whether application requires first-run setup.
 */
router.get(
  "/setup/status",
  asyncHandler(async (_req, res) => {
    const status = await setupService.getSetupStatus();
    return res.status(200).json(status);
  }),
);

/**
 * POST /setup
 * Public first-run setup endpoint. Only executes when no administrator exists.
 */
router.post(
  "/setup",
  validateBody(setupSchema),
  asyncHandler(async (req, res) => {
    const result = await setupService.performSetup(req.validatedBody);
    return res.status(201).json(result);
  }),
);

export default router;
