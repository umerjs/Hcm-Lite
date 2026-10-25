import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as orgService from "../../services/organization.service.mjs";

const router = express.Router();

const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
});

const designationSchema = z.object({
  name: z.string().min(1, "Designation name is required"),
  departmentId: z.string().nullable().optional(),
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

// ── Department Routes ───────────────────────────────────────────────────────

router.get(
  "/departments",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const departments = await orgService.getDepartments(req.user.companyId);
    return res.status(200).json({ data: departments });
  }),
);

router.get(
  "/departments/:id",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const department = await orgService.getDepartmentById(req.params.id, req.user);
    return res.status(200).json({ data: department });
  }),
);

router.post(
  "/departments",
  requireAuth,
  requireRole("admin"),
  validateBody(departmentSchema),
  asyncHandler(async (req, res) => {
    const department = await orgService.createDepartment(req.validatedBody, req.user);
    return res.status(201).json({ message: "Department created", data: department });
  }),
);

router.patch(
  "/departments/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(departmentSchema),
  asyncHandler(async (req, res) => {
    const department = await orgService.updateDepartment(
      req.params.id,
      req.validatedBody,
      req.user,
    );
    return res.status(200).json({ message: "Department updated", data: department });
  }),
);

router.delete(
  "/departments/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await orgService.deleteDepartment(req.params.id, req.user);
    return res.status(200).json(result);
  }),
);

// ── Designation Routes ──────────────────────────────────────────────────────

router.get(
  "/designations",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const designations = await orgService.getDesignations(req.query, req.user);
    return res.status(200).json({ data: designations });
  }),
);

router.get(
  "/designations/:id",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const designation = await orgService.getDesignationById(req.params.id, req.user);
    return res.status(200).json({ data: designation });
  }),
);

router.post(
  "/designations",
  requireAuth,
  requireRole("admin"),
  validateBody(designationSchema),
  asyncHandler(async (req, res) => {
    const designation = await orgService.createDesignation(req.validatedBody, req.user);
    return res.status(201).json({ message: "Designation created", data: designation });
  }),
);

router.patch(
  "/designations/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(designationSchema),
  asyncHandler(async (req, res) => {
    const designation = await orgService.updateDesignation(
      req.params.id,
      req.validatedBody,
      req.user,
    );
    return res.status(200).json({ message: "Designation updated", data: designation });
  }),
);

router.delete(
  "/designations/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await orgService.deleteDesignation(req.params.id, req.user);
    return res.status(200).json(result);
  }),
);

export default router;
