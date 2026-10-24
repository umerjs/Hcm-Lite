import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as settingsService from "../../services/settings.service.mjs";

const router = express.Router();

const VALID_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeFormatRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

const isValidIanaTimezone = (tz) => {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
};

const updateSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name cannot be empty").optional(),
  timezone: z
    .string()
    .refine(isValidIanaTimezone, "Must be a valid IANA timezone (e.g. Asia/Karachi)")
    .optional(),
  officeStart: z
    .string()
    .regex(timeFormatRegex, "officeStart must be in HH:mm format (00:00 - 23:59)")
    .optional(),
  graceMinutes: z
    .number()
    .min(0, "graceMinutes must be between 0 and 120")
    .max(120, "graceMinutes must be between 0 and 120")
    .optional(),
  halfDayHours: z
    .number()
    .min(1, "halfDayHours must be between 1 and 12")
    .max(12, "halfDayHours must be between 1 and 12")
    .optional(),
  weekend: z
    .array(z.enum(VALID_WEEKDAYS))
    .min(1, "weekend must be a non-empty subset of Mon..Sun")
    .optional(),
  officeLat: z.number().min(-90).max(90).nullable().optional(),
  officeLng: z.number().min(-180).max(180).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  radiusMeters: z
    .number()
    .min(10, "radiusMeters must be between 10 and 5000")
    .max(5000, "radiusMeters must be between 10 and 5000")
    .optional(),
  latePenaltyEnabled: z.boolean().optional(),
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
 * GET /settings
 * Admin and HR can read company settings.
 */
router.get(
  "/settings",
  requireAuth,
  requireRole("admin", "hr"),
  asyncHandler(async (_req, res) => {
    const settings = await settingsService.getSettings();
    return res.status(200).json({ settings, data: settings });
  }),
);

/**
 * PUT /settings
 * Only Admin can update company settings. Audited.
 */
router.put(
  "/settings",
  requireAuth,
  requireRole("admin"),
  validateBody(updateSettingsSchema),
  asyncHandler(async (req, res) => {
    const payload = { ...req.validatedBody };
    if (payload.lat !== undefined && payload.officeLat === undefined) {
      payload.officeLat = payload.lat;
    }
    if (payload.lng !== undefined && payload.officeLng === undefined) {
      payload.officeLng = payload.lng;
    }
    const updated = await settingsService.updateSettings(req.user, payload);
    return res.status(200).json({
      message: "Company settings updated successfully",
      settings: updated,
      data: updated,
    });
  }),
);

export default router;
