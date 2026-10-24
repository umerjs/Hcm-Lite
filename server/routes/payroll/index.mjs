import express from "express";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import { formatDate } from "../../src/rules/time.mjs";
import { getSettings } from "../../services/settings.service.mjs";
import * as payrollService from "../../services/payroll.service.mjs";
import * as pdfService from "../../services/pdf.service.mjs";

const router = express.Router();

/**
 * GET /payroll/me
 * Authenticated Employee views their own monthly payroll summary.
 */
router.get(
  "/payroll/me",
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

    const month = req.query.month || formatDate(new Date()).slice(0, 7);
    const summary = await payrollService.calculateEmployeePayroll(employeeId, month);

    return res.status(200).json({ data: summary, month });
  }),
);

/**
 * GET /payroll
 * HR and Admin list payroll summaries for all employees for a given month.
 */
router.get(
  "/payroll",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const month = req.query.month || formatDate(new Date()).slice(0, 7);
    const summaries = await payrollService.getMonthlyPayrollSummaries(month);

    return res.status(200).json({ data: summaries, month });
  }),
);

/**
 * GET /payroll/:employeeId/month/:month/pdf
 * Generates and returns the PDF payslip.
 * - HR and Admin can download for any employee.
 * - Employee can download ONLY their own payslip (otherwise 403 FORBIDDEN).
 */
router.get(
  "/payroll/:employeeId/month/:month/pdf",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { employeeId, month } = req.params;

    // RBAC: Employee can view only their own payslip
    if (req.user.role === "employee") {
      if (!req.user.employeeId || String(req.user.employeeId) !== String(employeeId)) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to view this employee's payslip",
        );
      }
    }

    const payrollData = await payrollService.calculateEmployeePayroll(employeeId, month);
    const settings = await getSettings();

    const pdfBuffer = await pdfService.generatePayslipPdf(payrollData, settings);

    const filename = `payslip-${payrollData.employee?.code || employeeId}-${month}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(pdfBuffer);
  }),
);

export default router;
