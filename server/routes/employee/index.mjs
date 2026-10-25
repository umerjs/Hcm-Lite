import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import { emailPattern } from "../../utils/core.mjs";
import * as employeeService from "../../services/employee.service.mjs";

const router = express.Router();

// ── Validation Schemas ────────────────────────────────────────────────────────

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Employee name is required"),
  email: z.string().regex(emailPattern, "Invalid email address format"),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  departmentId: z.string().min(1, "Department ID is required"),
  designationId: z.string().min(1, "Designation ID is required"),
  joinDate: z.string().min(1, "Join date is required"),
  basicSalary: z.number().positive("Basic salary must be greater than 0"),
  code: z.string().optional(),
  status: z.enum(["active", "probation"]).optional(),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  joinDate: z.string().optional(),
  exitDate: z.string().nullable().optional(),
  status: z.enum(["active", "probation", "exited"]).optional(),
});

const updateSalarySchema = z.object({
  basicSalary: z.number().positive("Basic salary must be greater than 0"),
});

// Strict schema for employee self-profile update: strictly phone and address only
const updateMyProfileSchema = z
  .object({
    phone: z.string().optional(),
    address: z.string().optional(),
  })
  .strict();

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

// ── Employee Self Profile ─────────────────────────────────────────────────────

/**
 * PATCH /me/profile
 * Employee updates own phone and address only.
 * Rejects unknown fields with 400 VALIDATION_ERROR.
 */
router.patch(
  "/me/profile",
  requireAuth,
  validateBody(updateMyProfileSchema),
  asyncHandler(async (req, res) => {
    const result = await employeeService.updateMyProfile(req.user, req.validatedBody);
    return res.status(200).json(result);
  }),
);

// ── Employee CRUD Routes ─────────────────────────────────────────────────────

/**
 * POST /employees
 * HR creates an employee and matching login.
 */
router.post(
  "/employees",
  requireAuth,
  requireRole("hr"),
  validateBody(createEmployeeSchema),
  asyncHandler(async (req, res) => {
    const result = await employeeService.createEmployee(req.validatedBody, req.user);
    return res.status(201).json({
      message: "Employee registered successfully",
      ...result,
    });
  }),
);

/**
 * GET /employees
 * Admin and HR list employees with pagination, search, and filters.
 */
router.get(
  "/employees",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const result = await employeeService.getEmployees(req.query, req.user);
    return res.status(200).json(result);
  }),
);

/**
 * GET /employees/:id
 * Admin and HR view any employee.
 * Employee views ONLY own record (otherwise 403).
 */
router.get(
  "/employees/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const employee = await employeeService.getEmployeeById(req.params.id, req.user);
    return res.status(200).json({ data: employee });
  }),
);

/**
 * PATCH /employees/:id
 * HR updates employee details.
 */
router.patch(
  "/employees/:id",
  requireAuth,
  requireRole("hr"),
  validateBody(updateEmployeeSchema),
  asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployee(
      req.params.id,
      req.validatedBody,
      req.user,
    );
    return res.status(200).json({ message: "Employee updated successfully", data: employee });
  }),
);

/**
 * PUT /employees/:id/salary
 * HR updates employee basicSalary.
 */
router.put(
  "/employees/:id/salary",
  requireAuth,
  requireRole("hr"),
  validateBody(updateSalarySchema),
  asyncHandler(async (req, res) => {
    const result = await employeeService.updateSalary(
      req.params.id,
      req.validatedBody.basicSalary,
      req.user,
    );
    return res.status(200).json(result);
  }),
);

export default router;
