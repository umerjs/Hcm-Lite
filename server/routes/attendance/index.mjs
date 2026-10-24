import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as attendanceService from "../../services/attendance.service.mjs";

const router = express.Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM")
    .optional(),
});

const boardQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
  departmentId: z.string().optional(),
});

const validateQuery = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "query";
      fields[key] = issue.message;
    }
    throw new AppError(400, "VALIDATION_ERROR", "Invalid query parameters", fields);
  }
  req.validatedQuery = result.data;
  next();
};

// ── Employee Attendance Routes ────────────────────────────────────────────────
// Identity is strictly derived from req.user.employeeId (or req.user._id)

/**
 * POST /attendance/check-in
 * Employee checks in for today.
 */
router.post(
  "/attendance/check-in",
  requireAuth,
  asyncHandler(async (req, res) => {
    const record = await attendanceService.checkIn(req.user);
    return res.status(201).json({
      message: "Checked in successfully",
      data: record,
    });
  }),
);

/**
 * POST /attendance/check-out
 * Employee checks out for today.
 */
router.post(
  "/attendance/check-out",
  requireAuth,
  asyncHandler(async (req, res) => {
    const record = await attendanceService.checkOut(req.user);
    return res.status(200).json({
      message: "Checked out successfully",
      data: record,
    });
  }),
);

/**
 * GET /attendance/me?month=YYYY-MM
 * Employee's monthly attendance calendar and statuses.
 */
router.get(
  "/attendance/me",
  requireAuth,
  validateQuery(monthQuerySchema),
  asyncHandler(async (req, res) => {
    const { month } = req.validatedQuery;
    const data = await attendanceService.getMyMonth(req.user, month);
    return res.status(200).json({ data });
  }),
);

// ── HR & Admin Attendance Routes ──────────────────────────────────────────────

/**
 * GET /attendance/board?date=YYYY-MM-DD&departmentId=...
 * Daily attendance board across company or department.
 */
router.get(
  "/attendance/board",
  requireAuth,
  requireRole("admin", "hr"),
  validateQuery(boardQuerySchema),
  asyncHandler(async (req, res) => {
    const { date, departmentId } = req.validatedQuery;
    const board = await attendanceService.getBoard(date, departmentId);
    return res.status(200).json({ data: board });
  }),
);

/**
 * GET /attendance/employee/:id?month=YYYY-MM
 * HR/Admin view of an employee's monthly attendance calendar.
 */
router.get(
  "/attendance/employee/:id",
  requireAuth,
  requireRole("admin", "hr"),
  validateQuery(monthQuerySchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { month } = req.validatedQuery;
    const data = await attendanceService.getEmployeeMonth(id, month);
    return res.status(200).json({ data });
  }),
);

export default router;
