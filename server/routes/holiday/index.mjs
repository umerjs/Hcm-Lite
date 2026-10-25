import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as holidayService from "../../services/holiday.service.mjs";

const router = express.Router();

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date format"),
  name: z.string().min(1, "Holiday name is required"),
});

const updateHolidaySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date format")
    .optional(),
  name: z.string().min(1, "Holiday name is required").optional(),
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

router.get(
  "/holidays",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const holidays = await holidayService.getHolidays(req.query, req.user);
    return res.status(200).json({ data: holidays });
  }),
);

router.get(
  "/holidays/:id",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const holiday = await holidayService.getHolidayById(req.params.id, req.user);
    return res.status(200).json({ data: holiday });
  }),
);

router.post(
  "/holidays",
  requireAuth,
  requireRole("admin"),
  validateBody(holidaySchema),
  asyncHandler(async (req, res) => {
    const holiday = await holidayService.createHoliday(req.validatedBody, req.user);
    return res.status(201).json({ message: "Holiday created", data: holiday });
  }),
);

router.patch(
  "/holidays/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(updateHolidaySchema),
  asyncHandler(async (req, res) => {
    const holiday = await holidayService.updateHoliday(req.params.id, req.validatedBody, req.user);
    return res.status(200).json({ message: "Holiday updated", data: holiday });
  }),
);

router.delete(
  "/holidays/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await holidayService.deleteHoliday(req.params.id, req.user);
    return res.status(200).json(result);
  }),
);

export default router;
