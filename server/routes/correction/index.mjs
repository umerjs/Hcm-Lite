import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as correctionService from "../../services/correction.service.mjs";

const router = express.Router();

// ── Validation Schemas ────────────────────────────────────────────────────────

const applyCorrectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  requestedCheckIn: z.string().optional(),
  requestedCheckOut: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
});

const decideCorrectionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  comment: z.string().optional(),
});

const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      fields[key] = issue.message;
    }
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request body", fields);
  }
  req.validatedBody = result.data;
  next();
};

// ── Correction Routes ────────────────────────────────────────────────────────

/**
 * POST /corrections
 * Employee applies for an attendance correction.
 */
router.post(
  "/corrections",
  requireAuth,
  validateBody(applyCorrectionSchema),
  asyncHandler(async (req, res) => {
    const correction = await correctionService.applyCorrection(req.user, req.validatedBody);
    return res.status(201).json({
      message: "Correction request submitted",
      data: correction,
    });
  }),
);

/**
 * GET /corrections
 * Lists correction requests (scoped to own for Employee, all for HR/Admin).
 */
router.get(
  "/corrections",
  requireAuth,
  asyncHandler(async (req, res) => {
    const corrections = await correctionService.getCorrections(req.user, req.query);
    return res.status(200).json({ data: corrections });
  }),
);

/**
 * PATCH /corrections/:id
 * HR approves or rejects an attendance correction.
 */
router.patch(
  "/corrections/:id",
  requireAuth,
  requireRole("hr"),
  validateBody(decideCorrectionSchema),
  asyncHandler(async (req, res) => {
    const correction = await correctionService.decideCorrection(
      req.user,
      req.params.id,
      req.validatedBody,
    );
    return res.status(200).json({
      message: `Correction request ${req.validatedBody.status}`,
      data: correction,
    });
  }),
);

export default router;
