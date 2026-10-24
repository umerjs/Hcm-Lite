import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as leaveService from "../../services/leave.service.mjs";

const router = express.Router();

// ── Validation Schemas ────────────────────────────────────────────────────────

const applyLeaveSchema = z.object({
  type: z.enum(["annual", "sick", "casual", "unpaid"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  reason: z.string().min(1, "Reason is required"),
});

const decisionSchema = z.object({
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

// ── Leave Routes ─────────────────────────────────────────────────────────────

/**
 * POST /leave
 * Applies for a leave request.
 */
router.post(
  "/leave",
  requireAuth,
  validateBody(applyLeaveSchema),
  asyncHandler(async (req, res) => {
    const leave = await leaveService.applyLeave(req.user, req.validatedBody);
    return res.status(201).json({
      message: "Leave application submitted",
      data: leave,
    });
  }),
);

/**
 * GET /leave/balance
 * Returns the current year's leave balance, used, and pending days.
 */
router.get(
  "/leave/balance",
  requireAuth,
  asyncHandler(async (req, res) => {
    const year = req.query.year;
    const balance = await leaveService.getBalance(req.user, year);
    return res.status(200).json({ data: balance });
  }),
);

/**
 * GET /leave
 * Lists leave requests (scoped to employee for Employee role, all with filters for HR/Admin).
 */
router.get(
  "/leave",
  requireAuth,
  asyncHandler(async (req, res) => {
    const leaves = await leaveService.getLeaves(req.user, req.query);
    return res.status(200).json({ data: leaves });
  }),
);

/**
 * GET /leave/:id
 * Retrieves a single leave request (scoped: Employees can only view their own).
 */
router.get(
  "/leave/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const leave = await leaveService.getLeaveById(req.user, req.params.id);
    return res.status(200).json({ data: leave });
  }),
);

/**
 * PATCH /leave/:id/cancel
 * Cancels an employee's own pending or future-approved leave request.
 */
router.patch(
  "/leave/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const leave = await leaveService.cancelLeave(req.user, req.params.id);
    return res.status(200).json({
      message: "Leave request cancelled",
      data: leave,
    });
  }),
);

/**
 * PATCH /leave/:id/decision
 * HR decides on a leave request (HR only; Admin read-only).
 */
router.patch(
  "/leave/:id/decision",
  requireAuth,
  requireRole("hr"),
  validateBody(decisionSchema),
  asyncHandler(async (req, res) => {
    const leave = await leaveService.decideLeave(req.user, req.params.id, req.validatedBody);
    return res.status(200).json({
      message: `Leave request ${req.validatedBody.status}`,
      data: leave,
    });
  }),
);

export default router;
