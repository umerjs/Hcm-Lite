import express from "express";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as analyticsService from "../../services/analytics.service.mjs";

const router = express.Router();

/**
 * GET /analytics/hr
 * HR and Admin Dashboard metrics.
 */
router.get(
  "/analytics/hr",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const date = req.query.date;
    const metrics = await analyticsService.getHrMetrics(date);
    return res.status(200).json(metrics);
  }),
);

/**
 * GET /analytics/me
 * Employee Dashboard metrics for personal attendance, leave balances, and pending requests.
 */
router.get(
  "/analytics/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      throw new AppError(
        403,
        "NO_EMPLOYEE_PROFILE",
        "No employee profile associated with this account",
      );
    }

    const month = req.query.month;
    const metrics = await analyticsService.getEmployeeMetrics(employeeId, month);
    return res.status(200).json(metrics);
  }),
);

export default router;
